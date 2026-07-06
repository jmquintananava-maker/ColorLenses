import { useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";
import ProductCard from "../components/ProductCard";
import WhatsAppButton from "../components/WhatsAppButton";

const API_URL = import.meta.env.VITE_API_URL;

const FAVORITES_KEY = "colorlensesFavorites";

function Favorites() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    loadFavorites();

    const handleStorageChange = () => {
      loadFavorites();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("favoritesUpdated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("favoritesUpdated", handleStorageChange);
    };
  }, []);

  const normalizeText = (value) => {
    return String(value || "").trim().toLowerCase();
  };

  const getFavoriteId = (product) => {
    return String(
      product?.ProductVariantId ||
        product?.VariantId ||
        product?.Id ||
        product?.ProductId ||
        `${product?.Marca || ""}-${product?.Modelo || ""}-${product?.Color || ""}`
    );
  };

  const normalizeProduct = (product) => {
    return {
      ...product,

      ProductVariantId:
        product.ProductVariantId ||
        product.VariantId ||
        product.Id,

      ProductId:
        product.ProductId ||
        product.ProductID,

      Marca:
        product.Marca || "",

      Modelo:
        product.Modelo || product.name || "",

      Category:
        product.Category || "",

      Color:
        product.Color || "",

      Power:
        product.Power ?? 0,

      PowerLabel:
        product.PowerLabel ||
        (Number(product.Power || 0) === 0
          ? "Sin graduación"
          : Number(product.Power || 0).toFixed(2)),

      Price:
        Number(product.Price || product.price || 0),

      Stock:
        Number(product.Stock || 0),

      Image:
        product.Image || product.image || "",

      Image2:
        product.Image2 || "",

      Image3:
        product.Image3 || "",

      Description:
        product.Description || "",

      ScanCode:
        product.ScanCode ||
        product.FactoryCode ||
        product.InternalCode ||
        ""
    };
  };

  const loadFavorites = () => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);

      if (!saved) {
        setFavorites([]);
        return;
      }

      const parsed = JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        setFavorites([]);
        return;
      }

      const normalized = parsed
        .map(normalizeProduct)
        .filter((product) => product.Modelo || product.Marca);

      setFavorites(normalized);
    } catch (err) {
      console.log("❌ Error cargando favoritos:", err);
      setFavorites([]);
    }
  };

  const saveFavorites = (newFavorites) => {
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(newFavorites)
    );

    setFavorites(newFavorites);

    window.dispatchEvent(new Event("favoritesUpdated"));
  };

  const removeFavorite = (productToRemove) => {
    const removeId = getFavoriteId(productToRemove);

    const newFavorites = favorites.filter((product) => {
      return getFavoriteId(product) !== removeId;
    });

    saveFavorites(newFavorites);
  };

  const clearFavorites = () => {
    const confirmClear = window.confirm(
      "¿Quieres quitar todos tus favoritos?"
    );

    if (!confirmClear) return;

    saveFavorites([]);
  };

  const formatPrice = (price) => {
    const cleanPrice = Number(price || 0);

    if (cleanPrice <= 0) {
      return "Precio por confirmar";
    }

    return `$${cleanPrice.toFixed(2)} MXN`;
  };

  const getImageUrl = (image) => {
    if (!image) return "";

    if (
      String(image).startsWith("http") ||
      String(image).startsWith("data:") ||
      String(image).startsWith("blob:")
    ) {
      return image;
    }

    return `${API_URL}${image}`;
  };

  const getProductSubtitle = (product) => {
    const parts = [
      product.Marca,
      product.Color
    ].filter(Boolean);

    return parts.join(" · ");
  };

  const buildWhatsAppMessage = (product) => {
    const text = `Hola, me interesa este lente:
${product.Marca} ${product.Modelo}
Color: ${product.Color}
Graduación: ${product.PowerLabel}
Precio: ${formatPrice(product.Price)}`;

    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const orderedFavorites = useMemo(() => {
    return [...favorites].sort((a, b) => {
      const brandCompare =
        normalizeText(a.Marca).localeCompare(normalizeText(b.Marca));

      if (brandCompare !== 0) return brandCompare;

      const modelCompare =
        normalizeText(a.Modelo).localeCompare(normalizeText(b.Modelo));

      if (modelCompare !== 0) return modelCompare;

      return normalizeText(a.Color).localeCompare(normalizeText(b.Color));
    });
  }, [favorites]);

  return (
    <div className="app">
      <Navbar setIsOpen={setIsSidebarOpen} />

      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="catalog-header">
        <h2>Favoritos</h2>

        <p>
          Estos son los lentes que guardaste para ver después.
        </p>
      </div>

      {orderedFavorites.length > 0 && (
        <section className="favorites-actions">
          <span>
            {orderedFavorites.length} favorito
            {orderedFavorites.length === 1 ? "" : "s"}
          </span>

          <button
            type="button"
            onClick={clearFavorites}
          >
            Limpiar favoritos
          </button>
        </section>
      )}

      {orderedFavorites.length > 0 ? (
        <section className="catalog-grid catalog-grid-two-columns">
          {orderedFavorites.map((product) => (
            <div
              key={getFavoriteId(product)}
              className="favorite-product-box"
            >
              <ProductCard
                image={getImageUrl(product.Image)}
                name={product.Modelo}
                color={getProductSubtitle(product)}
                price={formatPrice(product.Price)}
              />

              <div className="favorite-product-actions">
                <a
                  href={buildWhatsAppMessage(product)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Preguntar
                </a>

                <button
                  type="button"
                  onClick={() => removeFavorite(product)}
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="favorites-empty">
          <div>
            <h3>
              Todavía no tienes favoritos
            </h3>

            <p>
              Ve al catálogo y toca el corazón de los lentes que te gusten.
            </p>

            <Link to="/catalog">
              Ver catálogo
            </Link>
          </div>
        </section>
      )}

      <BottomNav />

      <WhatsAppButton />
    </div>
  );
}

export default Favorites;
