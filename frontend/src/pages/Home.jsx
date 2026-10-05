import { useMemo,useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import { Search,ArrowUpRight,Eye,SlidersHorizontal,MessageCircle,Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import WhatsAppButton from '../components/WhatsAppButton';
import BeautyCarousel,{editorialSlides} from '../components/BeautyCarousel';
import LensCard from '../components/LensCard';
import ProductQuickView from '../components/ProductQuickView';
import SiteFooter from '../components/SiteFooter';
import { useCatalog,groupProducts } from '../utils/catalog';
import { categoryKey } from '../utils/productFilters';
const styles=[{id:'natural',number:'01',title:'Naturalmente tú.',copy:'Sutiles. Versátiles. Muy tuyos.',label:'Natural'},{id:'muneca',number:'02',title:'Más expresión.',copy:'Tu mirada, protagonista.',label:'Muñeca'},{id:'halloween',number:'03',title:'Fuera de lo común.',copy:'Un look fuera de lo ordinario.',label:'Halloween'}];
export default function Home(){
 const [menu,setMenu]=useState(false),[selected,setSelected]=useState(null),[category,setCategory]=useState('all'),[search,setSearch]=useState('');
 const {products,loading,error,retry}=useCatalog(),navigate=useNavigate();
 const featured=useMemo(()=>groupProducts(products).filter(p=>category==='all'||categoryKey(p.Category)===category).sort((a,b)=>(b.TotalStock>0)-(a.TotalStock>0)||Number(b.ProductVariantId)-Number(a.ProductVariantId)).slice(0,8),[products,category]);
 const brands=useMemo(()=>[...new Set(products.map(p=>p.Marca).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')).slice(0,8),[products]);
 return <div className="app cl-storefront"><Navbar setIsOpen={setMenu}/><Sidebar isOpen={menu} setIsOpen={setMenu}/><main>
 <BeautyCarousel/>
 <div className="cl-service-strip"><span><Eye size={21}/><strong>COLOR CON PERSONALIDAD</strong><small>Natural, muñeca y fantasía</small></span><span><SlidersHorizontal size={21}/><strong>ENCUENTRA TU COMBINACIÓN</strong><small>Marcas, colores y graduaciones</small></span><span><MessageCircle size={21}/><strong>HABLEMOS DE TU MIRADA</strong><small>Atención por WhatsApp</small></span></div>
 <section className="cl-section cl-universe"><div className="cl-section-heading"><div><span className="cl-eyebrow">ELIGE TU MOOD / 01—03</span><h2>Tu mirada,<br/><em>en otra dimensión.</em></h2></div><p>Un cambio sutil o toda una transformación.<br/>Hoy, tú decides.</p></div><div className="cl-collection-grid">{styles.map((s,i)=><Link to={`/catalog?category=${s.id}`} className={`cl-collection-card cl-collection-${s.id}`} key={s.id}><img className="cl-collection-photo" src={editorialSlides[i].Image} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display='none'}}/><div className="cl-collection-veil"/><span className="cl-collection-number">{s.number} / THE {i===0?'NATURAL':i===1?'DOLL':'AFTER DARK'} EDIT</span><div className="cl-collection-iris" aria-hidden="true"/><div className="cl-collection-text"><span>{s.label}</span><h3>{s.title}</h3><p>{s.copy}</p></div><span className="cl-collection-arrow"><ArrowUpRight size={23}/></span></Link>)}</div></section>
 {brands.length>0&&<div className="cl-brand-strip"><span>TUS MARCAS, AQUÍ.</span><div>{brands.map(b=><Link key={b} to={`/catalog?brands=${encodeURIComponent(b)}`}>{b}</Link>)}</div></div>}
 <section className="cl-section cl-discover"><div className="cl-section-heading"><div><span className="cl-eyebrow">EL SIGUIENTE COLOR ES TUYO</span><h2>Encuentra tu<br/><em>siguiente favorito.</em></h2></div><Link className="cl-underlined-link" to="/catalog">Explorar todo <ArrowUpRight size={18}/></Link></div><div className="cl-discover-tools"><div className="cl-tabs" aria-label="Estilo de lentes">{[{id:'all',label:'Todos'},...styles].map(s=><button className={s.id===category?'active':''} aria-pressed={s.id===category} key={s.id} onClick={()=>setCategory(s.id)}>{s.label}</button>)}</div><form className="cl-search" onSubmit={e=>{e.preventDefault();navigate('/catalog?q='+encodeURIComponent(search))}}><Search size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Marca, color, graduación…" aria-label="Buscar en el catálogo"/><button type="submit" aria-label="Buscar"><ArrowUpRight size={20}/></button></form></div>
 {loading?<div className="cl-loading-grid">{[0,1,2,3].map(n=><div className="cl-skeleton" key={n}/>)}</div>:error?<div className="cl-empty" role="alert"><h3>No pudimos cargar la colección</h3><p>{error}</p><button className="cl-button" onClick={retry}>Volver a intentar</button></div>:featured.length?<div className="cl-products-grid">{featured.map(p=><LensCard key={`${p.ProductId}-${p.Color}`} product={p} onOpen={setSelected}/>)}</div>:<div className="cl-empty"><Sparkles size={26}/><h3>La colección se está preparando</h3><p>Consulta el catálogo completo o escríbenos para conocer las opciones.</p><Link to="/catalog" className="cl-button">Explorar catálogo</Link></div>}
 </section><section className="cl-beauty-note"><div><span className="cl-eyebrow">PEQUEÑO CAMBIO. GRAN ACTITUD.</span><h2>Todo empieza<br/><em>con tu mirada.</em></h2><Link className="cl-button cl-button-dark" to="/catalog">Encuentra tu color <ArrowUpRight size={19}/></Link></div><div className="cl-note-eye" aria-hidden="true"><div className="cl-mini-iris"/><span>COLOR<br/>IS YOU.</span></div></section>
 </main><SiteFooter/><BottomNav/><WhatsAppButton/>{selected&&<ProductQuickView product={selected} onClose={()=>setSelected(null)}/>}</div>;
}
