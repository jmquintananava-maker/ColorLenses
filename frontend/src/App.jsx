import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import MotionEnhancer from './components/MotionEnhancer';
import Catalog from './pages/Catalog';
import Favorites from './pages/Favorites';
import CardProfile from './pages/CardProfile';
import PrivateRoute from './components/PrivateRoute';
import LoginAdmin from './pages/admin/LoginAdmin';
import DashboardAdmin from './pages/admin/DashboardAdmin';
import ProductsAdmin from './pages/admin/ProductsAdmin';
import CustomersAdmin from './pages/admin/CustomersAdmin';
import SalesAdmin from './pages/admin/SalesAdmin';
import QRScanner from './pages/admin/QRScanner';
import SettingsAdmin from './pages/admin/SettingsAdmin';
import SalesHistoryAdmin from './pages/admin/SalesHistoryAdmin';
import ProductReportsAdmin from './pages/admin/reports/ProductReportsAdmin';
import InventoryAdmin from './pages/admin/InventoryAdmin';
const protect=node=><PrivateRoute>{node}</PrivateRoute>;
export default function App(){return <><MotionEnhancer/><Routes><Route path="/" element={<Home/>}/><Route path="/catalog" element={<Catalog/>}/><Route path="/favorites" element={<Favorites/>}/><Route path="/card/:slug" element={<CardProfile/>}/><Route path="/admin/login" element={<LoginAdmin/>}/><Route path="/admin" element={protect(<DashboardAdmin/>)}/><Route path="/admin/inventory" element={protect(<InventoryAdmin/>)}/><Route path="/admin/inventory/:sessionId" element={protect(<InventoryAdmin/>)}/><Route path="/admin/products" element={protect(<ProductsAdmin/>)}/><Route path="/admin/reports/products" element={protect(<ProductReportsAdmin/>)}/><Route path="/admin/customers" element={protect(<CustomersAdmin/>)}/><Route path="/admin/sales" element={protect(<SalesAdmin/>)}/><Route path="/admin/sales/:slug" element={protect(<SalesAdmin/>)}/><Route path="/admin/scan" element={protect(<QRScanner/>)}/><Route path="/admin/settings" element={protect(<SettingsAdmin/>)}/><Route path="/admin/sales-history" element={protect(<SalesHistoryAdmin/>)}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></>;}
