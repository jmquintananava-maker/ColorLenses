import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
function SearchBar() {
    return (_jsxs(motion.div, { className: "search-container", initial: {
            opacity: 0,
            y: 20
        }, animate: {
            opacity: 1,
            y: 0
        }, transition: {
            duration: 0.5
        }, children: [_jsx(Search, { size: 20, className: "search-icon" }), _jsx("input", { type: "text", placeholder: "Buscar lentes..." })] }));
}
export default SearchBar;
