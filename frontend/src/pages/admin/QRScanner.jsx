import { useEffect, useRef, useState } from "react";

import { Html5Qrcode } from "html5-qrcode";

import AdminSidebar from "../../components/AdminSidebar";

const API_URL = import.meta.env.VITE_API_URL;

function QRScanner() {
  const [message, setMessage] = useState("");

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState?.();

        await scannerRef.current
          .stop()
          .catch(() => {});

        scannerRef.current
          .clear();

        scannerRef.current = null;
      }
    } catch (err) {
      console.log("Scanner ya estaba detenido:", err);
    }
  };

  const startScanner = async () => {
    try {
      const reader = document.getElementById("reader");

      if (reader) {
        reader.innerHTML = "";
      }

      const scanner = new Html5Qrcode("reader");

      scannerRef.current = scanner;

      const cameras = await Html5Qrcode.getCameras();

      if (!cameras || cameras.length === 0) {
        setMessage("No se encontró cámara disponible");
        return;
      }

      await scanner.start(
        cameras[0].id,

        {
          fps: 8,

          qrbox: {
            width: 240,
            height: 240
          }
        },

        async (decodedText) => {
          if (isProcessingRef.current) return;

          isProcessingRef.current = true;

          const cleanQR = String(decodedText || "").trim();

          if (!cleanQR) {
            isProcessingRef.current = false;
            return;
          }

          setMessage("Validando cliente...");

          await stopScanner();

          await validateCustomerQR(cleanQR);
        },

        () => {}
      );
    } catch (err) {
      console.log(err);
      setMessage("No se pudo acceder a la cámara");
    }
  };

  const restartScanner = () => {
    isProcessingRef.current = false;

    setTimeout(() => {
      startScanner();
    }, 800);
  };

  const validateCustomerQR = async (decodedText) => {
    try {
      const response = await fetch(
        `${API_URL}/api/customers/validate-qr`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            QRCode: decodedText
          })
        }
      );

      const data = await response.json();

      if (data.status === "active") {
        setMessage(`✅ Cliente activo: ${data.customer.FullName}`);

        setTimeout(() => {
          window.location.href = `/admin/sales/${data.customer.CardSlug}`;
        }, 500);

        return;
      }

      if (data.status === "inactive") {
        setMessage(`⚠️ Cliente desactivado: ${data.customer.FullName}`);

        alert(
          `⚠️ Cliente desactivado\n\n${data.customer.FullName}\n\nNo puede realizar compras hasta ser reactivado.`
        );

        restartScanner();

        return;
      }

      if (data.status === "not_found") {
        setMessage("❌ Cliente no encontrado");

        alert("❌ Cliente no encontrado en la base de datos");

        restartScanner();

        return;
      }

      setMessage(data.message || "Error validando cliente");

      alert(data.message || "Error validando cliente");

      restartScanner();
    } catch (err) {
      console.log("❌ Error validateCustomerQR:", err);

      setMessage("Error al validar cliente");

      alert("Error al validar cliente");

      restartScanner();
    }
  };

  return (
    <div className="admin-page">
      <AdminSidebar />

      <main className="admin-content">
        <div className="qr-page">
          <div className="qr-card">
            <h1>Escanear Cliente</h1>

            <p>
              Escanea el QR del cliente para iniciar una venta
            </p>

            <div
              id="reader"
              className="qr-reader"
            ></div>

            {message && (
              <div className="scanner-message">
                {message}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default QRScanner;