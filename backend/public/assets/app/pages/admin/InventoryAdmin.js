import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDownToLine, ArrowLeft, ArrowRight, Boxes, CheckCircle2, ClipboardCheck, PackagePlus, Pause, Play, ScanLine, Search, Trash2, TriangleAlert } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar.js';
import Modal from '../../components/Modal.js';
import InventoryCapture from '../../components/inventory/InventoryCapture.js';
import { request, downloadExcel, queryString, uuid } from '../../utils/api.js';
const labels = { ACTIVE: 'En curso', PAUSED: 'En pausa', COMPLETED: 'Finalizado', RECEIPT: 'Entrada de mercancía', STOCKTAKE: 'Inventario completo' };
const date = v => v ? new Date(/[zZ]|[+]\d\d/.test(String(v)) ? v : String(v).replace(' ', 'T') + 'Z').toLocaleString('es-MX') : '—';
const num = v => Number(v || 0).toLocaleString('es-MX');
const initialFilters = { kind: '', status: '', search: '', from: '', to: '', page: 1 };
export default function InventoryAdmin() {
    const { sessionId } = useParams(), navigate = useNavigate();
    const [meta, setMeta] = useState({ brands: [], openStocktakes: [], pending: 0, stats: [] }), [history, setHistory] = useState({ sessions: [], total: 0, pageSize: 25 });
    const [filters, setFilters] = useState(initialFilters), [detail, setDetail] = useState(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [scan, setScan] = useState(false), [setup, setSetup] = useState(false), [brand, setBrand] = useState('');
    const [preview, setPreview] = useState(null), [confirmation, setConfirmation] = useState(null), [tab, setTab] = useState('products'), [tableSearch, setTableSearch] = useState('');
    const [reference, setReference] = useState(''), [notes, setNotes] = useState(''), [editing, setEditing] = useState(false);
    const createKey = useRef(null), createPayload = useRef(null), autoScan = useRef(false);
    async function refreshMeta() { const m = await request('/api/inventory/meta'); setMeta(m); }
    async function refreshDetail() { if (!sessionId)
        return; const d = await request(`/api/inventory/sessions/${sessionId}`); setDetail(d); setReference(d.session.Reference || ''); setNotes(d.session.Notes || ''); return d; }
    useEffect(() => { refreshMeta().catch(e => setError(e.message)); }, []);
    useEffect(() => {
        let live = true;
        setLoading(true);
        setError('');
        setDetail(null);
        setTab('products');
        setTableSearch('');
        setScan(false);
        if (!sessionId) {
            setLoading(false);
            return;
        }
        request(`/api/inventory/sessions/${sessionId}`).then(d => { if (live) {
            setDetail(d);
            setReference(d.session.Reference || '');
            setNotes(d.session.Notes || '');
            if (autoScan.current && d.session.Status === 'ACTIVE') {
                setScan(true);
                autoScan.current = false;
            }
        } }).catch(e => live && setError(e.message)).finally(() => live && setLoading(false));
        return () => { live = false; };
    }, [sessionId]);
    useEffect(() => { if (sessionId)
        return; let live = true; setLoading(true); const timeout = setTimeout(() => request('/api/inventory/sessions?' + queryString(filters)).then(h => live && setHistory(h)).catch(e => live && setError(e.message)).finally(() => live && setLoading(false)), 200); return () => { live = false; clearTimeout(timeout); }; }, [sessionId, filters]);
    async function createSession(kind) {
        setBusy(true);
        setError('');
        try {
            // Una operación incierta siempre se reintenta con la misma clave, incluso tras recargar.
            const existing = localStorage.getItem('cl-inventory-start-pending');
            let payload = existing ? JSON.parse(existing) : null;
            if (payload && payload.kind !== kind)
                throw new Error('Hay un inicio pendiente de confirmar. Reintenta primero el mismo tipo de inventario para recuperar su folio.');
            if (!payload) {
                payload = { kind, brand: kind === 'STOCKTAKE' ? brand : null, confirmReset: kind === 'STOCKTAKE', requestKey: uuid() };
                localStorage.setItem('cl-inventory-start-pending', JSON.stringify(payload));
            }
            const result = await request('/api/inventory/sessions', { method: 'POST', body: payload });
            localStorage.removeItem('cl-inventory-start-pending');
            setSetup(false);
            setPreview(null);
            autoScan.current = true;
            navigate('/admin/inventory/' + result.session.Id);
            await refreshMeta();
        }
        catch (e) {
            if (e.status >= 400 && e.status < 500)
                localStorage.removeItem('cl-inventory-start-pending');
            setError(e.message);
        }
        finally {
            setBusy(false);
        }
    }
    async function getPreview() { setBusy(true); setError(''); try {
        setPreview(await request('/api/inventory/preview?' + queryString({ brand })));
    }
    catch (e) {
        setError(e.message);
    }
    finally {
        setBusy(false);
    } }
    async function status(status, confirmUncounted = false) { setBusy(true); setError(''); try {
        await request(`/api/inventory/sessions/${sessionId}/status`, { method: 'PATCH', body: { status, confirmUncounted } });
        setConfirmation(null);
        await refreshDetail();
        await refreshMeta();
        setNotice(status === 'PAUSED' ? 'Avance guardado. Puedes cerrar el sistema y continuar otro día.' : status === 'COMPLETED' ? 'Inventario finalizado. Su historial y Excel quedan disponibles.' : 'Inventario reanudado. No se volvió a poner el stock en cero.');
        if (status === 'ACTIVE')
            setScan(true);
    }
    catch (e) {
        setError(e.message);
    }
    finally {
        setBusy(false);
    } }
    async function exportFile(path, name) { setBusy(true); setError(''); try {
        await downloadExcel(path, name);
    }
    catch (e) {
        setError(e.message);
    }
    finally {
        setBusy(false);
    } }
    async function saveMetadata() { setBusy(true); setError(''); try {
        await request(`/api/inventory/sessions/${sessionId}/metadata`, { method: 'PATCH', body: { reference, notes } });
        await refreshDetail();
        setEditing(false);
    }
    catch (e) {
        setError(e.message);
    }
    finally {
        setBusy(false);
    } }
    async function voidLine(line) { if (!window.confirm(`¿Anular la captura de ${line.Quantity} unidades del código ${line.Code}? Se restarán esas unidades y quedará registro de la corrección.`))
        return; setBusy(true); setError(''); try {
        await request(`/api/inventory/sessions/${sessionId}/lines/${line.Id}`, { method: 'DELETE' });
        await refreshDetail();
    }
    catch (e) {
        setError(e.message);
    }
    finally {
        setBusy(false);
    } }
    const s = detail?.session, summary = detail?.summary;
    const rows = (tab === 'products' ? detail?.products : detail?.lines)?.filter(p => [p.Code, p.Marca, p.Modelo, p.Color, p.PowerLabel].join(' ').toLowerCase().includes(tableSearch.toLowerCase())) || [];
    return _jsxs("div", { className: "admin-page cl-admin", children: [_jsx(AdminSidebar, {}), _jsxs("main", { className: "admin-content cl-admin-content", children: [_jsxs("header", { className: "cl-page-heading", children: [_jsxs("div", { children: [_jsx("span", { className: "cl-eyebrow", children: "ADMINISTRACI\u00D3N / INVENTARIO" }), _jsx("h1", { children: s ? s.Folio : 'Cada pieza, en su lugar.' }), _jsx("p", { children: s ? `${labels[s.Kind]} · ${s.Brand || 'Varias marcas'}` : 'Recibe mercancía, realiza conteos físicos y conserva la trazabilidad de tu stock.' })] }), sessionId ? _jsxs("button", { className: "cl-btn cl-btn-light", onClick: () => navigate('/admin/inventory'), children: [_jsx(ArrowLeft, { size: 17 }), " Historial"] }) : _jsxs(Link, { className: "cl-btn cl-btn-light", to: "/admin/reports/products", children: [_jsx(ArrowDownToLine, { size: 17 }), " Reporte de existencias"] })] }), error && _jsxs("div", { className: "cl-alert cl-alert-danger", role: "alert", children: [_jsx(TriangleAlert, { size: 19 }), _jsx("span", { children: error }), _jsx("button", { onClick: () => setError(''), "aria-label": "Cerrar error", children: "\u00D7" })] }), notice && _jsxs("div", { className: "cl-alert cl-alert-success", role: "status", children: [_jsx(CheckCircle2, { size: 19 }), _jsx("span", { children: notice }), _jsx("button", { onClick: () => setNotice(''), "aria-label": "Cerrar aviso", children: "\u00D7" })] }), !sessionId && _jsxs(_Fragment, { children: [_jsxs("div", { className: "cl-inventory-choices", children: [_jsxs("section", { className: "cl-operation-card", children: [_jsx("span", { className: "cl-operation-icon", children: _jsx(PackagePlus, {}) }), _jsx("span", { className: "cl-eyebrow", children: "01 / RECIBIR" }), _jsx("h2", { children: "Entrada de mercanc\u00EDa" }), _jsx("p", { children: "Escanea cada c\u00F3digo y agrega la cantidad que lleg\u00F3. Las unidades se suman al stock actual, sin borrar existencias." }), _jsxs("button", { disabled: busy, className: "cl-btn", onClick: () => createSession('RECEIPT'), children: [_jsx(ScanLine, { size: 18 }), " Nueva entrada ", _jsx(ArrowRight, { size: 17 })] }), _jsx("small", { children: "Marca autom\u00E1tica para productos registrados." })] }), _jsxs("section", { className: "cl-operation-card cl-operation-count", children: [_jsx("span", { className: "cl-operation-icon", children: _jsx(ClipboardCheck, {}) }), _jsx("span", { className: "cl-eyebrow", children: "02 / CONTAR DESDE CERO" }), _jsx("h2", { children: "Inventario completo" }), _jsx("p", { children: "Elige una marca, confirma el reinicio a cero y registra todo lo que tienes f\u00EDsicamente. Puedes pausar y continuar despu\u00E9s." }), _jsxs("button", { disabled: busy, className: "cl-btn cl-btn-dark", onClick: () => { setSetup(true); setPreview(null); }, children: [_jsx(Boxes, { size: 18 }), " Iniciar por marca ", _jsx(ArrowRight, { size: 17 })] }), _jsx("small", { children: "Se conserva una fotograf\u00EDa del stock anterior." })] })] }), !!meta.openStocktakes.length && _jsxs("div", { className: "cl-alert", children: [_jsx(Pause, { size: 20 }), _jsxs("div", { children: [_jsx("strong", { children: "Marcas en inventario" }), _jsx("p", { children: "Para evitar diferencias, no se permiten ventas, entradas ni edici\u00F3n de stock de estas marcas hasta finalizar el conteo." }), _jsx("div", { className: "cl-inline-links", children: meta.openStocktakes.map(v => _jsxs(Link, { to: '/admin/inventory/' + v.Id, children: [v.Brand, " \u00B7 ", labels[v.Status], " ", _jsx(ArrowRight, { size: 14 })] }, v.Id)) })] })] }), meta.pending > 0 && _jsxs(Link, { className: "cl-pending-link", to: "/admin/products?view=pending", children: [_jsx(TriangleAlert, { size: 18 }), num(meta.pending), " productos por completar en Productos ", _jsx(ArrowRight, { size: 16 })] }), _jsxs("section", { className: "cl-panel", children: [_jsxs("div", { className: "cl-panel-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: "Historial de inventarios" }), _jsx("p", { children: "Entradas y conteos guardados, incluso los que siguen en pausa." })] }), _jsxs("button", { disabled: busy || !history.total, className: "cl-btn cl-btn-light", onClick: () => exportFile('/api/inventory/sessions/export?' + queryString(filters), 'ColorLenses-Historial.xlsx'), children: [_jsx(ArrowDownToLine, { size: 17 }), " Exportar historial"] })] }), _jsxs("div", { className: "cl-history-filters", children: [_jsxs("label", { className: "cl-search", children: [_jsx(Search, { size: 18 }), _jsx("input", { placeholder: "Folio, marca o referencia", value: filters.search, onChange: e => setFilters({ ...filters, search: e.target.value, page: 1 }) })] }), _jsxs("select", { "aria-label": "Tipo de inventario", value: filters.kind, onChange: e => setFilters({ ...filters, kind: e.target.value, page: 1 }), children: [_jsx("option", { value: "", children: "Todos los tipos" }), _jsx("option", { value: "RECEIPT", children: "Entradas" }), _jsx("option", { value: "STOCKTAKE", children: "Inventarios completos" })] }), _jsxs("select", { "aria-label": "Estado", value: filters.status, onChange: e => setFilters({ ...filters, status: e.target.value, page: 1 }), children: [_jsx("option", { value: "", children: "Todos los estados" }), ['ACTIVE', 'PAUSED', 'COMPLETED'].map(k => _jsx("option", { value: k, children: labels[k] }, k))] }), _jsxs("label", { children: ["Desde (UTC)", _jsx("input", { type: "date", value: filters.from, onChange: e => setFilters({ ...filters, from: e.target.value, page: 1 }) })] }), _jsxs("label", { children: ["Hasta (UTC)", _jsx("input", { type: "date", value: filters.to, onChange: e => setFilters({ ...filters, to: e.target.value, page: 1 }) })] })] }), _jsx("div", { className: "cl-table-wrap", children: _jsxs("table", { className: "cl-data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Folio / referencia" }), _jsx("th", { children: "Tipo / marca" }), _jsx("th", { children: "Estado" }), _jsx("th", { children: "Variantes" }), _jsx("th", { children: "Unidades" }), _jsx("th", { children: "Fecha local" }), _jsx("th", { children: "Acciones" })] }) }), _jsx("tbody", { children: history.sessions.map(h => _jsxs("tr", { children: [_jsxs("td", { children: [_jsx(Link, { className: "cl-table-link", to: '/admin/inventory/' + h.Id, children: h.Folio }), _jsx("small", { children: h.Reference || 'Sin referencia' })] }), _jsxs("td", { children: [labels[h.Kind], _jsx("small", { children: h.Brand || 'Varias marcas' })] }), _jsx("td", { children: _jsx("span", { className: 'cl-status cl-status-' + h.Status.toLowerCase(), children: labels[h.Status] }) }), _jsx("td", { children: num(h.TotalProducts) }), _jsx("td", { children: _jsx("strong", { children: num(h.TotalUnits) }) }), _jsx("td", { children: date(h.CreatedAt) }), _jsx("td", { children: _jsxs("div", { className: "cl-table-actions", children: [_jsx(Link, { to: '/admin/inventory/' + h.Id, children: "Abrir" }), _jsx("button", { disabled: busy, onClick: () => exportFile(`/api/inventory/sessions/${h.Id}/export`, h.Folio + '.xlsx'), "aria-label": 'Exportar ' + h.Folio, children: _jsx(ArrowDownToLine, { size: 17 }) })] }) })] }, h.Id)) })] }) }), loading ? _jsx("p", { className: "cl-empty", children: "Cargando historial\u2026" }) : !history.total && _jsxs("div", { className: "cl-empty", children: [_jsx(ClipboardCheck, { size: 30 }), _jsx("h3", { children: "Todav\u00EDa no hay registros" }), _jsx("p", { children: "Tu primera entrada o inventario aparecer\u00E1 aqu\u00ED." })] }), _jsxs("div", { className: "cl-pagination", children: [_jsxs("span", { children: [num(history.total), " registros"] }), _jsx("button", { disabled: filters.page <= 1, onClick: () => setFilters({ ...filters, page: filters.page - 1 }), children: "Anterior" }), _jsxs("span", { children: [filters.page, " / ", Math.max(1, Math.ceil(history.total / 25))] }), _jsx("button", { disabled: filters.page * 25 >= history.total, onClick: () => setFilters({ ...filters, page: filters.page + 1 }), children: "Siguiente" })] })] })] }), sessionId && loading && _jsx("div", { className: "cl-panel cl-empty", children: "Cargando inventario\u2026" }), s && _jsxs(_Fragment, { children: [_jsxs("div", { className: "cl-session-bar", children: [_jsxs("div", { children: [_jsx("span", { className: 'cl-status cl-status-' + s.Status.toLowerCase(), children: labels[s.Status] }), _jsxs("span", { children: ["Creado por ", s.CreatedByName, " \u00B7 ", date(s.CreatedAt)] })] }), _jsxs("div", { className: "cl-button-row", children: [s.Status === 'ACTIVE' && _jsxs(_Fragment, { children: [_jsxs("button", { className: "cl-btn", disabled: busy, onClick: () => setScan(true), children: [_jsx(ScanLine, { size: 18 }), " Escanear / agregar"] }), _jsxs("button", { className: "cl-btn cl-btn-light", disabled: busy, onClick: () => status('PAUSED'), children: [_jsx(Pause, { size: 17 }), " Pausar"] })] }), s.Status === 'PAUSED' && _jsxs("button", { className: "cl-btn", disabled: busy, onClick: () => status('ACTIVE'), children: [_jsx(Play, { size: 17 }), " Continuar"] }), s.Status !== 'COMPLETED' && _jsxs("button", { className: "cl-btn cl-btn-dark", disabled: busy, onClick: () => setConfirmation('finish'), children: [_jsx(CheckCircle2, { size: 17 }), " Finalizar"] }), _jsxs("button", { className: "cl-btn cl-btn-light", disabled: busy, onClick: () => exportFile(`/api/inventory/sessions/${sessionId}/export`, s.Folio + '.xlsx'), children: [_jsx(ArrowDownToLine, { size: 17 }), " Excel"] })] })] }), s.Status === 'PAUSED' && _jsxs("div", { className: "cl-alert", children: [_jsx(Pause, { size: 18 }), _jsxs("span", { children: ["El avance est\u00E1 guardado en la base de datos. Continuar retoma este mismo folio sin reiniciar el stock.", s.Kind === 'STOCKTAKE' ? ' La marca permanece bloqueada para ventas y cambios hasta finalizar.' : ''] })] }), _jsxs("div", { className: "cl-metric-grid", children: [_jsxs("article", { children: [_jsx("span", { children: s.Kind === 'STOCKTAKE' ? 'Unidades contadas' : 'Unidades recibidas' }), _jsx("strong", { children: num(summary.TotalUnits) }), _jsxs("small", { children: [num(summary.TotalScans), " capturas aplicadas"] })] }), _jsxs("article", { children: [_jsx("span", { children: "Variantes registradas" }), _jsx("strong", { children: num(summary.TotalProducts) }), _jsx("small", { children: "Consolidado por c\u00F3digo / variante" })] }), s.Kind === 'STOCKTAKE' ? _jsxs(_Fragment, { children: [_jsxs("article", { children: [_jsx("span", { children: "Unidades antes de reiniciar" }), _jsx("strong", { children: num(summary.OriginalUnits) }), _jsx("small", { children: "Registro del stock anterior" })] }), _jsxs("article", { children: [_jsx("span", { children: "Variantes sin contar" }), _jsx("strong", { children: num(summary.Uncounted) }), _jsx("small", { children: "Se mantienen en cero" })] })] }) : _jsxs("article", { children: [_jsx("span", { children: "C\u00F3digos nuevos" }), _jsx("strong", { children: num(summary.PendingProducts) }), _jsx("small", { children: "Pendientes de completar al capturar" })] })] }), _jsxs("section", { className: "cl-panel cl-reference", children: [_jsxs("div", { children: [_jsx("strong", { children: "Referencia / proveedor" }), _jsxs("p", { children: [s.Reference || 'Sin referencia', s.Notes && _jsxs(_Fragment, { children: [_jsx("br", {}), s.Notes] })] })] }), s.Status !== 'COMPLETED' && _jsx("button", { className: "cl-btn cl-btn-light", onClick: () => setEditing(true), children: "Editar referencia" })] }), _jsxs("section", { className: "cl-panel", children: [_jsxs("div", { className: "cl-panel-heading", children: [_jsxs("div", { className: "cl-tabs", children: [_jsx("button", { className: tab === 'products' ? 'active' : '', onClick: () => setTab('products'), children: "Productos" }), _jsx("button", { className: tab === 'movements' ? 'active' : '', onClick: () => setTab('movements'), children: "Capturas / correcciones" })] }), _jsxs("label", { className: "cl-search", children: [_jsx(Search, { size: 17 }), _jsx("input", { placeholder: "Buscar en este inventario", value: tableSearch, onChange: e => setTableSearch(e.target.value) })] })] }), _jsx("div", { className: "cl-table-wrap", children: _jsxs("table", { className: "cl-data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "C\u00F3digo / producto" }), _jsx("th", { children: "Marca" }), _jsx("th", { children: "Color / graduaci\u00F3n" }), _jsx("th", { children: "Antes" }), _jsx("th", { children: tab === 'products' ? (s.Kind === 'STOCKTAKE' ? 'Contado' : 'Recibido') : 'Cantidad' }), _jsx("th", { children: tab === 'products' && s.Kind === 'STOCKTAKE' ? 'Diferencia' : 'Stock al registrar' }), _jsx("th", { children: "Estado" }), tab === 'movements' && _jsx("th", { children: "Acciones" })] }) }), _jsx("tbody", { children: rows.map((p, i) => _jsxs("tr", { className: p.VoidedAt ? 'cl-voided' : '', children: [_jsxs("td", { children: [_jsx("code", { children: p.Code }), _jsx("small", { children: p.Modelo })] }), _jsx("td", { children: p.Marca }), _jsxs("td", { children: [p.Color || 'Por confirmar', _jsx("small", { children: p.PowerLabel || 'Por confirmar' })] }), _jsx("td", { children: num(p.StockBefore) }), _jsx("td", { children: _jsx("strong", { children: num(p.Quantity) }) }), _jsx("td", { children: num(tab === 'products' ? (s.Kind === 'STOCKTAKE' ? p.Difference : p.LastRecordedStock) : p.StockAfter) }), _jsxs("td", { children: [tab === 'products' ? _jsx("span", { className: 'cl-status ' + (p.Counted ? 'cl-status-completed' : 'cl-status-paused'), children: s.Kind === 'STOCKTAKE' ? p.CountStatus : (p.Counted ? 'Recibido' : 'Anulado') }) : _jsxs(_Fragment, { children: [_jsx("span", { className: 'cl-status ' + (p.VoidedAt ? 'cl-status-voided' : 'cl-status-completed'), children: p.VoidedAt ? 'Anulado' : 'Aplicado' }), _jsxs("small", { children: [date(p.CreatedAt), " \u00B7 ", p.CreatedByName] })] }), Number(p.NeedsReview) > 0 && _jsx("small", { children: "C\u00F3digo nuevo al capturar" })] }), tab === 'movements' && _jsx("td", { children: s.Status === 'ACTIVE' && !p.VoidedAt && _jsx("button", { className: "cl-icon-btn", disabled: busy, "aria-label": 'Anular captura ' + p.Id, onClick: () => voidLine(p), children: _jsx(Trash2, { size: 17 }) }) })] }, tab === 'products' ? p.ProductVariantId : p.Id)) })] }) }), !rows.length && _jsxs("div", { className: "cl-empty", children: [_jsx(ScanLine, { size: 30 }), _jsx("h3", { children: tableSearch ? 'Sin coincidencias' : 'Listo para tu primera captura' }), _jsx("p", { children: "Escanea un c\u00F3digo o introd\u00FAcelo manualmente." })] }), _jsxs("p", { className: "cl-table-note", children: [s.Kind === 'STOCKTAKE' ? 'La diferencia compara el conteo con el stock guardado antes del reinicio.' : 'El stock al registrar es una fotografía de ese momento; no incluye ventas ni movimientos posteriores.', " Los movimientos anulados permanecen en el historial."] })] })] }), setup && _jsxs(Modal, { title: preview ? 'Confirmar inventario completo' : 'Inventariar una marca', onClose: () => { if (!busy) {
                            setSetup(false);
                            setPreview(null);
                        } }, busy: busy, children: [preview ? _jsxs(_Fragment, { children: [_jsxs("div", { className: "cl-alert cl-alert-danger", children: [_jsx(TriangleAlert, { size: 24 }), _jsxs("div", { children: [_jsxs("strong", { children: ["Se pondr\u00E1 en cero toda la marca ", preview.brand, "."] }), _jsxs("p", { children: [num(preview.variants), " variantes \u00B7 ", num(preview.units), " unidades actualmente registradas."] })] })] }), _jsx("p", { children: "Se guardar\u00E1 el stock anterior como referencia y podr\u00E1s cargar tu conteo desde cero. No se borran los productos ni se modifican otras marcas." }), _jsxs("p", { children: ["Mientras este inventario est\u00E9 activo o pausado, no se podr\u00E1n vender ni modificar productos de ", _jsx("strong", { children: preview.brand }), ". Los productos no contados quedar\u00E1n en cero al finalizar."] }), _jsxs("div", { className: "cl-button-row", children: [_jsx("button", { className: "cl-btn cl-btn-light", disabled: busy, onClick: () => setPreview(null), children: "Volver" }), _jsx("button", { className: "cl-btn cl-btn-danger", disabled: busy, onClick: () => createSession('STOCKTAKE'), children: busy ? 'Iniciando…' : 'Sí, poner esta marca en cero' })] })] }) : _jsxs(_Fragment, { children: [_jsx("p", { children: "Selecciona la marca que vas a contar f\u00EDsicamente. En el siguiente paso ver\u00E1s el alcance antes de confirmar el reinicio." }), _jsxs("label", { className: "cl-field", children: ["Marca", _jsxs("select", { "aria-label": "Marca a inventariar", value: brand, onChange: e => setBrand(e.target.value), children: [_jsx("option", { value: "", children: "Selecciona una marca" }), meta.brands.map(b => _jsx("option", { children: b }, b))] })] }), _jsxs("button", { className: "cl-btn cl-full", disabled: !brand || busy, onClick: getPreview, children: [busy ? 'Revisando…' : 'Revisar e iniciar', _jsx(ArrowRight, { size: 17 })] })] }), error && _jsx("p", { className: "cl-form-error", role: "alert", children: error })] }), confirmation === 'finish' && s && _jsxs(Modal, { title: "Finalizar inventario", busy: busy, onClose: () => setConfirmation(null), children: [_jsxs("p", { children: ["Se cerrar\u00E1 ", _jsx("strong", { children: s.Folio }), " con ", _jsxs("strong", { children: [num(summary.TotalUnits), " unidades"] }), " registradas. Despu\u00E9s podr\u00E1s consultarlo y exportarlo, pero no modificar sus capturas."] }), s.Kind === 'STOCKTAKE' && summary.Uncounted > 0 && _jsxs("div", { className: "cl-alert cl-alert-danger", children: [_jsx(TriangleAlert, {}), _jsxs("span", { children: ["Hay ", num(summary.Uncounted), " variantes sin contar. Si finalizas, su stock permanecer\u00E1 en cero."] })] }), summary.PendingProducts > 0 && _jsx("p", { children: "Los c\u00F3digos nuevos seguir\u00E1n pendientes en Productos hasta completar y publicar sus datos." }), _jsxs("div", { className: "cl-button-row", children: [_jsx("button", { className: "cl-btn cl-btn-light", disabled: busy, onClick: () => setConfirmation(null), children: "Seguir contando" }), _jsx("button", { className: "cl-btn cl-btn-dark", disabled: busy, onClick: () => status('COMPLETED', true), children: busy ? 'Guardando…' : 'Confirmar finalización' })] }), error && _jsx("p", { className: "cl-form-error", children: error })] }), editing && _jsxs(Modal, { title: "Datos de la entrada o inventario", onClose: () => setEditing(false), busy: busy, children: [_jsxs("label", { className: "cl-field", children: ["Referencia / proveedor", _jsx("input", { value: reference, maxLength: 190, onChange: e => setReference(e.target.value), placeholder: "Factura, pedido o proveedor" })] }), _jsxs("label", { className: "cl-field", children: ["Notas", _jsx("textarea", { value: notes, maxLength: 2000, onChange: e => setNotes(e.target.value), rows: 4 })] }), _jsx("button", { className: "cl-btn", disabled: busy, onClick: saveMetadata, children: "Guardar datos" }), error && _jsx("p", { className: "cl-form-error", children: error })] }), scan && s && _jsx(InventoryCapture, { session: s, brands: meta.brands, onClose: () => setScan(false), onSaved: async () => { await refreshDetail(); await refreshMeta(); } })] })] });
}
