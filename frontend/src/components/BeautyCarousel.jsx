import BrandLogo from './BrandLogo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { imageUrl, request } from '../utils/api';
import { editorialSlides, mergeBanners } from './carousel-data';
import '../styles/beauty-carousel.css';
export { editorialSlides } from './carousel-data';

function HeroPhoto({slide,index}) {
 const sources=useMemo(()=>[...new Set([slide.Image,slide.DefaultImage].filter(Boolean))],[slide.Image,slide.DefaultImage]);
 const [failed,setFailed]=useState(0);
 return <div className="cl-beauty-visual">
  <div className="cl-beauty-art" aria-hidden="true"><BrandLogo dark/><i/><i/></div>
  {sources[failed]&&<img key={sources[failed]} src={sources[failed]} alt={`Imagen del banner de la colección ${slide.Label}; inspiración de belleza.`} fetchPriority={index===0?'high':'auto'} decoding="async" onError={()=>setFailed(n=>n+1)}/>}
  
  <div className="cl-beauty-caption"><strong>{slide.Note}</strong><span>COLORLENSES / BEAUTY IN EVERY LOOK</span></div>
 </div>;
}
export default function BeautyCarousel(){
 const [slides,setSlides]=useState(()=>mergeBanners([]));
 const [index,setIndex]=useState(0),[paused,setPaused]=useState(false),[hover,setHover]=useState(false),[focused,setFocused]=useState(false),[hidden,setHidden]=useState(false),[reduced,setReduced]=useState(false);
 const touch=useRef(null);
 useEffect(()=>{let live=true;request('/api/settings/banners').then(rows=>{if(live)setSlides(mergeBanners(rows,imageUrl));}).catch(()=>{});return()=>{live=false};},[]);
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const motion=()=>setReduced(media.matches),visibility=()=>setHidden(document.hidden);
  motion();visibility();media.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);
  return()=>{media.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility)};
 },[]);
 useEffect(()=>{
  if(paused||hover||focused||hidden||reduced)return;
  const timer=setInterval(()=>setIndex(i=>(i+1)%slides.length),7000);return()=>clearInterval(timer);
 },[paused,hover,focused,hidden,reduced,slides.length,index]);
 const slide=slides[index],go=n=>setIndex((n+slides.length)%slides.length);
 return <section className={`cl-beauty-hero cl-beauty-${slide.Theme}`} aria-roledescription="carrusel" aria-label="Colecciones ColorLenses"
  onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocusCapture={()=>setFocused(true)}
  onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false)}}
  onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();go(index+1)}if(e.key==='ArrowLeft'){e.preventDefault();go(index-1)}}}
  onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY}}}
  onTouchEnd={e=>{const a=touch.current,b=e.changedTouches[0];if(a){const dx=a.x-b.clientX,dy=a.y-b.clientY;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.4)go(index+(dx>0?1:-1));}touch.current=null}}
  onTouchCancel={()=>{touch.current=null}}>
  <div className="cl-beauty-stage" role="group" aria-roledescription="diapositiva" aria-label={`${index+1} de ${slides.length}: ${slide.Label}`}>
   <HeroPhoto key={`${slide.Id}-${slide.Image}`} slide={slide} index={index}/>
   <div className="cl-beauty-copy" key={slide.Id}>
    <span className="cl-beauty-eyebrow"><i/>{slide.Eyebrow}</span>
    <h1>{slide.Title}</h1><p>{slide.Subtitle}</p>
    <Link className="cl-beauty-cta" to={slide.ButtonLink}>{slide.ButtonText}<ArrowUpRight size={20}/></Link>
    <div className="cl-beauty-signature"><span/><span/><span/><small>Tu estilo empieza en tus ojos.</small></div>
   </div>
  </div>
  <div className="cl-beauty-controls"><div className="cl-beauty-tabs">{slides.map((s,i)=><button type="button" key={s.Id} className={i===index?'active':''} aria-pressed={i===index} aria-label={`Ver slide ${i+1}: ${s.Label}`} onClick={()=>go(i)}><small>0{i+1}</small><span>{s.Label}</span><ArrowUpRight size={16}/></button>)}</div>
   <div className="cl-beauty-playback"><button type="button" disabled={reduced} aria-label={reduced?'Cambio automático desactivado por movimiento reducido':paused?'Reanudar slides':'Pausar slides'} onClick={()=>setPaused(p=>!p)}>{paused||reduced?<Play size={18}/>:<Pause size={18}/>}</button><button type="button" className="cl-beauty-step" aria-label="Slide anterior" onClick={()=>go(index-1)}><ChevronLeft size={20}/></button><button type="button" className="cl-beauty-step" aria-label="Slide siguiente" onClick={()=>go(index+1)}><ChevronRight size={20}/></button></div>
  </div>
 </section>;
}
