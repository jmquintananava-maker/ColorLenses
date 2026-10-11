'use strict';

const { AppError, requestKey, positiveInteger } = require('./inventory-core');
const schemas = new WeakMap();
const columnQuery = "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='Customers' AND LOWER(COLUMN_NAME)='whatsapp'";

async function ensureCustomerContacts(db) {
  if (!schemas.has(db)) {
    schemas.set(db, (async () => {
      let [columns] = await db.execute(columnQuery);
      if (!columns.length) {
        try {
          await db.execute("ALTER TABLE Customers ADD COLUMN WhatsApp VARCHAR(30) NOT NULL DEFAULT '' AFTER Phone");
        } catch (error) {
          // Otro proceso puede haber agregado la misma columna al desplegar.
          if (error.code !== 'ER_DUP_FIELDNAME') throw error;
        }
        [columns] = await db.execute(columnQuery);
      }
      const name = columns[0]?.COLUMN_NAME;
      if (!name || !/^whatsapp$/i.test(name)) throw new Error('Falta Customers.WhatsApp');
      return '`' + name + '`';
    })().catch(error => {
      schemas.delete(db);
      console.error('[Customer contacts schema]', error.code || error.name);
      throw new AppError('No se pudo preparar WhatsApp. Ejecuta backend/sql/004_customer_whatsapp.sql en la base de datos y vuelve a intentar.', 503, 'CUSTOMER_SCHEMA_REQUIRED');
    }));
  }
  return schemas.get(db);
}

function field(value, name, limit, required = false, telephone = false) {
  const result = value == null ? '' : typeof value === 'string' ? value.trim() : null;
  if (result === null || result.length > limit || /[\u0000-\u001f\u007f]/.test(result) ||
      (required && !result) || (telephone && result && (!/^[+\d\s().-]+$/.test(result) || !/^\d{7,15}$/.test(result.replace(/\D/g, ''))))) {
    throw new AppError(name === 'FullName' ? 'Captura el nombre completo (máximo 150 caracteres).' :
      name === 'Phone' ? 'Revisa el teléfono: captura entre 7 y 15 dígitos.' : 'Revisa WhatsApp: captura entre 7 y 15 dígitos.',
      400, 'CUSTOMER_FIELD_INVALID', { field: name });
  }
  return result;
}

function quickValues(payload = {}) {
  if (!payload || typeof payload !== 'object') throw new AppError('Captura los datos del cliente.', 400, 'CUSTOMER_FIELD_INVALID');
  const FullName = field(payload.FullName, 'FullName', 150, true);
  const Phone = field(payload.Phone, 'Phone', 30, true, true);
  const WhatsApp = field(payload.WhatsApp === undefined ? Phone : payload.WhatsApp, 'WhatsApp', 30, true, true);
  const key = requestKey(payload.RequestKey);
  // La misma captura siempre usa el mismo slug, incluso si se reintenta por red.
  const CardSlug = 'cliente-' + key;
  return { FullName, Phone, WhatsApp, CardSlug, QRCode: '/card/' + CardSlug };
}

function contactRow(row) {
  const key = Object.keys(row).find(name => name.toLowerCase() === 'whatsapp');
  return { ...row, WhatsApp: (key && row[key]) || row.Phone || '' };
}

async function transaction(db, work) {
  const c = await db.getConnection();
  let open = false, discard = false;
  const rollback = async () => {
    try { await c.rollback(); }
    catch (error) { discard = true; c.destroy(); throw error; }
    finally { open = false; }
  };
  try {
    await c.beginTransaction(); open = true;
    const result = await work(c, rollback);
    if (open) { await c.commit(); open = false; }
    return result;
  } catch (error) {
    if (open) { try { await rollback(); } catch { /* La conexión se descartó. */ } }
    throw error;
  } finally { if (!discard) c.release(); }
}

function createCustomerContacts(db) {
  async function includeContacts(rows) {
    const column = await ensureCustomerContacts(db);
    if (!rows.length) return rows;
    const [contacts] = await db.execute(`SELECT Id,${column} AS WhatsApp FROM Customers`);
    const byId = new Map(contacts.map(row => [String(row.Id), row.WhatsApp]));
    return rows.map(row => ({ ...row, WhatsApp: byId.get(String(row.Id)) || row.Phone || '' }));
  }

  async function quickCreate(payload) {
    const value = quickValues(payload);
    const column = await ensureCustomerContacts(db);
    return transaction(db, async (c, rollback) => {
      try {
        await c.execute(`INSERT INTO Customers (FullName,Phone,${column},Email,Notes,CardSlug,QRCode,Status,Points,Level)
          VALUES (?,?,?,'','',?,?,'Activo',0,'Silver')`,
          [value.FullName, value.Phone, value.WhatsApp, value.CardSlug, value.QRCode]);
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') throw error;
        await rollback();
        const [existing] = await c.execute(`SELECT *,${column} AS WhatsApp FROM Customers WHERE CardSlug=?`, [value.CardSlug]);
        const customer = existing[0];
        if (!customer || customer.FullName !== value.FullName || customer.Phone !== value.Phone || customer.WhatsApp !== value.WhatsApp) {
          throw new AppError('Esta captura ya se guardó con otros datos. Busca el cliente antes de intentar registrarlo de nuevo.', 409, 'CUSTOMER_REQUEST_CONFLICT');
        }
        return { customer: contactRow(customer), repeated: true };
      }
      const [rows] = await c.execute(`SELECT *,${column} AS WhatsApp FROM Customers WHERE CardSlug=?`, [value.CardSlug]);
      if (!rows[0]) throw new Error('No se pudo recuperar el cliente creado');
      return { customer: contactRow(rows[0]), repeated: false };
    });
  }

  async function create(payload) {
    const column = await ensureCustomerContacts(db);
    const WhatsApp = field(payload.WhatsApp === undefined ? payload.Phone : payload.WhatsApp, 'WhatsApp', 30);
    return transaction(db, async c => {
      await c.execute('CALL CreateCustomer(?,?,?,?,?,?)', ['FullName', 'Phone', 'Email', 'Notes', 'CardSlug', 'QRCode'].map(key => payload[key] == null ? '' : String(payload[key])));
      const [rows] = await c.execute('SELECT * FROM Customers WHERE CardSlug=?', [payload.CardSlug]);
      if (!rows[0]) throw new Error('No se pudo recuperar el cliente creado');
      await c.execute(`UPDATE Customers SET ${column}=? WHERE Id=?`, [WhatsApp, rows[0].Id]);
      return contactRow({ ...rows[0], WhatsApp });
    });
  }

  async function update(id, payload) {
    const customerId = positiveInteger(id, Number.MAX_SAFE_INTEGER);
    const column = await ensureCustomerContacts(db);
    const hasWhatsApp = Object.hasOwn(payload, 'WhatsApp');
    const WhatsApp = hasWhatsApp ? field(payload.WhatsApp, 'WhatsApp', 30) : null;
    return transaction(db, async c => {
      const [existing] = await c.execute('SELECT Id FROM Customers WHERE Id=? FOR UPDATE', [customerId]);
      if (!existing.length) throw new AppError('El cliente ya no existe.', 404, 'CUSTOMER_NOT_FOUND');
      await c.execute('CALL UpdateCustomer(?,?,?,?,?,?,?,?,?,?)', [customerId,
        ...['FullName', 'Phone', 'Email', 'Notes', 'CardSlug', 'QRCode'].map(key => payload[key] == null ? '' : String(payload[key])),
        payload.Status || 'Activo', Number(payload.Points || 0), payload.Level || 'Silver']);
      if (hasWhatsApp) await c.execute(`UPDATE Customers SET ${column}=? WHERE Id=?`, [WhatsApp, customerId]);
      await c.execute('CALL RecalculateCustomerPoints(?)', [customerId]);
    });
  }

  return { includeContacts, quickCreate, create, update };
}

module.exports = { ensureCustomerContacts, quickValues, createCustomerContacts };
