'use strict';
const { createHash } = require('node:crypto');
class AppError extends Error {
  constructor(message, status = 400, code = 'VALIDATION', details) {
    super(message); this.status = status; this.code = code; this.details = details;
  }
}
function text(value, max = 190, allowLineBreaks = false) {
  if (value == null) return '';
  if (typeof value !== 'string') throw new AppError('El valor debe ser texto.');
  const clean = value.trim();
  if (clean.length > max) throw new AppError(`El texto excede ${max} caracteres.`);
  if ((allowLineBreaks ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(clean)) throw new AppError('El texto contiene caracteres de control.');
  return clean;
}
function codeValue(value) {
  // No convertir a número: los ceros iniciales forman parte del código.
  const clean = text(value, 512);
  if (!clean) throw new AppError('Escanea o escribe un código.');
  return clean;
}
function positiveInteger(value, max = 1000000) {
  if (!['string','number'].includes(typeof value) || String(value).trim() === '') throw new AppError('Indica una cantidad entera positiva.');
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > max) throw new AppError(`La cantidad debe ser un entero entre 1 y ${max}.`);
  return n;
}
function requestKey(value) {
  const key = text(value, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) throw new AppError('Identificador de operación inválido. Recarga la página.');
  return key.toLowerCase();
}
function sameBrand(a, b) { return String(a || '').trim().localeCompare(String(b || '').trim(), 'es', { sensitivity: 'base' }) === 0; }
function lockName() { return 'cl-stock-' + createHash('sha256').update(process.env.DB_NAME || 'colorlenses').digest('hex').slice(0, 40); }
async function acquireStockLock(connection) {
  const [rows] = await connection.execute('SELECT GET_LOCK(?, 10) AS Acquired', [lockName()]);
  if (Number(rows[0]?.Acquired) !== 1) throw new AppError('Hay otra operación guardándose. Intenta nuevamente.', 409, 'BUSY');
}
async function releaseStockLock(connection) {
  try { await connection.execute('SELECT RELEASE_LOCK(?)', [lockName()]); return true; }
  catch { connection.destroy(); return false; }
}
async function transaction(db, fn) {
  const connection = await db.getConnection(); let locked = false;
  try {
    await acquireStockLock(connection); locked = true;
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) { await connection.rollback().catch(() => {}); throw error; }
  finally { const released = !locked || await releaseStockLock(connection); if (released) connection.release(); }
}
async function assertBrandUnlocked(connection, brand, ownSession = '') {
  const [rows] = await connection.execute(
    `SELECT Id, Folio, Brand, Status FROM CLInventorySessions
     WHERE Kind='STOCKTAKE' AND Status IN ('ACTIVE','PAUSED')
       AND LOWER(TRIM(Brand))=LOWER(TRIM(?)) AND Id<>? LIMIT 1`, [brand, ownSession]);
  if (rows.length) throw new AppError(`La marca ${rows[0].Brand} está en inventario completo (${rows[0].Folio}). Finalízalo antes de vender, recibir o editar esa marca.`, 409, 'BRAND_LOCKED', rows[0]);
}
function sendError(res, error) {
  const missing = error.code === 'ER_NO_SUCH_TABLE';
  const status = error.status || (missing ? 503 : 500);
  if (status === 500) console.error('[Inventory]', error.code || error.name, error.message);
  return res.status(status).json({
    message: missing ? 'Falta instalar la migración de inventarios. Ejecuta backend/sql/001_inventory_v2.sql.' : (error.status ? error.message : 'No se pudo guardar. No se confirmó esta operación; vuelve a intentarlo con el mismo registro.'),
    code: missing ? 'MIGRATION_REQUIRED' : (error.status ? error.code : 'SERVER_ERROR'),
    ...(error.details ? { details: error.details } : {})
  });
}
module.exports = { AppError, text, codeValue, positiveInteger, requestKey, sameBrand, transaction, acquireStockLock, releaseStockLock, assertBrandUnlocked, sendError };
