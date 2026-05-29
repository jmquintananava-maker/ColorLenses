import {
  Routes,
  Route
} from "react-router-dom";

import CustomersAdmin from "./pages/admin/CustomersAdmin";
import ProductsAdmin from "./pages/admin/ProductsAdmin";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import Favorites from "./pages/Favorites";
import CardProfile from "./pages/CardProfile";
import SalesAdmin from "./pages/admin/SalesAdmin";
import QRScanner from "./pages/admin/QRScanner";
import DashboardAdmin from "./pages/admin/DashboardAdmin";
import LoginAdmin from "./pages/admin/LoginAdmin";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <Routes>
      {/* PUBLIC ROUTES */}

      <Route
        path="/"
        element={<Home />}
      />

      <Route
        path="/catalog"
        element={<Catalog />}
      />

      <Route
        path="/favorites"
        element={<Favorites />}
      />

      <Route
        path="/card/:slug"
        element={<CardProfile />}
      />

      <Route
        path="/admin/login"
        element={<LoginAdmin />}
      />

      {/* ADMIN PROTECTED ROUTES */}

      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <DashboardAdmin />
          </PrivateRoute>
        }
      />

      <Route
        path="/admin/scan"
        element={
          <PrivateRoute>
            <QRScanner />
          </PrivateRoute>
        }
      />

      <Route
        path="/admin/sales"
        element={
          <PrivateRoute>
            <SalesAdmin />
          </PrivateRoute>
        }
      />

      <Route
        path="/admin/sales/:slug"
        element={
          <PrivateRoute>
            <SalesAdmin />
          </PrivateRoute>
        }
      />

      <Route
        path="/admin/customers"
        element={
          <PrivateRoute>
            <CustomersAdmin />
          </PrivateRoute>
        }
      />

      <Route
        path="/admin/products"
        element={
          <PrivateRoute>
            <ProductsAdmin />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default App;