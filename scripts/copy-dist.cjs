'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'frontend/dist'),target=path.join(root,'backend/public');
if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('Primero ejecuta npm run build en frontend. Falta dist/index.html.');
fs.mkdirSync(target,{recursive:true});
// Copia sin borrar fotos/archivos existentes. .env y backend/uploads quedan intactos.
fs.cpSync(dist,target,{recursive:true});
console.log('Frontend Vite copiado a backend/public. No se modificaron .env ni uploads. Reinicia el backend después de validar la migración.');
