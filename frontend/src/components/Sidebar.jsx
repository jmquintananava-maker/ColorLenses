import { motion } from "framer-motion";

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
      {isOpen && (

        <motion.div
          className="sidebar-overlay"

          onClick={() => setIsOpen(false)}

          initial={{ opacity: 0 }}

          animate={{ opacity: 1 }}

          exit={{ opacity: 0 }}
        />

      )}

      <motion.div

        className="sidebar"

        initial={{ x: -320 }}

        animate={{
          x: isOpen ? 0 : -320
        }}

        transition={{
          duration: 0.35
        }}
      >

        <div className="sidebar-header">

          <h2>ColorLenses</h2>

          <button
            onClick={() => setIsOpen(false)}
          >
            ✕
          </button>

        </div>

        <div className="sidebar-links">

          {links.map((link) => (

            <Link

              key={link.name}

              to={link.path}

              onClick={() => setIsOpen(false)}

              className={
                location.pathname === link.path
                  ? "sidebar-link active"
                  : "sidebar-link"
              }
            >

              {link.icon}

              <span>{link.name}</span>

            </Link>

          ))}

        </div>

      </motion.div>
    </>
  );
}

export default Sidebar;