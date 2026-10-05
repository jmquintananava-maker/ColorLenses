import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { request } from '../utils/api.js';
export default function CardProfile() {
    const { slug } = useParams(), [customer, setCustomer] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
    useEffect(() => { let live = true; request('/api/cards/' + encodeURIComponent(slug)).then(c => live && setCustomer(c)).catch(e => live && setError(e.message)).finally(() => live && setLoading(false)); return () => { live = false; }; }, [slug]);
    if (loading)
        return _jsx("div", { className: "card-loading", children: "Cargando tarjeta\u2026" });
    if (!customer)
        return _jsxs("div", { className: "card-loading", children: [error || 'Tarjeta no encontrada', " ", _jsx(Link, { to: "/", children: "Volver a ColorLenses" })] });
    return _jsx("div", { className: "card-page", children: _jsxs("div", { className: "card-container", children: [_jsx("div", { className: "card-logo", children: "ColorLenses" }), _jsx("h1", { children: customer.FullName }), _jsx("p", { className: "card-status", children: customer.Level || 'Cliente ColorLenses' }), _jsx("div", { className: "card-qr", children: _jsx(QRCodeCanvas, { value: `${window.location.origin}/admin/sales/${encodeURIComponent(customer.CardSlug)}`, size: 180, level: "H", includeMargin: true }) }), _jsx("p", { children: "Presenta tu tarjeta al realizar tu compra." }), _jsx(Link, { className: "cl-btn", to: "/catalog", children: "Explorar cat\u00E1logo" })] }) });
}
