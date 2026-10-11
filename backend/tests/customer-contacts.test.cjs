'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ensureCustomerContacts, quickValues, createCustomerContacts } = require('../lib/customer-contacts');
const body = { FullName:'Cliente de prueba', Phone:'6561234567', WhatsApp:'6567654321', RequestKey:'c743a0b4-fd4e-4a79-9d60-51f2da28a23c' };
function fixture({ installed=true, rows=[], fail='', rollbackFail=false }={}) {
 const state={installed,rows:structuredClone(rows),calls:[],commits:0,rollbacks:0,releases:0,destroyed:0};
 let snapshot;
 const execute=async(sql,args=[])=>{
  state.calls.push({sql,args});
  if(sql.includes('INFORMATION_SCHEMA.COLUMNS'))return [state.installed?[{COLUMN_NAME:'WhatsApp'}]:[]];
  if(sql.startsWith('ALTER TABLE')){state.installed=true;return [{}];}
  if(sql===fail)throw new Error('DB failure');
  if(sql.startsWith('INSERT INTO Customers')){
   if(state.rows.some(r=>r.CardSlug===args[3]))throw Object.assign(new Error('Duplicate'),{code:'ER_DUP_ENTRY'});
   state.rows.push({Id:state.rows.length+1,FullName:args[0],Phone:args[1],WhatsApp:args[2],CardSlug:args[3],QRCode:args[4],Email:'',Notes:'',Status:'Activo',Points:0,Level:'Silver',TotalSpent:0,Visits:0});return [{insertId:state.rows.length}];
  }
  if(sql.includes('WHERE CardSlug=?'))return [state.rows.filter(r=>r.CardSlug===args[0]).map(r=>({...r}))];
  if(sql.startsWith('SELECT Id FROM Customers WHERE Id='))return [state.rows.filter(r=>r.Id===args[0]).map(r=>({Id:r.Id}))];
  if(sql.startsWith('SELECT Id,'))return [state.rows.map(r=>({Id:r.Id,WhatsApp:r.WhatsApp}))];
  if(sql.startsWith('CALL UpdateCustomer')){
   const r=state.rows.find(r=>r.Id===args[0]);['FullName','Phone','Email','Notes','CardSlug','QRCode','Status','Points','Level'].forEach((k,i)=>r[k]=args[i+1]);return [[]];
  }
  if(sql.startsWith('UPDATE Customers SET')){state.rows.find(r=>r.Id===args[1]).WhatsApp=args[0];return [{}];}
  if(sql.startsWith('CALL RecalculateCustomerPoints'))return [[]];
  throw new Error('Unexpected SQL: '+sql);
 };
 const c={execute,beginTransaction:async()=>{snapshot=structuredClone(state.rows);},commit:async()=>{state.commits++;},rollback:async()=>{state.rollbacks++;state.rows=snapshot;if(rollbackFail)throw new Error('rollback failed');},release:()=>state.releases++,destroy:()=>state.destroyed++};
 const db={execute,getConnection:async()=>c};
 return {state,db,service:createCustomerContacts(db)};
}

test('WhatsApp es aditivo y se prepara una vez incluso con consultas concurrentes',async()=>{
 const {db,state}=fixture({installed:false});await Promise.all([ensureCustomerContacts(db),ensureCustomerContacts(db)]);await ensureCustomerContacts(db);
 assert.equal(state.calls.filter(c=>c.sql.startsWith('ALTER')).length,1);assert.equal(state.calls.filter(c=>c.sql.includes('INFORMATION_SCHEMA')).length,2);
 assert.doesNotMatch(state.calls.map(c=>c.sql).join(' '),/DROP|DELETE|UPDATE|PROCEDURE/);
});
test('una columna existente no necesita permiso de ALTER; respeta su nombre',async()=>{
 const db={execute:async sql=>{assert.match(sql,/INFORMATION_SCHEMA/);return [[{COLUMN_NAME:'Whatsapp'}]];}};
 assert.equal(await ensureCustomerContacts(db),'`Whatsapp`');
});
test('sin permiso de ALTER muestra migración manual y permite reintentar después',async()=>{
 let ready=false;const db={execute:async sql=>{if(sql.startsWith('ALTER'))throw Object.assign(new Error('denied'),{code:'ER_TABLEACCESS_DENIED_ERROR'});return [ready?[{COLUMN_NAME:'WhatsApp'}]:[]];}};
 await assert.rejects(ensureCustomerContacts(db),e=>e.status===503&&e.code==='CUSTOMER_SCHEMA_REQUIRED'&&e.message.includes('004_customer_whatsapp.sql'));
 ready=true;await ensureCustomerContacts(db);
});
test('alta rápida guarda ambos contactos y fuerza Activo, Silver, cero puntos y correo vacío',async()=>{
 const {service,state}=fixture();const result=await service.quickCreate({...body,Status:'Inactivo',Points:999,Level:'Gold',Email:'extra@example.test'});
 assert.equal(result.customer.Phone,body.Phone);assert.equal(result.customer.WhatsApp,body.WhatsApp);
 assert.equal(result.customer.Status,'Activo');assert.equal(result.customer.Level,'Silver');assert.equal(result.customer.Points,0);assert.equal(result.customer.Email,'');
 assert.match(result.customer.QRCode,/^\/card\/cliente-/);assert.equal(state.commits,1);assert.equal(state.releases,1);
});
test('el reintento con la misma captura devuelve el mismo cliente sin duplicarlo',async()=>{
 const {service,state}=fixture();const first=await service.quickCreate(body);const second=await service.quickCreate(body);
 assert.equal(second.customer.Id,first.customer.Id);assert.equal(second.repeated,true);assert.equal(state.rows.length,1);assert.equal(state.commits,1);assert.equal(state.rollbacks,1);
});
test('la misma clave con otro WhatsApp rechaza el cambio sin alterar el cliente',async()=>{
 const {service,state}=fixture();await service.quickCreate(body);
 await assert.rejects(service.quickCreate({...body,WhatsApp:'6569999999'}),e=>e.code==='CUSTOMER_REQUEST_CONFLICT');assert.equal(state.rows[0].WhatsApp,body.WhatsApp);
});
test('validación identifica el campo faltante y no inicia una operación en BD',async()=>{
 for(const key of ['FullName','Phone','WhatsApp']){const {service,state}=fixture();await assert.rejects(service.quickCreate({...body,[key]:''}),e=>e.status===400&&e.details.field===key);assert.equal(state.calls.length,0);}
 for(const phone of ['abc','123',true,'9'.repeat(16),'656\n1234567'])assert.throws(()=>quickValues({...body,Phone:phone}),e=>e.details.field==='Phone');
 assert.equal(quickValues({...body,WhatsApp:undefined}).WhatsApp,body.Phone);
});
test('una falla al recuperar el cliente revierte el alta; nunca devuelve un éxito parcial',async()=>{
 const {service,state}=fixture({fail:'SELECT *,`WhatsApp` AS WhatsApp FROM Customers WHERE CardSlug=?'});
 await assert.rejects(service.quickCreate(body));assert.equal(state.rows.length,0);assert.equal(state.commits,0);assert.equal(state.rollbacks,1);assert.equal(state.releases,1);
});
test('si falla rollback se descarta la conexión y no regresa al pool',async()=>{
 const {service,state}=fixture({fail:'SELECT *,`WhatsApp` AS WhatsApp FROM Customers WHERE CardSlug=?',rollbackFail:true});
 await assert.rejects(service.quickCreate(body));assert.equal(state.destroyed,1);assert.equal(state.releases,0);
});
test('listados enriquecen WhatsApp y clientes anteriores usan teléfono sin alterar tarjetas',async()=>{
 const {service}=fixture({rows:[{Id:1,WhatsApp:'6562222222'},{Id:2,WhatsApp:''}]});
 const rows=await service.includeContacts([{Id:1,Phone:'6561111111',CardSlug:'anterior'},{Id:2,Phone:'6563333333',Status:'Inactivo'}]);
 assert.equal(rows[0].WhatsApp,'6562222222');assert.equal(rows[0].CardSlug,'anterior');assert.equal(rows[1].WhatsApp,'6563333333');assert.equal(rows[1].Status,'Inactivo');
});
test('editar sin WhatsApp conserva el valor previo; editarlo guarda el nuevo valor',async()=>{
 const {service,state}=fixture();const {customer}=await service.quickCreate(body);
 const legacy={...customer};delete legacy.WhatsApp;state.rows[0].WhatsApp=body.WhatsApp;
 await service.update(customer.Id,legacy);assert.equal(state.rows[0].WhatsApp,body.WhatsApp);
 await service.update(customer.Id,{...customer,WhatsApp:'6568888888'});assert.equal(state.rows[0].WhatsApp,'6568888888');
});

test('la ruta de alta rápida exige sesión y devuelve el cliente, no solo un mensaje',async t=>{
 const {db,state}=fixture();const execute=db.execute;
 db.execute=async(sql,args)=>{
  if(sql.startsWith('SELECT Id, Username'))return [[{Id:1,Username:'test',FullName:'Prueba',Role:'ADMIN',Status:'Activo'}]];
  if(sql==='CALL ExpireAllCustomerPoints()')return [[]];
  if(sql==='CALL GetCustomers()')return [[state.rows.map(r=>{const copy={...r};delete copy.WhatsApp;return copy;})]];
  return execute(sql,args);
 };
 const dbPath=require.resolve('../db');require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:db};
 const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
 const uploads=fs.mkdtempSync(path.join(os.tmpdir(),'cl-customer-test-'));
 process.env.UPLOADS_DIR=uploads;
 t.after(()=>fs.rmSync(uploads,{recursive:true,force:true}));
 process.env.JWT_SECRET='pruebas-sin-credenciales-privadas-307';
 const {app}=require('../index');const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const origin='http://127.0.0.1:'+server.address().port;
 const anon=await fetch(origin+'/api/customers/quick',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(anon.status,401);assert.equal(state.rows.length,0);
 const token=require('../lib/auth')(db).createToken({Id:1,Username:'test',FullName:'Prueba',Role:'ADMIN'});
 const headers={'Content-Type':'application/json',Authorization:'Bearer '+token};
 const first=await fetch(origin+'/api/customers/quick',{method:'POST',headers,body:JSON.stringify(body)});assert.equal(first.status,201);const created=await first.json();assert.equal(created.customer.WhatsApp,body.WhatsApp);assert.equal(created.customer.Points,0);
 const repeated=await fetch(origin+'/api/customers/quick',{method:'POST',headers,body:JSON.stringify(body)});assert.equal(repeated.status,200);assert.equal((await repeated.json()).customer.Id,created.customer.Id);
 const customers=await fetch(origin+'/api/customers',{headers});assert.equal((await customers.json())[0].WhatsApp,body.WhatsApp);
});
