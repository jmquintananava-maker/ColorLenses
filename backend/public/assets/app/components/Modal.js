import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
export default function Modal({ title, children, onClose, busy = false, wide = false, className = '' }) {
    const ref = useRef(null), titleId = useId();
    useEffect(() => { const d = ref.current; d.showModal(); return () => { if (d.open)
        d.close(); }; }, []);
    return createPortal(_jsxs("dialog", { ref: ref, className: `cl-modal ${wide ? 'cl-modal-wide' : ''} ${className}`, "aria-labelledby": titleId, onCancel: e => { e.preventDefault(); if (!busy)
            onClose(); }, onClick: e => { if (e.target === ref.current && !busy)
            onClose(); }, children: [_jsxs("header", { className: "cl-modal-head", children: [_jsxs("div", { children: [_jsx("span", { className: "cl-eyebrow", children: "COLORLENSES" }), _jsx("h2", { id: titleId, children: title })] }), _jsx("button", { type: "button", className: "cl-icon-btn", "aria-label": "Cerrar ventana", disabled: busy, onClick: onClose, children: _jsx(X, { size: 22 }) })] }), _jsx("div", { className: "cl-modal-body", children: children })] }), document.body);
}
