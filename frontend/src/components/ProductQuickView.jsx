import { useState } from 'react';
import { ChevronLeft,ChevronRight,MessageCircle } from 'lucide-react';
import Modal from './Modal';
import { imageUrl } from '../utils/api';
import { money } from '../utils/catalog';
export default function ProductQuickView({product:p,onClose}){
 const variants=p.variants || [p], [vid,setVid]=useState(String(p.ProductVariantId)), [image,setImage]=useState(0);
 const variant=variants.find(v=>String(v.ProductVariantId)===vid)||variants[0];
 const images=[p.Image,p.Image2,p.Image3].filter(Boolean).map(imageUrl);
 const text=`Hola, me interesa este lente:\n${p.Marca} ${p.Modelo}\nColor: ${p.Color}\nGraduación: ${variant.PowerLabel}\nCódigo: ${variant.ScanCode || variant.FactoryCode || variant.InternalCode || ''}\nPrecio: ${money(variant.Price)}`;
 return <Modal title={p.Modelo || 'Detalle del lente'} onClose={onClose} wide><div className="cl-product-detail"><div className="cl-detail-photo">{images.length?<img src={images[image]} alt={`${p.Modelo}, imagen ${image+1}`} onError={e=>e.currentTarget.style.visibility='hidden'}/>:<div className="cl-mini-iris"/>}{images.length>1&&<div className="cl-detail-arrows"><button className="cl-icon-btn" aria-label="Foto anterior" onClick={()=>setImage(i=>(i-1+images.length)%images.length)}><ChevronLeft/></button><span>{image+1} / {images.length}</span><button className="cl-icon-btn" aria-label="Foto siguiente" onClick={()=>setImage(i=>(i+1)%images.length)}><ChevronRight/></button></div>}</div><div className="cl-detail-content"><span className="cl-eyebrow">{p.Marca}</span><h3>{p.Modelo}</h3><p>{p.Color} · {p.Category}</p><strong className="cl-detail-price">{money(variant.Price)}</strong>{p.Description&&<p className="cl-detail-description">{p.Description}</p>}
 <label className="cl-field">Selecciona la graduación<select value={String(variant.ProductVariantId)} onChange={e=>setVid(e.target.value)}>{variants.map(v=><option key={v.ProductVariantId} value={String(v.ProductVariantId)}>{v.PowerLabel} · {Number(v.Stock)>0?'Disponible':'Sin existencias'}</option>)}</select></label>
 <p className={Number(variant.Stock)>0?'cl-stock-yes':'cl-stock-no'}>{Number(variant.Stock)>0?'Disponible para consultar':'Consulta cuándo vuelve a estar disponible'}</p><a className="cl-button cl-button-dark" href={`https://wa.me/526561489644?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><MessageCircle size={19}/>Consultar por WhatsApp</a><small className="cl-muted">El color de las imágenes es orientativo. Confirma tu graduación antes de comprar.</small></div></div></Modal>;
}
