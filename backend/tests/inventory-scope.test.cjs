'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseScope,matchesScope,sameScope,scopePredicate,decorateSession,ensureScopeSchema,schemaSQL}=require('../lib/inventory-scope');
const natural={categories:['Natural'],graduation:'PLANO'};
test('Natural sin graduación conserva otros estilos, potencias y datos pendientes',()=>{
 const variants=[
  {Category:'Natural',Power:'0.00'},
  {Category:'Natural',Power:'-1.50'},
  {Category:'Natural',Power:'2.00'},
  {Category:'Halloween',Power:0},
  {Category:'Muñeca',Power:0},
  {Category:'Natural',Power:0,NeedsReview:1},
  {Category:'Natural',Power:null},
  {Category:'',Power:0},
 ];
 assert.deepEqual(variants.map(p=>matchesScope(p,natural)),[true,false,false,false,false,false,false,false]);
});
test('graduados de todas las categorías incluyen potencias positivas y negativas',()=>{
 const scope={categories:null,graduation:'PRESCRIPTION'};
 assert.equal(matchesScope({Category:'Natural',Power:-2},scope),true);
 assert.equal(matchesScope({Category:'Halloween',Power:1},scope),true);
 for(const p of [{Power:0},{Power:null},{Power:-2,NeedsReview:1}])assert.equal(matchesScope(p,scope),false);
});
test('varias categorías y ambas graduaciones son selecciones independientes',()=>{
 const scope={categories:['Natural','Halloween'],graduation:'ALL'};
 assert.equal(matchesScope({Category:'Halloween',Power:-1.5},scope),true);
 assert.equal(matchesScope({Category:'natural',Power:0},scope),true);
 assert.equal(matchesScope({Category:'Muñeca',Power:0},scope),false);
});
test('el alcance completo debe elegirse explícitamente; categorías vacías o graduación inválida se rechazan',()=>{
 for(const scope of [null,{}, {categories:[],graduation:'PLANO'},{categories:null,graduation:'plano'},{categories:[''],graduation:'ALL'}])assert.throws(()=>parseScope(scope));
 assert.deepEqual(parseScope({categories:null,graduation:'ALL'}),{categories:null,graduation:'ALL'});
 assert.ok(sameScope(parseScope({categories:['natural','Halloween','Natural'],graduation:'PLANO'}),{categories:['HALLOWEEN','Natural'],graduation:'PLANO'}));
});
test('filtros usan parámetros y no interpolan nombres en SQL',()=>{
 const category="Natural' OR 1=1 --";
 const result=scopePredicate('Urban Layer',{categories:[category,'Halloween'],graduation:'PRESCRIPTION'});
 assert.deepEqual(result.params,['Urban Layer',category,'Halloween']);assert.ok(!result.sql.includes(category));
 assert.equal((result.sql.match(/\?/g)||[]).length,3);assert.match(result.sql,/v.Power<>0/);assert.match(result.sql,/ReviewedAt IS NULL/);
});
test('folios anteriores conservan su alcance de toda la marca y se identifican como anteriores',()=>{
 const legacy=decorateSession({Kind:'STOCKTAKE',Brand:'Urban Layer'});
 assert.equal(legacy.LegacyScope,true);assert.equal(legacy.ScopeCategories,null);assert.equal(legacy.ScopeGraduation,'ALL');
 const saved=decorateSession({Kind:'STOCKTAKE',ScopeCategoriesJSON:'["Natural"]',ScopeGraduation:'PLANO'});
 assert.equal(saved.LegacyScope,false);assert.equal(saved.ScopeLabel,'Natural · Sin graduación');
});
test('preparar la tabla es aditivo, se comparte entre peticiones y ocurre una sola vez',async()=>{
 const calls=[];const db={execute:async sql=>{calls.push(sql);return [[]];}};
 await Promise.all([ensureScopeSchema(db),ensureScopeSchema(db)]);await ensureScopeSchema(db);assert.equal(calls.length,2);assert.equal(calls[1],schemaSQL);
 assert.match(schemaSQL,/CREATE TABLE IF NOT EXISTS/);assert.doesNotMatch(schemaSQL,/UPDATE |DELETE |DROP |ALTER /);
});
test('una tabla instalada manualmente funciona sin permiso de CREATE en la aplicación',async()=>{
 const db={execute:async sql=>{assert.ok(sql.startsWith('SELECT ENGINE'));return [[{ENGINE:'InnoDB'}]];}};
 await ensureScopeSchema(db);
});
