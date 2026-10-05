import { useRef, useState } from 'react';
import { Images, RefreshCw } from 'lucide-react';
import { request } from '../utils/api';

export default function ProductPhotoStatus() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const sequence = useRef(0);

  async function review() {
    const current = ++sequence.current;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const result = await request('/api/uploads/status');
      if (current === sequence.current) setData(result);
    } catch (err) {
      if (current === sequence.current) setError(err.message || 'No se pudieron revisar las fotos.');
    } finally { if (current === sequence.current) setLoading(false); }
  }

  function toggle() {
    if (!open) void review();
    else { sequence.current++; setLoading(false); }
    setOpen(!open);
  }

  return <div className="product-photo-status">
    <button type="button" className="cl-btn cl-btn-light" aria-expanded={open} aria-controls="product-photo-review" onClick={toggle}>
      <Images size={17} />{open ? 'Cerrar revisión de fotos' : 'Revisar fotos'}
    </button>
    {open && <section id="product-photo-review" className="cl-panel" aria-label="Revisión de fotos" aria-busy={loading}>
      <div className="cl-panel-heading"><h2>Fotos de productos</h2>
        <button type="button" className="cl-btn cl-btn-light" onClick={review} disabled={loading}><RefreshCw size={15} />Volver a revisar</button>
      </div>
      {loading && <p role="status">Revisando carpetas y fotos guardadas…</p>}
      {error && <p className="cl-alert" role="alert">{error}</p>}
      {data && <>
        <p><strong>{data.counts.found} fotos localizadas</strong> · {data.counts.missing} faltantes</p>
        <p>Las fotos nuevas se guardan en esta carpeta del servidor:</p>
        <code className="product-photo-directory">{data.uploadDirectory}</code>
        <p>En el administrador de archivos, busca esa carpeta para copiar las fotos del respaldo con sus nombres originales.</p>
        <details><summary>Carpetas que también se revisan</summary>
          <ul>{data.directories.map(directory => <li key={directory.directory}>
            <code>{directory.directory}</code><span>{directory.readable ? `${directory.photos} archivos de imagen` : directory.exists ? 'Sin permiso de lectura' : 'Carpeta no encontrada'}</span>
          </li>)}</ul>
        </details>
        {data.counts.legacy > 0 && <p>{data.counts.legacy} fotos ya se leen desde las carpetas anteriores.</p>}
        {data.counts.normalized > 0 && <p>{data.counts.normalized} nombres antiguos se reconocen por su codificación.</p>}
        {data.counts.external > 0 && <p>{data.counts.external} enlaces externos u otras rutas requieren revisión aparte.</p>}
        {data.missing.length > 0 && <div className="product-photo-missing">
          <h3>Fotos que faltan {data.counts.missing > data.missing.length ? '(primeras 12)' : ''}</h3>
          <p>Compara estos nombres con el respaldo. Un nombre distinto no corresponde al enlace guardado.</p>
          <ul>{data.missing.map(photo => <li key={`${photo.productId}-${photo.field}`}>
            <strong>{photo.brand} · {photo.model}</strong><code>{photo.filename}</code>
          </li>)}</ul>
        </div>}
      </>}
    </section>}
  </div>;
}
