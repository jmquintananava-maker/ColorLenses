require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),

  // Declare the connection collation explicitly; the driver's `charset`
  // option accepts a MySQL collation name. No table or stored data is changed.
  charset: "utf8mb4_unicode_ci",

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection((err, connection) => {
  if (err) {
    console.log("❌ Error MySQL:", err.message);
    return;
  }

  console.log("🔥 MySQL Pool conectado");

  connection.release();
});

module.exports = pool.promise();        