'use strict';
const { AppError, codeValue, positiveInteger } = require('./inventory-core');

const schemaSQL = `CREATE TABLE IF NOT EXISTS CLProductCodeAliases (
 Code VARCHAR(512) NOT NULL PRIMARY KEY,
 ProductVariantId BIGINT NOT NULL,
 CreatedAt DATETIME(3) NOT NULL,
 CreatedBy BIGINT NULL,
 INDEX IX_CLCodeAliases_Variant (ProductVariantId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;
const schemaPromises = new WeakMap();
const schemaQuery = "SELECT ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='CLProductCodeAliases'";

async function ensureCodeSchema(db) {
  // Llamar antes de abrir una transacción: CREATE TABLE provoca commit implícito.
  if (!schemaPromises.has(db)) {
    const promise = (async () => {
      let [rows] = await db.execute(schemaQuery);
      if (!rows.length) {
        await db.execute(schemaSQL);
        [rows] = await db.execute(schemaQuery);
      }
      if (!rows.length || String(rows[0].ENGINE).toUpperCase() !== 'INNODB') {
        throw new AppError('CLProductCodeAliases debe usar InnoDB. Revisa backend/sql/003_product_code_aliases.sql antes de asociar códigos.', 503, 'CODE_SCHEMA_REQUIRED');
      }
    })().catch(error => {
      schemaPromises.delete(db);
      if (error instanceof AppError) throw error;
      console.error('[Product code schema]', error.code, error.message);
      throw new AppError('No se pudo preparar el registro de códigos adicionales. Ejecuta backend/sql/003_product_code_aliases.sql en la base de datos y vuelve a intentar.', 503, 'CODE_SCHEMA_REQUIRED');
    });
    schemaPromises.set(db, promise);
  }
  await schemaPromises.get(db);
}

// Cada uso necesita cuatro parámetros con el mismo código, conservado como texto.
const codeMatchSql = '(v.ScanCode=? OR v.FactoryCode=? OR v.InternalCode=? OR EXISTS (SELECT 1 FROM CLProductCodeAliases ca WHERE ca.Code=? AND ca.ProductVariantId=v.Id))';

async function existingCode(c, variantId, code) {
  // Consultar alias sin filtrar por una unión interna: un alias huérfano también
  // reserva su código y nunca debe reasignarse de forma silenciosa.
  const [aliases] = await c.execute(`SELECT a.ProductVariantId,v.Id AS ExistingVariantId
    FROM CLProductCodeAliases a LEFT JOIN ProductVariants v ON v.Id=a.ProductVariantId
    WHERE a.Code=? FOR UPDATE`, [code]);
  if (aliases.some(alias => alias.ExistingVariantId == null)) {
    throw new AppError('Este código está asociado a una variante que ya no existe. Revisa el registro de códigos antes de continuar; no se reasignó.', 409, 'CODE_ORPHAN');
  }
  const [originals] = await c.execute('SELECT Id FROM ProductVariants WHERE ScanCode=? OR FactoryCode=? OR InternalCode=? FOR UPDATE', [code, code, code]);
  if (aliases.some(alias => Number(alias.ProductVariantId) !== variantId) || originals.some(variant => Number(variant.Id) !== variantId)) {
    throw new AppError('Este código ya pertenece a otra variante. No se reasignó ni se modificaron sus códigos.', 409, 'CODE_CONFLICT');
  }
  return aliases.length > 0 || originals.length > 0;
}

async function associateCode(c, variantId, value, user) {
  const id = positiveInteger(variantId, Number.MAX_SAFE_INTEGER);
  const code = codeValue(value);
  const actor = positiveInteger(user?.id, Number.MAX_SAFE_INTEGER);
  const [variants] = await c.execute('SELECT Id FROM ProductVariants WHERE Id=? FOR UPDATE', [id]);
  if (!variants.length) throw new AppError('La variante seleccionada ya no existe. Vuelve a buscar el producto.', 404, 'NOT_FOUND');
  // El llamador debe mantener el bloqueo global de stock y la transacción,
  // incluyendo la recepción que se confirme junto con este código.
  if (await existingCode(c, id, code)) return { code, variantId:id, created:false };
  try {
    await c.execute('INSERT INTO CLProductCodeAliases (Code,ProductVariantId,CreatedAt,CreatedBy) VALUES (?,?,UTC_TIMESTAMP(3),?)', [code, id, actor]);
  } catch (error) {
    // La PK evita una segunda asociación incluso ante un escritor externo.
    if (error.code !== 'ER_DUP_ENTRY') throw error;
    if (await existingCode(c, id, code)) return { code, variantId:id, created:false };
    throw error;
  }
  return { code, variantId:id, created:true };
}

module.exports = { schemaSQL, ensureCodeSchema, codeMatchSql, associateCode };
