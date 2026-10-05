const status = value => String(value ?? 'Activo').trim().toLocaleLowerCase('es');

export function adminProductMode(product) {
  if (Number(product.NeedsReview)) return 'pending';
  return status(product.VariantStatus || product.Status) === 'activo' &&
    status(product.ProductStatus) === 'activo' ? 'active' : 'inactive';
}

export function normalizeAdminProduct(product) {
  const hasPower = product.Power != null && String(product.Power).trim() !== '' && Number.isFinite(Number(product.Power));
  const power = hasPower ? Number(product.Power) : null;
  return {
    ...product,
    ProductVariantId: product.ProductVariantId || product.VariantId || product.Id,
    ProductId: product.ProductId || product.ProductID,
    ...Object.fromEntries(['Category','Marca','Modelo','Description','Image','Image2','Image3','Color','FactoryCode','InternalCode'].map(key => [key, product[key] || ''])),
    Power: power,
    PowerLabel: product.PowerLabel || (power == null ? 'Por confirmar' : power === 0 ? 'Sin graduación' : power.toFixed(2)),
    Price: Number(product.Price || 0),
    Stock: Number(product.Stock || 0),
    ScanCode: product.ScanCode || product.FactoryCode || product.InternalCode || '',
    CodeAliases: [...new Set((Array.isArray(product.CodeAliases) ? product.CodeAliases : []).filter(code => typeof code === 'string').map(code => code.trim()).filter(Boolean))],
    CodeType: product.CodeType || 'INTERNAL',
    Status: product.Status || product.VariantStatus || 'Activo',
    ProductStatus: product.ProductStatus || 'Activo'
  };
}

export function matchesAdminCodeAlias(product, search) {
  const value = String(search ?? '').trim().toLocaleLowerCase('es');
  return Boolean(value) && (product.CodeAliases || []).some(code => code.toLocaleLowerCase('es').includes(value));
}

export function adminProductsFromRows(rows) {
  if (!Array.isArray(rows)) throw new Error('No se pudo cargar el catálogo completo. Recarga la página.');
  const variants = new Map();
  for (const row of rows) {
    const product = normalizeAdminProduct(row);
    if (product.ProductVariantId != null) variants.set(String(product.ProductVariantId), product);
  }
  return [...variants.values()].sort((a,b) => Number(b.ProductVariantId) - Number(a.ProductVariantId));
}

// Consultar siempre al servidor: un código puede pertenecer a una variante
// inactiva, pendiente o a un alias que no está en las filas visibles.
export async function lookupAdminProduct(request, code) {
  const value = String(code ?? '').trim();
  if (!value) throw new Error('Escribe o escanea un código primero.');
  const result = await request(`/api/inventory/lookup?code=${encodeURIComponent(value)}`);
  if (!result?.found || !result.product) return null;
  return normalizeAdminProduct(result.product);
}
