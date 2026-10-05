import { useEffect,useState } from 'react';
import { Search,RefreshCw } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import RevenueChart from '../../components/reports/RevenueChart';
import { Pagination,ReportState,ReportClock,SalesKpis,SaleRows,currency } from '../../components/reports/ReportParts';
import useRemoteReport from '../../hooks/useRemoteReport';
export default function SalesHistoryAdmin(){
 const [search,setSearch]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(1),[pageSize,setPageSize]=useState(10);
 useEffect(()=>{const timer=setTimeout(()=>{setQuery(search);setPage(1);},250);return()=>clearTimeout(timer);},[search]);
 const summary=useRemoteReport('/api/analytics/summary');
 const result=useRemoteReport(`/api/analytics/sales?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`);
 const stats=summary.data?.stats;
 return <div className="admin-page"><AdminSidebar/><main className="admin-content"><div className="admin-header-row"><div className="admin-header"><span className="cl-eyebrow">CADA VENTA CUENTA</span><h1>Historial de ventas</h1><p>Fechas, importes y puntos. Un mismo origen para todos los indicadores.</p></div><button className="cl-button cl-button-light" disabled={summary.loading||result.loading} onClick={()=>{summary.refresh();result.refresh();}}><RefreshCw size={17}/>Actualizar</button></div>
 <ReportState loading={false} error={summary.error} retry={summary.refresh}/><SalesKpis stats={stats} loading={summary.loading}/><ReportClock calendar={summary.data?.calendar}/>
 {stats?.undatedSales>0&&<p className="cl-report-warning">{stats.undatedSales} ventas no tienen una fecha válida. No se les asignó una fecha inventada.</p>}
 <div className="cl-summary-mini cl-history-mini">{[['Ticket promedio',stats?currency(stats.averageTicket):'—'],['Clientes con compras',stats?.uniqueCustomers??'—'],['Piezas vendidas',stats?.totalItemsSold??'—'],['Puntos canjeados',stats?.totalRedeemedPoints??'—'],['Descuentos',stats?currency(stats.totalDiscount):'—']].map(([label,value])=><article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
 <RevenueChart/><section className="cl-dashboard-panel"><div className="cl-panel-heading"><div><h2>Ventas registradas</h2><p>La búsqueda filtra la tabla; los indicadores muestran el total del negocio.</p></div><label className="cl-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} aria-label="Buscar ventas" placeholder="Folio, cliente o fecha AAAA-MM-DD"/></label></div><ReportState {...result} retry={result.refresh}/>{result.data&&<><SaleRows rows={result.data.rows}/><Pagination {...result.data} label="ventas" busy={result.loading} onPage={setPage} onSize={n=>{setPageSize(n);setPage(1);}}/></>}</section>
 </main></div>;
}
