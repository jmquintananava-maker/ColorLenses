import BrandLogo from '../components/BrandLogo';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { request } from '../utils/api';
export default function CardProfile(){
 const {slug}=useParams(),[customer,setCustomer]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let live=true;request('/api/cards/'+encodeURIComponent(slug)).then(c=>live&&setCustomer(c)).catch(e=>live&&setError(e.message)).finally(()=>live&&setLoading(false));return()=>{live=false;};},[slug]);
 if(loading)return <div className="card-loading">Cargando tarjeta…</div>;
 if(!customer)return <div className="card-loading">{error||'Tarjeta no encontrada'} <Link to="/">Volver a ColorLenses</Link></div>;
 return <div className="card-page"><div className="card-container"><div className="card-logo"><BrandLogo dark/></div><h1>{customer.FullName}</h1><p className="card-status">{customer.Level||'Cliente ColorLenses'}</p><div className="card-qr"><QRCodeCanvas value={`${window.location.origin}/admin/sales/${encodeURIComponent(customer.CardSlug)}`} size={180} level="H" includeMargin/></div><p>Presenta tu tarjeta al realizar tu compra.</p><Link className="cl-btn" to="/catalog">Explorar catálogo</Link></div></div>;
}
