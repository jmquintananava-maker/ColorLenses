import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from "framer-motion";
function Reviews() {
    const reviews = [
        {
            name: "Nataly G.",
            image: "https://i.pravatar.cc/150?img=32",
            text: "Los lentes se ven súper naturales y cómodos ✨",
            stars: "★★★★★"
        },
        {
            name: "Jade R.",
            image: "https://i.pravatar.cc/150?img=44",
            text: "Me encantó la calidad y el color 😍",
            stars: "★★★★★"
        },
        {
            name: "Sofía M.",
            image: "https://i.pravatar.cc/150?img=48",
            text: "Definitivamente volveré a comprar 💖",
            stars: "★★★★★"
        }
    ];
    return (_jsxs("section", { className: "reviews-section", children: [_jsxs("div", { className: "section-header", children: [_jsx("h2", { children: "Clientes felices" }), _jsx("span", { children: "Reviews" })] }), _jsx("div", { className: "reviews-scroll", children: reviews.map((review, index) => (_jsxs(motion.div, { className: "review-card", initial: {
                        opacity: 0,
                        x: 40
                    }, whileInView: {
                        opacity: 1,
                        x: 0
                    }, transition: {
                        duration: 0.5,
                        delay: index * 0.1
                    }, whileHover: {
                        y: -5
                    }, children: [_jsxs("div", { className: "review-top", children: [_jsx("img", { src: review.image, alt: review.name }), _jsxs("div", { children: [_jsx("h3", { children: review.name }), _jsx("span", { children: review.stars })] })] }), _jsx("p", { children: review.text })] }, index))) })] }));
}
export default Reviews;
