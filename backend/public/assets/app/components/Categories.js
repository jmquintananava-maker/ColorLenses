import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from "react";
import { motion } from "framer-motion";
function Categories() {
    const categories = [
        "Naturales",
        "Azules",
        "Grises",
        "Verdes",
        "Fantasy",
        "Premium"
    ];
    const [active, setActive] = useState("Naturales");
    return (_jsx("section", { className: "categories-section", children: _jsx("div", { className: "categories-scroll", children: categories.map((category) => (_jsx(motion.button, { whileTap: {
                    scale: 0.95
                }, onClick: () => setActive(category), className: active === category
                    ? "category-btn active"
                    : "category-btn", children: category }, category))) }) }));
}
export default Categories;
