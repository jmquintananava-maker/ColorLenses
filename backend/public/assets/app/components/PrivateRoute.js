import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { request } from '../utils/api.js';
export default function PrivateRoute({ children }) {
    const location = useLocation(), [state, setState] = useState('checking'), [message, setMessage] = useState('');
    const token = localStorage.getItem('adminToken');
    function check() { if (!token) {
        setState('invalid');
        return;
    } setState('checking'); request('/api/auth/me').then(() => setState('valid')).catch(e => { if (e.status === 401 || e.status === 403) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        setState('invalid');
    }
    else {
        setMessage(e.message);
        setState('error');
    } }); }
    useEffect(() => { let live = true; if (!token) {
        setState('invalid');
        return;
    } request('/api/auth/me').then(() => live && setState('valid')).catch(e => { if (!live)
        return; if (e.status === 401 || e.status === 403) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        setState('invalid');
    }
    else {
        setMessage(e.message);
        setState('error');
    } }); const expire = () => { localStorage.removeItem('adminToken'); localStorage.removeItem('adminUser'); setState('invalid'); }; window.addEventListener('adminSessionExpired', expire); return () => { live = false; window.removeEventListener('adminSessionExpired', expire); }; }, [token]);
    if (state === 'invalid')
        return _jsx(Navigate, { to: "/admin/login", state: { from: location.pathname + location.search }, replace: true });
    if (state === 'checking')
        return _jsxs("main", { className: "cl-auth-message", children: [_jsx("span", { className: "cl-brand-orbit" }), _jsx("h2", { children: "Verificando tu sesi\u00F3n\u2026" })] });
    if (state === 'error')
        return _jsxs("main", { className: "cl-auth-message", children: [_jsx("h2", { children: "No pudimos verificar la sesi\u00F3n" }), _jsx("p", { children: message }), _jsx("button", { className: "cl-btn", onClick: check, children: "Reintentar" })] });
    return children;
}
