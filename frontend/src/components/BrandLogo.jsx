import darkSurfaceLogo from '../assets/brand/colorlenses-white-rose.webp';
import lightSurfaceLogo from '../assets/brand/colorlenses-ink-rose.webp';

/** One shared lockup keeps every storefront and admin surface consistent. */
export default function BrandLogo({ dark = false, compact = false, className = '' }) {
  return <span className={`cl-brand-logo${compact ? ' cl-brand-logo--compact' : ''} ${className}`.trim()}>
    <img src={dark ? darkSurfaceLogo : lightSurfaceLogo}
      alt="ColorLenses · Tu mirada, otra historia" width="1400" height={dark ? 322 : 321} decoding="async" />
  </span>;
}
