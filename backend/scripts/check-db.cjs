/* Solo lectura: no modifica tablas, inventarios, productos ni SPs. */
'use strict';
require('dotenv').config({path:require('node:path').join(__dirname,'../.env')});
const mysql=require('mysql2/promise');
const {inspectSchema}=require('../lib/schema-check');
(async()=>{
 let c;
 try{
  for(const k of ['DB_HOST','DB_USER','DB_NAME'])if(!process.env[k])throw new Error('Falta '+k+' en el entorno o backend/.env.');
  c=await mysql.createConnection({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,port:Number(process.env.DB_PORT||3306),connectTimeout:10000});
  const result=await inspectSchema(c,!process.argv.includes('--before-migration'));
  const [duplicates]=await c.query(`SELECT Code,COUNT(DISTINCT Id) AS Variants FROM (
    SELECT Id,ScanCode AS Code FROM ProductVariants WHERE ScanCode IS NOT NULL AND ScanCode<>''
    UNION ALL SELECT Id,FactoryCode AS Code FROM ProductVariants WHERE FactoryCode IS NOT NULL AND FactoryCode<>''
    UNION ALL SELECT Id,InternalCode AS Code FROM ProductVariants WHERE InternalCode IS NOT NULL AND InternalCode<>''
  ) codes GROUP BY Code HAVING COUNT(DISTINCT Id)>1 LIMIT 30`);
  console.log(result.ok?'Esquema compatible con las verificaciones realizadas.':'CORREGIR ANTES DE USAR INVENTARIO:');
  result.errors.forEach(e=>console.error('- '+e));
  if(duplicates.length){console.warn('Hay códigos ambiguos. El escáner los rechazará hasta corregirlos en Productos.');console.table(duplicates);}
  console.log('No se modificó ningún dato. Esta revisión no sustituye una prueba completa de los SPs existentes.');
  if(!result.ok)process.exitCode=1;
 }catch(e){console.error('Verificación no completada:',e.code||'',e.message);process.exitCode=1;}finally{if(c)await c.end();}
})();
