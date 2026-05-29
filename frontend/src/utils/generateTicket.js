import jsPDF from "jspdf";

/* =========================
   GENERATE PDF TICKET
========================= */

const generateTicket = (

  customer,

  cart,

  total,

  points

) => {

  const doc =
    new jsPDF({

      orientation: "portrait",

      unit: "mm",

      format: [80, 200]

    });

  /* =========================
     HEADER
  ========================= */

  doc.setFontSize(18);

  doc.text(
    "COLORLENSES",
    40,
    15,
    {
      align: "center"
    }
  );

  doc.setFontSize(10);

  doc.text(
    "Ticket de Compra",
    40,
    22,
    {
      align: "center"
    }
  );

  /* =========================
     CUSTOMER
  ========================= */

  doc.setFontSize(11);

  doc.text(
    `Cliente: ${customer.FullName}`,
    5,
    35
  );

  doc.text(

    `Nivel: ${customer.Level}`,

    5,

    42

  );

  doc.text(

    `Puntos actuales: ${customer.Points}`,

    5,

    49

  );

  /* =========================
     PRODUCTS
  ========================= */

  let y = 65;

  doc.setFontSize(12);

  doc.text(
    "Productos",
    5,
    y
  );

  y += 10;

  cart.forEach((item) => {

    doc.setFontSize(10);

    doc.text(

      `${item.Modelo}`,

      5,

      y

    );

    doc.text(

      `x${item.Quantity}`,

      45,

      y

    );

    doc.text(

      `$${

        Number(item.Price)
        *
        Number(item.Quantity)

      }`,

      65,

      y

    );

    y += 8;

  });

  /* =========================
     TOTAL
  ========================= */

  y += 10;

  doc.setFontSize(14);

  doc.text(

    `TOTAL: $${total.toFixed(2)}`,

    5,

    y

  );

  y += 10;

  doc.setFontSize(12);

  doc.text(

    `+${points} puntos ⭐`,

    5,

    y

  );

  /* =========================
     FOOTER
  ========================= */

  y += 20;

  doc.setFontSize(10);

  doc.text(

    "Gracias por tu compra",

    40,

    y,

    {
      align: "center"
    }

  );

  y += 7;

  doc.text(

    "ColorLenses Loyalty",

    40,

    y,

    {
      align: "center"
    }

  );

  /* =========================
     SAVE
  ========================= */

  doc.save(

    `ticket-${Date.now()}.pdf`

  );

};

export default generateTicket;