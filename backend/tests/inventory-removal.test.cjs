// Adaptador SQL transaccional en memoria: estas pruebas no modifican una base real.
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createRemovalService}=require('../lib/inventory-removal');
const ID='00000000-0000-4000-8000-000000000001',USER={id:42,username:'Prueba'};
function fixture(options={}) {
 let state={session:{Id:ID,Folio:'REC-PRUEBA',Kind:options.kind||'RECEIPT',Status:options.status||'ACTIVE'},
  lines:options.lines||[{Id:1,SessionId:ID,ProductVariantId:10,Quantity:3,Marca:'Urban Layer',CreatedAt:'2026-10-05 01:00:00.000',VoidedAt:null},
   {Id:2,SessionId:ID,ProductVariantId:10,Quantity:2,Marca:'Urban Layer',CreatedAt:'2026-10-05 01:01:00.000',VoidedAt:null},
   {Id:3,SessionId:ID,ProductVariantId:20,Quantity:4,Marca:'Otra marca',CreatedAt:'2026-10-05 01:02:00.000',VoidedAt:null}],
  products:[{Id:10,Stock:options.stock??12,Marca:'Urban Layer',Image:'foto-1.webp'},{Id:20,Stock:9,Marca:'Otra marca',Image:'foto-2.webp'}],events:[]};
 const calls=[];let locked=false;const queue=[];
 function unlock(){if(queue.length)queue.shift()();else locked=false;}
 const db={getConnection:async()=>{
  let backup;
  const c={beginTransaction:async()=>{backup=structuredClone(state);calls.push(['BEGIN']);},commit:async()=>calls.push(['COMMIT']),rollback:async()=>{if(backup)state=backup;calls.push(['ROLLBACK']);},release:()=>calls.push(['RELEASE']),destroy:()=>calls.push(['DESTROY'])};
  c.execute=async(sql,args=[])=>{calls.push([sql,args]);
   if(sql.includes('GET_LOCK')){if(locked)await new Promise(resolve=>queue.push(resolve));else locked=true;return [[{Acquired:1}]];}
   if(sql.includes('RELEASE_LOCK')){unlock();return [[]];}
   if(sql.includes('INFORMATION_SCHEMA.TABLES'))return [args.map(TABLE_NAME=>({TABLE_NAME,ENGINE:options.nonTransactional&&TABLE_NAME==='ProductVariants'?'MyISAM':'InnoDB'}))];
   if(sql.startsWith('SELECT * FROM CLInventorySessions'))return [args[0]===state.session.Id?[structuredClone(state.session)]:[]];
   if(sql.startsWith('SELECT Id FROM CLInventoryEvents'))return [state.events.filter(e=>e.SessionId===args[0]&&e.Action===args[1])];
   if(sql.startsWith('SELECT * FROM CLInventoryLines'))return [structuredClone(state.lines.filter(l=>l.SessionId===args[0]&&!l.VoidedAt))];
   if(sql.startsWith('SELECT v.Id,v.Stock'))return [structuredClone(state.products.filter(p=>p.Id===args[0]))];
   if(sql.includes('SELECT Id, Folio, Brand, Status'))return [options.brandLocked&&args[0]==='Urban Layer'?[{Id:'locked',Folio:'INV-2',Brand:'Urban Layer',Status:'PAUSED'}]:[]];
   if(sql.startsWith('SELECT Id FROM CLInventorySessions'))return [options.recounted&&args[0]==='Urban Layer'?[{Id:'newer'}]:[]];
   if(sql.startsWith('UPDATE ProductVariants')){const p=state.products.find(p=>p.Id===args[1]);if(!p||p.Stock<args[2])return [{affectedRows:0}];p.Stock-=Number(args[0]);return [{affectedRows:1}];}
   if(sql.startsWith('UPDATE CLInventoryLines')){const line=state.lines.find(l=>l.Id===args[1]&&l.SessionId===args[2]&&!l.VoidedAt);if(!line)return [{affectedRows:0}];line.VoidedAt='2026-10-05 02:00:00.000';line.VoidedBy=args[0];return [{affectedRows:1}];}
   if(sql.startsWith('UPDATE CLInventorySessions')){state.session.Status='COMPLETED';state.session.CompletedAt=state.session.CompletedAt||'2026-10-05 02:00:00.000';return [{affectedRows:1}];}
   if(sql.startsWith('INSERT INTO CLInventoryEvents')){if(options.failEvent)throw new Error('Fallo simulado al guardar bitácora');state.events.push({Id:state.events.length+1,SessionId:args[0],Action:args[1],ActorId:args[2],ActorName:args[3]});return [{insertId:state.events.length}];}
   throw new Error('SQL inesperado en prueba: '+sql);
  };c.query=c.execute;return c;
 }};
 return {service:createRemovalService(db),calls,get state(){return state}};
}
async function reviewed(f){const p=await f.service.preview(ID);return {confirm:true,previewToken:p.previewToken};}

test('revisión muestra unidades vigentes, capturas y variantes sin modificar existencias',async()=>{
 const f=fixture(),before=structuredClone(f.state),p=await f.service.preview(ID);
 assert.deepEqual([p.units,p.captures,p.variants],[9,3,2]);assert.match(p.previewToken,/^[a-f0-9]{64}$/);assert.deepEqual(f.state,before);
});
test('eliminar entrada revierte capturas agrupadas y conserva productos, fotos, folio y auditoría',async()=>{
 const f=fixture(),input=await reviewed(f),r=await f.service.remove(ID,input,USER);
 assert.deepEqual(r,{success:true,replayed:false,removedUnits:9});assert.deepEqual(f.state.products.map(p=>p.Stock),[7,5]);
 assert.deepEqual(f.state.products.map(p=>p.Image),['foto-1.webp','foto-2.webp']);assert.equal(f.state.session.Status,'COMPLETED');
 assert.ok(f.state.lines.every(l=>l.VoidedAt&&l.VoidedBy===USER.id));assert.equal(f.state.events[0].Action,'DELETE_RECEIPT');
 assert.ok(!f.calls.some(([sql])=>/^(DELETE|DROP) /.test(sql)));assert.equal(f.calls.filter(([sql])=>sql.startsWith('UPDATE ProductVariants')).length,2);
});
test('entrada vacía se elimina con bitácora sin alterar stock',async()=>{
 const f=fixture({lines:[]}),before=structuredClone(f.state.products),input=await reviewed(f);await f.service.remove(ID,input,USER);
 assert.deepEqual(f.state.products,before);assert.equal(f.state.events.length,1);assert.equal((await f.service.preview(ID)).deleted,true);
});
test('capturas anuladas previamente no se descuentan otra vez',async()=>{
 const f=fixture();f.state.lines[0].VoidedAt='2026-10-05 01:30:00.000';f.state.lines[0].VoidedBy=1;
 const p=await f.service.preview(ID);assert.equal(p.units,6);await f.service.remove(ID,{confirm:true,previewToken:p.previewToken},USER);
 assert.deepEqual(f.state.products.map(p=>p.Stock),[10,5]);assert.equal(f.state.lines[0].VoidedBy,1);
});
test('solo elimina recepciones y exige revisión con confirmación explícita',async()=>{
 const f=fixture();for(const input of [{},{confirm:'true'},{confirm:true}, {confirm:true,previewToken:'forzado'}])await assert.rejects(()=>f.service.remove(ID,input,USER),e=>e.status===400);
 const stocktake=fixture({kind:'STOCKTAKE'});await assert.rejects(()=>stocktake.service.preview(ID),e=>e.code==='RECEIPT_REQUIRED');
 await assert.rejects(()=>stocktake.service.remove(ID,{confirm:true,previewToken:'0'.repeat(64)},USER),e=>e.code==='RECEIPT_REQUIRED');
 assert.equal(f.state.events.length,0);assert.deepEqual(f.state.products.map(p=>p.Stock),[12,9]);
});
test('entrada pausada o finalizada también se puede eliminar',async()=>{
 for(const status of ['PAUSED','COMPLETED']){const f=fixture({status}),input=await reviewed(f);await f.service.remove(ID,input,USER);assert.equal(f.state.events.length,1);}
});
test('no genera negativos aunque cada captura individual quepa pero su suma no',async()=>{
 const f=fixture({stock:4}),input=await reviewed(f),before=structuredClone(f.state);
 await assert.rejects(()=>f.service.remove(ID,input,USER),e=>e.code==='INSUFFICIENT_STOCK');assert.deepEqual(f.state,before);
 assert.ok(!f.calls.some(([sql])=>sql.startsWith('UPDATE ProductVariants')));
});
test('si falta stock en otra variante se rechaza toda la eliminación',async()=>{
 const f=fixture();f.state.products[1].Stock=1;const input=await reviewed(f),before=structuredClone(f.state);
 await assert.rejects(()=>f.service.remove(ID,input,USER),e=>e.code==='INSUFFICIENT_STOCK');assert.deepEqual(f.state,before);
 assert.ok(!f.calls.some(([sql])=>sql.startsWith('UPDATE ProductVariants')));
});
test('marca en conteo activo o pausado y un reconteo posterior bloquean la eliminación',async()=>{
 for(const [options,code] of [[{brandLocked:true},'BRAND_LOCKED'],[{recounted:true},'SUPERSEDED']]){
  const f=fixture(options),input=await reviewed(f),before=structuredClone(f.state);await assert.rejects(()=>f.service.remove(ID,input,USER),e=>e.code===code);assert.deepEqual(f.state,before);
 }
});
test('capturas nuevas o sustituidas con el mismo total invalidan la confirmación anterior',async()=>{
 for(const sameTotal of [false,true]){const f=fixture(),input=await reviewed(f);
  if(sameTotal)f.state.lines[0].Id=99;else f.state.lines.push({...f.state.lines[0],Id:99,Quantity:1});
  const before=structuredClone(f.state);await assert.rejects(()=>f.service.remove(ID,input,USER),e=>e.code==='RECEIPT_CHANGED');assert.deepEqual(f.state,before);
 }
});
test('ventas posteriores a la revisión se respetan y requieren stock suficiente al confirmar',async()=>{
 const f=fixture(),input=await reviewed(f);f.state.products[0].Stock=3;const before=structuredClone(f.state);
 await assert.rejects(()=>f.service.remove(ID,input,USER),e=>e.code==='INSUFFICIENT_STOCK');assert.deepEqual(f.state,before);
});
test('un fallo al guardar bitácora revierte todas las variantes, anulaciones y estado',async()=>{
 const f=fixture({failEvent:true}),input=await reviewed(f),before=structuredClone(f.state);
 await assert.rejects(()=>f.service.remove(ID,input,USER),/Fallo simulado/);assert.deepEqual(f.state,before);assert.ok(f.calls.some(([sql])=>sql==='ROLLBACK'));
});
test('reintento tras perder la respuesta no vuelve a descontar ni duplica la bitácora',async()=>{
 const f=fixture(),input=await reviewed(f);await f.service.remove(ID,input,USER);const before=structuredClone(f.state);
 const r=await f.service.remove(ID,input,USER);assert.equal(r.replayed,true);assert.deepEqual(f.state,before);
});
test('dos eliminaciones concurrentes del mismo folio se serializan y descuentan una vez',async()=>{
 const f=fixture(),input=await reviewed(f),results=await Promise.all([f.service.remove(ID,input,USER),f.service.remove(ID,input,USER)]);
 assert.equal(results.filter(r=>r.replayed).length,1);assert.deepEqual(f.state.products.map(p=>p.Stock),[7,5]);assert.equal(f.state.events.length,1);
});
test('rechaza motor no transaccional antes de tocar existencias',async()=>{
 const f=fixture({nonTransactional:true}),input=await reviewed(f),before=structuredClone(f.state);
 await assert.rejects(()=>f.service.remove(ID,input,USER),e=>e.code==='SCHEMA_NOT_READY');assert.deepEqual(f.state,before);
});
