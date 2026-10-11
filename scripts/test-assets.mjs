// Vite resuelve las imágenes del carrusel. En pruebas Node usamos su URL.
import { register } from 'node:module';
const loader = `export async function load(url, context, nextLoad) {
  if (/\\.(?:webp|png|jpe?g|svg)$/.test(url)) return { format:'module', shortCircuit:true, source:'export default '+JSON.stringify(url)+';' };
  return nextLoad(url, context);
}`;
register('data:text/javascript,' + encodeURIComponent(loader), import.meta.url);
