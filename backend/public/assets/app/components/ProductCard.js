import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
const FAVORITES_KEY = "colorlensesFavorites";
function ProductCard({ image, name, color, price, tag, productData }) {
    const [liked, setLiked] = useState(false);
    const getFavoriteId = (product) => {
        return String(product?.ProductVariantId ||
            product?.VariantId ||
            product?.Id ||
            product?.ProductId ||
            `${product?.Marca || ""}-${product?.Modelo || name || ""}-${product?.Color || color || ""}`);
    };
    const getCurrentProduct = () => {
        return {
            ...(productData || {}),
            ProductVariantId: productData?.ProductVariantId ||
                productData?.VariantId ||
                productData?.Id,
            ProductId: productData?.ProductId ||
                productData?.ProductID,
            Marca: productData?.Marca || "",
            Modelo: productData?.Modelo || name || "",
            Category: productData?.Category || tag || "",
            Color: productData?.Color || color || "",
            Power: productData?.Power ?? 0,
            PowerLabel: productData?.PowerLabel ||
                (Number(productData?.Power || 0) === 0
                    ? "Sin graduación"
                    : Number(productData?.Power || 0).toFixed(2)),
            Price: Number(productData?.Price || 0),
            Stock: Number(productData?.Stock || 0),
            Image: productData?.Image || image || "",
            Image2: productData?.Image2 || "",
            Image3: productData?.Image3 || "",
            Description: productData?.Description || "",
            ScanCode: productData?.ScanCode ||
                productData?.FactoryCode ||
                productData?.InternalCode ||
                ""
        };
    };
    const readFavorites = () => {
        try {
            const saved = localStorage.getItem(FAVORITES_KEY);
            if (!saved)
                return [];
            const parsed = JSON.parse(saved);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch (err) {
            console.log("❌ Error leyendo favoritos:", err);
            return [];
        }
    };
    const saveFavorites = (favorites) => {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
        window.dispatchEvent(new Event("favoritesUpdated"));
    };
    const checkIfLiked = () => {
        const currentProduct = getCurrentProduct();
        const currentId = getFavoriteId(currentProduct);
        const favorites = readFavorites();
        const exists = favorites.some((favorite) => {
            return getFavoriteId(favorite) === currentId;
        });
        setLiked(exists);
    };
    useEffect(() => {
        checkIfLiked();
        const handleFavoritesUpdated = () => {
            checkIfLiked();
        };
        window.addEventListener("storage", handleFavoritesUpdated);
        window.addEventListener("favoritesUpdated", handleFavoritesUpdated);
        return () => {
            window.removeEventListener("storage", handleFavoritesUpdated);
            window.removeEventListener("favoritesUpdated", handleFavoritesUpdated);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        productData?.ProductVariantId,
        productData?.Id,
        productData?.ProductId,
        name,
        color
    ]);
    const toggleFavorite = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentProduct = getCurrentProduct();
        const currentId = getFavoriteId(currentProduct);
        const favorites = readFavorites();
        const exists = favorites.some((favorite) => {
            return getFavoriteId(favorite) === currentId;
        });
        if (exists) {
            const newFavorites = favorites.filter((favorite) => {
                return getFavoriteId(favorite) !== currentId;
            });
            saveFavorites(newFavorites);
            setLiked(false);
            return;
        }
        saveFavorites([
            currentProduct,
            ...favorites
        ]);
        setLiked(true);
    };
    const stopButtonClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    return (_jsxs(motion.div, { className: "product-card", whileHover: {
            y: -8,
            scale: 1.01
        }, initial: {
            opacity: 0,
            y: 20
        }, animate: {
            opacity: 1,
            y: 0
        }, transition: {
            duration: 0.5
        }, children: [tag && (_jsx("div", { className: "product-tag", children: tag })), _jsx("button", { type: "button", className: liked
                    ? "favorite-btn active"
                    : "favorite-btn", onClick: toggleFavorite, "aria-label": liked
                    ? "Quitar de favoritos"
                    : "Agregar a favoritos", children: _jsx(Heart, { size: 18, fill: liked ? "currentColor" : "none" }) }), image ? (_jsx("img", { src: image, alt: name, className: "product-img" })) : (_jsx("div", { className: "product-img product-img-empty", children: "Sin imagen" })), _jsxs("div", { className: "product-info", children: [_jsx("h3", { children: name }), _jsx("p", { children: color }), _jsxs("div", { className: "product-bottom", children: [_jsx("strong", { children: price }), _jsx("button", { type: "button", className: "add-btn", onClick: stopButtonClick, children: "+" })] })] })] }));
}
export default ProductCard;
