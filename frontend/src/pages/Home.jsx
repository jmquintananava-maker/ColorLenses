import Reviews from "../components/Reviews";
import Benefits from "../components/Benefits";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import ProductCard from "../components/ProductCard";
import BottomNav from "../components/BottomNav";
import WhatsAppButton from "../components/WhatsAppButton";

const API_URL = import.meta.env.VITE_API_URL;

const fallbackBanners = [
  {
    Id: "fallback-1",
    Title: "Resalta tu mirada con ColorLenses",
    Subtitle: "Lentes de contacto para verte como muñeca.",
    ButtonText: "Explorar catálogo",
    ButtonLink: "/catalog",
    Image: "",
    DisplayOrder: 1
  }
];

const homeCategories = [
  {
    label: "Naturales",
    value: "natural"
  },
  {
    label: "Azules",
    value: "blue"
  },
  {
    label: "Grises",
    value: "gray"
  },
  {
    label: "Verdes",
    value: "green"
  },
  {
    label: "Fantasy",
    value: "fantasy"
  }
];

function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [banners, setBanners] = useState([]);
  const [activeBanner, setActiveBanner] = useState(0);

  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("natural");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadBanners();
    loadProducts();
  }, []);

  useEffect(() => {
    const currentBanners =
      banners.length > 0
        ? banners
        : fallbackBanners;

    if (currentBanners.length <= 1) return;

    const interval = setInterval(() => {
      setActiveBanner((current) =>
        current === currentBanners.length - 1
          ? 0
          : current + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [banners]);

  const normalizeText = (value) => {
    return String(value || "").trim().toLowerCase();
  };

  const displayText = (value) => {
    return String(value || "").replace(/premium/gi, "muñeca");
  };

  const getVariantId = (product) => {
    return Number(product.ProductVariantId || product.Id || 0);
  };

  const getProductKey = (product) => {
    return [
      normalizeText(product.Marca),
      normalizeText(product.Modelo),
      normalizeText(product.Color)
    ].join("|");
  };

  const getImageUrl = (image) => {
    if (!image) return "";

    return String(image).startsWith("http")
      ? image
      : `${API_URL}${image}`;
  };

  const loadBanners = async () => {
    try {
      const response = await fetch(`${API_URL}/api/settings/banners`);
      const data = await response.json();

      setBanners(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("❌ Error cargando banners:", err);
      setBanners([]);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/product-variants`);
      const data = await response.json();

      const normalized = Array.isArray(data)
        ? data
            .map((product) => ({
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
                product.Modelo || "",

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
                Number(product.Price || 0),

              Stock:
                Number(product.Stock || 0),

              Image:
                product.Image || "",

              Image2:
                product.Image2 || "",

              Image3:
                product.Image3 || "",

              Description:
                product.Description || "",

              Status:
                product.Status || "Activo",

              ProductStatus:
                product.ProductStatus || "Activo",

              ScanCode:
                product.ScanCode ||
                product.FactoryCode ||
                product.InternalCode ||
                ""
            }))
            .filter((product) => {
              return (
                String(product.Status || "Activo") === "Activo" &&
                String(product.ProductStatus || "Activo") === "Activo"
              );
            })
            .sort((a, b) => getVariantId(b) - getVariantId(a))
        : [];

      setProducts(normalized);
    } catch (err) {
      console.log("❌ Error cargando productos Home:", err);
      setProducts([]);
    }
  };

  const baseProducts = useMemo(() => {
    const baseMap = new Map();

    products
      .filter((product) => Number(product.Power || 0) === 0)
      .forEach((product) => {
        const key = getProductKey(product);

        if (!key || key === "||") return;

        const existing = baseMap.get(key);

        if (!existing) {
          baseMap.set(key, product);
          return;
        }

        const existingStock = Number(existing.Stock || 0);
        const currentStock = Number(product.Stock || 0);

        if (existingStock <= 0 && currentStock > 0) {
          baseMap.set(key, product);
        }
      });

    return Array.from(baseMap.values()).sort((a, b) => {
      const stockDiff = Number(b.Stock || 0) - Number(a.Stock || 0);

      if (stockDiff !== 0) return stockDiff;

      return getVariantId(b) - getVariantId(a);
    });
  }, [products]);

  const categoryMatches = (product, category) => {
    const fullText = normalizeText(
      `${product.Marca} ${product.Modelo} ${product.Category} ${product.Color}`
    );

    if (category === "natural") {
      return (
        fullText.includes("natural") ||
        fullText.includes("natura") ||
        Number(product.Power || 0) === 0
      );
    }

    if (category === "blue") {
      return (
        fullText.includes("azul") ||
        fullText.includes("blue")
      );
    }

    if (category === "gray") {
      return (
        fullText.includes("gris") ||
        fullText.includes("gray") ||
        fullText.includes("grey")
      );
    }

    if (category === "green") {
      return (
        fullText.includes("verde") ||
        fullText.includes("green")
      );
    }

    if (category === "fantasy") {
      return (
        fullText.includes("fantasy") ||
        fullText.includes("fantasía") ||
        fullText.includes("fantasia")
      );
    }

    return true;
  };

  const filteredTrendingProducts = useMemo(() => {
    const cleanSearch = normalizeText(search);

    return baseProducts
      .filter((product) => {
        const matchesCategory = categoryMatches(
          product,
          selectedCategory
        );

        const matchesSearch =
          !cleanSearch ||
          normalizeText(product.Marca).includes(cleanSearch) ||
          normalizeText(product.Modelo).includes(cleanSearch) ||
          normalizeText(product.Category).includes(cleanSearch) ||
          normalizeText(product.Color).includes(cleanSearch) ||
          normalizeText(product.ScanCode).includes(cleanSearch) ||
          String(product.Price || "").includes(cleanSearch);

        return matchesCategory && matchesSearch;
      })
      .slice(0, 6);
  }, [baseProducts, selectedCategory, search]);

  const currentBanners =
    banners.length > 0
      ? banners
      : fallbackBanners;

  const banner =
    currentBanners[activeBanner] || currentBanners[0];

  const bannerImage =
    banner?.Image
      ? `${API_URL}${banner.Image}`
      : null;

  const formatPrice = (price) => {
    const cleanPrice = Number(price || 0);

    if (cleanPrice <= 0) {
      return "Precio por confirmar";
    }

    return `$${cleanPrice.toFixed(2)} MXN`;
  };

  const getProductSubtitle = (product) => {
    const parts = [
      product.Marca,
      product.Color
    ].filter(Boolean);

    return parts.join(" · ");
  };

  return (
    <div className="app">
      <Navbar setIsOpen={setIsSidebarOpen} />

      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <section className="dynamic-hero">
        <AnimatePresence mode="wait">
          <motion.div
            key={banner?.Id || activeBanner}
            className="dynamic-hero-card"
            initial={{
              opacity: 0,
              x: 60,
              scale: 0.98
            }}
            animate={{
              opacity: 1,
              x: 0,
              scale: 1
            }}
            exit={{
              opacity: 0,
              x: -60,
              scale: 0.98
            }}
            transition={{
              duration: 0.6,
              ease: "easeOut"
            }}
          >
            <div className="dynamic-hero-content">
              <motion.div
                className="dynamic-hero-badge"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                ✨ Nueva colección 2026
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                {displayText(banner?.Title)}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                {displayText(banner?.Subtitle)}
              </motion.p>

              {banner?.ButtonText && (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <Link
                    to={banner?.ButtonLink || "/catalog"}
                    className="dynamic-hero-btn"
                  >
                    {banner.ButtonText}
                    <span>→</span>
                  </Link>
                </motion.div>
              )}
            </div>

            <div className="dynamic-hero-image-box">
              {bannerImage ? (
                <motion.img
                  src={bannerImage}
                  alt={banner?.Title || "ColorLenses Banner"}
                  initial={{ scale: 1.08 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1.2 }}
                />
              ) : (
                <div className="dynamic-hero-placeholder">
                  ColorLenses
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {currentBanners.length > 1 && (
          <div className="dynamic-hero-dots">
            {currentBanners.map((item, index) => (
              <button
                key={item.Id || index}
                className={
                  activeBanner === index
                    ? "active"
                    : ""
                }
                onClick={() => setActiveBanner(index)}
                aria-label={`Ver banner ${index + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="home-categories-scroll">
        {homeCategories.map((category) => (
          <button
            key={category.value}
            type="button"
            className={
              selectedCategory === category.value
                ? "home-category-pill active"
                : "home-category-pill"
            }
            onClick={() => setSelectedCategory(category.value)}
          >
            {category.label}
          </button>
        ))}
      </section>

      <section className="home-search-section">
        <div className="home-search-box">
          <Search size={22} />

          <input
            type="text"
            placeholder="Buscar lentes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
            >
              ✕
            </button>
          )}
        </div>
      </section>

      <section className="products-section">
        <div className="section-header">
          <h2>
            Trending Lenses
          </h2>

          <Link to="/catalog">
            Ver todos
          </Link>
        </div>

        {filteredTrendingProducts.length > 0 ? (
          <div className="products-grid home-products-grid">
            {filteredTrendingProducts.map((product, index) => (
              <ProductCard
                key={`${product.ProductVariantId}-${index}`}
                image={getImageUrl(product.Image)}
                name={product.Modelo}
                color={getProductSubtitle(product)}
                price={formatPrice(product.Price)}
                tag={
                  index === 0
                    ? "BEST SELLER"
                    : index === 1
                      ? "NEW"
                      : index === 2
                        ? "TOP"
                        : ""
                }
                productData={product}
              />
            ))}
          </div>
        ) : (
          <div className="home-empty-products">
            <h3>
              No encontramos lentes
            </h3>

            <p>
              Prueba otra categoría o cambia la búsqueda.
            </p>

            <button
              type="button"
              onClick={() => {
                setSelectedCategory("natural");
                setSearch("");
              }}
            >
              Limpiar búsqueda
            </button>
          </div>
        )}
      </section>

      <Benefits />

      <Reviews />

      <BottomNav />

      <WhatsAppButton />
    </div>
  );
}

export default Home;
