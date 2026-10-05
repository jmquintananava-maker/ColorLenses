'use strict';
const {makeCalendar}=require('./report-calendar');
const {LOW_STOCK_FROM}=require('./stock-report');
function pagination(query={}) {
  const page=Math.max(1,Math.min(1000000,parseInt(query.page,10)||1));
  const requested=parseInt(query.pageSize,10)||10;
  return {page,pageSize:[5,8,10,20,50].includes(requested)?requested:10};
}
function searchClause(q,cal) {
  const text=String(q||'').trim().slice(0,120);
  if(!text)return {sql:'',params:[]};
  const like='%'+text.replace(/[=%_]/g,c=>'='+c)+'%';
  const dateRange=cal?.forDay?.(text);
  return {sql:" WHERE (CAST(s.Id AS CHAR) LIKE ? ESCAPE '=' OR c.FullName LIKE ? ESCAPE '='"+(dateRange?' OR '+dateRange.sql:'')+')',params:[like,like,...(dateRange?.args||[])]};
}
function pageMeta(total,query) {
  const p=pagination(query);p.total=Number(total)||0;p.totalPages=Math.max(1,Math.ceil(p.total/p.pageSize));p.page=Math.min(p.page,p.totalPages);p.offset=(p.page-1)*p.pageSize;return p;
}
async function calendar(connection,env) {
  const [types]=await connection.execute("SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='Sales' AND COLUMN_NAME='CreatedAt'");
  const [clock]=await connection.query("SELECT DATE_FORMAT(NOW(),'%Y-%m-%d %H:%i:%s') AS ServerNow, UNIX_TIMESTAMP() AS EpochSeconds, @@session.time_zone AS SessionTimeZone");
  return makeCalendar(clock[0],types[0]?.DATA_TYPE,env);
}
const zero=n=>Number(n)||0;
async function summary(c,cal) {
  const args=[],columns=[];
  for(const [name,r] of Object.entries(cal.ranges)) {
    columns.push(`COALESCE(SUM(CASE WHEN ${r.sql} THEN 1 ELSE 0 END),0) AS ${name}Count`);args.push(...r.args);
    columns.push(`COALESCE(SUM(CASE WHEN ${r.sql} THEN s.Total ELSE 0 END),0) AS ${name}Revenue`);args.push(...r.args);
  }
  const [rows]=await c.execute(`SELECT COUNT(*) AS totalSales, COALESCE(SUM(s.Total),0) AS totalRevenue, COUNT(DISTINCT s.CustomerId) AS uniqueCustomers, COALESCE(SUM(s.RedeemedPoints),0) AS totalRedeemedPoints, COALESCE(SUM(s.Discount),0) AS totalDiscount, COALESCE(SUM(CASE WHEN s.CreatedAt IS NULL OR YEAR(s.CreatedAt)=0 THEN 1 ELSE 0 END),0) AS undatedSales, ${columns.join(', ')} FROM Sales s`,args);
  const stats=Object.fromEntries(Object.entries(rows[0]).map(([key,value])=>[key,zero(value)]));
  const [extras]=await c.query(`SELECT (SELECT COUNT(*) FROM Customers) AS TotalCustomers, (SELECT COUNT(*) FROM Products) AS TotalProducts, (SELECT COALESCE(SUM(Quantity),0) FROM SaleItems) AS totalItemsSold, (SELECT COUNT(*) ${LOW_STOCK_FROM}) AS LowStock`);
  Object.assign(stats,Object.fromEntries(Object.entries(extras[0]).map(([k,v])=>[k,zero(v)])));
  stats.averageTicket=stats.totalSales?stats.totalRevenue/stats.totalSales:0;
  return {stats,calendar:cal.info};
}
async function salesPage(c,cal,query) {
  const filter=searchClause(query.q,cal);
  const [count]=await c.execute('SELECT COUNT(*) AS n FROM Sales s LEFT JOIN Customers c ON c.Id=s.CustomerId'+filter.sql,filter.params);
  const page=pageMeta(count[0].n,query);
  const epoch=cal.expression==='UNIX_TIMESTAMP(s.CreatedAt)'?'UNIX_TIMESTAMP(s.CreatedAt)':'NULL';
  const [rows]=await c.execute(`SELECT s.Id,s.CustomerId,s.Total,s.Subtotal,s.Discount,s.RedeemedPoints,COALESCE(c.FullName,'Cliente no disponible') AS FullName, DATE_FORMAT(s.CreatedAt,'%Y-%m-%d %H:%i:%s') AS RawCreatedAt, ${epoch} AS EpochSeconds, (SELECT COALESCE(SUM(si.Quantity),0) FROM SaleItems si WHERE si.SaleId=s.Id) AS TotalItems FROM Sales s LEFT JOIN Customers c ON c.Id=s.CustomerId${filter.sql} ORDER BY s.CreatedAt DESC,s.Id DESC LIMIT ${page.pageSize} OFFSET ${page.offset}`,filter.params);
  return {...page,rows:rows.map(row=>({...row,ReportDate:cal.display(row)})),calendar:cal.info};
}
async function chart(c,cal,period) {
  const bins=cal.bins(period);const params=[];
  const cases=bins.map((b,i)=>{params.push(...b.args);return `WHEN ${b.sql} THEN ${i}`;}).join(' ');
  const first=bins[0],last=bins[bins.length-1];params.push(first.args[0],last.args[1]);
  const [rows]=await c.execute(`SELECT CASE ${cases} ELSE -1 END AS bucket, COUNT(*) AS CountSales, COALESCE(SUM(s.Total),0) AS Revenue FROM Sales s WHERE ${cal.expression} >= ? AND ${cal.expression} < ? GROUP BY bucket ORDER BY bucket`,params);
  const byBucket=new Map(rows.map(r=>[Number(r.bucket),r]));
  return {rows:bins.map((b,i)=>({LabelDate:b.label,CountSales:zero(byBucket.get(i)?.CountSales),Revenue:zero(byBucket.get(i)?.Revenue)})),calendar:cal.info};
}
const collections={
 'low-stock':{
   from:LOW_STOCK_FROM,
   select:'v.Id,v.ProductId,p.Marca,p.Modelo,v.Color,v.PowerLabel,v.Stock,p.Image AS Image,v.ScanCode,v.Status AS VariantStatus',order:'v.Stock ASC,p.Marca ASC,p.Modelo ASC,v.Id ASC'
 },
 'top-products':{
   from:'FROM Products p JOIN (SELECT ProductId,SUM(Quantity) AS TotalSold,SUM(Subtotal) AS Revenue FROM SaleItems GROUP BY ProductId) sold ON sold.ProductId=p.Id LEFT JOIN (SELECT ProductId,SUM(Stock) AS Stock FROM ProductVariants GROUP BY ProductId) stock ON stock.ProductId=p.Id',
   select:'p.Id,p.Modelo,p.Marca,p.Image,sold.TotalSold,sold.Revenue,COALESCE(stock.Stock,0) AS Stock',order:'sold.TotalSold DESC,p.Id ASC'
 },
 'top-customers':{
   from:'FROM Customers c JOIN (SELECT CustomerId,COUNT(*) AS Visits,SUM(Total) AS TotalSpent FROM Sales GROUP BY CustomerId) sold ON sold.CustomerId=c.Id',
   select:'c.Id,c.FullName,c.Level,c.Points,sold.Visits,sold.TotalSpent',order:'sold.TotalSpent DESC,c.Id ASC'
 }
};
async function collection(c,name,query) {
  const d=collections[name];if(!d)throw new Error('Colección inválida.');
  const [count]=await c.query(`SELECT COUNT(*) AS n ${d.from}`);
  const page=pageMeta(count[0].n,query);
  const [rows]=await c.query(`SELECT ${d.select} ${d.from} ORDER BY ${d.order} LIMIT ${page.pageSize} OFFSET ${page.offset}`);
  return {...page,rows};
}
function createService(db,env=process.env) {
  async function read(fn,needsCalendar=false){
    const c=await db.getConnection();
    try {
      // One snapshot for totals and rows; no sale routines or table writes.
      await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      await c.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
      const cal=needsCalendar?await calendar(c,env):null;
      const result=await fn(c,cal);await c.commit();return result;
    }catch(e){await c.rollback().catch(()=>{});throw e;}finally{c.release();}
  }
  return {summary:()=>read(summary,true),sales:q=>read((c,cal)=>salesPage(c,cal,q),true),chart:p=>read((c,cal)=>chart(c,cal,p),true),collection:(n,q)=>read(c=>collection(c,n,q))};
}
module.exports={createService,pagination,pageMeta,searchClause,summary,salesPage,chart,collection,calendar};
