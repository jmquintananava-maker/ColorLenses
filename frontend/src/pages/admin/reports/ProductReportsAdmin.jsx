import { useEffect, useMemo, useState } from "react";

import {
  Download,
  FileSpreadsheet,
  Filter,
  RotateCcw,
  Search
} from "lucide-react";

import AdminSidebar from "../../../components/AdminSidebar";

const API_URL = import.meta.env.VITE_API_URL;

function ProductReportsAdmin() {
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [colors, setColors] = useState([]);
  const [products, setProducts] = useState([]);

  const [filters, setFilters] = useState({
    marca: "",
    category: "",
    modelo: "",
    color: "",
    powerType: "all",
    status: "active",
    stockMode: "all",
    codeType: "all"
  });

  const [isLoading, setIsLoading] = useState(false);
  const [lastGeneratedUrl, setLastGeneratedUrl] = useState("");

  useEffect(() => {
    loadOptions();
  }, []);

  const normalizeText = (value) => {
    return String(value || "").trim().toLowerCase();
  };

  const loadOptions = async () => {
    try {
      setIsLoading(true);

      const [
        brandsRes,
        categoriesRes,
        colorsRes,
        productsRes
      ] = await Promise.all([
        fetch(`${API_URL}/api/settings/brands`),
        fetch(`${API_URL}/api/settings/categories`),
        fetch(`${API_URL}/api/settings/colors`),
        fetch(`${API_URL}/api/product-variants`)
      ]);

      const brandsData = await brandsRes.json();
      const categoriesData = await categoriesRes.json();
      const colorsData = await colorsRes.json();
      const productsData = await productsRes.json();

      setBrands(Array.isArray(brandsData) ? brandsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setColors(Array.isArray(colorsData) ? colorsData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) {
      console.log("❌ Error cargando opciones de reportes:", err);
      alert("No se pudieron cargar las opciones del reporte");
    } finally {
      setIsLoading(false);
    }
  };

  const uniqueModels = useMemo(() => {
    const models = products
      .map((item) => item.Modelo)
      .filter(Boolean);

    return [...new Set(models)].sort((a, b) =>
      String(a).localeCompare(String(b))
    );
  }, [products]);

  const estimatedMatches = useMemo(() => {
    return products.filter((product) => {
      const matchesMarca =
        !filters.marca ||
        normalizeText(product.Marca) === normalizeText(filters.marca);

      const matchesCategory =
        !filters.category ||
        normalizeText(product.Category) === normalizeText(filters.category);

      const matchesModelo =
        !filters.modelo ||
        normalizeText(product.Modelo) === normalizeText(filters.modelo);

      const matchesColor =
        !filters.color ||
        normalizeText(product.Color) === normalizeText(filters.color);

      const cleanPower = Number(product.Power || 0);

      const matchesPowerType =
        filters.powerType === "all" ||
        (filters.powerType === "none" && cleanPower === 0) ||
        (filters.powerType === "graduated" && cleanPower !== 0);

      const matchesStatus =
        filters.status === "all" ||
        (
          filters.status === "active" &&
          product.Status === "Activo" &&
          (product.ProductStatus || "Activo") === "Activo"
        ) ||
        (
          filters.status === "inactive" &&
          (
            product.Status === "Inactivo" ||
            product.ProductStatus === "Inactivo"
          )
        );

      const cleanStock = Number(product.Stock || 0);

      const matchesStock =
        filters.stockMode === "all" ||
        (filters.stockMode === "with_stock" && cleanStock > 0) ||
        (filters.stockMode === "without_stock" && cleanStock <= 0);

      const matchesCodeType =
        filters.codeType === "all" ||
        normalizeText(product.CodeType) === normalizeText(filters.codeType);

      return (
        matchesMarca &&
        matchesCategory &&
        matchesModelo &&
        matchesColor &&
        matchesPowerType &&
        matchesStatus &&
        matchesStock &&
        matchesCodeType
      );
    }).length;
  }, [products, filters]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      marca: "",
      category: "",
      modelo: "",
      color: "",
      powerType: "all",
      status: "active",
      stockMode: "all",
      codeType: "all"
    });

    setLastGeneratedUrl("");
  };

  const buildExportUrl = () => {
    const params = new URLSearchParams();

    params.set("marca", filters.marca || "");
    params.set("category", filters.category || "");
    params.set("modelo", filters.modelo || "");
    params.set("color", filters.color || "");
    params.set("powerType", filters.powerType || "all");
    params.set("status", filters.status || "active");
    params.set("stockMode", filters.stockMode || "all");
    params.set("codeType", filters.codeType || "all");

    return `${API_URL}/api/reports/products/export?${params.toString()}`;
  };

  const generateReport = () => {
    const url = buildExportUrl();

    setLastGeneratedUrl(url);

    window.open(url, "_blank");
  };

  const quickUrbanNatural = () => {
    setFilters((prev) => ({
      ...prev,
      marca: "Urban Layer",
      category: "Natural",
      powerType: "all",
      status: "active",
      stockMode: "all",
      codeType: "all"
    }));
  };

  const quickUrbanGraduated = () => {
    setFilters((prev) => ({
      ...prev,
      marca: "Urban Layer",
      category: "",
      powerType: "graduated",
      status: "active",
      stockMode: "all",
      codeType: "all"
    }));
  };

  const quickWithoutStock = () => {
    setFilters((prev) => ({
      ...prev,
      stockMode: "without_stock",
      status: "all"
    }));
  };

  return (
    <div className="admin-page">
      <AdminSidebar />

      <main className="admin-content">
        <div className="admin-header-row">
          <div className="admin-header">
            <h1>Reportes Excel</h1>

            <p>
              Genera archivos para Excel filtrando productos por marca,
              categoría, graduación, stock, color y tipo de código.
            </p>
          </div>

          <button
            type="button"
            className="admin-add-btn"
            onClick={generateReport}
            disabled={isLoading}
          >
            <Download size={18} />
            Generar Excel
          </button>
        </div>

        <div className="admin-form-card">
          <div className="admin-form-header">
            <div>
              <h2>
                <FileSpreadsheet size={22} />
                Configuración del reporte
              </h2>

              <p>
                Selecciona los filtros y descarga el archivo CSV compatible
                con Excel.
              </p>
            </div>
          </div>

          <div className="products-toolbar">
            <button
              type="button"
              className="products-count-box"
              onClick={quickUrbanNatural}
            >
              Urban Layer Natural
            </button>

            <button
              type="button"
              className="products-count-box"
              onClick={quickUrbanGraduated}
            >
              Urban Layer graduados
            </button>

            <button
              type="button"
              className="products-count-box"
              onClick={quickWithoutStock}
            >
              Sin stock
            </button>

            <button
              type="button"
              className="products-count-box"
              onClick={resetFilters}
            >
              <RotateCcw size={15} />
              Limpiar
            </button>
          </div>

          <div className="admin-form-grid">
            <select
              value={filters.marca}
              onChange={(e) =>
                handleFilterChange("marca", e.target.value)
              }
            >
              <option value="">Todas las marcas</option>

              {brands.map((brand) => (
                <option key={brand.Id} value={brand.Name}>
                  {brand.Name}
                </option>
              ))}
            </select>

            <select
              value={filters.category}
              onChange={(e) =>
                handleFilterChange("category", e.target.value)
              }
            >
              <option value="">Todas las categorías</option>

              {categories.map((category) => (
                <option key={category.Id} value={category.Name}>
                  {category.Name}
                </option>
              ))}
            </select>

            <select
              value={filters.modelo}
              onChange={(e) =>
                handleFilterChange("modelo", e.target.value)
              }
            >
              <option value="">Todos los productos/modelos</option>

              {uniqueModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>

            <select
              value={filters.color}
              onChange={(e) =>
                handleFilterChange("color", e.target.value)
              }
            >
              <option value="">Todos los colores</option>

              {colors.map((color) => (
                <option key={color.Id} value={color.Name}>
                  {color.Name}
                </option>
              ))}
            </select>

            <select
              value={filters.powerType}
              onChange={(e) =>
                handleFilterChange("powerType", e.target.value)
              }
            >
              <option value="all">Todas las graduaciones</option>
              <option value="none">Sin graduación</option>
              <option value="graduated">Con graduación</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) =>
                handleFilterChange("status", e.target.value)
              }
            >
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
              <option value="all">Todos</option>
            </select>

            <select
              value={filters.stockMode}
              onChange={(e) =>
                handleFilterChange("stockMode", e.target.value)
              }
            >
              <option value="all">Cualquier stock</option>
              <option value="with_stock">Con stock</option>
              <option value="without_stock">Sin stock</option>
            </select>

            <select
              value={filters.codeType}
              onChange={(e) =>
                handleFilterChange("codeType", e.target.value)
              }
            >
              <option value="all">Todos los tipos de código</option>
              <option value="BARCODE">Código de barras</option>
              <option value="QR">QR</option>
              <option value="INTERNAL">Interno</option>
            </select>
          </div>
        </div>

        <div className="admin-form-card">
          <div className="admin-form-header">
            <div>
              <h2>
                <Filter size={22} />
                Resumen
              </h2>

              <p>
                Vista rápida antes de descargar.
              </p>
            </div>
          </div>

          <div className="products-toolbar">
            <div className="products-count-box">
              Coincidencias aproximadas: {estimatedMatches}
            </div>

            <div className="products-count-box">
              Fuente: Variantes de producto
            </div>
          </div>

          <div className="sales-product-empty">
            <Search size={18} />
            El archivo incluirá columnas como marca, categoría, modelo, color,
            graduación, precio, stock, código escaneable, tipo de código y
            estatus.
          </div>

          {lastGeneratedUrl && (
            <div className="sales-product-empty">
              Último reporte generado:
              {" "}
              <a
                href={lastGeneratedUrl}
                target="_blank"
                rel="noreferrer"
              >
                Descargar nuevamente
              </a>
            </div>
          )}

          <button
            type="button"
            className="admin-save-btn"
            onClick={generateReport}
            disabled={isLoading}
          >
            <Download size={18} />
            {isLoading ? "Cargando..." : "Generar archivo para Excel"}
          </button>
        </div>
      </main>
    </div>
  );
}

export default ProductReportsAdmin;
