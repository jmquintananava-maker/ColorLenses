const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "ColorLenses backend funcionando 🚀",
  });
});

app.listen(3000, () => {
  console.log("Servidor corriendo en puerto 3000");
});
