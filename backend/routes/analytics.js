'use strict';
module.exports=function analyticsRouter(db){
 const router=require('express').Router();
 const service=require('../lib/analytics-service').createService(db);
 const run=fn=>async(req,res)=>{try{res.json(await fn(req));}catch(e){console.error('[Analytics]',e.code||e.name,e.sqlMessage||e.message);res.status(500).json({message:'No se pudo cargar este reporte. Pulsa Reintentar; si continúa, revisa el detalle [Analytics] en la terminal del backend. No se sustituyeron los datos por ceros.',code:e.code||'ANALYTICS_READ_FAILED'});}};
 router.get('/summary',run(()=>service.summary()));
 router.get('/sales',run(req=>service.sales(req.query)));
 router.get('/chart',run(req=>service.chart(['daily','weekly','monthly','yearly'].includes(req.query.period)?req.query.period:'daily')));
 for(const name of ['low-stock','top-products','top-customers'])router.get('/'+name,run(req=>service.collection(name,req.query)));
 return router;
};
