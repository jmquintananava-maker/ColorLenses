import { useEffect,useRef,useState } from 'react';
import { Camera,Keyboard,Search,Plus,PackageCheck,ScanLine,ImagePlus,CheckCircle2,AlertTriangle,RotateCcw } from 'lucide-react';
import Modal from '../Modal';
import CameraScanner,{scanImage} from './CameraScanner';
import { request,uuid,imageUrl } from '../../utils/api';
const pendingRead=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
const emptyProduct=()=>({model:'',category:'',color:'',price:'',power:''});
export default function InventoryCapture({session,brands,onClose,onSaved}){
 const storageKey=`cl-inventory-pending:${session.Id}`,qtyRef=useRef(null),fieldRefs=useRef({}),processing=useRef(false),lookupSequence=useRef(0);
 const [pending,setPending]=useState(()=>pendingRead(storageKey)),[code,setCode]=useState(''),[quantity,setQuantity]=useState('1'),[brand,setBrand]=useState(session.Brand || ''),[method,setMethod]=useState('MANUAL'),[mode,setMode]=useState('camera'),[lookup,setLookup]=useState(null),[looking,setLooking]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(''),[cameraCycle,setCameraCycle]=useState(0);
 const [newProduct,setNewProduct]=useState(emptyProduct),[fieldErrors,setFieldErrors]=useState({}),[options,setOptions]=useState({categories:[],colors:[],powers:[]}),[optionsError,setOptionsError]=useState(''),[optionsLoading,setOptionsLoading]=useState(false),[optionsCycle,setOptionsCycle]=useState(0);
 const [association,setAssociation]=useState(null),[matches,setMatches]=useState([]);
 const stocktake=session.Kind==='STOCKTAKE',newCode=lookup?.found===false,registering=newCode&&!stocktake&&!lookup?.scopeError;
 const knownCode=lookup?.found===true&&!lookup?.scopeError,invalidCode=!!lookup?.scopeError;
 const disabled=busy||!!pending;
 useEffect(()=>{
  if(stocktake)return;let live=true;setOptionsLoading(true);setOptionsError('');
  Promise.all([request('/api/settings/categories'),request('/api/settings/colors'),request('/api/powers')]).then(([categories,colors,powers])=>{
   if(![categories,colors,powers].every(Array.isArray))throw new Error('Los catálogos no devolvieron una lista válida.');
   if(live)setOptions({categories,colors,powers});
  }).catch(e=>{if(live)setOptionsError(e.message||'No se pudieron cargar los catálogos.')}).finally(()=>live&&setOptionsLoading(false));
  return()=>{live=false};
 },[stocktake,optionsCycle]);
 function clearField(name){setFieldErrors(current=>{const next={...current};delete next[name];return next});}
 function updateProduct(name,value){setNewProduct(current=>({...current,[name]:value}));clearField(name);}
 function showFields(fields,message){setFieldErrors(fields);setError(message);const first=Object.keys(fields)[0];setTimeout(()=>{(first==='quantity'?qtyRef.current:fieldRefs.current[first])?.focus()},0);}
 function chooseMatch(product,scannedCode=code){setLookup({found:true,product,scopeError:null});setAssociation({code:scannedCode,variantId:product.ProductVariantId,token:product.LinkToken});setMatches([]);setFieldErrors({});setError('');}
 async function find(value,captureMethod='MANUAL'){
  const clean=String(value || '').trim();if(!clean||processing.current||pending)return;
  const seq=++lookupSequence.current;setCode(clean);setMethod(captureMethod);setLooking(true);setLookup(null);setAssociation(null);setMatches([]);setError('');setSuccess('');setFieldErrors({});setNewProduct(emptyProduct());
  try{const result=await request(`/api/inventory/lookup?code=${encodeURIComponent(clean)}&sessionId=${encodeURIComponent(session.Id)}`);if(seq!==lookupSequence.current)return;setLookup(result);setTimeout(()=>{qtyRef.current?.focus();qtyRef.current?.select()},80);}catch(e){if(seq===lookupSequence.current)setError(e.message)}finally{if(seq===lookupSequence.current)setLooking(false)}
 }
 function reset(){lookupSequence.current++;setCode('');setLookup(null);setAssociation(null);setMatches([]);setQuantity('1');setNewProduct(emptyProduct());setFieldErrors({});setError('');setLooking(false);setCameraCycle(n=>n+1)}
 async function commit(payload){
  if(processing.current)return;processing.current=true;setBusy(true);setError('');
  try{
   // Conservar también los datos nuevos al reintentar, sin duplicar producto ni stock.
   localStorage.setItem(storageKey,JSON.stringify(payload));setPending(payload);
   const result=await request(`/api/inventory/sessions/${session.Id}/lines`,{method:'POST',body:payload});
   localStorage.removeItem(storageKey);setPending(null);
   const line=result.line;setSuccess(`Guardado: ${line.Code} · +${line.Quantity} · Existencias confirmadas: ${line.StockAfter}${result.replayed?' (operación ya registrada; no se duplicó)':''}${payload.newProduct?' · Datos guardados; completa las fotos en Productos.':''}${payload.existingVariantId?' · Código asociado al producto existente.':''}`);
   reset();await onSaved();
  }catch(e){
   if(e.code==='VARIANT_ALREADY_EXISTS'&&e.details?.matches?.length){
    if(e.details.matches.length===1)chooseMatch(e.details.matches[0],payload.code);
    else {setMatches(e.details.matches);setError('Hay varias coincidencias. Elige el producto correcto revisando sus códigos.');}
   }else if(e.details?.fields)showFields(e.details.fields,e.message);else setError(e.message || 'No se pudo guardar. Reintenta el mismo registro.');
   if(e.status>=400&&e.status<500){localStorage.removeItem(storageKey);setPending(null);}
  }finally{processing.current=false;setBusy(false)}
 }
 function add(e){
  e.preventDefault();if(!lookup||looking||disabled||lookup.scopeError||matches.length)return;
  const fields={},n=Number(quantity);
  if(!Number.isInteger(n)||n<1||n>1000000||!String(quantity).trim())fields.quantity='Indica una cantidad entera entre 1 y 1,000,000.';
  if(registering){
   if(!brand.trim())fields.brand='Selecciona la marca.';
   if(!newProduct.model.trim())fields.model='Escribe el nombre / modelo.';
   if(!newProduct.category)fields.category='Selecciona la categoría.';
   if(!newProduct.color.trim())fields.color='Escribe el color.';
   if(!/^\d{1,8}(?:[.,]\d{1,2})?$/.test(newProduct.price.trim())||Number(newProduct.price.replace(',','.'))<=0)fields.price='Indica un precio mayor que cero, con máximo dos decimales.';
   if(newProduct.power==='')fields.power='Selecciona la graduación.';
  }
  if(Object.keys(fields).length){showFields(fields,'Completa los campos marcados en rojo antes de agregar.');return;}
  if(registering&&(optionsLoading||optionsError)){setError('Espera a que se carguen los catálogos o pulsa Reintentar catálogos.');return;}
  setFieldErrors({});
  commit({requestKey:uuid(),code:code.trim(),quantity:n,brand:stocktake?session.Brand:brand,method,...(association?{existingVariantId:association.variantId,confirmLink:true,linkToken:association.token}:{}),...(registering?{newProduct:{...newProduct,model:newProduct.model.trim(),color:newProduct.color.trim(),price:newProduct.price.trim().replace(',','.')}}:{})});
 }
 const product=lookup?.product,before=Number(product?.Stock || 0),after=before+Number(quantity || 0);
 const wrongBrand=stocktake&&product&&String(product.Marca).trim().localeCompare(String(session.Brand).trim(),'es',{sensitivity:'base'})!==0;
 const fieldProps=name=>({ref:el=>{fieldRefs.current[name]=el},'aria-invalid':!!fieldErrors[name],'aria-describedby':fieldErrors[name]?`receipt-${session.Id}-${name}-error`:undefined});
 const fieldError=name=>fieldErrors[name]&&<small className="cl-field-error" id={`receipt-${session.Id}-${name}-error`}>{fieldErrors[name]}</small>;
 const fieldClass=name=>'cl-field'+(fieldErrors[name]?' cl-field-invalid':'');
 return <Modal title={stocktake?'Contar productos':'Recibir mercancía'} onClose={onClose} busy={busy} wide className={`cl-capture-modal ${newCode||invalidCode?'cl-capture-new':knownCode?'cl-capture-known':''}`}><div className="cl-session-caption"><span>{session.Folio}</span><strong>{stocktake?`${session.Brand} · ${session.ScopeLabel}`:'La marca se identifica al escanear'}</strong></div>
 {pending&&<div className="cl-alert cl-alert-warning" role="alert"><AlertTriangle size={22}/><div><strong>Hay una captura pendiente de confirmación</strong><p>{pending.code} · {pending.quantity} unidades{pending.newProduct?` · ${pending.newProduct.model}`:''}. Reintenta para confirmar si ya quedó guardada, sin duplicarla.</p><button className="cl-button" disabled={busy} onClick={()=>commit(pending)}><RotateCcw size={16}/>Reintentar registro pendiente</button></div></div>}
 {success&&<div className="cl-alert cl-alert-success" role="status"><CheckCircle2 size={20}/><span>{success}</span></div>}
 {error&&<div className="cl-alert cl-alert-error" role="alert">{error}</div>}
 <div className="cl-capture-grid"><section className="cl-capture-left"><div className="cl-tabs cl-tabs-compact"><button type="button" className={mode==='camera'?'active':''} onClick={()=>setMode('camera')} disabled={disabled}><Camera size={17}/>Cámara</button><button type="button" className={mode==='manual'?'active':''} onClick={()=>setMode('manual')} disabled={disabled}><Keyboard size={17}/>Manual / lector USB</button></div>
 {mode==='camera'&&!lookup&&!looking&&!pending&&!busy?<CameraScanner key={cameraCycle} onCode={find}/>:<div className={`cl-scanner-rest ${newCode||invalidCode?'cl-scan-new':knownCode?'cl-scan-known':''}`} role={newCode||invalidCode?'alert':'status'}>{newCode||invalidCode?<AlertTriangle size={34}/>:knownCode?<CheckCircle2 size={34}/>:<ScanLine size={48}/>}<h3>{invalidCode?'Fuera del alcance':newCode?'Código no registrado':association?'Producto encontrado':knownCode?'Producto registrado':mode==='manual'?'Lector USB o captura manual':'Escáner en espera'}</h3><p>{invalidCode?'Este producto no puede agregarse a este conteo.':registering?'Captura sus datos para comprobar si es nuevo o si ya existe con otro código.':newCode?'Código nuevo; sus datos quedan pendientes en Productos.':association?'Este producto ya existe. Revisa la coincidencia para asociar el código escaneado.':knownCode?'Ya existe en la base de datos. Solo agrega la cantidad.':looking?'Buscando el código…':pending?'Confirma la captura pendiente antes de continuar.':'Escanea con tu lector o escribe el código y presiona Enter.'}</p>{lookup&&<button type="button" className="cl-button" disabled={disabled} onClick={reset}>Escanear otro código</button>}</div>}
 {!lookup&&<label className="cl-file-label"><ImagePlus size={17}/>Leer código desde una foto<input type="file" accept="image/*" disabled={disabled||looking} onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setMode('manual');try{const value=await scanImage(file);await find(value,'IMAGE')}catch(err){setError(String(err.message || 'No se pudo leer el código de la imagen.'))}}}/></label>}</section>
 <form className="cl-capture-form" onSubmit={add} noValidate><label className="cl-field">Código QR / código de barras<div className="cl-input-action"><input type="text" value={code} autoComplete="off" maxLength={512} spellCheck={false} placeholder="Escanea o escribe el código" disabled={disabled} onChange={e=>{lookupSequence.current++;setCode(e.target.value);setLookup(null);setAssociation(null);setMatches([]);setLooking(false);setError('');setFieldErrors({});setNewProduct(emptyProduct());}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();find(code,mode==='manual'?'SCANNER':'MANUAL')}}}/><button type="button" className="cl-icon-btn" aria-label="Buscar código" disabled={!code.trim()||disabled||looking} onClick={()=>find(code,'MANUAL')}><Search size={20}/></button></div></label>
 {looking&&<p className="cl-muted" role="status">Buscando también entre productos agotados e inactivos…</p>}
 {product&&<div className="cl-detected-product">{product.Image?<img src={imageUrl(product.Image)} alt=""/>:<PackageCheck size={28}/>}<div><span>{product.Marca}</span><h3>{product.Modelo}</h3><p>{product.Color || 'Color por confirmar'} · {product.PowerLabel||'Graduación por confirmar'}</p><small>{product.ScanCode}</small></div></div>}
 {lookup?.scopeError&&<div className="cl-alert cl-alert-error" role="alert">{lookup.scopeError}</div>}
 {association&&<div className="cl-alert cl-alert-warning cl-code-association" role="status"><div><strong>Este producto tiene otro código</strong><p>{product.Category} · {product.Color} · {product.PowerLabel||'Graduación por confirmar'} · Precio guardado: ${Number(product.Price||0).toFixed(2)}</p><p>Códigos actuales: {[...new Set([product.ScanCode,product.FactoryCode,product.InternalCode].filter(Boolean))].join(' · ')||'Sin código visible'}</p><p>Al confirmar, <strong>{association.code}</strong> también identificará este producto y se sumarán <strong>{quantity||0} unidades</strong>. Se conservarán sus datos y códigos anteriores.</p><button type="button" className="cl-button" disabled={disabled} onClick={()=>{setAssociation(null);setLookup({found:false,product:null});setError('');}}>Corregir los datos del producto</button></div></div>}
 {!!matches.length&&<div className="cl-code-matches" role="alert"><h3>Selecciona el producto correcto</h3>{matches.map(match=><article key={match.ProductVariantId}><strong>{match.Marca} · {match.Modelo}</strong><p>{match.Category} · {match.Color} · {match.PowerLabel||'Graduación por confirmar'}</p><p>Código: {match.ScanCode||match.FactoryCode||match.InternalCode||'Sin código'} · Stock: {match.Stock}</p><button type="button" className="cl-button" disabled={disabled} onClick={()=>chooseMatch(match)}>Revisar esta variante</button></article>)}</div>}
 <div className="cl-receipt-action"><label className={fieldClass('quantity')}>{stocktake?'Cantidad física contada':'Cantidad que llegó'}<input ref={qtyRef} className="cl-quantity" type="number" inputMode="numeric" min="1" max="1000000" step="1" value={quantity} onChange={e=>{setQuantity(e.target.value);clearField('quantity')}} disabled={disabled} required aria-invalid={!!fieldErrors.quantity} aria-describedby={fieldErrors.quantity?`receipt-${session.Id}-quantity-error`:undefined}/>{fieldError('quantity')}</label>
 <div className="cl-stock-preview"><div><small>{stocktake?'Contado hasta ahora':'Existencias actuales'}</small><strong>{lookup?before:'—'}</strong></div><span>+</span><div><small>{stocktake?'Agregar al conteo':'Recibidas'}</small><strong>{quantity || 0}</strong></div><span>=</span><div><small>Nuevo stock</small><strong>{lookup?after:'—'}</strong></div></div>
 <button type="submit" className="cl-button cl-button-dark cl-button-block" disabled={disabled||looking||!lookup||wrongBrand||invalidCode||!!matches.length}><Plus size={20}/>{busy?'Guardando…':association?'Asociar código y agregar cantidad':'Agregar cantidad'}</button></div>
 {registering&&<fieldset className="cl-receipt-product"><legend>Datos del producto nuevo</legend><p>Completa estos datos una sola vez. Las fotos se agregan después desde Productos.</p>
 {optionsError&&<div className="cl-alert cl-alert-error"><span>{optionsError}</span><button type="button" className="cl-button" disabled={optionsLoading} onClick={()=>setOptionsCycle(n=>n+1)}>Reintentar catálogos</button></div>}
 <label className={fieldClass('brand')}>Marca para código nuevo<select {...fieldProps('brand')} value={brand} disabled={disabled} onChange={e=>{setBrand(e.target.value);clearField('brand')}} required><option value="">Selecciona la marca</option>{brands.map(b=><option key={b} value={b}>{b}</option>)}</select>{fieldError('brand')}</label>
 <label className={fieldClass('model')}>Nombre / modelo<input {...fieldProps('model')} type="text" value={newProduct.model} maxLength={255} placeholder="Ej. Cleopatra" disabled={disabled} onChange={e=>updateProduct('model',e.target.value)} required/>{fieldError('model')}</label>
 <div className="cl-receipt-fields"><label className={fieldClass('category')}>Categoría<select {...fieldProps('category')} value={newProduct.category} disabled={disabled||optionsLoading||!!optionsError} onChange={e=>updateProduct('category',e.target.value)} required><option value="">{optionsLoading?'Cargando…':'Selecciona'}</option>{options.categories.map(c=><option key={c.Id||c.Name} value={c.Name}>{c.Name}</option>)}</select>{fieldError('category')}</label>
 <label className={fieldClass('color')}>Color<input {...fieldProps('color')} type="text" list={`receipt-${session.Id}-colors`} value={newProduct.color} maxLength={190} placeholder="Ej. Miel" disabled={disabled} onChange={e=>updateProduct('color',e.target.value)} required/><datalist id={`receipt-${session.Id}-colors`}>{options.colors.map(c=><option key={c.Id||c.Name} value={c.Name}/>)}</datalist>{fieldError('color')}</label>
 <label className={fieldClass('price')}>Precio de venta (MXN)<input {...fieldProps('price')} type="text" inputMode="decimal" value={newProduct.price} maxLength={20} placeholder="Ej. 250.00" disabled={disabled} onChange={e=>updateProduct('price',e.target.value)} required/>{fieldError('price')}</label>
 <label className={fieldClass('power')}>Graduación<select {...fieldProps('power')} value={newProduct.power} disabled={disabled||optionsLoading||!!optionsError} onChange={e=>updateProduct('power',e.target.value)} required><option value="">Selecciona</option><option value="0">Sin graduación</option>{options.powers.filter(p=>p.Power!=null&&Number(p.Power)!==0).map(p=><option key={p.Id||p.Power} value={String(Number(p.Power))}>{p.PowerLabel||Number(p.Power).toFixed(2)}</option>)}</select>{fieldError('power')}</label></div>
 <small className="cl-muted">El producto se guarda con estos datos en Pendientes de completar; podrás agregar sus fotos y publicarlo desde Productos.</small></fieldset>}
 {newCode&&stocktake&&!invalidCode&&<p className="cl-muted">Código nuevo: sus datos se completan en Productos.</p>}
 {product&&(product.VariantStatus==='Inactivo'||product.ProductStatus==='Inactivo')&&<p className="cl-muted">El producto está inactivo. Recibir aumenta su stock; podrás completar sus fotos y publicarlo en Productos.</p>}
 <small className="cl-muted">El stock definitivo se confirma al guardar; detectar el código no suma unidades.</small></form></div>
 </Modal>;
}
