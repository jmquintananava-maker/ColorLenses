require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const bcrypt = require("bcryptjs");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("./db");

const app = express();
const { createToken, verifyToken } = require('./lib/auth')(db);
const withStockLock = require('./lib/stock-guard')(db);

/* =========================
   MIDDLEWARES
========================= */

app.use(cors({ exposedHeaders: ['Content-Disposition'] }));
app.use(express.json({ limit: '1mb' }));
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  // Catálogo/configuración de lectura siguen públicos. El resto es administrativo.
  const publicRead = req.method === 'GET' && (
    ['/api/test','/api/health','/api/products','/api/product-variants','/api/powers'].includes(req.path) ||
    /^\/api\/(?:products|product-variants)\/\d+(?:\/variants)?$/.test(req.path) ||
    /^\/api\/settings\/(?:brands|categories|colors|banners)$/.test(req.path) ||
    /^\/api\/cards\/[^/]+$/.test(req.path)
  );
  if (!req.path.startsWith('/api/') || req.method === 'OPTIONS' || publicRead || req.path === '/api/auth/login') return next();
  return verifyToken(req, res, next);
});
app.get('/api/health', (req,res) => res.json({ ok:true, version:'2.1.3' }));
// Tarjeta pública por su slug: no exponer todo el padrón de clientes.
app.get('/api/cards/:slug', async (req,res)=>{
  try {
    if(req.params.slug.length>190)return res.status(400).json({message:'Tarjeta inválida.'});
    const [rows]=await db.execute('SELECT FullName,CardSlug,Level FROM Customers WHERE CardSlug=? AND Status=\'Activo\' LIMIT 1',[req.params.slug]);
    if(!rows.length)return res.status(404).json({message:'Tarjeta no encontrada o inactiva.'});
    res.json(rows[0]);
  } catch {res.status(500).json({message:'No se pudo cargar esta tarjeta.'});}
});
app.use('/api/inventory', require('./routes/inventory')(db));
app.use('/api/reports', require('./routes/reports')(db));
app.use('/api/analytics', require('./routes/analytics')(db));

/* =========================
   UPLOADS FOLDER
========================= */

const uploadsPath = path.join(__dirname, "uploads");
const productUploadsPath = path.join(__dirname, "uploads/products");

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath);
}

if (!fs.existsSync(productUploadsPath)) {
  fs.mkdirSync(productUploadsPath, {
    recursive: true
  });
}

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

/* =========================
   HELPERS
========================= */

const safeString = (value) => {
  return value === undefined || value === null
    ? ""
    : value;
};

const safeNumber = (value) => {
  return value === undefined || value === null || value === ""
    ? 0
    : Number(value);
};

const calculatePointsByLevel = (total, level) => {
  const cleanTotal = safeNumber(total);
  const cleanLevel = level || "Silver";

  if (cleanLevel === "Silver") {
    return Math.floor(cleanTotal / 50);
  }

  if (cleanLevel === "Gold") {
    return Math.floor(cleanTotal / 30);
  }

  if (cleanLevel === "Black") {
    return Math.floor(cleanTotal / 10);
  }

  return Math.floor(cleanTotal / 50);
};

/* =========================
   MULTER STORAGE
========================= */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, productUploadsPath);
  },

  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() +
      "-" +
      file.originalname.replace(/\s+/g, "-");

    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req,file,cb){
    const ext=path.extname(file.originalname).toLowerCase();
    if(!['.jpg','.jpeg','.png','.webp','.gif'].includes(ext)||!['image/jpeg','image/png','image/webp','image/gif'].includes(file.mimetype))return cb(new Error('Solo se permiten imágenes JPG, PNG, WebP o GIF de hasta 10 MB.'));
    cb(null,true);
  }
});

/* =========================
   TEST
========================= */

app.get("/api/test", (req, res) => {
  res.send("🔥 ColorLenses Backend funcionando");
});

/* =========================
   UPLOAD IMAGE
========================= */

app.post(
  "/api/upload",
  upload.single("image"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No se subió ninguna imagen"
        });
      }

      res.json({
        fileName: req.file.filename,
        imageUrl: `/uploads/products/${req.file.filename}`
      });
    } catch (err) {
      console.log("❌ Upload error:", err);
      res.status(500).json(err);
    }
  }
);

/* =========================
   PRODUCTS API
   PRODUCTO BASE
========================= */

app.get("/api/products", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "CALL GetProducts()"
    );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Get products error:", err);

    res.status(500).json({
      message: "Error consultando productos",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
});

app.get("/api/products-inactive", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "CALL GetInactiveProducts()"
    );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Get inactive products error:", err);

    res.status(500).json({
      message: "Error consultando productos inactivos",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      "CALL GetProductById(?)",
      [id]
    );

    const product = rows[0]?.[0];

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    res.json(product);
  } catch (err) {
    console.log("❌ Get product by id error:", err);

    res.status(500).json({
      message: "Error consultando producto",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
});

app.post("/api/products", withStockLock(async (req, res) => {
  try {
    const {
      SKU,
      Category,
      Marca,
      Modelo,
      Description,
      Image
    } = req.body;

    const [rows] = await req.stockConnection.execute(
      "CALL CreateProduct(?,?,?,?,?,?)",
      [
        safeString(SKU),
        safeString(Category),
        safeString(Marca),
        safeString(Modelo),
        safeString(Description),
        safeString(Image)
      ]
    );

    res.json({
      success: true,
      ProductId: rows[0]?.[0]?.ProductId,
      message: "✅ Producto base creado"
    });
  } catch (err) {
    console.log("❌ Error create product:", err);

    res.status(500).json({
      message: "Error creando producto base",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
}));


app.post("/api/products/find-base", async (req, res) => {
  try {
    const {
      Category,
      Marca,
      Modelo
    } = req.body;

    if (!Category || !Marca || !Modelo) {
      return res.status(400).json({
        found: false,
        message: "Category, Marca y Modelo son requeridos"
      });
    }

    const [rows] = await db.execute(
      "CALL FindProductBase(?,?,?)",
      [
        safeString(Category),
        safeString(Marca),
        safeString(Modelo)
      ]
    );

    const product = rows[0]?.[0];

    if (!product) {
      return res.json({
        found: false,
        ProductId: null
      });
    }

    res.json({
      found: true,
      ProductId: product.ProductId,
      product
    });
  } catch (err) {
    console.log("❌ Error find product base:", err);

    res.status(500).json({
      found: false,
      message: "Error buscando producto base",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
});



app.put("/api/products/:id", withStockLock(async (req, res) => {
  try {
    const { id } = req.params;

    const {
      SKU,
      Category,
      Marca,
      Modelo,
      Description,
      Image,
      Image2,
      Image3,
      Status
    } = req.body;

    // SKU is no longer an editable UI field. Preserve its stored value for legacy SP compatibility.
    const [originalRows] = await req.stockConnection.execute('SELECT SKU FROM Products WHERE Id=?', [id]);
    if(!originalRows.length) return res.status(404).json({message:'Producto no encontrado.'});
    const preservedSKU = originalRows[0].SKU;
    await req.stockConnection.execute(
      "CALL UpdateProduct(?,?,?,?,?,?,?,?,?,?)",
      [
        id,
        preservedSKU,
        safeString(Category),
        safeString(Marca),
        safeString(Modelo),
        safeString(Description),
        safeString(Image),
        safeString(Image2),
        safeString(Image3),
        safeString(Status || "Activo")
      ]
    );

    res.json({
      success: true,
      message: "✅ Producto base actualizado"
    });
  } catch (err) {
    console.log("❌ Error update product:", err);

    res.status(500).json({
      message: "Error actualizando producto base",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
}));

app.delete("/api/products/:id", withStockLock(async (req, res) => {
  try {
    const { id } = req.params;

    await req.stockConnection.execute(
      "CALL DeleteProduct(?)",
      [id]
    );

    res.json({
      success: true,
      message: "🗑️ Producto base desactivado"
    });
  } catch (err) {
    console.log("❌ Delete product error:", err);

    res.status(500).json({
      message: "Error desactivando producto base",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
}));

app.put("/api/products/:id/reactivate", withStockLock(async (req, res) => {
  try {
    const { id } = req.params;

    await req.stockConnection.execute(
      "CALL ReactivateProduct(?)",
      [id]
    );

    res.json({
      success: true,
      message: "✅ Producto base reactivado"
    });
  } catch (err) {
    console.log("❌ Reactivate product error:", err);

    res.status(500).json({
      message: "Error reactivando producto base",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
}));

/* =========================
   PRODUCT VARIANTS API
   PRODUCTO VENDIBLE / ESCANEABLE
========================= */

app.get("/api/product-variants", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "CALL GetProductVariants()"
    );
    let hidden = new Set();
    try {
      const [drafts] = await db.execute('SELECT ProductVariantId FROM CLInventoryDrafts WHERE ReviewedAt IS NULL');
      hidden = new Set(drafts.map(d => Number(d.ProductVariantId)));
    } catch (e) { if (e.code !== 'ER_NO_SUCH_TABLE') throw e; }
    res.json((rows[0] || []).filter(v => !hidden.has(Number(v.ProductVariantId || v.Id))));
  } catch (err) {
    console.log("❌ Get product variants error:", err);

    res.status(500).json({
      message: "Error consultando variantes",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
});

app.get("/api/product-variants-inactive", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "CALL GetInactiveProductVariants()"
    );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Get inactive product variants error:", err);

    res.status(500).json({
      message: "Error consultando variantes inactivas",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
});

app.get("/api/products/:id/variants", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      "CALL GetVariantsByProductId(?)",
      [id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Get variants by product id error:", err);

    res.status(500).json({
      message: "Error consultando variantes del producto",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
});

app.get("/api/product-variants/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      "CALL GetProductVariantById(?)",
      [id]
    );

    const variant = rows[0]?.[0];

    if (!variant) {
      return res.status(404).json({
        message: "Variante no encontrada"
      });
    }

    res.json(variant);
  } catch (err) {
    console.log("❌ Get product variant by id error:", err);

    res.status(500).json({
      message: "Error consultando variante",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
});

app.post("/api/product-variants", withStockLock(async (req, res) => {
  try {
    const {
      ProductId,
      Color,
      Power,
      PowerLabel,
      Price,
      Stock,
      FactoryCode,
      InternalCode,
      ScanCode,
      CodeType
    } = req.body;

    if (!ProductId) {
      return res.status(400).json({
        message: "ProductId es obligatorio"
      });
    }

    let finalFactoryCode = String(FactoryCode || "").trim();
    let finalInternalCode = String(InternalCode || "").trim();
    let finalScanCode = String(ScanCode || "").trim();
    let finalCodeType = String(CodeType || "").trim();

    if (!finalScanCode) {
      finalInternalCode = finalInternalCode || `CL-${Date.now()}`;
      finalScanCode = finalInternalCode;
      finalCodeType = "INTERNAL";
    }

    if (!finalCodeType) {
      finalCodeType = finalFactoryCode ? "BARCODE" : "INTERNAL";
    }

    const cleanPower = safeNumber(Power);

    const cleanPowerLabel =
      Number(cleanPower) === 0
        ? "Sin graduación"
        : safeString(PowerLabel || Number(cleanPower).toFixed(2));

    const [rows] = await req.stockConnection.execute(
      "CALL CreateProductVariant(?,?,?,?,?,?,?,?,?,?)",
      [
        safeNumber(ProductId),
        safeString(Color),
        cleanPower,
        cleanPowerLabel,
        safeNumber(Price),
        safeNumber(Stock),
        finalFactoryCode,
        finalInternalCode,
        finalScanCode,
        finalCodeType
      ]
    );

    res.json({
      success: true,
      ProductVariantId: rows[0]?.[0]?.ProductVariantId,
      ScanCode: finalScanCode,
      FactoryCode: finalFactoryCode || null,
      InternalCode: finalInternalCode || null,
      CodeType: finalCodeType,
      message: "✅ Variante creada"
    });
  } catch (err) {
    console.log("❌ Error create product variant:", err);

    res.status(500).json({
      message: "Error creando variante",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
}));

app.put("/api/product-variants/:id", withStockLock(async (req, res) => {
  try {
    const { id } = req.params;

    const {
      ProductId,
      Color,
      Power,
      PowerLabel,
      Price,
      Stock,
      FactoryCode,
      InternalCode,
      ScanCode,
      CodeType,
      Status
    } = req.body;

    const cleanString = (value) => {
      return String(value || "").trim();
    };

    const cleanNumber = (value) => {
      const number = Number(value);

      if (Number.isNaN(number)) {
        return 0;
      }

      return number;
    };

    const cleanProductId = cleanNumber(ProductId);

    if (!cleanProductId) {
      return res.status(400).json({
        message: "ProductId es requerido para actualizar la variante"
      });
    }

    const cleanPower = cleanNumber(Power);

    const cleanPowerLabel =
      cleanString(PowerLabel) ||
      (cleanPower === 0
        ? "Sin graduación"
        : cleanPower.toFixed(2));

    const finalCodeType =
      cleanString(CodeType) || "BARCODE";

    const finalFactoryCode =
      finalCodeType === "INTERNAL"
        ? ""
        : cleanString(FactoryCode);

    const finalInternalCode =
      finalCodeType === "INTERNAL"
        ? cleanString(InternalCode || ScanCode)
        : cleanString(InternalCode);

    const finalScanCode =
      cleanString(ScanCode) ||
      finalFactoryCode ||
      finalInternalCode;

    const cleanStock = cleanNumber(Stock);

    const finalStatus =
      cleanStock <= 0
        ? "Inactivo"
        : cleanString(Status || "Activo");

    await req.stockConnection.execute(
      "CALL UpdateProductVariant(?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        cleanNumber(id),
        cleanProductId,
        cleanString(Color),
        cleanPower,
        cleanPowerLabel,
        cleanNumber(Price),
        cleanStock,
        finalFactoryCode,
        finalInternalCode,
        finalScanCode,
        finalCodeType,
        finalStatus
      ]
    );

    res.json({
      message: "Variante actualizada correctamente"
    });
  } catch (err) {
    console.error("❌ Error update product variant:", err);

    res.status(500).json({
      message: "Error al actualizar variante",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
}));

app.delete("/api/product-variants/:id", withStockLock(async (req, res) => {
  try {
    const { id } = req.params;

    await req.stockConnection.execute(
      "CALL DeleteProductVariant(?)",
      [id]
    );

    res.json({
      success: true,
      message: "🗑️ Variante desactivada"
    });
  } catch (err) {
    console.log("❌ Delete product variant error:", err);

    res.status(500).json({
      message: "Error desactivando variante",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
}));

app.put("/api/product-variants/:id/reactivate", withStockLock(async (req, res) => {
  try {
    const { id } = req.params;

    await req.stockConnection.execute(
      "CALL ReactivateProductVariant(?)",
      [id]
    );

    res.json({
      success: true,
      message: "✅ Variante reactivada"
    });
  } catch (err) {
    console.log("❌ Reactivate product variant error:", err);

    res.status(500).json({
      message: "Error reactivando variante",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
}));

/* =========================
   SCAN PRODUCT BY CODE
   Código de barras, QR o código interno
========================= */

app.get("/api/products/qr/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const cleanCode = String(code || "").trim();

    if (!cleanCode) {
      return res.status(400).json({
        message: "Código vacío"
      });
    }

    const [rows] = await db.execute(
      "CALL GetProductByScanCode(?)",
      [cleanCode]
    );

    const product = rows[0]?.[0];

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    if (product.ProductStatus !== "Activo") {
      return res.status(400).json({
        message: "El producto base está inactivo"
      });
    }

    const variantStatus =
      product.VariantStatus || product.Status;

    if (variantStatus !== "Activo") {
      return res.status(400).json({
        message: "La variante está inactiva"
      });
    }

    if (safeNumber(product.Stock) <= 0) {
      return res.status(400).json({
        message: "Producto sin stock disponible"
      });
    }

    res.json(product);
  } catch (err) {
    console.log("❌ Get product by scan code error:", err);

    res.status(500).json({
      message: "Error buscando producto por código",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
});

app.get("/api/products/scan/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const cleanCode = String(code || "").trim();

    if (!cleanCode) {
      return res.status(400).json({
        message: "Código vacío"
      });
    }

    const [rows] = await db.execute(
      "CALL GetProductByScanCode(?)",
      [cleanCode]
    );

    const product = rows[0]?.[0];

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    if (product.ProductStatus !== "Activo") {
      return res.status(400).json({
        message: "El producto base está inactivo"
      });
    }

    const variantStatus =
      product.VariantStatus || product.Status;

    if (variantStatus !== "Activo") {
      return res.status(400).json({
        message: "La variante está inactiva"
      });
    }

    if (safeNumber(product.Stock) <= 0) {
      return res.status(400).json({
        message: "Producto sin stock disponible"
      });
    }

    res.json(product);
  } catch (err) {
    console.log("❌ Scan product error:", err);

    res.status(500).json({
      message: "Error escaneando producto",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
});

/* =========================
   PRODUCT POWERS API
========================= */

app.get("/api/powers", async (req, res) => {
  try {
    const [rows] = await db.execute(
      "CALL GetProductPowers()"
    );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Get product powers error:", err);

    res.status(500).json({
      message: "Error consultando graduaciones",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
});

/* =========================
   CUSTOMERS API
========================= */

app.get("/api/customers", async (req, res) => {
  try {
    await db.execute("CALL ExpireAllCustomerPoints()");

    const [rows] =
      await db.execute(
        "CALL GetCustomers()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Get customers error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   CREATE CUSTOMER
========================= */

app.post("/api/customers", async (req, res) => {
  try {
    const {
      FullName,
      Phone,
      Email,
      Notes,
      CardSlug,
      QRCode
    } = req.body;

    await db.execute(
      "CALL CreateCustomer(?,?,?,?,?,?)",
      [
        safeString(FullName),
        safeString(Phone),
        safeString(Email),
        safeString(Notes),
        safeString(CardSlug),
        safeString(QRCode)
      ]
    );

    res.json({
      success: true,
      message: "✅ Cliente creado"
    });
  } catch (err) {
    console.log("❌ Create customer error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   UPDATE CUSTOMER
========================= */

app.put("/api/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      FullName,
      Phone,
      Email,
      Notes,
      CardSlug,
      QRCode,
      Status,
      Points,
      Level
    } = req.body;

    await db.execute(
      "CALL UpdateCustomer(?,?,?,?,?,?,?,?,?,?)",
      [
        id,
        safeString(FullName),
        safeString(Phone),
        safeString(Email),
        safeString(Notes),
        safeString(CardSlug),
        safeString(QRCode),
        safeString(Status || "Activo"),
        safeNumber(Points),
        safeString(Level || "Silver")
      ]
    );

    await db.execute(
      "CALL RecalculateCustomerPoints(?)",
      [id]
    );

    res.json({
      success: true,
      message: "✅ Cliente actualizado"
    });
  } catch (err) {
    console.log("❌ Update customer error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   DELETE CUSTOMER
========================= */

app.delete("/api/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
      "CALL DeleteCustomer(?)",
      [id]
    );

    res.json({
      success: true,
      message: "🗑️ Cliente desactivado"
    });
  } catch (err) {
    console.log("❌ Delete customer error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   INACTIVE CUSTOMERS
========================= */

app.get("/api/customers-inactive", async (req, res) => {
  try {
    await db.execute("CALL ExpireAllCustomerPoints()");

    const [rows] =
      await db.execute(
        "CALL GetInactiveCustomers()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Get inactive customers error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   REACTIVATE CUSTOMER
========================= */

app.put("/api/customers/:id/reactivate", async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
      "CALL ReactivateCustomer(?)",
      [id]
    );

    await db.execute(
      "CALL RecalculateCustomerPoints(?)",
      [id]
    );

    res.json({
      success: true,
      message: "✅ Cliente reactivado"
    });
  } catch (err) {
    console.log("❌ Reactivate customer error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   CUSTOMER POINTS API
========================= */

app.get("/api/customers/:id/points", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] =
      await db.execute(
        "CALL GetCustomerAvailablePoints(?)",
        [id]
      );

    res.json(rows[0][0]);
  } catch (err) {
    console.log("❌ Get customer points error:", err);

    res.status(500).json({
      message: "Error consultando puntos del cliente",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
});

app.get("/api/customers/:id/points/lots", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] =
      await db.execute(
        "CALL GetCustomerPointsLots(?)",
        [id]
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Get customer point lots error:", err);

    res.status(500).json({
      message: "Error consultando historial de puntos",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
});

app.post("/api/points/expire", async (req, res) => {
  try {
    await db.execute(
      "CALL ExpireAllCustomerPoints()"
    );

    res.json({
      success: true,
      message: "✅ Puntos vencidos actualizados"
    });
  } catch (err) {
    console.log("❌ Expire points error:", err);

    res.status(500).json({
      message: "Error expirando puntos",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
});

/* =========================
   CUSTOMER SALES HISTORY
========================= */

app.get("/api/customers/:id/sales", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] =
      await db.execute(
        "CALL GetSalesByCustomer(?)",
        [id]
      );

    res.json(rows[0]);
  } catch (err) {
    console.log(
      "❌ Customer sales history error:",
      err
    );

    res.status(500).json(err);
  }
});

/* =========================
   VALIDATE CUSTOMER BY QR
========================= */

app.post("/api/customers/validate-qr", async (req, res) => {
  try {
    const { QRCode } = req.body;

    if (!QRCode) {
      return res.status(400).json({
        status: "error",
        message: "QR requerido"
      });
    }

    const [rows] =
      await db.execute(
        "CALL ValidateCustomerByQR(?)",
        [QRCode]
      );

    const customer =
      rows[0][0];

    if (!customer) {
      return res.status(404).json({
        status: "not_found",
        message: "Cliente no encontrado"
      });
    }

    if (customer.Status === "Inactivo") {
      return res.status(403).json({
        status: "inactive",
        message: "Este cliente está desactivado",
        customer
      });
    }

    await db.execute(
      "CALL RecalculateCustomerPoints(?)",
      [customer.Id]
    );

    const [pointRows] =
      await db.execute(
        "CALL GetCustomerAvailablePoints(?)",
        [customer.Id]
      );

    const pointsData =
      pointRows[0][0];

    res.json({
      status: "active",
      message: "Cliente activo",
      customer: {
        ...customer,
        Points:
          pointsData?.AvailablePoints ??
          customer.Points ??
          0,
        NextExpirationDate:
          pointsData?.NextExpirationDate || null,
        PointsExpiringSoon:
          pointsData?.PointsExpiringSoon || 0
      }
    });
  } catch (err) {
    console.log("❌ Validate customer QR error:", err);

    res.status(500).json({
      status: "error",
      message: "Error validando cliente",
      error: err.message,
      sqlMessage: err.sqlMessage
    });
  }
});

/* =========================
   SALES API
========================= */

app.get("/api/sales", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetSales()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Get sales error:", err);
    res.status(500).json(err);
  }
});

app.get("/api/sales/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] =
      await db.execute(
        "CALL GetSaleById(?)",
        [id]
      );

    res.json(rows[0][0]);
  } catch (err) {
    console.log("❌ Get sale by id error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   REGISTER SALE
   WITH PRODUCT VARIANTS
   WITH POINTS EXPIRATION
========================= */

app.post("/api/sales", withStockLock(
  require('./lib/sales-service')({ calculatePointsByLevel })
));

/* =========================
   DASHBOARD STATS API
========================= */

app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetDashboardStats()"
      );

    res.json({
      TotalSales:
        rows[0][0].TotalSales,

      TotalRevenue:
        rows[1][0].TotalRevenue,

      TotalCustomers:
        rows[2][0].TotalCustomers,

      TotalProducts:
        rows[3][0].TotalProducts,

      LowStock:
        rows[4][0].LowStock
    });
  } catch (err) {
    console.log("❌ Dashboard stats error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   RECENT SALES API
========================= */

app.get("/api/dashboard/recent-sales", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetRecentSales()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Recent sales error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   SALES CHART API
========================= */

app.get("/api/dashboard/sales-chart", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetSalesChart()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Sales chart error:", err);
    res.status(500).json(err);
  }
});

app.get("/api/dashboard/sales-chart/daily", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetSalesChartDaily()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Daily sales chart error:", err);
    res.status(500).json(err);
  }
});

app.get("/api/dashboard/sales-chart/weekly", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetSalesChartWeekly()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Weekly sales chart error:", err);
    res.status(500).json(err);
  }
});

app.get("/api/dashboard/sales-chart/monthly", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetSalesChartMonthly()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Monthly sales chart error:", err);
    res.status(500).json(err);
  }
});

app.get("/api/dashboard/sales-chart/yearly", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetSalesChartYearly()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Yearly sales chart error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   TOP CUSTOMERS API
========================= */

app.get("/api/dashboard/top-customers", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetTopCustomers()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Top customers error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   TOP PRODUCTS API
========================= */

app.get("/api/dashboard/top-products", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetTopProducts()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Top products error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   LOW STOCK PRODUCTS API
========================= */

app.get("/api/dashboard/low-stock-products", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetLowStockProducts()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Low stock products error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   SETTINGS - BRANDS API
========================= */

app.get("/api/settings/brands", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetProductBrands()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Get brands error:", err);
    res.status(500).json(err);
  }
});

app.get("/api/settings/brands-inactive", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetInactiveProductBrands()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Get inactive brands error:", err);
    res.status(500).json(err);
  }
});

app.post("/api/settings/brands", withStockLock(async (req, res) => {
  try {
    const { Name } = req.body;

    if (!Name) {
      return res.status(400).json({
        message: "Nombre de marca requerido"
      });
    }

    await req.stockConnection.execute(
      "CALL CreateProductBrand(?)",
      [safeString(Name)]
    );

    res.json({
      success: true,
      message: "✅ Marca creada"
    });
  } catch (err) {
    console.log("❌ Create brand error:", err);
    res.status(500).json(err);
  }
}));

app.put("/api/settings/brands/:id", withStockLock(async (req, res) => {
  try {
    const { id } = req.params;
    const { Name, Status } = req.body;

    await req.stockConnection.execute(
      "CALL UpdateProductBrand(?,?,?)",
      [
        id,
        safeString(Name),
        safeString(Status || "Activo")
      ]
    );

    res.json({
      success: true,
      message: "✅ Marca actualizada"
    });
  } catch (err) {
    console.log("❌ Update brand error:", err);
    res.status(500).json(err);
  }
}));

app.delete("/api/settings/brands/:id", withStockLock(async (req, res) => {
  try {
    const { id } = req.params;

    await req.stockConnection.execute(
      "CALL DeleteProductBrand(?)",
      [id]
    );

    res.json({
      success: true,
      message: "🗑️ Marca desactivada"
    });
  } catch (err) {
    console.log("❌ Delete brand error:", err);
    res.status(500).json(err);
  }
}));

app.put("/api/settings/brands/:id/reactivate", withStockLock(async (req, res) => {
  try {
    const { id } = req.params;

    await req.stockConnection.execute(
      "CALL ReactivateProductBrand(?)",
      [id]
    );

    res.json({
      success: true,
      message: "✅ Marca reactivada"
    });
  } catch (err) {
    console.log("❌ Reactivate brand error:", err);
    res.status(500).json(err);
  }
}));

/* =========================
   SETTINGS - CATEGORIES API
========================= */

app.get("/api/settings/categories", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetProductCategories()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Get categories error:", err);
    res.status(500).json(err);
  }
});

app.get("/api/settings/categories-inactive", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetInactiveProductCategories()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Get inactive categories error:", err);
    res.status(500).json(err);
  }
});

app.post("/api/settings/categories", async (req, res) => {
  try {
    const { Name } = req.body;

    if (!Name) {
      return res.status(400).json({
        message: "Nombre de categoría requerido"
      });
    }

    await db.execute(
      "CALL CreateProductCategory(?)",
      [safeString(Name)]
    );

    res.json({
      success: true,
      message: "✅ Categoría creada"
    });
  } catch (err) {
    console.log("❌ Create category error:", err);
    res.status(500).json(err);
  }
});

app.put("/api/settings/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { Name, Status } = req.body;

    await db.execute(
      "CALL UpdateProductCategory(?,?,?)",
      [
        id,
        safeString(Name),
        safeString(Status || "Activo")
      ]
    );

    res.json({
      success: true,
      message: "✅ Categoría actualizada"
    });
  } catch (err) {
    console.log("❌ Update category error:", err);
    res.status(500).json(err);
  }
});

app.delete("/api/settings/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
      "CALL DeleteProductCategory(?)",
      [id]
    );

    res.json({
      success: true,
      message: "🗑️ Categoría desactivada"
    });
  } catch (err) {
    console.log("❌ Delete category error:", err);
    res.status(500).json(err);
  }
});

app.put("/api/settings/categories/:id/reactivate", async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
      "CALL ReactivateProductCategory(?)",
      [id]
    );

    res.json({
      success: true,
      message: "✅ Categoría reactivada"
    });
  } catch (err) {
    console.log("❌ Reactivate category error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   SETTINGS - COLORS API
========================= */

app.get("/api/settings/colors", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetProductColors()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Get colors error:", err);
    res.status(500).json(err);
  }
});

app.get("/api/settings/colors-inactive", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetInactiveProductColors()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Get inactive colors error:", err);
    res.status(500).json(err);
  }
});

app.post("/api/settings/colors", async (req, res) => {
  try {
    const { Name } = req.body;

    if (!Name) {
      return res.status(400).json({
        message: "Nombre de color requerido"
      });
    }

    await db.execute(
      "CALL CreateProductColor(?)",
      [safeString(Name)]
    );

    res.json({
      success: true,
      message: "✅ Color creado"
    });
  } catch (err) {
    console.log("❌ Create color error:", err);
    res.status(500).json(err);
  }
});

app.put("/api/settings/colors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { Name, Status } = req.body;

    await db.execute(
      "CALL UpdateProductColor(?,?,?)",
      [
        id,
        safeString(Name),
        safeString(Status || "Activo")
      ]
    );

    res.json({
      success: true,
      message: "✅ Color actualizado"
    });
  } catch (err) {
    console.log("❌ Update color error:", err);
    res.status(500).json(err);
  }
});

app.delete("/api/settings/colors/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
      "CALL DeleteProductColor(?)",
      [id]
    );

    res.json({
      success: true,
      message: "🗑️ Color desactivado"
    });
  } catch (err) {
    console.log("❌ Delete color error:", err);
    res.status(500).json(err);
  }
});

app.put("/api/settings/colors/:id/reactivate", async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
      "CALL ReactivateProductColor(?)",
      [id]
    );

    res.json({
      success: true,
      message: "✅ Color reactivado"
    });
  } catch (err) {
    console.log("❌ Reactivate color error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   SETTINGS - HOME BANNERS API
========================= */

app.get("/api/settings/banners", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetHomeBanners()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Get banners error:", err);
    res.status(500).json(err);
  }
});

app.get("/api/settings/banners-inactive", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetInactiveHomeBanners()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Get inactive banners error:", err);
    res.status(500).json(err);
  }
});

app.post("/api/settings/banners", async (req, res) => {
  try {
    const {
      Title,
      Subtitle,
      ButtonText,
      ButtonLink,
      Image,
      DisplayOrder
    } = req.body;

    await db.execute(
      "CALL CreateHomeBanner(?,?,?,?,?,?)",
      [
        safeString(Title),
        safeString(Subtitle),
        safeString(ButtonText),
        safeString(ButtonLink),
        safeString(Image),
        safeNumber(DisplayOrder)
      ]
    );

    res.json({
      success: true,
      message: "✅ Banner creado"
    });
  } catch (err) {
    console.log("❌ Create banner error:", err);
    res.status(500).json(err);
  }
});

app.put("/api/settings/banners/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      Title,
      Subtitle,
      ButtonText,
      ButtonLink,
      Image,
      DisplayOrder,
      Status
    } = req.body;

    await db.execute(
      "CALL UpdateHomeBanner(?,?,?,?,?,?,?,?)",
      [
        id,
        safeString(Title),
        safeString(Subtitle),
        safeString(ButtonText),
        safeString(ButtonLink),
        safeString(Image),
        safeNumber(DisplayOrder),
        safeString(Status || "Activo")
      ]
    );

    res.json({
      success: true,
      message: "✅ Banner actualizado"
    });
  } catch (err) {
    console.log("❌ Update banner error:", err);
    res.status(500).json(err);
  }
});

app.delete("/api/settings/banners/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
      "CALL DeleteHomeBanner(?)",
      [id]
    );

    res.json({
      success: true,
      message: "🗑️ Banner desactivado"
    });
  } catch (err) {
    console.log("❌ Delete banner error:", err);
    res.status(500).json(err);
  }
});

app.put("/api/settings/banners/:id/reactivate", async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
      "CALL ReactivateHomeBanner(?)",
      [id]
    );

    res.json({
      success: true,
      message: "✅ Banner reactivado"
    });
  } catch (err) {
    console.log("❌ Reactivate banner error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   AUTH HELPERS
========================= */

/* =========================
   LOGIN ADMIN
========================= */

app.post("/api/auth/login", async (req, res) => {
  try {
    const {
      Username,
      Password
    } = req.body;

    if (!Username || !Password) {
      return res.status(400).json({
        message: "Usuario y contraseña requeridos"
      });
    }

    const [rows] =
      await db.execute(
        `
        SELECT
          Id,
          Username,
          PasswordHash,
          FullName,
          Role,
          Status
        FROM AdminUsers
        WHERE Username = ?
        LIMIT 1
        `,
        [Username]
      );

    const user =
      rows[0];

    if (!user) {
      return res.status(401).json({
        message: "Usuario o contraseña incorrectos"
      });
    }

    if (user.Status !== "Activo") {
      return res.status(403).json({
        message: "Usuario desactivado"
      });
    }

    const isValidPassword =
      await bcrypt.compare(
        Password,
        user.PasswordHash
      );

    if (!isValidPassword) {
      return res.status(401).json({
        message: "Usuario o contraseña incorrectos"
      });
    }

    const token =
      createToken(user);

    res.json({
      success: true,
      message: "Login correcto",
      token,
      user: {
        Id: user.Id,
        Username: user.Username,
        FullName: user.FullName,
        Role: user.Role
      }
    });
  } catch (err) {
    console.log("❌ Login error:", err);

    res.status(500).json({
      message: "Error al iniciar sesión"
    });
  }
});

/* =========================
   AUTH ME
========================= */

app.get("/api/auth/me", async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (err) {
    res.status(500).json({
      message: "Error validando sesión"
    });
  }
});

/* =========================
   SERVE FRONTEND REACT
   HOSTINGER ROOT = backend
   React build must be in backend/public
========================= */

app.use('/api', (req,res) => res.status(404).json({ message:'Ruta API no encontrada.' }));

const frontendPath =
  path.join(__dirname, "public");

app.use(
  express.static(frontendPath)
);

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }

  res.sendFile(
    path.join(frontendPath, "index.html")
  );
});

/* =========================
   SERVER
========================= */

const PORT =
  process.env.PORT || 3000;

function start() {
  return app.listen(PORT, () => console.log(`ColorLenses 2.1.3 disponible en puerto ${PORT}`));
}
if (require.main === module) start();
module.exports = { app, start };
