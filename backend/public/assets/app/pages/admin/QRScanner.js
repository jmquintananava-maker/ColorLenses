import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { apiFetch as fetch } from "../../utils/api.js";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import AdminSidebar from "../../components/AdminSidebar.js";
const API_URL = ("" || "");
function QRScanner() {
    const [message, setMessage] = useState("");
    const [cameras, setCameras] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState("");
    const scannerRef = useRef(null);
    const isProcessingRef = useRef(false);
    const audioContextRef = useRef(null);
    useEffect(() => {
        loadCamerasAndStart();
        return () => {
            stopScanner();
        };
    }, []);
    const getPreferredBackCamera = (availableCameras) => {
        if (!availableCameras || availableCameras.length === 0) {
            return null;
        }
        const normalizedCameras = availableCameras.map((camera) => ({
            ...camera,
            cleanLabel: String(camera.label || "").toLowerCase()
        }));
        const ultraWideCamera = normalizedCameras.find((camera) => camera.cleanLabel.includes("ultra")) ||
            normalizedCameras.find((camera) => camera.cleanLabel.includes("gran angular")) ||
            normalizedCameras.find((camera) => camera.cleanLabel.includes("wide")) ||
            normalizedCameras.find((camera) => camera.cleanLabel.includes("dual"));
        if (ultraWideCamera) {
            return ultraWideCamera;
        }
        const backCamera = normalizedCameras.find((camera) => camera.cleanLabel.includes("back")) ||
            normalizedCameras.find((camera) => camera.cleanLabel.includes("rear")) ||
            normalizedCameras.find((camera) => camera.cleanLabel.includes("environment")) ||
            normalizedCameras.find((camera) => camera.cleanLabel.includes("trasera"));
        if (backCamera) {
            return backCamera;
        }
        return availableCameras[availableCameras.length - 1];
    };
    const unlockScanSound = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }
            if (audioContextRef.current.state === "suspended") {
                audioContextRef.current.resume();
            }
        }
        catch (err) {
            console.log("No se pudo activar audio:", err);
        }
    };
    const playScanSound = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
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
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.25, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            if (navigator.vibrate) {
                navigator.vibrate(80);
            }
        }
        catch (err) {
            console.log("No se pudo reproducir sonido:", err);
        }
    };
    const loadCamerasAndStart = async () => {
        try {
            unlockScanSound();
            const availableCameras = await Html5Qrcode.getCameras();
            if (!availableCameras || availableCameras.length === 0) {
                setMessage("No se encontró cámara disponible");
                return;
            }
            setCameras(availableCameras);
            const preferredCamera = getPreferredBackCamera(availableCameras);
            if (!preferredCamera) {
                setMessage("No se encontró cámara disponible");
                return;
            }
            setSelectedCameraId(preferredCamera.id);
            await startScanner(preferredCamera.id);
        }
        catch (err) {
            console.log("❌ Error cargando cámaras:", err);
            setMessage("No se pudo acceder a la cámara. Revisa permisos del navegador.");
        }
    };
    const stopScanner = async () => {
        try {
            if (scannerRef.current) {
                const scanner = scannerRef.current;
                scannerRef.current = null;
                await scanner.stop().catch(() => { });
                scanner.clear();
            }
        }
        catch (err) {
            console.log("Scanner ya estaba detenido:", err);
        }
        finally {
            isProcessingRef.current = false;
        }
    };
    const startScanner = async (cameraId = null) => {
        try {
            const reader = document.getElementById("reader");
            if (reader) {
                reader.innerHTML = "";
            }
            await stopScanner();
            isProcessingRef.current = false;
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
            await scanner.start(cameraConfig, config, async (decodedText) => {
                if (isProcessingRef.current) {
                    return;
                }
                isProcessingRef.current = true;
                const cleanQR = String(decodedText || "").trim();
                if (!cleanQR) {
                    isProcessingRef.current = false;
                    return;
                }
                playScanSound();
                setMessage("Validando cliente...");
                await validateCustomerQR(cleanQR);
            }, () => { });
        }
        catch (err) {
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
    const getCleanQRValue = (decodedText) => {
        const cleanQRCode = String(decodedText || "").trim();
        if (!cleanQRCode) {
            return "";
        }
        if (cleanQRCode.includes("/admin/sales/")) {
            return cleanQRCode.split("/admin/sales/").pop().trim();
        }
        if (cleanQRCode.includes("/customer/")) {
            return cleanQRCode.split("/customer/").pop().trim();
        }
        if (cleanQRCode.includes("/card/")) {
            return cleanQRCode.split("/card/").pop().trim();
        }
        if (cleanQRCode.includes("?qr=")) {
            return cleanQRCode.split("?qr=").pop().trim();
        }
        return cleanQRCode;
    };
    const validateCustomerQR = async (decodedText) => {
        const releaseScanner = () => {
            setTimeout(() => {
                isProcessingRef.current = false;
            }, 1200);
            setTimeout(() => {
                setMessage("");
            }, 1800);
        };
        try {
            const qrValue = getCleanQRValue(decodedText);
            console.log("QR LEÍDO:", decodedText);
            console.log("QR LIMPIO:", qrValue);
            if (!qrValue) {
                setMessage("QR vacío o inválido");
                releaseScanner();
                return;
            }
            const response = await fetch(`${API_URL}/api/customers/validate-qr`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    QRCode: qrValue
                })
            });
            const data = await response.json().catch(() => null);
            console.log("RESPUESTA VALIDATE QR:", data);
            if (!data) {
                setMessage("El backend no respondió correctamente");
                releaseScanner();
                return;
            }
            if (data.status === "active") {
                setMessage(`✅ Cliente activo: ${data.customer.FullName}`);
                await stopScanner();
                setTimeout(() => {
                    window.location.href = `/admin/sales/${data.customer.CardSlug}`;
                }, 500);
                return;
            }
            if (data.status === "inactive") {
                setMessage(`⚠️ Cliente desactivado: ${data.customer.FullName}`);
                releaseScanner();
                return;
            }
            if (data.status === "not_found") {
                setMessage("Este código no es de cliente");
                releaseScanner();
                return;
            }
            if (!response.ok || data.status === "error") {
                setMessage(data.sqlMessage ||
                    data.error ||
                    data.message ||
                    "Error validando cliente");
                releaseScanner();
                return;
            }
            setMessage(data.message || "No se pudo validar el cliente");
            releaseScanner();
        }
        catch (err) {
            console.log("❌ Error validateCustomerQR:", err);
            setMessage(err.message ||
                "Error al validar cliente");
            releaseScanner();
        }
    };
    return (_jsxs("div", { className: "admin-page", children: [_jsx(AdminSidebar, {}), _jsx("main", { className: "admin-content", children: _jsx("div", { className: "qr-page", children: _jsxs("div", { className: "qr-card", children: [_jsx("h1", { children: "Escanear Cliente" }), _jsx("p", { children: "Escanea el QR del cliente para iniciar una venta" }), cameras.length > 1 && (_jsxs("div", { className: "camera-select-box", children: [_jsx("label", { children: "C\u00E1mara" }), _jsx("select", { value: selectedCameraId, onChange: (e) => changeCamera(e.target.value), children: cameras.map((camera, index) => (_jsx("option", { value: camera.id, children: camera.label ||
                                                `Cámara ${index + 1}` }, camera.id))) })] })), _jsx("div", { id: "reader", className: "qr-reader" }), message && (_jsx("div", { className: "scanner-message", children: message }))] }) }) })] }));
}
export default QRScanner;
