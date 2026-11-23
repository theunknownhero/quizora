import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Flag from './Flag.jsx'
import { ALL, countries, countryByCode } from '../data/countries.js'
import { useApp } from '../state/AppState.jsx'

// Rounded glass dropdown for picking the site country (used in the navbar).
export default function CountrySelector({ compact = false }) {
  const { country, setCountry } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = countryByCode(country)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (code) => {
    setCountry(code)
    setOpen(false)
  }
  const options = [{ code: ALL, name: 'All countries', native: 'Global' }, ...countries]

  return (
    <div className="csel" ref={ref}>
      <button
        type="button"
        className={`csel-btn ${compact ? 'is-compact' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Country: ${current?.name || 'All countries'}. Change country`}
        onClick={() => setOpen((o) => !o)}
      >
        <Flag code={country} size={20} />
        {!compact && <span className="csel-code">{current ? current.code : 'All'}</span>}
        <svg className="csel-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            className="csel-menu"
            role="listbox"
            aria-label="Choose your country"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            <li className="csel-head">Where are you playing from?</li>
            {options.map((c) => (
              <li key={c.code}>
                <button type="button" role="option" aria-selected={country === c.code} className={`csel-opt ${country === c.code ? 'is-on' : ''}`} onClick={() => pick(c.code)}>
                  <Flag code={c.code} size={22} />
                  <span className="csel-name">
                    {c.name}
                    {c.native !== c.name && <small>{c.native}</small>}
                  </span>
                  {country === c.code && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
            <li className="csel-foot">More countries coming soon</li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
