import { useEffect, useState }
from "react";

import {

  ResponsiveContainer,

  AreaChart,

  Area,

  XAxis,

  YAxis,

  Tooltip

} from "recharts";

import AdminSidebar
from "../../components/AdminSidebar";

const API_URL =
  import.meta.env.VITE_API_URL;

function DashboardAdmin() {

  /* =========================
     STATES
  ========================= */

  const [stats, setStats] =
    useState({

      TotalSales: 0,

      TotalRevenue: 0,

      TotalCustomers: 0,

      TotalProducts: 0,

      LowStock: 0

    });

  const [recentSales, setRecentSales] =
    useState([]);

  const [allSales, setAllSales] =
    useState([]);

  const [chartData, setChartData] =
    useState([]);

  const [chartPeriod, setChartPeriod] =
    useState("daily");

  const [topCustomers, setTopCustomers] =
    useState([]);

  const [topProducts, setTopProducts] =
    useState([]);

  const [lowStockProducts, setLowStockProducts] =
    useState([]);

  /* =========================
     LOAD DATA
  ========================= */

  useEffect(() => {

    loadStats();

    loadRecentSales();

    loadAllSales();

    loadTopCustomers();

    loadTopProducts();

    loadLowStockProducts();

  }, []);

  useEffect(() => {

    loadChart(chartPeriod);

  }, [chartPeriod]);

  /* =========================
     FORMAT DATE
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
     LOAD STATS
  ========================= */

  const loadStats = async () => {

    try {

      const response =
        await fetch(

          `${API_URL}/api/dashboard/stats`

        );

      const data =
        await response.json();

      setStats(data);

    } catch (err) {

      console.log(err);

    }

  };

  /* =========================
     LOAD RECENT SALES
  ========================= */

  const loadRecentSales = async () => {

    try {

      const response =
        await fetch(

          `${API_URL}/api/dashboard/recent-sales`

        );

      const data =
        await response.json();

      setRecentSales(data);

    } catch (err) {

      console.log(err);

    }

  };

  /* =========================
     LOAD ALL SALES
  ========================= */

  const loadAllSales = async () => {

    try {

      const response =
        await fetch(

          `${API_URL}/api/sales`

        );

      const data =
        await response.json();

      setAllSales(data);

    } catch (err) {

      console.log(err);

    }

  };

  /* =========================
     LOAD CHART
  ========================= */

  const loadChart = async (
    period = "daily"
  ) => {

    try {

      const response =
        await fetch(

          `${API_URL}/api/dashboard/sales-chart/${period}`

        );

      const data =
        await response.json();

      const formatted =

        data.map((item) => ({

          date:
            item.LabelDate,

          sales:
            Number(
              item.TotalSales || 0
            )

        }));

      setChartData(formatted);

    } catch (err) {

      console.log(err);

    }

  };

  /* =========================
     CHART TITLE
  ========================= */

  const chartTitle = {

    daily:
      "📈 Ventas por Día",

    weekly:
      "📆 Ventas por Semana",

    monthly:
      "🗓️ Ventas por Mes",

    yearly:
      "📊 Ventas por Año"

  };

  /* =========================
     LOAD TOP CUSTOMERS
  ========================= */

  const loadTopCustomers = async () => {

    try {

      const response =
        await fetch(

          `${API_URL}/api/dashboard/top-customers`

        );

      const data =
        await response.json();

      setTopCustomers(data);

    } catch (err) {

      console.log(err);

    }

  };

  /* =========================
     LOAD TOP PRODUCTS
  ========================= */

  const loadTopProducts = async () => {

    try {

      const response =
        await fetch(

          `${API_URL}/api/dashboard/top-products`

        );

      const data =
        await response.json();

      setTopProducts(data);

    } catch (err) {

      console.log(err);

    }

  };

  /* =========================
     LOAD LOW STOCK PRODUCTS
  ========================= */

  const loadLowStockProducts = async () => {

    try {

      const response =
        await fetch(

          `${API_URL}/api/dashboard/low-stock-products`

        );

      const data =
        await response.json();

      setLowStockProducts(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (err) {

      console.log(err);

    }

  };

  return (

    <div className="admin-page">

      <AdminSidebar />

      <main className="admin-content">

        {/* HEADER */}

        <div className="admin-header">

          <h1>
            Dashboard
          </h1>

          <p>
            Analytics del sistema
          </p>

        </div>

        {/* =========================
            STATS
        ========================= */}

        <div className="stats-grid">

          <div className="stat-card">

            <h3>
              🛒 Ventas
            </h3>

            <h1>
              {stats.TotalSales}
            </h1>

          </div>

          <div className="stat-card">

            <h3>
              💰 Ingresos
            </h3>

            <h1>

              $

              {Number(

                stats.TotalRevenue || 0

              ).toFixed(2)}

            </h1>

          </div>

          <div className="stat-card">

            <h3>
              👥 Clientes
            </h3>

            <h1>
              {stats.TotalCustomers}
            </h1>

          </div>

          <div className="stat-card">

            <h3>
              📦 Productos
            </h3>

            <h1>
              {stats.TotalProducts}
            </h1>

          </div>

          <div className="stat-card low-stock">

            <h3>
              ⚠️ Stock Bajo
            </h3>

            <h1>
              {stats.LowStock}
            </h1>

          </div>

        </div>

        {/* =========================
            LOW STOCK ALERTS
        ========================= */}

        <div className="low-stock-card">

          <div className="low-stock-header">

            <div>

              <h2>
                ⚠️ Stock Crítico
              </h2>

              <p>
                Productos activos con 5 piezas o menos.
              </p>

            </div>

            <button

              className="low-stock-btn"

              onClick={() =>
                window.location.href =
                  "/admin/products"
              }

            >

              Ir a productos

            </button>

          </div>

          {lowStockProducts.length === 0 && (

            <div className="low-stock-empty">

              ✅ Todo bien, no hay productos con stock crítico.

            </div>

          )}

          <div className="low-stock-list">

            {lowStockProducts.map((product) => (

              <div

                key={product.Id}

                className={
                  Number(product.Stock) === 0

                    ? "low-stock-item critical"

                    : "low-stock-item"
                }

              >

                <div className="low-stock-left">

                  {product.Image && (

                    <img

                      src={`${API_URL}${product.Image}`}

                      alt={product.Modelo}

                    />

                  )}

                  <div>

                    <h3>
                      {product.Modelo}
                    </h3>

                    <p>
                      {product.Marca}
                      {" "}
                      -
                      {" "}
                      {product.Color}
                    </p>

                    <small>
                      SKU:
                      {" "}
                      {product.SKU || "N/A"}
                    </small>

                  </div>

                </div>

                <div className="low-stock-right">

                  <span>
                    {product.Stock}
                  </span>

                  <p>
                    piezas
                  </p>

                </div>

              </div>

            ))}

          </div>

        </div>

        {/* =========================
            CHART
        ========================= */}

        <div className="chart-card">

          <div className="chart-header dashboard-chart-header">

            <div>

              <h2>
                {chartTitle[chartPeriod]}
              </h2>

              <p>
                Comparativa de ingresos por periodo
              </p>

            </div>

            <div className="chart-period-buttons">

              <button

                className={
                  chartPeriod === "daily"
                    ? "chart-period-btn active"
                    : "chart-period-btn"
                }

                onClick={() =>
                  setChartPeriod("daily")
                }

              >

                Día

              </button>

              <button

                className={
                  chartPeriod === "weekly"
                    ? "chart-period-btn active"
                    : "chart-period-btn"
                }

                onClick={() =>
                  setChartPeriod("weekly")
                }

              >

                Semana

              </button>

              <button

                className={
                  chartPeriod === "monthly"
                    ? "chart-period-btn active"
                    : "chart-period-btn"
                }

                onClick={() =>
                  setChartPeriod("monthly")
                }

              >

                Mes

              </button>

              <button

                className={
                  chartPeriod === "yearly"
                    ? "chart-period-btn active"
                    : "chart-period-btn"
                }

                onClick={() =>
                  setChartPeriod("yearly")
                }

              >

                Año

              </button>

            </div>

          </div>

          <ResponsiveContainer
            width="100%"
            height={320}
          >

            <AreaChart
              data={chartData}
            >

              <XAxis
                dataKey="date"
              />

              <YAxis />

              <Tooltip />

              <Area

                type="monotone"

                dataKey="sales"

                stroke="#ff4fa3"

                fill="#ffd3ea"

              />

            </AreaChart>

          </ResponsiveContainer>

        </div>

        {/* =========================
            QUICK ACTIONS
        ========================= */}

        <div className="dashboard-actions">

          <button
            className="dashboard-btn"
            onClick={() =>
              window.location.href =
              "/admin/products"
            }
          >

            ➕ Nuevo Producto

          </button>

          <button
            className="dashboard-btn"
            onClick={() =>
              window.location.href =
              "/admin/customers"
            }
          >

            👤 Nuevo Cliente

          </button>

          <button
            className="dashboard-btn"
            onClick={() =>
              window.location.href =
              "/admin/sales"
            }
          >

            🛒 Registrar Venta

          </button>

          <button
            className="dashboard-btn"
            onClick={() =>
              window.location.href =
              "/admin/scan"
            }
          >

            📷 Escanear QR

          </button>

        </div>

        {/* =========================
            RECENT SALES
        ========================= */}

        <div className="recent-sales-card">

          <div className="recent-sales-header">

            <h2>
              📈 Últimas Ventas
            </h2>

          </div>

          <div className="recent-sales-list">

            {recentSales.map((sale) => (

              <div

                key={sale.Id}

                className="recent-sale-item"

              >

                <div>

                  <h3>
                    {sale.FullName}
                  </h3>

                  <p>
                    {formatDate(
                      sale.CreatedAt
                    )}
                  </p>

                </div>

                <h2>

                  $

                  {Number(

                    sale.Total || 0

                  ).toFixed(2)}

                </h2>

              </div>

            ))}

          </div>

        </div>

        {/* =========================
            GENERAL SALES TABLE
        ========================= */}

       

        {/* =========================
            TOP CUSTOMERS
        ========================= */}

        <div className="top-customers-card">

          <div className="top-customers-header">

            <h2>
              👑 Top Clientes
            </h2>

          </div>

          <div className="top-customers-list">

            {topCustomers.map(

              (customer, index) => (

                <div

                  key={index}

                  className="top-customer-item"

                >

                  <div>

                    <h3>

                      #{index + 1}
                      {" "}
                      {customer.FullName}

                    </h3>

                    <p>

                      📦
                      {" "}
                      {customer.Visits}
                      {" "}
                      compras

                    </p>

                    <p>

                      ⭐
                      {" "}
                      {customer.Level}

                    </p>

                  </div>

                  <div
                    className="top-customer-right"
                  >

                    <h2>

                      $

                      {Number(

                        customer.TotalSpent || 0

                      ).toFixed(2)}

                    </h2>

                    <p>

                      🎁
                      {" "}
                      {customer.Points}
                      {" "}
                      pts

                    </p>

                  </div>

                </div>

              )

            )}

          </div>

        </div>

        {/* =========================
            TOP PRODUCTS
        ========================= */}

        <div className="top-products-card">

          <div className="top-products-header">

            <h2>
              📦 Top Productos
            </h2>

          </div>

          <div className="top-products-list">

            {topProducts.map(

              (product, index) => (

                <div

                  key={index}

                  className="top-product-item"

                >

                  <div
                    className="top-product-left"
                  >

                    {product.Image && (

                      <img

                        src={`${API_URL}${product.Image}`}

                        alt={product.Modelo}

                      />

                    )}

                    <div>

                      <h3>

                        #{index + 1}
                        {" "}
                        {product.Modelo}

                      </h3>

                      <p>

                        🔥
                        {" "}
                        {product.TotalSold}
                        {" "}
                        vendidos

                      </p>

                      <p>

                        📦 Stock:
                        {" "}
                        {product.Stock}

                      </p>

                    </div>

                  </div>

                  <div
                    className="top-product-right"
                  >

                    <h2>

                      $

                      {Number(

                        product.Revenue || 0

                      ).toFixed(2)}

                    </h2>

                  </div>

                </div>

              )

            )}

          </div>

        </div>

      </main>

    </div>

  );

}

export default DashboardAdmin;