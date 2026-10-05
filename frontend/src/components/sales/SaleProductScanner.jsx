import { useEffect,useRef,useState } from 'react';
import { Camera,Keyboard,RefreshCw } from 'lucide-react';
import Modal from '../Modal';
import CameraScanner from '../inventory/CameraScanner';
import { request } from '../../utils/api';
export default function SaleProductScanner({onClose,onProduct}) {
 const [mode,setMode]=useState('camera'),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const processing=useRef(false),controller=useRef(null),live=useRef(true),input=useRef(null);
 useEffect(()=>{live.current=true;return()=>{live.current=false;controller.current?.abort();};},[]);
 useEffect(()=>{if(mode==='manual')input.current?.focus();},[mode]);
 async function accept(value){
  if(processing.current)return;
  const clean=String(value||'').trim();
  if(!clean){setError('Escribe o escanea un código de producto.');return;}
  if(clean.length>190){setError('El código es demasiado largo.');return;}
  if(/\/(?:admin\/sales|card|customer)\//i.test(clean)){setError('Ese QR es de un cliente. Escanea el código de un producto.');return;}
  processing.current=true;setBusy(true);setError('');
  controller.current=new AbortController();
  try {
   const product=await request('/api/products/qr/'+encodeURIComponent(clean),{signal:controller.current.signal});
   if(!live.current)return;
   // The parent validates stock/cart. A failed add keeps this modal open.
   await onProduct(product);
   if(live.current)onClose(true);
  }catch(e){if(live.current)setError(e.message||'No se pudo leer el producto. Intenta de nuevo.');}
  finally{processing.current=false;if(live.current)setBusy(false);}
 }
 return <Modal title="Escanear producto" onClose={()=>onClose(false)} busy={busy} className="cl-sale-scanner-modal"><p className="cl-scanner-intro">Una lectura agrega una unidad. Después puedes ajustar la cantidad en la venta.</p><div className="cl-tabs" aria-label="Método de captura"><button type="button" className={mode==='camera'?'active':''} disabled={busy} onClick={()=>{setMode('camera');setError('');setAttempt(n=>n+1);}}><Camera size={17}/>Cámara</button><button type="button" className={mode==='manual'?'active':''} disabled={busy} onClick={()=>{setMode('manual');setError('');}}><Keyboard size={17}/>Lector USB / manual</button></div>
 {mode==='camera'&&!busy&&!error&&<CameraScanner key={attempt} onCode={accept}/>}
 {busy&&<div role="status" className="cl-report-state">Buscando producto y verificando existencias…</div>}
 {mode==='manual'&&<form className="cl-scanner-manual" onSubmit={e=>{e.preventDefault();accept(code);}}><label className="cl-field">Código QR / código de barras<input ref={input} value={code} autoComplete="off" onChange={e=>setCode(e.target.value)} disabled={busy} placeholder="Escanea con el lector o escribe el código"/></label><button type="submit" className="cl-button" disabled={busy}>Agregar producto</button></form>}
 {error&&<div className="cl-report-error" role="alert"><p>{error}</p>{mode==='camera'&&<button type="button" className="cl-button" onClick={()=>{setError('');setAttempt(n=>n+1);}}><RefreshCw size={16}/>Escanear otro código</button>}</div>}
 </Modal>;
}
