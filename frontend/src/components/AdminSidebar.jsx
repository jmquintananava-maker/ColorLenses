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
      name: "Dashboard",
      path: "/admin"
    },
    {
      name: "Productos",
      path: "/admin/products"
    },
    {
      name: "Clientes",
      path: "/admin/customers"
    },
    {
      name: "Ventas",
      path: "/admin/sales"
    },
    {
      name: "Historial de Ventas",
      path: "/admin/sales-history"
    },
    {
      name: "Escanear QR",
      path: "/admin/scan"
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
                location.pathname === item.path
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