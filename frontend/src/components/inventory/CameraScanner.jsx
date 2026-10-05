import { useEffect,useId,useRef,useState } from 'react';
import { Html5Qrcode,Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera,RefreshCw } from 'lucide-react';
const formats=['QR_CODE','CODE_128','CODE_39','CODE_93','EAN_13','EAN_8','UPC_A','UPC_E','ITF','DATA_MATRIX','PDF_417'].map(k=>Html5QrcodeSupportedFormats[k]).filter(v=>v!==undefined);
export default function CameraScanner({onCode}){
 const uid=useId().replace(/[^a-z0-9]/gi,''),id=`cl-reader-${uid}`;
 const handler=useRef(onCode),[error,setError]=useState(''),[ready,setReady]=useState(false),[camera,setCamera]=useState(''),[cameras,setCameras]=useState([]),[attempt,setAttempt]=useState(0);
 handler.current=onCode;
 useEffect(()=>{
  let disposed=false,accepted=false;
  const scanner=new Html5Qrcode(id,{formatsToSupport:formats,verbose:false});
  setReady(false);setError('');
  const starting=(async()=>{
   if(!window.isSecureContext)throw new Error('La cámara necesita HTTPS o localhost. Puedes usar lector USB o captura manual.');
   await scanner.start(camera?{deviceId:{exact:camera}}:{facingMode:'environment'},{fps:10,qrbox:(w,h)=>({width:Math.max(50,Math.min(Math.floor(w*.86),340)),height:Math.max(50,Math.min(Math.floor(h*.66),220))})},decoded=>{
     if(disposed||accepted)return;accepted=true;handler.current(decoded,'CAMERA');
   },()=>{});
   if(!disposed){setReady(true);Html5Qrcode.getCameras().then(list=>{if(!disposed)setCameras(list)}).catch(()=>{});}
  })().catch(e=>{if(!disposed)setError(typeof e==='string'?e:e.message || 'No se pudo abrir la cámara. Permite el acceso o usa captura manual.');});
  return()=>{
   disposed=true;
   // Esperar start evita dejar cámara encendida si se cierra el modal durante el permiso.
   starting.finally(async()=>{try{if(scanner.isScanning)await scanner.stop();}catch{}try{scanner.clear();}catch{}});
  };
 },[id,camera,attempt]);
 return <div className="cl-camera"><div className="cl-camera-status"><span className={ready?'ready':''}/>{ready?'Cámara activa · QR y código de barras':'Preparando cámara…'}</div><div id={id} className="cl-camera-reader"/>{error?<div className="cl-camera-error" role="status"><Camera size={30}/><strong>No se pudo iniciar la cámara</strong><p>{error}</p><button type="button" className="cl-button" onClick={()=>setAttempt(v=>v+1)}><RefreshCw size={15}/>Reintentar</button></div>:<p className="cl-camera-hint">Coloca el código dentro del recuadro. Mantén el envase quieto y bien iluminado.</p>}{cameras.length>1&&<label className="cl-field">Cámara<select value={camera} onChange={e=>setCamera(e.target.value)}><option value="">Trasera / automática</option>{cameras.map((c,i)=><option value={c.id} key={c.id}>{c.label || `Cámara ${i+1}`}</option>)}</select></label>}</div>;
}
export async function scanImage(file){
 if(!file || !file.type.startsWith('image/'))throw new Error('Selecciona una imagen del código.');
 const node=document.createElement('div');node.id=`cl-file-${Date.now()}`;node.style.cssText='position:fixed;left:-9999px;top:0;width:500px';document.body.append(node);
 const scanner=new Html5Qrcode(node.id,{formatsToSupport:formats,verbose:false});
 try{return await scanner.scanFile(file,false);}finally{try{scanner.clear()}catch{}node.remove();}
}
