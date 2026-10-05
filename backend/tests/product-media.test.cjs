'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const express = require('express');
const { createProductMedia, mountProductMedia, uploadedFilename } = require('../lib/product-media');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nGAAAAAASUVORK5CYII=', 'base64');

async function fixture(t, configured) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'colorlenses-fotos-'));
  const backend = path.join(root, 'nodejs', 'backend');
  await fs.mkdir(backend, { recursive: true });
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const media = createProductMedia(backend, configured);
  async function photo(directory, name, bytes = PNG) {
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, name), bytes);
  }
  const legacy = path.join(root, 'nodejs', 'uploads', 'products');
  return { root, backend, media, photo, legacy };
}

async function serve(t, media) {
  const app = express();
  mountProductMedia(app, express, media);
  app.use((req, res) => res.type('html').send('<html>React</html>'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  return name => fetch(base + '/uploads/products/' + encodeURIComponent(name));
}

test('las fotos nuevas conservan uploads/products junto al backend', async t => {
  const { backend, media } = await fixture(t);
  assert.equal(media.productsDirectory, path.join(backend, 'uploads', 'products'));
  assert.equal(media.readRoots[0], media.writeRoot);
});

test('UPLOADS_DIR permite una carpeta persistente sin cambiar las URL', async t => {
  const { root, backend } = await fixture(t);
  const media = createProductMedia(backend, path.join(root, 'persistent-images'));
  await fs.mkdir(media.productsDirectory, { recursive: true });
  await fs.writeFile(path.join(media.productsDirectory, 'nueva.webp'), PNG);
  assert.equal(media.productsDirectory, path.join(root, 'persistent-images', 'products'));
  const response = await (await serve(t, media))('nueva.webp');
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), PNG);
});

test('lee fotos antiguas desde nodejs/uploads/products y fotos nuevas desde backend/uploads/products', async t => {
  const { media, photo, legacy } = await fixture(t);
  await photo(legacy, '1784837191903-IMG_2204.png');
  await photo(media.productsDirectory, '1791173745402-Chagall_Gray.webp');
  const get = await serve(t, media);
  for (const name of ['1784837191903-IMG_2204.png', '1791173745402-Chagall_Gray.webp']) {
    const response = await get(name);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^image\//);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), PNG);
  }
  assert.deepEqual(await fs.readFile(path.join(legacy, '1784837191903-IMG_2204.png')), PNG);
});

test('una foto nueva tiene prioridad si el mismo nombre está en ambas carpetas', async t => {
  const { media, photo, legacy } = await fixture(t);
  await photo(media.productsDirectory, 'igual.png', Buffer.from('nueva'));
  await photo(legacy, 'igual.png', Buffer.from('vieja'));
  assert.equal((await media.find('igual.png')).directory, media.writeRoot);
  const response = await (await serve(t, media))('igual.png');
  assert.equal(await response.text(), 'nueva');
});

test('también reconoce respaldos en public/uploads/products', async t => {
  const { media, backend, photo } = await fixture(t);
  const directory = path.join(backend, 'public', 'uploads', 'products');
  await photo(directory, 'respaldo.png');
  assert.equal((await media.find('respaldo.png')).file, path.join(directory, 'respaldo.png'));
});

test('cuando Hostinger coloca index.js en nodejs, usa esa carpeta sin inventar backend', async t => {
  const { root } = await fixture(t);
  const media = createProductMedia(path.join(root, 'nodejs'));
  assert.equal(media.productsDirectory, path.join(root, 'nodejs', 'uploads', 'products'));
  assert.ok(!media.readRoots.includes(path.join(root, 'uploads')));
});

test('una foto faltante devuelve 404 y no el HTML de React', async t => {
  const { media } = await fixture(t);
  const response = await (await serve(t, media))('no-existe.png');
  assert.equal(response.status, 404);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal((await response.json()).message, 'Foto no encontrada.');
});

test('normaliza Unicode compuesto/descompuesto al leer un respaldo de macOS', async t => {
  const { media, photo, legacy } = await fixture(t);
  const filename = '123-Muñeca.png';
  const physical = filename.normalize('NFD');
  await photo(legacy, physical);
  const match = await media.find(filename);
  assert.ok(match, 'El archivo se debe encontrar aunque el sistema normalice Unicode.');
  // APFS/HFS+ aceptan NFC y NFD como nombres equivalentes; Linux distingue
  // los bytes. Comprobar identidad Unicode y lectura, no la forma devuelta.
  assert.equal(match.file.normalize('NFC'), path.join(legacy, physical).normalize('NFC'));
  assert.deepEqual(await fs.readFile(match.file), PNG);
  const response = await (await serve(t, media))(filename);
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), PNG);
});

test('reconoce el mismo nombre completo cuando el respaldo tiene UTF-8 interpretado como Latin-1', async t => {
  const { media, photo, legacy } = await fixture(t);
  const clean = '1779599097541-Captura-de-pantalla-2026-02-07-a-las-12.06.54\u202fp.m..png';
  const old = Buffer.from(clean, 'utf8').toString('latin1');
  await photo(legacy, old);
  const response = await (await serve(t, media))(clean);
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), PNG);
  assert.equal((await media.find(clean)).normalized, true);
});

test('un nombre irreconocible no se asocia solo por la fecha o el folio', async t => {
  const { media, photo, legacy } = await fixture(t);
  await photo(legacy, '123-mismo-folio-otro-producto.png');
  assert.equal(await media.find('123-foto-original.png'), null);
});

test('rechaza rutas fuera de products, subcarpetas, dotfiles y nombres sin extensión de imagen', async t => {
  const { media } = await fixture(t);
  for (const name of ['../secreto.png', '..\\secreto.png', '.env', '.privada.png', 'archivo.txt', 'foto\0.png']) {
    assert.equal(await media.find(name), null);
  }
  assert.equal(uploadedFilename('/uploads/products/%2e%2e%2fsecreto.png'), null);
  assert.equal(uploadedFilename('/uploads/products/foto%xx.png'), null);
  assert.equal(uploadedFilename('https://externo.test/foto.png'), null);
});

test('la revisión informa la ruta real, faltantes y respaldo sin modificar archivos ni datos', async t => {
  const { media, photo, legacy } = await fixture(t);
  await photo(media.productsDirectory, 'nueva.png');
  await photo(legacy, 'vieja.png');
  const products = [
    { Id: 1, Marca: 'Urban Layer', Modelo: 'Gray', Image: '/uploads/products/nueva.png', Image2: '/uploads/products/vieja.png' },
    { Id: 2, Marca: 'Urban Layer', Modelo: 'Brown', Image: '/uploads/products/falta.png', Image2: 'https://externo.test/foto.png' }
  ];
  const before = structuredClone(products);
  const result = await media.status(products);
  assert.equal(result.uploadDirectory, media.productsDirectory);
  assert.deepEqual(result.counts, { total: 4, found: 2, missing: 1, legacy: 1, normalized: 0, external: 1 });
  assert.equal(result.missing[0].filename, 'falta.png');
  assert.equal(result.directories.find(d => d.primary).photos, 1);
  assert.deepEqual(products, before);
  assert.deepEqual(await fs.readFile(path.join(legacy, 'vieja.png')), PNG);
});

test('el informe muestra un máximo de 12 faltantes y cuenta todas las referencias', async t => {
  const { media } = await fixture(t);
  const products = Array.from({ length: 20 }, (_, Id) => ({ Id, Image: `/uploads/products/falta-${Id}.png` }));
  const result = await media.status(products);
  assert.equal(result.counts.missing, 20);
  assert.equal(result.missing.length, 12);
});

test('la ruta de revisión real exige sesión y conserva privadas las rutas del servidor', async t => {
  process.env.JWT_SECRET = 'solo-pruebas-fotos-secreto-de-32-caracteres';
  const dbPath = require.resolve('../db');
  const calls = [];
  const fakeDb = { execute: async sql => {
    calls.push(sql);
    if (sql.includes('FROM AdminUsers')) return [[{ Id: 1, Username: 'admin', FullName: 'Prueba', Role: 'ADMIN', Status: 'Activo' }]];
    if (sql.includes('FROM Products')) return [[]];
    throw Error('Consulta inesperada: ' + sql);
  } };
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakeDb };
  const { app } = require('../index');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const url = `http://127.0.0.1:${server.address().port}/api/uploads/status`;
  const denied = await fetch(url);
  assert.equal(denied.status, 401);
  assert.ok(!(await denied.text()).includes('uploadDirectory'));
  assert.equal(calls.length, 0);
  const token = require('../lib/auth')(fakeDb).createToken({ Id: 1, Username: 'admin', FullName: 'Prueba', Role: 'ADMIN' });
  const accepted = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).uploadDirectory, path.resolve(__dirname, '../uploads/products'));
  assert.ok(calls.every(sql => sql.startsWith('SELECT')));
});
