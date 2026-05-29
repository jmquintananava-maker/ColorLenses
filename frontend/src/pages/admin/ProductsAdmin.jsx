import { useEffect, useState } from "react";

import { QRCodeSVG } from "qrcode.react";

import {
  Pencil,
  Trash2,
  Plus,
  RotateCcw,
  Download
} from "lucide-react";

import AdminSidebar from "../../components/AdminSidebar";

const API_URL = import.meta.env.VITE_API_URL;

function ProductsAdmin() {
  /* =========================
     STATES
  ========================= */

  const [products, setProducts] = useState([]);

  const [viewMode, setViewMode] = useState("active");

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

  /* =========================
     LOAD
  ========================= */

  useEffect(() => {
    loadProducts();
  }, [viewMode]);

  /* =========================
     LOAD PRODUCTS
  ========================= */

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
      console.log(err);
    }
  };

  /* =========================
     HANDLE CHANGE
  ========================= */

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  /* =========================
     HANDLE IMAGE
  ========================= */

  const handleImage = (e) => {
    setImageFile(e.target.files[0]);
  };

  /* =========================
     RESET FORM
  ========================= */

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

  /* =========================
     SAVE PRODUCT
  ========================= */

  const saveProduct = async () => {
    try {
      let imageUrl = formData.Image;

      if (imageFile) {
        const uploadData = new FormData();

        uploadData.append("image", imageFile);

        const uploadResponse = await fetch(
          `${API_URL}/api/upload`,
          {
            method: "POST",
            body: uploadData
          }
        );

        const uploadResult =
          await uploadResponse.json();

        imageUrl = uploadResult.imageUrl;
      }

      const payload = {
        ...formData,
        Image: imageUrl
      };

      if (!editingId) {
        await fetch(
          `${API_URL}/api/products`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          }
        );
      } else {
        await fetch(
          `${API_URL}/api/products/${editingId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          }
        );
      }

      await loadProducts();

      resetForm();

      setShowForm(false);
    } catch (err) {
      console.log(err);
    }
  };

  /* =========================
     EDIT
  ========================= */

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
      ProductQR:
        product.ProductQR ||
        `PRODUCT-${product.Id}`
    });

    setShowForm(true);
  };

  /* =========================
     DOWNLOAD QR PNG
  ========================= */

  const downloadProductQR = (product) => {
    try {
      if (!product.ProductQR) {
        alert("Este producto no tiene QR.");
        return;
      }

      const svgElement =
        document.getElementById(
          `product-qr-${product.Id}`
        );

      if (!svgElement) {
        alert("No se encontró el QR para descargar.");
        return;
      }

      const serializer =
        new XMLSerializer();

      const svgString =
        serializer.serializeToString(svgElement);

      const svgBlob =
        new Blob([svgString], {
          type: "image/svg+xml;charset=utf-8"
        });

      const url =
        URL.createObjectURL(svgBlob);

      const image =
        new Image();

      image.onload = () => {
        const canvas =
          document.createElement("canvas");

        const canvasSize = 600;
        const qrSize = 430;

        canvas.width = canvasSize;
        canvas.height = canvasSize;

        const ctx =
          canvas.getContext("2d");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        const qrX =
          (canvasSize - qrSize) / 2;

        const qrY = 45;

        ctx.drawImage(
          image,
          qrX,
          qrY,
          qrSize,
          qrSize
        );

        ctx.fillStyle = "#111111";
        ctx.font = "bold 34px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
          product.ProductQR,
          canvasSize / 2,
          535
        );

        const pngUrl =
          canvas.toDataURL("image/png");

        const link =
          document.createElement("a");

        const cleanName =
          product.Modelo
            ? product.Modelo
                .replace(/\s+/g, "-")
                .replace(/[^a-zA-Z0-9-_]/g, "")
            : "producto";

        link.download =
          `${product.ProductQR}-${cleanName}.png`;

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

  /* =========================
     DESACTIVATE PRODUCT
  ========================= */

  const deleteProduct = async (id) => {
    const confirmDelete = window.confirm(
      "¿Desactivar producto? Ya no aparecerá en ventas ni catálogo, pero se conservará en el historial."
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(
        `${API_URL}/api/products/${id}`,
        {
          method: "DELETE"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.log("❌ Error al desactivar:", data);

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

  /* =========================
     REACTIVATE PRODUCT
  ========================= */

  const reactivateProduct = async (id) => {
    const confirmReactivate = window.confirm(
      "¿Reactivar producto? Volverá a aparecer en ventas y catálogo con el mismo QR."
    );

    if (!confirmReactivate) return;

    try {
      const response = await fetch(
        `${API_URL}/api/products/${id}/reactivate`,
        {
          method: "PUT"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.log("❌ Error al reactivar:", data);

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
        {/* HEADER */}

        <div className="admin-header-row">
          <div className="admin-header">
            <h1>Productos</h1>

            <p>
              Gestión de inventario
            </p>
          </div>

          <button
            className="admin-add-btn"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus size={18} />
            Nuevo
          </button>
        </div>

        {/* VIEW MODE */}

        <div className="product-mode-buttons">
          <button
            className={
              viewMode === "active"
                ? "product-mode-btn active"
                : "product-mode-btn"
            }
            onClick={() => {
              setViewMode("active");
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
              setShowForm(false);
              resetForm();
            }}
          >
            Inactivos
          </button>
        </div>

        {/* FORM */}

        {showForm && (
          <div className="admin-form-card">
            <div className="admin-form-header">
              <h2>
                {editingId
                  ? "Editar Producto"
                  : "Nuevo Producto"}
              </h2>

              <button
                className="admin-close-btn"
                onClick={() => setShowForm(false)}
              >
                ✕
              </button>
            </div>

            <div className="admin-form-grid">
              <input
                type="text"
                name="SKU"
                placeholder="SKU"
                value={formData.SKU}
                onChange={handleChange}
              />

              <input
                type="text"
                name="Category"
                placeholder="Categoría"
                value={formData.Category}
                onChange={handleChange}
              />

              <input
                type="text"
                name="Marca"
                placeholder="Marca"
                value={formData.Marca}
                onChange={handleChange}
              />

              <input
                type="text"
                name="Modelo"
                placeholder="Modelo"
                value={formData.Modelo}
                onChange={handleChange}
              />

              <input
                type="text"
                name="Color"
                placeholder="Color"
                value={formData.Color}
                onChange={handleChange}
              />

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

              <input
                type="file"
                onChange={handleImage}
              />

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

              <textarea
                name="Description"
                placeholder="Descripción"
                value={formData.Description}
                onChange={handleChange}
              ></textarea>

              <button
                className="admin-save-btn"
                onClick={saveProduct}
              >
                {editingId
                  ? "Actualizar"
                  : "Guardar"}
              </button>
            </div>
          </div>
        )}

        {/* TABLE */}

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Modelo</th>
                <th>Marca</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>QR</th>
                <th>Status</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => (
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

                  <td data-label="Modelo">
                    {product.Modelo}
                  </td>

                  <td data-label="Marca">
                    {product.Marca}
                  </td>

                  <td data-label="Precio">
                    $
                    {Number(
                      product.Price || 0
                    ).toFixed(2)}
                  </td>

                  <td data-label="Stock">
                    {product.Stock}
                  </td>

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

                        <small>
                          {product.ProductQR}
                        </small>

                        <button
                          className="qr-download-btn"
                          onClick={() =>
                            downloadProductQR(product)
                          }
                        >
                          <Download size={14} />
                          Descargar
                        </button>
                      </div>
                    )}
                  </td>

                  <td data-label="Status">
                    {product.Status || "Activo"}
                  </td>

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
                          onClick={() =>
                            deleteProduct(product.Id)
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <button
                          className="edit-btn"
                          onClick={() =>
                            reactivateProduct(product.Id)
                          }
                          title="Reactivar producto"
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {products.length === 0 && (
                <tr>
                  <td
                    colSpan="8"
                    data-label="Productos"
                  >
                    {viewMode === "active"
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