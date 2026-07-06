import { useEffect, useMemo, useState } from "react";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import ProductCard from "../components/ProductCard";
import BottomNav from "../components/BottomNav";
import WhatsAppButton from "../components/WhatsAppButton";

const API_URL = import.meta.env.VITE_API_URL;

const PAGE_SIZE = 10;

function Catalog() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState([]);

  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, brandFilter, categoryFilter, colorFilter]);

  const normalizeText = (value) => {
    return String(value || "").trim().toLowerCase();
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
      console.log("❌ Error cargando catálogo:", err);
      setProducts([]);
    }
  };

  const catalogBaseProducts = useMemo(() => {
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
      const brandCompare =
        String(a.Marca || "").localeCompare(String(b.Marca || ""));

      if (brandCompare !== 0) return brandCompare;

      const modelCompare =
        String(a.Modelo || "").localeCompare(String(b.Modelo || ""));

      if (modelCompare !== 0) return modelCompare;

      return String(a.Color || "").localeCompare(String(b.Color || ""));
    });
  }, [products]);

  const uniqueBrands = useMemo(() => {
    const values = catalogBaseProducts
      .map((product) => product.Marca)
      .filter(Boolean);

    return [...new Set(values)].sort((a, b) =>
      String(a).localeCompare(String(b))
    );
  }, [catalogBaseProducts]);

  const uniqueCategories = useMemo(() => {
    const values = catalogBaseProducts
      .map((product) => product.Category)
      .filter(Boolean);

    return [...new Set(values)].sort((a, b) =>
      String(a).localeCompare(String(b))
    );
  }, [catalogBaseProducts]);

  const uniqueColors = useMemo(() => {
    const values = catalogBaseProducts
      .map((product) => product.Color)
      .filter(Boolean);

    return [...new Set(values)].sort((a, b) =>
      String(a).localeCompare(String(b))
    );
  }, [catalogBaseProducts]);

  const filteredProducts = useMemo(() => {
    const cleanSearch = normalizeText(search);
    const cleanBrand = normalizeText(brandFilter);
    const cleanCategory = normalizeText(categoryFilter);
    const cleanColor = normalizeText(colorFilter);

    return catalogBaseProducts.filter((product) => {
      const matchesBrand =
        !cleanBrand || normalizeText(product.Marca) === cleanBrand;

      const matchesCategory =
        !cleanCategory || normalizeText(product.Category) === cleanCategory;

      const matchesColor =
        !cleanColor || normalizeText(product.Color) === cleanColor;

      const matchesSearch =
        !cleanSearch ||
        normalizeText(product.Marca).includes(cleanSearch) ||
        normalizeText(product.Modelo).includes(cleanSearch) ||
        normalizeText(product.Category).includes(cleanSearch) ||
        normalizeText(product.Color).includes(cleanSearch) ||
        normalizeText(product.ScanCode).includes(cleanSearch) ||
        String(product.Price || "").includes(cleanSearch);

      return (
        matchesBrand &&
        matchesCategory &&
        matchesColor &&
        matchesSearch
      );
    });
  }, [
    catalogBaseProducts,
    search,
    brandFilter,
    categoryFilter,
    colorFilter
  ]);

  const selectedProductVariants = useMemo(() => {
    if (!selectedProduct) return [];

    const selectedKey = getProductKey(selectedProduct);

    return products
      .filter((product) => getProductKey(product) === selectedKey)
      .sort((a, b) => {
        const aPower = Number(a.Power || 0);
        const bPower = Number(b.Power || 0);

        const aPowerGroup = aPower === 0 ? 0 : 1;
        const bPowerGroup = bPower === 0 ? 0 : 1;

        if (aPowerGroup !== bPowerGroup) {
          return aPowerGroup - bPowerGroup;
        }

        if (aPower !== bPower) {
          return aPower - bPower;
        }

        return String(a.Category || "").localeCompare(String(b.Category || ""));
      });
  }, [products, selectedProduct]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;

    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, safeCurrentPage]);

  const showingStart =
    filteredProducts.length === 0
      ? 0
      : (safeCurrentPage - 1) * PAGE_SIZE + 1;

  const showingEnd = Math.min(
    safeCurrentPage * PAGE_SIZE,
    filteredProducts.length
  );

  const clearFilters = () => {
    setSearch("");
    setBrandFilter("");
    setCategoryFilter("");
    setColorFilter("");
    setCurrentPage(1);
  };

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

  const getProductImages = (product) => {
    if (!product) return [];

    const images = [
      product.Image,
      product.Image2,
      product.Image3
    ].filter(Boolean);

    return images.map((image) => getImageUrl(image));
  };

  const openProductModal = (product) => {
    setSelectedProduct(product);
    setSelectedImageIndex(0);
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
    setSelectedImageIndex(0);
  };

  const modalImages = getProductImages(selectedProduct);

  const nextImage = () => {
    if (modalImages.length <= 1) return;

    setSelectedImageIndex((current) =>
      current + 1 >= modalImages.length
        ? 0
        : current + 1
    );
  };

  const previousImage = () => {
    if (modalImages.length <= 1) return;

    setSelectedImageIndex((current) =>
      current - 1 < 0
        ? modalImages.length - 1
        : current - 1
    );
  };

  const buildWhatsAppMessage = (product, variant = null) => {
    const selectedVariant = variant || product;

    const text = `Hola, me interesa este lente:
${product.Marca} ${product.Modelo}
Color: ${product.Color}
Graduación: ${selectedVariant.PowerLabel}
Precio: ${formatPrice(selectedVariant.Price)}`;

    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="app">
      <Navbar setIsOpen={setIsSidebarOpen} />

      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="catalog-header">
        <h2>Catálogo</h2>

        <p>
          Descubre nuestros lentes. Las graduaciones disponibles aparecen dentro
          de cada producto.
        </p>
      </div>

      <section className="catalog-tools">
        <div className="catalog-search-box">
          <input
            type="text"
            placeholder="Buscar lentes por marca, modelo o color..."
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

        <div className="catalog-filters-grid">
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
          >
            <option value="">Todas las marcas</option>

            {uniqueBrands.map((brand) => (
              <option
                key={brand}
                value={brand}
              >
                {brand}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Todas las categorías</option>

            {uniqueCategories.map((category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            ))}
          </select>

          <select
            value={colorFilter}
            onChange={(e) => setColorFilter(e.target.value)}
          >
            <option value="">Todos los colores</option>

            {uniqueColors.map((color) => (
              <option
                key={color}
                value={color}
              >
                {color}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={clearFilters}
          >
            Limpiar filtros
          </button>
        </div>

        <div className="catalog-results-count">
          Mostrando {showingStart} - {showingEnd} de {filteredProducts.length} productos
        </div>
      </section>

      <section className="catalog-grid catalog-grid-two-columns">
        {paginatedProducts.map((product) => (
          <div
            key={`${product.Marca}-${product.Modelo}-${product.Color}-${product.ProductVariantId}`}
            className="catalog-product-click"
            onClick={() => openProductModal(product)}
          >
            <ProductCard
              image={getImageUrl(product.Image)}
              name={product.Modelo}
              color={getProductSubtitle(product)}
              price={formatPrice(product.Price)}
            />
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="catalog-empty">
            <h3>No encontramos productos</h3>

            <p>
              Intenta limpiar filtros o buscar otra marca, categoría o color.
            </p>

            <button
              type="button"
              onClick={clearFilters}
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </section>

      {filteredProducts.length > PAGE_SIZE && (
        <div className="catalog-pagination">
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() =>
              setCurrentPage((page) =>
                Math.max(1, page - 1)
              )
            }
          >
            Anterior
          </button>

          <span>
            Página {safeCurrentPage} de {totalPages}
          </span>

          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() =>
              setCurrentPage((page) =>
                Math.min(totalPages, page + 1)
              )
            }
          >
            Siguiente
          </button>
        </div>
      )}

      {selectedProduct && (
        <div
          className="catalog-modal-overlay"
          onClick={closeProductModal}
        >
          <div
            className="catalog-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="catalog-modal-close"
              onClick={closeProductModal}
            >
              ✕
            </button>

            <div className="catalog-modal-gallery">
              {modalImages.length > 0 ? (
                <img
                  src={modalImages[selectedImageIndex]}
                  alt={selectedProduct.Modelo}
                />
              ) : (
                <div className="catalog-modal-no-image">
                  Sin imagen
                </div>
              )}

              {modalImages.length > 1 && (
                <>
                  <button
                    type="button"
                    className="catalog-modal-nav left"
                    onClick={previousImage}
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    className="catalog-modal-nav right"
                    onClick={nextImage}
                  >
                    ›
                  </button>

                  <div className="catalog-modal-dots">
                    {modalImages.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        className={
                          selectedImageIndex === index
                            ? "active"
                            : ""
                        }
                        onClick={() => setSelectedImageIndex(index)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="catalog-modal-info">
              <h2>
                {selectedProduct.Modelo}
              </h2>

              <h3>
                {formatPrice(selectedProduct.Price)}
              </h3>

              <div className="catalog-modal-specs">
                <p>
                  <strong>Marca:</strong>
                  {" "}
                  {selectedProduct.Marca || "No especificada"}
                </p>

                <p>
                  <strong>Color:</strong>
                  {" "}
                  {selectedProduct.Color || "No especificado"}
                </p>

                <p>
                  <strong>Disponibilidad:</strong>
                  {" "}
                  {Number(selectedProduct.Stock || 0) > 0
                    ? "Disponible"
                    : "Agotado"}
                </p>
              </div>

              <p className="catalog-modal-description">
                {selectedProduct.Description ||
                  "Lente de contacto premium ideal para realzar tu mirada con un acabado natural y elegante."}
              </p>

              <div className="catalog-variants-section">
                <h4>
                  Graduaciones disponibles
                </h4>

                {selectedProductVariants.length > 0 ? (
                  <div className="catalog-variants-list">
                    {selectedProductVariants.map((variant) => (
                      <div
                        key={variant.ProductVariantId}
                        className="catalog-variant-row"
                      >
                        <div>
                          <strong>
                            {variant.PowerLabel || "Sin graduación"}
                          </strong>

                          <span>
                            {formatPrice(variant.Price)}
                          </span>

                          <small>
                            {Number(variant.Stock || 0) > 0
                              ? `Disponible · Stock: ${variant.Stock}`
                              : "Agotado"}
                          </small>
                        </div>

                        <a
                          href={buildWhatsAppMessage(selectedProduct, variant)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Preguntar
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="catalog-variants-empty">
                    No hay variantes activas para este producto.
                  </div>
                )}
              </div>

              <a
                className="catalog-modal-whatsapp"
                href={buildWhatsAppMessage(selectedProduct)}
                target="_blank"
                rel="noreferrer"
              >
                Preguntar por WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      <BottomNav />

      <WhatsAppButton />
    </div>
  );
}

export default Catalog;
