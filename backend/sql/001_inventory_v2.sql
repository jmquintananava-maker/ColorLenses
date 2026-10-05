-- ColorLenses 2.0 — ejecutar sobre la MISMA base MySQL/MariaDB del sistema.
-- Migración aditiva e idempotente: NO borra, NO modifica stock y NO sustituye SPs.
-- Respaldar la base antes. Products y ProductVariants deben usar InnoDB.
CREATE TABLE IF NOT EXISTS CLInventorySessions (
  Id CHAR(36) NOT NULL PRIMARY KEY,
  Folio VARCHAR(40) NOT NULL,
  RequestKey CHAR(36) NOT NULL,
  Kind ENUM('RECEIPT','STOCKTAKE') NOT NULL,
  Brand VARCHAR(190) NULL,
  Reference VARCHAR(190) NOT NULL DEFAULT '',
  Notes TEXT NULL,
  Status ENUM('ACTIVE','PAUSED','COMPLETED') NOT NULL DEFAULT 'ACTIVE',
  CreatedBy BIGINT NOT NULL,
  CreatedByName VARCHAR(190) NOT NULL,
  CreatedAt DATETIME(3) NOT NULL,
  UpdatedAt DATETIME(3) NOT NULL,
  CompletedAt DATETIME(3) NULL,
  UNIQUE KEY UX_CLInventory_Folio (Folio),
  UNIQUE KEY UX_CLInventory_Request (RequestKey),
  KEY IX_CLInventory_State (Kind,Status,Brand),
  KEY IX_CLInventory_Date (CreatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS CLInventoryBaseline (
  SessionId CHAR(36) NOT NULL,
  ProductVariantId BIGINT NOT NULL,
  ProductId BIGINT NOT NULL,
  Code VARCHAR(512) NOT NULL DEFAULT '',
  Marca VARCHAR(190) NOT NULL DEFAULT '',
  Modelo VARCHAR(255) NOT NULL DEFAULT '',
  Category VARCHAR(190) NOT NULL DEFAULT '',
  Color VARCHAR(190) NOT NULL DEFAULT '',
  Power DECIMAL(8,2) NULL,
  PowerLabel VARCHAR(100) NOT NULL DEFAULT '',
  Price DECIMAL(14,2) NOT NULL DEFAULT 0,
  StockBefore INT NOT NULL,
  VariantStatus VARCHAR(40) NOT NULL DEFAULT '',
  ProductStatus VARCHAR(40) NOT NULL DEFAULT '',
  PRIMARY KEY (SessionId,ProductVariantId),
  CONSTRAINT FK_CLBaseline_Session FOREIGN KEY (SessionId) REFERENCES CLInventorySessions(Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS CLInventoryLines (
  Id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  SessionId CHAR(36) NOT NULL,
  RequestKey CHAR(36) NOT NULL,
  ProductVariantId BIGINT NOT NULL,
  ProductId BIGINT NOT NULL,
  Code VARCHAR(512) NOT NULL,
  Quantity INT UNSIGNED NOT NULL,
  StockBefore INT NOT NULL,
  StockAfter INT NOT NULL,
  Marca VARCHAR(190) NOT NULL DEFAULT '',
  Modelo VARCHAR(255) NOT NULL DEFAULT '',
  Category VARCHAR(190) NOT NULL DEFAULT '',
  Color VARCHAR(190) NOT NULL DEFAULT '',
  Power DECIMAL(8,2) NULL,
  PowerLabel VARCHAR(100) NOT NULL DEFAULT '',
  Price DECIMAL(14,2) NOT NULL DEFAULT 0,
  NeedsReview TINYINT(1) NOT NULL DEFAULT 0,
  ScanMethod VARCHAR(16) NOT NULL DEFAULT 'MANUAL',
  CreatedBy BIGINT NOT NULL,
  CreatedByName VARCHAR(190) NOT NULL,
  CreatedAt DATETIME(3) NOT NULL,
  VoidedAt DATETIME(3) NULL,
  VoidedBy BIGINT NULL,
  UNIQUE KEY UX_CLLine_Request (SessionId,RequestKey),
  KEY IX_CLLine_Variant (ProductVariantId),
  KEY IX_CLLine_Session (SessionId,CreatedAt),
  CONSTRAINT FK_CLLine_Session FOREIGN KEY (SessionId) REFERENCES CLInventorySessions(Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS CLInventoryDrafts (
  ProductVariantId BIGINT NOT NULL PRIMARY KEY,
  SessionId CHAR(36) NOT NULL,
  Code VARCHAR(512) NOT NULL,
  CreatedAt DATETIME(3) NOT NULL,
  ReviewedAt DATETIME(3) NULL,
  ReviewedBy BIGINT NULL,
  KEY IX_CLDraft_Pending (ReviewedAt),
  CONSTRAINT FK_CLDraft_Session FOREIGN KEY (SessionId) REFERENCES CLInventorySessions(Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS CLInventoryEvents (
  Id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  SessionId CHAR(36) NOT NULL,
  Action VARCHAR(40) NOT NULL,
  ActorId BIGINT NOT NULL,
  ActorName VARCHAR(190) NOT NULL,
  CreatedAt DATETIME(3) NOT NULL,
  KEY IX_CLEvent_Session (SessionId),
  CONSTRAINT FK_CLEvent_Session FOREIGN KEY (SessionId) REFERENCES CLInventorySessions(Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
