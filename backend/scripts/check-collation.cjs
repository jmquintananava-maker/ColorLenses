'use strict';
// Read-only diagnostic. No UPDATE/ALTER/INSERT/DELETE or inventory reset.
const db = require('../db');
(async()=>{
 try {
  const [settings]=await db.query(`SELECT VERSION() AS Version,
   @@character_set_client AS ClientCharset,@@character_set_connection AS ConnectionCharset,
   @@collation_connection AS ConnectionCollation,@@collation_database AS DatabaseCollation`);
  console.table(settings);
  for(const state of ['PAUSED','ACTIVE','COMPLETED']) {
   const timestamp=state==='COMPLETED'?'UTC_TIMESTAMP(3)':'NULL';
   const [r]=await db.execute(`SELECT ? AS State,${timestamp} AS CompletedAt`,[state]);
   console.table(r);
  }
  console.log('Comprobación completada. No se modificaron datos ni existencias.');
 } catch(e) {console.error('Diagnóstico:',e.code || e.name,e.message);process.exitCode=1;}
 finally {await db.end();}
})();
