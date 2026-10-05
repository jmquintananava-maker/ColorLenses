// Adaptador SQL en memoria: verifica las ramas y la reversión de recepción.
// No sustituye una prueba contra MariaDB real ni modifica datos de producción.
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateReceiptProduct}=require('../lib/inventory-receipt');
const {createService}=require('../lib/inventory-service');
const SID='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',KEY='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const USER={id:1,username:'admin'},DETAILS={model:'Aurora',category:'Natural',color:'Miel',price:'250.50',power:'-1.5'};
const payload=overrides=>({code:'0000999',quantity:4,requestKey:KEY,brand:'Urban Layer',newProduct:{...DETAILS},...overrides});
function fixture(options={}){
 let state={product:options.product?{ProductVariantId:91,ProductId:90,Marca:'Urban Layer',Modelo:'Aurora',Category:'Natural',Color:'Miel',Power:0,PowerLabel:'Sin graduación',Price:250,Stock:7,...options.product}:null,base:options.base||null,lines:[],drafts:[]},saved;
 const calls=[],header={Id:SID,Folio:'REC-PRUEBA',Kind:'RECEIPT',Status:'ACTIVE',Brand:null};
 async function exec(sql,args=[]){
  calls.push([sql,args]);
  if(options.failAt&&sql.startsWith(options.failAt))throw new Error('Falla simulada');
  if(sql.includes('GET_LOCK'))return [[{Acquired:1}]];
  if(sql.includes('RELEASE_LOCK'))return [[{Released:1}]];
  if(sql.startsWith('SELECT * FROM CLInventorySessions WHERE Id='))return [[header]];
  if(sql.startsWith('SELECT Categories AS'))return [[]];
  if(sql.startsWith('SELECT * FROM CLInventoryLines WHERE SessionId=? AND RequestKey='))return [state.lines.filter(l=>l.RequestKey===args[1])];
  if(sql.startsWith('SELECT * FROM CLInventoryLines WHERE Id='))return [state.lines.filter(l=>l.Id===args[0])];
  if(sql.startsWith('SELECT v.Id AS ProductVariantId'))return [state.product?[{...state.product,Power:state.product.NeedsReview?null:state.product.Power}]:[]];
  if(sql==='CALL GetProductCategories()')return [[[...(options.categories||[{Name:'Natural'},{Name:'Halloween'}])]]];
  if(sql==='CALL GetProductPowers()')return [[[...(options.powers||[{Power:-1.5},{Power:1.25}])]]];
  if(sql.startsWith('SELECT DISTINCT Marca'))return [[{Name:'Urban Layer'}]];
  if(sql.includes('SELECT Id, Folio, Brand, Status FROM CLInventorySessions'))return [options.locked?[{Folio:'INV-OTRO',Brand:'Urban Layer'}]:[]];
  if(sql.includes('INFORMATION_SCHEMA.COLUMNS'))return [[{CHARACTER_MAXIMUM_LENGTH:190}]];
  if(sql.startsWith('SELECT Id FROM Products WHERE'))return [options.ambiguousBase?[{Id:90},{Id:92}]:(state.base?[{Id:state.base.Id}]:[])];
  if(sql.startsWith('SELECT Id FROM ProductVariants WHERE ProductId='))return [options.duplicateVariant?[{Id:99}]:[]];
  if(sql.startsWith('INSERT INTO Products')){state.base={Id:90,SKU:args[0],Category:args[1],Marca:args[2],Modelo:args[3],Description:args[4],Image:args[5],Status:args[6]};return [{insertId:90}];}
  if(sql.startsWith('INSERT INTO ProductVariants')){state.product={ProductVariantId:91,ProductId:args[0],...state.base,Color:args[1],Power:args[2],PowerLabel:args[3],Price:args[4],Stock:args[5],FactoryCode:args[6],InternalCode:args[7],ScanCode:args[8],CodeType:args[9],VariantStatus:args[10],NeedsReview:1};return [{insertId:91}];}
  if(sql.startsWith('INSERT INTO CLInventoryDrafts')){state.drafts.push(args);return [{affectedRows:1}];}
  if(sql.startsWith('UPDATE ProductVariants SET Stock=')){state.product.Stock=args[0];return [{affectedRows:1}];}
  if(sql.startsWith('INSERT INTO CLInventoryLines')){const columns=['SessionId','RequestKey','ProductVariantId','ProductId','Code','Quantity','StockBefore','StockAfter','Marca','Modelo','Category','Color','Power','PowerLabel','Price','NeedsReview','ScanMethod','CreatedBy','CreatedByName'];const line={Id:state.lines.length+1,...Object.fromEntries(columns.map((key,i)=>[key,args[i]]))};state.lines.push(line);return [{insertId:line.Id}];}
  if(sql.startsWith('UPDATE CLInventorySessions SET UpdatedAt='))return [{affectedRows:1}];
  throw new Error('SQL inesperado: '+sql);
 }
 const c={execute:exec,query:exec,beginTransaction:async()=>{saved=structuredClone(state);calls.push(['BEGIN']);},commit:async()=>calls.push(['COMMIT']),rollback:async()=>{state=saved;calls.push(['ROLLBACK']);},release:()=>calls.push(['RELEASE']),destroy:()=>{}};
 return {service:createService({getConnection:async()=>c}),calls,header,get state(){return state;}};
}
test('producto nuevo exige todos sus datos y devuelve cada campo faltante',()=>{
 assert.throws(()=>validateReceiptProduct({},''),e=>e.code==='PRODUCT_FIELDS_REQUIRED'&&['brand','model','category','color','price','power'].every(k=>e.details.fields[k]));
});
test('no se deduce sin graduación cuando el dato está vacío',()=>{
 for(const power of ['',null,undefined])assert.throws(()=>validateReceiptProduct({...DETAILS,power},'Urban Layer'),e=>!!e.details.fields.power);
 const result=validateReceiptProduct({...DETAILS,power:'0',price:'250,50'},' Urban Layer ');
 assert.equal(result.power,0);assert.equal(result.powerLabel,'Sin graduación');assert.equal(result.price,250.5);assert.equal(result.brand,'Urban Layer');
});
test('precio válido no acepta cero, negativos, NaN, infinito ni decimales extra',()=>{
 for(const price of ['0','-1','NaN',Infinity,true,[250],{},'1.234','100000000','1e3',''])assert.throws(()=>validateReceiptProduct({...DETAILS,price},'Urban Layer'),e=>!!e.details.fields.price);
});
test('los errores de longitud y caracteres señalan el campo específico',()=>{
 for(const model of ['A'.repeat(256),'Nombre\nOtro',42])assert.throws(()=>validateReceiptProduct({...DETAILS,model},'Urban Layer'),e=>!!e.details.fields.model);
});
test('alta completa guarda datos, código con ceros, cantidad y fotos pendientes',async()=>{
 const f=fixture(),result=await f.service.add(SID,payload(),USER),p=f.state.product;
 assert.equal(p.Modelo,'Aurora');assert.equal(p.Category,'Natural');assert.equal(p.Color,'Miel');assert.equal(p.Price,250.5);assert.equal(p.Power,-1.5);assert.equal(p.PowerLabel,'-1.50');
 assert.equal(p.Stock,4);assert.equal(p.ScanCode,'0000999');assert.equal(p.Image,'');assert.equal(p.Status,'Inactivo');assert.equal(p.VariantStatus,'Inactivo');assert.equal(f.state.drafts.length,1);
 assert.equal(result.line.StockBefore,0);assert.equal(result.line.StockAfter,4);assert.equal(result.line.Power,-1.5);assert.equal(result.line.NeedsReview,1);assert.ok(f.calls.some(([s])=>s==='COMMIT'));
});
test('alta sin graduación la conserva explícitamente',async()=>{
 const f=fixture();await f.service.add(SID,payload({newProduct:{...DETAILS,power:'0'}}),USER);
 assert.equal(f.state.product.Power,0);assert.equal(f.state.product.PowerLabel,'Sin graduación');assert.equal(f.state.lines[0].Power,0);
});
test('categoría y graduación se validan contra los catálogos disponibles',async()=>{
 for(const [key,value] of [['category','No existe'],['power','-9']]){
  const f=fixture();await assert.rejects(()=>f.service.add(SID,payload({newProduct:{...DETAILS,[key]:value}}),USER),e=>e.code==='PRODUCT_FIELDS_REQUIRED'&&!!e.details.fields[key]);
  assert.equal(f.state.product,null);assert.equal(f.state.lines.length,0);assert.ok(!f.calls.some(([s])=>s.startsWith('INSERT INTO Products')));
 }
});
test('potencia positiva del catálogo se guarda sin cambiarla de signo',async()=>{
 const f=fixture();await f.service.add(SID,payload({newProduct:{...DETAILS,power:'+1.25'}}),USER);
 assert.equal(f.state.product.Power,1.25);assert.equal(f.state.lines[0].Power,1.25);
});
test('recepción antigua sin datos de producto nuevo no crea ni suma nada',async()=>{
 const f=fixture();await assert.rejects(()=>f.service.add(SID,payload({newProduct:undefined}),USER),e=>e.code==='PRODUCT_FIELDS_REQUIRED');
 assert.equal(f.state.product,null);assert.equal(f.state.lines.length,0);
});
test('código existente recibe solo cantidad sin exigir ni cambiar metadatos',async()=>{
 const f=fixture({product:{}});const before={...f.state.product};const r=await f.service.add(SID,payload({newProduct:undefined,brand:''}),USER);
 assert.deepEqual(f.state.product,{...before,Stock:11});assert.equal(r.line.StockBefore,7);assert.equal(r.line.StockAfter,11);assert.ok(!f.calls.some(([s])=>s.startsWith('INSERT INTO Products')||s.startsWith('CALL GetProduct')));
});
test('código registrado mientras se capturaban datos pide buscarlo de nuevo',async()=>{
 const f=fixture({product:{}});await assert.rejects(()=>f.service.add(SID,payload(),USER),e=>e.code==='PRODUCT_NOW_EXISTS');assert.equal(f.state.product.Stock,7);assert.equal(f.state.lines.length,0);
});
test('nueva variante aprovecha el producto base sin duplicarlo ni desactivarlo',async()=>{
 const base={Id:90,Marca:'Urban Layer',Category:'Natural',Modelo:'Aurora',Status:'Activo',Image:'foto.webp'},f=fixture({base});
 await f.service.add(SID,payload(),USER);assert.deepEqual(f.state.base,base);assert.equal(f.state.product.ProductId,90);assert.ok(!f.calls.some(([s])=>s.startsWith('INSERT INTO Products')));assert.equal(f.state.product.VariantStatus,'Inactivo');
});
test('variante ya existente y bases ambiguas se rechazan sin modificar stock',async()=>{
 for(const [options,code] of [[{base:{Id:90},duplicateVariant:true},'VARIANT_ALREADY_EXISTS'],[{ambiguousBase:true},'AMBIGUOUS_PRODUCT']]){
  const f=fixture(options);await assert.rejects(()=>f.service.add(SID,payload(),USER),e=>e.code===code);assert.equal(f.state.product,null);assert.equal(f.state.lines.length,0);
 }
});
test('reintentar el alta completa recupera la misma entrada aun tras finalizar',async()=>{
 const f=fixture();await f.service.add(SID,payload(),USER);f.header.Status='COMPLETED';
 const r=await f.service.add(SID,payload(),USER);assert.equal(r.replayed,true);assert.equal(f.state.product.Stock,4);assert.equal(f.state.lines.length,1);assert.equal(f.calls.filter(([s])=>s.startsWith('INSERT INTO Products')).length,1);
});
test('misma clave con otros datos nuevos no vuelve a sumar cantidad',async()=>{
 const f=fixture();await f.service.add(SID,payload(),USER);
 for(const [key,value] of [['model','Otro'],['category','Halloween'],['color','Gris'],['price','300'],['power','0']])await assert.rejects(()=>f.service.add(SID,payload({newProduct:{...DETAILS,[key]:value}}),USER),e=>e.code==='IDEMPOTENCY_CONFLICT');
 assert.equal(f.state.product.Stock,4);assert.equal(f.state.lines.length,1);
});
test('el reintento tolera espacios y mayúsculas equivalentes sin duplicar',async()=>{
 const f=fixture();await f.service.add(SID,payload(),USER);
 const r=await f.service.add(SID,payload({brand:' urban layer ',newProduct:{...DETAILS,model:' AURORA ',category:'natural',color:' miel ',price:'250,50',power:'-1.50'}}),USER);
 assert.equal(r.replayed,true);assert.equal(f.state.product.Stock,4);
});
test('fallo de registro revierte producto, borrador, stock y entrada juntos',async()=>{
 const f=fixture({failAt:'INSERT INTO CLInventoryLines'});await assert.rejects(()=>f.service.add(SID,payload(),USER),/Falla simulada/);
 assert.deepEqual(f.state,{product:null,base:null,lines:[],drafts:[]});assert.ok(f.calls.some(([s])=>s==='ROLLBACK'));assert.ok(!f.calls.some(([s])=>s==='COMMIT'));
});
test('una marca en conteo sigue bloqueada para nuevas recepciones',async()=>{
 const f=fixture({locked:true});await assert.rejects(()=>f.service.add(SID,payload(),USER),e=>e.code==='BRAND_LOCKED');assert.equal(f.state.product,null);assert.equal(f.state.lines.length,0);
});
test('nombres se envían como parámetros sin convertirlos en instrucciones SQL',async()=>{
 const f=fixture(),model="Aurora'; DROP TABLE Products; --";await f.service.add(SID,payload({newProduct:{...DETAILS,model}}),USER);
 const [sql,args]=f.calls.find(([s])=>s.startsWith('INSERT INTO Products'));assert.ok(!sql.includes(model));assert.equal(args[3],model);assert.equal(f.state.product.Modelo,model);
});
