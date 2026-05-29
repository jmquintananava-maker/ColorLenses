import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import model from "../assets/model.png";

function Hero() {
  const navigate = useNavigate();
  return (
    <motion.section
      className="hero"

      initial={{
        opacity: 0,
        y: 40
      }}

      animate={{
        opacity: 1,
        y: 0
      }}

      transition={{
        duration: 0.8
      }}
    >

      <div className="hero-text">

        <span className="hero-badge">
          ✨ Nueva colección 2026
        </span>

        <h2>
          Resalta tu mirada
          <span> con ColorLenses</span>
        </h2>

        <p>
          Lentes de contacto premium diseñados para transformar tu estilo.
        </p>

        <div className="hero-buttons">

         <button
          className="primary-btn"

          onClick={() => navigate("/catalog")}
        >
          Explorar catálogo
        </button>

         <button
          className="secondary-btn"
          onClick={() => navigate("/catalog")}
        >
          Ver colores
        </button>

        </div>

      </div>

      <div className="hero-image">
        <img src={model} alt="Model" />
      </div>

    </motion.section>
  );
}

export default Hero;