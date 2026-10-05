import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Heart, ArrowUpRight } from 'lucide-react';
import { imageUrl } from '../utils/api.js';
import { money } from '../utils/catalog.js';
import { categoryKey } from '../utils/productFilters.js';
import { categoryLabel } from './ProductFilters.js';
const KEY = 'colorlensesFavorites';
const read = () => { try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
}
catch {
    return [];
} };
export default function LensCard({ product: p, onOpen }) {
    const id = String(p.ProductVariantId || p.Id), [liked, setLiked] = useState(false), [badImage, setBadImage] = useState(false);
    useEffect(() => { const update = () => setLiked(read().some(f => String(f.ProductVariantId || f.Id) === id)); update(); window.addEventListener('favoritesUpdated', update); return () => window.removeEventListener('favoritesUpdated', update); }, [id]);
    function favorite() { let list = read(); if (liked)
        list = list.filter(f => String(f.ProductVariantId || f.Id) !== id);
    else {
        const { variants, ...save } = p;
        list.push(save);
    } localStorage.setItem(KEY, JSON.stringify(list)); window.dispatchEvent(new Event('favoritesUpdated')); }
    return _jsxs("article", { className: "cl-lens-card", children: [_jsxs("div", { className: "cl-lens-image", children: [_jsx("button", { type: "button", className: "cl-lens-open", onClick: () => onOpen(p), "aria-label": `Ver ${p.Marca} ${p.Modelo} ${p.Color}`, children: p.Image && !badImage ? _jsx("img", { src: imageUrl(p.Image), alt: `${p.Modelo} · ${p.Color}`, loading: "lazy", onError: () => setBadImage(true) }) : _jsxs("div", { className: `cl-lens-placeholder cl-lens-${categoryKey(p.Category)}`, children: [_jsx("div", { className: "cl-mini-iris" }), _jsx("span", { children: p.Color || 'ColorLenses' })] }) }), _jsx("span", { className: "cl-product-tag", children: categoryLabel(categoryKey(p.Category)) || 'Colección' }), _jsx("button", { className: `cl-favorite ${liked ? 'liked' : ''}`, "aria-label": liked ? 'Quitar de favoritos' : 'Guardar en favoritos', "aria-pressed": liked, onClick: favorite, children: _jsx(Heart, { size: 19, fill: liked ? 'currentColor' : 'none' }) })] }), _jsxs("div", { className: "cl-lens-info", children: [_jsx("span", { className: "cl-product-brand", children: p.Marca }), _jsxs("button", { className: "cl-title-button", onClick: () => onOpen(p), children: [_jsx("h3", { children: p.Modelo }), _jsx(ArrowUpRight, { size: 17 })] }), _jsxs("p", { children: [p.Color || 'Color por confirmar', p.variants?.length > 1 ? ` · ${p.variants.length} graduaciones` : p.PowerLabel ? ` · ${p.PowerLabel}` : ''] }), _jsxs("div", { className: "cl-lens-bottom", children: [_jsxs("strong", { children: [p.variants?.length > 1 ? 'Desde ' : '', money(p.MinPrice ?? p.Price)] }), _jsx("span", { className: (p.TotalStock ?? p.Stock) > 0 ? 'cl-stock-yes' : 'cl-stock-no', children: (p.TotalStock ?? p.Stock) > 0 ? 'Disponible' : 'Sin existencias' })] })] })] });
}
