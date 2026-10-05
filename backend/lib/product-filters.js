'use strict';
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
function categoryKey(value) {
  const s = normalize(value);
  if (/halloween|fantas|fantasy|cosplay/.test(s)) return 'halloween';
  if (/muneca|doll/.test(s)) return 'muneca';
  if (/natural|natura/.test(s)) return 'natural';
  return s;
}
const list = value => (Array.isArray(value) ? value : value == null || value === '' ? [] : [value]).map(String);
function filtersFromQuery(q = {}) {
  return { search: String(q.search || ''), brands: list(q.brands || q.marca), categories: list(q.categories || q.category), colors: list(q.colors || q.color), powers: list(q.powers), powerType: q.powerType || 'all', status: q.status || 'all', stockMode: q.stockMode || 'all', codeType: q.codeType || 'all', modelo: String(q.modelo || '') };
}
function matchesProduct(p, f = {}) {
  const brands = list(f.brands).map(normalize), cats = list(f.categories).map(categoryKey), colors = list(f.colors).map(normalize), powers = list(f.powers).map(Number);
  const power = p.Power == null ? NaN : Number(p.Power), stock = Number(p.Stock || 0);
  const pending = !!Number(p.NeedsReview);
  const active = normalize(p.VariantStatus || p.Status || 'Activo') === 'activo' && normalize(p.ProductStatus || 'Activo') === 'activo' && !pending;
  if (brands.length && !brands.includes(normalize(p.Marca))) return false;
  if (cats.length && !cats.includes(categoryKey(p.Category))) return false;
  if (colors.length && !colors.includes(normalize(p.Color))) return false;
  if (powers.length && (pending || !powers.includes(power))) return false;
  if (f.powerType === 'none' && (pending || power !== 0)) return false;
  if (f.powerType === 'graduated' && (pending || !Number.isFinite(power) || power === 0)) return false;
  if (f.status === 'active' && !active || f.status === 'inactive' && active || f.status === 'pending' && !pending) return false;
  if (f.stockMode === 'with_stock' && stock <= 0 || f.stockMode === 'without_stock' && stock > 0) return false;
  if (f.codeType && f.codeType !== 'all' && normalize(p.CodeType) !== normalize(f.codeType)) return false;
  if (f.modelo && normalize(p.Modelo) !== normalize(f.modelo)) return false;
  const haystack = normalize([p.Marca,p.Modelo,p.Category,p.Color,p.PowerLabel,p.ScanCode,p.FactoryCode,p.InternalCode].join(' '));
  return normalize(f.search).split(/\s+/).filter(Boolean).every(term => haystack.includes(term));
}
module.exports = { normalize, categoryKey, filtersFromQuery, matchesProduct };
