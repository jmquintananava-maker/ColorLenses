import BrandLogo from './BrandLogo';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
export default function Modal({ title, children, onClose, busy=false, wide=false, className='' }) {
 const ref=useRef(null),titleId=useId();
 useEffect(()=>{const d=ref.current;d.showModal();return()=>{if(d.open)d.close();};},[]);
 return createPortal(<dialog ref={ref} className={`cl-modal ${wide?'cl-modal-wide':''} ${className}`} aria-labelledby={titleId}
   onCancel={e=>{e.preventDefault();if(!busy)onClose();}} onClick={e=>{if(e.target===ref.current&&!busy)onClose();}}>
   <header className="cl-modal-head"><div><BrandLogo compact/><h2 id={titleId}>{title}</h2></div><button type="button" className="cl-icon-btn" aria-label="Cerrar ventana" disabled={busy} onClick={onClose}><X size={22}/></button></header>
   <div className="cl-modal-body">{children}</div>
 </dialog>,document.body);
}
