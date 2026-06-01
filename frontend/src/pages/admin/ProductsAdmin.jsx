import { useEffect, useMemo, useRef, useState } from "react";

import { QRCodeSVG } from "qrcode.react";

import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats
} from "html5-qrcode";

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
  const [powers, setPowers] = useState([]);

  const [viewMode, setViewMode] = useState("active");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);

  const [imageFile, setImageFile] = useState(null);

  const [showCodeScanner, setShowCodeScanner] = useState(false);
  const [scannerMessage, setScannerMessage] = useState("");
  const [scannerCameras, setScannerCameras] = useState([]);
  const [selectedScannerCameraId, setSelectedScannerCameraId] = useState("");

  const codeScannerRef = useRef(null);
  const codeScannerProcessingRef = useRef(false);

  const [formData, setFormData] = useState({
    SKU: "",
    Category: "",
    Marca: "",
    Modelo: "",
    Description: "",
    Image: "",

    Color: "",
    Power: "0.00",
    PowerLabel: "Sin graduación",
    Price: "",
    Stock: "",

    CodeMode: "FACTORY",
    CodeType: "BARCODE",
    FactoryCode: "",
    InternalCode: "",
    ScanCode: ""
  });

  useEffect(() => {
    loadProducts();
  }, [viewMode]);

  useEffect(() => {
    loadSettingsOptions();
  }, []);

  useEffect(() => {
    return () => {
      stopCodeScanner();
    };
  }, []);

  const loadSettingsOptions = async () => {
    try {
      const [
        brandsRes,
        categoriesRes,
        colorsRes,
        powersRes
      ] = await Promise.all([
        fetch(`${API_URL}/api/settings/brands`),
        fetch(`${API_URL}/api/settings/categories`),
        fetch(`${API_URL}/api/settings/colors`),
        fetch(`${API_URL}/api/powers`)
      ]);

      const brandsData = await brandsRes.json();
      const categoriesData = await categoriesRes.json();
      const colorsData = await colorsRes.json();
      const powersData = await powersRes.json();

      setBrands(Array.isArray(brandsData) ? brandsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setColors(Array.isArray(colorsData) ? colorsData : []);
      setPowers(Array.isArray(powersData) ? powersData : []);
    } catch (err) {
      console.log("❌ Error cargando opciones:", err);
    }
  };

  const loadProducts = async () => {
    try {
      const endpoint =
        viewMode === "active"
          ? `${API_URL}/api/product-variants`
          : `${API_URL}/api/product-variants-inactive`;

      const response = await fetch(endpoint);
      const data = await response.json();

      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("❌ Error cargando variantes:", err);
    }
  };

  const filteredProducts = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) return products;

    return products.filter((product) => {
      return (
        String(product.ProductVariantId || product.Id || "")
          .toLowerCase()
          .includes(searchText) ||
        String(product.ProductId || "")
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
        String(product.PowerLabel || "")
          .toLowerCase()
          .includes(searchText) ||
        String(product.Power || "")
          .toLowerCase()
          .includes(searchText) ||
        String(product.Price || "")
          .toLowerCase()
          .includes(searchText) ||
        String(product.Stock || "")
          .toLowerCase()
          .includes(searchText) ||
        String(product.ScanCode || "")
          .toLowerCase()
          .includes(searchText) ||
        String(product.FactoryCode || "")
          .toLowerCase()
          .includes(searchText) ||
        String(product.InternalCode || "")
          .toLowerCase()
          .includes(searchText) ||
        String(product.CodeType || "")
          .toLowerCase()
          .includes(searchText) ||
        String(product.Status || "")
          .toLowerCase()
          .includes(searchText)
      );
    });
  }, [products, search]);

  const getPowerLabel = (powerValue) => {
    const cleanPower = Number(powerValue || 0);

    if (cleanPower === 0) {
      return "Sin graduación";
    }

    const foundPower = powers.find(
      (item) => Number(item.Power) === cleanPower
    );

    if (foundPower) {
      return foundPower.PowerLabel;
    }

    return cleanPower.toFixed(2);
  };

  const getSuggestedPrice = (powerValue) => {
    const cleanPower = Number(powerValue || 0);
    const cleanBrand = String(formData.Marca || "").toLowerCase();

    if (cleanBrand.includes("urban") && cleanPower === 0) {
      return 350;
    }

    if (cleanBrand.includes("urban") && cleanPower !== 0) {
      return 700;
    }

    return formData.Price;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "Power") {
      const nextPowerLabel = getPowerLabel(value);

      setFormData((prev) => ({
        ...prev,
        Power: value,
        PowerLabel: nextPowerLabel,
        Price:
          prev.Marca &&
          String(prev.Marca).toLowerCase().includes("urban")
            ? getSuggestedPrice(value)
            : prev.Price
      }));

      return;
    }

    if (name === "Marca") {
      const cleanPower = Number(formData.Power || 0);

      setFormData((prev) => ({
        ...prev,
        Marca: value,
        Price:
          String(value || "").toLowerCase().includes("urban")
            ? cleanPower === 0
              ? 350
              : 700
            : prev.Price
      }));

      return;
    }

    if (name === "CodeMode") {
      if (value === "INTERNAL") {
        setFormData((prev) => ({
          ...prev,
          CodeMode: value,
          CodeType: "INTERNAL",
          FactoryCode: "",
          ScanCode: ""
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          CodeMode: value,
          CodeType: "BARCODE",
          InternalCode: "",
          ScanCode: prev.FactoryCode || ""
        }));
      }

      return;
    }

    if (name === "FactoryCode") {
      setFormData((prev) => ({
        ...prev,
        FactoryCode: value,
        ScanCode: value
      }));

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
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
      Description: "",
      Image: "",

      Color: "",
      Power: "0.00",
      PowerLabel: "Sin graduación",
      Price: "",
      Stock: "",

      CodeMode: "FACTORY",
      CodeType: "BARCODE",
      FactoryCode: "",
      InternalCode: "",
      ScanCode: ""
    });

    setEditingVariantId(null);
    setEditingProductId(null);
    setImageFile(null);
    setShowCodeScanner(false);
    setScannerMessage("");
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const validateForm = () => {
    if (!formData.Category) {
      alert("Selecciona una categoría");
      return false;
    }

    if (!formData.Marca) {
      alert("Selecciona una marca");
      return false;
    }

    if (!formData.Modelo.trim()) {
      alert("Escribe el modelo");
      return false;
    }

    if (!formData.Color) {
      alert("Selecciona un color");
      return false;
    }

    if (formData.Price === "" || Number(formData.Price) <= 0) {
      alert("Escribe un precio válido");
      return false;
    }

    if (formData.Stock === "" || Number(formData.Stock) < 0) {
      alert("Escribe un stock válido");
      return false;
    }

    if (
      formData.CodeMode === "FACTORY" &&
      !String(formData.FactoryCode || "").trim()
    ) {
      alert("Escanea o escribe el código de fábrica");
      return false;
    }

    return true;
  };

  const uploadImageIfNeeded = async () => {
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
        throw new Error(
          uploadResult.message || "No se pudo subir la imagen"
        );
      }

      imageUrl = uploadResult.imageUrl;
    }

    return imageUrl;
  };

  const saveProduct = async () => {
    try {
      if (!validateForm()) return;

      const imageUrl = await uploadImageIfNeeded();

      const productPayload = {
        SKU: formData.SKU || "",
        Category: formData.Category || "",
        Marca: formData.Marca || "",
        Modelo: formData.Modelo || "",
        Description: formData.Description || "",
        Image: imageUrl || ""
      };

      let productId = editingProductId;

      if (editingVariantId && editingProductId) {
        const productResponse = await fetch(
          `${API_URL}/api/products/${editingProductId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              ...productPayload,
              Status: "Activo"
            })
          }
        );

        const productData = await productResponse.json();

        if (!productResponse.ok) {
          alert(
            productData.sqlMessage ||
              productData.message ||
              "No se pudo actualizar el producto base"
          );

          return;
        }
      } else {
        const productResponse = await fetch(`${API_URL}/api/products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(productPayload)
        });

        const productData = await productResponse.json();

        if (!productResponse.ok) {
          alert(
            productData.sqlMessage ||
              productData.message ||
              "No se pudo crear el producto base"
          );

          return;
        }

        productId = productData.ProductId;
      }

      if (!productId) {
        alert("No se pudo obtener el ProductId");
        return;
      }

      const cleanPower = Number(formData.Power || 0);
      const cleanPowerLabel =
        cleanPower === 0
          ? "Sin graduación"
          : formData.PowerLabel || cleanPower.toFixed(2);

      const isInternal = formData.CodeMode === "INTERNAL";

      const factoryCode = isInternal
        ? ""
        : String(formData.FactoryCode || "").trim();

      const internalCode = isInternal
        ? String(formData.InternalCode || "").trim()
        : "";

      const scanCode = isInternal
        ? internalCode
        : factoryCode;

      const variantPayload = {
        ProductId: productId,
        Color: formData.Color || "",
        Power: cleanPower,
        PowerLabel: cleanPowerLabel,
        Price: Number(formData.Price || 0),
        Stock: Number(formData.Stock || 0),
        FactoryCode: factoryCode,
        InternalCode: internalCode,
        ScanCode: scanCode,
        CodeType: isInternal ? "INTERNAL" : formData.CodeType || "BARCODE",
        Status: "Activo"
      };

      const variantUrl = editingVariantId
        ? `${API_URL}/api/product-variants/${editingVariantId}`
        : `${API_URL}/api/product-variants`;

      const variantMethod = editingVariantId ? "PUT" : "POST";

      const variantResponse = await fetch(variantUrl, {
        method: variantMethod,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(variantPayload)
      });

      const variantData = await variantResponse.json();

      if (!variantResponse.ok) {
        alert(
          variantData.sqlMessage ||
            variantData.message ||
            "No se pudo guardar la variante"
        );

        return;
      }

      await loadProducts();

      resetForm();
      setShowForm(false);

      alert(
        editingVariantId
          ? "✅ Variante actualizada"
          : "✅ Producto y variante creados"
      );
    } catch (err) {
      console.log("❌ Error save product:", err);
      alert(err.message || "Error al guardar producto");
    }
  };

  const editProduct = (product) => {
    const variantId =
      product.ProductVariantId || product.Id;

    setEditingVariantId(variantId);
    setEditingProductId(product.ProductId);

    const cleanPower = Number(product.Power || 0);
    const isInternal = product.CodeType === "INTERNAL";

    setFormData({
      SKU: product.SKU || "",
      Category: product.Category || "",
      Marca: product.Marca || "",
      Modelo: product.Modelo || "",
      Description: product.Description || "",
      Image: product.Image || "",

      Color: product.Color || "",
      Power: cleanPower.toFixed(2),
      PowerLabel:
        product.PowerLabel ||
        (cleanPower === 0 ? "Sin graduación" : cleanPower.toFixed(2)),
      Price: product.Price || "",
      Stock: product.Stock || "",

      CodeMode: isInternal ? "INTERNAL" : "FACTORY",
      CodeType: product.CodeType || (isInternal ? "INTERNAL" : "BARCODE"),
      FactoryCode: product.FactoryCode || "",
      InternalCode: product.InternalCode || "",
      ScanCode:
        product.ScanCode ||
        product.FactoryCode ||
        product.InternalCode ||
        ""
    });

    setImageFile(null);
    setScannerMessage("");
    setShowCodeScanner(false);
    setShowForm(true);
  };

  const stopCodeScanner = async () => {
    try {
      if (codeScannerRef.current) {
        await codeScannerRef.current
          .stop()
          .catch(() => {});

        codeScannerRef.current.clear();

        codeScannerRef.current = null;
      }
    } catch (err) {
      console.log("Scanner ya estaba detenido:", err);
    }
  };

  const startCodeScanner = async (cameraId = null) => {
    try {
      const reader = document.getElementById("product-code-reader");

      if (reader) {
        reader.innerHTML = "";
      }

      await stopCodeScanner();

      codeScannerProcessingRef.current = false;

      const scanner = new Html5Qrcode(
        "product-code-reader",
        {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.DATA_MATRIX
          ]
        }
      );

      codeScannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: {
          width:
            window.innerWidth < 768
              ? 260
              : 280,
          height:
            window.innerWidth < 768
              ? 180
              : 180
        },
        aspectRatio: 1.333
      };

      await scanner.start(
        cameraId,
        config,
        async (decodedText) => {
          if (codeScannerProcessingRef.current) return;

          codeScannerProcessingRef.current = true;

          const cleanCode = String(decodedText || "").trim();

          if (!cleanCode) {
            codeScannerProcessingRef.current = false;
            return;
          }

          setFormData((prev) => ({
            ...prev,
            CodeMode: "FACTORY",
            CodeType: cleanCode.length >= 8 ? "BARCODE" : "QR",
            FactoryCode: cleanCode,
            ScanCode: cleanCode
          }));

          setScannerMessage(`✅ Código leído: ${cleanCode}`);

          await stopCodeScanner();

          setTimeout(() => {
            setShowCodeScanner(false);
            setScannerMessage("");
          }, 600);
        },
        () => {}
      );
    } catch (err) {
      console.log("❌ Error startCodeScanner:", err);
      setScannerMessage("No se pudo acceder a la cámara");
    }
  };

  const openCodeScanner = async () => {
    try {
      setShowCodeScanner(true);
      setScannerMessage("Cargando cámara...");

      const cameras = await Html5Qrcode.getCameras();

      if (!cameras || cameras.length === 0) {
        setScannerMessage("No se encontró cámara disponible");
        return;
      }

      setScannerCameras(cameras);

      const backCamera =
        cameras.find((camera) =>
          String(camera.label || "").toLowerCase().includes("back")
        ) ||
        cameras.find((camera) =>
          String(camera.label || "").toLowerCase().includes("rear")
        ) ||
        cameras.find((camera) =>
          String(camera.label || "").toLowerCase().includes("environment")
        ) ||
        cameras[cameras.length - 1];

      setSelectedScannerCameraId(backCamera.id);

      setTimeout(() => {
        startCodeScanner(backCamera.id);
      }, 300);
    } catch (err) {
      console.log("❌ Error openCodeScanner:", err);
      setScannerMessage("No se pudo abrir el escáner");
    }
  };

  const changeCodeScannerCamera = async (cameraId) => {
    setSelectedScannerCameraId(cameraId);
    setScannerMessage("Cambiando cámara...");

    await startCodeScanner(cameraId);

    setScannerMessage("");
  };

  const closeCodeScanner = async () => {
    await stopCodeScanner();

    codeScannerProcessingRef.current = false;

    setScannerMessage("");
    setShowCodeScanner(false);
  };

  const downloadProductQR = (product) => {
    try {
      const scanCode =
        product.ScanCode ||
        product.FactoryCode ||
        product.InternalCode;

      if (!scanCode) {
        alert("Esta variante no tiene código escaneable.");
        return;
      }

      const variantId =
        product.ProductVariantId || product.Id;

      const svgElement = document.getElementById(
        `product-qr-${variantId}`
      );

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

        const canvasSize = 700;
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
        ctx.font = "bold 30px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
          `${product.Marca || ""} ${product.Modelo || ""}`,
          canvasSize / 2,
          510
        );

        ctx.font = "24px Arial";

        ctx.fillText(
          `${product.Color || ""} ${product.PowerLabel || ""}`,
          canvasSize / 2,
          550
        );

        ctx.font = "bold 22px Arial";

        ctx.fillText(
          String(scanCode),
          canvasSize / 2,
          600
        );

        const pngUrl = canvas.toDataURL("image/png");

        const link = document.createElement("a");

        const cleanName = `${product.Marca || ""}-${product.Modelo || ""}-${product.Color || ""}-${product.PowerLabel || ""}`
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9-_]/g, "");

        link.download = `${scanCode}-${cleanName}.png`;
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
      "¿Desactivar esta variante? Ya no aparecerá en ventas, pero se conservará en el historial."
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(
        `${API_URL}/api/product-variants/${id}`,
        {
          method: "DELETE"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.sqlMessage ||
            data.message ||
            "No se pudo desactivar la variante"
        );

        return;
      }

      alert("✅ Variante desactivada");

      await loadProducts();
    } catch (err) {
      console.log("❌ Error frontend delete:", err);
      alert("Error al desactivar variante");
    }
  };

  const reactivateProduct = async (id) => {
    const confirmReactivate = window.confirm(
      "¿Reactivar esta variante? Volverá a aparecer en ventas."
    );

    if (!confirmReactivate) return;

    try {
      const response = await fetch(
        `${API_URL}/api/product-variants/${id}/reactivate`,
        {
          method: "PUT"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.sqlMessage ||
            data.message ||
            "No se pudo reactivar la variante"
        );

        return;
      }

      alert("✅ Variante reactivada");

      await loadProducts();
    } catch (err) {
      console.log("❌ Error frontend reactivate:", err);
      alert("Error al reactivar variante");
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
              Gestiona productos base, variantes, graduación, stock y códigos escaneables.
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
              <h2>
                {editingVariantId
                  ? "Editar Variante"
                  : "Nuevo Producto + Variante"}
              </h2>

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

            <h3 className="product-form-section-title">
              Producto base
            </h3>

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

             

              <input
                type="file"
                onChange={handleImage}
              />

              {formData.Image && (
                <div className="product-form-preview">
                  <img
                    src={`${API_URL}${formData.Image}`}
                    alt={formData.Modelo}
                  />
                </div>
              )}
            </div>

            <h3 className="product-form-section-title">
              Variante vendible
            </h3>

            <div className="admin-form-grid">
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

              <select
                name="Power"
                value={formData.Power}
                onChange={handleChange}
              >
                {powers.map((power) => (
                  <option
                    key={power.Id}
                    value={Number(power.Power).toFixed(2)}
                  >
                    {power.PowerLabel}
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
            </div>

            <h3 className="product-form-section-title">
              Código escaneable
            </h3>

            <div className="admin-form-grid">
              <select
                name="CodeMode"
                value={formData.CodeMode}
                onChange={handleChange}
              >
                <option value="FACTORY">
                  Usar código de fábrica
                </option>

                <option value="INTERNAL">
                  Generar código interno
                </option>
              </select>

              {formData.CodeMode === "FACTORY" && (
                <>
                  <select
                    name="CodeType"
                    value={formData.CodeType}
                    onChange={handleChange}
                  >
                    <option value="BARCODE">
                      Código de barras
                    </option>

                    <option value="QR">
                      QR de fábrica
                    </option>
                  </select>

                  <div className="factory-code-row">
                    <input
                      type="text"
                      name="FactoryCode"
                      placeholder="Escanea o escribe el código de la caja"
                      value={formData.FactoryCode}
                      onChange={handleChange}
                    />

                    <button
                      type="button"
                      className="admin-save-btn"
                      onClick={openCodeScanner}
                    >
                      📷 Escanear
                    </button>
                  </div>
                </>
              )}

              {formData.CodeMode === "INTERNAL" && (
                <div className="sales-product-empty">
                  El sistema generará un código interno automáticamente al guardar.
                </div>
              )}

              {formData.ScanCode && (
                <input
                  type="text"
                  name="ScanCode"
                  placeholder="Código escaneable"
                  value={formData.ScanCode}
                  readOnly
                />
              )}

              {showCodeScanner && (
                <div className="product-code-scanner-card">
                  <div className="admin-form-header">
                    <h3>Escanear código de producto</h3>

                    <button
                      type="button"
                      className="admin-close-btn"
                      onClick={closeCodeScanner}
                    >
                      ✕
                    </button>
                  </div>

                  {scannerCameras.length > 1 && (
                    <div className="camera-select-box">
                      <label>Cámara</label>

                      <select
                        value={selectedScannerCameraId}
                        onChange={(e) =>
                          changeCodeScannerCamera(e.target.value)
                        }
                      >
                        {scannerCameras.map((camera, index) => (
                          <option key={camera.id} value={camera.id}>
                            {camera.label || `Cámara ${index + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div
                    id="product-code-reader"
                    className="qr-reader"
                  ></div>

                  {scannerMessage && (
                    <div className="scanner-message">
                      {scannerMessage}
                    </div>
                  )}
                </div>
              )}

              <button className="admin-save-btn" onClick={saveProduct}>
                {editingVariantId ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        )}

        <div className="products-toolbar">
          <div className="products-search-box">
            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar por modelo, marca, color, graduación, código, stock..."
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
            {filteredProducts.length} de {products.length} variantes
          </div>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Producto</th>
                <th>Marca</th>
                <th>Categoría</th>
                <th>Color</th>
                <th>Graduación</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Código</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => {
                const variantId =
                  product.ProductVariantId || product.Id;

                const scanCode =
                  product.ScanCode ||
                  product.FactoryCode ||
                  product.InternalCode ||
                  "";

                return (
                  <tr key={variantId}>
                    <td data-label="Imagen">
                      {product.Image && (
                        <img
                          src={`${API_URL}${product.Image}`}
                          alt={product.Modelo}
                          className="admin-product-img"
                        />
                      )}
                    </td>

                    <td data-label="Producto">
                      {product.Modelo}
                    </td>

                    <td data-label="Marca">
                      {product.Marca}
                    </td>

                    <td data-label="Categoría">
                      {product.Category}
                    </td>

                    <td data-label="Color">
                      {product.Color}
                    </td>

                    <td data-label="Graduación">
                      {product.PowerLabel || "Sin graduación"}
                    </td>

                    <td data-label="Precio">
                      ${Number(product.Price || 0).toFixed(2)}
                    </td>

                    <td data-label="Stock">
                      {product.Stock}
                    </td>

                    <td data-label="Código">
                      {scanCode ? (
                        <div className="product-qr-box">
                          <QRCodeSVG
                            id={`product-qr-${variantId}`}
                            value={String(scanCode)}
                            size={90}
                            level="H"
                            includeMargin={true}
                          />

                          <small>{scanCode}</small>

                          <button
                            className="qr-download-btn"
                            onClick={() => downloadProductQR(product)}
                          >
                            <Download size={14} />
                            Descargar QR
                          </button>
                        </div>
                      ) : (
                        "Sin código"
                      )}
                    </td>

                    <td data-label="Tipo">
                      {product.CodeType || "INTERNAL"}
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
                            onClick={() => deleteProduct(variantId)}
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button
                            className="edit-btn"
                            onClick={() => reactivateProduct(variantId)}
                            title="Reactivar variante"
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="12" data-label="Productos">
                    {search
                      ? "No se encontraron variantes con esa búsqueda."
                      : viewMode === "active"
                        ? "No hay variantes activas."
                        : "No hay variantes inactivas."}
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