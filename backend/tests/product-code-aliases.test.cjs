'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { schemaSQL, ensureCodeSchema, codeMatchSql, associateCode } = require('../lib/product-code-aliases');
const actor = {id:7};

function fixture({ variants = [{Id:10,ScanCode:'ORIGINAL',FactoryCode:'FACTORY',InternalCode:'INTERNAL'}], aliases = [], race } = {}) {
  const state = { variants:structuredClone(variants), aliases:structuredClone(aliases), calls:[], inserts:0 };
  const equals = (a,b) => a != null && String(a).localeCompare(String(b), 'es', {sensitivity:'base'}) === 0;
  const c = { execute:async (sql, params = []) => {
    state.calls.push({sql,params});
    if (sql.startsWith('SELECT Id FROM ProductVariants WHERE Id=')) return [state.variants.filter(v=>Number(v.Id)===params[0]).map(v=>({Id:v.Id}))];
    if (sql.startsWith('SELECT a.ProductVariantId')) return [state.aliases.filter(a=>equals(a.Code,params[0])).map(a=>({ProductVariantId:a.ProductVariantId,ExistingVariantId:state.variants.find(v=>Number(v.Id)===Number(a.ProductVariantId))?.Id ?? null}))];
    if (sql.startsWith('SELECT Id FROM ProductVariants WHERE ScanCode=')) return [state.variants.filter(v=>['ScanCode','FactoryCode','InternalCode'].some(key=>equals(v[key],params[0]))).map(v=>({Id:v.Id}))];
    if (sql.startsWith('INSERT INTO CLProductCodeAliases')) {
      if (race) {
        state.aliases.push({Code:params[0],ProductVariantId:race});
        throw Object.assign(new Error('Duplicate'),{code:'ER_DUP_ENTRY'});
      }
      state.aliases.push({Code:params[0],ProductVariantId:params[1],CreatedBy:params[2]});
      state.inserts++;
      return [{affectedRows:1}];
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  }};
  return {state,c};
}

test('códigos adicionales se preparan una sola vez incluso con llamadas concurrentes',async()=>{
  const calls=[];let installed=false;
  const db={execute:async sql=>{calls.push(sql);if(sql===schemaSQL){installed=true;return [{}];}return [installed?[{ENGINE:'InnoDB'}]:[]];}};
  await Promise.all([ensureCodeSchema(db),ensureCodeSchema(db)]);await ensureCodeSchema(db);
  assert.equal(calls.filter(sql=>sql===schemaSQL).length,1);
  assert.equal(calls.length,3);
  assert.match(schemaSQL,/Code VARCHAR\(512\)/);
  assert.match(schemaSQL,/ENGINE=InnoDB/);
  assert.doesNotMatch(schemaSQL,/UPDATE |DELETE |ALTER |DROP |FOREIGN KEY/);
});

test('la tabla instalada manualmente no requiere permiso CREATE',async()=>{
  let calls=0;
  const db={execute:async sql=>{assert.match(sql,/^SELECT ENGINE/);calls++;return [[{ENGINE:'InnoDB'}]];}};
  await ensureCodeSchema(db);await ensureCodeSchema(db);assert.equal(calls,1);
});

test('migración sin permiso explica el SQL necesario y permite reintentar tras instalarlo',async()=>{
  let installed=false;
  const db={execute:async sql=>{
    if(sql===schemaSQL)throw Object.assign(new Error('CREATE denied'),{code:'ER_TABLEACCESS_DENIED_ERROR'});
    return [installed?[{ENGINE:'InnoDB'}]:[]];
  }};
  await assert.rejects(ensureCodeSchema(db),e=>e.status===503&&e.code==='CODE_SCHEMA_REQUIRED'&&e.message.includes('003_product_code_aliases.sql'));
  installed=true;await ensureCodeSchema(db);
});

test('rechaza tabla sin transacciones, incluida una creada por otro proceso',async()=>{
  for(const engine of ['MyISAM',null]) {
    let installed=!!engine;
    const db={execute:async sql=>{
      if(sql===schemaSQL){installed=true;return [{}];}
      return [installed?[{ENGINE:'MyISAM'}]:[]];
    }};
    await assert.rejects(ensureCodeSchema(db),e=>e.code==='CODE_SCHEMA_REQUIRED');
  }
});

test('asocia un código textual sin perder ceros ni modificar los tres originales',async()=>{
  const {c,state}=fixture();const originals=structuredClone(state.variants);
  assert.deepEqual(await associateCode(c,'10','  000179  ',actor),{code:'000179',variantId:10,created:true});
  assert.deepEqual(state.aliases,[{Code:'000179',ProductVariantId:10,CreatedBy:7}]);
  assert.deepEqual(state.variants,originals);
});

test('repetir el mismo alias es idempotente, también según la colación del código',async()=>{
  const {c,state}=fixture();await associateCode(c,10,'A0179',actor);
  assert.deepEqual(await associateCode(c,10,'a0179',actor),{code:'a0179',variantId:10,created:false});
  assert.equal(state.inserts,1);assert.equal(state.aliases.length,1);
});

test('un código original de la misma variante no necesita un alias duplicado',async()=>{
  for(const code of ['ORIGINAL','FACTORY','INTERNAL']) {
    const {c,state}=fixture();assert.equal((await associateCode(c,10,code,actor)).created,false);
    assert.equal(state.aliases.length,0);
  }
});

test('ningún campo original de otra variante puede convertirse en alias',async()=>{
  for(const key of ['ScanCode','FactoryCode','InternalCode']) {
    const {c,state}=fixture({variants:[{Id:10},{Id:11,[key]:'A0179'}]});
    await assert.rejects(associateCode(c,10,'A0179',actor),e=>e.code==='CODE_CONFLICT');
    assert.equal(state.aliases.length,0);
  }
});

test('un alias de otra variante nunca se reasigna',async()=>{
  const {c,state}=fixture({variants:[{Id:10},{Id:11}],aliases:[{Code:'A0179',ProductVariantId:11}]});
  await assert.rejects(associateCode(c,10,'A0179',actor),e=>e.code==='CODE_CONFLICT');
  assert.deepEqual(state.aliases,[{Code:'A0179',ProductVariantId:11}]);
});

test('un alias huérfano se conserva y produce un error específico',async()=>{
  const {c,state}=fixture({aliases:[{Code:'A0179',ProductVariantId:99}]});
  await assert.rejects(associateCode(c,10,'A0179',actor),e=>e.code==='CODE_ORPHAN');
  assert.deepEqual(state.aliases,[{Code:'A0179',ProductVariantId:99}]);
});

test('detecta conflicto aunque el código también sea original de la variante seleccionada',async()=>{
  const {c,state}=fixture({variants:[{Id:10,ScanCode:'A0179'},{Id:11}],aliases:[{Code:'A0179',ProductVariantId:11}]});
  await assert.rejects(associateCode(c,10,'A0179',actor),e=>e.code==='CODE_CONFLICT');assert.equal(state.inserts,0);
});

test('rechaza una variante eliminada y entradas inválidas antes de insertar',async()=>{
  const {c,state}=fixture();
  await assert.rejects(associateCode(c,999,'A0179',actor),e=>e.status===404);
  for(const id of [0,-1,1.5,NaN,true,'',Number.MAX_SAFE_INTEGER+1])await assert.rejects(associateCode(c,id,'A0179',actor));
  for(const code of ['',17,'A\n179','x'.repeat(513)])await assert.rejects(associateCode(c,10,code,actor));
  await assert.rejects(associateCode(c,10,'A0179',{}));
  assert.equal(state.inserts,0);
});

test('la PK y la comprobación de conflicto protegen de un escritor concurrente',async()=>{
  const same=fixture({race:10});assert.equal((await associateCode(same.c,10,'A0179',actor)).created,false);
  const other=fixture({variants:[{Id:10},{Id:11}],race:11});
  await assert.rejects(associateCode(other.c,10,'A0179',actor),e=>e.code==='CODE_CONFLICT');
  assert.equal(other.state.aliases[0].ProductVariantId,11);
});

test('la búsqueda reutilizable considera originales y alias mediante cuatro parámetros',()=>{
  assert.equal((codeMatchSql.match(/\?/g)||[]).length,4);
  assert.match(codeMatchSql,/v\.ScanCode=\?/);assert.match(codeMatchSql,/v\.FactoryCode=\?/);assert.match(codeMatchSql,/v\.InternalCode=\?/);
  assert.match(codeMatchSql,/ca\.Code=\? AND ca\.ProductVariantId=v\.Id/);
});
