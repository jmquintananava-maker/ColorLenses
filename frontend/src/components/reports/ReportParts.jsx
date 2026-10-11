import { ChevronLeft,ChevronRight,RefreshCw } from 'lucide-react';
export const currency=v=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(v)||0);
export function reportDate(raw){
 if(!raw)return 'Sin fecha válida';
 const m=/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?/.exec(String(raw));
 return m?`${m[3]}/${m[2]}/${m[1]}${m[4]?` · ${m[4]}:${m[5]}`:''}`:'Sin fecha válida';
}
export function Pagination({page=1,pageSize=10,total=0,totalPages=1,onPage,onSize,busy=false,label='resultados'}) {
 const start=total?(page-1)*pageSize+1:0,end=Math.min(total,page*pageSize);
 return <nav className="cl-pagination" aria-label={`Paginación de ${label}`}><span aria-live="polite">{start}–{end} de <b>{total}</b> {label}</span><label>Por página <select aria-label={`Cantidad de ${label} por página`} value={pageSize} disabled={busy} onChange={e=>onSize(Number(e.target.value))}>{[5,10,20,50].map(n=><option key={n}>{n}</option>)}</select></label><div><button type="button" className="cl-icon-btn" disabled={busy||page<=1} onClick={()=>onPage(page-1)} aria-label={`Página anterior de ${label}`}><ChevronLeft size={20}/></button><span>{page} / {totalPages}</span><button type="button" className="cl-icon-btn" disabled={busy||page>=totalPages} onClick={()=>onPage(page+1)} aria-label={`Página siguiente de ${label}`}><ChevronRight size={20}/></button></div></nav>;
}
export function ReportState({loading,error,retry}) {
 if(loading)return <div className="cl-report-state" role="status">Consultando registros…</div>;
 if(error)return <div className="cl-report-error" role="alert"><strong>No se pudieron cargar los datos</strong><p>{error}</p><button type="button" className="cl-button" onClick={retry}><RefreshCw size={16}/> Reintentar</button></div>;
 return null;
}
export function ReportClock({calendar}) {
 if(!calendar)return null;
 return <div className="cl-report-clock"><span><b>Periodo de referencia:</b> {calendar.today} · {calendar.label}</span>{calendar.warning&&<p className="cl-report-warning" role="status">{calendar.warning}</p>}</div>;
}
export function SalesKpis({stats,loading}) {
 const items=[['Ventas hoy','todayCount','todayRevenue'],['Ventas del mes','monthCount','monthRevenue'],['Ventas del año','yearCount','yearRevenue'],['Ventas registradas','totalSales','totalRevenue']];
 return <div className="cl-sales-kpis">{items.map(([label,count,amount])=><article className="cl-kpi-card" key={count}><p>{label}</p><strong>{loading?'…':stats?stats[count]:'—'}</strong><span>{loading?'Consultando…':stats?currency(stats[amount]):'Sin datos confirmados'}</span></article>)}</div>;
}
export function SaleRows({rows=[]}) {
 return <div className="cl-table-wrap"><table role="table" className="cl-report-table"><thead><tr><th scope="col">Venta</th><th scope="col">Cliente</th><th scope="col">Fecha del reporte</th><th scope="col">Piezas</th><th scope="col">Puntos canjeados</th><th scope="col">Total</th></tr></thead><tbody>{rows.map(s=><tr key={s.Id}><td data-label="Venta">#{s.Id}</td><td data-label="Cliente">{s.FullName}</td><td data-label="Fecha del reporte">{reportDate(s.ReportDate)}</td><td data-label="Piezas">{s.TotalItems}</td><td data-label="Puntos canjeados">{s.RedeemedPoints}</td><td data-label="Total"><strong>{currency(s.Total)}</strong></td></tr>)}</tbody></table>{rows.length===0&&<p className="cl-report-state">No hay ventas para mostrar.</p>}</div>;
}
