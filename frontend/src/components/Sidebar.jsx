import { motion, AnimatePresence } from "framer-motion";

import {
  House,
  Grid2X2,
  Heart,
  User
} from "lucide-react";

import {
  Link,
  useLocation
} from "react-router-dom";

function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();

  const links = [
    {
      name: "Inicio",
      icon: <House size={20} />,
      path: "/"
    },
    {
      name: "Catálogo",
      icon: <Grid2X2 size={20} />,
      path: "/catalog"
    },
    {
      name: "Favoritos",
      icon: <Heart size={20} />,
      path: "/favorites"
    },
    {
      name: "Perfil",
      icon: <User size={20} />,
      path: "/profile"
    }
  ];

  const isActiveRoute = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname === path ||
      location.pathname.startsWith(`${path}/`);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="site-sidebar-overlay"
            onClick={() => setIsOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className="sidebar site-sidebar-panel"
        initial={false}
        animate={{
          x: isOpen ? 0 : -360
        }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 28
        }}
      >
        <div className="sidebar-header">
          <div>
            <h2>ColorLenses</h2>
            <p>Beauty contact lenses</p>
          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-links">
          {links.map((link) => {
            const isActive = isActiveRoute(link.path);

            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={
                  isActive
                    ? "sidebar-link active"
                    : "sidebar-link"
                }
              >
                <span className="sidebar-icon">
                  {link.icon}
                </span>

                <span>
                  {link.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </motion.aside>
    </>
  );
}

export default Sidebar;