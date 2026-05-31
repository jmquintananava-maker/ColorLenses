require("dotenv").config();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("./db");

const app = express();

/* =========================
   MIDDLEWARES
========================= */

app.use(cors());
app.use(express.json());

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
  storage
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
========================= */

app.get("/api/products", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetProducts()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Get products error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   GET PRODUCT BY QR
========================= */

app.get("/api/products/qr/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const [rows] =
      await db.execute(
        "CALL GetProductByQR(?)",
        [code]
      );

    const product =
      rows[0][0];

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    res.json(product);
  } catch (err) {
    console.log("❌ Get product by QR error:", err);
    res.status(500).json(err);
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] =
      await db.execute(
        "CALL GetProductById(?)",
        [id]
      );

    res.json(rows[0][0]);
  } catch (err) {
    console.log("❌ Get product by id error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   CREATE PRODUCT
========================= */

app.post("/api/products", async (req, res) => {
  try {
    const {
      SKU,
      Category,
      Marca,
      Modelo,
      Color,
      Price,
      Description,
      Image,
      Stock
    } = req.body;

    const ProductQR =
      `PRODUCT-${Date.now()}`;

    await db.execute(
      "CALL CreateProduct(?,?,?,?,?,?,?,?,?,?)",
      [
        safeString(SKU),
        safeString(Category),
        safeString(Marca),
        safeString(Modelo),
        safeString(Color),
        safeNumber(Price),
        safeString(Description),
        safeString(Image),
        safeNumber(Stock),
        ProductQR
      ]
    );

    res.json({
      success: true,
      ProductQR,
      message: "✅ Producto creado"
    });
  } catch (err) {
    console.log("❌ Error create product:", err);
    res.status(500).json(err);
  }
});

/* =========================
   UPDATE PRODUCT
========================= */

app.put("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      SKU,
      Category,
      Marca,
      Modelo,
      Color,
      Price,
      Description,
      Image,
      Stock,
      ProductQR
    } = req.body;

    const safeProductQR =
      ProductQR || `PRODUCT-${id}`;

    await db.execute(
      "CALL UpdateProduct(?,?,?,?,?,?,?,?,?,?,?)",
      [
        id,
        safeString(SKU),
        safeString(Category),
        safeString(Marca),
        safeString(Modelo),
        safeString(Color),
        safeNumber(Price),
        safeString(Description),
        safeString(Image),
        safeNumber(Stock),
        safeProductQR
      ]
    );

    res.json({
      success: true,
      message: "✅ Producto actualizado"
    });
  } catch (err) {
    console.log("❌ Error update product:", err);
    res.status(500).json(err);
  }
});

/* =========================
   DELETE PRODUCT
========================= */

app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
      "CALL DeleteProduct(?)",
      [id]
    );

    res.json({
      success: true,
      message: "🗑️ Producto desactivado"
    });
  } catch (err) {
    console.log("❌ Delete product error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   INACTIVE PRODUCTS
========================= */

app.get("/api/products-inactive", async (req, res) => {
  try {
    const [rows] =
      await db.execute(
        "CALL GetInactiveProducts()"
      );

    res.json(rows[0]);
  } catch (err) {
    console.log("❌ Get inactive products error:", err);
    res.status(500).json(err);
  }
});

/* =========================
   REACTIVATE PRODUCT
========================= */

app.put("/api/products/:id/reactivate", async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
      "CALL ReactivateProduct(?)",
      [id]
    );

    res.json({
      success: true,
      message: "✅ Producto reactivado"
    });
  } catch (err) {
    console.log("❌ Reactivate product error:", err);
    res.status(500).json(err);
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
   WITH POINTS EXPIRATION
========================= */

app.post("/api/sales", async (req, res) => {
  const connection =
    await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      CustomerId,
      Subtotal,
      Discount,
      RedeemedPoints,
      Total,
      Cart
    } = req.body;

    const cleanCustomerId =
      safeNumber(CustomerId);

    const cleanSubtotal =
      safeNumber(Subtotal ?? Total);

    const cleanDiscount =
      safeNumber(Discount);

    const cleanRedeemedPoints =
      safeNumber(RedeemedPoints);

    const cleanTotal =
      safeNumber(Total);

    const cleanCart =
      Array.isArray(Cart)
        ? Cart
        : [];

    if (!cleanCustomerId) {
      await connection.rollback();

      return res.status(400).json({
        message: "Cliente requerido"
      });
    }

    if (cleanCart.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        message: "Carrito vacío"
      });
    }

    const [customerRows] =
      await connection.execute(
        `
        SELECT
          Id,
          FullName,
          Points,
          Status,
          Level
        FROM Customers
        WHERE Id = ?
        LIMIT 1
        `,
        [cleanCustomerId]
      );

    const customer =
      customerRows[0];

    if (!customer) {
      await connection.rollback();

      return res.status(404).json({
        message: "Cliente no encontrado"
      });
    }

    if (customer.Status === "Inactivo") {
      await connection.rollback();

      return res.status(403).json({
        message:
          "Este cliente está inactivo y no puede realizar compras."
      });
    }

    await connection.execute(
      "CALL RecalculateCustomerPoints(?)",
      [cleanCustomerId]
    );

    const [pointsRows] =
      await connection.execute(
        "CALL GetCustomerAvailablePoints(?)",
        [cleanCustomerId]
      );

    const pointsData =
      pointsRows[0][0];

    const currentPoints =
      safeNumber(
        pointsData?.AvailablePoints ??
        customer.Points
      );

    if (cleanRedeemedPoints > currentPoints) {
      await connection.rollback();

      return res.status(400).json({
        message:
          "El cliente no tiene suficientes puntos vigentes para canjear."
      });
    }

    if (cleanRedeemedPoints > cleanSubtotal) {
      await connection.rollback();

      return res.status(400).json({
        message:
          "No puedes canjear más puntos que el subtotal de la venta."
      });
    }

    if (cleanDiscount !== cleanRedeemedPoints) {
      await connection.rollback();

      return res.status(400).json({
        message:
          "El descuento debe ser igual a los puntos canjeados."
      });
    }

    const expectedTotal =
      cleanSubtotal - cleanDiscount;

    if (
      Number(expectedTotal.toFixed(2)) !==
      Number(cleanTotal.toFixed(2))
    ) {
      await connection.rollback();

      return res.status(400).json({
        message:
          "El total no coincide con subtotal menos descuento."
      });
    }

    for (const item of cleanCart) {
      const productId =
        safeNumber(
          item.Id ||
          item.ProductId
        );

      const quantity =
        safeNumber(
          item.Quantity || 1
        );

      const price =
        safeNumber(item.Price);

      if (!productId || quantity <= 0 || price <= 0) {
        await connection.rollback();

        return res.status(400).json({
          message: "Producto inválido en el carrito",
          item
        });
      }

      const [productRows] =
        await connection.execute(
          `
          SELECT
            Id,
            Modelo,
            Stock,
            Status
          FROM Products
          WHERE Id = ?
          LIMIT 1
          `,
          [productId]
        );

      const product =
        productRows[0];

      if (!product) {
        await connection.rollback();

        return res.status(404).json({
          message: `Producto ${productId} no encontrado`
        });
      }

      if (product.Status === "Inactivo") {
        await connection.rollback();

        return res.status(400).json({
          message: `El producto ${product.Modelo || productId} está inactivo`
        });
      }

      if (safeNumber(product.Stock) < quantity) {
        await connection.rollback();

        return res.status(400).json({
          message: `Stock insuficiente para ${product.Modelo || productId}`
        });
      }
    }

    const [saleRows] =
      await connection.execute(
        "CALL RegisterSaleWithRedemption(?,?,?,?,?)",
        [
          cleanCustomerId,
          cleanSubtotal,
          cleanDiscount,
          cleanRedeemedPoints,
          cleanTotal
        ]
      );

    const saleData =
      saleRows?.[0]?.[0] || {};

    const saleId =
      saleData.SaleId ||
      saleData.Id ||
      saleData.NewSaleId;

    if (!saleId) {
      await connection.rollback();

      return res.status(500).json({
        message:
          "La venta se creó pero no se recibió SaleId desde RegisterSaleWithRedemption.",
        saleData
      });
    }

    for (const item of cleanCart) {
      const productId =
        safeNumber(
          item.Id ||
          item.ProductId
        );

      const quantity =
        safeNumber(
          item.Quantity || 1
        );

      const price =
        safeNumber(item.Price);

      const itemSubtotal =
        price * quantity;

      await connection.execute(
        "CALL CreateSaleItem(?,?,?,?,?)",
        [
          saleId,
          productId,
          quantity,
          price,
          itemSubtotal
        ]
      );

      await connection.execute(
        "CALL UpdateProductStock(?,?)",
        [
          productId,
          quantity
        ]
      );
    }

    const pointsEarned =
      calculatePointsByLevel(
        cleanTotal,
        customer.Level
      );

    await connection.execute(
      "CALL UpdateCustomerStatsWithRedemption(?,?,?,?)",
      [
        cleanCustomerId,
        cleanTotal,
        0,
        0
      ]
    );

    if (cleanRedeemedPoints > 0) {
      await connection.execute(
        "CALL RedeemCustomerPoints(?,?)",
        [
          cleanCustomerId,
          cleanRedeemedPoints
        ]
      );
    }

    if (pointsEarned > 0) {
      await connection.execute(
        "CALL AddCustomerPoints(?,?,?)",
        [
          cleanCustomerId,
          saleId,
          pointsEarned
        ]
      );
    }

    await connection.execute(
      "CALL RecalculateCustomerPoints(?)",
      [cleanCustomerId]
    );

    await connection.commit();

    res.json({
      success: true,
      SaleId: saleId,
      Subtotal: cleanSubtotal,
      Discount: cleanDiscount,
      RedeemedPoints: cleanRedeemedPoints,
      Total: cleanTotal,
      PointsEarned: pointsEarned,
      PointsExpiresAt:
        pointsEarned > 0
          ? new Date(
              Date.now() +
              365 * 24 * 60 * 60 * 1000
            )
          : null,
      message: "✅ Venta registrada"
    });
  } catch (err) {
    await connection.rollback();

    console.log("❌ Error register sale:", err);

    res.status(500).json({
      message: "Error al registrar venta",
      error: err.message,
      code: err.code,
      sqlMessage: err.sqlMessage
    });
  } finally {
    connection.release();
  }
});

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

app.post("/api/settings/brands", async (req, res) => {
  try {
    const { Name } = req.body;

    if (!Name) {
      return res.status(400).json({
        message: "Nombre de marca requerido"
      });
    }

    await db.execute(
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
});

app.put("/api/settings/brands/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { Name, Status } = req.body;

    await db.execute(
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
});

app.delete("/api/settings/brands/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
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
});

app.put("/api/settings/brands/:id/reactivate", async (req, res) => {
  try {
    const { id } = req.params;

    await db.execute(
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
});

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

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "colorlenses_super_secret_2026";

const createToken = (user) => {
  return jwt.sign(
    {
      id: user.Id,
      username: user.Username,
      fullName: user.FullName,
      role: user.Role
    },
    JWT_SECRET,
    {
      expiresIn: "8h"
    }
  );
};

/* =========================
   VERIFY TOKEN MIDDLEWARE
========================= */

const verifyToken = (req, res, next) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Token requerido"
      });
    }

    const token =
      authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Token inválido"
      });
    }

    const decoded =
      jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Sesión expirada o inválida"
    });
  }
};

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

app.get("/api/auth/me", verifyToken, async (req, res) => {
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

app.listen(PORT, () => {
  console.log(
    `🚀 Servidor corriendo en puerto ${PORT}`
  );
});