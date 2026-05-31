import { useEffect, useMemo, useState } from "react";

import {
  Search,
  Receipt,
  DollarSign,
  CalendarDays,
  TrendingUp,
  Users,
  Package,
  Gift,
  BarChart3
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

import AdminSidebar from "../../components/AdminSidebar";

const API_URL = import.meta.env.VITE_API_URL;

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
        ? data.sort(
            (a, b) =>
              Number(b.Id || b.SaleId || 0) -
              Number(a.Id || a.SaleId || 0)
          )
        : [];

      setSales(orderedSales);
    } catch (err) {
      console.log("❌ Error cargando ventas:", err);
      setSales([]);
    }
  };

  const getSaleId = (sale) => {
    return sale.Id || sale.SaleId || "";
  };

  const getCustomerName = (sale) => {
    return (
      sale.FullName ||
      sale.CustomerName ||
      sale.Cliente ||
      sale.Customer ||
      "Cliente sin nombre"
    );
  };

  const getSaleDate = (sale) => {
    return (
      sale.CreatedAt ||
      sale.Created ||
      sale.Fecha ||
      sale.Date ||
      sale.SaleDate ||
      null
    );
  };

  const getSaleTotal = (sale) => {
    return Number(sale.Total || sale.TotalPaid || sale.Amount || 0);
  };

  const getRedeemedPoints = (sale) => {
    return Number(
      sale.RedeemedPoints ||
        sale.PointsRedeemed ||
        sale.PuntosCanjeados ||
        0
    );
  };

  const getDiscount = (sale) => {
    return Number(sale.Discount || sale.Descuento || 0);
  };

  const getItemsSold = (sale) => {
    return Number(
      sale.TotalItems ||
        sale.ItemsSold ||
        sale.ProductsSold ||
        sale.Quantity ||
        sale.TotalQuantity ||
        0
    );
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "Sin fecha";

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) return "Sin fecha";

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

    if (isNaN(date.getTime())) return "Sin fecha";

    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit"
    });
  };

  const formatMonth = (dateValue) => {
    const date = new Date(dateValue);

    if (isNaN(date.getTime())) return "Sin fecha";

    return date.toLocaleDateString("es-MX", {
      month: "short",
      year: "numeric"
    });
  };

  const formatYear = (dateValue) => {
    const date = new Date(dateValue);

    if (isNaN(date.getTime())) return "Sin fecha";

    return String(date.getFullYear());
  };

  const isToday = (dateValue) => {
    const date = new Date(dateValue);
    const today = new Date();

    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isThisMonth = (dateValue) => {
    const date = new Date(dateValue);
    const today = new Date();

    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth()
    );
  };

  const isThisYear = (dateValue) => {
    const date = new Date(dateValue);
    const today = new Date();

    return date.getFullYear() === today.getFullYear();
  };

  const filteredSales = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) return sales;

    return sales.filter((sale) => {
      return (
        String(getSaleId(sale)).toLowerCase().includes(searchText) ||
        String(getCustomerName(sale)).toLowerCase().includes(searchText) ||
        String(getSaleTotal(sale)).toLowerCase().includes(searchText) ||
        String(formatDate(getSaleDate(sale)))
          .toLowerCase()
          .includes(searchText)
      );
    });
  }, [sales, search]);

  const kpis = useMemo(() => {
    const todaySales = sales.filter((sale) => isToday(getSaleDate(sale)));

    const monthSales = sales.filter((sale) =>
      isThisMonth(getSaleDate(sale))
    );

    const yearSales = sales.filter((sale) => isThisYear(getSaleDate(sale)));

    const totalRevenue = sales.reduce(
      (sum, sale) => sum + getSaleTotal(sale),
      0
    );

    const todayRevenue = todaySales.reduce(
      (sum, sale) => sum + getSaleTotal(sale),
      0
    );

    const monthRevenue = monthSales.reduce(
      (sum, sale) => sum + getSaleTotal(sale),
      0
    );

    const yearRevenue = yearSales.reduce(
      (sum, sale) => sum + getSaleTotal(sale),
      0
    );

    const averageTicket =
      sales.length > 0 ? totalRevenue / sales.length : 0;

    const uniqueCustomers = new Set(
      sales.map((sale) => getCustomerName(sale))
    ).size;

    const totalRedeemedPoints = sales.reduce(
      (sum, sale) => sum + getRedeemedPoints(sale),
      0
    );

    const totalDiscount = sales.reduce(
      (sum, sale) => sum + getDiscount(sale),
      0
    );

    const totalItemsSold = sales.reduce(
      (sum, sale) => sum + getItemsSold(sale),
      0
    );

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

      if (!dateValue) return;

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

  return (
    <div className="admin-page">
      <AdminSidebar />

      <main className="admin-content">
        <div className="admin-header">
          <h1>Historial de Ventas</h1>

          <p>
            Consulta ventas, analiza ingresos, clientes, puntos y rendimiento.
          </p>
        </div>

        {/* KPIS */}

        <div className="sales-kpi-grid">
          <div className="sales-kpi-card">
            <div className="sales-kpi-icon">
              <CalendarDays size={24} />
            </div>

            <div>
              <p>Ventas hoy</p>
              <h2>{kpis.todayCount}</h2>
              <span>${kpis.todayRevenue.toFixed(2)}</span>
            </div>
          </div>

          <div className="sales-kpi-card">
            <div className="sales-kpi-icon">
              <TrendingUp size={24} />
            </div>

            <div>
              <p>Ventas del mes</p>
              <h2>{kpis.monthCount}</h2>
              <span>${kpis.monthRevenue.toFixed(2)}</span>
            </div>
          </div>

          <div className="sales-kpi-card">
            <div className="sales-kpi-icon">
              <BarChart3 size={24} />
            </div>

            <div>
              <p>Ventas del año</p>
              <h2>{kpis.yearCount}</h2>
              <span>${kpis.yearRevenue.toFixed(2)}</span>
            </div>
          </div>

          <div className="sales-kpi-card">
            <div className="sales-kpi-icon">
              <DollarSign size={24} />
            </div>

            <div>
              <p>Total vendido</p>
              <h2>${kpis.totalRevenue.toFixed(2)}</h2>
              <span>{kpis.totalSales} ventas</span>
            </div>
          </div>

          <div className="sales-kpi-card">
            <div className="sales-kpi-icon">
              <Receipt size={24} />
            </div>

            <div>
              <p>Ticket promedio</p>
              <h2>${kpis.averageTicket.toFixed(2)}</h2>
              <span>Promedio por venta</span>
            </div>
          </div>

          <div className="sales-kpi-card">
            <div className="sales-kpi-icon">
              <Users size={24} />
            </div>

            <div>
              <p>Clientes con compra</p>
              <h2>{kpis.uniqueCustomers}</h2>
              <span>Clientes únicos</span>
            </div>
          </div>

          <div className="sales-kpi-card">
            <div className="sales-kpi-icon">
              <Package size={24} />
            </div>

            <div>
              <p>Productos vendidos</p>
              <h2>{kpis.totalItemsSold}</h2>
              <span>Según historial</span>
            </div>
          </div>

          <div className="sales-kpi-card">
            <div className="sales-kpi-icon">
              <Gift size={24} />
            </div>

            <div>
              <p>Puntos canjeados</p>
              <h2>{kpis.totalRedeemedPoints}</h2>
              <span>Descuento: ${kpis.totalDiscount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* CHARTS */}

        <div className="sales-history-charts">
          <div className="sales-history-chart-card">
            <div className="sales-chart-header">
              <div>
                <h2>{periodTitle[period]}</h2>
                <p>Ingresos agrupados por periodo.</p>
              </div>

              <div className="sales-period-buttons">
                <button
                  className={period === "daily" ? "active" : ""}
                  onClick={() => setPeriod("daily")}
                >
                  Día
                </button>

                <button
                  className={period === "monthly" ? "active" : ""}
                  onClick={() => setPeriod("monthly")}
                >
                  Mes
                </button>

                <button
                  className={period === "yearly" ? "active" : ""}
                  onClick={() => setPeriod("yearly")}
                >
                  Año
                </button>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#ff4fa3"
                  fill="#ffd3ea"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="sales-history-chart-card">
            <div className="sales-chart-header">
              <div>
                <h2>Top clientes</h2>
                <p>Clientes con mayor monto comprado.</p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topCustomersData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#ff4fa3" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SEARCH */}

        <div className="sales-history-toolbar">
          <div className="sales-history-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Buscar por ID, cliente, total o fecha..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="sales-history-count">
            <Receipt size={18} />
            {filteredSales.length} ventas
          </div>
        </div>

        {/* TABLE */}

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Descuento</th>
                <th>Puntos usados</th>
                <th>Fecha</th>
              </tr>
            </thead>

            <tbody>
              {filteredSales.map((sale) => (
                <tr key={getSaleId(sale)}>
                  <td data-label="ID">
                    {getSaleId(sale)}
                  </td>

                  <td data-label="Cliente">
                    {getCustomerName(sale)}
                  </td>

                  <td data-label="Total">
                    ${getSaleTotal(sale).toFixed(2)}
                  </td>

                  <td data-label="Descuento">
                    ${getDiscount(sale).toFixed(2)}
                  </td>

                  <td data-label="Puntos usados">
                    {getRedeemedPoints(sale)}
                  </td>

                  <td data-label="Fecha">
                    {formatDate(getSaleDate(sale))}
                  </td>
                </tr>
              ))}

              {filteredSales.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    data-label="Ventas"
                  >
                    No hay ventas registradas.
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

export default SalesHistoryAdmin;