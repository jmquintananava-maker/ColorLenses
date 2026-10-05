import { useEffect,useState } from 'react';
import { Heart, ArrowUpRight } from 'lucide-react';
import { imageUrl } from '../utils/api';
import { money } from '../utils/catalog';
import { categoryKey } from '../utils/productFilters';
import { categoryLabel } from './ProductFilters';
const KEY='colorlensesFavorites';
const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[];}catch{return [];}};
export default function LensCard({product:p,onOpen}){
 const id=String(p.ProductVariantId || p.Id),[liked,setLiked]=useState(false),[badImage,setBadImage]=useState(false);
 useEffect(()=>{const update=()=>setLiked(read().some(f=>String(f.ProductVariantId || f.Id)===id));update();window.addEventListener('favoritesUpdated',update);return()=>window.removeEventListener('favoritesUpdated',update);},[id]);
 function favorite(){let list=read();if(liked)list=list.filter(f=>String(f.ProductVariantId || f.Id)!==id);else{const {variants,...save}=p;list.push(save);}localStorage.setItem(KEY,JSON.stringify(list));window.dispatchEvent(new Event('favoritesUpdated'));}
 return <article className="cl-lens-card"><div className="cl-lens-image"><button type="button" className="cl-lens-open" onClick={()=>onOpen(p)} aria-label={`Ver ${p.Marca} ${p.Modelo} ${p.Color}`}>
  {p.Image&&!badImage?<img src={imageUrl(p.Image)} alt={`${p.Modelo} · ${p.Color}`} loading="lazy" onError={()=>setBadImage(true)}/>:<div className={`cl-lens-placeholder cl-lens-${categoryKey(p.Category)}`}><div className="cl-mini-iris"/><span>{p.Color || 'ColorLenses'}</span></div>}
 </button><span className="cl-product-tag">{categoryLabel(categoryKey(p.Category)) || 'Colección'}</span><button className={`cl-favorite ${liked?'liked':''}`} aria-label={liked?'Quitar de favoritos':'Guardar en favoritos'} aria-pressed={liked} onClick={favorite}><Heart size={19} fill={liked?'currentColor':'none'}/></button></div>
 <div className="cl-lens-info"><span className="cl-product-brand">{p.Marca}</span><button className="cl-title-button" onClick={()=>onOpen(p)}><h3>{p.Modelo}</h3><ArrowUpRight size={17}/></button><p>{p.Color || 'Color por confirmar'}{p.variants?.length>1?` · ${p.variants.length} graduaciones`:p.PowerLabel?` · ${p.PowerLabel}`:''}</p><div className="cl-lens-bottom"><strong>{p.variants?.length>1?'Desde ':''}{money(p.MinPrice??p.Price)}</strong><span className={(p.TotalStock??p.Stock)>0?'cl-stock-yes':'cl-stock-no'}>{(p.TotalStock??p.Stock)>0?'Disponible':'Sin existencias'}</span></div></div></article>;
}
