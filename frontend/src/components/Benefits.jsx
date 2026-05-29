import {
  Truck,
  Shield,
  Sparkles,
  HeartHandshake
} from "lucide-react";

import { motion } from "framer-motion";

function Benefits() {

  const items = [
    {
      icon: <Truck size={28} />,
      title: "Envíos Rápidos",
      text: "Recibe tus lentes rápidamente."
    },

    {
      icon: <Shield size={28} />,
      title: "Protección UV",
      text: "Mayor protección para tus ojos."
    },

    {
      icon: <Sparkles size={28} />,
      title: "Calidad Premium",
      text: "Colores intensos y naturales."
    },

    {
      icon: <HeartHandshake size={28} />,
      title: "Máxima Comodidad",
      text: "Uso cómodo todo el día."
    }
  ];

  return (

    <section className="benefits-section">

      <div className="section-header">

        <h2>¿Por qué elegirnos?</h2>

      </div>

      <div className="benefits-grid">

        {items.map((item, index) => (

          <motion.div
            className="benefit-card"

            key={index}

            initial={{
              opacity: 0,
              y: 30
            }}

            whileInView={{
              opacity: 1,
              y: 0
            }}

            transition={{
              duration: 0.5,
              delay: index * 0.1
            }}

            whileHover={{
              y: -6
            }}
          >

            <div className="benefit-icon">
              {item.icon}
            </div>

            <h3>{item.title}</h3>

            <p>{item.text}</p>

          </motion.div>

        ))}

      </div>

    </section>
  );
}

export default Benefits;