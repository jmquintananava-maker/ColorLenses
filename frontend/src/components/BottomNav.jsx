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

function BottomNav() {

  const location = useLocation();

  return (

    <div className="bottom-nav">

      <Link
        to="/"

        className={
          location.pathname === "/"
            ? "nav-item active"
            : "nav-item"
        }
      >

        <House size={22} />

        <span>Inicio</span>

      </Link>

      <Link
        to="/catalog"

        className={
          location.pathname === "/catalog"
            ? "nav-item active"
            : "nav-item"
        }
      >

        <Grid2X2 size={22} />

        <span>Catálogo</span>

      </Link>

      <Link
        to="/favorites"

        className={
          location.pathname === "/favorites"
            ? "nav-item active"
            : "nav-item"
        }
      >

        <Heart size={22} />

        <span>Favoritos</span>

      </Link>

      <Link
        to="/profile"

        className={
          location.pathname === "/profile"
            ? "nav-item active"
            : "nav-item"
        }
      >

        <User size={22} />

        <span>Perfil</span>

      </Link>

    </div>
  );
}

export default BottomNav;