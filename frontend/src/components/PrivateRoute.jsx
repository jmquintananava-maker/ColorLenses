import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { request } from '../utils/api';
export default function PrivateRoute({children}){
 const location=useLocation(),[state,setState]=useState('checking'),[message,setMessage]=useState('');
 const token=localStorage.getItem('adminToken');
 function check(){if(!token){setState('invalid');return;}setState('checking');request('/api/auth/me').then(()=>setState('valid')).catch(e=>{if(e.status===401||e.status===403){localStorage.removeItem('adminToken');localStorage.removeItem('adminUser');setState('invalid');}else{setMessage(e.message);setState('error');}});}
 useEffect(()=>{let live=true;if(!token){setState('invalid');return;}request('/api/auth/me').then(()=>live&&setState('valid')).catch(e=>{if(!live)return;if(e.status===401||e.status===403){localStorage.removeItem('adminToken');localStorage.removeItem('adminUser');setState('invalid');}else{setMessage(e.message);setState('error');}});const expire=()=>{localStorage.removeItem('adminToken');localStorage.removeItem('adminUser');setState('invalid');};window.addEventListener('adminSessionExpired',expire);return()=>{live=false;window.removeEventListener('adminSessionExpired',expire);};},[token]);
 if(state==='invalid')return <Navigate to="/admin/login" state={{from:location.pathname+location.search}} replace/>;
 if(state==='checking')return <main className="cl-auth-message"><span className="cl-brand-orbit"/><h2>Verificando tu sesión…</h2></main>;
 if(state==='error')return <main className="cl-auth-message"><h2>No pudimos verificar la sesión</h2><p>{message}</p><button className="cl-btn" onClick={check}>Reintentar</button></main>;
 return children;
}
