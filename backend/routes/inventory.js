'use strict';
const express = require('express');
const { createService } = require('../lib/inventory-service');
const { sendError } = require('../lib/inventory-core');
const { ensureScopeSchema } = require('../lib/inventory-scope');
const { sendWorkbook, letter } = require('../lib/xlsx');
const labels = { RECEIPT:'Entrada de mercancía', STOCKTAKE:'Inventario completo', ACTIVE:'En curso', PAUSED:'En pausa', COMPLETED:'Finalizado' };
const col=(key,title,type,width)=>({key,title,type,width});
const baseColumns=[col('Code','Código','text',28),col('Marca','Marca',null,20),col('Modelo','Modelo',null,30),col('Category','Categoría',null,18),col('Color','Color',null,16),col('PowerLabel','Graduación',null,18)];
function sessionSheets(detail) {
  const {session:s,summary,lines,products,events}=detail;
  const subtitle=`${s.Folio} · ${s.Brand || 'Varias marcas'}${s.ScopeLabel?' · '+s.ScopeLabel:''} · ${labels[s.Status]} · ${s.Reference || 'Sin referencia'}`;
  const sheets=[{name:'Resumen',title:labels[s.Kind],subtitle,columns:[col('name','Concepto',null,36),col('value','Valor',null,40)],rows:[
    {name:'Folio',value:s.Folio},{name:'Tipo',value:labels[s.Kind]},{name:'Estado',value:labels[s.Status]},{name:'Marca',value:s.Brand || 'Varias marcas'},
    {name:'Alcance del conteo',value:s.ScopeLabel || 'No aplica'},
    {name:'Referencia / proveedor',value:s.Reference},{name:'Notas',value:s.Notes},{name:'Creado por',value:s.CreatedByName},
    {name:'Creación',value:dateText(s.CreatedAt)},{name:'Finalización',value:dateText(s.CompletedAt)},
    {name:'Unidades registradas',value:summary.TotalUnits},{name:'Variantes registradas',value:summary.TotalProducts},
    {name:'Variantes sin contar',value:summary.Uncounted},{name:'Stock antes del reinicio',value:s.Kind==='STOCKTAKE'?summary.OriginalUnits:'No aplica'},
    {name:'Códigos nuevos al registrar',value:summary.PendingProducts},
    {name:'Observación',value:s.Kind==='STOCKTAKE'?'El stock anterior corresponde al inicio; el conteo se consolida por variante. No es el stock actual después de ventas posteriores.':'Cada movimiento conserva el stock antes y después de recibir. No incluye ventas posteriores.'}
  ]}];
  const cols=[...baseColumns,col('StockBefore','Stock anterior','number',18),col('Quantity',s.Kind==='STOCKTAKE'?'Contado':'Recibido','number',15)];
  if(s.Kind==='STOCKTAKE') {
    cols.push({...col('Difference','Diferencia','number',16),value:(p,r)=>({formula:`H${r}-G${r}`,result:Number(p.Quantity)-Number(p.StockBefore)})},col('CountStatus','Estado de conteo',null,20));
  } else cols.push(col('LastRecordedStock','Último stock registrado','number',24));
  sheets.push({name:s.Kind==='STOCKTAKE'?'Conteo por producto':'Productos recibidos',title:'ColorLenses · Consolidado',subtitle,columns:cols,rows:products,totals:['StockBefore','Quantity',...(s.Kind==='STOCKTAKE'?['Difference']:[])]});
  sheets.push({name:'Movimientos',title:'ColorLenses · Trazabilidad',subtitle:'Incluye registros anulados. No se borran los movimientos originales.',columns:[
    col('Id','Movimiento','number',13),...baseColumns,col('Quantity','Cantidad','number',13),col('StockBefore','Antes','number',12),col('StockAfter','Después','number',12),
    col('CreatedAt','Fecha UTC','text',27),col('CreatedByName','Registrado por',null,24),col('ScanMethod','Captura',null,16),col('MovementStatus','Estado',null,18)
  ],rows:lines.map(l=>({...l,CreatedAt:dateText(l.CreatedAt),MovementStatus:l.VoidedAt?'Anulado':'Aplicado'}))});
  sheets.push({name:'Bitácora',title:'ColorLenses · Sesión',subtitle,columns:[col('Action','Acción',null,28),col('ActorName','Administrador',null,26),col('CreatedAt','Fecha UTC','text',28)],rows:events.map(e=>({...e,CreatedAt:dateText(e.CreatedAt)}))});
  return sheets;
}
function dateText(d) { return d instanceof Date ? d.toISOString() : d ? String(d) : ''; }
module.exports=function inventoryRouter(db) {
  const router=express.Router(), service=createService(db);
  const wrap=fn=>async(req,res)=>{try{await ensureScopeSchema(db);await fn(req,res);}catch(e){sendError(res,e);}};
  router.get('/meta',wrap(async(req,res)=>res.json(await service.metadata())));
  router.get('/preview',wrap(async(req,res)=>res.json(await service.preview(req.query.brand,{categories:req.query.allCategories==='true'?null:req.query.categories==null?[]:Array.isArray(req.query.categories)?req.query.categories:[req.query.categories],graduation:req.query.graduation}))));
  router.get('/lookup',wrap(async(req,res)=>res.json(await service.lookup(req.query.code,req.query.sessionId))));
  router.get('/drafts',wrap(async(req,res)=>res.json(await service.drafts())));
  router.post('/drafts/:id/publish',wrap(async(req,res)=>res.json(await service.publishDraft(req.params.id,req.body,req.user))));
  router.get('/sessions',wrap(async(req,res)=>res.json(await service.history(req.query))));
  router.post('/sessions',wrap(async(req,res)=>res.status(201).json(await service.create(req.body,req.user))));
  router.get('/sessions/export',wrap(async(req,res)=>{
    const history=await service.history(req.query,true);
    await sendWorkbook(res,'ColorLenses-Historial-'+new Date().toISOString().slice(0,10)+'.xlsx',[{
      name:'Historial',title:'ColorLenses · Historial de inventarios',subtitle:`${history.total} registros · Fechas UTC · Los filtros de pantalla se aplican a este reporte.`,
      columns:[col('Folio','Folio','text',30),col('KindLabel','Tipo',null,26),col('Brand','Marca',null,20),col('ScopeLabel','Alcance',null,44),col('Reference','Referencia / proveedor',null,32),col('StatusLabel','Estado',null,18),col('TotalProducts','Variantes','number',15),col('TotalUnits','Unidades','number',15),col('CreatedByName','Creado por',null,25),col('CreatedAt','Creación UTC','text',28),col('CompletedAt','Finalización UTC','text',28)],
      rows:history.sessions.map(s=>({...s,Brand:s.Brand || 'Varias marcas',KindLabel:labels[s.Kind],StatusLabel:labels[s.Status],TotalProducts:Number(s.TotalProducts),TotalUnits:Number(s.TotalUnits),CreatedAt:dateText(s.CreatedAt),CompletedAt:dateText(s.CompletedAt)})),totals:['TotalUnits']
    }]);
  }));
  router.patch('/sessions/:id/metadata',wrap(async(req,res)=>res.json(await service.updateMetadata(req.params.id,req.body,req.user))));
  router.get('/sessions/:id',wrap(async(req,res)=>res.json(await service.detail(req.params.id))));
  router.get('/sessions/:id/export',wrap(async(req,res)=>{
    const d=await service.detail(req.params.id); await sendWorkbook(res,`ColorLenses-${d.session.Folio}.xlsx`,sessionSheets(d));
  }));
  router.post('/sessions/:id/lines',wrap(async(req,res)=>res.json(await service.add(req.params.id,req.body,req.user))));
  router.patch('/sessions/:id/status',wrap(async(req,res)=>res.json(await service.changeStatus(req.params.id,req.body,req.user))));
  router.delete('/sessions/:id/lines/:lineId',wrap(async(req,res)=>res.json(await service.voidLine(req.params.id,req.params.lineId,req.user))));
  return router;
};
module.exports.sessionSheets=sessionSheets;
