import { motion } from "framer-motion";

function Reviews() {

  const reviews = [

    {
      name: "Nataly G.",
      image:
        "https://i.pravatar.cc/150?img=32",

      text:
        "Los lentes se ven súper naturales y cómodos ✨",

      stars: "★★★★★"
    },

    {
      name: "Jade R.",
      image:
        "https://i.pravatar.cc/150?img=44",

      text:
        "Me encantó la calidad y el color 😍",

      stars: "★★★★★"
    },

    {
      name: "Sofía M.",
      image:
        "https://i.pravatar.cc/150?img=48",

      text:
        "Definitivamente volveré a comprar 💖",

      stars: "★★★★★"
    }

  ];

  return (

    <section className="reviews-section">

      <div className="section-header">

        <h2>Clientes felices</h2>

        <span>Reviews</span>

      </div>

      <div className="reviews-scroll">

        {reviews.map((review, index) => (

          <motion.div

            className="review-card"

            key={index}

            initial={{
              opacity: 0,
              x: 40
            }}

            whileInView={{
              opacity: 1,
              x: 0
            }}

            transition={{
              duration: 0.5,
              delay: index * 0.1
            }}

            whileHover={{
              y: -5
            }}
          >

            <div className="review-top">

              <img
                src={review.image}
                alt={review.name}
              />

              <div>

                <h3>{review.name}</h3>

                <span>{review.stars}</span>

              </div>

            </div>

            <p>{review.text}</p>

          </motion.div>

        ))}

      </div>

    </section>
  );
}

export default Reviews;