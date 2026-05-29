import { useEffect, useState } from "react";

import { useParams } from "react-router-dom";

import { QRCodeCanvas } from "qrcode.react";

const API_URL =
  import.meta.env.VITE_API_URL;

function CardProfile() {

  const { slug } = useParams();

  const [customer, setCustomer] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    fetch(`${API_URL}/api/customers`)

      .then((res) => res.json())

      .then((data) => {

        const foundCustomer =
          data.find(

            (item) =>

              item.CardSlug?.trim()
              === slug?.trim()

          );

        setCustomer(foundCustomer);

        setLoading(false);

      })

      .catch((err) => {

        console.log(err);

        setLoading(false);

      });

  }, [slug]);

  /* =========================
     LOADING
  ========================= */

  if (loading) {

    return (

      <div className="card-loading">

        Cargando tarjeta...

      </div>
    );
  }

  /* =========================
     NOT FOUND
  ========================= */

  if (!customer) {

    return (

      <div className="card-loading">

        Cliente no encontrado

      </div>
    );
  }

  return (

    <div className="card-page">

      <div className="card-container">

        <div className="card-logo">

          ColorLenses

        </div>

        <h1>
          {customer.FullName}
        </h1>

        <p className="card-status">

          Cliente Premium

        </p>

        {/* =========================
            QR REAL
        ========================= */}

        <div className="card-qr">

          <QRCodeCanvas

            value={`http://localhost:5173/admin/sales/${customer.CardSlug}`}

            size={180}

            bgColor="#ffffff"

            fgColor="#111111"

            level="H"

            includeMargin={true}

          />

        </div>

        {/* =========================
            INFO
        ========================= */}

        <div className="card-info">

          <p>
            📱 {customer.Phone}
          </p>

          <p>
            ✉️ {customer.Email}
          </p>

        </div>

        {/* =========================
            BUTTON
        ========================= */}

        <button className="card-btn">

          Ver promociones

        </button>

      </div>

    </div>
  );
}

export default CardProfile;