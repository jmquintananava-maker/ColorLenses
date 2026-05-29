import { motion } from "framer-motion";

function WhatsAppButton() {

  const phone = "526561489644";

  const message =
    "Hola, me interesa conocer sus lentes de contacto 👀✨";

  const url =
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (

    <motion.a
      href={url}

      target="_blank"

      rel="noreferrer"

      className="whatsapp-btn"

      whileHover={{
        scale: 1.08
      }}

      whileTap={{
        scale: 0.95
      }}
    >

      💬

    </motion.a>

  );
}

export default WhatsAppButton;