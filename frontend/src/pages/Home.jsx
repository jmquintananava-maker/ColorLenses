import SearchBar from "../components/SearchBar";
import Reviews from "../components/Reviews";
import Categories from "../components/Categories";
import Benefits from "../components/Benefits";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import ProductCard from "../components/ProductCard";
import BottomNav from "../components/BottomNav";
import WhatsAppButton from "../components/WhatsAppButton";

import lens1 from "../assets/lens1.png";
import lens2 from "../assets/lens2.png";
import lens3 from "../assets/lens3.png";

const API_URL = import.meta.env.VITE_API_URL;

const fallbackBanners = [
  {
    Id: "fallback-1",
    Title: "Resalta tu mirada con ColorLenses",
    Subtitle: "Lentes de contacto premium para transformar tu estilo.",
    ButtonText: "Explorar catálogo",
    ButtonLink: "/catalog",
    Image: "",
    DisplayOrder: 1
  }
];

function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [banners, setBanners] = useState([]);
  const [activeBanner, setActiveBanner] = useState(0);

  useEffect(() => {
    loadBanners();
  }, []);

  useEffect(() => {
    const currentBanners =
      banners.length > 0
        ? banners
        : fallbackBanners;

    if (currentBanners.length <= 1) return;

    const interval = setInterval(() => {
      setActiveBanner((current) =>
        current === currentBanners.length - 1
          ? 0
          : current + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [banners]);

  const loadBanners = async () => {
    try {
      const response = await fetch(`${API_URL}/api/settings/banners`);
      const data = await response.json();

      setBanners(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("❌ Error cargando banners:", err);
      setBanners([]);
    }
  };

  const currentBanners =
    banners.length > 0
      ? banners
      : fallbackBanners;

  const banner =
    currentBanners[activeBanner] || currentBanners[0];

  const bannerImage =
    banner?.Image
      ? `${API_URL}${banner.Image}`
      : null;

  return (
    <div className="app">
      <Navbar setIsOpen={setIsSidebarOpen} />

      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <section className="dynamic-hero">
        <AnimatePresence mode="wait">
          <motion.div
            key={banner?.Id || activeBanner}
            className="dynamic-hero-card"
            initial={{
              opacity: 0,
              x: 60,
              scale: 0.98
            }}
            animate={{
              opacity: 1,
              x: 0,
              scale: 1
            }}
            exit={{
              opacity: 0,
              x: -60,
              scale: 0.98
            }}
            transition={{
              duration: 0.6,
              ease: "easeOut"
            }}
          >
            <div className="dynamic-hero-content">
              <motion.div
                className="dynamic-hero-badge"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                ✨ Nueva colección 2026
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                {banner?.Title}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                {banner?.Subtitle}
              </motion.p>

              {banner?.ButtonText && (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <Link
                    to={banner?.ButtonLink || "/catalog"}
                    className="dynamic-hero-btn"
                  >
                    {banner.ButtonText}
                    <span>→</span>
                  </Link>
                </motion.div>
              )}
            </div>

            <div className="dynamic-hero-image-box">
              {bannerImage ? (
                <motion.img
                  src={bannerImage}
                  alt={banner?.Title || "ColorLenses Banner"}
                  initial={{ scale: 1.08 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1.2 }}
                />
              ) : (
                <div className="dynamic-hero-placeholder">
                  ColorLenses
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {currentBanners.length > 1 && (
          <div className="dynamic-hero-dots">
            {currentBanners.map((item, index) => (
              <button
                key={item.Id || index}
                className={
                  activeBanner === index
                    ? "active"
                    : ""
                }
                onClick={() => setActiveBanner(index)}
                aria-label={`Ver banner ${index + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      <Categories />

      <SearchBar />

      <section className="products-section">
        <div className="section-header">
          <h2>Trending Lenses</h2>

          <span>Ver todos</span>
        </div>

        <div className="products-grid">
          <ProductCard
            image={lens1}
            name="Honey Brown"
            color="Natural Collection"
            price="$349 MXN"
            tag="BEST SELLER"
          />

          <ProductCard
            image={lens2}
            name="Ocean Blue"
            color="Luxury Eyes"
            price="$349 MXN"
            tag="NEW"
          />

          <ProductCard
            image={lens3}
            name="Gray Mist"
            color="Soft Edition"
            price="$349 MXN"
            tag="TOP"
          />
        </div>
      </section>

      <Benefits />

      <Reviews />

      <BottomNav />

      <WhatsAppButton />
    </div>
  );
}

export default Home;