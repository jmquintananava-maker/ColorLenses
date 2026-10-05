import clNatural30 from '../assets/contemporary/natural.webp';
import clDoll30 from '../assets/contemporary/muneca.webp';
import clHalloween30 from '../assets/contemporary/halloween.webp';
// Datos por defecto y enlaces internos del carrusel, independientes del editor de banners.
export const editorialSlides = [
 {Id:'natural',Title:'Tu mirada.\nTu universo.',Subtitle:'El detalle que cambia todo. Colores naturales para una mirada inconfundiblemente tuya.',ButtonText:'Encuentra tu natural',ButtonLink:'/catalog?category=natural',Image:clNatural30,Eyebrow:'01 / COLECCIÓN NATURAL',Note:'Sutil. Personal. Inconfundible.',Theme:'natural',Label:'Natural'},
 {Id:'muneca',Title:'Amplifica\ntu mirada.',Subtitle:'Iris con un efecto visual más amplio. Descubre una mirada dulce, expresiva y protagonista.',ButtonText:'Descubre efecto muñeca',ButtonLink:'/catalog?category=muneca',Image:clDoll30,Eyebrow:'02 / EFECTO MUÑECA',Note:'Expresa tu lado más creativo.',Theme:'doll',Label:'Muñeca'},
 {Id:'halloween',Title:'Después\ndel anochecer.',Subtitle:'Pupilentes de fantasía para dar vida a tu personaje. Lleva tu próxima transformación más allá.',ButtonText:'Explora Halloween',ButtonLink:'/catalog?category=halloween',Image:clHalloween30,Eyebrow:'03 / HALLOWEEN & FANTASÍA',Note:'Un personaje. Tu propia versión.',Theme:'night',Label:'Halloween'}
];
export function internalBannerLink(value, fallback='/catalog') {
 const raw=String(value||'').trim();
 if(!raw||raw.startsWith('//')||raw.includes('\\'))return fallback;
 try {
  const parsed=new URL(raw,'https://colorlenses.com.mx');
  if(!['http:','https:'].includes(parsed.protocol)||!['colorlenses.com.mx','www.colorlenses.com.mx','localhost','127.0.0.1','[::1]'].includes(parsed.hostname))return fallback;
  if(!parsed.pathname.startsWith('/')||parsed.pathname.startsWith('//'))return fallback;
  return parsed.pathname+parsed.search+parsed.hash;
 } catch{return fallback;}
}
export function mergeBanners(rows, resolveImage=value=>value){
 const sorted=(Array.isArray(rows)?rows:[]).filter(b=>b.Status!=='Inactivo').slice().sort((a,b)=>Number(a.DisplayOrder)-Number(b.DisplayOrder)||Number(a.Id)-Number(b.Id));
 return editorialSlides.map((defaults,i)=>{
  const b=sorted[i]||{};const merged={...defaults,DefaultImage:defaults.Image};
  for(const field of ['Title','Subtitle','ButtonText']) if(typeof b[field]==='string'&&b[field].trim())merged[field]=b[field].trim();
  merged.ButtonLink=internalBannerLink(b.ButtonLink,defaults.ButtonLink);
  merged.Image=b.Image?resolveImage(b.Image):defaults.Image;
  return merged;
 });
}
