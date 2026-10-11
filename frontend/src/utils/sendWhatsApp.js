import { whatsAppNumber } from './customerContacts';
/* =========================
   SEND WHATSAPP
========================= */

const sendWhatsApp = (

  customer,

  cart,

  total,

  points

) => {

  if (!customer)
    return;

  /* =========================
     CLEAN PHONE
  ========================= */

  const phone = whatsAppNumber(customer);
  if (!phone) return;

  /* =========================
     PRODUCTS
  ========================= */

  let productsText = "";

  cart.forEach((item) => {

    productsText +=

`• ${item.Modelo} x${item.Quantity}
`;

  });

  /* =========================
     MESSAGE
  ========================= */

  const message =

`✨ ¡Gracias por tu compra en ColorLenses! 💖

🧾 RESUMEN DE COMPRA

👤 Cliente:
${customer.FullName}

🛍️ Productos:
${productsText}

💰 Total:
$${total.toFixed(2)} MXN

⭐ Puntos generados:
+${points}

👑 Nivel VIP:
${customer.Level}

🎁 Puntos acumulados:
${customer.Points}

Gracias por formar parte de ColorLenses Loyalty ✨`;

  /* =========================
     OPEN WHATSAPP
  ========================= */

  const url =

`https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  window.open(
    url,
    "_blank"
  );

};

export default sendWhatsApp;
