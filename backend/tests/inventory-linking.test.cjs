// Adaptador SQL transaccional en memoria para asociación de códigos y recepción.
// Ejecuta el servicio real; no sustituye una prueba contra MariaDB ni toca producción.
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createService}=require('../lib/inventory-service');
const SID='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const KEY='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const USER={id:7,username:'admin'};
const CODE='A0179';
const ORIGINAL={ProductVariantId:91,ProductId:90,SKU:'CL-ORIGINAL',Marca:'Urban Layer',Modelo:'Aurora',Category:'Natural',Description:'Descripción original',Color:'Miel',Power:0,PowerLabel:'Sin graduación',Price:250.5,Stock:7,Image:'aurora.webp',Image2:'detalle.webp',Image3:'caja.webp',ScanCode:'OLD-SCAN',FactoryCode:'OLD-FACTORY',InternalCode:'OLD-INTERNAL',CodeType:'BARCODE',Status:'Activo',VariantStatus:'Activo',ProductStatus:'Activo',NeedsReview:0};
const DETAILS={model:'Aurora',category:'Natural',color:'Miel',power:'0',price:'999'};
const payload=(extra={})=>({code:CODE,quantity:4,requestKey:KEY,brand:'Urban Layer',method:'CAMERA',...extra});
const equal=(a,b)=>String(a??'').trim().localeCompare(String(b??'').trim(),'es',{sensitivity:'base'})===0;

function fixture(options={}) {
  let state={
    variants:[structuredClone(ORIGINAL),...(options.variants||[])],aliases:[],lines:[],events:[],
    sessions:[{Id:SID,Folio:'REC-PRUEBA',Kind:'RECEIPT',Status:'ACTIVE',Brand:null,CreatedAt:'2026-10-05T02:00:00Z'},...(options.sessions||[])]
  },saved;
  const calls=[];
  const visible=sql=>state.sessions.filter(s=>!sql.includes("removed.Action='DELETE_RECEIPT'")||!state.events.some(e=>e.SessionId===s.Id&&e.Action==='DELETE_RECEIPT'));
  const display=v=>({...v,Power:Number(v.NeedsReview)?null:v.Power});
  async function execute(sql,args=[]) {
    calls.push({sql,args:structuredClone(args)});
    if(options.failAt&&sql.startsWith(options.failAt))throw new Error('Falla simulada después de asociar');
    if(sql.includes('GET_LOCK'))return [[{Acquired:1}]];
    if(sql.includes('RELEASE_LOCK'))return [[{Released:1}]];
    if(sql.startsWith('SELECT * FROM CLInventorySessions WHERE Id='))return [visible(sql).filter(s=>s.Id===args[0]).map(s=>({...s}))];
    if(sql.startsWith('SELECT Categories AS'))return [[]];
    if(sql.startsWith('SELECT * FROM CLInventoryLines WHERE SessionId=? AND RequestKey='))return [state.lines.filter(l=>l.SessionId===args[0]&&l.RequestKey===args[1]).map(l=>({...l}))];
    if(sql.startsWith('SELECT * FROM CLInventoryLines WHERE Id='))return [state.lines.filter(l=>l.Id===args[0]).map(l=>({...l}))];
    if(sql.startsWith('SELECT v.Id AS ProductVariantId')) {
      if(sql.includes(' WHERE v.Id=?'))return [state.variants.filter(v=>v.ProductVariantId===args[0]).map(display)];
      if(sql.includes(' WHERE (v.ScanCode=')) {
        assert.equal(args.length,4,'La búsqueda incluye los tres códigos originales y los adicionales.');
        return [state.variants.filter(v=>[v.ScanCode,v.FactoryCode,v.InternalCode].some(code=>code&&equal(code,args[0]))||state.aliases.some(a=>a.ProductVariantId===v.ProductVariantId&&equal(a.Code,args[3]))).map(display)];
      }
      return [state.variants.map(display)];
    }
    if(sql==='CALL GetProductCategories()')return [[[{Name:'Natural'},{Name:'Halloween'}]]];
    if(sql==='CALL GetProductPowers()')return [[[{Power:-1.5}]]];
    if(sql==='CALL GetProductBrands()')return [[[{Name:'Urban Layer'}]]];
    if(sql.startsWith('SELECT DISTINCT Marca'))return [[{Name:'Urban Layer'}]];
    if(sql.startsWith('SELECT DISTINCT p.Marca,p.Category'))return [[{Marca:'Urban Layer',Category:'Natural'}]];
    if(sql.includes('SELECT Id, Folio, Brand, Status FROM CLInventorySessions'))return [options.locked?[{Id:'lock',Folio:'INV-OTRO',Brand:'Urban Layer',Status:'ACTIVE'}]:[]];
    if(sql.includes('INFORMATION_SCHEMA.COLUMNS'))return [[{CHARACTER_MAXIMUM_LENGTH:190}]];
    if(sql.startsWith('SELECT Id FROM Products WHERE'))return [[...new Set(state.variants.filter(v=>equal(v.Marca,args[0])&&equal(v.Category,args[1])&&equal(v.Modelo,args[2])).map(v=>v.ProductId))].map(Id=>({Id}))];
    if(sql.startsWith('SELECT Id FROM ProductVariants WHERE ProductId='))return [state.variants.filter(v=>v.ProductId===args[0]&&equal(v.Color,args[1])&&Number(v.Power)===Number(args[2])).map(v=>({Id:v.ProductVariantId}))];
    if(sql.startsWith('SELECT Id FROM ProductVariants WHERE Id='))return [state.variants.filter(v=>v.ProductVariantId===args[0]).map(v=>({Id:v.ProductVariantId}))];
    if(sql.startsWith('SELECT Id FROM ProductVariants WHERE ScanCode='))return [state.variants.filter(v=>[v.ScanCode,v.FactoryCode,v.InternalCode].some(code=>code&&equal(code,args[0]))).map(v=>({Id:v.ProductVariantId}))];
    if(sql.startsWith('SELECT a.ProductVariantId'))return [state.aliases.filter(a=>equal(a.Code,args[0])).map(a=>({ProductVariantId:a.ProductVariantId,ExistingVariantId:state.variants.find(v=>v.ProductVariantId===a.ProductVariantId)?.ProductVariantId??null}))];
    if(sql.startsWith('SELECT Code FROM CLProductCodeAliases WHERE ProductVariantId='))return [state.aliases.filter(a=>a.ProductVariantId===args[0]).map(a=>({Code:a.Code}))];
    if(sql.startsWith('SELECT Code,ProductVariantId FROM CLProductCodeAliases'))return [state.aliases.map(a=>({...a}))];
    if(sql.startsWith('INSERT INTO CLProductCodeAliases')) {
      if(state.aliases.some(a=>equal(a.Code,args[0])))throw Object.assign(new Error('Duplicate'),{code:'ER_DUP_ENTRY'});
      state.aliases.push({Code:args[0],ProductVariantId:args[1],CreatedBy:args[2]});return [{affectedRows:1}];
    }
    if(sql.startsWith('UPDATE ProductVariants SET Stock=')) {state.variants.find(v=>v.ProductVariantId===args[1]).Stock=args[0];return [{affectedRows:1}];}
    if(sql.startsWith('INSERT INTO CLInventoryLines')) {
      const columns=['SessionId','RequestKey','ProductVariantId','ProductId','Code','Quantity','StockBefore','StockAfter','Marca','Modelo','Category','Color','Power','PowerLabel','Price','NeedsReview','ScanMethod','CreatedBy','CreatedByName'];
      const line={Id:state.lines.length+1,...Object.fromEntries(columns.map((key,i)=>[key,args[i]]))};state.lines.push(line);return [{insertId:line.Id}];
    }
    if(sql.startsWith('UPDATE CLInventorySessions SET UpdatedAt='))return [{affectedRows:1}];
    if(sql.startsWith('UPDATE CLInventorySessions SET Status=')) {state.sessions.find(s=>s.Id===args[1]).Status=args[0];return [{affectedRows:1}];}
    if(sql.startsWith('INSERT INTO CLInventoryEvents')) {state.events.push({SessionId:args[0],Action:args[1],ActorId:args[2]});return [{affectedRows:1}];}
    if(sql.startsWith('SELECT COUNT(*) AS Total FROM CLInventorySessions s'))return [[{Total:visible(sql).length}]];
    if(sql.startsWith('SELECT s.*,sc.Categories AS'))return [visible(sql).map(s=>({...s}))];
    if(sql.startsWith('SELECT s.Id,s.Folio,s.Kind,s.Brand,s.Status'))return [state.sessions.filter(s=>s.Kind==='STOCKTAKE'&&['ACTIVE','PAUSED'].includes(s.Status)).map(s=>({...s}))];
    if(sql.startsWith('SELECT Kind,Status,COUNT(*) AS Total FROM CLInventorySessions s')) {
      const groups=new Map();for(const s of visible(sql)){const k=s.Kind+'/'+s.Status;const g=groups.get(k)||{Kind:s.Kind,Status:s.Status,Total:0};g.Total++;groups.set(k,g);}return [[...groups.values()]];
    }
    if(sql.startsWith('SELECT COUNT(*) AS Total FROM CLInventoryDrafts'))return [[{Total:state.variants.filter(v=>v.NeedsReview).length}]];
    throw new Error('SQL inesperado: '+sql);
  }
  const c={execute,query:execute,
    beginTransaction:async()=>{saved=structuredClone(state);calls.push({sql:'BEGIN'});},
    commit:async()=>{calls.push({sql:'COMMIT'});saved=undefined;},
    rollback:async()=>{if(saved)state=saved;saved=undefined;calls.push({sql:'ROLLBACK'});},
    release:()=>calls.push({sql:'RELEASE'}),destroy:()=>calls.push({sql:'DESTROY'})};
  return {service:createService({execute,query:execute,getConnection:async()=>c}),options,calls,get state(){return state;}};
}

async function candidate(f) {
  let error;
  try {await f.service.add(SID,payload({newProduct:{...DETAILS}}),USER);}catch(e){error=e;}
  assert.equal(error?.code,'VARIANT_ALREADY_EXISTS');assert.equal(error.status,409);
  assert.ok(Array.isArray(error.details.matches));assert.equal(error.details.matches.length,1);
  const match=error.details.matches[0];assert.equal(match.ProductVariantId,91);assert.match(match.LinkToken,/^[a-f0-9]{64}$/);
  return match;
}
const confirmation=(match,extra={})=>payload({existingVariantId:match.ProductVariantId,confirmLink:true,linkToken:match.LinkToken,...extra});

test('A0179 desconocido ofrece la variante coincidente para revisión y no duplica ni suma todavía',async()=>{
  const f=fixture(),before=structuredClone(f.state);
  assert.equal((await f.service.lookup(CODE,SID)).found,false);
  const match=await candidate(f);
  assert.equal(match.ScanCode,'OLD-SCAN');assert.equal(match.FactoryCode,'OLD-FACTORY');assert.equal(match.Price,250.5);assert.equal(match.Image,'aurora.webp');
  assert.deepEqual(f.state,before);assert.ok(!f.calls.some(c=>c.sql.startsWith('INSERT INTO Products')||c.sql.startsWith('INSERT INTO ProductVariants')));
});

test('confirmación reutiliza la variante, guarda el alias y suma stock una vez conservando datos y fotos',async()=>{
  const f=fixture(),match=await candidate(f),result=await f.service.add(SID,confirmation(match),USER);
  assert.equal(result.replayed,false);assert.equal(result.line.ProductVariantId,91);assert.equal(result.line.Code,CODE);assert.equal(result.line.StockBefore,7);assert.equal(result.line.StockAfter,11);
  assert.equal(result.line.Price,250.5);assert.deepEqual(f.state.variants,[{...ORIGINAL,Stock:11}]);
  assert.deepEqual(f.state.aliases,[{Code:CODE,ProductVariantId:91,CreatedBy:USER.id}]);assert.equal(f.state.lines.length,1);
  const found=await f.service.lookup(CODE,SID);assert.equal(found.found,true);assert.equal(found.product.ProductVariantId,91);assert.equal(found.product.Stock,11);
  for(const code of ['OLD-SCAN','OLD-FACTORY','OLD-INTERNAL'])assert.equal((await f.service.lookup(code,SID)).product.ProductVariantId,91);
});

test('la búsqueda y la lista completa muestran los alias guardados sin filtrar productos por estado',async()=>{
  const f=fixture({variants:[{...ORIGINAL,ProductVariantId:92,ProductId:95,ScanCode:'INACTIVE',FactoryCode:'F2',InternalCode:'I2',VariantStatus:'Inactivo',Status:'Inactivo',ProductStatus:'Inactivo'},{...ORIGINAL,ProductVariantId:93,ProductId:96,ScanCode:'PENDING',FactoryCode:'F3',InternalCode:'I3',NeedsReview:1}]});
  // Se cambia el modelo de las otras variantes para no presentar tres coincidencias.
  f.state.variants[1].Modelo='Otro';f.state.variants[2].Modelo='Pendiente';
  const match=await candidate(f);await f.service.add(SID,confirmation(match),USER);
  const found=await f.service.lookup(CODE,SID);assert.deepEqual(found.product.CodeAliases,[CODE]);
  const products=await f.service.allProducts();assert.equal(products.length,3);assert.deepEqual(products.find(v=>v.ProductVariantId===91).CodeAliases,[CODE]);
  assert.equal(products.find(v=>v.ProductVariantId===92).VariantStatus,'Inactivo');assert.equal(products.find(v=>v.ProductVariantId===93).NeedsReview,1);
});

test('reintentar la confirmación después de finalizar recupera la misma entrada sin sumar otra vez',async()=>{
  const f=fixture(),match=await candidate(f),body=confirmation(match);
  const first=await f.service.add(SID,body,USER);await f.service.changeStatus(SID,{status:'COMPLETED'},USER);
  const again=await f.service.add(SID,body,USER);assert.equal(again.replayed,true);assert.deepEqual(again.line,first.line);
  assert.equal(f.state.variants[0].Stock,11);assert.equal(f.state.lines.length,1);assert.equal(f.state.aliases.length,1);
});

test('una recepción posterior del alias solo requiere cantidad y conserva la asociación',async()=>{
  const f=fixture(),match=await candidate(f);await f.service.add(SID,confirmation(match),USER);
  const r=await f.service.add(SID,payload({quantity:2,requestKey:'cccccccc-cccc-cccc-cccc-cccccccccccc'}),USER);
  assert.equal(r.line.StockBefore,11);assert.equal(r.line.StockAfter,13);assert.equal(f.state.aliases.length,1);assert.equal(f.state.lines.length,2);
});

test('el fallo de línea o de actualización del folio revierte alias, stock y recepción juntos',async()=>{
  for(const failAt of ['INSERT INTO CLInventoryLines','UPDATE CLInventorySessions SET UpdatedAt=']) {
    const f=fixture(),match=await candidate(f),before=structuredClone(f.state);f.options.failAt=failAt;
    await assert.rejects(f.service.add(SID,confirmation(match),USER),/Falla simulada/);
    assert.deepEqual(f.state,before);assert.ok(f.calls.some(c=>c.sql.startsWith('INSERT INTO CLProductCodeAliases')));assert.ok(f.calls.some(c=>c.sql==='ROLLBACK'));
    f.options.failAt=undefined;await f.service.add(SID,confirmation(match),USER);assert.equal(f.state.variants[0].Stock,11);assert.equal(f.state.lines.length,1);assert.equal(f.state.aliases.length,1);
  }
});

test('datos o token cambiados exigen revisar la coincidencia antes de asociar',async()=>{
  for(const change of [v=>{v.Price=300;},v=>{v.Power=-1.5;},v=>{v.ScanCode='OTHER';},v=>{v.Modelo='Renombrado';}]) {
    const f=fixture(),match=await candidate(f);change(f.state.variants[0]);const before=structuredClone(f.state);
    await assert.rejects(f.service.add(SID,confirmation(match),USER),e=>e.code==='PRODUCT_CHANGED');assert.deepEqual(f.state,before);
  }
  const f=fixture(),match=await candidate(f);
  await assert.rejects(f.service.add(SID,confirmation(match,{linkToken:'0'.repeat(64)}),USER),e=>e.code==='PRODUCT_CHANGED');assert.equal(f.state.aliases.length,0);
});

test('cambio de cantidad disponible no invalida la revisión y se suma al stock vigente',async()=>{
  const f=fixture(),match=await candidate(f);f.state.variants[0].Stock=12;
  const r=await f.service.add(SID,confirmation(match),USER);assert.equal(r.line.StockBefore,12);assert.equal(r.line.StockAfter,16);
});

test('otra variante seleccionada no puede usar el token de la candidata original',async()=>{
  const f=fixture({variants:[{...ORIGINAL,ProductVariantId:92,ProductId:93,Modelo:'Otro',ScanCode:'SECOND',FactoryCode:'F2',InternalCode:'I2'}]}),match=await candidate(f),before=structuredClone(f.state);
  await assert.rejects(f.service.add(SID,confirmation(match,{existingVariantId:92}),USER),e=>e.code==='PRODUCT_CHANGED');assert.deepEqual(f.state,before);
});

test('un código ocupado mientras se revisaba la coincidencia no se reasigna ni recibe stock',async()=>{
  for(const via of ['ScanCode','FactoryCode','InternalCode','alias']) {
    const f=fixture(),match=await candidate(f),other={...ORIGINAL,ProductVariantId:92,ProductId:93,Modelo:'Otro',ScanCode:'SECOND',FactoryCode:'F2',InternalCode:'I2'};
    if(via==='alias')f.state.aliases.push({Code:CODE,ProductVariantId:92});else other[via]=CODE;
    f.state.variants.push(other);const before=structuredClone(f.state);
    await assert.rejects(f.service.add(SID,confirmation(match),USER),e=>e.code==='CODE_CONFLICT');assert.deepEqual(f.state,before);
  }
});

test('se requiere confirmación explícita sin mezclar alta nueva y asociación',async()=>{
  const f=fixture(),match=await candidate(f),before=structuredClone(f.state);
  for(const extra of [{confirmLink:false},{confirmLink:'true'},{newProduct:DETAILS}])await assert.rejects(f.service.add(SID,confirmation(match,extra),USER),e=>e.code==='LINK_CONFIRMATION_REQUIRED');
  f.state.sessions[0].Kind='STOCKTAKE';await assert.rejects(f.service.add(SID,confirmation(match),USER),e=>e.code==='LINK_CONFIRMATION_REQUIRED');f.state.sessions[0].Kind='RECEIPT';assert.deepEqual(f.state,before);
});

test('la misma clave no puede confirmar otra variante ni otra cantidad',async()=>{
  const f=fixture(),match=await candidate(f);await f.service.add(SID,confirmation(match),USER);const before=structuredClone(f.state);
  for(const extra of [{existingVariantId:92},{quantity:5},{code:'OTHER'}])await assert.rejects(f.service.add(SID,confirmation(match,extra),USER),e=>e.code==='IDEMPOTENCY_CONFLICT');
  assert.deepEqual(f.state,before);
});

test('una candidata eliminada o una marca bloqueada no reciben asociación ni cantidad',async()=>{
  const deleted=fixture(),match=await candidate(deleted);deleted.state.variants=[];
  await assert.rejects(deleted.service.add(SID,confirmation(match),USER),e=>e.code==='NOT_FOUND');assert.equal(deleted.state.aliases.length,0);
  const locked=fixture(),target=await candidate(locked);locked.options.locked=true;
  await assert.rejects(locked.service.add(SID,confirmation(target),USER),e=>e.code==='BRAND_LOCKED');assert.equal(locked.state.aliases.length,0);assert.equal(locked.state.variants[0].Stock,7);
});

test('un folio eliminado bloquea nuevas entradas y reintentos del registro anterior',async()=>{
  const f=fixture(),match=await candidate(f),body=confirmation(match);await f.service.add(SID,body,USER);
  f.state.events.push({SessionId:SID,Action:'DELETE_RECEIPT'});const before=structuredClone(f.state);
  for(const input of [body,payload({requestKey:'cccccccc-cccc-cccc-cccc-cccccccccccc'})])await assert.rejects(f.service.add(SID,input,USER),e=>e.code==='NOT_FOUND');
  assert.deepEqual(f.state,before);
});

test('historial y estadísticas omiten los folios eliminados conservando los visibles',async()=>{
  const second={Id:'dddddddd-dddd-dddd-dddd-dddddddddddd',Folio:'REC-VISIBLE',Kind:'RECEIPT',Status:'ACTIVE',Brand:null};
  const f=fixture({sessions:[second]});f.state.events.push({SessionId:SID,Action:'DELETE_RECEIPT'});
  const history=await f.service.history();assert.equal(history.total,1);assert.deepEqual(history.sessions.map(s=>s.Folio),['REC-VISIBLE']);
  const metadata=await f.service.metadata();assert.deepEqual(metadata.stats,[{Kind:'RECEIPT',Status:'ACTIVE',Total:1}]);
});
