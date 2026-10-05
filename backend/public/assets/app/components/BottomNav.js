import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { House, Grid2X2, Heart, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
function BottomNav() {
    const location = useLocation();
    return (_jsxs("div", { className: "bottom-nav", children: [_jsxs(Link, { to: "/", className: location.pathname === "/"
                    ? "nav-item active"
                    : "nav-item", children: [_jsx(House, { size: 22 }), _jsx("span", { children: "Inicio" })] }), _jsxs(Link, { to: "/catalog", className: location.pathname === "/catalog"
                    ? "nav-item active"
                    : "nav-item", children: [_jsx(Grid2X2, { size: 22 }), _jsx("span", { children: "Cat\u00E1logo" })] }), _jsxs(Link, { to: "/favorites", className: location.pathname === "/favorites"
                    ? "nav-item active"
                    : "nav-item", children: [_jsx(Heart, { size: 22 }), _jsx("span", { children: "Favoritos" })] }), _jsxs(Link, { to: "/admin/login", className: location.pathname === "/admin/login"
                    ? "nav-item active"
                    : "nav-item", children: [_jsx(User, { size: 22 }), _jsx("span", { children: "Admin" })] })] }));
}
export default BottomNav;
