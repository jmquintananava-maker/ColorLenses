/* Construcción de compatibilidad ESM con caché Vite existente. Para distribución
   optimizada usar npm run build en frontend y luego node scripts/copy-dist.cjs.
   Uso local: TS_PATH=/ruta/typescript CACHE_PATH=/ruta/.vite/deps node scripts/build-offline.cjs */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),src=path.join(root,'frontend/src');
const ts=require(process.env.TS_PATH || 'typescript');
const cache=process.env.CACHE_PATH || path.join(root,'frontend/node_modules/.vite/deps');
const out=path.join(root,'backend/public'),app=path.join(out,'assets/app'),vendor=path.join(out,'assets/vendor');
if(!fs.existsSync(cache))throw new Error('Esta herramienta requiere la caché Vite original. Usa el build normal de Vite.');
fs.mkdirSync(app,{recursive:true});fs.mkdirSync(vendor,{recursive:true});
const aliases={'react':'react.js','react-dom':'react-dom.js','react-dom/client':'react-dom_client.js','react/jsx-runtime':'react_jsx-runtime.js','react/jsx-dev-runtime':'react_jsx-dev-runtime.js','react-router-dom':'react-router-dom.js','html5-qrcode':'html5-qrcode.js','lucide-react':'lucide-react.js','qrcode.react':'qrcode__react.js','react-qr-code':'react-qr-code.js','recharts':'recharts.js','framer-motion':'framer-motion.js','jspdf':'jspdf.js'};
for(const filename of fs.readdirSync(cache)){if(filename.endsWith('.js'))fs.copyFileSync(path.join(cache,filename),path.join(vendor,filename));}
// Los prebundles CJS de Vite requieren el puente de exportaciones que Vite
// normalmente inyecta. Conservar el módulo original para los imports internos.
const bridges={
 'react': ['react.js','react-compat.js',['Children','Component','Fragment','Profiler','PureComponent','StrictMode','Suspense','cloneElement','createContext','createElement','createRef','forwardRef','isValidElement','lazy','memo','startTransition','use','useActionState','useCallback','useContext','useDebugValue','useDeferredValue','useEffect','useId','useImperativeHandle','useInsertionEffect','useLayoutEffect','useMemo','useOptimistic','useReducer','useRef','useState','useSyncExternalStore','useTransition','version']],
 'react/jsx-runtime':['react_jsx-runtime.js','react-jsx-compat.js',['jsx','jsxs','Fragment']],
 'react/jsx-dev-runtime':['react_jsx-dev-runtime.js','react-jsx-dev-compat.js',['jsxDEV','Fragment']],
 'react-dom':['react-dom.js','react-dom-compat.js',['createPortal','flushSync','preconnect','prefetchDNS','preinit','preload','version']]
};
for(const [key,[source,file,names]] of Object.entries(bridges)){
 fs.writeFileSync(path.join(vendor,file),`import value from './${source}';\nexport default value;\nexport const {${names.join(',')}}=value;\n`);aliases[key]=file;
}
const styles=[],errors=[];let count=0;
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory()){walk(p);continue;}const rel=path.relative(src,p),dest=path.join(app,rel.replace(/\.(jsx|ts|tsx)$/,'.js'));if(/\.(jsx?|tsx?)$/.test(p)){
 let code=fs.readFileSync(p,'utf8').replace(/import\.meta\.env\.VITE_API_URL/g,'""');
 let result=ts.transpileModule(code,{fileName:p,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext},reportDiagnostics:true});
 for(const d of result.diagnostics||[])if(d.category===ts.DiagnosticCategory.Error)errors.push(rel+': '+ts.flattenDiagnosticMessageText(d.messageText,' '));
 code=result.outputText.replace(/(^|\n)import\s+["']([^"']+\.css)["'];?/g,(all,line,imp)=>{const css=path.relative(src,path.resolve(path.dirname(p),imp)).replaceAll('\\','/');if(!styles.includes(css))styles.push(css);return line;});
 code=code.replace(/(from\s*|import\s*\()(["'])([^"']+)\2/g,(all,prefix,quote,imp)=>{
  if(!imp.startsWith('.'))return all;const local=path.resolve(path.dirname(p),imp);let suffix='';
  if(fs.existsSync(local)&&fs.statSync(local).isFile())suffix='';else if(fs.existsSync(local+'.jsx')||fs.existsSync(local+'.js'))suffix='.js';else if(fs.existsSync(path.join(local,'index.jsx'))||fs.existsSync(path.join(local,'index.js')))suffix='/index.js';else throw new Error('Importación local no encontrada: '+rel+' → '+imp);
  const fixed=imp.replace(/\.(jsx|tsx|ts)$/,'.js')+suffix;
  if(/\.(png|jpe?g|svg|webp)$/.test(imp))return all;return prefix+quote+fixed+quote;
 });
 // Los assets se importan como URL, no como módulos de JavaScript.
 code=code.replace(/import\s+(\w+)\s+from\s+["']([^"']+\.(?:png|jpe?g|svg|webp))["'];?/g,(_,name,imp)=>`const ${name}=new URL(${JSON.stringify(imp)},import.meta.url).href;`);
 fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,code);count++;
 }else if(!entry.name.startsWith('.')){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(p,dest);}}}
walk(src);if(errors.length)throw new Error(errors.join('\n'));
// Orden explícito: el rediseño debe sobrescribir el CSS móvil legado.
const order=['styles/global.css','styles/redesign.css',...styles.filter(s=>!['styles/global.css','styles/redesign.css'].includes(s))];
fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="theme-color" content="#b95780"><meta name="description" content="ColorLenses: explora lentes de contacto de color naturales, efecto muñeca y fantasía. Encuentra marcas, colores y graduaciones."><title>ColorLenses · El color de tu mirada</title>${order.map(s=>`<link rel="stylesheet" href="/assets/app/${s}">`).join('')}<script type="importmap">${JSON.stringify({imports:Object.fromEntries(Object.entries(aliases).map(([k,v])=>[k,'/assets/vendor/'+v]))})}</script></head><body><div id="root"></div><noscript>Activa JavaScript para explorar ColorLenses.</noscript><script type="module" src="/assets/app/main.js"></script></body></html>`);
console.log(`Compatibilidad ESM: ${count} módulos transformados; ${Object.keys(aliases).length} bibliotecas mapeadas. No equivale a ejecutar vite build.`);
