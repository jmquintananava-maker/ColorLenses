'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { TextDecoder } = require('node:util');
const IMAGE_EXTENSION = /\.(?:jpe?g|png|webp|gif)$/i;

function safeFilename(value) {
  return typeof value === 'string' && value.length > 0 && !value.startsWith('.') &&
    !/[\/\\\u0000]/.test(value) && IMAGE_EXTENSION.test(value);
}

// Los respaldos de macOS pueden usar Unicode descompuesto o nombres UTF-8
// interpretados como Latin-1. Comparamos el nombre completo; nunca solo el folio.
function normalizedFilename(value) {
  let result = value;
  for (let attempt = 0; attempt < 2; attempt++) {
    if ([...result].some(char => char.codePointAt(0) > 255)) break;
    try {
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(result, 'latin1'));
      if (decoded === result) break;
      result = decoded;
    } catch { break; }
  }
  return result.normalize('NFC');
}

function uploadedFilename(value) {
  if (typeof value !== 'string' || !value.startsWith('/uploads/products/')) return null;
  try {
    const filename = decodeURIComponent(value.slice('/uploads/products/'.length));
    return safeFilename(filename) ? filename : null;
  } catch { return null; }
}

function createProductMedia(appDirectory, configuredDirectory) {
  const appRoot = path.resolve(appDirectory);
  const writeRoot = configuredDirectory
    ? path.resolve(appRoot, configuredDirectory)
    : path.join(appRoot, 'uploads');
  const candidates = [writeRoot, path.join(appRoot, 'uploads')];
  if (path.basename(appRoot).toLowerCase() === 'backend') {
    candidates.push(path.join(path.dirname(appRoot), 'uploads'));
  }
  candidates.push(path.join(appRoot, 'public', 'uploads'));
  const readRoots = [...new Set(candidates)];
  const productsDirectory = path.join(writeRoot, 'products');

  async function find(filename) {
    if (!safeFilename(filename)) return null;
    for (const directory of readRoots) {
      const file = path.join(directory, 'products', filename);
      try {
        if ((await fs.stat(file)).isFile()) return { file, directory, normalized: false };
      } catch (error) {
        if (!['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code)) throw error;
      }
    }
    const key = normalizedFilename(filename);
    for (const directory of readRoots) {
      let entries;
      try { entries = await fs.readdir(path.join(directory, 'products'), { withFileTypes: true }); }
      catch (error) {
        if (['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code)) continue;
        throw error;
      }
      const matches = entries.filter(entry => entry.isFile() && safeFilename(entry.name) && normalizedFilename(entry.name) === key);
      // Un nombre ambiguo se deja pendiente; no mostrar la foto de otro producto.
      if (matches.length > 1) return null;
      if (matches.length === 1) return { file: path.join(directory, 'products', matches[0].name), directory, normalized: true };
    }
    return null;
  }

  async function status(products) {
    const directories = [];
    for (const root of readRoots) {
      const directory = path.join(root, 'products');
      try {
        const entries = await fs.readdir(directory, { withFileTypes: true });
        directories.push({ directory, primary: root === writeRoot, exists: true, readable: true,
          photos: entries.filter(entry => entry.isFile() && safeFilename(entry.name)).length });
      } catch (error) {
        if (!['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code)) throw error;
        directories.push({ directory, primary: root === writeRoot, exists: error.code === 'EACCES', readable: false, photos: 0 });
      }
    }
    const counts = { total: 0, found: 0, missing: 0, legacy: 0, normalized: 0, external: 0 };
    const missing = [];
    for (const product of products) {
      for (const field of ['Image', 'Image2', 'Image3']) {
        const image = product[field];
        if (!image) continue;
        counts.total++;
        const filename = uploadedFilename(image);
        if (!filename) { counts.external++; continue; }
        const match = await find(filename);
        if (match) {
          counts.found++;
          if (match.directory !== writeRoot) counts.legacy++;
          if (match.normalized) counts.normalized++;
        } else {
          counts.missing++;
          if (missing.length < 12) missing.push({ productId: product.Id, model: product.Modelo, brand: product.Marca, field, filename });
        }
      }
    }
    return { uploadDirectory: productsDirectory, directories, counts, missing };
  }

  return { writeRoot, readRoots, productsDirectory, find, status };
}

function mountProductMedia(app, express, media) {
  for (const directory of media.readRoots) {
    app.use('/uploads', express.static(directory, { index: false, redirect: false, dotfiles: 'deny' }));
  }
  app.get('/uploads/products/:filename', async (req, res, next) => {
    try {
      const match = await media.find(req.params.filename);
      if (!match) return next();
      res.sendFile(match.file, { dotfiles: 'deny' }, error => { if (error) next(error); });
    } catch (error) { next(error); }
  });
  // Una foto ausente nunca debe responder con el HTML de React.
  app.use('/uploads', (req, res) => res.status(404).json({ message: 'Foto no encontrada.' }));
}

module.exports = { createProductMedia, mountProductMedia, normalizedFilename, uploadedFilename };
