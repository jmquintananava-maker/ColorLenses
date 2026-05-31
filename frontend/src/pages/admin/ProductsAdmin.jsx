import { useEffect, useMemo, useState } from "react";

import { QRCodeSVG } from "qrcode.react";

import {
  Pencil,
  Trash2,
  Plus,
  RotateCcw,
  Download,
  Search
} from "lucide-react";

import AdminSidebar from "../../components/AdminSidebar";

const API_URL = import.meta.env.VITE_API_URL;

function ProductsAdmin() {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [colors, setColors] = useState([]);

  const [viewMode, setViewMode] = useState("active");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const [formData, setFormData] = useState({
    SKU: "",
    Category: "",
    Marca: "",
    Modelo: "",
    Color: "",
    Price: "",
    Description: "",
    Image: "",
    Stock: "",
    ProductQR: ""
  });

  useEffect(() => {
    loadProducts();
  }, [viewMode]);

  useEffect(() => {
    loadSettingsOptions();
  }, []);

  const loadSettingsOptions = async () => {
    try {
      const [brandsRes, categoriesRes, colorsRes] = await Promise.all([
        fetch(`${API_URL}/api/settings/brands`),
        fetch(`${API_URL}/api/settings/categories`),
        fetch(`${API_URL}/api/settings/colors`)
      ]);

      const brandsData = await brandsRes.json();
      const categoriesData = await categoriesRes.json();
      const colorsData = await colorsRes.json();

      setBrands(Array.isArray(brandsData) ? brandsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setColors(Array.isArray(colorsData) ? colorsData : []);
    } catch (err) {
      console.log("❌ Error cargando opciones:", err);
    }
  };

  const filteredProducts = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) return products;

    return products.filter((product) => {
      return (
        String(product.Id || "")
          .toLowerCase()
          .includes(searchText) ||
        String(product.SKU || "")
          .toLowerCase()
          .includes(searchText) ||
        String(product.Category || "")
          .toLowerCase()
          .includes(searchText) ||
        String(product.Modelo || "")
          .toLowerCase()
          .includes(searchText) ||
        String(product.Marca || "")
          .toLowerCase()
          .includes(searchText) ||
        String(product.Color || "")
          .toLowerCase()
          .includes(searchText) ||
        String(product.Price || "")
          .toLowerCase()
          .includes(searchText) ||
        String(product.Stock || "")
          .toLowerCase()
          .includes(searchText) ||
        String(product.ProductQR || "")
          .toLowerCase()
          .includes(searchText) ||
        String(product.Status || "")
          .toLowerCase()
          .includes(searchText)
      );
    });
  }, [products, search]);

  const loadProducts = async () => {
    try {
      const endpoint =
        viewMode === "active"
          ? `${API_URL}/api/products`
          : `${API_URL}/api/products-inactive`;

      const response = await fetch(endpoint);
      const data = await response.json();

      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("❌ Error cargando productos:", err);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImage = (e) => {
    setImageFile(e.target.files[0]);
  };

  const resetForm = () => {
    setFormData({
      SKU: "",
      Category: "",
      Marca: "",
      Modelo: "",
      Color: "",
      Price: "",
      Description: "",
      Image: "",
      Stock: "",
      ProductQR: ""
    });

    setEditingId(null);
    setImageFile(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const saveProduct = async () => {
    try {
      if (!formData.Category) {
        alert("Selecciona una categoría");
        return;
      }

      if (!formData.Marca) {
        alert("Selecciona una marca");
        return;
      }

      if (!formData.Modelo.trim()) {
        alert("Escribe el modelo");
        return;
      }

      if (!formData.Color) {
        alert("Selecciona un color");
        return;
      }

      if (!formData.Price) {
        alert("Escribe el precio");
        return;
      }

      if (!formData.Stock) {
        alert("Escribe el stock");
        return;
      }

      let imageUrl = formData.Image;

      if (imageFile) {
        const uploadData = new FormData();

        uploadData.append("image", imageFile);

        const uploadResponse = await fetch(`${API_URL}/api/upload`, {
          method: "POST",
          body: uploadData
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
          alert(uploadResult.message || "No se pudo subir la imagen");
          return;
        }

        imageUrl = uploadResult.imageUrl;
      }

      const payload = {
        ...formData,
        SKU: formData.SKU || "",
        Description: formData.Description || "",
        Image: imageUrl,
        Price: Number(formData.Price || 0),
        Stock: Number(formData.Stock || 0)
      };

      const url = editingId
        ? `${API_URL}/api/products/${editingId}`
        : `${API_URL}/api/products`;

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.sqlMessage ||
            data.message ||
            "No se pudo guardar el producto"
        );

        return;
      }

      await loadProducts();

      resetForm();

      setShowForm(false);

      alert(
        editingId
          ? "✅ Producto actualizado"
          : "✅ Producto creado"
      );
    } catch (err) {
      console.log("❌ Error save product:", err);
      alert("Error al guardar producto");
    }
  };

  const editProduct = (product) => {
    setEditingId(product.Id);

    setFormData({
      SKU: product.SKU || "",
      Category: product.Category || "",
      Marca: product.Marca || "",
      Modelo: product.Modelo || "",
      Color: product.Color || "",
      Price: product.Price || "",
      Description: product.Description || "",
      Image: product.Image || "",
      Stock: product.Stock || "",
      ProductQR: product.ProductQR || `PRODUCT-${product.Id}`
    });

    setImageFile(null);
    setShowForm(true);
  };

  const downloadProductQR = (product) => {
    try {
      if (!product.ProductQR) {
        alert("Este producto no tiene QR.");
        return;
      }

      const svgElement = document.getElementById(`product-qr-${product.Id}`);

      if (!svgElement) {
        alert("No se encontró el QR para descargar.");
        return;
      }

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);

      const svgBlob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8"
      });

      const url = URL.createObjectURL(svgBlob);
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");

        const canvasSize = 600;
        const qrSize = 430;

        canvas.width = canvasSize;
        canvas.height = canvasSize;

        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const qrX = (canvasSize - qrSize) / 2;
        const qrY = 45;

        ctx.drawImage(image, qrX, qrY, qrSize, qrSize);

        ctx.fillStyle = "#111111";
        ctx.font = "bold 34px Arial";
        ctx.textAlign = "center";

        ctx.fillText(product.ProductQR, canvasSize / 2, 535);

        const pngUrl = canvas.toDataURL("image/png");

        const link = document.createElement("a");

        const cleanName = product.Modelo
          ? product.Modelo.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "")
          : "producto";

        link.download = `${product.ProductQR}-${cleanName}.png`;
        link.href = pngUrl;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
      };

      image.src = url;
    } catch (err) {
      console.log("❌ Error descargando QR:", err);
      alert("No se pudo descargar el QR.");
    }
  };

  const deleteProduct = async (id) => {
    const confirmDelete = window.confirm(
      "¿Desactivar producto? Ya no aparecerá en ventas ni catálogo, pero se conservará en el historial."
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_URL}/api/products/${id}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.sqlMessage ||
            data.message ||
            "No se pudo desactivar el producto"
        );

        return;
      }

      alert("✅ Producto desactivado");

      await loadProducts();
    } catch (err) {
      console.log("❌ Error frontend delete:", err);
      alert("Error al desactivar producto");
    }
  };

  const reactivateProduct = async (id) => {
    const confirmReactivate = window.confirm(
      "¿Reactivar producto? Volverá a aparecer en ventas y catálogo con el mismo QR."
    );

    if (!confirmReactivate) return;

    try {
      const response = await fetch(`${API_URL}/api/products/${id}/reactivate`, {
        method: "PUT"
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.sqlMessage ||
            data.message ||
            "No se pudo reactivar el producto"
        );

        return;
      }

      alert("✅ Producto reactivado");

      await loadProducts();
    } catch (err) {
      console.log("❌ Error frontend reactivate:", err);
      alert("Error al reactivar producto");
    }
  };

  return (
    <div className="admin-page">
      <AdminSidebar />

      <main className="admin-content">
        <div className="admin-header-row">
          <div className="admin-header">
            <h1>Productos</h1>

            <p>
              Gestión de inventario rápida con marcas, categorías y colores.
            </p>
          </div>

          <button className="admin-add-btn" onClick={openCreateForm}>
            <Plus size={18} />
            Nuevo
          </button>
        </div>

        <div className="product-mode-buttons">
          <button
            className={
              viewMode === "active"
                ? "product-mode-btn active"
                : "product-mode-btn"
            }
            onClick={() => {
              setViewMode("active");
              setSearch("");
              setShowForm(false);
              resetForm();
            }}
          >
            Activos
          </button>

          <button
            className={
              viewMode === "inactive"
                ? "product-mode-btn active"
                : "product-mode-btn"
            }
            onClick={() => {
              setViewMode("inactive");
              setSearch("");
              setShowForm(false);
              resetForm();
            }}
          >
            Inactivos
          </button>
        </div>

        {showForm && (
          <div className="admin-form-card">
            <div className="admin-form-header">
              <h2>{editingId ? "Editar Producto" : "Nuevo Producto"}</h2>

              <button
                className="admin-close-btn"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                ✕
              </button>
            </div>

            <div className="admin-form-grid">
              <select
                name="Category"
                value={formData.Category}
                onChange={handleChange}
              >
                <option value="">Seleccionar categoría</option>

                {categories.map((category) => (
                  <option key={category.Id} value={category.Name}>
                    {category.Name}
                  </option>
                ))}
              </select>

              <select
                name="Marca"
                value={formData.Marca}
                onChange={handleChange}
              >
                <option value="">Seleccionar marca</option>

                {brands.map((brand) => (
                  <option key={brand.Id} value={brand.Name}>
                    {brand.Name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                name="Modelo"
                placeholder="Modelo"
                value={formData.Modelo}
                onChange={handleChange}
              />

              <select
                name="Color"
                value={formData.Color}
                onChange={handleChange}
              >
                <option value="">Seleccionar color</option>

                {colors.map((color) => (
                  <option key={color.Id} value={color.Name}>
                    {color.Name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                name="Price"
                placeholder="Precio"
                value={formData.Price}
                onChange={handleChange}
              />

              <input
                type="number"
                name="Stock"
                placeholder="Stock"
                value={formData.Stock}
                onChange={handleChange}
              />

              <input type="file" onChange={handleImage} />

              {formData.Image && (
                <div className="product-form-preview">
                  <img src={`${API_URL}${formData.Image}`} alt={formData.Modelo} />
                </div>
              )}

              {editingId && (
                <input
                  type="text"
                  name="ProductQR"
                  placeholder="QR Producto"
                  value={formData.ProductQR}
                  onChange={handleChange}
                  readOnly
                />
              )}

              <button className="admin-save-btn" onClick={saveProduct}>
                {editingId ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        )}

        <div className="products-toolbar">
          <div className="products-search-box">
            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar producto por modelo, marca, color, categoría, QR, stock..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {search && (
              <button
                type="button"
                className="products-clear-search"
                onClick={() => setSearch("")}
              >
                ✕
              </button>
            )}
          </div>

          <div className="products-count-box">
            {filteredProducts.length} de {products.length} productos
          </div>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Modelo</th>
                <th>Marca</th>
                <th>Categoría</th>
                <th>Color</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>QR</th>
                <th>Status</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.Id}>
                  <td data-label="Imagen">
                    {product.Image && (
                      <img
                        src={`${API_URL}${product.Image}`}
                        alt={product.Modelo}
                        className="admin-product-img"
                      />
                    )}
                  </td>

                  <td data-label="Modelo">{product.Modelo}</td>

                  <td data-label="Marca">{product.Marca}</td>

                  <td data-label="Categoría">{product.Category}</td>

                  <td data-label="Color">{product.Color}</td>

                  <td data-label="Precio">
                    ${Number(product.Price || 0).toFixed(2)}
                  </td>

                  <td data-label="Stock">{product.Stock}</td>

                  <td data-label="QR">
                    {product.ProductQR && (
                      <div className="product-qr-box">
                        <QRCodeSVG
                          id={`product-qr-${product.Id}`}
                          value={String(product.ProductQR)}
                          size={90}
                          level="H"
                          includeMargin={true}
                        />

                        <small>{product.ProductQR}</small>

                        <button
                          className="qr-download-btn"
                          onClick={() => downloadProductQR(product)}
                        >
                          <Download size={14} />
                          Descargar
                        </button>
                      </div>
                    )}
                  </td>

                  <td data-label="Status">{product.Status || "Activo"}</td>

                  <td data-label="Acciones">
                    <div className="admin-actions">
                      <button
                        className="edit-btn"
                        onClick={() => editProduct(product)}
                      >
                        <Pencil size={16} />
                      </button>

                      {viewMode === "active" ? (
                        <button
                          className="delete-btn"
                          onClick={() => deleteProduct(product.Id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <button
                          className="edit-btn"
                          onClick={() => reactivateProduct(product.Id)}
                          title="Reactivar producto"
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="10" data-label="Productos">
                    {search
                      ? "No se encontraron productos con esa búsqueda."
                      : viewMode === "active"
                        ? "No hay productos activos."
                        : "No hay productos inactivos."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default ProductsAdmin;