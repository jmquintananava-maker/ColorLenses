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

    res.json({
      status: "active",
      message: "Cliente activo",
      customer
    });
  } catch (err) {
    console.log("❌ Validate customer QR error:", err);

    res.status(500).json({
      status: "error",
      message: "Error validando cliente",
      error: err
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
   WITH POINTS REDEMPTION
========================= */

app.post("/api/sales", async (req, res) => {
  try {
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
      return res.status(400).json({
        message: "Cliente requerido"
      });
    }

    if (cleanCart.length === 0) {
      return res.status(400).json({
        message: "Carrito vacío"
      });
    }

    const [customerRows] =
      await db.execute(
        `
        SELECT
          Id,
          Points,
          Status
        FROM Customers
        WHERE Id = ?
        `,
        [cleanCustomerId]
      );

    const customer =
      customerRows[0];

    if (!customer) {
      return res.status(404).json({
        message: "Cliente no encontrado"
      });
    }

    if (customer.Status === "Inactivo") {
      return res.status(403).json({
        message:
          "Este cliente está inactivo y no puede realizar compras."
      });
    }

    const currentPoints =
      safeNumber(customer.Points);

    if (cleanRedeemedPoints > currentPoints) {
      return res.status(400).json({
        message:
          "El cliente no tiene suficientes puntos para canjear."
      });
    }

    if (cleanRedeemedPoints > cleanSubtotal) {
      return res.status(400).json({
        message:
          "No puedes canjear más puntos que el subtotal de la venta."
      });
    }

    if (cleanDiscount !== cleanRedeemedPoints) {
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
      return res.status(400).json({
        message:
          "El total no coincide con subtotal menos descuento."
      });
    }

    const [saleRows] =
      await db.execute(
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
      saleRows[0][0];

    const saleId =
      saleData.SaleId;

    for (const item of cleanCart) {
      const productId =
        safeNumber(item.Id);

      const quantity =
        safeNumber(item.Quantity || 1);

      const price =
        safeNumber(item.Price);

      const itemSubtotal =
        price * quantity;

      await db.execute(
        "CALL CreateSaleItem(?,?,?,?,?)",
        [
          saleId,
          productId,
          quantity,
          price,
          itemSubtotal
        ]
      );

      await db.execute(
        "CALL UpdateProductStock(?,?)",
        [
          productId,
          quantity
        ]
      );
    }

    let pointsEarned = 0;

    if (cleanTotal >= 50) {
      pointsEarned =
        Math.floor(cleanTotal / 50);
    }

    await db.execute(
      "CALL UpdateCustomerStatsWithRedemption(?,?,?,?)",
      [
        cleanCustomerId,
        cleanTotal,
        pointsEarned,
        cleanRedeemedPoints
      ]
    );

    res.json({
      success: true,
      SaleId: saleId,
      Subtotal: cleanSubtotal,
      Discount: cleanDiscount,
      RedeemedPoints: cleanRedeemedPoints,
      Total: cleanTotal,
      PointsEarned: pointsEarned,
      message: "✅ Venta registrada"
    });
  } catch (err) {
    console.log("❌ Error register sale:", err);
    res.status(500).json(err);
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