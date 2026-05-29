import SearchBar from "../components/SearchBar";
import Reviews from "../components/Reviews";
import Categories from "../components/Categories";
import Benefits from "../components/Benefits";
import { useState } from "react";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Hero from "../components/Hero";
import ProductCard from "../components/ProductCard";
import BottomNav from "../components/BottomNav";
import WhatsAppButton from "../components/WhatsAppButton";

import lens1 from "../assets/lens1.png";
import lens2 from "../assets/lens2.png";
import lens3 from "../assets/lens3.png";

function Home() {

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (

    <div className="app">

      <Navbar setIsOpen={setIsSidebarOpen} />

      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <Hero />
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