// Pruebas de ramas de negocio con un adaptador SQL simulado; no sustituyen MySQL real.
'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const {createService}=require('../lib/inventory-service');
const SID='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',KEY='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const USER={id:1,username:'admin',fullName:'Prueba'};
function harness(options={}){
 const calls=[],header={Id:SID,Folio:'INV-PRUEBA',Kind:'STOCKTAKE',Status:'ACTIVE',Brand:'Marca A',...options.header};
 let product=options.product===null?null:{ProductVariantId:1,ProductId:1,Marca:'Marca A',Modelo:'Aurora',Category:'Natural',Color:'Miel',Power:-1.5,PowerLabel:'-1.50',Price:200,Stock:7,...options.product};let line;
 async function exec(sql,args=[]){calls.push([sql,args]);
  if(sql.includes('GET_LOCK'))return [[{Acquired:1}]];if(sql.includes('RELEASE_LOCK'))return [[{Released:1}]];
  if(sql.includes('INFORMATION_SCHEMA.TABLES'))return [['Products','ProductVariants','CLInventorySessions','CLInventoryBaseline','CLInventoryLines','CLInventoryDrafts','CLInventoryEvents'].map(TABLE_NAME=>({TABLE_NAME,ENGINE:'InnoDB'}))];
  if(sql.includes('INFORMATION_SCHEMA.COLUMNS'))return [[{COLUMN_NAME:'ScanCode',CHARACTER_MAXIMUM_LENGTH:190},{COLUMN_NAME:'FactoryCode',CHARACTER_MAXIMUM_LENGTH:190}]];
  if(sql.startsWith('SELECT * FROM CLInventorySessions WHERE RequestKey='))return [options.priorSession?[options.priorSession]:[]];
  if(sql.startsWith('SELECT * FROM CLInventorySessions WHERE Id='))return [[header]];
  if(sql.includes('SELECT Id, Folio, Brand, Status FROM CLInventorySessions'))return [options.locked?[{Brand:'Marca A',Folio:'INV-OTRO',Status:'PAUSED'}]:[]];
  if(sql.startsWith('SELECT * FROM CLInventoryLines WHERE SessionId=? AND RequestKey='))return [options.priorLine?[options.priorLine]:[]];
  if(sql.startsWith('SELECT * FROM CLInventoryLines WHERE SessionId='))return [line?[line]:[]];
  if(sql.startsWith('SELECT * FROM CLInventoryBaseline'))return [options.baseline||[]];
  if(sql.startsWith('SELECT * FROM CLInventoryEvents'))return [[]];
  if(sql.startsWith('SELECT DISTINCT Marca'))return [[{Name:args[0]}]];
  if(sql.startsWith('SELECT v.Id AS ProductVariantId'))return [options.ambiguous?[product,{...product,ProductVariantId:2}]:(product?[{...product}]:[])];
  if(sql.startsWith('INSERT INTO Products'))return [{insertId:90}];
  if(sql.startsWith('INSERT INTO ProductVariants')){product={ProductVariantId:91,ProductId:90,Marca:header.Brand,Modelo:'Pendiente',Category:'',Color:'',Power:null,PowerLabel:'Por confirmar',Price:0,Stock:0,NeedsReview:1};return [{insertId:91}];}
  if(sql.startsWith('INSERT INTO CLInventorySessions')){Object.assign(header,{Id:args[0],Folio:args[1],RequestKey:args[2],Kind:args[3],Brand:args[4],Reference:args[5]});return [{affectedRows:1}];}
  if(sql.startsWith('UPDATE ProductVariants SET Stock=?')){product.Stock=args[0];return [{affectedRows:1}];}
  if(sql.startsWith('UPDATE ProductVariants v JOIN')){if(product)product.Stock=0;return [{affectedRows:1}];}
  if(sql.startsWith('INSERT INTO CLInventoryLines')){line={Id:1,SessionId:args[0],RequestKey:args[1],ProductVariantId:args[2],ProductId:args[3],Code:args[4],Quantity:args[5],StockBefore:args[6],StockAfter:args[7],Marca:args[8],NeedsReview:args[15]};return [{insertId:1}];}
  if(sql.startsWith('SELECT * FROM CLInventoryLines WHERE Id='))return [[line]];
  if(sql.startsWith('UPDATE CLInventorySessions SET Status=')){header.Status=args[0];return [{affectedRows:1}];}
  if(sql.startsWith('INSERT INTO CLInventoryBaseline')||sql.startsWith('INSERT INTO CLInventoryEvents')||sql.startsWith('INSERT INTO CLInventoryDrafts')||sql.startsWith('UPDATE CLInventorySessions SET UpdatedAt='))return [{affectedRows:1}];
  throw new Error('Consulta inesperada en prueba: '+sql);
 }
 const c={execute:exec,query:exec,beginTransaction:async()=>calls.push(['BEGIN']),commit:async()=>calls.push(['COMMIT']),rollback:async()=>calls.push(['ROLLBACK']),release:()=>calls.push(['RELEASE']),destroy:()=>calls.push(['DESTROY'])};
 return {service:createService({getConnection:async()=>c,execute:exec,query:exec}),calls,header,get product(){return product;}};
}
test('no inicia ni reinicia nada sin confirmación explícita',async()=>{const h=harness();await assert.rejects(()=>h.service.create({kind:'STOCKTAKE',brand:'Marca A',requestKey:KEY},USER),/confirmar/);assert.equal(h.calls.length,0);});
test('al iniciar, guarda baseline ANTES del reset limitado por marca',async()=>{const h=harness();await h.service.create({kind:'STOCKTAKE',brand:'Marca A',confirmReset:true,requestKey:KEY},USER);const base=h.calls.findIndex(x=>x[0].startsWith('INSERT INTO CLInventoryBaseline'));const reset=h.calls.findIndex(x=>x[0].startsWith('UPDATE ProductVariants v JOIN'));assert.ok(base>=0&&reset>base);assert.match(h.calls[reset][0],/WHERE LOWER\(TRIM\(p.Marca\)\)=LOWER\(TRIM\(\?\)\)/);assert.deepEqual(h.calls[reset][1],['Marca A']);assert.equal(h.product.Stock,0);});
test('una creación repetida no vuelve a poner stock en cero',async()=>{const prior={Id:SID,Kind:'STOCKTAKE',Brand:'Marca A',Reference:''};const h=harness({priorSession:prior});const r=await h.service.create({kind:'STOCKTAKE',brand:'Marca A',confirmReset:true,requestKey:KEY},USER);assert.equal(r.replayed,true);assert.ok(!h.calls.some(x=>x[0].startsWith('UPDATE ProductVariants')));});
test('pausar y reanudar no modifica existencias',async()=>{const h=harness();await h.service.changeStatus(SID,{status:'PAUSED'},USER);await h.service.changeStatus(SID,{status:'ACTIVE'},USER);assert.equal(h.header.Status,'ACTIVE');assert.equal(h.product.Stock,7);assert.ok(!h.calls.some(x=>x[0].startsWith('UPDATE ProductVariants')));});
test('captura válida suma al stock, conserva antes/después y ceros del código',async()=>{const h=harness({header:{Kind:'RECEIPT',Brand:null}});const r=await h.service.add(SID,{code:'000123',quantity:5,requestKey:KEY},USER);assert.equal(h.product.Stock,12);assert.equal(r.line.StockBefore,7);assert.equal(r.line.StockAfter,12);assert.equal(r.line.Code,'000123');});
test('reintento idempotente no duplica cantidad incluso después de finalizar',async()=>{const h=harness({header:{Status:'COMPLETED'},priorLine:{Code:'000123',Quantity:5}});const r=await h.service.add(SID,{code:'000123',quantity:5,requestKey:KEY},USER);assert.equal(r.replayed,true);assert.ok(!h.calls.some(x=>x[0].startsWith('UPDATE ProductVariants')));});
test('misma clave con datos distintos se rechaza',async()=>{const h=harness({priorLine:{Code:'000123',Quantity:5}});await assert.rejects(()=>h.service.add(SID,{code:'000123',quantity:6,requestKey:KEY},USER),e=>e.code==='IDEMPOTENCY_CONFLICT');});
test('rechaza código de otra marca durante conteo',async()=>{const h=harness({product:{Marca:'Marca B'}});await assert.rejects(()=>h.service.add(SID,{code:'000123',quantity:5,requestKey:KEY},USER),e=>e.code==='WRONG_BRAND');assert.equal(h.product.Stock,7);});
test('rechaza código ambiguo sin elegir una variante',async()=>{const h=harness({ambiguous:true});await assert.rejects(()=>h.service.add(SID,{code:'000123',quantity:5,requestKey:KEY},USER),e=>e.code==='AMBIGUOUS_CODE');assert.equal(h.product.Stock,7);});
test('inventario pausado no acepta capturas',async()=>{const h=harness({header:{Status:'PAUSED'}});await assert.rejects(()=>h.service.add(SID,{code:'000123',quantity:5,requestKey:KEY},USER),e=>e.code==='NOT_ACTIVE');});
test('código desconocido crea producto inactivo y pendiente sin inventar graduación',async()=>{const h=harness({product:null});const r=await h.service.add(SID,{code:'0000999',quantity:2,requestKey:KEY},USER);assert.equal(r.line.NeedsReview,1);assert.equal(h.product.Stock,2);assert.equal(h.product.Power,null);const insert=h.calls.find(x=>x[0].startsWith('INSERT INTO ProductVariants'));assert.equal(insert[1].at(-1),'Inactivo');});
test('un QR demasiado largo no se trunca ni crea producto',async()=>{const h=harness({product:null});await assert.rejects(()=>h.service.add(SID,{code:'A'.repeat(191),quantity:1,requestKey:KEY},USER),e=>e.code==='CODE_TOO_LONG');assert.ok(!h.calls.some(x=>x[0].startsWith('INSERT INTO Products')));});
test('finalizar advierte sobre variantes sin contar; exige confirmación',async()=>{const h=harness({baseline:[{ProductVariantId:1,StockBefore:7}]});await assert.rejects(()=>h.service.changeStatus(SID,{status:'COMPLETED'},USER),e=>e.code==='UNCOUNTED');assert.equal(h.header.Status,'ACTIVE');await h.service.changeStatus(SID,{status:'COMPLETED',confirmUncounted:true},USER);assert.equal(h.header.Status,'COMPLETED');await assert.rejects(()=>h.service.changeStatus(SID,{status:'ACTIVE'},USER),e=>e.code==='COMPLETED');});

// Regression for ER_CANT_AGGREGATE_2COLLATIONS (general_ci / unicode_ci).
test('finalizar recepción vacía no compara un parámetro de texto con un literal SQL', async()=>{
 const h=harness({header:{Kind:'RECEIPT',Brand:null}});
 await h.service.changeStatus(SID,{status:'COMPLETED'},USER);
 const update=h.calls.find(([sql])=>sql.startsWith('UPDATE CLInventorySessions SET Status='));
 assert.deepEqual(update[1],['COMPLETED',SID]);
 assert.match(update[0],/CompletedAt=UTC_TIMESTAMP\(3\)/);
 assert.doesNotMatch(update[0],/\?\s*=\s*['"]/);
 assert.equal(h.header.Status,'COMPLETED');
 assert.equal(h.product.Stock,7);
 assert.ok(h.calls.some(([sql])=>sql==='COMMIT'));
});
test('pausa y reanudación mantienen CompletedAt NULL sin comparación textual SQL',async()=>{
 const h=harness({header:{Kind:'RECEIPT'}});
 for(const state of ['PAUSED','ACTIVE']) {
  await h.service.changeStatus(SID,{status:state},USER);
  const update=h.calls.filter(([sql])=>sql.startsWith('UPDATE CLInventorySessions SET Status=')).at(-1);
  assert.match(update[0],/CompletedAt=NULL/);
  assert.deepEqual(update[1],[state,SID]);
  assert.doesNotMatch(update[0],/\?\s*=\s*['"]/);
 }
 assert.equal(h.product.Stock,7);
});
test('repetir finalizar no genera un segundo cambio ni un segundo evento',async()=>{
 const h=harness({header:{Kind:'RECEIPT'}});
 await h.service.changeStatus(SID,{status:'COMPLETED'},USER);
 const r=await h.service.changeStatus(SID,{status:'COMPLETED'},USER);
 assert.equal(r.replayed,true);
 assert.equal(h.calls.filter(([sql])=>sql.startsWith('UPDATE CLInventorySessions SET Status=')).length,1);
 assert.equal(h.calls.filter(([sql])=>sql.startsWith('INSERT INTO CLInventoryEvents')).length,1);
});
test('el estado se valida antes de construir la expresión fija de fecha',async()=>{
 const h=harness();await assert.rejects(()=>h.service.changeStatus(SID,{status:"COMPLETED';--"},USER),/Estado inválido/);
 assert.equal(h.calls.length,0);
});
