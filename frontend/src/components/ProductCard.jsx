import { motion } from "framer-motion";

import { Heart } from "lucide-react";

import { useState } from "react";

function ProductCard({
  image,
  name,
  color,
  price,
  tag,
}) {

  const [liked, setLiked] = useState(false);

  return (

    <motion.div

      className="product-card"

      whileHover={{
        y: -8,
        scale: 1.01
      }}

      initial={{
        opacity: 0,
        y: 20
      }}

      animate={{
        opacity: 1,
        y: 0
      }}

      transition={{
        duration: 0.5
      }}
    >

      <div className="product-tag">
        {tag}
      </div>

      <button

        className={
          liked
            ? "favorite-btn active"
            : "favorite-btn"
        }

        onClick={() => setLiked(!liked)}
      >

        <Heart
          size={18}
          fill={liked ? "currentColor" : "none"}
        />

      </button>

      <img
        src={image}
        alt={name}
        className="product-img"
      />

      <div className="product-info">

        <h3>{name}</h3>

        <p>{color}</p>

        <div className="product-bottom">

          <strong>{price}</strong>

          <button className="add-btn">
            +
          </button>

        </div>

      </div>

    </motion.div>
  );
}

export default ProductCard;