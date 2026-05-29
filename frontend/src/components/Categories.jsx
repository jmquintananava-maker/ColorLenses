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

  return (

    <section className="categories-section">

      <div className="categories-scroll">

        {categories.map((category) => (

          <motion.button

            key={category}

            whileTap={{
              scale: 0.95
            }}

            onClick={() => setActive(category)}

            className={
              active === category
                ? "category-btn active"
                : "category-btn"
            }
          >

            {category}

          </motion.button>

        ))}

      </div>

    </section>
  );
}

export default Categories;