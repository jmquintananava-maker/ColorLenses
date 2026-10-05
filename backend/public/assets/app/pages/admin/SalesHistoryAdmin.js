import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { apiFetch as fetch } from "../../utils/api.js";
import { useEffect, useMemo, useState } from "react";
import { Search, Receipt, DollarSign, CalendarDays, TrendingUp, Users, Package, Gift, BarChart3 } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import AdminSidebar from "../../components/AdminSidebar.js";
const API_URL = ("" || "");
function SalesHistoryAdmin() {
    const [sales, setSales] = useState([]);
    const [search, setSearch] = useState("");
    const [period, setPeriod] = useState("daily");
    useEffect(() => {
        getSales();
    }, []);
    const getSales = async () => {
        try {
            const response = await fetch(`${API_URL}/api/sales`);
            const data = await response.json();
            const orderedSales = Array.isArray(data)
                ? data.sort((a, b) => Number(b.Id || b.SaleId || 0) -
                    Number(a.Id || a.SaleId || 0))
                : [];
            setSales(orderedSales);
        }
        catch (err) {
            console.log("❌ Error cargando ventas:", err);
            setSales([]);
        }
    };
    const getSaleId = (sale) => {
        return sale.Id || sale.SaleId || "";
    };
    const getCustomerName = (sale) => {
        return (sale.FullName ||
            sale.CustomerName ||
            sale.Cliente ||
            sale.Customer ||
            "Cliente sin nombre");
    };
    const getSaleDate = (sale) => {
        return (sale.CreatedAt ||
            sale.Created ||
            sale.Fecha ||
            sale.Date ||
            sale.SaleDate ||
            null);
    };
    const getSaleTotal = (sale) => {
        return Number(sale.Total || sale.TotalPaid || sale.Amount || 0);
    };
    const getRedeemedPoints = (sale) => {
        return Number(sale.RedeemedPoints ||
            sale.PointsRedeemed ||
            sale.PuntosCanjeados ||
            0);
    };
    const getDiscount = (sale) => {
        return Number(sale.Discount || sale.Descuento || 0);
    };
    const getItemsSold = (sale) => {
        return Number(sale.TotalItems ||
            sale.ItemsSold ||
            sale.ProductsSold ||
            sale.Quantity ||
            sale.TotalQuantity ||
            0);
    };
    const formatDate = (dateValue) => {
        if (!dateValue)
            return "Sin fecha";
        const date = new Date(dateValue);
        if (isNaN(date.getTime()))
            return "Sin fecha";
        return date.toLocaleString("es-MX", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        });
    };
    const formatShortDate = (dateValue) => {
        const date = new Date(dateValue);
        if (isNaN(date.getTime()))
            return "Sin fecha";
        return date.toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "2-digit"
        });
    };
    const formatMonth = (dateValue) => {
        const date = new Date(dateValue);
        if (isNaN(date.getTime()))
            return "Sin fecha";
        return date.toLocaleDateString("es-MX", {
            month: "short",
            year: "numeric"
        });
    };
    const formatYear = (dateValue) => {
        const date = new Date(dateValue);
        if (isNaN(date.getTime()))
            return "Sin fecha";
        return String(date.getFullYear());
    };
    const isToday = (dateValue) => {
        const date = new Date(dateValue);
        const today = new Date();
        return (date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate());
    };
    const isThisMonth = (dateValue) => {
        const date = new Date(dateValue);
        const today = new Date();
        return (date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth());
    };
    const isThisYear = (dateValue) => {
        const date = new Date(dateValue);
        const today = new Date();
        return date.getFullYear() === today.getFullYear();
    };
    const filteredSales = useMemo(() => {
        const searchText = search.toLowerCase().trim();
        if (!searchText)
            return sales;
        return sales.filter((sale) => {
            return (String(getSaleId(sale)).toLowerCase().includes(searchText) ||
                String(getCustomerName(sale)).toLowerCase().includes(searchText) ||
                String(getSaleTotal(sale)).toLowerCase().includes(searchText) ||
                String(formatDate(getSaleDate(sale)))
                    .toLowerCase()
                    .includes(searchText));
        });
    }, [sales, search]);
    const kpis = useMemo(() => {
        const todaySales = sales.filter((sale) => isToday(getSaleDate(sale)));
        const monthSales = sales.filter((sale) => isThisMonth(getSaleDate(sale)));
        const yearSales = sales.filter((sale) => isThisYear(getSaleDate(sale)));
        const totalRevenue = sales.reduce((sum, sale) => sum + getSaleTotal(sale), 0);
        const todayRevenue = todaySales.reduce((sum, sale) => sum + getSaleTotal(sale), 0);
        const monthRevenue = monthSales.reduce((sum, sale) => sum + getSaleTotal(sale), 0);
        const yearRevenue = yearSales.reduce((sum, sale) => sum + getSaleTotal(sale), 0);
        const averageTicket = sales.length > 0 ? totalRevenue / sales.length : 0;
        const uniqueCustomers = new Set(sales.map((sale) => getCustomerName(sale))).size;
        const totalRedeemedPoints = sales.reduce((sum, sale) => sum + getRedeemedPoints(sale), 0);
        const totalDiscount = sales.reduce((sum, sale) => sum + getDiscount(sale), 0);
        const totalItemsSold = sales.reduce((sum, sale) => sum + getItemsSold(sale), 0);
        return {
            todayCount: todaySales.length,
            monthCount: monthSales.length,
            yearCount: yearSales.length,
            totalSales: sales.length,
            todayRevenue,
            monthRevenue,
            yearRevenue,
            totalRevenue,
            averageTicket,
            uniqueCustomers,
            totalRedeemedPoints,
            totalDiscount,
            totalItemsSold
        };
    }, [sales]);
    const salesChartData = useMemo(() => {
        const grouped = {};
        filteredSales.forEach((sale) => {
            const dateValue = getSaleDate(sale);
            if (!dateValue)
                return;
            let label = "";
            if (period === "daily") {
                label = formatShortDate(dateValue);
            }
            if (period === "monthly") {
                label = formatMonth(dateValue);
            }
            if (period === "yearly") {
                label = formatYear(dateValue);
            }
            if (!grouped[label]) {
                grouped[label] = {
                    label,
                    total: 0,
                    ventas: 0
                };
            }
            grouped[label].total += getSaleTotal(sale);
            grouped[label].ventas += 1;
        });
        return Object.values(grouped).reverse();
    }, [filteredSales, period]);
    const topCustomersData = useMemo(() => {
        const grouped = {};
        sales.forEach((sale) => {
            const customer = getCustomerName(sale);
            if (!grouped[customer]) {
                grouped[customer] = {
                    name: customer,
                    total: 0,
                    ventas: 0
                };
            }
            grouped[customer].total += getSaleTotal(sale);
            grouped[customer].ventas += 1;
        });
        return Object.values(grouped)
            .sort((a, b) => b.total - a.total)
            .slice(0, 8);
    }, [sales]);
    const periodTitle = {
        daily: "Ventas por día",
        monthly: "Ventas por mes",
        yearly: "Ventas por año"
    };
    return (_jsxs("div", { className: "admin-page", children: [_jsx(AdminSidebar, {}), _jsxs("main", { className: "admin-content", children: [_jsxs("div", { className: "admin-header", children: [_jsx("h1", { children: "Historial de Ventas" }), _jsx("p", { children: "Consulta ventas, analiza ingresos, clientes, puntos y rendimiento." })] }), _jsxs("div", { className: "sales-kpi-grid", children: [_jsxs("div", { className: "sales-kpi-card", children: [_jsx("div", { className: "sales-kpi-icon", children: _jsx(CalendarDays, { size: 24 }) }), _jsxs("div", { children: [_jsx("p", { children: "Ventas hoy" }), _jsx("h2", { children: kpis.todayCount }), _jsxs("span", { children: ["$", kpis.todayRevenue.toFixed(2)] })] })] }), _jsxs("div", { className: "sales-kpi-card", children: [_jsx("div", { className: "sales-kpi-icon", children: _jsx(TrendingUp, { size: 24 }) }), _jsxs("div", { children: [_jsx("p", { children: "Ventas del mes" }), _jsx("h2", { children: kpis.monthCount }), _jsxs("span", { children: ["$", kpis.monthRevenue.toFixed(2)] })] })] }), _jsxs("div", { className: "sales-kpi-card", children: [_jsx("div", { className: "sales-kpi-icon", children: _jsx(BarChart3, { size: 24 }) }), _jsxs("div", { children: [_jsx("p", { children: "Ventas del a\u00F1o" }), _jsx("h2", { children: kpis.yearCount }), _jsxs("span", { children: ["$", kpis.yearRevenue.toFixed(2)] })] })] }), _jsxs("div", { className: "sales-kpi-card", children: [_jsx("div", { className: "sales-kpi-icon", children: _jsx(DollarSign, { size: 24 }) }), _jsxs("div", { children: [_jsx("p", { children: "Total vendido" }), _jsxs("h2", { children: ["$", kpis.totalRevenue.toFixed(2)] }), _jsxs("span", { children: [kpis.totalSales, " ventas"] })] })] }), _jsxs("div", { className: "sales-kpi-card", children: [_jsx("div", { className: "sales-kpi-icon", children: _jsx(Receipt, { size: 24 }) }), _jsxs("div", { children: [_jsx("p", { children: "Ticket promedio" }), _jsxs("h2", { children: ["$", kpis.averageTicket.toFixed(2)] }), _jsx("span", { children: "Promedio por venta" })] })] }), _jsxs("div", { className: "sales-kpi-card", children: [_jsx("div", { className: "sales-kpi-icon", children: _jsx(Users, { size: 24 }) }), _jsxs("div", { children: [_jsx("p", { children: "Clientes con compra" }), _jsx("h2", { children: kpis.uniqueCustomers }), _jsx("span", { children: "Clientes \u00FAnicos" })] })] }), _jsxs("div", { className: "sales-kpi-card", children: [_jsx("div", { className: "sales-kpi-icon", children: _jsx(Package, { size: 24 }) }), _jsxs("div", { children: [_jsx("p", { children: "Productos vendidos" }), _jsx("h2", { children: kpis.totalItemsSold }), _jsx("span", { children: "Seg\u00FAn historial" })] })] }), _jsxs("div", { className: "sales-kpi-card", children: [_jsx("div", { className: "sales-kpi-icon", children: _jsx(Gift, { size: 24 }) }), _jsxs("div", { children: [_jsx("p", { children: "Puntos canjeados" }), _jsx("h2", { children: kpis.totalRedeemedPoints }), _jsxs("span", { children: ["Descuento: $", kpis.totalDiscount.toFixed(2)] })] })] })] }), _jsxs("div", { className: "sales-history-charts", children: [_jsxs("div", { className: "sales-history-chart-card", children: [_jsxs("div", { className: "sales-chart-header", children: [_jsxs("div", { children: [_jsx("h2", { children: periodTitle[period] }), _jsx("p", { children: "Ingresos agrupados por periodo." })] }), _jsxs("div", { className: "sales-period-buttons", children: [_jsx("button", { className: period === "daily" ? "active" : "", onClick: () => setPeriod("daily"), children: "D\u00EDa" }), _jsx("button", { className: period === "monthly" ? "active" : "", onClick: () => setPeriod("monthly"), children: "Mes" }), _jsx("button", { className: period === "yearly" ? "active" : "", onClick: () => setPeriod("yearly"), children: "A\u00F1o" })] })] }), _jsx(ResponsiveContainer, { width: "100%", height: 320, children: _jsxs(AreaChart, { data: salesChartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "label" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Area, { type: "monotone", dataKey: "total", stroke: "#ff4fa3", fill: "#ffd3ea" })] }) })] }), _jsxs("div", { className: "sales-history-chart-card", children: [_jsx("div", { className: "sales-chart-header", children: _jsxs("div", { children: [_jsx("h2", { children: "Top clientes" }), _jsx("p", { children: "Clientes con mayor monto comprado." })] }) }), _jsx(ResponsiveContainer, { width: "100%", height: 320, children: _jsxs(BarChart, { data: topCustomersData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "name" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "total", fill: "#ff4fa3" })] }) })] })] }), _jsxs("div", { className: "sales-history-toolbar", children: [_jsxs("div", { className: "sales-history-search", children: [_jsx(Search, { size: 18 }), _jsx("input", { type: "text", placeholder: "Buscar por ID, cliente, total o fecha...", value: search, onChange: (e) => setSearch(e.target.value) })] }), _jsxs("div", { className: "sales-history-count", children: [_jsx(Receipt, { size: 18 }), filteredSales.length, " ventas"] })] }), _jsx("div", { className: "admin-table-wrapper", children: _jsxs("table", { className: "admin-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "Cliente" }), _jsx("th", { children: "Total" }), _jsx("th", { children: "Descuento" }), _jsx("th", { children: "Puntos usados" }), _jsx("th", { children: "Fecha" })] }) }), _jsxs("tbody", { children: [filteredSales.map((sale) => (_jsxs("tr", { children: [_jsx("td", { "data-label": "ID", children: getSaleId(sale) }), _jsx("td", { "data-label": "Cliente", children: getCustomerName(sale) }), _jsxs("td", { "data-label": "Total", children: ["$", getSaleTotal(sale).toFixed(2)] }), _jsxs("td", { "data-label": "Descuento", children: ["$", getDiscount(sale).toFixed(2)] }), _jsx("td", { "data-label": "Puntos usados", children: getRedeemedPoints(sale) }), _jsx("td", { "data-label": "Fecha", children: formatDate(getSaleDate(sale)) })] }, getSaleId(sale)))), filteredSales.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: "6", "data-label": "Ventas", children: "No hay ventas registradas." }) }))] })] }) })] })] }));
}
export default SalesHistoryAdmin;
