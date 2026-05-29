import { useEffect, useState } from "react";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Categories from "../components/Categories";
import SearchBar from "../components/SearchBar";
import ProductCard from "../components/ProductCard";
import BottomNav from "../components/BottomNav";
import WhatsAppButton from "../components/WhatsAppButton";

const API_URL = import.meta.env.VITE_API_URL;

function Catalog() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.log(err));
  }, []);

  return (
    <div className="app">
      <Navbar setIsOpen={setIsSidebarOpen} />

      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="catalog-header">
        <h2>Catálogo</h2>
        <p>Descubre todos nuestros lentes premium</p>
      </div>

      <Categories />

      <SearchBar />

      <section className="catalog-grid">
        {products.map((product) => (
          <ProductCard
            key={product.Id}
            image={`${API_URL}${product.Image}`}
            name={product.Modelo}
            color={product.Color}
            price={`$${product.Price} MXN`}
            tag={product.Category}
          />
        ))}
      </section>

      <BottomNav />

      <WhatsAppButton />
    </div>
  );
}

export default Catalog;