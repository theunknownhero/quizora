import './country.css'
import { ALL, countryByCode, flagUrl } from '../data/countries.js'

// Untitled UI flag icon. `code` = 'HU' etc. or 'ALL' (globe).
export default function Flag({ code, size = 20, shape = 'circle', className = '' }) {
  if (code === ALL || !countryByCode(code)) {
    return (
      <span className={`flag flag-globe ${className}`} style={{ width: size, height: size, fontSize: size * 0.78 }} aria-hidden="true">
        🌍
      </span>
    )
  }
  const w = shape === 'rect' ? Math.round(size * 1.4) : size
  return <img className={`flag flag-${shape} ${className}`} src={flagUrl(code, shape)} width={w} height={size} alt="" aria-hidden="true" draggable="false" />
}
