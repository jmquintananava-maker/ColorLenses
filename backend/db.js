require("dotenv").config();

const mysql = require("mysql2");

console.log("🔎 DB CONFIG:", {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  hasPassword: !!process.env.DB_PASSWORD
});

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),

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