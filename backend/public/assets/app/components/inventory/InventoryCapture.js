import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { Camera, Keyboard, Search, Plus, PackageCheck, ScanLine, ImagePlus, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';
import Modal from '../Modal.js';
import CameraScanner, { scanImage } from './CameraScanner.js';
import { request, uuid, imageUrl } from '../../utils/api.js';
const pendingRead = key => { try {
    return JSON.parse(localStorage.getItem(key) || 'null');
}
catch {
    return null;
} };
export default function InventoryCapture({ session, brands, onClose, onSaved }) {
    const storageKey = `cl-inventory-pending:${session.Id}`, qtyRef = useRef(null), processing = useRef(false), lookupSequence = useRef(0);
    const [pending, setPending] = useState(() => pendingRead(storageKey)), [code, setCode] = useState(''), [quantity, setQuantity] = useState('1'), [brand, setBrand] = useState(session.Brand || ''), [method, setMethod] = useState('MANUAL'), [mode, setMode] = useState('camera'), [lookup, setLookup] = useState(null), [looking, setLooking] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState(''), [cameraCycle, setCameraCycle] = useState(0);
    const stocktake = session.Kind === 'STOCKTAKE';
    const newCode = lookup && lookup.found === false;
    async function find(value, captureMethod = 'MANUAL') {
        const clean = String(value || '').trim();
        if (!clean || processing.current || pending)
            return;
        const seq = ++lookupSequence.current;
        setCode(clean);
        setMethod(captureMethod);
        setLooking(true);
        setLookup(null);
        setError('');
        setSuccess('');
        try {
            const result = await request(`/api/inventory/lookup?code=${encodeURIComponent(clean)}`);
            if (seq !== lookupSequence.current)
                return;
            setLookup(result);
            setTimeout(() => { qtyRef.current?.focus(); qtyRef.current?.select(); }, 80);
        }
        catch (e) {
            if (seq === lookupSequence.current)
                setError(e.message);
        }
        finally {
            if (seq === lookupSequence.current)
                setLooking(false);
        }
    }
    function reset() { lookupSequence.current++; setCode(''); setLookup(null); setQuantity('1'); setError(''); setLooking(false); setCameraCycle(n => n + 1); }
    async function commit(payload) {
        if (processing.current)
            return;
        processing.current = true;
        setBusy(true);
        setError('');
        try {
            // La solicitud sobrevive a una desconexión o recarga. Reintentar conserva la clave.
            localStorage.setItem(storageKey, JSON.stringify(payload));
            setPending(payload);
            const result = await request(`/api/inventory/sessions/${session.Id}/lines`, { method: 'POST', body: payload });
            localStorage.removeItem(storageKey);
            setPending(null);
            const line = result.line;
            setSuccess(`Guardado: ${line.Code} · +${line.Quantity} · Existencias confirmadas: ${line.StockAfter}${result.replayed ? ' (operación ya registrada; no se duplicó)' : ''}`);
            reset();
            await onSaved();
        }
        catch (e) {
            setError(e.message || 'No se pudo guardar. Reintenta el mismo registro.');
            // Errores 4xx no modifican stock. En 5xx/red se conserva la operación para reconciliarla.
            if (e.status >= 400 && e.status < 500) {
                localStorage.removeItem(storageKey);
                setPending(null);
            }
        }
        finally {
            processing.current = false;
            setBusy(false);
        }
    }
    function add(e) {
        e.preventDefault();
        if (!lookup || looking || busy || pending)
            return;
        const n = Number(quantity);
        if (!Number.isInteger(n) || n < 1 || n > 1000000) {
            setError('Indica una cantidad entera entre 1 y 1,000,000.');
            return;
        }
        if (newCode && !stocktake && !brand) {
            setError('Selecciona la marca del código nuevo.');
            return;
        }
        commit({ requestKey: uuid(), code: code.trim(), quantity: n, brand: stocktake ? session.Brand : brand, method });
    }
    const product = lookup?.product, before = Number(product?.Stock || 0), after = before + Number(quantity || 0);
    const wrongBrand = stocktake && product && product.Marca.localeCompare(session.Brand, 'es', { sensitivity: 'base' }) !== 0;
    return _jsxs(Modal, { title: stocktake ? 'Contar productos' : 'Recibir mercancía', onClose: onClose, busy: busy, wide: true, className: "cl-capture-modal", children: [_jsxs("div", { className: "cl-session-caption", children: [_jsx("span", { children: session.Folio }), _jsx("strong", { children: stocktake ? session.Brand : 'La marca se identifica al escanear' })] }), pending && _jsxs("div", { className: "cl-alert cl-alert-warning", role: "alert", children: [_jsx(AlertTriangle, { size: 22 }), _jsxs("div", { children: [_jsx("strong", { children: "Hay una captura pendiente de confirmaci\u00F3n" }), _jsxs("p", { children: [pending.code, " \u00B7 ", pending.quantity, " unidades. Reintenta esta misma operaci\u00F3n para confirmar si ya qued\u00F3 guardada, sin duplicarla."] }), _jsxs("button", { className: "cl-button", disabled: busy, onClick: () => commit(pending), children: [_jsx(RotateCcw, { size: 16 }), "Reintentar registro pendiente"] })] })] }), success && _jsxs("div", { className: "cl-alert cl-alert-success", role: "status", children: [_jsx(CheckCircle2, { size: 20 }), _jsx("span", { children: success })] }), error && _jsx("div", { className: "cl-alert cl-alert-error", role: "alert", children: error }), _jsxs("div", { className: "cl-capture-grid", children: [_jsxs("section", { className: "cl-capture-left", children: [_jsxs("div", { className: "cl-tabs cl-tabs-compact", children: [_jsxs("button", { type: "button", className: mode === 'camera' ? 'active' : '', onClick: () => setMode('camera'), disabled: busy, children: [_jsx(Camera, { size: 17 }), "C\u00E1mara"] }), _jsxs("button", { type: "button", className: mode === 'manual' ? 'active' : '', onClick: () => setMode('manual'), disabled: busy, children: [_jsx(Keyboard, { size: 17 }), "Manual / lector USB"] })] }), mode === 'camera' && !lookup && !looking && !pending && !busy ? _jsx(CameraScanner, { onCode: find }, cameraCycle) : _jsxs("div", { className: "cl-scanner-rest", children: [lookup ? _jsx(PackageCheck, { size: 48 }) : _jsx(ScanLine, { size: 48 }), _jsx("h3", { children: lookup ? 'Código detectado' : mode === 'manual' ? 'Lector USB o captura manual' : 'Escáner en espera' }), _jsx("p", { children: lookup ? 'Revisa la cantidad y presiona Agregar.' : mode === 'manual' ? 'Enfoca el campo Código. Escanea con tu lector o escríbelo y presiona Enter.' : looking ? 'Buscando el código…' : 'Confirma la captura pendiente antes de continuar.' }), lookup && _jsx("button", { type: "button", className: "cl-button", disabled: busy || !!pending, onClick: reset, children: "Escanear otro c\u00F3digo" })] }), _jsxs("label", { className: "cl-file-label", children: [_jsx(ImagePlus, { size: 17 }), "Leer c\u00F3digo desde una foto", _jsx("input", { type: "file", accept: "image/*", disabled: busy || looking || !!pending, onChange: async (e) => { const file = e.target.files?.[0]; e.target.value = ''; if (!file)
                                            return; setMode('manual'); try {
                                            const value = await scanImage(file);
                                            await find(value, 'IMAGE');
                                        }
                                        catch (err) {
                                            setError(String(err.message || 'No se pudo leer el código de la imagen.'));
                                        } } })] })] }), _jsxs("form", { className: "cl-capture-form", onSubmit: add, children: [_jsxs("label", { className: "cl-field", children: ["C\u00F3digo QR / c\u00F3digo de barras", _jsxs("div", { className: "cl-input-action", children: [_jsx("input", { type: "text", value: code, autoComplete: "off", maxLength: 512, spellCheck: false, placeholder: "Escanea o escribe el c\u00F3digo", disabled: busy || !!pending, onChange: e => { lookupSequence.current++; setCode(e.target.value); setLookup(null); setLooking(false); setError(''); }, onKeyDown: e => { if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    find(code, mode === 'manual' ? 'SCANNER' : 'MANUAL');
                                                } } }), _jsx("button", { type: "button", className: "cl-icon-btn", "aria-label": "Buscar c\u00F3digo", disabled: !code.trim() || busy || looking || !!pending, onClick: () => find(code, 'MANUAL'), children: _jsx(Search, { size: 20 }) })] })] }), looking && _jsx("p", { className: "cl-muted", role: "status", children: "Buscando tambi\u00E9n entre productos agotados e inactivos\u2026" }), product && _jsxs("div", { className: "cl-detected-product", children: [product.Image ? _jsx("img", { src: imageUrl(product.Image), alt: "" }) : _jsx(PackageCheck, { size: 28 }), _jsxs("div", { children: [_jsx("span", { children: product.Marca }), _jsx("h3", { children: product.Modelo }), _jsxs("p", { children: [product.Color || 'Color por confirmar', " \u00B7 ", Number(product.NeedsReview) ? 'Graduación por confirmar' : product.PowerLabel] }), _jsx("small", { children: product.ScanCode })] })] }), wrongBrand && _jsxs("div", { className: "cl-alert cl-alert-error", children: ["Este producto es de ", product.Marca, ", no de ", session.Brand, ". No se agregar\u00E1 a este conteo."] }), newCode && _jsxs("div", { className: "cl-alert cl-alert-warning", children: [_jsx(AlertTriangle, { size: 20 }), _jsxs("span", { children: ["C\u00F3digo nuevo. Se crear\u00E1 autom\u00E1ticamente como ", _jsx("strong", { children: "pendiente de completar" }), ", sin publicarlo en el cat\u00E1logo."] })] }), !stocktake && _jsxs("label", { className: "cl-field", children: ["Marca para c\u00F3digos nuevos", _jsxs("select", { value: brand, disabled: busy || !!pending, onChange: e => setBrand(e.target.value), children: [_jsx("option", { value: "", children: "Seleccionar solo si el c\u00F3digo es nuevo" }), brands.map(b => _jsx("option", { value: b, children: b }, b))] }), _jsx("small", { children: "Para c\u00F3digos existentes se usa su marca real, no esta selecci\u00F3n." })] }), product && (product.VariantStatus === 'Inactivo' || product.ProductStatus === 'Inactivo') && _jsx("p", { className: "cl-muted", children: "El producto est\u00E1 inactivo. La entrada aumenta el stock, pero no lo publica; podr\u00E1s activarlo en Productos." }), _jsxs("label", { className: "cl-field", children: [stocktake ? 'Cantidad física contada' : 'Cantidad que llegó', _jsx("input", { ref: qtyRef, className: "cl-quantity", type: "number", inputMode: "numeric", min: "1", max: "1000000", step: "1", value: quantity, onChange: e => setQuantity(e.target.value), disabled: busy || !!pending, required: true })] }), _jsxs("div", { className: "cl-stock-preview", children: [_jsxs("div", { children: [_jsx("small", { children: stocktake ? 'Contado hasta ahora' : 'Existencias actuales' }), _jsx("strong", { children: lookup ? before : '—' })] }), _jsx("span", { children: "+" }), _jsxs("div", { children: [_jsx("small", { children: stocktake ? 'Agregar al conteo' : 'Recibidas' }), _jsx("strong", { children: quantity || 0 })] }), _jsx("span", { children: "=" }), _jsxs("div", { children: [_jsx("small", { children: "Nuevo stock" }), _jsx("strong", { children: lookup ? after : '—' })] })] }), _jsxs("button", { type: "submit", className: "cl-button cl-button-dark cl-button-block", disabled: busy || looking || !lookup || !!pending || wrongBrand, children: [_jsx(Plus, { size: 20 }), busy ? 'Guardando…' : 'Agregar cantidad'] }), _jsx("small", { className: "cl-muted", children: "Cada captura suma la cantidad indicada. El stock definitivo se confirma al guardar; no se agrega al detectar el c\u00F3digo." })] })] })] });
}
