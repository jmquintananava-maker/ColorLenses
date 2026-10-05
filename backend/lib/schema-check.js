'use strict';
const {AppError}=require('./inventory-core');
const expected={
 Products:['Id','SKU','Category','Marca','Modelo','Description','Image','Image2','Image3','Status'],
 ProductVariants:['Id','ProductId','Color','Power','PowerLabel','Price','Stock','FactoryCode','InternalCode','ScanCode','CodeType','Status']
};
async function inspectSchema(db,includeInventory=true){
 const names=[...Object.keys(expected),...(includeInventory?['CLInventorySessions','CLInventoryBaseline','CLInventoryLines','CLInventoryDrafts','CLInventoryEvents','CLInventoryScopes']:[])];
 const [tables]=await db.query('SELECT TABLE_NAME,ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('+names.map(()=>'?').join(',')+')',names);
 const errors=[];
 for(const name of names){const table=tables.find(t=>t.TABLE_NAME===name);if(!table)errors.push('Falta la tabla '+name);else if(String(table.ENGINE).toUpperCase()!=='INNODB')errors.push(name+' debe usar InnoDB para garantizar reversión de operaciones.');}
 const [columns]=await db.query('SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA,CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (?,?)',['Products','ProductVariants']);
 for(const [table,fields] of Object.entries(expected))for(const field of fields)if(!columns.some(c=>c.TABLE_NAME===table&&c.COLUMN_NAME===field))errors.push('Falta '+table+'.'+field);
 // Detectar columnas obligatorias adicionales que impedirían altas automáticas.
 for(const c of columns)if(!expected[c.TABLE_NAME]?.includes(c.COLUMN_NAME)&&c.IS_NULLABLE==='NO'&&c.COLUMN_DEFAULT===null&&!/auto_increment|GENERATED/i.test(c.EXTRA||''))errors.push('Revisar la columna obligatoria adicional '+c.TABLE_NAME+'.'+c.COLUMN_NAME+' antes de crear productos por escaneo.');
 return {ok:!errors.length,errors,tables,columns};
}
async function assertTransactional(c){
 const names=['Products','ProductVariants','CLInventorySessions','CLInventoryBaseline','CLInventoryLines','CLInventoryDrafts','CLInventoryEvents','CLInventoryScopes'];
 const [rows]=await c.query('SELECT TABLE_NAME,ENGINE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('+names.map(()=>'?').join(',')+')',names);
 if(names.some(n=>!rows.some(r=>r.TABLE_NAME===n&&String(r.ENGINE).toUpperCase()==='INNODB')))throw new AppError('No es seguro modificar inventario: instala la migración y verifica que Products, ProductVariants y las tablas CLInventory usen InnoDB. Ejecuta npm run check:db.',503,'SCHEMA_NOT_READY');
}
module.exports={inspectSchema,assertTransactional};
