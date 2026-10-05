export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export class ApiError extends Error {
  constructor(message, status, code, details) { super(message); this.status=status; this.code=code; this.details=details; }
}
export function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const target = new URL(url, window.location.origin);
  const base = new URL(API_URL || window.location.origin, window.location.origin);
  const token = localStorage.getItem('adminToken');
  if (token && target.origin === base.origin && target.pathname.startsWith('/api/')) headers.set('Authorization',`Bearer ${token}`);
  return window.fetch(url,{...options,headers}).then(response=>{
    if(response.status===401 && window.location.pathname.startsWith('/admin') && !target.pathname.endsWith('/auth/login')) window.dispatchEvent(new Event('adminSessionExpired'));
    return response;
  });
}
export async function request(path, options = {}) {
  const opts={...options};
  if (opts.body && !(opts.body instanceof FormData) && typeof opts.body !== 'string') {
    opts.body=JSON.stringify(opts.body); opts.headers={...opts.headers,'Content-Type':'application/json'};
  }
  let response;
  try { response=await apiFetch(`${API_URL}${path}`,opts); } catch { throw new ApiError('No se pudo conectar. Verifica tu red; no repitas la captura con otro identificador.',0,'NETWORK'); }
  const data=await response.json().catch(()=>({message:'El servidor no devolvió una respuesta válida.'}));
  if(!response.ok) throw new ApiError(data.message || 'No se pudo completar la operación.',response.status,data.code,data.details);
  return data;
}
export async function downloadExcel(path, fallback='ColorLenses.xlsx') {
  const response=await apiFetch(`${API_URL}${path}`);
  if(!response.ok){ const e=await response.json().catch(()=>({}));throw new ApiError(e.message || 'No se pudo generar el Excel.',response.status,e.code); }
  if(!response.headers.get('content-type')?.includes('spreadsheetml')) throw new Error('El servidor no devolvió un archivo Excel. Revisa que el backend esté actualizado.');
  const blob=await response.blob(), url=URL.createObjectURL(blob);
  const filename=/filename="?([^";]+)"?/.exec(response.headers.get('Content-Disposition') || '')?.[1] || fallback;
  const anchor=document.createElement('a'); anchor.href=url; anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export const imageUrl=value=>{if(!value)return '';return /^https?:\/\//i.test(value)?value:`${API_URL}${String(value).startsWith('/')?'':'/'}${value}`;};
export function uuid(){
 if(globalThis.crypto?.randomUUID) return crypto.randomUUID();
 if(!globalThis.crypto?.getRandomValues) throw new Error('Abre el sistema con HTTPS para registrar inventarios.');
 return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}
export function queryString(filters){
 const q=new URLSearchParams();Object.entries(filters).forEach(([key,value])=>{if(Array.isArray(value))value.forEach(v=>q.append(key,String(v)));else if(value!=='' && value!=null)q.set(key,String(value));});return q.toString();
}
