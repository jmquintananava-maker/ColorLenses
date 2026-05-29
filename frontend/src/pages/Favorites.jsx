import { useState } from "react";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";
import ProductCard from "../components/ProductCard";
import WhatsAppButton from "../components/WhatsAppButton";

import lens1 from "../assets/lens1.png";
import lens2 from "../assets/lens2.png";

function Favorites() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app">
      <Navbar setIsOpen={setIsSidebarOpen} />

      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="catalog-header">
        <h2>Favoritos</h2>
        <p>Estos son los lentes que más te gustaron.</p>
      </div>

      <section className="catalog-grid">
        <ProductCard
          image={lens1}
          name="Honey Brown"
          color="Natural Collection"
          price="$349 MXN"
          tag="FAVORITO"
        />

        <ProductCard
          image={lens2}
          name="Ocean Blue"
          color="Luxury Eyes"
          price="$349 MXN"
          tag="FAVORITO"
        />
      </section>

      <BottomNav />

      <WhatsAppButton />
    </div>
  );
}

export default Favorites;