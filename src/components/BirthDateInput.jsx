// Day / month / year selects for a date of birth. Value is 'YYYY-MM-DD' or ''.
import { useEffect, useState } from 'react'
import { Cake } from 'lucide-react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function BirthDateInput({ id = 'dob', value, onChange, error, hint, label = 'Date of birth' }) {
  const [y0, m0, d0] = (value || '--').split('-')
  const [parts, setParts] = useState({ d: d0 || '', m: m0 || '', y: y0 || '' })
  const year = new Date().getFullYear()
  const years = Array.from({ length: 100 }, (_, i) => year - i)

  useEffect(() => {
    const { d, m, y } = parts
    onChange(d && m && y ? `${y}-${m}-${d}` : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts])

  const set = (k) => (e) => setParts((p) => ({ ...p, [k]: e.target.value }))
  return (
    <div className={`af-field ${error ? 'has-error' : ''}`} role="group" aria-labelledby={`${id}-label`}>
      <span className="af-label" id={`${id}-label`}>
        {label}
      </span>
      <div className="dob">
        <span className="dob-ico" aria-hidden="true">
          <Cake size={18} />
        </span>
        <select aria-label="Day" value={parts.d} onChange={set('d')} aria-invalid={!!error}>
          <option value="">Day</option>
          {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => (
            <option key={d} value={d}>
              {Number(d)}
            </option>
          ))}
        </select>
        <select aria-label="Month" value={parts.m} onChange={set('m')} aria-invalid={!!error}>
          <option value="">Month</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={String(i + 1).padStart(2, '0')}>
              {m}
            </option>
          ))}
        </select>
        <select aria-label="Year" value={parts.y} onChange={set('y')} aria-invalid={!!error}>
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      {(error || hint) && <span className={error ? 'af-error' : 'af-hint'}>{error || hint}</span>}
    </div>
  )
}
