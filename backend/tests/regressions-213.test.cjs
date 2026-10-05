'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {collection,summary}=require('../lib/analytics-service');
const {makeCalendar}=require('../lib/report-calendar');
const {LOW_STOCK_FROM}=require('../lib/stock-report');
// Los únicos instantes del respaldo recibido; sin nombres ni importes de clientes.
const saleInstants=[1791086376,1782103934];
for(const [now,today,expected]of [['2026-10-04T05:28:42Z','2026-10-03',1],['2026-10-04T17:52:00Z','2026-10-04',0]])test('Histórico no se refecha: hoy '+today,()=>{const cal=makeCalendar({EpochSeconds:Date.parse(now)/1000,ServerNow:now,SessionTimeZone:'UTC'},'timestamp');assert.equal(cal.info.today,today);const count=range=>saleInstants.filter(s=>s>=range.args[0]&&s<range.args[1]).length;assert.equal(count(cal.ranges.today),expected);assert.equal(count(cal.ranges.month),1);assert.equal(count(cal.ranges.year),2);assert.equal(cal.display({RawCreatedAt:'2026-10-04 03:59:36',EpochSeconds:saleInstants[0]}),'2026-10-03 21:59:36');});
test('Stock crítico usa p.Image: el esquema no tiene v.Image',async()=>{
 const statements=[];const columns=new Set(['Id','ProductId','Color','Power','PowerLabel','Price','Stock','FactoryCode','InternalCode','ScanCode','CodeType','Status','CreatedAt']);
 const c={query:async sql=>{statements.push(sql);for(const m of sql.matchAll(/\bv\.(\w+)/g))assert.ok(columns.has(m[1]),'No existe ProductVariants.'+m[1]);return sql.includes('COUNT(*)')?[[{n:21}]]:[[{Id:1,Stock:0,Image:'foto.jpg'}]];}};
 const p=await collection(c,'low-stock',{page:2,pageSize:10});assert.equal(p.offset,10);assert.equal(p.rows[0].Image,'foto.jpg');assert.match(statements[1],/p\.Image AS Image/);assert.match(statements[1],/LIMIT 10 OFFSET 10/);
});
test('Contador y lista comparten criterio de stock 5 y agotados',async()=>{let statement='';const c={execute:async()=>[[{totalSales:0}]],query:async sql=>{statement=sql;return [[{}]];}};await summary(c,makeCalendar({EpochSeconds:1791086376,ServerNow:'2026-10-04',SessionTimeZone:'UTC'},'timestamp'));assert.ok(statement.includes(LOW_STOCK_FROM));assert.match(LOW_STOCK_FROM,/Stock<=5/);assert.match(LOW_STOCK_FROM,/v.Status='Inactivo' AND v.Stock=0/);});
test('Enlace localhost de banner se vuelve ruta relativa segura',async()=>{const {internalBannerLink}=await import('../../frontend/src/components/carousel-data.js');assert.equal(internalBannerLink('http://localhost:5173/catalog?category=halloween'),'/catalog?category=halloween');for(const value of ['javascript:alert(1)','//evil.test','https://evil.test/x','/\\evil.test'])assert.equal(internalBannerLink(value),'/catalog');});
test('Carrusel conserva textos configurados; no los reemplaza mediante suposiciones',async()=>{const {mergeBanners}=await import('../../frontend/src/components/carousel-data.js');const data=mergeBanners([{Id:1,DisplayOrder:1,Title:'Texto propio',Subtitle:'Detalle',ButtonText:'Ver',Image:'/uploads/test.png'}],s=>'BASE'+s);assert.equal(data[0].Title,'Texto propio');assert.equal(data[0].Image,'BASE/uploads/test.png');assert.equal(data.length,3);assert.ok(data[0].DefaultImage);});
