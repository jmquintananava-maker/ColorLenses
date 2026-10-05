import { jsx as _jsx } from "react/jsx-runtime";
import { motion } from "framer-motion";
function WhatsAppButton() {
    const phone = "526561489644";
    const message = "Hola, me interesa conocer sus lentes de contacto 👀✨";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    return (_jsx(motion.a, { href: url, target: "_blank", rel: "noreferrer", className: "whatsapp-btn", whileHover: {
            scale: 1.08
        }, whileTap: {
            scale: 0.95
        }, children: "\uD83D\uDCAC" }));
}
export default WhatsAppButton;
