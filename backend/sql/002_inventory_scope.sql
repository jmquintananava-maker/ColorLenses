-- ColorLenses 3.0.3: alcance por categorías y graduación.
-- Aditiva e idempotente. No altera stock ni inventarios anteriores.
-- El servidor la prepara automáticamente al abrir Inventarios. Ejecutar
-- manualmente solo si el usuario de la aplicación no puede crear tablas.
CREATE TABLE IF NOT EXISTS CLInventoryScopes (
  SessionId CHAR(36) NOT NULL PRIMARY KEY,
  Categories LONGTEXT NULL,
  Graduation ENUM('ALL','PLANO','PRESCRIPTION') NOT NULL,
  CONSTRAINT FK_CLScope_Session FOREIGN KEY (SessionId) REFERENCES CLInventorySessions(Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
