import { Package, Users, QrCode, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

function AdminDashboard() {
  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <h2>ColorLenses</h2>
        <p>Admin Panel</p>

        <nav>
          <Link to="/admin">Dashboard</Link>
          <Link to="/admin/products">Productos</Link>
          <Link to="/admin/customers">Clientes</Link>
          <Link to="/admin/cards">Tarjetas QR</Link>
        </nav>
      </aside>

      <main className="admin-content">
        <div className="admin-header">
          <div>
            <h1>Dashboard</h1>
            <p>Administra tu catálogo, clientes y tarjetas digitales.</p>
          </div>
        </div>

        <section className="admin-stats">
          <div className="admin-card">
            <Package size={30} />
            <h3>Productos</h3>
            <p>Administrar catálogo</p>
          </div>

          <div className="admin-card">
            <Users size={30} />
            <h3>Clientes</h3>
            <p>Registrar compradores</p>
          </div>

          <div className="admin-card">
            <QrCode size={30} />
            <h3>Tarjetas QR</h3>
            <p>Generar tarjetas digitales</p>
          </div>

          <div className="admin-card">
            <BarChart3 size={30} />
            <h3>Ventas</h3>
            <p>Resumen general</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;