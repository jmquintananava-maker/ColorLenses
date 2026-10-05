-- ColorLenses 3.0.5: códigos adicionales de una misma variante.
-- Migración aditiva e idempotente. Conserva códigos originales y existencias.
-- El servidor prepara esta tabla antes de iniciar transacciones de stock.
-- Ejecutar manualmente si la cuenta de la aplicación no tiene permiso CREATE.
CREATE TABLE IF NOT EXISTS CLProductCodeAliases (
  Code VARCHAR(512) NOT NULL PRIMARY KEY,
  ProductVariantId BIGINT NOT NULL,
  CreatedAt DATETIME(3) NOT NULL,
  CreatedBy BIGINT NULL,
  INDEX IX_CLCodeAliases_Variant (ProductVariantId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
