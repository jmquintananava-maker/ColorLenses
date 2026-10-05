import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, RefreshCw } from 'lucide-react';
const formats = ['QR_CODE', 'CODE_128', 'CODE_39', 'CODE_93', 'EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'ITF', 'DATA_MATRIX', 'PDF_417'].map(k => Html5QrcodeSupportedFormats[k]).filter(v => v !== undefined);
export default function CameraScanner({ onCode }) {
    const uid = useId().replace(/[^a-z0-9]/gi, ''), id = `cl-reader-${uid}`;
    const handler = useRef(onCode), [error, setError] = useState(''), [ready, setReady] = useState(false), [camera, setCamera] = useState(''), [cameras, setCameras] = useState([]), [attempt, setAttempt] = useState(0);
    handler.current = onCode;
    useEffect(() => {
        let disposed = false, accepted = false;
        const scanner = new Html5Qrcode(id, { formatsToSupport: formats, verbose: false });
        setReady(false);
        setError('');
        const starting = (async () => {
            if (!window.isSecureContext)
                throw new Error('La cámara necesita HTTPS o localhost. Puedes usar lector USB o captura manual.');
            await scanner.start(camera ? { deviceId: { exact: camera } } : { facingMode: 'environment' }, { fps: 10, qrbox: (w, h) => ({ width: Math.max(50, Math.min(Math.floor(w * .86), 340)), height: Math.max(50, Math.min(Math.floor(h * .66), 220)) }) }, decoded => {
                if (disposed || accepted)
                    return;
                accepted = true;
                handler.current(decoded, 'CAMERA');
            }, () => { });
            if (!disposed) {
                setReady(true);
                Html5Qrcode.getCameras().then(list => { if (!disposed)
                    setCameras(list); }).catch(() => { });
            }
        })().catch(e => { if (!disposed)
            setError(typeof e === 'string' ? e : e.message || 'No se pudo abrir la cámara. Permite el acceso o usa captura manual.'); });
        return () => {
            disposed = true;
            // Esperar start evita dejar cámara encendida si se cierra el modal durante el permiso.
            starting.finally(async () => { try {
                if (scanner.isScanning)
                    await scanner.stop();
            }
            catch { } try {
                scanner.clear();
            }
            catch { } });
        };
    }, [id, camera, attempt]);
    return _jsxs("div", { className: "cl-camera", children: [_jsxs("div", { className: "cl-camera-status", children: [_jsx("span", { className: ready ? 'ready' : '' }), ready ? 'Cámara activa · QR y código de barras' : 'Preparando cámara…'] }), _jsx("div", { id: id, className: "cl-camera-reader" }), error ? _jsxs("div", { className: "cl-camera-error", role: "status", children: [_jsx(Camera, { size: 30 }), _jsx("strong", { children: "No se pudo iniciar la c\u00E1mara" }), _jsx("p", { children: error }), _jsxs("button", { type: "button", className: "cl-button", onClick: () => setAttempt(v => v + 1), children: [_jsx(RefreshCw, { size: 15 }), "Reintentar"] })] }) : _jsx("p", { className: "cl-camera-hint", children: "Coloca el c\u00F3digo dentro del recuadro. Mant\u00E9n el envase quieto y bien iluminado." }), cameras.length > 1 && _jsxs("label", { className: "cl-field", children: ["C\u00E1mara", _jsxs("select", { value: camera, onChange: e => setCamera(e.target.value), children: [_jsx("option", { value: "", children: "Trasera / autom\u00E1tica" }), cameras.map((c, i) => _jsx("option", { value: c.id, children: c.label || `Cámara ${i + 1}` }, c.id))] })] })] });
}
export async function scanImage(file) {
    if (!file || !file.type.startsWith('image/'))
        throw new Error('Selecciona una imagen del código.');
    const node = document.createElement('div');
    node.id = `cl-file-${Date.now()}`;
    node.style.cssText = 'position:fixed;left:-9999px;top:0;width:500px';
    document.body.append(node);
    const scanner = new Html5Qrcode(node.id, { formatsToSupport: formats, verbose: false });
    try {
        return await scanner.scanFile(file, false);
    }
    finally {
        try {
            scanner.clear();
        }
        catch { }
        node.remove();
    }
}
