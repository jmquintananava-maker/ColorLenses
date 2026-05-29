import { useEffect, useState } from "react";

import { useParams } from "react-router-dom";

import {
  Trash2,
  Plus,
  ScanLine
} from "lucide-react";

import {
  Html5Qrcode
} from "html5-qrcode";

import AdminSidebar
from "../../components/AdminSidebar";

import generateTicket
from "../../utils/generateTicket";

import sendWhatsApp
from "../../utils/sendWhatsApp";

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

  const [selectedProduct, setSelectedProduct] =
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

  const [customerHistory, setCustomerHistory] =
    useState([]);

  /* =========================
     LOAD DATA
  ========================= */

  useEffect(() => {

    loadCustomers();

    loadProducts();

  }, [slug]);

  /* =========================
     LOAD CUSTOMER HISTORY
  ========================= */

  useEffect(() => {

    if (selectedCustomer !== "") {

      loadCustomerHistory(
        selectedCustomer
      );

    } else {

      setCustomerHistory([]);

    }

    setRedeemedPoints(0);

  }, [selectedCustomer]);

  /* =========================
     PRODUCT SCANNER
  ========================= */

  useEffect(() => {

    if (!showProductScanner)
      return;

    let scanner = null;

    const startScanner =
      async () => {

        try {

          const reader =
            document.getElementById(
              "product-reader"
            );

          if (reader) {

            reader.innerHTML = "";

          }

          scanner =
            new Html5Qrcode(
              "product-reader"
            );

          const cameras =
            await Html5Qrcode.getCameras();

          if (
            cameras &&
            cameras.length > 0
          ) {

            await scanner.start(

              cameras[0].id,

              {
                fps: 10,

                qrbox: {
                  width: 220,
                  height: 220
                }
              },

              async (decodedText) => {

                await handleProductQR(
                  decodedText
                );

              },

              () => {}

            );

          }

        } catch (err) {

          console.log(err);

          setScannerMessage(
            "No se pudo abrir la cámara"
          );

        }

      };

    startScanner();

    return () => {

      if (scanner) {

        scanner
          .stop()
          .then(() => {

            scanner.clear();

          })
          .catch(() => {});

      }

    };

  }, [showProductScanner]);

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

      setCustomers(data);

      if (slug) {

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

        }

      }

    } catch (err) {

      console.log(err);

    }

  };

  /* =========================
     LOAD PRODUCTS
  ========================= */

  const loadProducts = async () => {

    try {

      const response =
        await fetch(
          `${API_URL}/api/products`
        );

      const data =
        await response.json();

      setProducts(data);

    } catch (err) {

      console.log(err);

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
        Number(b.SaleId) - Number(a.SaleId)
    );

  /* =========================
     CUSTOMER DATA
  ========================= */

  const customerData =
    customers.find(

      (item) =>
        item.Id == selectedCustomer

    );

  const availablePoints =
    Number(
      customerData?.Points || 0
    );

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

  /* =========================
     ADD PRODUCT TO CART
  ========================= */

  const addProductToCart = (
    product
  ) => {

    if (!product)
      return;

    const existing =
      cart.find(

        (item) =>
          item.Id == product.Id

      );

    let updatedCart = [];

    if (existing) {

      updatedCart =
        cart.map((item) => {

          if (
            item.Id == product.Id
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

  /* =========================
     ADD MANUAL PRODUCT
  ========================= */

  const addManualProduct = () => {

    const product =
      products.find(

        (item) =>
          item.Id == selectedProduct

      );

    if (!product)
      return;

    addProductToCart(product);

    setSelectedProduct("");

  };

  /* =========================
     HANDLE PRODUCT QR
  ========================= */

  const handleProductQR = async (
    code
  ) => {

    try {

      setScannerMessage(
        `Leyendo: ${code}`
      );

      const response =
        await fetch(
          `${API_URL}/api/products/qr/${code}`
        );

      if (!response.ok) {

        setScannerMessage(
          "Producto no encontrado"
        );

        return;

      }

      const product =
        await response.json();

      addProductToCart(product);

      setScannerMessage(
        `✅ Agregado: ${product.Modelo}`
      );

      setShowProductScanner(false);

    } catch (err) {

      console.log(err);

      setScannerMessage(
        "Error al escanear producto"
      );

    }

  };

  /* =========================
     CALCULATE SUBTOTAL
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

  /* =========================
     REMOVE PRODUCT
  ========================= */

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
     HANDLE REDEEM POINTS
  ========================= */

  const handleRedeemPoints = (value) => {

    let points =
      Number(value || 0);

    if (points < 0) {

      points = 0;

    }

    if (points > maxRedeemablePoints) {

      points =
        maxRedeemablePoints;

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
     Nuevos puntos para próxima compra
  ========================= */

  const calculatePoints = () => {

    if (!customerData)
      return 0;

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

    const payload = {

      CustomerId:
        selectedCustomer,

      Subtotal:
        subtotal,

      Discount:
        discount,

      RedeemedPoints:
        redeemedPoints,

      Total:
        finalTotal,

      Cart:
        cart

    };

    try {

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
          "Error al registrar venta"
        );

        return;

      }

      generateTicket(

        customerData,

        cart,

        finalTotal,

        calculatePoints()

      );

      sendWhatsApp(

        customerData,

        cart,

        finalTotal,

        calculatePoints()

      );

      alert(

        `✅ Venta registrada
🧾 Ticket #${data.SaleId}
💰 Subtotal: $${Number(subtotal).toFixed(2)}
🎁 Puntos canjeados: ${redeemedPoints}
💸 Descuento: $${Number(discount).toFixed(2)}
💵 Total pagado: $${Number(finalTotal).toFixed(2)}
⭐ ${calculatePoints()} puntos generados para próxima compra`

      );

      setCart([]);

      setSubtotal(0);

      setRedeemedPoints(0);

      setSelectedProduct("");

      loadCustomers();

      loadProducts();

      loadCustomerHistory(
        selectedCustomer
      );

    } catch (err) {

      console.log(err);

      alert(
        "Error al registrar venta"
      );

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
              Escanea cliente y productos para registrar una venta.
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

          <select

            value={selectedCustomer}

            onChange={(e) =>
              setSelectedCustomer(
                e.target.value
              )
            }

          >

            <option value="">
              Seleccionar Cliente
            </option>

            {customers.map((customer) => (

              <option

                key={customer.Id}

                value={customer.Id}

              >

                {customer.FullName}
                {" - "}
                {customer.Level || "Silver"}

              </option>

            ))}

          </select>

          {customerData && (

            <div className="sale-customer-card">

              <h3>
                {customerData.FullName}
              </h3>

              <p>
                ⭐ Nivel:
                {" "}
                {customerData.Level || "Silver"}
              </p>

              <p>
                🎁 Puntos disponibles:
                {" "}
                {availablePoints}
              </p>

              <p>
                💰 Gastado:
                {" "}
                $
                {Number(
                  customerData.TotalSpent || 0
                ).toFixed(2)}
              </p>

              <p>
                📦 Visitas:
                {" "}
                {customerData.Visits || 0}
              </p>

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

                onClick={() =>
                  setShowProductScanner(false)
                }

              >

                ✕

              </button>

            </div>

            <p>
              Escanea el QR del producto.
            </p>

            <div
              id="product-reader"
              className="qr-reader"
            ></div>

            {scannerMessage && (

              <p className="sale-points">

                {scannerMessage}

              </p>

            )}

          </div>

        )}

        {/* PRODUCT MANUAL */}

        <div className="admin-form-card">

          <h2>
            Producto
          </h2>

          <p>
            Puedes escanear el QR o agregarlo manualmente.
          </p>

          <div className="sales-add-row">

            <select

              value={selectedProduct}

              onChange={(e) =>
                setSelectedProduct(
                  e.target.value
                )
              }

            >

              <option value="">
                Seleccionar producto
              </option>

              {products.map((product) => (

                <option

                  key={product.Id}

                  value={product.Id}

                >

                  {product.Modelo}
                  {" - $"}
                  {product.Price}
                  {" - Stock: "}
                  {product.Stock}

                </option>

              ))}

            </select>

            <button

              className="admin-save-btn"

              onClick={addManualProduct}

            >

              <Plus size={18} />

              Agregar

            </button>

          </div>

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

              key={index}

              className="sale-item"

            >

              <div>

                <strong>
                  {item.Modelo}
                </strong>

                <p>
                  Cantidad:
                  {" "}
                  {item.Quantity}
                </p>

                <p>
                  Precio:
                  {" "}
                  $
                  {Number(
                    item.Price
                  ).toFixed(2)}
                </p>

                <p>
                  QR:
                  {" "}
                  {item.ProductQR}
                </p>

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
                Puntos disponibles:
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

          </div>

          <button

            className="admin-save-btn"

            onClick={registerSale}

          >

            Registrar Venta

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