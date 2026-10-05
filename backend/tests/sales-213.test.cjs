'use strict';
// Pruebas de lógica con una conexión simulada; no sustituyen un ensayo sobre MariaDB.
const test=require('node:test'),assert=require('node:assert/strict');
const make=require('../lib/sales-service');
function fixture(options={}){
 let state={points:77,stock:5,sales:[],details:[],visits:0,spent:0};let before;
 const calls=[];
 const c={beginTransaction:async()=>{calls.push('BEGIN');before=structuredClone(state);},commit:async()=>{calls.push('COMMIT');if(options.commitError)throw Error('conexión perdida');},rollback:async()=>{calls.push('ROLLBACK');if(before)state=structuredClone(before);},destroy:()=>calls.push('DESTROY'),execute:async(sql,args=[])=>{
  calls.push(sql);
  if(sql.startsWith('SELECT Id,Status,Level'))return [[{Id:1,Status:'Activo',Level:'Silver'}]];
  if(sql.startsWith('SELECT v.Id'))return [[{Id:1,ProductId:10,Price:350,Stock:state.stock,VariantStatus:'Activo',ProductStatus:'Activo',Modelo:'Lente de prueba'}]];
  if(sql.startsWith('CALL GetCustomerAvailablePoints'))return [[[{AvailablePoints:state.points}]]];
  if(sql.startsWith('CALL RedeemCustomerPoints')){if(options.schemaError)throw Object.assign(new Error('Unknown column PointsAvailable'),{code:'ER_BAD_FIELD_ERROR'});state.points-=args[1];return [[]];}
  if(sql.startsWith('INSERT INTO Sales')){state.sales.push(args);return [{insertId:8}];}
  if(sql.startsWith('INSERT INTO SaleItems')){state.details.push(args);return [{insertId:8}];}
  if(sql.startsWith('UPDATE ProductVariants')){state.stock-=args[0];return [{affectedRows:1}];}
  if(sql.startsWith('CALL UpdateCustomerStats')){state.visits++;state.spent+=args[1];return [[]];}
  if(sql.startsWith('CALL AddCustomerPoints')){if(options.addError)throw new Error('fallo después de descontar stock');state.points+=args[2];return [[]];}
  if(sql.startsWith('SELECT c.Points'))return [[{Points:state.points,ExpiresAt:'2027-10-04'}]];
  if(sql.startsWith('CALL RecalculateCustomerPoints'))return [[]];
  throw Error('Consulta no contemplada: '+sql);
 }};
 const res={statusCode:200,status(n){this.statusCode=n;return this},json(body){this.body=body;return this}};
 const body={CustomerId:1,Subtotal:350,Discount:10,RedeemedPoints:10,Total:340,Cart:[{ProductVariantId:1,ProductId:10,Quantity:1,Price:350}]};
 const handler=make({calculatePointsByLevel:(total)=>Math.floor(total/50)});
 return {c,res,body,calls,state:()=>state,run:async(b=body)=>{await handler({stockConnection:c,body:b},res);return res}};
}
test('Venta con canje: calcula con precios reales y confirma todo junto',async()=>{const f=fixture();await f.run();assert.equal(f.res.statusCode,200);assert.equal(f.res.body.Total,340);assert.equal(f.res.body.PointsEarned,6);assert.equal(f.res.body.PointsAvailable,73);assert.equal(f.state().stock,4);assert.equal(f.state().sales.length,1);assert.equal(f.state().visits,1);assert.equal(f.calls.filter(q=>q==='COMMIT').length,1);assert.ok(f.calls.findIndex(q=>q.startsWith('CALL Redeem'))<f.calls.findIndex(q=>q.startsWith('INSERT INTO Sales')));});
test('SQL anterior falla ANTES de crear venta y descontar stock',async()=>{const f=fixture({schemaError:true});await f.run();assert.equal(f.res.body.code,'POINTS_SCHEMA_MISMATCH');assert.equal(f.state().stock,5);assert.equal(f.state().points,77);assert.equal(f.state().sales.length,0);assert.ok(!f.calls.some(q=>q.startsWith('INSERT INTO Sales')));});
test('Fallo después del stock revierte venta, detalle, puntos y estadísticas',async()=>{const f=fixture({addError:true});await f.run();assert.equal(f.res.statusCode,500);assert.equal(f.state().stock,5);assert.equal(f.state().points,77);assert.equal(f.state().visits,0);assert.equal(f.state().sales.length,0);assert.equal(f.state().details.length,0);assert.ok(f.res.body.rolledBack);});
test('Error al confirmar no se presenta como una venta seguramente revertida',async()=>{const f=fixture({commitError:true});await f.run();assert.equal(f.res.body.code,'SALE_CONFIRMATION_UNKNOWN');assert.equal(f.res.body.rolledBack,undefined);});
for(const [name,modify]of [['negativos',b=>({...b,RedeemedPoints:-1})],['fraccionarios',b=>({...b,RedeemedPoints:1.5})],['NaN',b=>({...b,RedeemedPoints:'no'})],['cantidad fraccionaria',b=>({...b,Cart:[{...b.Cart[0],Quantity:1.5}]})],['importe falsificado',b=>({...b,Subtotal:1,Total:1,Discount:0,RedeemedPoints:0})],['precio diferente',b=>({...b,Cart:[{...b.Cart[0],Price:1}]})],['producto incorrecto',b=>({...b,Cart:[{...b.Cart[0],ProductId:999}]})],['variante repetida',b=>({...b,Cart:[b.Cart[0],b.Cart[0]]})],['stock insuficiente',b=>({...b,Cart:[{...b.Cart[0],Quantity:6}]})]])test('Rechaza '+name+' sin guardar',async()=>{const f=fixture();await f.run(modify(f.body));assert.ok(f.res.statusCode>=400);assert.equal(f.state().sales.length,0);assert.equal(f.state().stock,5);assert.equal(f.state().points,77);});
test('Venta sin canje no llama RedeemCustomerPoints',async()=>{const f=fixture();await f.run({...f.body,Discount:0,RedeemedPoints:0,Total:350});assert.equal(f.res.statusCode,200);assert.equal(f.state().points,84);assert.ok(!f.calls.some(q=>q.startsWith('CALL Redeem')));});
test('Rechaza saldo insuficiente sin insertar la venta',async()=>{const f=fixture();await f.run({...f.body,Discount:78,RedeemedPoints:78,Total:272});assert.equal(f.res.body.code,'INSUFFICIENT_POINTS');assert.equal(f.state().sales.length,0);});
