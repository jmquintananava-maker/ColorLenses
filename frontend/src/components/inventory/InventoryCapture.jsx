import { useRef,useState } from 'react';
import { Camera,Keyboard,Search,Plus,PackageCheck,ScanLine,ImagePlus,CheckCircle2,AlertTriangle,RotateCcw } from 'lucide-react';
import Modal from '../Modal';
import CameraScanner,{scanImage} from './CameraScanner';
import { request,uuid,imageUrl } from '../../utils/api';
const pendingRead=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
export default function InventoryCapture({session,brands,onClose,onSaved}){
 const storageKey=`cl-inventory-pending:${session.Id}`,qtyRef=useRef(null),processing=useRef(false),lookupSequence=useRef(0);
 const [pending,setPending]=useState(()=>pendingRead(storageKey)),[code,setCode]=useState(''),[quantity,setQuantity]=useState('1'),[brand,setBrand]=useState(session.Brand || ''),[method,setMethod]=useState('MANUAL'),[mode,setMode]=useState('camera'),[lookup,setLookup]=useState(null),[looking,setLooking]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(''),[cameraCycle,setCameraCycle]=useState(0);
 const stocktake=session.Kind==='STOCKTAKE';
 const newCode=lookup&&lookup.found===false;
 async function find(value,captureMethod='MANUAL'){
  const clean=String(value || '').trim();if(!clean||processing.current||pending)return;
  const seq=++lookupSequence.current;setCode(clean);setMethod(captureMethod);setLooking(true);setLookup(null);setError('');setSuccess('');
  try{const result=await request(`/api/inventory/lookup?code=${encodeURIComponent(clean)}&sessionId=${encodeURIComponent(session.Id)}`);if(seq!==lookupSequence.current)return;setLookup(result);setTimeout(()=>{qtyRef.current?.focus();qtyRef.current?.select()},80);}catch(e){if(seq===lookupSequence.current)setError(e.message)}finally{if(seq===lookupSequence.current)setLooking(false)}
 }
 function reset(){lookupSequence.current++;setCode('');setLookup(null);setQuantity('1');setError('');setLooking(false);setCameraCycle(n=>n+1)}
 async function commit(payload){
  if(processing.current)return;processing.current=true;setBusy(true);setError('');
  try{
   // La solicitud sobrevive a una desconexión o recarga. Reintentar conserva la clave.
   localStorage.setItem(storageKey,JSON.stringify(payload));setPending(payload);
   const result=await request(`/api/inventory/sessions/${session.Id}/lines`,{method:'POST',body:payload});
   localStorage.removeItem(storageKey);setPending(null);
   const line=result.line;setSuccess(`Guardado: ${line.Code} · +${line.Quantity} · Existencias confirmadas: ${line.StockAfter}${result.replayed?' (operación ya registrada; no se duplicó)':''}`);
   reset();await onSaved();
  }catch(e){
   setError(e.message || 'No se pudo guardar. Reintenta el mismo registro.');
   // Errores 4xx no modifican stock. En 5xx/red se conserva la operación para reconciliarla.
   if(e.status>=400&&e.status<500){localStorage.removeItem(storageKey);setPending(null);}
  }finally{processing.current=false;setBusy(false)}
 }
 function add(e){e.preventDefault();if(!lookup||looking||busy||pending||lookup.scopeError)return;const n=Number(quantity);if(!Number.isInteger(n)||n<1||n>1000000){setError('Indica una cantidad entera entre 1 y 1,000,000.');return;}if(newCode&&!stocktake&&!brand){setError('Selecciona la marca del código nuevo.');return;}
  commit({requestKey:uuid(),code:code.trim(),quantity:n,brand:stocktake?session.Brand:brand,method});
 }
 const product=lookup?.product,before=Number(product?.Stock || 0),after=before+Number(quantity || 0);
 const wrongBrand=stocktake&&product&&product.Marca.localeCompare(session.Brand,'es',{sensitivity:'base'})!==0;
 return <Modal title={stocktake?'Contar productos':'Recibir mercancía'} onClose={onClose} busy={busy} wide className="cl-capture-modal"><div className="cl-session-caption"><span>{session.Folio}</span><strong>{stocktake?`${session.Brand} · ${session.ScopeLabel}`:'La marca se identifica al escanear'}</strong></div>
 {pending&&<div className="cl-alert cl-alert-warning" role="alert"><AlertTriangle size={22}/><div><strong>Hay una captura pendiente de confirmación</strong><p>{pending.code} · {pending.quantity} unidades. Reintenta esta misma operación para confirmar si ya quedó guardada, sin duplicarla.</p><button className="cl-button" disabled={busy} onClick={()=>commit(pending)}><RotateCcw size={16}/>Reintentar registro pendiente</button></div></div>}
 {success&&<div className="cl-alert cl-alert-success" role="status"><CheckCircle2 size={20}/><span>{success}</span></div>}
 {error&&<div className="cl-alert cl-alert-error" role="alert">{error}</div>}
 <div className="cl-capture-grid"><section className="cl-capture-left"><div className="cl-tabs cl-tabs-compact"><button type="button" className={mode==='camera'?'active':''} onClick={()=>setMode('camera')} disabled={busy}><Camera size={17}/>Cámara</button><button type="button" className={mode==='manual'?'active':''} onClick={()=>setMode('manual')} disabled={busy}><Keyboard size={17}/>Manual / lector USB</button></div>
 {mode==='camera'&&!lookup&&!looking&&!pending&&!busy?<CameraScanner key={cameraCycle} onCode={find}/>:<div className="cl-scanner-rest">{lookup?<PackageCheck size={48}/>:<ScanLine size={48}/>}<h3>{lookup?'Código detectado':mode==='manual'?'Lector USB o captura manual':'Escáner en espera'}</h3><p>{lookup?'Revisa la cantidad y presiona Agregar.':mode==='manual'?'Enfoca el campo Código. Escanea con tu lector o escríbelo y presiona Enter.':looking?'Buscando el código…':'Confirma la captura pendiente antes de continuar.'}</p>{lookup&&<button type="button" className="cl-button" disabled={busy||!!pending} onClick={reset}>Escanear otro código</button>}</div>}
 <label className="cl-file-label"><ImagePlus size={17}/>Leer código desde una foto<input type="file" accept="image/*" disabled={busy||looking||!!pending} onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setMode('manual');try{const value=await scanImage(file);await find(value,'IMAGE')}catch(err){setError(String(err.message || 'No se pudo leer el código de la imagen.'))}}}/></label></section>
 <form className="cl-capture-form" onSubmit={add}><label className="cl-field">Código QR / código de barras<div className="cl-input-action"><input type="text" value={code} autoComplete="off" maxLength={512} spellCheck={false} placeholder="Escanea o escribe el código" disabled={busy||!!pending} onChange={e=>{lookupSequence.current++;setCode(e.target.value);setLookup(null);setLooking(false);setError('')}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();find(code,mode==='manual'?'SCANNER':'MANUAL')}}}/><button type="button" className="cl-icon-btn" aria-label="Buscar código" disabled={!code.trim()||busy||looking||!!pending} onClick={()=>find(code,'MANUAL')}><Search size={20}/></button></div></label>
 {looking&&<p className="cl-muted" role="status">Buscando también entre productos agotados e inactivos…</p>}
 {product&&<div className="cl-detected-product">{product.Image?<img src={imageUrl(product.Image)} alt=""/>:<PackageCheck size={28}/>}<div><span>{product.Marca}</span><h3>{product.Modelo}</h3><p>{product.Color || 'Color por confirmar'} · {Number(product.NeedsReview)?'Graduación por confirmar':product.PowerLabel}</p><small>{product.ScanCode}</small></div></div>}
 {lookup?.scopeError&&<div className="cl-alert cl-alert-error" role="alert">{lookup.scopeError}</div>}
 {newCode&&!lookup.scopeError&&<div className="cl-alert cl-alert-warning"><AlertTriangle size={20}/><span>Código nuevo. Se creará automáticamente como <strong>pendiente de completar</strong>, sin publicarlo en el catálogo.</span></div>}
 {!stocktake&&<label className="cl-field">Marca para códigos nuevos<select value={brand} disabled={busy||!!pending} onChange={e=>setBrand(e.target.value)}><option value="">Seleccionar solo si el código es nuevo</option>{brands.map(b=><option key={b} value={b}>{b}</option>)}</select><small>Para códigos existentes se usa su marca real, no esta selección.</small></label>}
 {product&&(product.VariantStatus==='Inactivo'||product.ProductStatus==='Inactivo')&&<p className="cl-muted">El producto está inactivo. La entrada aumenta el stock, pero no lo publica; podrás activarlo en Productos.</p>}
 <label className="cl-field">{stocktake?'Cantidad física contada':'Cantidad que llegó'}<input ref={qtyRef} className="cl-quantity" type="number" inputMode="numeric" min="1" max="1000000" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)} disabled={busy||!!pending} required/></label>
 <div className="cl-stock-preview"><div><small>{stocktake?'Contado hasta ahora':'Existencias actuales'}</small><strong>{lookup?before:'—'}</strong></div><span>+</span><div><small>{stocktake?'Agregar al conteo':'Recibidas'}</small><strong>{quantity || 0}</strong></div><span>=</span><div><small>Nuevo stock</small><strong>{lookup?after:'—'}</strong></div></div>
 <button type="submit" className="cl-button cl-button-dark cl-button-block" disabled={busy||looking||!lookup||!!pending||wrongBrand||!!lookup?.scopeError}><Plus size={20}/>{busy?'Guardando…':'Agregar cantidad'}</button><small className="cl-muted">Cada captura suma la cantidad indicada. El stock definitivo se confirma al guardar; no se agrega al detectar el código.</small></form></div>
 </Modal>;
}
