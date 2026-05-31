import { useEffect, useRef, useState } from "react";

import { Html5Qrcode } from "html5-qrcode";

import AdminSidebar from "../../components/AdminSidebar";

const API_URL = import.meta.env.VITE_API_URL;

function QRScanner() {
  const [message, setMessage] = useState("");
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    loadCamerasAndStart();

    return () => {
      stopScanner();
    };
  }, []);

  const loadCamerasAndStart = async () => {
    try {
      const availableCameras = await Html5Qrcode.getCameras();

      if (!availableCameras || availableCameras.length === 0) {
        setMessage("No se encontró cámara disponible");
        return;
      }

      setCameras(availableCameras);

      const backCamera =
        availableCameras.find((camera) =>
          String(camera.label || "")
            .toLowerCase()
            .includes("back")
        ) ||
        availableCameras.find((camera) =>
          String(camera.label || "")
            .toLowerCase()
            .includes("rear")
        ) ||
        availableCameras.find((camera) =>
          String(camera.label || "")
            .toLowerCase()
            .includes("environment")
        );

      const defaultCamera =
        backCamera || availableCameras[availableCameras.length - 1];

      setSelectedCameraId(defaultCamera.id);

      await startScanner(defaultCamera.id);
    } catch (err) {
      console.log("❌ Error cargando cámaras:", err);

      setMessage(
        "No se pudo acceder a la cámara. Revisa permisos del navegador."
      );
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();

        scannerRef.current = null;
      }
    } catch (err) {
      console.log("Scanner ya estaba detenido:", err);
    }
  };

  const startScanner = async (cameraId = null) => {
    try {
      const reader = document.getElementById("reader");

      if (reader) {
        reader.innerHTML = "";
      }

      await stopScanner();

      const scanner = new Html5Qrcode("reader");

      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: {
          width: window.innerWidth < 768 ? 260 : 240,
          height: window.innerWidth < 768 ? 260 : 240
        },
        aspectRatio: 1.0
      };

      const cameraConfig = cameraId
        ? cameraId
        : {
            facingMode: {
              exact: "environment"
            }
          };

      await scanner.start(
        cameraConfig,
        config,
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
      console.log("❌ Error startScanner:", err);

      if (!cameraId && selectedCameraId) {
        await startScanner(selectedCameraId);
        return;
      }

      setMessage("No se pudo acceder a la cámara principal");
    }
  };

  const changeCamera = async (cameraId) => {
    setSelectedCameraId(cameraId);
    isProcessingRef.current = false;
    setMessage("Cambiando cámara...");

    await startScanner(cameraId);

    setMessage("");
  };

  const restartScanner = () => {
    isProcessingRef.current = false;

    setTimeout(() => {
      startScanner(selectedCameraId);
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

            {cameras.length > 1 && (
              <div className="camera-select-box">
                <label>
                  Cámara
                </label>

                <select
                  value={selectedCameraId}
                  onChange={(e) => changeCamera(e.target.value)}
                >
                  {cameras.map((camera, index) => (
                    <option
                      key={camera.id}
                      value={camera.id}
                    >
                      {camera.label ||
                        `Cámara ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

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