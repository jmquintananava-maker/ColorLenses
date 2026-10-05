'use strict';
const { randomUUID } = require('node:crypto');
const { assertTransactional } = require('./schema-check');
const { AppError, text, codeValue, positiveInteger, requestKey, sameBrand, transaction, assertBrandUnlocked } = require('./inventory-core');
const { parseScope, scopeFromSession, scopeLabel, decorateSession, sameScope, scopePredicate, assertInScope } = require('./inventory-scope');
const VARIANT_SELECT = `SELECT v.Id AS ProductVariantId, p.Id AS ProductId,
 p.SKU, p.Marca, p.Modelo, p.Category, p.Description, p.Image, p.Image2, p.Image3,
 v.Color, CASE WHEN d.ProductVariantId IS NOT NULL AND d.ReviewedAt IS NULL THEN NULL ELSE v.Power END AS Power,
 v.PowerLabel, v.Price, v.Stock, v.FactoryCode, v.InternalCode, v.ScanCode, v.CodeType,
 v.Status AS VariantStatus, v.Status, p.Status AS ProductStatus,
 CASE WHEN d.ProductVariantId IS NOT NULL AND d.ReviewedAt IS NULL THEN 1 ELSE 0 END AS NeedsReview
 FROM ProductVariants v INNER JOIN Products p ON p.Id=v.ProductId
 LEFT JOIN CLInventoryDrafts d ON d.ProductVariantId=v.Id`;
const activeLines = "SELECT * FROM CLInventoryLines WHERE SessionId=? ORDER BY Id";
const actorName = user => String(user.fullName || user.username || 'Administrador').slice(0,190);
async function event(c, sessionId, action, user) {
  await c.execute('INSERT INTO CLInventoryEvents (SessionId,Action,ActorId,ActorName,CreatedAt) VALUES (?,?,?,?,UTC_TIMESTAMP(3))', [sessionId, action, user.id, actorName(user)]);
}
async function readSnapshot(db, fn) {
  const c = await db.getConnection();
  try { await c.beginTransaction(); const r = await fn(c); await c.commit(); return r; }
  catch(e) { await c.rollback().catch(()=>{}); throw e; }
  finally { c.release(); }
}
function consolidated(baseline, lines, kind) {
  const map = new Map();
  baseline.forEach(b => map.set(Number(b.ProductVariantId), { ...b, Quantity: 0, Counted: false, Voided: 0 }));
  lines.forEach(l => {
    const key = Number(l.ProductVariantId);
    if (!map.has(key)) map.set(key, { ...l, StockBefore: kind === 'STOCKTAKE' ? 0 : Number(l.StockBefore), Quantity: 0, Counted: false, Voided: 0 });
    const item = map.get(key);
    if (l.VoidedAt) { item.Voided++; return; }
    item.Quantity += Number(l.Quantity); item.Counted = true; item.LastRecordedStock = Number(l.StockAfter);
    item.NeedsReview = Math.max(Number(item.NeedsReview || 0), Number(l.NeedsReview || 0));
  });
  return [...map.values()].map(p => ({ ...p, Difference: Number(p.Quantity) - Number(p.StockBefore), CountStatus: p.Counted ? 'Contado' : 'Sin contar' }));
}
function createService(db) {
  async function canonicalBrand(c, value, required = false) {
    const input = text(value || '',190);
    if (!input) { if (required) throw new AppError('Selecciona una marca.'); return null; }
    const [existing] = await c.execute('SELECT DISTINCT Marca AS Name FROM Products WHERE LOWER(TRIM(Marca))=LOWER(TRIM(?)) LIMIT 1', [input]);
    if (existing.length) return String(existing[0].Name).trim();
    const [sets] = await c.execute('CALL GetProductBrands()');
    const brand = (sets[0] || []).find(b => sameBrand(b.Name || b.Marca, input));
    if (!brand) throw new AppError('La marca no existe. Agrégala primero en Configuración.');
    return String(brand.Name || brand.Marca).trim();
  }
  async function session(c, id, forUpdate = false) {
    const [rows] = await c.execute('SELECT * FROM CLInventorySessions WHERE Id=?' + (forUpdate ? ' FOR UPDATE' : ''), [requestKey(id)]);
    if (!rows.length) throw new AppError('No se encontró este inventario.',404,'NOT_FOUND');
    return sessionWithScope(c,rows[0]);
  }
  async function sessionWithScope(c,header) {
    const [rows] = await c.execute('SELECT Categories AS ScopeCategoriesJSON,Graduation AS ScopeGraduation FROM CLInventoryScopes WHERE SessionId=?',[header.Id]);
    return decorateSession({...header,...rows[0]});
  }
  async function canonicalScope(c,brand,input) {
    const scope=parseScope(input);
    if (scope.categories !== null) {
      const [rows] = await c.execute('SELECT DISTINCT Category FROM Products WHERE LOWER(TRIM(Marca))=LOWER(TRIM(?))',[brand]);
      scope.categories=scope.categories.map(name=>{
        const found=rows.find(p=>sameBrand(p.Category,name));
        if (!found) throw new AppError(`La categoría ${name} no existe en ${brand}. Actualiza la selección.`,400,'INVALID_CATEGORY');
        return String(found.Category).trim();
      });
    }
    return scope;
  }
  async function getVariant(c, code, lock = false) {
    const [rows] = await c.execute(VARIANT_SELECT + ' WHERE v.ScanCode=? OR v.FactoryCode=? OR v.InternalCode=? ORDER BY v.Id LIMIT 3' + (lock ? ' FOR UPDATE' : ''), [code,code,code]);
    if (rows.length > 1) throw new AppError('Este código coincide con varias variantes. Corrige los códigos duplicados en Productos antes de inventariar; no se eligió ninguna automáticamente.',409,'AMBIGUOUS_CODE',rows.map(p => ({ id:p.ProductVariantId, marca:p.Marca, modelo:p.Modelo, power:p.PowerLabel })));
    return rows[0] || null;
  }
  async function detailFrom(c, id) {
    const header = await session(c,id);
    const [lines] = await c.execute(activeLines,[id]);
    const [baseline] = await c.execute('SELECT * FROM CLInventoryBaseline WHERE SessionId=? ORDER BY Marca,Modelo,Color,Power',[id]);
    const [events] = await c.execute('SELECT * FROM CLInventoryEvents WHERE SessionId=? ORDER BY Id',[id]);
    const products = consolidated(baseline,lines,header.Kind);
    return { session:header, lines, products, events, summary: {
      TotalUnits: lines.filter(l => !l.VoidedAt).reduce((s,l)=>s+Number(l.Quantity),0),
      TotalProducts: products.filter(p=>p.Counted).length,
      Uncounted: header.Kind === 'STOCKTAKE' ? products.filter(p=>!p.Counted).length : 0,
      OriginalUnits: baseline.reduce((s,p)=>s+Number(p.StockBefore),0),
      PendingProducts: products.filter(p=>p.Counted && Number(p.NeedsReview)).length,
      TotalScans: lines.filter(l=>!l.VoidedAt).length
    } };
  }
  async function metadata() {
    return readSnapshot(db, async c => {
      const [sets] = await c.execute('CALL GetProductBrands()');
      const [rows] = await c.execute('SELECT DISTINCT Marca AS Name FROM Products WHERE Marca IS NOT NULL AND TRIM(Marca)<>\'\'');
      const map = new Map(); [...(sets[0] || []),...rows].forEach(b => {const name=String(b.Name || b.Marca || '').trim(); if(name) map.set(name.toLocaleLowerCase('es'),name);});
      const [categories] = await c.execute("SELECT DISTINCT p.Marca,p.Category FROM Products p JOIN ProductVariants v ON v.ProductId=p.Id WHERE p.Marca IS NOT NULL AND TRIM(p.Marca)<>'' AND p.Category IS NOT NULL AND TRIM(p.Category)<>'' ORDER BY p.Marca,p.Category");
      const [open] = await c.execute("SELECT s.Id,s.Folio,s.Kind,s.Brand,s.Status,sc.Categories AS ScopeCategoriesJSON,sc.Graduation AS ScopeGraduation FROM CLInventorySessions s LEFT JOIN CLInventoryScopes sc ON sc.SessionId=s.Id WHERE s.Kind='STOCKTAKE' AND s.Status IN ('ACTIVE','PAUSED') ORDER BY s.CreatedAt");
      const [stats] = await c.execute("SELECT Kind,Status,COUNT(*) AS Total FROM CLInventorySessions GROUP BY Kind,Status");
      const [pending] = await c.execute('SELECT COUNT(*) AS Total FROM CLInventoryDrafts WHERE ReviewedAt IS NULL');
      return { brands:[...map.values()].sort((a,b)=>a.localeCompare(b,'es')), brandCategories:categories, openStocktakes:open.map(decorateSession), stats, pending:Number(pending[0]?.Total || 0) };
    });
  }
  async function preview(brand,inputScope) {
    return readSnapshot(db, async c => {
      const canonical = await canonicalBrand(c,brand,true);
      const scope=await canonicalScope(c,canonical,inputScope), predicate=scopePredicate(canonical,scope);
      const [rows] = await c.execute(`SELECT COUNT(*) AS Variants,COALESCE(SUM(v.Stock),0) AS Units FROM ProductVariants v JOIN Products p ON p.Id=v.ProductId WHERE ${predicate.sql}`,predicate.params);
      await assertBrandUnlocked(c,canonical);
      return { brand:canonical, scope, scopeLabel:scopeLabel(scope), variants:Number(rows[0].Variants), units:Number(rows[0].Units) };
    });
  }
  async function create(input,user) {
    const kind = text(input.kind,20);
    if (!['RECEIPT','STOCKTAKE'].includes(kind)) throw new AppError('Tipo de inventario inválido.');
    if (kind === 'STOCKTAKE' && input.confirmReset !== true) throw new AppError('Debes confirmar que el alcance seleccionado se pondrá en cero.');
    const key = requestKey(input.requestKey), reference = text(input.reference || '',190), notes = text(input.notes || '',2000,true);
    return transaction(db, async c => {
      const [prior] = await c.execute('SELECT * FROM CLInventorySessions WHERE RequestKey=?',[key]);
      if (prior.length) {
        if (prior[0].Kind !== kind || !sameBrand(prior[0].Brand,input.brand || '') || prior[0].Reference !== reference) throw new AppError('La misma operación ya se usó con datos distintos.',409,'IDEMPOTENCY_CONFLICT');
        const saved=await sessionWithScope(c,prior[0]);
        // Reconciliar un inicio previo al parche nunca vuelve a reiniciar existencias.
        if(kind==='STOCKTAKE') {
          const requested=input.scope ? parseScope(input.scope) : saved.LegacyScope ? {categories:null,graduation:'ALL'} : parseScope(input.scope);
          if(!sameScope(scopeFromSession(saved),requested)) throw new AppError('La misma operación ya se usó con otro alcance.',409,'IDEMPOTENCY_CONFLICT');
        }
        return { session:saved, replayed:true };
      }
      await assertTransactional(c);
      const brand = await canonicalBrand(c,input.brand,kind === 'STOCKTAKE');
      if (brand) await assertBrandUnlocked(c,brand);
      const scope=kind==='STOCKTAKE' ? await canonicalScope(c,brand,input.scope) : null;
      const predicate=scope && scopePredicate(brand,scope);
      if(scope) {
        const [rows]=await c.execute(`SELECT COUNT(*) AS Variants FROM ProductVariants v JOIN Products p ON p.Id=v.ProductId WHERE ${predicate.sql}`,predicate.params);
        if(!Number(rows[0].Variants)) throw new AppError('No hay variantes en este alcance. No se modificó ninguna existencia.',409,'EMPTY_SCOPE');
      }
      const id = randomUUID(); const folio = `${kind === 'STOCKTAKE'?'INV':'REC'}-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${id.slice(0,8).toUpperCase()}`;
      await c.execute(`INSERT INTO CLInventorySessions (Id,Folio,RequestKey,Kind,Brand,Reference,Notes,CreatedBy,CreatedByName,CreatedAt,UpdatedAt)
       VALUES (?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))`,[id,folio,key,kind,brand,reference,notes,user.id,actorName(user)]);
      if (kind === 'STOCKTAKE') {
        await c.execute('INSERT INTO CLInventoryScopes (SessionId,Categories,Graduation) VALUES (?,?,?)',[id,scope.categories===null?null:JSON.stringify(scope.categories),scope.graduation]);
        // Snapshot y reset están en la MISMA conexión y transacción. No se borran productos.
        await c.execute(`INSERT INTO CLInventoryBaseline (SessionId,ProductVariantId,ProductId,Code,Marca,Modelo,Category,Color,Power,PowerLabel,Price,StockBefore,VariantStatus,ProductStatus)
          SELECT ?,v.Id,p.Id,COALESCE(NULLIF(v.ScanCode,''),NULLIF(v.FactoryCode,''),v.InternalCode,''),COALESCE(p.Marca,''),COALESCE(p.Modelo,''),COALESCE(p.Category,''),COALESCE(v.Color,''),v.Power,COALESCE(v.PowerLabel,''),COALESCE(v.Price,0),COALESCE(v.Stock,0),COALESCE(v.Status,''),COALESCE(p.Status,'')
          FROM ProductVariants v JOIN Products p ON p.Id=v.ProductId WHERE ${predicate.sql}`,[id,...predicate.params]);
        // Reiniciar exactamente las variantes incluidas en la fotografía del alcance.
        await c.execute('UPDATE ProductVariants v JOIN CLInventoryBaseline b ON b.ProductVariantId=v.Id SET v.Stock=0 WHERE b.SessionId=?',[id]);
      }
      await event(c,id,kind === 'STOCKTAKE'?'START_AND_RESET':'START',user);
      return { session:await session(c,id), replayed:false };
    });
  }
  async function lookup(code,id) {
    const clean=codeValue(code); const p=await getVariant(db,clean);
    let scopeError=null;
    if(id) {
      const header=await session(db,id);
      if(header.Kind==='STOCKTAKE') {
        try { assertInScope(p,header); }
        catch(error) { if(!error.status)throw error; scopeError=error.message; }
      }
    }
    return { found:!!p, code:clean, product:p, scopeError };
  }
  async function createDraft(c,code,brand,sid) {
    // El código NO contiene información fiable de marca, modelo o graduación.
    // Solo se usa la marca seleccionada; el resto queda inactivo y pendiente.
    const sku='CLP-'+randomUUID().replace(/-/g,'').slice(0,20);
    const [limits]=await c.execute('SELECT COLUMN_NAME,CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=\'ProductVariants\' AND COLUMN_NAME IN (\'ScanCode\',\'FactoryCode\')');
    if(limits.some(l=>l.CHARACTER_MAXIMUM_LENGTH && code.length>Number(l.CHARACTER_MAXIMUM_LENGTH)))throw new AppError('El código supera el tamaño permitido por la tabla actual. No se truncó ni se creó un código distinto. Amplía las columnas de códigos antes de usar este QR.',400,'CODE_TOO_LONG');
    const [p] = await c.execute(`INSERT INTO Products (SKU,Category,Marca,Modelo,Description,Image,Status) VALUES (?,?,?,?,?,?,?)`,
      [sku,'',brand,'Pendiente '+code.slice(0,60),'Creado por inventario. Completar categoría, modelo, color, graduación y precio antes de publicar.','','Inactivo']);
    const [v] = await c.execute(`INSERT INTO ProductVariants (ProductId,Color,Power,PowerLabel,Price,Stock,FactoryCode,InternalCode,ScanCode,CodeType,Status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [p.insertId,'',0,'Por confirmar',0,0,code,'',code,'BARCODE','Inactivo']);
    await c.execute('INSERT INTO CLInventoryDrafts (ProductVariantId,SessionId,Code,CreatedAt) VALUES (?,?,?,UTC_TIMESTAMP(3))',[v.insertId,sid,code]);
    const [rows] = await c.execute(VARIANT_SELECT+' WHERE v.Id=?',[v.insertId]); return rows[0];
  }
  async function add(id,input,user) {
    const code=codeValue(input.code), quantity=positiveInteger(input.quantity), key=requestKey(input.requestKey);
    const method=['CAMERA','SCANNER','MANUAL','IMAGE'].includes(input.method)?input.method:'MANUAL';
    return transaction(db,async c=>{
      const header=await session(c,id,true);
      const [prior]=await c.execute('SELECT * FROM CLInventoryLines WHERE SessionId=? AND RequestKey=?',[id,key]);
      if (prior.length) {
        if (prior[0].Code !== code || Number(prior[0].Quantity) !== quantity) throw new AppError('Esta operación ya se guardó con otros datos.',409,'IDEMPOTENCY_CONFLICT');
        return { line:prior[0], replayed:true };
      }
      if(header.Status !== 'ACTIVE') throw new AppError('El inventario no está activo. Reanúdalo antes de agregar productos.',409,'NOT_ACTIVE');
      let product=await getVariant(c,code,true);
      if (header.Kind==='STOCKTAKE') assertInScope(product,header);
      let brand=product?.Marca || header.Brand;
      if (!product && header.Kind==='RECEIPT') brand=await canonicalBrand(c,input.brand || header.Brand,true);
      if (!product && !brand) throw new AppError('Selecciona la marca para registrar este código nuevo.');
      await assertBrandUnlocked(c,brand,header.Kind==='STOCKTAKE'?id:'');
      if (!product) product=await createDraft(c,code,brand,id);
      const before=Number(product.Stock), after=before+quantity;
      if(!Number.isSafeInteger(before) || before<0 || !Number.isSafeInteger(after) || after>2147483647) throw new AppError('El stock está fuera del rango permitido. Revisa el producto.');
      await c.execute('UPDATE ProductVariants SET Stock=? WHERE Id=?',[after,product.ProductVariantId]);
      const [insert]=await c.execute(`INSERT INTO CLInventoryLines (SessionId,RequestKey,ProductVariantId,ProductId,Code,Quantity,StockBefore,StockAfter,Marca,Modelo,Category,Color,Power,PowerLabel,Price,NeedsReview,ScanMethod,CreatedBy,CreatedByName,CreatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(3))`,
        [id,key,product.ProductVariantId,product.ProductId,code,quantity,before,after,product.Marca || '',product.Modelo || '',product.Category || '',product.Color || '',product.Power,product.PowerLabel || '',Number(product.Price || 0),Number(product.NeedsReview || 0),method,user.id,actorName(user)]);
      await c.execute('UPDATE CLInventorySessions SET UpdatedAt=UTC_TIMESTAMP(3) WHERE Id=?',[id]);
      const [lines]=await c.execute('SELECT * FROM CLInventoryLines WHERE Id=?',[insert.insertId]);
      return { line:lines[0], replayed:false };
    });
  }
  async function changeStatus(id,input,user) {
    const status=text(input.status,20);
    if(!['ACTIVE','PAUSED','COMPLETED'].includes(status)) throw new AppError('Estado inválido.');
    return transaction(db,async c=>{
      const header=await session(c,id,true);
      if(header.Status===status) return { session:header, replayed:true };
      if(header.Status==='COMPLETED') throw new AppError('Este inventario ya está finalizado y es de solo lectura.',409,'COMPLETED');
      if(status==='COMPLETED' && header.Kind==='STOCKTAKE') {
        const detail=await detailFrom(c,id);
        if(detail.summary.Uncounted>0 && input.confirmUncounted!==true) throw new AppError(`${detail.summary.Uncounted} variantes no fueron contadas y permanecerán en cero. Confirma para finalizar.`,409,'UNCOUNTED',detail.summary);
      }
      // Resolve this choice in JavaScript. Comparing a prepared text parameter
      // with a SQL literal (?='COMPLETED') can mix connection collations on
      // MySQL/MariaDB. These are fixed SQL expressions, never user input.
      const completedAt = status === 'COMPLETED' ? 'UTC_TIMESTAMP(3)' : 'NULL';
      await c.execute(
        `UPDATE CLInventorySessions SET Status=?,UpdatedAt=UTC_TIMESTAMP(3),CompletedAt=${completedAt} WHERE Id=?`,
        [status,id]
      );
      await event(c,id,status==='ACTIVE'?'RESUME':status==='PAUSED'?'PAUSE':'COMPLETE',user);
      return { session:await session(c,id) };
    });
  }
  async function updateMetadata(id,input,user) {
    const reference=text(input.reference || '',190),notes=text(input.notes || '',2000,true);
    return transaction(db,async c=>{
      const header=await session(c,id,true);
      if(header.Status==='COMPLETED') throw new AppError('Un inventario finalizado no se puede editar.',409,'COMPLETED');
      await c.execute('UPDATE CLInventorySessions SET Reference=?,Notes=?,UpdatedAt=UTC_TIMESTAMP(3) WHERE Id=?',[reference,notes,id]);
      await event(c,id,'UPDATE_REFERENCE',user);return {session:await session(c,id)};
    });
  }
  async function voidLine(id,lineId,user) {
    const lid=positiveInteger(lineId,Number.MAX_SAFE_INTEGER);
    return transaction(db,async c=>{
      const header=await session(c,id,true);
      if(header.Status!=='ACTIVE') throw new AppError('Solo puedes corregir un inventario activo.',409,'NOT_ACTIVE');
      const [rows]=await c.execute('SELECT * FROM CLInventoryLines WHERE Id=? AND SessionId=? FOR UPDATE',[lid,id]);
      const line=rows[0]; if(!line) throw new AppError('Registro no encontrado.',404,'NOT_FOUND');
      if(line.VoidedAt) return { success:true,replayed:true };
      await assertBrandUnlocked(c,line.Marca,header.Kind==='STOCKTAKE'?id:'');
      if(header.Kind==='RECEIPT') {
        const [newer]=await c.execute("SELECT Id FROM CLInventorySessions WHERE Kind='STOCKTAKE' AND LOWER(TRIM(Brand))=LOWER(TRIM(?)) AND CreatedAt>? LIMIT 1",[line.Marca,line.CreatedAt]);
        if(newer.length) throw new AppError('La marca fue recontada después de esta entrada. No es seguro anular un movimiento anterior al reconteo.',409,'SUPERSEDED');
      }
      const [products]=await c.execute('SELECT Id,Stock FROM ProductVariants WHERE Id=? FOR UPDATE',[line.ProductVariantId]);
      if(!products.length || Number(products[0].Stock)<Number(line.Quantity)) throw new AppError('No se puede anular: el stock disponible ya es menor que esta entrada.',409,'INSUFFICIENT_STOCK');
      await c.execute('UPDATE ProductVariants SET Stock=Stock-? WHERE Id=?',[line.Quantity,line.ProductVariantId]);
      await c.execute('UPDATE CLInventoryLines SET VoidedAt=UTC_TIMESTAMP(3),VoidedBy=? WHERE Id=?',[user.id,lid]);
      await c.execute('UPDATE CLInventorySessions SET UpdatedAt=UTC_TIMESTAMP(3) WHERE Id=?',[id]);
      await event(c,id,'VOID_LINE:'+lid,user); return { success:true };
    });
  }
  async function history(q={},exportAll=false) {
    const params=[]; const where=[];
    if(['RECEIPT','STOCKTAKE'].includes(q.kind)) {where.push('s.Kind=?');params.push(q.kind);}
    if(['ACTIVE','PAUSED','COMPLETED'].includes(q.status)) {where.push('s.Status=?');params.push(q.status);}
    if(q.search) {const value='%'+text(q.search,190)+'%';where.push('(s.Folio LIKE ? OR s.Reference LIKE ? OR s.Brand LIKE ?)');params.push(value,value,value);}
    for(const key of ['from','to']) if(q[key]) { if(!/^\d{4}-\d{2}-\d{2}$/.test(q[key])) throw new AppError('Fecha inválida.'); where.push(key==='from'?'s.CreatedAt>=?':'s.CreatedAt<DATE_ADD(?,INTERVAL 1 DAY)');params.push(q[key]); }
    const clause=where.length?' WHERE '+where.join(' AND '):'';
    const page=Number.isInteger(Number(q.page))&&Number(q.page)>0?Number(q.page):1;
    return readSnapshot(db,async c=>{
      const [counts]=await c.execute('SELECT COUNT(*) AS Total FROM CLInventorySessions s'+clause,params);
      const total=Number(counts[0].Total);
      if(exportAll && total>100000) throw new AppError('Acota el periodo antes de exportar más de 100,000 sesiones.');
      const [rows]=await c.query(`SELECT s.*,sc.Categories AS ScopeCategoriesJSON,sc.Graduation AS ScopeGraduation,
        (SELECT COALESCE(SUM(l.Quantity),0) FROM CLInventoryLines l WHERE l.SessionId=s.Id AND l.VoidedAt IS NULL) AS TotalUnits,
        (SELECT COUNT(DISTINCT l.ProductVariantId) FROM CLInventoryLines l WHERE l.SessionId=s.Id AND l.VoidedAt IS NULL) AS TotalProducts
        FROM CLInventorySessions s LEFT JOIN CLInventoryScopes sc ON sc.SessionId=s.Id ${clause} ORDER BY s.CreatedAt DESC LIMIT ? OFFSET ?`,[...params,exportAll?100000:25,exportAll?0:(page-1)*25]);
      return { sessions:rows.map(decorateSession),total,page,pageSize:25 };
    });
  }
  async function drafts() {const [rows]=await db.execute(VARIANT_SELECT+' WHERE d.ReviewedAt IS NULL AND d.ProductVariantId IS NOT NULL ORDER BY v.Id DESC');return rows;}
  async function publishDraft(id,input,user) {
    const vid=positiveInteger(id,Number.MAX_SAFE_INTEGER);
    if(input.confirmDetails!==true) throw new AppError('Confirma que la graduación y los datos corresponden al producto físico.');
    return transaction(db,async c=>{
      const [rows]=await c.execute(VARIANT_SELECT+' WHERE v.Id=? FOR UPDATE',[vid]); const p=rows[0];
      if(!p) throw new AppError('Producto no encontrado.',404,'NOT_FOUND');
      if(!Number(p.NeedsReview)) return {success:true,replayed:true};
      await assertBrandUnlocked(c,p.Marca);
      // Power es NULL en la vista de pendientes; validar el dato real guardado.
      const [powers]=await c.execute('SELECT Power FROM ProductVariants WHERE Id=?',[vid]);
      if(!p.Marca || !p.Category || !p.Modelo || /^pendiente\b/i.test(p.Modelo) || !p.Color || Number(p.Price)<=0 || powers[0].Power==null || !Number.isFinite(Number(powers[0].Power))) throw new AppError('Primero guarda marca, categoría, modelo, color, graduación y un precio mayor a cero en Editar.');
      await c.execute('UPDATE CLInventoryDrafts SET ReviewedAt=UTC_TIMESTAMP(3),ReviewedBy=? WHERE ProductVariantId=?',[user.id,vid]);
      await c.execute('UPDATE Products SET Status=\'Activo\' WHERE Id=?',[p.ProductId]);
      await c.execute('UPDATE ProductVariants SET Status=\'Activo\' WHERE Id=?',[vid]);
      return {success:true};
    });
  }
  return { metadata,preview,create,lookup,add,changeStatus,updateMetadata,voidLine,history,drafts,publishDraft,
    detail:id=>readSnapshot(db,c=>detailFrom(c,id)),
    allProducts:async()=>{const [rows]=await db.execute(VARIANT_SELECT+' ORDER BY p.Marca,p.Modelo,v.Color,v.Power');return rows;}
  };
}
module.exports={ createService, VARIANT_SELECT, consolidated, readSnapshot };
