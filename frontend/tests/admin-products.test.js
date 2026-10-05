import test from 'node:test';
import assert from 'node:assert/strict';
import {adminProductMode,adminProductsFromRows,normalizeAdminProduct,lookupAdminProduct,matchesAdminCodeAlias} from '../src/utils/adminProducts.js';

test('Todos conserva activos, inactivos y pendientes y elimina filas repetidas por variante', () => {
  const rows = adminProductsFromRows([
    {ProductVariantId:1,Status:'Activo',ProductStatus:'Activo'},
    {ProductVariantId:2,Status:'Inactivo',ProductStatus:'Activo'},
    {ProductVariantId:3,Status:'Inactivo',NeedsReview:1},
    {ProductVariantId:'3',Status:'Inactivo',NeedsReview:1},
    {ProductVariantId:4,Status:'Activo',ProductStatus:'Inactivo'}
  ]);
  assert.deepEqual(rows.map(p=>p.ProductVariantId),[4,'3',2,1]);
  assert.deepEqual(rows.map(adminProductMode),['inactive','pending','inactive','active']);
});

test('los pendientes permanecen pendientes aunque tengan estado activo o existencias', () => {
  assert.equal(adminProductMode({NeedsReview:1,Status:'Activo',ProductStatus:'Activo',Stock:20}), 'pending');
  assert.equal(adminProductMode({NeedsReview:0,Status:'Inactivo',Stock:20}), 'inactive');
});

test('graduación pendiente no se convierte a cero y se conservan fotos, descripción y ceros del código', () => {
  const product=normalizeAdminProduct({ProductVariantId:1,NeedsReview:1,Power:null,FactoryCode:'00179',Price:0,Stock:0,Description:'Mi descripción',Image:'/uploads/foto.jpg'});
  assert.equal(product.Power,null);
  assert.equal(product.PowerLabel,'Por confirmar');
  assert.equal(product.ScanCode,'00179');
  assert.equal(product.Stock,0);
  assert.equal(product.Description,'Mi descripción');
  assert.equal(product.Image,'/uploads/foto.jpg');
  assert.equal(normalizeAdminProduct({Power:'0.00'}).Power,0);
  assert.equal(normalizeAdminProduct({Power:'-2.50'}).Power,-2.5);
});

test('la búsqueda por código consulta un código completo y conserva ceros y caracteres especiales', async () => {
  const calls=[];
  const result=await lookupAdminProduct(async path=>{
    calls.push(path);
    return {found:true,product:{ProductVariantId:9,NeedsReview:1,Power:null,FactoryCode:'otro'}};
  },'  00179+A/B  ');
  assert.deepEqual(calls,['/api/inventory/lookup?code=00179%2BA%2FB']);
  assert.equal(result.ProductVariantId,9);
  assert.equal(result.Power,null);
  assert.equal(adminProductMode(result),'pending');
});

test('un código sin asociación regresa sin producto; no elige coincidencias parciales ni Id', async () => {
  assert.equal(await lookupAdminProduct(async()=>({found:false}), '179'),null);
});

test('una búsqueda ambigua o fallida muestra el error del servidor y no se reporta como inexistente', async () => {
  await assert.rejects(()=>lookupAdminProduct(async()=>{throw new Error('El código coincide con varias variantes.');},'A0179'),/varias variantes/);
  await assert.rejects(()=>lookupAdminProduct(async()=>{throw new Error('Sin conexión.');},'A0179'),/Sin conexión/);
});

test('respuestas de catálogo inválidas se rechazan en lugar de mostrar un listado vacío', () => {
  assert.throws(()=>adminProductsFromRows({message:'Error'}),/catálogo completo/);
});

test('búsqueda libre encuentra alias adicionales conservando el código original y sus ceros', () => {
  const product=normalizeAdminProduct({ProductVariantId:5,ScanCode:'000456',FactoryCode:'000456',CodeAliases:[' A0179 ','A0179','000099',null]});
  assert.deepEqual(product.CodeAliases,['A0179','000099']);
  assert.equal(product.ScanCode,'000456');
  assert.equal(product.FactoryCode,'000456');
  assert.equal(matchesAdminCodeAlias(product,'a0179'),true);
  assert.equal(matchesAdminCodeAlias(product,'000099'),true);
  assert.equal(matchesAdminCodeAlias(product,'otro'),false);
  assert.equal(matchesAdminCodeAlias(product,''),false);
  assert.deepEqual(normalizeAdminProduct({CodeAliases:'A0179'}).CodeAliases,[]);
});
