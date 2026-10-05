import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.js';
import Catalog from './pages/Catalog.js';
import Favorites from './pages/Favorites.js';
import CardProfile from './pages/CardProfile.js';
import PrivateRoute from './components/PrivateRoute.js';
import LoginAdmin from './pages/admin/LoginAdmin.js';
import DashboardAdmin from './pages/admin/DashboardAdmin.js';
import ProductsAdmin from './pages/admin/ProductsAdmin.js';
import CustomersAdmin from './pages/admin/CustomersAdmin.js';
import SalesAdmin from './pages/admin/SalesAdmin.js';
import QRScanner from './pages/admin/QRScanner.js';
import SettingsAdmin from './pages/admin/SettingsAdmin.js';
import SalesHistoryAdmin from './pages/admin/SalesHistoryAdmin.js';
import ProductReportsAdmin from './pages/admin/reports/ProductReportsAdmin.js';
import InventoryAdmin from './pages/admin/InventoryAdmin.js';
const protect = node => _jsx(PrivateRoute, { children: node });
export default function App() { return _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/catalog", element: _jsx(Catalog, {}) }), _jsx(Route, { path: "/favorites", element: _jsx(Favorites, {}) }), _jsx(Route, { path: "/card/:slug", element: _jsx(CardProfile, {}) }), _jsx(Route, { path: "/admin/login", element: _jsx(LoginAdmin, {}) }), _jsx(Route, { path: "/admin", element: protect(_jsx(DashboardAdmin, {})) }), _jsx(Route, { path: "/admin/inventory", element: protect(_jsx(InventoryAdmin, {})) }), _jsx(Route, { path: "/admin/inventory/:sessionId", element: protect(_jsx(InventoryAdmin, {})) }), _jsx(Route, { path: "/admin/products", element: protect(_jsx(ProductsAdmin, {})) }), _jsx(Route, { path: "/admin/reports/products", element: protect(_jsx(ProductReportsAdmin, {})) }), _jsx(Route, { path: "/admin/customers", element: protect(_jsx(CustomersAdmin, {})) }), _jsx(Route, { path: "/admin/sales", element: protect(_jsx(SalesAdmin, {})) }), _jsx(Route, { path: "/admin/sales/:slug", element: protect(_jsx(SalesAdmin, {})) }), _jsx(Route, { path: "/admin/scan", element: protect(_jsx(QRScanner, {})) }), _jsx(Route, { path: "/admin/settings", element: protect(_jsx(SettingsAdmin, {})) }), _jsx(Route, { path: "/admin/sales-history", element: protect(_jsx(SalesHistoryAdmin, {})) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }); }
