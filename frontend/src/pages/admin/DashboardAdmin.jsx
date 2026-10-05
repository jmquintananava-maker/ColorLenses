import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw,ArrowUpRight,Package,Receipt,Users,Star,LayoutDashboard } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import RevenueChart from '../../components/reports/RevenueChart';
import { Pagination,ReportState,ReportClock,SalesKpis,SaleRows,currency } from '../../components/reports/ReportParts';
import useRemoteReport from '../../hooks/useRemoteReport';
import { imageUrl } from '../../utils/api';
const tabs=[['overview','Vista general',LayoutDashboard],['low-stock','Stock crítico',Package],['sales','Últimas ventas',Receipt],['top-products','Productos destacados',Star],['top-customers','Clientes destacados',Users]];
export default function DashboardAdmin(){
 const [tab,setTab]=useState('overview'),[page,setPage]=useState(1),[pageSize,setPageSize]=useState(10);
 const summary=useRemoteReport('/api/analytics/summary');
 const section=useRemoteReport(tab==='overview'?null:`/api/analytics/${tab}?page=${page}&pageSize=${pageSize}`);
 const stats=summary.data?.stats;
 function changeTab(value){setTab(value);setPage(1);}
 return <div className="admin-page"><AdminSidebar/><main className="admin-content cl-summary"><div className="admin-header-row"><div className="admin-header"><span className="cl-eyebrow">TU NEGOCIO / EN PERSPECTIVA</span><h1>Resumen</h1><p>Lo importante, en su lugar. Consulta cada sección sin una página interminable.</p></div><button className="cl-button cl-button-light" onClick={()=>{summary.refresh();section.refresh();}} disabled={summary.loading||section.loading}><RefreshCw size={17}/>Actualizar</button></div>
 <ReportState loading={false} error={summary.error} retry={summary.refresh}/><SalesKpis stats={stats} loading={summary.loading}/><ReportClock calendar={summary.data?.calendar}/>
 {stats?.undatedSales>0&&<p className="cl-report-warning">Hay {stats.undatedSales} ventas sin fecha válida: se incluyen en el total histórico, no en día/mes/año.</p>}
 <div className="cl-summary-tabs" aria-label="Secciones del resumen">{tabs.map(([value,label,Icon])=><button type="button" key={value} className={tab===value?'active':''} aria-pressed={tab===value} onClick={()=>changeTab(value)}><Icon size={17}/>{label}{value==='low-stock'&&stats&&<b>{stats.LowStock}</b>}</button>)}</div>
 {tab==='overview'?<><div className="cl-summary-mini"><Link to="/admin/customers"><span>Clientes</span><strong>{stats?.TotalCustomers??'—'}</strong><ArrowUpRight/></Link><Link to="/admin/products"><span>Productos base</span><strong>{stats?.TotalProducts??'—'}</strong><ArrowUpRight/></Link><button type="button" onClick={()=>changeTab('low-stock')}><span>Variantes con stock crítico</span><strong>{stats?.LowStock??'—'}</strong><ArrowUpRight/></button></div><RevenueChart/><div className="cl-quick-actions"><Link className="cl-button" to="/admin/sales">Registrar venta<ArrowUpRight size={17}/></Link><Link className="cl-button cl-button-light" to="/admin/inventory">Abrir inventarios</Link><Link className="cl-button cl-button-light" to="/admin/sales-history">Historial completo</Link></div></>:<section className="cl-dashboard-panel" aria-live="polite"><div className="cl-panel-heading"><div><h2>{tabs.find(t=>t[0]===tab)[1]}</h2><p>{tab==='low-stock'?'Productos activos con 5 unidades o menos por variante. Incluye agotados en cero aunque la variante esté inactiva; no los reactiva.':'Consulta por páginas. Los indicadores de arriba no cambian al avanzar.'}</p></div></div><ReportState {...section} retry={section.refresh}/>{section.data&&<>
 {tab==='sales'?<SaleRows rows={section.data.rows}/>:<div className="cl-report-records">{section.data.rows.map((item,index)=><article className={'cl-report-record '+(tab==='low-stock'&&Number(item.Stock)===0?'critical':'')} key={item.Id}>{tab==='top-customers'?<><span className="cl-rank">{section.data.offset+index+1}</span><div><h3>{item.FullName}</h3><p>{item.Visits} compras · {item.Level}</p><small>{item.Points} puntos</small></div><strong>{currency(item.TotalSpent)}</strong></>:<>{item.Image?<img src={imageUrl(item.Image)} alt="" loading="lazy"/>:<span className="cl-record-placeholder"><Package/></span>}<div><h3>{item.Modelo}</h3><p>{[item.Marca,item.Color,item.PowerLabel].filter(Boolean).join(' · ')}</p>{tab==='low-stock'&&<small>{item.ScanCode}{Number(item.Stock)===0?' · Agotado':''}{item.VariantStatus==='Inactivo'?' · Variante inactiva':''}</small>}{tab==='top-products'&&<small>{item.TotalSold} vendidos · {item.Stock} en stock</small>}</div><strong>{tab==='low-stock'?`${item.Stock} uds.`:currency(item.Revenue)}</strong></>}</article>)}{!section.data.rows.length&&<p className="cl-report-state">No hay registros en esta sección.</p>}</div>}
 <Pagination {...section.data} busy={section.loading} label={tab==='sales'?'ventas':'registros'} onPage={setPage} onSize={n=>{setPageSize(n);setPage(1);}}/>
 </>}</section>}
 </main></div>;
}
