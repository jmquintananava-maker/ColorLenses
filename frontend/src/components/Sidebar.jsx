import { motion, AnimatePresence } from "framer-motion";

import {
  House,
  Grid2X2,
  Heart,
  Tag,
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
      name: "Promociones",
      icon: <Tag size={20} />,
      path: "/promotions"
    },
    {
      name: "Perfil",
      icon: <User size={20} />,
      path: "/profile"
    }
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="sidebar-overlay"
            onClick={() => setIsOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className="sidebar"
        initial={false}
        animate={{
          x: isOpen ? 0 : -340
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
            const isActive = location.pathname === link.path;

            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={isActive ? "sidebar-link active" : "sidebar-link"}
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