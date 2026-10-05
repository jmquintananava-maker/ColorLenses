import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Truck, Shield, Sparkles, HeartHandshake } from "lucide-react";
import { motion } from "framer-motion";
function Benefits() {
    const items = [
        {
            icon: _jsx(Truck, { size: 28 }),
            title: "Envíos Rápidos",
            text: "Recibe tus lentes rápidamente."
        },
        {
            icon: _jsx(Shield, { size: 28 }),
            title: "Protección UV",
            text: "Mayor protección para tus ojos."
        },
        {
            icon: _jsx(Sparkles, { size: 28 }),
            title: "Calidad Premium",
            text: "Colores intensos y naturales."
        },
        {
            icon: _jsx(HeartHandshake, { size: 28 }),
            title: "Máxima Comodidad",
            text: "Uso cómodo todo el día."
        }
    ];
    return (_jsxs("section", { className: "benefits-section", children: [_jsx("div", { className: "section-header", children: _jsx("h2", { children: "\u00BFPor qu\u00E9 elegirnos?" }) }), _jsx("div", { className: "benefits-grid", children: items.map((item, index) => (_jsxs(motion.div, { className: "benefit-card", initial: {
                        opacity: 0,
                        y: 30
                    }, whileInView: {
                        opacity: 1,
                        y: 0
                    }, transition: {
                        duration: 0.5,
                        delay: index * 0.1
                    }, whileHover: {
                        y: -6
                    }, children: [_jsx("div", { className: "benefit-icon", children: item.icon }), _jsx("h3", { children: item.title }), _jsx("p", { children: item.text })] }, index))) })] }));
}
export default Benefits;
