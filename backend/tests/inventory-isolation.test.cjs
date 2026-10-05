// Integración del servicio con un adaptador SQL en memoria. No modifica una base real.
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');const {createService}=require('../lib/inventory-service');
const USER={id:1,username:'Prueba'};
function database(failAfterReset=false){
 const variants=[
  [1,'Urban Layer','Natural',0,5],[2,'Urban Layer','Natural',0,7],
  [3,'Urban Layer','Natural',-1.5,11],[4,'Urban Layer','Halloween',0,13],
  [5,'Urban Layer','Muñeca',0,17],[6,'Marca B','Natural',0,19],
  [7,'Urban Layer','Natural',0,23,true],[8,'Urban Layer','Natural',null,29],
  [9,'Urban Layer','Natural',1,31],[10,'Urban Layer','Halloween',-2,37]
 ].map(([Id,Marca,Category,Power,Stock,NeedsReview=false])=>({Id,ProductVariantId:Id,ProductId:Id,ScanCode:'000'+Id,Marca,Category,Power,Stock,NeedsReview:Number(NeedsReview),Modelo:'Modelo '+Id,Color:'Miel',PowerLabel:Power===0?'Sin graduación':String(Power),Price:200,VariantStatus:'Activo',ProductStatus:'Activo'}));
 let header,scope,baseline=[],lines=[],backup;const calls=[];
 const original=variants.map(v=>v.Stock);
 const selected=(sql,args)=>variants.filter(v=>{
  // Evaluar los parámetros del WHERE emitido por el servicio, sin usar matchesScope.
  if(v.Marca.toLowerCase()!==args[0].toLowerCase())return false;
  if(sql.includes('p.Category')&&args.length>1&&!args.slice(1).some(c=>c.toLowerCase()===v.Category.toLowerCase()))return false;
  if(sql.includes('v.Power=0')&&(v.Power===null||v.Power!==0))return false;
  if(sql.includes('v.Power<>0')&&(v.Power===null||v.Power===0))return false;
  if(sql.includes('NOT EXISTS')&&v.NeedsReview)return false;
  return true;
 });
 async function execute(sql,args=[]){calls.push([sql,args]);
  if(sql.includes('GET_LOCK'))return [[{Acquired:1}]];if(sql.includes('RELEASE_LOCK'))return [[]];
  if(sql.includes('INFORMATION_SCHEMA.TABLES'))return [args.map(TABLE_NAME=>({TABLE_NAME,ENGINE:'InnoDB'}))];
  if(sql.startsWith('SELECT * FROM CLInventorySessions WHERE RequestKey'))return [header?.RequestKey===args[0]?[header]:[]];
  if(sql.startsWith('SELECT * FROM CLInventorySessions WHERE Id'))return [header?.Id===args[0]?[header]:[]];
  if(sql.startsWith('SELECT Categories AS'))return [scope?[scope]:[]];
  if(sql.startsWith('SELECT DISTINCT Marca AS Name'))return [[{Name:'Urban Layer'}]];
  if(sql.startsWith('SELECT DISTINCT Category'))return [[{Category:'Natural'},{Category:'Halloween'},{Category:'Muñeca'}]];
  if(sql.includes('SELECT Id, Folio, Brand, Status'))return [[]];
  if(sql.startsWith('SELECT COUNT(*) AS Variants')){const rows=selected(sql,args);return [[{Variants:rows.length,Units:rows.reduce((n,p)=>n+p.Stock,0)}]];}
  if(sql.startsWith('INSERT INTO CLInventorySessions')){header={Id:args[0],Folio:args[1],RequestKey:args[2],Kind:args[3],Brand:args[4],Reference:args[5],Status:'ACTIVE'};return [{affectedRows:1}];}
  if(sql.startsWith('INSERT INTO CLInventoryScopes')){scope={ScopeCategoriesJSON:args[1],ScopeGraduation:args[2]};return [{affectedRows:1}];}
  if(sql.startsWith('INSERT INTO CLInventoryBaseline')){baseline=selected(sql,args.slice(1)).map(p=>({...p,StockBefore:p.Stock,SessionId:args[0]}));return [{affectedRows:baseline.length}];}
  if(sql.startsWith('UPDATE ProductVariants v JOIN CLInventoryBaseline')){for(const v of variants)if(baseline.some(b=>b.SessionId===args[0]&&b.ProductVariantId===v.Id))v.Stock=0;return [{affectedRows:baseline.length}];}
  if(sql.startsWith('INSERT INTO CLInventoryEvents')){if(failAfterReset&&args[1]==='START_AND_RESET')throw new Error('Fallo simulado después del reinicio');return [{affectedRows:1}];}
  if(sql.startsWith('SELECT v.Id AS ProductVariantId'))return [variants.filter(v=>v.ScanCode===args[0]).map(v=>({...v,Power:v.NeedsReview?null:v.Power}))];
  if(sql.startsWith('SELECT Code FROM CLProductCodeAliases'))return [[]];
  if(sql.startsWith('SELECT * FROM CLInventoryLines WHERE SessionId=? AND RequestKey'))return [lines.filter(l=>l.RequestKey===args[1])];
  if(sql.startsWith('UPDATE ProductVariants SET Stock=?')){variants.find(v=>v.Id===args[1]).Stock=args[0];return [{affectedRows:1}];}
  if(sql.startsWith('INSERT INTO CLInventoryLines')){lines.push({Id:lines.length+1,SessionId:args[0],RequestKey:args[1],ProductVariantId:args[2],ProductId:args[3],Code:args[4],Quantity:args[5],StockBefore:args[6],StockAfter:args[7],Marca:args[8],Category:args[10],Power:args[12]});return [{insertId:lines.length}];}
  if(sql.startsWith('SELECT * FROM CLInventoryLines WHERE Id='))return [lines.filter(l=>l.Id===args[0])];
  if(sql.startsWith('SELECT * FROM CLInventoryLines WHERE SessionId='))return [lines];
  if(sql.startsWith('SELECT * FROM CLInventoryBaseline'))return [baseline];
  if(sql.startsWith('SELECT * FROM CLInventoryEvents'))return [[]];
  if(sql.startsWith('UPDATE CLInventorySessions SET Status=')){header.Status=args[0];return [{affectedRows:1}];}
  if(sql.startsWith('UPDATE CLInventorySessions SET UpdatedAt='))return [{affectedRows:1}];
  throw new Error('SQL no esperado en fixture: '+sql);
 }
 const c={execute,query:execute,beginTransaction:async()=>backup=structuredClone({header,scope,baseline,lines,variants}),commit:async()=>{},rollback:async()=>{if(!backup)return;({header,scope,baseline,lines}=backup);backup.variants.forEach((p,i)=>Object.assign(variants[i],p))},release:()=>{},destroy:()=>{}};
 const db={execute,query:execute,getConnection:async()=>c};
 return{service:createService(db),variants,original,calls,get baseline(){return baseline}};
}
const payload=scope=>({kind:'STOCKTAKE',brand:'Urban Layer',scope,confirmReset:true,requestKey:randomUUID()});
test('Natural sin graduación conserva Halloween, Muñeca, graduados y pendientes durante todo el conteo',async()=>{
 const db=database(),input=payload({categories:['Natural'],graduation:'PLANO'});
 const preview=await db.service.preview(input.brand,input.scope);assert.equal(preview.variants,2);assert.equal(preview.units,12);
 const {session:s}=await db.service.create(input,USER);
 assert.deepEqual(db.variants.map(p=>p.Stock),[0,0,11,13,17,19,23,29,31,37]);
 assert.deepEqual(db.baseline.map(p=>p.Id),[1,2]);
 await db.service.add(s.Id,{code:'0001',quantity:4,requestKey:randomUUID()},USER);
 for(const code of ['0003','0004','0007'])await assert.rejects(()=>db.service.add(s.Id,{code,quantity:1,requestKey:randomUUID()},USER),e=>e.code==='OUTSIDE_SCOPE');
 await db.service.changeStatus(s.Id,{status:'PAUSED'},USER);await db.service.changeStatus(s.Id,{status:'ACTIVE'},USER);
 const detail=await db.service.detail(s.Id);assert.equal(detail.session.ScopeLabel,'Natural · Sin graduación');assert.equal(detail.summary.Uncounted,1);assert.equal(detail.summary.OriginalUnits,12);
 await db.service.changeStatus(s.Id,{status:'COMPLETED',confirmUncounted:true},USER);
 assert.equal((await db.service.create(input,USER)).replayed,true);
 assert.deepEqual(db.variants.map(p=>p.Stock),[4,0,11,13,17,19,23,29,31,37]);
});
test('graduados de toda la marca y varias categorías sin graduación reinician conjuntos distintos',async()=>{
 for(const [scope,expected]of [
  [{categories:null,graduation:'PRESCRIPTION'},[5,7,0,13,17,19,23,29,0,0]],
  [{categories:['Natural','Halloween'],graduation:'PLANO'},[0,0,11,0,17,19,23,29,31,37]],
  [{categories:null,graduation:'ALL'},[0,0,0,0,0,19,0,0,0,0]]
 ]){const db=database();await db.service.create(payload(scope),USER);assert.deepEqual(db.variants.map(p=>p.Stock),expected);}
});
test('un fallo después de reiniciar revierte stock, fotografía, folio y alcance juntos',async()=>{
 const db=database(true),input=payload({categories:['Natural'],graduation:'PLANO'});
 await assert.rejects(()=>db.service.create(input,USER),/Fallo simulado/);assert.deepEqual(db.variants.map(p=>p.Stock),db.original);assert.equal(db.baseline.length,0);
 assert.ok(!db.calls.some(([sql])=>sql.startsWith('DELETE ')||sql.startsWith('DROP ')));
});
