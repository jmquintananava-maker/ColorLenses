'use strict';
// ColorLenses 2.1.3. La conexión y el bloqueo de inventario pertenecen a withStockLock.
class SaleError extends Error {
  constructor(message, status=400, code='SALE_VALIDATION') { super(message); this.status=status; this.code=code; }
}
function integer(value, label, minimum=0) {
  const n=Number(value);
  if (!Number.isSafeInteger(n) || n<minimum || n>2147483647) throw new SaleError(`${label}: indica un entero válido.`);
  return n;
}
function cents(value, label) {
  const n=Number(value), rounded=Math.round(n*100);
  if (!Number.isFinite(n) || n<0 || n>99999999.99 || Math.abs(n*100-rounded)>0.00001) throw new SaleError(`${label}: importe inválido.`);
  return rounded;
}
module.exports=function createSalesHandler({calculatePointsByLevel}) {
  return async function registerSale(req,res) {
    const c=req.stockConnection;
    let transaction=false, commitAttempted=false;
    try {
      const b=req.body||{};
      const customerId=integer(b.CustomerId,'Cliente',1);
      const redeemed=integer(b.RedeemedPoints??0,'Puntos a canjear');
      const discount=cents(b.Discount??0,'Descuento');
      const receivedSubtotal=cents(b.Subtotal??b.Total,'Subtotal');
      const receivedTotal=cents(b.Total,'Total');
      if (discount!==redeemed*100) throw new SaleError('El descuento debe ser igual a los puntos canjeados.');
      const cart=Array.isArray(b.Cart)?b.Cart:[];
      if (!cart.length || cart.length>500) throw new SaleError('El carrito debe contener entre 1 y 500 variantes.');
      const ids=new Set();
      const items=cart.map(item=>{
        const id=integer(item.ProductVariantId||item.VariantId||item.Id,'Variante',1);
        if(ids.has(id))throw new SaleError('Agrupa las variantes repetidas en el carrito.');
        ids.add(id);
        return {id,quantity:integer(item.Quantity??1,'Cantidad',1),client:item};
      }).sort((a,b)=>a.id-b.id);
      await c.beginTransaction(); transaction=true;
      const [customers]=await c.execute('SELECT Id,Status,Level FROM Customers WHERE Id=? FOR UPDATE',[customerId]);
      const customer=customers[0];
      if(!customer)throw new SaleError('Cliente no encontrado.',404);
      if(customer.Status==='Inactivo')throw new SaleError('Este cliente está inactivo.',403);
      let subtotal=0;
      for(const item of items){
        const [rows]=await c.execute(`SELECT v.Id,v.ProductId,v.Price,v.Stock,v.Status AS VariantStatus,
          p.Status AS ProductStatus,p.Modelo FROM ProductVariants v JOIN Products p ON p.Id=v.ProductId
          WHERE v.Id=? FOR UPDATE`,[item.id]);
        const v=rows[0];
        if(!v)throw new SaleError(`Variante ${item.id} no encontrada.`,404);
        if(v.ProductStatus!=='Activo'||v.VariantStatus!=='Activo')throw new SaleError(`El producto ${v.Modelo} no está activo.`);
        if(Number(v.Stock)<item.quantity)throw new SaleError(`Stock insuficiente para ${v.Modelo}. Disponible: ${v.Stock}.`,409,'INSUFFICIENT_STOCK');
        item.productId=integer(v.ProductId,'Producto',1);
        if(item.client.ProductId!=null && Number(item.client.ProductId)!==item.productId)throw new SaleError('El producto y la variante del carrito no coinciden. Vuelve a seleccionarlo.');
        item.price=cents(v.Price,'Precio en catálogo');
        if(item.price<=0)throw new SaleError(`Completa el precio de ${v.Modelo} antes de vender.`);
        if(item.client.Price!=null&&cents(item.client.Price,'Precio del carrito')!==item.price)throw new SaleError(`El precio de ${v.Modelo} cambió. Actualiza el carrito.`,409,'PRICE_CHANGED');
        item.subtotal=item.price*item.quantity;
        if(!Number.isSafeInteger(item.subtotal))throw new SaleError('Importe de renglón fuera de rango.');
        subtotal+=item.subtotal;
      }
      if(subtotal>9999999999)throw new SaleError('Importe de venta fuera de rango.');
      if(subtotal!==receivedSubtotal)throw new SaleError('El subtotal no coincide con las cantidades y precios del catálogo.');
      if(discount>subtotal)throw new SaleError('No puedes canjear más puntos que el subtotal.');
      const total=subtotal-discount;
      if(total!==receivedTotal)throw new SaleError('El total no coincide con subtotal menos descuento.');
      // Un fallo del canje sucede ANTES de crear la venta o descontar productos.
      await c.execute('CALL RecalculateCustomerPoints(?)',[customerId]);
      const [pointSets]=await c.execute('CALL GetCustomerAvailablePoints(?)',[customerId]);
      if(redeemed>Number(pointSets[0]?.[0]?.AvailablePoints??0))throw new SaleError('El cliente no tiene suficientes puntos vigentes.',409,'INSUFFICIENT_POINTS');
      if(redeemed>0)await c.execute('CALL RedeemCustomerPoints(?,?)',[customerId,redeemed]);
      const [sale]=await c.execute('INSERT INTO Sales (CustomerId,Subtotal,Discount,RedeemedPoints,Total) VALUES (?,?,?,?,?)',[customerId,subtotal/100,discount/100,redeemed,total/100]);
      const saleId=Number(sale.insertId);
      if(!Number.isSafeInteger(saleId)||saleId<=0)throw new Error('No se recibió el identificador de la venta.');
      for(const item of items){
        await c.execute('INSERT INTO SaleItems (SaleId,ProductId,ProductVariantId,Quantity,Price,Subtotal) VALUES (?,?,?,?,?,?)',[saleId,item.productId,item.id,item.quantity,item.price/100,item.subtotal/100]);
        const [updated]=await c.execute(`UPDATE ProductVariants SET Status=CASE WHEN Stock-?=0 THEN 'Inactivo' ELSE Status END,
          Stock=Stock-? WHERE Id=? AND Stock>=?`,[item.quantity,item.quantity,item.id,item.quantity]);
        if(updated.affectedRows!==1)throw new SaleError('No se pudo reservar el stock; actualiza el carrito.',409,'STOCK_CHANGED');
      }
      const pointsEarned=integer(calculatePointsByLevel(total/100,customer.Level),'Puntos generados');
      await c.execute('CALL UpdateCustomerStatsWithRedemption(?,?,?,?)',[customerId,total/100,0,0]);
      if(pointsEarned>0)await c.execute('CALL AddCustomerPoints(?,?,?)',[customerId,saleId,pointsEarned]);
      await c.execute('CALL RecalculateCustomerPoints(?)',[customerId]);
      const [after]=await c.execute("SELECT c.Points,(SELECT DATE_FORMAT(MAX(l.ExpiresAt),'%Y-%m-%d') FROM CustomerPointLots l WHERE l.SaleId=?) AS ExpiresAt FROM Customers c WHERE c.Id=?",[saleId,customerId]);
      commitAttempted=true; await c.commit(); transaction=false;
      return res.json({success:true,SaleId:saleId,Subtotal:subtotal/100,Discount:discount/100,RedeemedPoints:redeemed,Total:total/100,PointsEarned:pointsEarned,PointsAvailable:Number(after[0]?.Points??0),PointsExpiresAt:after[0]?.ExpiresAt||null,message:'✅ Venta registrada'});
    } catch(e) {
      let rolledBack=!transaction;
      if(transaction){try{await c.rollback();rolledBack=true;}catch{c.destroy();}}
      console.error('[Sales]',e.code||e.name,e.sqlMessage||e.message);
      if(commitAttempted||!rolledBack)return res.status(409).json({code:'SALE_CONFIRMATION_UNKNOWN',message:'No se pudo confirmar el resultado. Conserva el carrito y revisa el Historial antes de repetir la venta.'});
      if(e instanceof SaleError)return res.status(e.status).json({code:e.code,message:e.message,rolledBack:true});
      if(e.code==='ER_BAD_FIELD_ERROR' && /PointsAvailable|PointsRedeemed/.test(e.sqlMessage||e.message))return res.status(409).json({code:'POINTS_SCHEMA_MISMATCH',message:'Falta aplicar la reparación SQL 2.1.3 de puntos. Esta operación se revirtió; no se creó una venta ni se descontó stock.',rolledBack:true});
      if(e.code==='ER_SIGNAL_EXCEPTION')return res.status(409).json({code:'POINTS_REJECTED',message:e.sqlMessage||'No se autorizó el canje de puntos.',rolledBack:true});
      return res.status(500).json({code:e.code||'SALE_FAILED',message:'No se pudo registrar la venta. Se revirtió la operación y se conservó el carrito. Revisa el detalle [Sales] del backend.',rolledBack:true});
    }
  };
};
module.exports.SaleError=SaleError;
