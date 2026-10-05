import BrandLogo from './BrandLogo';
import { NavLink, Link } from 'react-router-dom';
import { Menu, Heart, ArrowUpRight, Search } from 'lucide-react';
export default function Navbar({setIsOpen}) {
 return <><div className="cl-announcement"><span>COLOR ES ACTITUD.</span><span>Encuentra tu próxima mirada <ArrowUpRight size={13}/></span></div>
 <nav className="cl-navbar" aria-label="Navegación principal">
  <Link className="cl-logo" to="/" aria-label="ColorLenses, inicio"><BrandLogo/></Link>
  <div className="cl-desktop-links"><NavLink to="/" end>Inicio</NavLink><NavLink to="/catalog">Todos los lentes</NavLink><Link to="/catalog?category=natural">Natural</Link><Link to="/catalog?category=muneca">Muñeca</Link><Link to="/catalog?category=halloween">Halloween</Link></div>
  <div className="cl-nav-actions"><Link className="cl-icon-btn" to="/catalog" aria-label="Buscar lentes"><Search size={21}/></Link><Link className="cl-icon-btn" to="/favorites" aria-label="Ver favoritos"><Heart size={21}/></Link><a className="cl-nav-contact" href="https://wa.me/526561489644" target="_blank" rel="noreferrer">Hablemos <ArrowUpRight size={17}/></a><button className="cl-menu-btn cl-icon-btn" aria-label="Abrir menú" onClick={()=>setIsOpen?.(true)}><Menu size={24}/></button></div>
 </nav></>;
}
