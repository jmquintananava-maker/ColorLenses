import { useEffect, useRef, useState } from "react";

import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats
} from "html5-qrcode";

import AdminSidebar from "../../components/AdminSidebar";

const API_URL = import.meta.env.VITE_API_URL;

function QRScanner() {
  const [message, setMessage] = useState("");
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const audioContextRef = useRef(null);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const unlockScanSound = () => {
    try {
      const AudioContext =
        window.AudioContext || window.webkitAudioContext;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }
    } catch (err) {
      console.log("No se pudo activar audio:", err);
    }
  };

  const playScanSound = () => {
    try {
      const AudioContext =
        window.AudioContext || window.webkitAudioContext;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioContext = audioContextRef.current;

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(
        880,
        audioContext.currentTime
      );

      gainNode.gain.setValueAtTime(
        0.001,
        audioContext.currentTime
      );

      gainNode.gain.exponentialRampToValueAtTime(
        0.25,
        audioContext.currentTime + 0.01
      );

      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.18
      );

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);

      if (navigator.vibrate) {
        navigator.vibrate(80);
      }
    } catch (err) {
      console.log("No se pudo reproducir sonido:", err);
    }
  };

  const loadCameras = async () => {
    const availableCameras = await Html5Qrcode.getCameras();

    if (!availableCameras || availableCameras.length === 0) {
      setMessage("No se encontró cámara disponible");
      return null;
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

    if (!selectedCameraId) {
      setSelectedCameraId(defaultCamera.id);
    }

    return selectedCameraId || defaultCamera.id;
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        const scanner = scannerRef.current;

        scannerRef.current = null;

        await scanner.stop().catch(() => {});
        scanner.clear();
      }

      setIsScannerActive(false);
    } catch (err) {
      console.log("Scanner ya estaba detenido:", err);
      setIsScannerActive(false);
    }
  };

  const startScanner = async (cameraId = null) => {
    if (isStarting) return;

    try {
      setIsStarting(true);
      setMessage("Iniciando cámara...");

      await stopScanner();

      isProcessingRef.current = false;

      const reader = document.getElementById("reader");

      if (reader) {
        reader.innerHTML = "";
      }

      const finalCameraId = cameraId || selectedCameraId || await loadCameras();

      if (!finalCameraId) {
        setIsStarting(false);
        return;
      }

      setSelectedCameraId(finalCameraId);

      const scanner = new Html5Qrcode("reader", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE
        ]
      });

      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: {
          width: window.innerWidth < 768 ? 260 : 240,
          height: window.innerWidth < 768 ? 260 : 240
        },
        aspectRatio: 1.0
      };

      await scanner.start(
        finalCameraId,
        config,
        async (decodedText) => {
          if (isProcessingRef.current) return;

          isProcessingRef.current = true;

          const cleanQR = String(decodedText || "").trim();

          if (!cleanQR) {
            isProcessingRef.current = false;
            return;
          }

          playScanSound();

          setMessage("Validando cliente...");

          await stopScanner();

          await validateCustomerQR(cleanQR);
        },
        () => {}
      );

      setIsScannerActive(true);
      setMessage("");
      setIsStarting(false);
    } catch (err) {
      console.log("❌ Error startScanner:", err);

      setIsScannerActive(false);
      setIsStarting(false);

      setMessage(
        "No se pudo acceder a la cámara. Cierra otras pestañas que usen cámara o revisa permisos del navegador."
      );
    }
  };

  const startScannerButton = async () => {
    unlockScanSound();

    try {
      let cameraId = selectedCameraId;

      if (!cameraId) {
        cameraId = await loadCameras();
      }

      await startScanner(cameraId);
    } catch (err) {
      console.log("❌ Error iniciar scanner:", err);

      setMessage(
        "No se pudo iniciar el escáner. Revisa permisos de cámara."
      );
    }
  };

  const changeCamera = async (cameraId) => {
    setSelectedCameraId(cameraId);
    isProcessingRef.current = false;
    setMessage("Cambiando cámara...");

    await startScanner(cameraId);
  };

  const restartScanner = async () => {
    isProcessingRef.current = false;

    await stopScanner();

    setTimeout(() => {
      startScanner(selectedCameraId);
    }, 500);
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

        return;
      }

      if (data.status === "not_found") {
        setMessage("❌ Cliente no encontrado");

        alert("❌ Cliente no encontrado en la base de datos");

        return;
      }

      setMessage(data.message || "Error validando cliente");

      alert(data.message || "Error validando cliente");
    } catch (err) {
      console.log("❌ Error validateCustomerQR:", err);

      setMessage("Error al validar cliente");

      alert("Error al validar cliente");
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

            <button
              className="admin-save-btn"
              type="button"
              onClick={startScannerButton}
              disabled={isStarting}
            >
              {isStarting
                ? "Iniciando cámara..."
                : isScannerActive
                  ? "Reiniciar escáner"
                  : "Iniciar escáner"}
            </button>

            {isScannerActive && (
              <button
                className="admin-close-btn"
                type="button"
                onClick={stopScanner}
                style={{
                  marginTop: "12px"
                }}
              >
                Detener cámara
              </button>
            )}

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

            {message && !isScannerActive && (
              <button
                className="admin-save-btn"
                type="button"
                onClick={restartScanner}
              >
                Volver a escanear
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default QRScanner;