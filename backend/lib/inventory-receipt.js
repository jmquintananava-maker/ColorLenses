'use strict';
const {AppError,text,sameBrand}=require('./inventory-core');
function validateReceiptProduct(input,brand) {
  const value=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
  const fields={},data={};
  for(const [key,label,max] of [['brand','Marca',190],['model','Nombre / modelo',255],['category','Categoría',190],['color','Color',190]]) {
    try {data[key]=text(key==='brand'?brand:value[key],max);if(!data[key])fields[key]=`Completa ${label.toLowerCase()}.`;}
    catch(error){fields[key]=error.message;}
  }
  const price=String(value.price??'').trim().replace(',','.');
  if(!['string','number'].includes(typeof value.price)||!/^\d{1,8}(?:\.\d{1,2})?$/.test(price)||Number(price)<=0)fields.price='Indica un precio mayor que cero, con máximo dos decimales.';
  else data.price=Number(price);
  const power=String(value.power??'').trim();
  if(!['string','number'].includes(typeof value.power)||!/^[+-]?\d{1,4}(?:\.\d{1,2})?$/.test(power))fields.power='Selecciona la graduación; elige Sin graduación si corresponde.';
  else {data.power=Number(power);data.powerLabel=data.power===0?'Sin graduación':data.power.toFixed(2);}
  if(Object.keys(fields).length)throw new AppError('Completa los campos marcados antes de agregar el producto nuevo.',400,'PRODUCT_FIELDS_REQUIRED',{fields});
  return data;
}
async function canonicalReceiptProduct(c,input,brand) {
  const data=validateReceiptProduct(input,brand);
  const [categories]=await c.execute('CALL GetProductCategories()');
  const category=(categories[0]||[]).find(row=>sameBrand(row.Name||row.Category,data.category));
  if(!category)throw new AppError('La categoría ya no está disponible. Selecciona una categoría del catálogo.',400,'PRODUCT_FIELDS_REQUIRED',{fields:{category:'Selecciona una categoría disponible.'}});
  data.category=String(category.Name||category.Category).trim();
  if(data.power!==0) {
    const [powers]=await c.execute('CALL GetProductPowers()');
    if(!(powers[0]||[]).some(row=>row.Power!=null&&Number(row.Power)===data.power))throw new AppError('La graduación ya no está disponible. Selecciona una del catálogo.',400,'PRODUCT_FIELDS_REQUIRED',{fields:{power:'Selecciona una graduación disponible.'}});
  }
  return data;
}
function matchesRecordedProduct(line,input,brand) {
  const data=validateReceiptProduct(input,brand);
  return sameBrand(line.Marca,data.brand)&&sameBrand(line.Modelo,data.model)&&sameBrand(line.Category,data.category)&&sameBrand(line.Color,data.color)&&line.Power!=null&&Number(line.Power)===data.power&&Number(line.Price)===data.price;
}
module.exports={validateReceiptProduct,canonicalReceiptProduct,matchesRecordedProduct};
