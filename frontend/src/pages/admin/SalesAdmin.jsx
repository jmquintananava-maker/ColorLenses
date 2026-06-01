import { useEffect, useRef, useState } from "react";

import { useParams } from "react-router-dom";

import {
  Trash2,
  Plus,
  Minus,
  ScanLine,
  Search
} from "lucide-react";

import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats
} from "html5-qrcode";

import AdminSidebar from "../../components/AdminSidebar";

import generateTicket from "../../utils/generateTicket";

import sendWhatsApp from "../../utils/sendWhatsApp";

const API_URL =
  import.meta.env.VITE_API_URL;

function SalesAdmin() {
  const { slug } =
    useParams();

  /* =========================
     STATES
  ========================= */

  const [customers, setCustomers] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [selectedCustomer, setSelectedCustomer] =
    useState("");

  const [customerSearch, setCustomerSearch] =
    useState("");

  const [productSearch, setProductSearch] =
    useState("");

  const [cart, setCart] =
    useState([]);

  const [subtotal, setSubtotal] =
    useState(0);

  const [redeemedPoints, setRedeemedPoints] =
    useState(0);

  const [showProductScanner, setShowProductScanner] =
    useState(false);

  const [scannerMessage, setScannerMessage] =
    useState("");

  const [productCameras, setProductCameras] =
    useState([]);

  const [selectedProductCameraId, setSelectedProductCameraId] =
    useState("");

  const [customerHistory, setCustomerHistory] =
    useState([]);

  const [customerPoints, setCustomerPoints] =
    useState(null);

  const [isSaving, setIsSaving] =
    useState(false);

  const productScannerRef =
    useRef(null);

  const productScanProcessingRef =
    useRef(false);

  /* =========================
     LOAD DATA
  ========================= */

  useEffect(() => {
    loadCustomers();
    loadProducts();
  }, [slug]);

  /* =========================
     LOAD CUSTOMER DATA
  ========================= */

  useEffect(() => {
    if (selectedCustomer !== "") {
      loadCustomerHistory(selectedCustomer);
      loadCustomerPoints(selectedCustomer);
    } else {
      setCustomerHistory([]);
      setCustomerPoints(null);
    }

    setRedeemedPoints(0);
  }, [selectedCustomer]);

  /* =========================
     PRODUCT SCANNER
  ========================= */

  useEffect(() => {
    if (!showProductScanner) return;

    loadProductCamerasAndStart();

    return () => {
      stopProductScanner();
    };
  }, [showProductScanner]);

  const loadProductCamerasAndStart = async () => {
    try {
      productScanProcessingRef.current = false;

      const availableCameras =
        await Html5Qrcode.getCameras();

      if (
        !availableCameras ||
        availableCameras.length === 0
      ) {
        setScannerMessage(
          "No se encontró cámara disponible"
        );

        return;
      }

      setProductCameras(availableCameras);

      const backCamera =
        availableCameras.find((camera) =>
          String(camera.label || "")
            .toLowerCase()
            .includes("back")
        ) ||
        availableCameras.find((camera) =>
          String(camera.label || "")
            .toLowerCase()
            .includes("rear")
        ) ||
        availableCameras.find((camera) =>
          String(camera.label || "")
            .toLowerCase()
            .includes("environment")
        );

      const defaultCamera =
        backCamera ||
        availableCameras[
          availableCameras.length - 1
        ];

      setSelectedProductCameraId(
        defaultCamera.id
      );

      await startProductScanner(
        defaultCamera.id
      );
    } catch (err) {
      console.log(
        "❌ Error cargando cámaras producto:",
        err
      );

      setScannerMessage(
        "No se pudo acceder a la cámara. Revisa permisos del navegador."
      );
    }
  };

  const stopProductScanner = async () => {
    try {
      if (productScannerRef.current) {
        await productScannerRef.current
          .stop()
          .catch(() => {});

        productScannerRef.current.clear();

        productScannerRef.current = null;
      }
    } catch (err) {
      console.log(
        "Scanner producto ya estaba detenido:",
        err
      );
    }
  };

  const startProductScanner = async (
    cameraId = null
  ) => {
    try {
      const reader =
        document.getElementById(
          "product-reader"
        );

      if (reader) {
        reader.innerHTML = "";
      }

      await stopProductScanner();

      productScanProcessingRef.current = false;

      const scanner =
        new Html5Qrcode(
          "product-reader",
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

      productScannerRef.current =
        scanner;

      const config = {
        fps: 10,

        qrbox: {
          width:
            window.innerWidth < 768
              ? 260
              : 240,

          height:
            window.innerWidth < 768
              ? 180
              : 180
        },

        aspectRatio: 1.333
      };

      const cameraConfig =
        cameraId
          ? cameraId
          : {
              facingMode: {
                exact: "environment"
              }
            };

      await scanner.start(
        cameraConfig,
        config,

        async (decodedText) => {
          if (
            productScanProcessingRef.current
          ) return;

          productScanProcessingRef.current =
            true;

          const cleanCode =
            String(decodedText || "").trim();

          if (!cleanCode) {
            productScanProcessingRef.current =
              false;

            return;
          }

          setScannerMessage(
            `Leyendo: ${cleanCode}`
          );

          await handleProductScanCode(
            cleanCode
          );
        },

        () => {}
      );
    } catch (err) {
      console.log(
        "❌ Error startProductScanner:",
        err
      );

      if (
        !cameraId &&
        selectedProductCameraId
      ) {
        await startProductScanner(
          selectedProductCameraId
        );

        return;
      }

      setScannerMessage(
        "No se pudo acceder a la cámara principal"
      );
    }
  };

  const changeProductCamera = async (
    cameraId
  ) => {
    setSelectedProductCameraId(
      cameraId
    );

    productScanProcessingRef.current =
      false;

    setScannerMessage(
      "Cambiando cámara..."
    );

    await startProductScanner(
      cameraId
    );

    setScannerMessage("");
  };

  const closeProductScanner = async () => {
    await stopProductScanner();

    productScanProcessingRef.current =
      false;

    setScannerMessage("");

    setShowProductScanner(false);
  };

  const restartProductScanner = () => {
    productScanProcessingRef.current =
      false;

    setTimeout(() => {
      startProductScanner(
        selectedProductCameraId
      );
    }, 800);
  };

  /* =========================
     LOAD CUSTOMERS
  ========================= */

  const loadCustomers = async () => {
    try {
      const response =
        await fetch(
          `${API_URL}/api/customers`
        );

      const data =
        await response.json();

      setCustomers(
        Array.isArray(data)
          ? data
          : []
      );

      if (slug && Array.isArray(data)) {
        const foundCustomer =
          data.find(
            (item) =>
              item.CardSlug
                ?.trim()
                .toLowerCase()
              ===
              slug
                ?.trim()
                .toLowerCase()
          );

        if (foundCustomer) {
          setSelectedCustomer(
            foundCustomer.Id
          );

          setCustomerSearch(
            foundCustomer.FullName || ""
          );
        }
      }
    } catch (err) {
      console.log(
        "❌ Error loadCustomers:",
        err
      );
    }
  };

  /* =========================
     LOAD PRODUCT VARIANTS
  ========================= */

  const loadProducts = async () => {
    try {
      const response =
        await fetch(
          `${API_URL}/api/product-variants`
        );

      const data =
        await response.json();

      const normalized =
        Array.isArray(data)
          ? data.map(normalizeVariant)
          : [];

      setProducts(normalized);
    } catch (err) {
      console.log(
        "❌ Error loadProducts variants:",
        err
      );
    }
  };

  /* =========================
     NORMALIZE VARIANT
  ========================= */

  const normalizeVariant = (item) => {
    const productVariantId =
      item.ProductVariantId ||
      item.ProductVariantID ||
      item.VariantId ||
      item.Id;

    return {
      ...item,

      Id: productVariantId,
      ProductVariantId: productVariantId,
      VariantId: productVariantId,

      ProductId:
        item.ProductId || item.ProductID,

      Modelo:
        item.Modelo || "",

      Marca:
        item.Marca || "",

      Category:
        item.Category || "",

      Color:
        item.Color || "",

      Power:
        item.Power ?? 0,

      PowerLabel:
        item.PowerLabel ||
        (Number(item.Power || 0) === 0
          ? "Sin graduación"
          : Number(item.Power).toFixed(2)),

      Price:
        Number(item.Price || 0),

      Stock:
        Number(item.Stock || 0),

      ScanCode:
        item.ScanCode ||
        item.FactoryCode ||
        item.InternalCode ||
        "",

      ProductQR:
        item.ScanCode ||
        item.FactoryCode ||
        item.InternalCode ||
        "",

      CodeType:
        item.CodeType || "INTERNAL",

      Image:
        item.Image || ""
    };
  };

  /* =========================
     LOAD CUSTOMER POINTS
  ========================= */

  const loadCustomerPoints = async (
    customerId
  ) => {
    try {
      if (!customerId) {
        setCustomerPoints(null);
        return;
      }

      const response =
        await fetch(
          `${API_URL}/api/customers/${customerId}/points`
        );

      const data =
        await response.json();

      if (!response.ok) {
        console.log(
          "❌ Error puntos cliente:",
          data
        );

        setCustomerPoints(null);

        return;
      }

      setCustomerPoints(data);
    } catch (err) {
      console.log(
        "❌ Error loadCustomerPoints:",
        err
      );

      setCustomerPoints(null);
    }
  };

  /* =========================
     LOAD CUSTOMER HISTORY
  ========================= */

  const loadCustomerHistory = async (
    customerId
  ) => {
    try {
      if (!customerId) {
        setCustomerHistory([]);
        return;
      }

      const response =
        await fetch(
          `${API_URL}/api/customers/${customerId}/sales`
        );

      const data =
        await response.json();

      if (Array.isArray(data)) {
        setCustomerHistory(data);
      } else {
        setCustomerHistory([]);
      }
    } catch (err) {
      console.log(
        "❌ Error historial cliente:",
        err
      );

      setCustomerHistory([]);
    }
  };

  /* =========================
     GROUP HISTORY BY SALE
  ========================= */

  const groupedHistory =
    customerHistory.reduce(
      (acc, item) => {
        const saleId =
          item.SaleId;

        if (!acc[saleId]) {
          acc[saleId] = {
            SaleId:
              item.SaleId,

            Total:
              item.Total,

            CreatedAt:
              item.CreatedAt,

            Products: []
          };
        }

        acc[saleId].Products.push({
          Modelo:
            item.Modelo,

          Marca:
            item.Marca,

          Color:
            item.Color,

          PowerLabel:
            item.PowerLabel,

          Image:
            item.Image,

          Quantity:
            item.Quantity,

          Price:
            item.Price,

          Subtotal:
            item.Subtotal
        });

        return acc;
      },
      {}
    );

  const historyList =
    Object.values(
      groupedHistory
    ).sort(
      (a, b) =>
        Number(b.SaleId) -
        Number(a.SaleId)
    );

  /* =========================
     CUSTOMER DATA
  ========================= */

  const customerData =
    customers.find(
      (item) =>
        String(item.Id) ===
        String(selectedCustomer)
    );

  const availablePoints =
    Number(
      customerPoints?.AvailablePoints ??
      customerData?.Points ??
      0
    );

  const pointsExpiringSoon =
    Number(
      customerPoints?.PointsExpiringSoon || 0
    );

  const nextExpirationDate =
    customerPoints?.NextExpirationDate || null;

  const maxRedeemablePoints =
    Math.min(
      availablePoints,
      Math.floor(subtotal)
    );

  const discount =
    Number(redeemedPoints || 0);

  const finalTotal =
    Math.max(
      subtotal - discount,
      0
    );

  /* =========================
     FILTERS
  ========================= */

  const filteredCustomers =
    customers.filter((customer) => {
      const searchText =
        customerSearch
          .toLowerCase()
          .trim();

      if (!searchText) {
        return true;
      }

      return (
        String(customer.FullName || "")
          .toLowerCase()
          .includes(searchText) ||
        String(customer.Phone || "")
          .toLowerCase()
          .includes(searchText) ||
        String(customer.Email || "")
          .toLowerCase()
          .includes(searchText) ||
        String(customer.Level || "")
          .toLowerCase()
          .includes(searchText) ||
        String(customer.Points || "")
          .toLowerCase()
          .includes(searchText) ||
        String(customer.CardSlug || "")
          .toLowerCase()
          .includes(searchText)
      );
    });

  const filteredProducts =
    products.filter((product) => {
      const searchText =
        productSearch
          .toLowerCase()
          .trim();

      if (!searchText) {
        return true;
      }

      return (
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
        String(product.Category || "")
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
        String(product.CodeType || "")
          .toLowerCase()
          .includes(searchText)
      );
    });

  const selectCustomerFromSearch = (customer) => {
    setSelectedCustomer(
      customer.Id
    );

    setCustomerSearch(
      customer.FullName || ""
    );
  };

  const selectProductFromSearch = (product) => {
    addProductToCart(product);

    setProductSearch("");
  };

  /* =========================
     DATE FORMAT
  ========================= */

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "Sin fecha";
    }

    const date =
      new Date(dateValue);

    if (isNaN(date.getTime())) {
      return "Sin fecha";
    }

    return date.toLocaleDateString(
      "es-MX",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }
    );
  };

  const formatExpirationDate = (
    dateValue
  ) => {
    if (!dateValue) {
      return "Sin vencimiento cercano";
    }

    const date =
      new Date(dateValue);

    if (isNaN(date.getTime())) {
      return "Sin vencimiento cercano";
    }

    return date.toLocaleDateString(
      "es-MX",
      {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }
    );
  };

  /* =========================
     CART HELPERS
  ========================= */

  const calculateSubtotal = (
    items
  ) => {
    let sum = 0;

    items.forEach((item) => {
      sum +=
        Number(item.Price)
        *
        Number(item.Quantity);
    });

    setSubtotal(sum);

    setRedeemedPoints((current) => {
      const maxPoints =
        Math.min(
          availablePoints,
          Math.floor(sum)
        );

      return Math.min(
        Number(current || 0),
        maxPoints
      );
    });
  };

  const getProductStock = (product) => {
    return Number(
      product.Stock ?? 0
    );
  };

  const addProductToCart = (
    productRaw
  ) => {
    if (!productRaw) return;

    const product =
      normalizeVariant(productRaw);

    const stock =
      getProductStock(product);

    if (stock <= 0) {
      alert(
        "Este producto no tiene stock disponible"
      );

      return;
    }

    const existing =
      cart.find(
        (item) =>
          String(item.ProductVariantId) ===
          String(product.ProductVariantId)
      );

    let updatedCart = [];

    if (existing) {
      if (
        Number(existing.Quantity) >= stock
      ) {
        alert(
          `No puedes agregar más unidades. Stock disponible: ${stock}`
        );

        return;
      }

      updatedCart =
        cart.map((item) => {
          if (
            String(item.ProductVariantId) ===
            String(product.ProductVariantId)
          ) {
            return {
              ...item,
              Quantity:
                Number(item.Quantity) + 1
            };
          }

          return item;
        });
    } else {
      updatedCart = [
        ...cart,
        {
          ...product,
          Quantity: 1
        }
      ];
    }

    setCart(updatedCart);

    calculateSubtotal(updatedCart);
  };

  const updateCartQuantity = (
    index,
    newQuantity
  ) => {
    const currentItem =
      cart[index];

    if (!currentItem) return;

    const stock =
      getProductStock(currentItem);

    let cleanQuantity =
      Number(newQuantity || 0);

    if (cleanQuantity <= 0) {
      removeProduct(index);
      return;
    }

    if (cleanQuantity > stock) {
      cleanQuantity =
        stock;

      alert(
        `Stock máximo disponible: ${stock}`
      );
    }

    const updatedCart =
      cart.map((item, itemIndex) => {
        if (itemIndex === index) {
          return {
            ...item,
            Quantity: cleanQuantity
          };
        }

        return item;
      });

    setCart(updatedCart);

    calculateSubtotal(updatedCart);
  };

  const increaseProductQuantity = (
    index
  ) => {
    const item =
      cart[index];

    if (!item) return;

    updateCartQuantity(
      index,
      Number(item.Quantity) + 1
    );
  };

  const decreaseProductQuantity = (
    index
  ) => {
    const item =
      cart[index];

    if (!item) return;

    updateCartQuantity(
      index,
      Number(item.Quantity) - 1
    );
  };

  const removeProduct = (
    index
  ) => {
    const updatedCart =
      cart.filter(
        (_, i) =>
          i !== index
      );

    setCart(updatedCart);

    calculateSubtotal(updatedCart);
  };

  /* =========================
     HANDLE PRODUCT SCAN
  ========================= */

  const handleProductScanCode = async (
    code
  ) => {
    try {
      setScannerMessage(
        `Leyendo: ${code}`
      );

      const response =
        await fetch(
          `${API_URL}/api/products/qr/${encodeURIComponent(code)}`
        );

      const data =
        await response.json();

      if (!response.ok) {
        setScannerMessage(
          data.message ||
          "Producto no encontrado"
        );

        alert(
          data.message ||
          "Producto no encontrado"
        );

        restartProductScanner();

        return;
      }

      const product =
        normalizeVariant(data);

      addProductToCart(product);

      setScannerMessage(
        `✅ Agregado: ${product.Marca} ${product.Modelo} ${product.Color} ${product.PowerLabel}`
      );

      await stopProductScanner();

      setTimeout(() => {
        setShowProductScanner(false);
        setScannerMessage("");
      }, 500);
    } catch (err) {
      console.log(
        "❌ Error scan product:",
        err
      );

      setScannerMessage(
        "Error al escanear producto"
      );

      alert(
        "Error al escanear producto"
      );

      restartProductScanner();
    }
  };

  /* =========================
     HANDLE REDEEM POINTS
  ========================= */

  const handleRedeemPoints = (value) => {
    let points =
      Number(value || 0);

    if (points < 0) {
      points = 0;
    }

    if (points > maxRedeemablePoints) {
      points = maxRedeemablePoints;
    }

    setRedeemedPoints(
      Math.floor(points)
    );
  };

  const redeemAllPoints = () => {
    setRedeemedPoints(
      maxRedeemablePoints
    );
  };

  const clearRedeemPoints = () => {
    setRedeemedPoints(0);
  };

  /* =========================
     CALCULATE POINTS
  ========================= */

  const calculatePoints = () => {
    if (!customerData) return 0;

    const level =
      customerData.Level || "Silver";

    if (level === "Silver") {
      return Math.floor(
        finalTotal / 50
      );
    }

    if (level === "Gold") {
      return Math.floor(
        finalTotal / 30
      );
    }

    if (level === "Black") {
      return Math.floor(
        finalTotal / 10
      );
    }

    return Math.floor(
      finalTotal / 50
    );
  };

  /* =========================
     REGISTER SALE
  ========================= */

  const registerSale = async () => {
    if (isSaving) return;

    if (!selectedCustomer) {
      alert(
        "Selecciona un cliente"
      );

      return;
    }

    if (cart.length === 0) {
      alert(
        "Escanea o agrega productos"
      );

      return;
    }

    if (redeemedPoints > maxRedeemablePoints) {
      alert(
        "Los puntos canjeados superan el máximo permitido"
      );

      return;
    }

    if (discount !== redeemedPoints) {
      alert(
        "El descuento debe coincidir con los puntos canjeados."
      );

      return;
    }

    for (const item of cart) {
      const stock =
        getProductStock(item);

      if (
        Number(item.Quantity) > stock
      ) {
        alert(
          `Stock insuficiente para ${item.Modelo}. Disponible: ${stock}`
        );

        return;
      }

      if (!item.ProductVariantId || !item.ProductId) {
        alert(
          "Hay una variante inválida en el carrito. Elimina el producto y vuelve a escanearlo."
        );

        return;
      }
    }

    const payload = {
      CustomerId:
        selectedCustomer,

      Subtotal:
        Number(subtotal),

      Discount:
        Number(discount),

      RedeemedPoints:
        Number(redeemedPoints),

      Total:
        Number(finalTotal),

      Cart:
        cart.map((item) => ({
          ProductVariantId:
            item.ProductVariantId,

          VariantId:
            item.ProductVariantId,

          Id:
            item.ProductVariantId,

          ProductId:
            item.ProductId,

          Modelo:
            item.Modelo,

          Marca:
            item.Marca,

          Color:
            item.Color,

          Power:
            item.Power,

          PowerLabel:
            item.PowerLabel,

          Price:
            Number(item.Price),

          Stock:
            Number(item.Stock),

          Quantity:
            Number(item.Quantity),

          ScanCode:
            item.ScanCode,

          CodeType:
            item.CodeType,

          Image:
            item.Image
        }))
    };

    try {
      setIsSaving(true);

      const response =
        await fetch(
          `${API_URL}/api/sales`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(payload)
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.message ||
          data.sqlMessage ||
          "Error al registrar venta"
        );

        setIsSaving(false);

        return;
      }

      const pointsEarned =
        Number(
          data.PointsEarned ??
          calculatePoints()
        );

      generateTicket(
        customerData,
        cart,
        finalTotal,
        pointsEarned
      );

      sendWhatsApp(
        customerData,
        cart,
        finalTotal,
        pointsEarned
      );

      alert(
        `✅ Venta registrada
🧾 Ticket #${data.SaleId}
💰 Subtotal: $${Number(subtotal).toFixed(2)}
🎁 Puntos canjeados: ${redeemedPoints}
💸 Descuento: $${Number(discount).toFixed(2)}
💵 Total pagado: $${Number(finalTotal).toFixed(2)}
⭐ ${pointsEarned} puntos generados para próxima compra
⏳ Los nuevos puntos vencen en 1 año`
      );

      setCart([]);
      setSubtotal(0);
      setRedeemedPoints(0);
      setProductSearch("");

      await loadCustomers();
      await loadProducts();

      await loadCustomerHistory(
        selectedCustomer
      );

      await loadCustomerPoints(
        selectedCustomer
      );

      setIsSaving(false);
    } catch (err) {
      console.log(err);

      alert(
        "Error al registrar venta"
      );

      setIsSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <AdminSidebar />

      <main className="admin-content">
        {/* HEADER */}

        <div className="admin-header-row">
          <div className="admin-header">
            <h1>
              Ventas
            </h1>

            <p>
              Busca cliente, escanea códigos de barras/QR y registra una venta.
            </p>
          </div>

          <button
            className="admin-add-btn"
            onClick={() =>
              setShowProductScanner(true)
            }
          >
            <ScanLine size={18} />
            Escanear Producto
          </button>
        </div>

        {/* CUSTOMER */}

        <div className="admin-form-card">
          <h2>
            Cliente
          </h2>

          <div className="sales-customer-search-box">
            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar cliente por nombre, teléfono, correo o nivel..."
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(
                  e.target.value
                );

                if (selectedCustomer) {
                  const selected =
                    customers.find(
                      (item) =>
                        String(item.Id) ===
                        String(selectedCustomer)
                    );

                  if (
                    selected &&
                    e.target.value !== selected.FullName
                  ) {
                    setSelectedCustomer("");
                  }
                }
              }}
            />

            {customerSearch && (
              <button
                type="button"
                onClick={() => {
                  setCustomerSearch("");
                  setSelectedCustomer("");
                }}
              >
                ✕
              </button>
            )}
          </div>

          {!customerData && customerSearch && (
            <div className="sales-customer-results">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.slice(0, 8).map((customer) => (
                  <button
                    type="button"
                    key={customer.Id}
                    className="sales-customer-result-card"
                    onClick={() =>
                      selectCustomerFromSearch(customer)
                    }
                  >
                    <div>
                      <h4>
                        {customer.FullName}
                      </h4>

                      <p>
                        {customer.Phone || "Sin teléfono"}
                        {" "}
                        ·
                        {" "}
                        {customer.Email || "Sin correo"}
                      </p>
                    </div>

                    <span>
                      {customer.Level || "Silver"}
                    </span>
                  </button>
                ))
              ) : (
                <div className="sales-customer-empty">
                  No se encontraron clientes.
                </div>
              )}
            </div>
          )}

          {!customerData && !customerSearch && (
            <div className="sales-customer-empty">
              Escribe para buscar y seleccionar un cliente.
            </div>
          )}

          {customerData && (
            <div className="sale-customer-card points-expiration-card selected-sale-customer">
              <div className="selected-sale-customer-header">
                <div>
                  <h3>
                    {customerData.FullName}
                  </h3>

                  <p>
                    {customerData.Phone || "Sin teléfono"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer("");
                    setCustomerSearch("");
                  }}
                >
                  Cambiar
                </button>
              </div>

              <p>
                ⭐ Nivel:
                {" "}
                {customerData.Level || "Silver"}
              </p>

              <p>
                🎁 Puntos vigentes:
                {" "}
                <strong>
                  {availablePoints}
                </strong>
              </p>

              <p>
                ⏳ Próximo vencimiento:
                {" "}
                <strong>
                  {formatExpirationDate(
                    nextExpirationDate
                  )}
                </strong>
              </p>

              {pointsExpiringSoon > 0 && (
                <div className="points-warning-box">
                  ⚠️
                  {" "}
                  {pointsExpiringSoon}
                  {" "}
                  puntos vencen en los próximos 30 días.
                </div>
              )}
            </div>
          )}
        </div>

        {/* PRODUCT SCANNER */}

        {showProductScanner && (
          <div className="admin-form-card">
            <div className="admin-form-header">
              <h2>
                Escanear Producto
              </h2>

              <button
                className="admin-close-btn"
                onClick={closeProductScanner}
              >
                ✕
              </button>
            </div>

            <p>
              Escanea el código de barras, QR de fábrica o QR interno.
            </p>

            {productCameras.length > 1 && (
              <div className="camera-select-box">
                <label>
                  Cámara
                </label>

                <select
                  value={selectedProductCameraId}
                  onChange={(e) =>
                    changeProductCamera(
                      e.target.value
                    )
                  }
                >
                  {productCameras.map(
                    (camera, index) => (
                      <option
                        key={camera.id}
                        value={camera.id}
                      >
                        {camera.label ||
                          `Cámara ${index + 1}`}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            <div
              id="product-reader"
              className="qr-reader"
            ></div>

            {scannerMessage && (
              <div className="scanner-message">
                {scannerMessage}
              </div>
            )}
          </div>
        )}

        {/* PRODUCT MANUAL */}

        <div className="admin-form-card">
          <h2>
            Producto
          </h2>

          <p>
            Puedes escanear el código o buscar la variante manualmente.
          </p>

          <div className="sales-product-search-box">
            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar por modelo, marca, color, graduación, código..."
              value={productSearch}
              onChange={(e) =>
                setProductSearch(
                  e.target.value
                )
              }
            />

            {productSearch && (
              <button
                type="button"
                onClick={() =>
                  setProductSearch("")
                }
              >
                ✕
              </button>
            )}
          </div>

          {productSearch && (
            <div className="sales-product-results">
              {filteredProducts.length > 0 ? (
                filteredProducts.slice(0, 12).map((product) => (
                  <button
                    type="button"
                    key={product.ProductVariantId}
                    className="sales-product-result-card"
                    onClick={() =>
                      selectProductFromSearch(product)
                    }
                  >
                    <div className="sales-product-result-left">
                      {product.Image ? (
                        <img
                          src={`${API_URL}${product.Image}`}
                          alt={product.Modelo}
                        />
                      ) : (
                        <div className="sales-product-result-placeholder">
                          Sin imagen
                        </div>
                      )}

                      <div>
                        <h4>
                          {product.Marca}
                          {" "}
                          {product.Modelo}
                        </h4>

                        <p>
                          {product.Color || "Sin color"}
                          {" "}
                          ·
                          {" "}
                          {product.PowerLabel || "Sin graduación"}
                          {" "}
                          ·
                          Stock:
                          {" "}
                          {product.Stock}
                        </p>

                        <small>
                          Código:
                          {" "}
                          {product.ScanCode || "Sin código"}
                          {" "}
                          ·
                          {" "}
                          {product.CodeType || "INTERNAL"}
                        </small>
                      </div>
                    </div>

                    <span>
                      $
                      {Number(product.Price || 0).toFixed(2)}
                    </span>
                  </button>
                ))
              ) : (
                <div className="sales-product-empty">
                  No se encontraron productos.
                </div>
              )}
            </div>
          )}

          {!productSearch && (
            <div className="sales-product-empty">
              Escribe para buscar y agregar una variante.
            </div>
          )}
        </div>

        {/* CART */}

        <div className="admin-form-card">
          <h2>
            Venta
          </h2>

          {cart.length === 0 && (
            <p>
              No hay productos agregados.
            </p>
          )}

          {cart.map((item, index) => (
            <div
              key={item.ProductVariantId}
              className="sale-item sale-item-with-image"
            >
              <div className="sale-product-left">
                {item.Image ? (
                  <img
                    className="sale-product-image"
                    src={`${API_URL}${item.Image}`}
                    alt={item.Modelo}
                  />
                ) : (
                  <div className="sale-product-image-placeholder">
                    Sin imagen
                  </div>
                )}

                <div className="sale-product-info">
                  <strong>
                    {item.Marca}
                    {" "}
                    {item.Modelo}
                  </strong>

                  <p>
                    Color:
                    {" "}
                    {item.Color || "Sin color"}
                  </p>

                  <p>
                    Graduación:
                    {" "}
                    {item.PowerLabel || "Sin graduación"}
                  </p>

                  <p>
                    Precio:
                    {" "}
                    $
                    {Number(item.Price).toFixed(2)}
                  </p>

                  <p>
                    Stock disponible:
                    {" "}
                    {item.Stock}
                  </p>

                  <p>
                    Código:
                    {" "}
                    {item.ScanCode || "Sin código"}
                  </p>

                  <div className="sale-quantity-controls">
                    <button
                      type="button"
                      onClick={() =>
                        decreaseProductQuantity(index)
                      }
                    >
                      <Minus size={15} />
                    </button>

                    <input
                      type="number"
                      min="1"
                      max={item.Stock}
                      value={item.Quantity}
                      onChange={(e) =>
                        updateCartQuantity(
                          index,
                          e.target.value
                        )
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        increaseProductQuantity(index)
                      }
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              </div>

              <button
                className="delete-btn"
                onClick={() =>
                  removeProduct(index)
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {/* POINTS REDEMPTION */}

          {customerData && cart.length > 0 && (
            <div className="points-redemption-card">
              <h3>
                🎁 Canjear puntos
              </h3>

              <p>
                1 punto = $1 MXN de descuento.
              </p>

              <p>
                Puntos vigentes disponibles:
                {" "}
                <strong>
                  {availablePoints}
                </strong>
              </p>

              <p>
                Máximo canjeable:
                {" "}
                <strong>
                  {maxRedeemablePoints}
                </strong>
              </p>

              {nextExpirationDate && (
                <p>
                  Próximo vencimiento:
                  {" "}
                  <strong>
                    {formatExpirationDate(
                      nextExpirationDate
                    )}
                  </strong>
                </p>
              )}

              {pointsExpiringSoon > 0 && (
                <div className="points-warning-box">
                  ⚠️ Se recomienda usar primero los
                  {" "}
                  {pointsExpiringSoon}
                  {" "}
                  puntos próximos a vencer.
                </div>
              )}

              <input
                type="number"
                min="0"
                max={maxRedeemablePoints}
                value={redeemedPoints}
                onChange={(e) =>
                  handleRedeemPoints(
                    e.target.value
                  )
                }
                placeholder="Puntos a canjear"
              />

              <div className="points-redemption-actions">
                <button
                  type="button"
                  onClick={redeemAllPoints}
                >
                  Usar máximo
                </button>

                <button
                  type="button"
                  onClick={clearRedeemPoints}
                >
                  Limpiar
                </button>
              </div>
            </div>
          )}

          <div className="sale-total">
            <h2>
              Subtotal:
            </h2>

            <h1>
              $
              {Number(subtotal).toFixed(2)}
            </h1>
          </div>

          {redeemedPoints > 0 && (
            <div className="sale-total">
              <h2>
                Descuento:
              </h2>

              <h1>
                -$
                {Number(discount).toFixed(2)}
              </h1>
            </div>
          )}

          <div className="sale-total final-sale-total">
            <h2>
              Total a pagar:
            </h2>

            <h1>
              $
              {Number(finalTotal).toFixed(2)}
            </h1>
          </div>

          <div className="sale-points">
            ⭐ Puntos para próxima compra:
            {" "}
            {calculatePoints()}

            <br />

            <small>
              Estos puntos vencerán 1 año después de la compra.
            </small>
          </div>

          <button
            className="admin-save-btn"
            onClick={registerSale}
            disabled={isSaving}
          >
            {isSaving
              ? "Registrando..."
              : "Registrar Venta"}
          </button>
        </div>

        {/* CUSTOMER HISTORY */}

        {customerData && (
          <div className="admin-form-card customer-history-card">
            <h2>
              🧾 Historial de compras
            </h2>

            {historyList.length === 0 && (
              <p>
                Este cliente todavía no tiene compras registradas.
              </p>
            )}

            {historyList.map((sale) => (
              <div
                key={sale.SaleId}
                className="history-sale-item"
              >
                <div className="history-sale-header">
                  <div>
                    <h3>
                      Venta #{sale.SaleId}
                    </h3>

                    <p>
                      {formatDate(
                        sale.CreatedAt
                      )}
                    </p>
                  </div>

                  <strong>
                    $
                    {Number(
                      sale.Total || 0
                    ).toFixed(2)}
                  </strong>
                </div>

                <div className="history-products-list">
                  {sale.Products.map(
                    (product, index) => (
                      <div
                        key={index}
                        className="history-product-item"
                      >
                        {product.Image && (
                          <img
                            src={`${API_URL}${product.Image}`}
                            alt={product.Modelo}
                          />
                        )}

                        <div>
                          <h4>
                            {product.Modelo}
                          </h4>

                          <p>
                            {product.Marca}
                            {" "}
                            -
                            {" "}
                            {product.Color}
                            {" "}
                            -
                            {" "}
                            {product.PowerLabel || "Sin graduación"}
                          </p>

                          <p>
                            Cantidad:
                            {" "}
                            {product.Quantity}
                            {" "}
                            |
                            {" "}
                            $
                            {Number(
                              product.Price || 0
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default SalesAdmin;