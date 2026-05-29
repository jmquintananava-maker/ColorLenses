const mysql = require("mysql2");

const pool = mysql.createPool({

  host: "srv521.hstgr.io",

  user: "u457187624_User",

  password: "Sug@rCo1orS",

  database: "u457187624_ColorLensesDB",

  waitForConnections: true,

  connectionLimit: 10,

  queueLimit: 0

});

/* =========================
   TEST CONNECTION
========================= */

pool.getConnection((err, connection) => {

  if (err) {

    console.log(
      "❌ Error MySQL:",
      err
    );

    return;
  }

  console.log(
    "🔥 MySQL Pool conectado"
  );

  connection.release();

});

module.exports = pool.promise();