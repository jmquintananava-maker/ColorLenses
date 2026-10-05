'use strict';
const express=require('express');
const { createService }=require('../lib/inventory-service');
const { filtersFromQuery,matchesProduct,categoryKey }=require('../lib/product-filters');
const { sendError }=require('../lib/inventory-core');
const { sendWorkbook,letter }=require('../lib/xlsx');
const columns=[
 {key:'ScanCode',title:'Código',type:'text',width:28}, {key:'Marca',title:'Marca',width:20}, {key:'Modelo',title:'Modelo',width:30},
 {key:'Category',title:'Categoría',width:20}, {key:'Color',title:'Color',width:16}, {key:'PowerLabel',title:'Graduación',width:18},
 {key:'Stock',title:'Existencias',type:'number',width:15}, {key:'Price',title:'Precio de venta',type:'money',width:22},
 {key:'Value',title:'Valor a precio de venta',type:'money',width:27}, {key:'VariantStatus',title:'Estado de variante',width:21}, {key:'ProductStatus',title:'Estado de producto',width:21},
 {key:'FactoryCode',title:'Código de fábrica',type:'text',width:28}, {key:'InternalCode',title:'Código interno',type:'text',width:28}, {key:'CodeType',title:'Tipo de código',width:18},
 {key:'ProductVariantId',title:'Id de variante',type:'number',width:18}, {key:'ReviewLabel',title:'Revisión de datos',width:23}
];
module.exports=function reportsRouter(db) {
 const router=express.Router(), service=createService(db);
 const wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){sendError(res,e);}};
 router.get('/products/options',wrap(async(req,res)=>{
  const products=await service.allProducts();
  const unique=key=>[...new Set(products.map(p=>p[key]).filter(v=>v!=='' && v!=null))].sort((a,b)=>String(a).localeCompare(String(b),'es'));
  res.json({brands:unique('Marca'),colors:unique('Color'),categories:[...new Set(products.map(p=>categoryKey(p.Category)).filter(Boolean))],powers:unique('Power').map(Number).sort((a,b)=>b-a),columns:columns.map(({key,title})=>({key,title}))});
 }));
 router.get('/products',wrap(async(req,res)=>{
  const f=filtersFromQuery(req.query), all=await service.allProducts(), rows=all.filter(p=>matchesProduct(p,f));
  const page=Math.max(1,Number.parseInt(req.query.page,10)||1);
  res.json({rows:rows.slice((page-1)*25,page*25),total:rows.length,page,pageSize:25,units:rows.reduce((s,p)=>s+Number(p.Stock || 0),0),retailValue:rows.reduce((s,p)=>s+Number(p.Stock || 0)*Number(p.Price || 0),0)});
 }));
 router.get('/products/export',wrap(async(req,res)=>{
  const f=filtersFromQuery(req.query), all=await service.allProducts();
  const rows=all.filter(p=>matchesProduct(p,f)).map(p=>({...p,Stock:Number(p.Stock || 0),Price:Number(p.Price || 0),Value:Number(p.Stock || 0)*Number(p.Price || 0),ReviewLabel:Number(p.NeedsReview)?'Pendiente de completar':'Completo',PowerLabel:Number(p.NeedsReview)?'Por confirmar':p.PowerLabel}));
  const selected=Array.isArray(req.query.columns)?req.query.columns:req.query.columns?[req.query.columns]:columns.map(c=>c.key);
  const cols=columns.filter(c=>selected.includes(c.key)).map(c=>({...c}));
  if(!cols.length) {res.status(400).json({message:'Selecciona al menos una columna.'});return;}
  // Los importes calculados usan fórmula cuando ambas columnas fuente están visibles.
  const value=cols.find(c=>c.key==='Value'), stock=cols.findIndex(c=>c.key==='Stock'),price=cols.findIndex(c=>c.key==='Price');
  if(value && stock>=0 && price>=0) value.value=(p,r)=>({formula:`${letter(stock)}${r}*${letter(price)}${r}`,result:p.Value});
  const detail=[['Búsqueda',f.search],['Marcas',f.brands.join(', ') || 'Todas'],['Categorías',f.categories.join(', ') || 'Todas'],['Colores',f.colors.join(', ') || 'Todos'],['Graduaciones',f.powers.join(', ') || 'Todas'],['Tipo de graduación',f.powerType],['Estado',f.status],['Stock',f.stockMode],['Nota','El valor utiliza precio de venta, no costo ni utilidad. Los códigos conservan ceros iniciales.']];
  await sendWorkbook(res,`ColorLenses-Productos-${new Date().toISOString().slice(0,10)}.xlsx`,[
    {name:'Productos',title:'ColorLenses · Reporte de productos',subtitle:`${rows.length} variantes · ${rows.reduce((s,p)=>s+p.Stock,0)} unidades · Valores en MXN`,columns:cols,rows,totals:['Stock','Value']},
    {name:'Configuración',title:'ColorLenses · Filtros del reporte',columns:[{key:'name',title:'Filtro',width:26},{key:'value',title:'Selección',width:40}],rows:detail.map(([name,value])=>({name,value}))}
  ]);
 }));
 return router;
};
