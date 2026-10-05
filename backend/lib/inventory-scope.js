'use strict';
const { AppError, text, sameBrand } = require('./inventory-core');
const { normalize } = require('./product-filters');
const graduationLabels = { ALL:'Todas las graduaciones', PLANO:'Sin graduación', PRESCRIPTION:'Con graduación' };
const schemaSQL = `CREATE TABLE IF NOT EXISTS CLInventoryScopes (
 SessionId CHAR(36) NOT NULL PRIMARY KEY,
 Categories LONGTEXT NULL,
 Graduation ENUM('ALL','PLANO','PRESCRIPTION') NOT NULL,
 CONSTRAINT FK_CLScope_Session FOREIGN KEY (SessionId) REFERENCES CLInventorySessions(Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
const schemaPromises = new WeakMap();
async function ensureScopeSchema(db) {
  // DDL fuera de cualquier transacción de stock; no altera productos ni sesiones anteriores.
  if (!schemaPromises.has(db)) {
    const promise = (async()=>{
      const [rows]=await db.execute("SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='CLInventoryScopes'");
      if(rows.length) {
        if(String(rows[0].ENGINE).toUpperCase()!=='INNODB') throw new AppError('CLInventoryScopes debe usar InnoDB para guardar el alcance junto con el inventario.',503,'SCHEMA_NOT_READY');
        return;
      }
      await db.execute(schemaSQL);
    })().catch(error => {
      schemaPromises.delete(db);
      if(error instanceof AppError) throw error;
      console.error('[Inventory scope schema]', error.code, error.message);
      throw new AppError('No se pudo preparar el alcance del inventario. Ejecuta backend/sql/002_inventory_scope.sql en la base de datos y vuelve a intentar.',503,'SCOPE_SCHEMA_REQUIRED');
    });
    schemaPromises.set(db,promise);
  }
  await schemaPromises.get(db);
}
function parseScope(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.hasOwn(value,'categories'))
    throw new AppError('Selecciona las categorías y la graduación antes de iniciar el conteo. Recarga la página si no ves estas opciones.',400,'SCOPE_REQUIRED');
  const graduation = text(value.graduation,20);
  if (!Object.hasOwn(graduationLabels,graduation)) throw new AppError('Selecciona una graduación válida.');
  let categories = null;
  if (value.categories !== null) {
    if (!Array.isArray(value.categories) || !value.categories.length || value.categories.length>100)
      throw new AppError('Selecciona al menos una categoría o elige todas las categorías.');
    const names = new Map();
    for (const category of value.categories) {
      const name = text(category,190);
      if (!name) throw new AppError('La categoría no puede estar vacía.');
      names.set(normalize(name),name);
    }
    categories = [...names.values()].sort((a,b)=>a.localeCompare(b,'es'));
  }
  return { categories, graduation };
}
function scopeFromSession(session) {
  return { categories:session.ScopeCategories ?? null, graduation:session.ScopeGraduation || 'ALL' };
}
function scopeLabel(scope) {
  return `${scope.categories === null ? 'Todas las categorías' : scope.categories.join(', ')} · ${graduationLabels[scope.graduation]}`;
}
function decorateSession(session) {
  const raw = session.ScopeCategoriesJSON;
  const scope = { categories:raw == null ? null : typeof raw === 'string' ? JSON.parse(raw) : raw, graduation:session.ScopeGraduation || 'ALL' };
  const {ScopeCategoriesJSON,...header} = session;
  return { ...header, ScopeCategories:scope.categories, ScopeGraduation:scope.graduation,
    ScopeLabel:session.Kind==='STOCKTAKE' ? scopeLabel(scope) : null,
    LegacyScope:session.Kind==='STOCKTAKE' && !session.ScopeGraduation };
}
function sameScope(a,b) {
  const keys = s=>s.categories === null ? null : s.categories.map(normalize).sort();
  return a.graduation===b.graduation && JSON.stringify(keys(a))===JSON.stringify(keys(b));
}
function restrictedScope(scope) { return scope.categories !== null || scope.graduation !== 'ALL'; }
function matchesScope(product,scope) {
  if (scope.categories !== null && !scope.categories.some(c=>sameBrand(c,product.Category))) return false;
  if (scope.graduation==='ALL') return true;
  // Power=0 en un borrador NO significa que ya se confirmó que es sin graduación.
  if (Number(product.NeedsReview) || product.Power == null || !Number.isFinite(Number(product.Power))) return false;
  return scope.graduation==='PLANO' ? Number(product.Power)===0 : Number(product.Power)!==0;
}
function scopePredicate(brand,scope) {
  const conditions=['LOWER(TRIM(p.Marca))=LOWER(TRIM(?))'], params=[brand];
  if (scope.categories !== null) {
    conditions.push('('+scope.categories.map(()=> 'LOWER(TRIM(p.Category))=LOWER(TRIM(?))').join(' OR ')+')');
    params.push(...scope.categories);
  }
  if (scope.graduation!=='ALL') {
    conditions.push(scope.graduation==='PLANO' ? 'v.Power=0' : 'v.Power<>0');
    conditions.push('NOT EXISTS (SELECT 1 FROM CLInventoryDrafts d WHERE d.ProductVariantId=v.Id AND d.ReviewedAt IS NULL)');
  }
  return {sql:conditions.join(' AND '),params};
}
function assertInScope(product,header) {
  if (!product) {
    if (restrictedScope(scopeFromSession(header))) throw new AppError('Este código no tiene categoría y graduación confirmadas. Regístralo y completa sus datos en Productos o en una entrada de mercancía antes de contarlo aquí.',409,'UNKNOWN_SCOPE');
    return;
  }
  if (!sameBrand(product.Marca,header.Brand)) throw new AppError(`El código pertenece a ${product.Marca}, no a ${header.Brand}. No se modificó ninguna cantidad.`,409,'WRONG_BRAND');
  if (!matchesScope(product,scopeFromSession(header))) throw new AppError(`Este producto está fuera del alcance: ${header.ScopeLabel}. No se modificó ninguna cantidad.`,409,'OUTSIDE_SCOPE');
}
module.exports = { schemaSQL, ensureScopeSchema, parseScope, scopeFromSession, scopeLabel, decorateSession, sameScope, restrictedScope, matchesScope, scopePredicate, assertInScope };
