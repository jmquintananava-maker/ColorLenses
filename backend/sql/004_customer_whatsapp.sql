-- MariaDB: cambio aditivo. Conserva teléfonos, tarjetas, puntos y clientes.
-- La aplicación reutiliza la columna si ya existe; no necesita reemplazar SPs.
ALTER TABLE Customers ADD COLUMN IF NOT EXISTS WhatsApp VARCHAR(30) NOT NULL DEFAULT '' AFTER Phone;
