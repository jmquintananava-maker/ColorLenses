import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { apiFetch as fetch } from "../../utils/api.js";
import { useEffect, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import AdminSidebar from "../../components/AdminSidebar.js";
const API_URL = ("" || "");
function DashboardAdmin() {
    /* =========================
       STATES
    ========================= */
    const [stats, setStats] = useState({
        TotalSales: 0,
        TotalRevenue: 0,
        TotalCustomers: 0,
        TotalProducts: 0,
        LowStock: 0
    });
    const [recentSales, setRecentSales] = useState([]);
    const [allSales, setAllSales] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [chartPeriod, setChartPeriod] = useState("daily");
    const [topCustomers, setTopCustomers] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [lowStockProducts, setLowStockProducts] = useState([]);
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
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) {
            return "Sin fecha";
        }
        return date.toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    };
    /* =========================
       LOAD STATS
    ========================= */
    const loadStats = async () => {
        try {
            const response = await fetch(`${API_URL}/api/dashboard/stats`);
            const data = await response.json();
            setStats(data);
        }
        catch (err) {
            console.log(err);
        }
    };
    /* =========================
       LOAD RECENT SALES
    ========================= */
    const loadRecentSales = async () => {
        try {
            const response = await fetch(`${API_URL}/api/dashboard/recent-sales`);
            const data = await response.json();
            setRecentSales(data);
        }
        catch (err) {
            console.log(err);
        }
    };
    /* =========================
       LOAD ALL SALES
    ========================= */
    const loadAllSales = async () => {
        try {
            const response = await fetch(`${API_URL}/api/sales`);
            const data = await response.json();
            setAllSales(data);
        }
        catch (err) {
            console.log(err);
        }
    };
    /* =========================
       LOAD CHART
    ========================= */
    const loadChart = async (period = "daily") => {
        try {
            const response = await fetch(`${API_URL}/api/dashboard/sales-chart/${period}`);
            const data = await response.json();
            const formatted = data.map((item) => ({
                date: item.LabelDate,
                sales: Number(item.TotalSales || 0)
            }));
            setChartData(formatted);
        }
        catch (err) {
            console.log(err);
        }
    };
    /* =========================
       CHART TITLE
    ========================= */
    const chartTitle = {
        daily: "📈 Ventas por Día",
        weekly: "📆 Ventas por Semana",
        monthly: "🗓️ Ventas por Mes",
        yearly: "📊 Ventas por Año"
    };
    /* =========================
       LOAD TOP CUSTOMERS
    ========================= */
    const loadTopCustomers = async () => {
        try {
            const response = await fetch(`${API_URL}/api/dashboard/top-customers`);
            const data = await response.json();
            setTopCustomers(data);
        }
        catch (err) {
            console.log(err);
        }
    };
    /* =========================
       LOAD TOP PRODUCTS
    ========================= */
    const loadTopProducts = async () => {
        try {
            const response = await fetch(`${API_URL}/api/dashboard/top-products`);
            const data = await response.json();
            setTopProducts(data);
        }
        catch (err) {
            console.log(err);
        }
    };
    /* =========================
       LOAD LOW STOCK PRODUCTS
    ========================= */
    const loadLowStockProducts = async () => {
        try {
            const response = await fetch(`${API_URL}/api/dashboard/low-stock-products`);
            const data = await response.json();
            setLowStockProducts(Array.isArray(data)
                ? data
                : []);
        }
        catch (err) {
            console.log(err);
        }
    };
    return (_jsxs("div", { className: "admin-page", children: [_jsx(AdminSidebar, {}), _jsxs("main", { className: "admin-content", children: [_jsxs("div", { className: "admin-header", children: [_jsx("h1", { children: "Dashboard" }), _jsx("p", { children: "Analytics del sistema" })] }), _jsxs("div", { className: "stats-grid", children: [_jsxs("div", { className: "stat-card", children: [_jsx("h3", { children: "\uD83D\uDED2 Ventas" }), _jsx("h1", { children: stats.TotalSales })] }), _jsxs("div", { className: "stat-card", children: [_jsx("h3", { children: "\uD83D\uDCB0 Ingresos" }), _jsxs("h1", { children: ["$", Number(stats.TotalRevenue || 0).toFixed(2)] })] }), _jsxs("div", { className: "stat-card", children: [_jsx("h3", { children: "\uD83D\uDC65 Clientes" }), _jsx("h1", { children: stats.TotalCustomers })] }), _jsxs("div", { className: "stat-card", children: [_jsx("h3", { children: "\uD83D\uDCE6 Productos" }), _jsx("h1", { children: stats.TotalProducts })] }), _jsxs("div", { className: "stat-card low-stock", children: [_jsx("h3", { children: "\u26A0\uFE0F Stock Bajo" }), _jsx("h1", { children: stats.LowStock })] })] }), _jsxs("div", { className: "low-stock-card", children: [_jsxs("div", { className: "low-stock-header", children: [_jsxs("div", { children: [_jsx("h2", { children: "\u26A0\uFE0F Stock Cr\u00EDtico" }), _jsx("p", { children: "Productos activos con 5 piezas o menos." })] }), _jsx("button", { className: "low-stock-btn", onClick: () => window.location.href =
                                            "/admin/products", children: "Ir a productos" })] }), lowStockProducts.length === 0 && (_jsx("div", { className: "low-stock-empty", children: "\u2705 Todo bien, no hay productos con stock cr\u00EDtico." })), _jsx("div", { className: "low-stock-list", children: lowStockProducts.map((product) => (_jsxs("div", { className: Number(product.Stock) === 0
                                        ? "low-stock-item critical"
                                        : "low-stock-item", children: [_jsxs("div", { className: "low-stock-left", children: [product.Image && (_jsx("img", { src: `${API_URL}${product.Image}`, alt: product.Modelo })), _jsxs("div", { children: [_jsx("h3", { children: product.Modelo }), _jsxs("p", { children: [product.Marca, " ", "-", " ", product.Color] }), _jsxs("small", { children: ["SKU:", " ", product.SKU || "N/A"] })] })] }), _jsxs("div", { className: "low-stock-right", children: [_jsx("span", { children: product.Stock }), _jsx("p", { children: "piezas" })] })] }, product.Id))) })] }), _jsxs("div", { className: "chart-card", children: [_jsxs("div", { className: "chart-header dashboard-chart-header", children: [_jsxs("div", { children: [_jsx("h2", { children: chartTitle[chartPeriod] }), _jsx("p", { children: "Comparativa de ingresos por periodo" })] }), _jsxs("div", { className: "chart-period-buttons", children: [_jsx("button", { className: chartPeriod === "daily"
                                                    ? "chart-period-btn active"
                                                    : "chart-period-btn", onClick: () => setChartPeriod("daily"), children: "D\u00EDa" }), _jsx("button", { className: chartPeriod === "weekly"
                                                    ? "chart-period-btn active"
                                                    : "chart-period-btn", onClick: () => setChartPeriod("weekly"), children: "Semana" }), _jsx("button", { className: chartPeriod === "monthly"
                                                    ? "chart-period-btn active"
                                                    : "chart-period-btn", onClick: () => setChartPeriod("monthly"), children: "Mes" }), _jsx("button", { className: chartPeriod === "yearly"
                                                    ? "chart-period-btn active"
                                                    : "chart-period-btn", onClick: () => setChartPeriod("yearly"), children: "A\u00F1o" })] })] }), _jsx(ResponsiveContainer, { width: "100%", height: 320, children: _jsxs(AreaChart, { data: chartData, children: [_jsx(XAxis, { dataKey: "date" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Area, { type: "monotone", dataKey: "sales", stroke: "#ff4fa3", fill: "#ffd3ea" })] }) })] }), _jsxs("div", { className: "dashboard-actions", children: [_jsx("button", { className: "dashboard-btn", onClick: () => window.location.href =
                                    "/admin/products", children: "\u2795 Nuevo Producto" }), _jsx("button", { className: "dashboard-btn", onClick: () => window.location.href =
                                    "/admin/customers", children: "\uD83D\uDC64 Nuevo Cliente" }), _jsx("button", { className: "dashboard-btn", onClick: () => window.location.href =
                                    "/admin/sales", children: "\uD83D\uDED2 Registrar Venta" }), _jsx("button", { className: "dashboard-btn", onClick: () => window.location.href =
                                    "/admin/scan", children: "\uD83D\uDCF7 Escanear QR" })] }), _jsxs("div", { className: "recent-sales-card", children: [_jsx("div", { className: "recent-sales-header", children: _jsx("h2", { children: "\uD83D\uDCC8 \u00DAltimas Ventas" }) }), _jsx("div", { className: "recent-sales-list", children: recentSales.map((sale) => (_jsxs("div", { className: "recent-sale-item", children: [_jsxs("div", { children: [_jsx("h3", { children: sale.FullName }), _jsx("p", { children: formatDate(sale.CreatedAt) })] }), _jsxs("h2", { children: ["$", Number(sale.Total || 0).toFixed(2)] })] }, sale.Id))) })] }), _jsxs("div", { className: "top-customers-card", children: [_jsx("div", { className: "top-customers-header", children: _jsx("h2", { children: "\uD83D\uDC51 Top Clientes" }) }), _jsx("div", { className: "top-customers-list", children: topCustomers.map((customer, index) => (_jsxs("div", { className: "top-customer-item", children: [_jsxs("div", { children: [_jsxs("h3", { children: ["#", index + 1, " ", customer.FullName] }), _jsxs("p", { children: ["\uD83D\uDCE6", " ", customer.Visits, " ", "compras"] }), _jsxs("p", { children: ["\u2B50", " ", customer.Level] })] }), _jsxs("div", { className: "top-customer-right", children: [_jsxs("h2", { children: ["$", Number(customer.TotalSpent || 0).toFixed(2)] }), _jsxs("p", { children: ["\uD83C\uDF81", " ", customer.Points, " ", "pts"] })] })] }, index))) })] }), _jsxs("div", { className: "top-products-card", children: [_jsx("div", { className: "top-products-header", children: _jsx("h2", { children: "\uD83D\uDCE6 Top Productos" }) }), _jsx("div", { className: "top-products-list", children: topProducts.map((product, index) => (_jsxs("div", { className: "top-product-item", children: [_jsxs("div", { className: "top-product-left", children: [product.Image && (_jsx("img", { src: `${API_URL}${product.Image}`, alt: product.Modelo })), _jsxs("div", { children: [_jsxs("h3", { children: ["#", index + 1, " ", product.Modelo] }), _jsxs("p", { children: ["\uD83D\uDD25", " ", product.TotalSold, " ", "vendidos"] }), _jsxs("p", { children: ["\uD83D\uDCE6 Stock:", " ", product.Stock] })] })] }), _jsx("div", { className: "top-product-right", children: _jsxs("h2", { children: ["$", Number(product.Revenue || 0).toFixed(2)] }) })] }, index))) })] })] })] }));
}
export default DashboardAdmin;
