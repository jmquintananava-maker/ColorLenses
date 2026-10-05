import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
// Content is never permanently hidden by CSS. Failure or reduced motion leaves it readable.
const selector='.cl-section-heading,.cl-collection-card,.cl-lens-card,.cl-service-strip>span,.cl-brand-strip,.cl-beauty-note,.cl-footer,.admin-header,.cl-kpi-card,.cl-dashboard-panel';
export default function MotionEnhancer(){
 const location=useLocation();
 useEffect(()=>{
  if(!('IntersectionObserver' in window)||!Element.prototype.animate)return;
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const done=new WeakSet(),animations=new Set();let queued=0;
  const observer=new IntersectionObserver(entries=>{
   entries.forEach(({target,isIntersecting})=>{
    if(!isIntersecting)return;observer.unobserve(target);
    if(done.has(target)||media.matches)return;done.add(target);
    const siblings=[...target.parentElement.children],rank=siblings.indexOf(target)%4;
    const animation=target.animate([{opacity:0,transform:'translateY(24px) scale(.993)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:650,delay:rank*65,easing:'cubic-bezier(.2,.75,.25,1)',fill:'backwards'});
    animations.add(animation);animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));
   });
  },{threshold:.06,rootMargin:'0px 0px -28px 0px'});
  function scan(){queued=0;if(media.matches)return;document.querySelectorAll(selector).forEach(node=>{if(!done.has(node))observer.observe(node);});}
  const mutations=new MutationObserver(()=>{if(!queued)queued=requestAnimationFrame(scan);});
  const changed=()=>{if(media.matches){animations.forEach(a=>a.cancel());observer.disconnect();}else scan();};
  media.addEventListener('change',changed);scan();mutations.observe(document.getElementById('root'),{subtree:true,childList:true});
  return()=>{if(queued)cancelAnimationFrame(queued);observer.disconnect();mutations.disconnect();media.removeEventListener('change',changed);animations.forEach(a=>a.cancel());};
 },[location.pathname]);
 return null;
}
