import { useState } from "react";

import {
  Link,
  useLocation,
  useNavigate
} from "react-router-dom";

function AdminSidebar() {
  const location = useLocation();

  const navigate = useNavigate();

  const [open, setOpen] = useState(false);

  const menu = [
    {
      name: "Vender QR",
      path: "/admin/scan"
    },
    {
      name: "Vender",
      path: "/admin/sales"
    },
    {
      name: "Clientes",
      path: "/admin/customers"
    },
    {
      name: "Productos",
      path: "/admin/products"
    },
    {
      name: "Reportes Excel",
      path: "/admin/reports/products"
    },
    {
      name: "Dashboard",
      path: "/admin"
    },
    {
      name: "Historial de Ventas",
      path: "/admin/sales-history"
    },
    {
      name: "Configuración",
      path: "/admin/settings"
    }
  ];

  const logout = () => {
    const confirmLogout = window.confirm(
      "¿Cerrar sesión?"
    );

    if (!confirmLogout) return;

    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");

    setOpen(false);

    navigate("/admin/login");
  };

  const isActiveRoute = (path) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }

    return location.pathname === path ||
      location.pathname.startsWith(`${path}/`);
  };

  return (
    <>
      {/* MOBILE BUTTON */}

      <button
        className="mobile-menu-btn"
        onClick={() => setOpen(!open)}
      >
        ☰
      </button>

      {/* OVERLAY */}

      {open && (
        <div
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={
          open
            ? "admin-sidebar open"
            : "admin-sidebar"
        }
      >
        <div className="sidebar-logo">
          <h1>
            ColorLenses
          </h1>

          <p>
            Admin Panel
          </p>
        </div>

        <nav className="sidebar-menu">
          {menu.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={
                isActiveRoute(item.path)
                  ? "active"
                  : ""
              }
              onClick={() => setOpen(false)}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="sidebar-logout-box">
          <button
            className="sidebar-logout-btn"
            onClick={logout}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}

export default AdminSidebar;