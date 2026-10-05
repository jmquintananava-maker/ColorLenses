import CheckGroup from './CheckGroup';
export const emptyFilters={search:'',brands:[],categories:[],colors:[],powers:[],powerType:'all',stockMode:'all'};
export const categoryLabel=v=>({natural:'Natural',muneca:'Muñeca',halloween:'Halloween / fantasía'}[v] || v);
export const powerLabel=v=>Number(v)===0?'0.00 · Sin graduación':`${Number(v)>0?'+':''}${Number(v).toFixed(2)}`;
export default function ProductFilters({filters,onChange,options,showStock=true}) {
 const set=(key,value)=>onChange({...filters,[key]:value});
 return <div className="cl-filter-body">
  <CheckGroup title="Marcas" options={options.brands || []} value={filters.brands} onChange={v=>set('brands',v)} searchable/>
  <CheckGroup title="Estilo" options={options.categories || ['natural','muneca','halloween']} value={filters.categories} onChange={v=>set('categories',v)} labelFor={categoryLabel}/>
  <CheckGroup title="Colores" options={options.colors || []} value={filters.colors} onChange={v=>set('colors',v)} searchable/>
  <label className="cl-field">Tipo de graduación<select value={filters.powerType} onChange={e=>set('powerType',e.target.value)}><option value="all">Con y sin graduación</option><option value="none">Sin graduación</option><option value="graduated">Con graduación</option></select></label>
  <CheckGroup title="Graduaciones" options={(options.powers || []).map(p=>({value:String(Number(p)),label:powerLabel(p)}))} value={filters.powers} onChange={v=>set('powers',v)} searchable/>
  {showStock&&<label className="cl-field">Disponibilidad<select value={filters.stockMode} onChange={e=>set('stockMode',e.target.value)}><option value="all">Todas las existencias</option><option value="with_stock">Con existencias</option><option value="without_stock">Sin existencias</option></select></label>}
 </div>;
}
