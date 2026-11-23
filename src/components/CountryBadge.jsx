import Flag from './Flag.jsx'
import { countryByCode } from '../data/countries.js'

const SHORT = { US: 'USA', CZ: 'Czechia' }

// Label shown on country-specific quizzes, e.g. [🇭🇺 Hungary] or [🇺🇸🇨🇦 USA · Canada]
export default function CountryBadge({ codes = [], highlight = false, className = '' }) {
  if (!codes.length) return null
  const names = codes.map((c) => SHORT[c] || countryByCode(c)?.name || c)
  return (
    <span className={`country-badge ${highlight ? 'is-local' : ''} ${className}`} title={`Country quiz: ${names.join(', ')}`}>
      <span className="country-badge-flags">
        {codes.map((c) => (
          <Flag key={c} code={c} size={14} />
        ))}
      </span>
      {names.join(' · ')}
    </span>
  )
}
