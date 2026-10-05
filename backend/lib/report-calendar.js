'use strict';
// Reads never rewrite stored dates. DATETIME needs an explicit source zone.
const pad = n => String(n).padStart(2,'0');
function checkZone(zone) {
  try { new Intl.DateTimeFormat('en-US',{timeZone:zone}).format(); return zone; }
  catch { throw new Error('Zona horaria inválida en CL_REPORT_TIME_ZONE o CL_SALES_DATETIME_ZONE.'); }
}
function parts(epoch,zone) {
  const values = new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(epoch));
  return Object.fromEntries(values.filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
}
function wall(epoch,zone) {
  const p=parts(epoch,zone); return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}
function wallEpoch(text,zone) {
  const m=/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(String(text));
  if(!m) throw new Error('Fecha sin formato ISO de base de datos.');
  const target=Date.UTC(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0));
  const expected=`${m[1]}-${m[2]}-${m[3]} ${m[4]||'00'}:${m[5]||'00'}:${m[6]||'00'}`;
  let guess=target;
  for(let i=0;i<6;i++) {
    const p=parts(guess,zone);
    const seen=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
    const difference=target-seen;
    if(!difference && wall(guess,zone)===expected) return guess;
    guess+=difference;
  }
  throw new Error('Una fecha no existe en la zona configurada. No se ajustó automáticamente.');
}
function dayAdd(iso,days) { const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10); }
function monthAdd(iso,months) { const [y,m]=iso.split('-').map(Number);return new Date(Date.UTC(y,m-1+months,1)).toISOString().slice(0,10); }
function makeCalendar(clock,type,env={}) {
  type=String(type).toLowerCase();
  if(!['timestamp','datetime','date'].includes(type)) throw new Error('Sales.CreatedAt no es DATE/DATETIME/TIMESTAMP. Revisa el diagnóstico antes de interpretar fechas.');
  const sourceZone=env.CL_SALES_DATETIME_ZONE ? checkZone(env.CL_SALES_DATETIME_ZONE) : null;
  const configured=type==='timestamp'||(type==='datetime'&&sourceZone);
  const zone=configured?checkZone(env.CL_REPORT_TIME_ZONE||'America/Ciudad_Juarez'):null;
  const today=configured?wall(Number(clock.EpochSeconds)*1000,zone).slice(0,10):String(clock.ServerNow).slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(today))throw new Error('MySQL no devolvió una fecha de referencia válida.');
  const expression=type==='timestamp'?'UNIX_TIMESTAMP(s.CreatedAt)':'s.CreatedAt';
  function bound(iso) {
    if(!configured)return iso+' 00:00:00';
    const epoch=wallEpoch(iso,zone);
    return type==='timestamp'?epoch/1000:wall(epoch,sourceZone);
  }
  function range(start,end){return {start,end,sql:`(${expression} >= ? AND ${expression} < ?)`,args:[bound(start),bound(end)]};}
  const month=today.slice(0,7)+'-01',year=today.slice(0,4)+'-01-01';
  const ranges={today:range(today,dayAdd(today,1)),month:range(month,monthAdd(month,1)),year:range(year,`${+today.slice(0,4)+1}-01-01`)};
  function display(row) {
    const raw=row.RawCreatedAt;
    if(!raw||String(raw).startsWith('0000'))return null;
    try {
      if(type==='timestamp')return row.EpochSeconds==null?null:wall(Number(row.EpochSeconds)*1000,zone);
      if(configured)return wall(wallEpoch(raw,sourceZone),zone);
      return String(raw);
    } catch{return null;}
  }
  function bins(period) {
    let starts=[];
    if(period==='monthly')starts=Array.from({length:13},(_,i)=>monthAdd(month,i-11));
    else if(period==='yearly')starts=Array.from({length:6},(_,i)=>`${+today.slice(0,4)+i-4}-01-01`);
    else if(period==='weekly') {
      const weekday=new Date(today+'T12:00:00Z').getUTCDay();const monday=dayAdd(today,-((weekday+6)%7));
      starts=Array.from({length:13},(_,i)=>dayAdd(monday,(i-11)*7));
    } else starts=Array.from({length:31},(_,i)=>dayAdd(today,i-29));
    return starts.slice(0,-1).map((start,i)=>({...range(start,starts[i+1]),label:period==='yearly'?start.slice(0,4):period==='monthly'?start.slice(0,7):start}));
  }
  function forDay(iso){if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)||Number.isNaN(Date.parse(iso+'T12:00:00Z'))||dayAdd(iso,0)!==iso)return null;return range(iso,dayAdd(iso,1));}
  return {ranges,expression,display,bins,forDay,info:{today,serverNow:String(clock.ServerNow),serverTimeZone:String(clock.SessionTimeZone),dateType:type,timeZone:zone,sourceZone:type==='timestamp'?'TIMESTAMP':sourceZone,confirmed:Boolean(configured),label:zone||`Calendario de MySQL (${clock.SessionTimeZone})`,warning:configured?null:'El horario de Sales.CreatedAt aún no está confirmado. Estos periodos usan el calendario de MySQL, no la hora de tu computadora. Genera DIAGNOSTICAR_BASE.cjs antes de ajustar la zona; no se cambiaron las fechas guardadas.'}};
}
module.exports={makeCalendar,wallEpoch,wall,parts,dayAdd,monthAdd};
