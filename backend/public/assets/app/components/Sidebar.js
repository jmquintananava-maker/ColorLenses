import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { motion, AnimatePresence } from "framer-motion";
import { House, Grid2X2, Heart, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
function Sidebar({ isOpen, setIsOpen }) {
    const location = useLocation();
    const links = [
        {
            name: "Inicio",
            icon: _jsx(House, { size: 20 }),
            path: "/"
        },
        {
            name: "Catálogo",
            icon: _jsx(Grid2X2, { size: 20 }),
            path: "/catalog"
        },
        {
            name: "Favoritos",
            icon: _jsx(Heart, { size: 20 }),
            path: "/favorites"
        },
        {
            name: "Admin",
            icon: _jsx(User, { size: 20 }),
            path: "/admin/login"
        }
    ];
    const isActiveRoute = (path) => {
        if (path === "/") {
            return location.pathname === "/";
        }
        return location.pathname === path ||
            location.pathname.startsWith(`${path}/`);
    };
    return (_jsxs(_Fragment, { children: [_jsx(AnimatePresence, { children: isOpen && (_jsx(motion.div, { className: "site-sidebar-overlay", onClick: () => setIsOpen(false), initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.25 } })) }), _jsxs(motion.aside, { className: `sidebar site-sidebar-panel ${isOpen ? "open" : ""}`, "aria-hidden": !isOpen, inert: !isOpen ? true : undefined, initial: false, animate: {
                    x: isOpen ? 0 : -360
                }, transition: {
                    type: "spring",
                    stiffness: 260,
                    damping: 28
                }, children: [_jsxs("div", { className: "sidebar-header", children: [_jsxs("div", { children: [_jsx("h2", { children: "ColorLenses" }), _jsx("p", { children: "Beauty contact lenses" })] }), _jsx("button", { type: "button", className: "sidebar-close", onClick: () => setIsOpen(false), "aria-label": "Cerrar men\u00FA", children: "\u2715" })] }), _jsx("nav", { className: "sidebar-links", children: links.map((link) => {
                            const isActive = isActiveRoute(link.path);
                            return (_jsxs(Link, { to: link.path, onClick: () => setIsOpen(false), className: isActive
                                    ? "sidebar-link active"
                                    : "sidebar-link", children: [_jsx("span", { className: "sidebar-icon", children: link.icon }), _jsx("span", { children: link.name })] }, link.name));
                        }) })] })] }));
}
export default Sidebar;
