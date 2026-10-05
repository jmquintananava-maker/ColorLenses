import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export default function CheckGroup({ title, options = [], value = [], onChange, searchable = false, labelFor = v => v }) {
    const [search, setSearch] = useState('');
    const entries = options.map(o => typeof o === 'object' ? o : { value: String(o), label: labelFor(o) });
    const filtered = entries.filter(o => String(o.label).toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
    function toggle(v) { const clean = String(v); onChange(value.includes(clean) ? value.filter(x => x !== clean) : [...value, clean]); }
    return _jsxs("details", { className: "cl-check-group", open: true, children: [_jsxs("summary", { children: [title, _jsx("span", { children: value.length ? `${value.length} seleccionados` : 'Todos' })] }), searchable && entries.length > 6 && _jsx("input", { className: "cl-mini-search", "aria-label": `Buscar ${title.toLowerCase()}`, placeholder: "Buscar en la lista\u2026", value: search, onChange: e => setSearch(e.target.value) }), _jsxs("div", { className: "cl-check-options", children: [filtered.map(o => _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: value.includes(String(o.value)), onChange: () => toggle(o.value) }), _jsx("span", { children: o.label }), o.count != null && _jsx("small", { children: o.count })] }, o.value)), !filtered.length && _jsx("p", { className: "cl-muted", children: "Sin opciones disponibles." })] }), value.length > 0 && _jsx("button", { type: "button", className: "cl-text-btn", onClick: () => onChange([]), children: "Quitar selecci\u00F3n" })] });
}
