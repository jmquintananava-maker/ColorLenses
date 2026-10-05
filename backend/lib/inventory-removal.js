'use strict';
const {createHash}=require('node:crypto');
const {AppError,requestKey,transaction,assertBrandUnlocked}=require('./inventory-core');
const {assertTransactional}=require('./schema-check');

// La eliminación se conserva en la bitácora; nunca borra productos, imágenes ni folios.
const DELETE_ACTION='DELETE_RECEIPT';
function summarize(header,lines,deleted=false) {
 const units=lines.reduce((sum,line)=>sum+Number(line.Quantity),0);
 const previewToken=createHash('sha256').update(JSON.stringify([header.Id,lines.map(line=>[
  String(line.Id),String(line.ProductVariantId),String(line.Quantity),line.Marca,String(line.CreatedAt)
 ])])).digest('hex');
 return {session:{Id:header.Id,Folio:header.Folio,Status:header.Status},units,captures:lines.length,
  variants:new Set(lines.map(line=>String(line.ProductVariantId))).size,previewToken,deleted};
}
function createRemovalService(db) {
 async function read(c,id) {
  const [sessions]=await c.execute('SELECT * FROM CLInventorySessions WHERE Id=? FOR UPDATE',[id]);
  const header=sessions[0];
  if(!header)throw new AppError('No se encontró esta entrada de mercancía.',404,'NOT_FOUND');
  if(header.Kind!=='RECEIPT')throw new AppError('Solo se pueden eliminar entradas de mercancía. Un inventario completo no se puede eliminar.',409,'RECEIPT_REQUIRED');
  const [events]=await c.execute('SELECT Id FROM CLInventoryEvents WHERE SessionId=? AND Action=? LIMIT 1',[id,DELETE_ACTION]);
  if(events.length)return {header,lines:[],deleted:true};
  const [lines]=await c.execute('SELECT * FROM CLInventoryLines WHERE SessionId=? AND VoidedAt IS NULL ORDER BY Id FOR UPDATE',[id]);
  return {header,lines,deleted:false};
 }
 async function preview(sessionId) {
  const id=requestKey(sessionId);
  return transaction(db,async c=>{const {header,lines,deleted}=await read(c,id);return summarize(header,lines,deleted);});
 }
 async function remove(sessionId,input,user) {
  const id=requestKey(sessionId);
  if(input?.confirm!==true)throw new AppError('Confirma la eliminación de esta entrada antes de continuar.',400,'CONFIRM_REQUIRED');
  if(typeof input.previewToken!=='string'||!/^[a-f0-9]{64}$/.test(input.previewToken))throw new AppError('Revisa la entrada antes de confirmar su eliminación.',400,'PREVIEW_REQUIRED');
  return transaction(db,async c=>{
   await assertTransactional(c);
   const {header,lines,deleted}=await read(c,id);
   if(deleted)return {success:true,replayed:true,removedUnits:0};
   const summary=summarize(header,lines);
   if(summary.previewToken!==input.previewToken)throw new AppError('La entrada cambió desde que la revisaste. Vuelve a revisar las unidades antes de eliminarla.',409,'RECEIPT_CHANGED');
   const variants=new Map();
   for(const line of lines) {
    const quantity=Number(line.Quantity);
    if(!Number.isSafeInteger(quantity)||quantity<=0)throw new AppError('Hay una captura con cantidad inválida. Revisa la entrada antes de eliminarla.',409,'INVALID_QUANTITY');
    const key=String(line.ProductVariantId),item=variants.get(key)||{id:line.ProductVariantId,quantity:0,lines:[]};
    item.quantity+=quantity;item.lines.push(line);variants.set(key,item);
    if(!Number.isSafeInteger(item.quantity))throw new AppError('Las cantidades de esta entrada exceden el rango permitido.',409,'INVALID_QUANTITY');
   }
   // Validar todas las variantes antes de hacer la primera resta.
   for(const item of variants.values()) {
    const [products]=await c.execute('SELECT v.Id,v.Stock,p.Marca FROM ProductVariants v INNER JOIN Products p ON p.Id=v.ProductId WHERE v.Id=? FOR UPDATE',[item.id]);
    const product=products[0],stock=Number(product?.Stock);
    if(!product||!Number.isSafeInteger(stock)||stock<item.quantity)throw new AppError('No se puede eliminar: el stock disponible de uno de los productos ya es menor que las unidades recibidas. No se modificó ninguna existencia.',409,'INSUFFICIENT_STOCK');
    for(const brand of new Set([product.Marca,...item.lines.map(line=>line.Marca)]))await assertBrandUnlocked(c,brand);
    for(const line of item.lines) {
     for(const brand of new Set([product.Marca,line.Marca])) {
      const [newer]=await c.execute("SELECT Id FROM CLInventorySessions WHERE Kind='STOCKTAKE' AND LOWER(TRIM(Brand))=LOWER(TRIM(?)) AND CreatedAt>=? LIMIT 1",[brand,line.CreatedAt]);
      if(newer.length)throw new AppError('Una marca fue recontada después de esta entrada. No se puede eliminar una entrada anterior al reconteo; no se modificó ninguna existencia.',409,'SUPERSEDED');
     }
    }
   }
   for(const item of variants.values()) {
    const [updated]=await c.execute('UPDATE ProductVariants SET Stock=Stock-? WHERE Id=? AND Stock>=?',[item.quantity,item.id,item.quantity]);
    if(updated.affectedRows!==1)throw new AppError('Las existencias cambiaron. Revisa la entrada antes de eliminarla.',409,'INSUFFICIENT_STOCK');
   }
   for(const line of lines) {
    const [voided]=await c.execute('UPDATE CLInventoryLines SET VoidedAt=UTC_TIMESTAMP(3),VoidedBy=? WHERE Id=? AND SessionId=? AND VoidedAt IS NULL',[user.id,line.Id,id]);
    if(voided.affectedRows!==1)throw new AppError('Las capturas cambiaron. Vuelve a revisar la entrada antes de eliminarla.',409,'RECEIPT_CHANGED');
   }
   await c.execute("UPDATE CLInventorySessions SET Status='COMPLETED',UpdatedAt=UTC_TIMESTAMP(3),CompletedAt=COALESCE(CompletedAt,UTC_TIMESTAMP(3)) WHERE Id=?",[id]);
   await c.execute('INSERT INTO CLInventoryEvents (SessionId,Action,ActorId,ActorName,CreatedAt) VALUES (?,?,?,?,UTC_TIMESTAMP(3))',[id,DELETE_ACTION,user.id,String(user.fullName||user.username||'Administrador').slice(0,190)]);
   return {success:true,replayed:false,removedUnits:summary.units};
  });
 }
 return {preview,remove};
}
module.exports={createRemovalService,DELETE_ACTION};
