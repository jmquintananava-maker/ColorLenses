'use strict';
const { acquireStockLock, releaseStockLock, assertBrandUnlocked, AppError, sendError } = require('./inventory-core');
const { ensureCodeSchema } = require('./product-code-aliases');
// Serializa TODOS los cambios de stock del API legado y los nuevos inventarios.
// El lock pertenece a esta conexión incluso si un SP hace COMMIT internamente.
module.exports = function stockGuard(db) {
  return function withStockLock(handler) {
    return async (req, res, next) => {
      let connection; let locked = false;
      try {
        const writesCodes=/^\/api\/product-variants(?:\/\d+)?$/.test(req.path)&&['POST','PUT'].includes(req.method);
        if(writesCodes)await ensureCodeSchema(db);
        connection = await db.getConnection();
        await acquireStockLock(connection); locked = true;
        const brands = new Set();
        const url = req.path;
        if (req.body?.Marca) brands.add(req.body.Marca);
        const variantId = /^\/api\/product-variants\/(\d+)/.exec(url)?.[1];
        const productId = /^\/api\/products\/(\d+)/.exec(url)?.[1] || req.body?.ProductId;
        if (variantId) {
          const [rows] = await connection.execute('SELECT p.Marca FROM ProductVariants v JOIN Products p ON p.Id=v.ProductId WHERE v.Id=?', [variantId]);
          rows.forEach(r => brands.add(r.Marca));
        }
        if (productId) {
          const [rows] = await connection.execute('SELECT Marca FROM Products WHERE Id=?', [productId]); rows.forEach(r => brands.add(r.Marca));
        }
        if (url === '/api/sales') {
          const cart = Array.isArray(req.body?.Cart) ? req.body.Cart : [];
          const ids = [...new Set(cart.map(i => Number(i.ProductVariantId || i.VariantId || i.Id)).filter(Number.isSafeInteger))];
          if (ids.length > 500) throw new AppError('El carrito excede 500 variantes.');
          if (ids.length) {
            const [rows] = await connection.query(`SELECT DISTINCT p.Marca FROM ProductVariants v JOIN Products p ON p.Id=v.ProductId WHERE v.Id IN (${ids.map(() => '?').join(',')})`, ids);
            rows.forEach(r => brands.add(r.Marca));
            const [drafts] = await connection.query(`SELECT ProductVariantId FROM CLInventoryDrafts WHERE ReviewedAt IS NULL AND ProductVariantId IN (${ids.map(()=>'?').join(',')})`,ids);
            if(drafts.length) throw new AppError('El carrito contiene productos pendientes de completar. Publica sus datos antes de vender.',409,'DRAFT_PENDING');
          }
        }
        // Cambiar el catálogo de marcas durante un conteo desasociaría su bloqueo.
        if (url.startsWith('/api/settings/brands') && req.method !== 'GET') {
          const [rows] = await connection.execute("SELECT Folio FROM CLInventorySessions WHERE Kind='STOCKTAKE' AND Status IN ('ACTIVE','PAUSED') LIMIT 1");
          if (rows.length) throw new AppError('Finaliza los inventarios completos antes de modificar el catálogo de marcas.', 409, 'BRAND_LOCKED');
        }
        for (const brand of brands) await assertBrandUnlocked(connection, brand);
        // Un borrador no puede venderse/activarse hasta publicarlo desde Productos.
        if (variantId) {
          const [draft] = await connection.execute('SELECT ProductVariantId FROM CLInventoryDrafts WHERE ProductVariantId=? AND ReviewedAt IS NULL', [variantId]);
          if (draft.length) {
            if(url.endsWith('/reactivate'))throw new AppError('Completa el producto y pulsa Publicar en Pendientes de completar.',409,'DRAFT_PENDING');
            if(req.method==='PUT')req.body.Status='Inactivo';
          }
        }
        if (productId && /^\/api\/products\//.test(url)) {
          const [drafts] = await connection.execute('SELECT v.Id FROM ProductVariants v JOIN CLInventoryDrafts d ON d.ProductVariantId=v.Id WHERE v.ProductId=? AND d.ReviewedAt IS NULL LIMIT 1',[productId]);
          if(drafts.length){
            if(url.endsWith('/reactivate'))throw new AppError('Publica las variantes pendientes desde Productos, no mediante reactivación.',409,'DRAFT_PENDING');
            if(req.method==='PUT')req.body.Status='Inactivo';
          }
        }
        if(/^\/api\/product-variants(?:\/\d+)?$/.test(url) && ['POST','PUT'].includes(req.method)){
          const stock=Number(req.body.Stock),price=Number(req.body.Price),power=Number(req.body.Power);
          if(!Number.isSafeInteger(stock)||stock<0||stock>2147483647||!Number.isFinite(price)||price<0||!Number.isFinite(power))throw new AppError('Stock debe ser un entero no negativo; precio y graduación deben ser números válidos.');
          const codes=[...new Set([req.body.ScanCode,req.body.FactoryCode,req.body.InternalCode].filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim()))];
          for(const code of codes){
            const [duplicates]=await connection.execute('SELECT Id FROM ProductVariants WHERE (ScanCode=? OR FactoryCode=? OR InternalCode=?) AND Id<>? LIMIT 1',[code,code,code,variantId||0]);
            if(duplicates.length)throw new AppError('Este código ya pertenece a otra variante. No se guardó un código duplicado.',409,'DUPLICATE_CODE');
            const [aliases]=await connection.execute('SELECT ProductVariantId FROM CLProductCodeAliases WHERE Code=? AND ProductVariantId<>? LIMIT 1',[code,variantId||0]);
            if(aliases.length)throw new AppError('Este código ya está asociado a otra variante. Usa el producto existente.',409,'DUPLICATE_CODE');
          }
        }
        req.stockConnection = connection;
        await handler(req, res, next);
      } catch (error) { if (!res.headersSent) sendError(res, error); else console.error('[Stock guard]', error.code || error.name); }
      finally { if (connection) { const released = !locked || await releaseStockLock(connection); if (released) connection.release(); } }
    };
  };
};
