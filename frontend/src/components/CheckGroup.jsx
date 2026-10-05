import { useState } from 'react';
export default function CheckGroup({ title, options=[], value=[], onChange, searchable=false, labelFor=v=>v }) {
 const [search,setSearch]=useState('');
 const entries=options.map(o=>typeof o==='object'?o:{value:String(o),label:labelFor(o)});
 const filtered=entries.filter(o=>String(o.label).toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')));
 function toggle(v){const clean=String(v);onChange(value.includes(clean)?value.filter(x=>x!==clean):[...value,clean]);}
 return <details className="cl-check-group" open><summary>{title}<span>{value.length?`${value.length} seleccionados`:'Todos'}</span></summary>
  {searchable && entries.length>6 && <input className="cl-mini-search" aria-label={`Buscar ${title.toLowerCase()}`} placeholder="Buscar en la lista…" value={search} onChange={e=>setSearch(e.target.value)}/>}
  <div className="cl-check-options">{filtered.map(o=><label key={o.value}><input type="checkbox" checked={value.includes(String(o.value))} onChange={()=>toggle(o.value)}/><span>{o.label}</span>{o.count!=null&&<small>{o.count}</small>}</label>)}{!filtered.length&&<p className="cl-muted">Sin opciones disponibles.</p>}</div>
  {value.length>0&&<button type="button" className="cl-text-btn" onClick={()=>onChange([])}>Quitar selección</button>}
 </details>;
}
