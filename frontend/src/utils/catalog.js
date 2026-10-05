import { useEffect, useState } from 'react';
import { request } from './api';
import { normalize } from './productFilters';
export const money=n=>Number(n)>0?new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2}).format(Number(n)):'Consultar precio';
export const productKey=p=>`${p.ProductId || normalize(p.Marca)+'|'+normalize(p.Modelo)}|${normalize(p.Color)}`;
export function groupProducts(products){
 const map=new Map();products.forEach(p=>{const key=productKey(p);if(!map.has(key))map.set(key,[]);map.get(key).push(p);});
 return [...map.values()].map(variants=>{
  const sorted=[...variants].sort((a,b)=>(Number(a.Power)!==0)-(Number(b.Power)!==0)||Number(b.Power)-Number(a.Power));
  const preferred=sorted.find(p=>Number(p.Stock)>0)||sorted[0];
  const prices=sorted.map(p=>Number(p.Price)).filter(p=>p>0);
  return {...preferred,variants:sorted,TotalStock:sorted.reduce((s,p)=>s+Number(p.Stock || 0),0),MinPrice:prices.length?Math.min(...prices):0};
 });
}
export function useCatalog(){
 const [products,setProducts]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[version,setVersion]=useState(0);
 useEffect(()=>{let live=true;setLoading(true);setError('');request('/api/product-variants').then(data=>{
  if(!Array.isArray(data))throw new Error('El catálogo no devolvió una lista de productos.');
  if(live)setProducts(data.map(p=>({...p,ProductVariantId:p.ProductVariantId||p.VariantId||p.Id,ProductId:p.ProductId||p.ProductID,Price:Number(p.Price || 0),Stock:Number(p.Stock || 0),Power:Number(p.Power || 0),PowerLabel:p.PowerLabel||(Number(p.Power || 0)===0?'Sin graduación':Number(p.Power).toFixed(2))})).filter(p=>!Number(p.NeedsReview)&&normalize(p.VariantStatus || p.Status || 'Activo')==='activo'&&normalize(p.ProductStatus || 'Activo')==='activo'));
 }).catch(e=>{if(live)setError(e.message || 'No pudimos cargar el catálogo.');}).finally(()=>{if(live)setLoading(false)});return()=>{live=false};},[version]);
 return {products,loading,error,retry:()=>setVersion(v=>v+1)};
}
