// Small UI kit for the admin panel.
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X, Loader2, Search, TrendingUp, TrendingDown } from 'lucide-react'

export function PageHead({ title, sub, icon: Icon, children }) {
  return (
    <header className="ad-head">
      <div>
        <h1>
          {Icon && <Icon size={22} />} {title}
        </h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="ad-head-actions">{children}</div>}
    </header>
  )
}

export function Card({ title, icon: Icon, actions, children, className = '', pad = true }) {
  return (
    <section className={`ad-card ${pad ? '' : 'no-pad'} ${className}`}>
      {(title || actions) && (
        <div className="ad-card-head">
          {title && (
            <h3>
              {Icon && <Icon size={16} />} {title}
            </h3>
          )}
          {actions && <div className="ad-card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, sub, icon: Icon, tone = 'violet', delta }) {
  return (
    <div className={`ad-stat tone-${tone}`}>
      <span className="ad-stat-ico">{Icon && <Icon size={18} />}</span>
      <div>
        <small>{label}</small>
        <b>{value}</b>
        {(sub || delta != null) && (
          <em>
            {delta != null && delta !== 0 && (
              <span className={delta > 0 ? 'up' : 'down'}>
                {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {Math.abs(delta)}
              </span>
            )}{' '}
            {sub}
          </em>
        )}
      </div>
    </div>
  )
}

export function Btn({ children, kind = 'ghost', size, busy, icon: Icon, ...rest }) {
  return (
    <button type="button" className={`ad-btn is-${kind} ${size ? `is-${size}` : ''}`} disabled={busy || rest.disabled} {...rest}>
      {busy ? <Loader2 size={15} className="spin" /> : Icon ? <Icon size={15} /> : null}
      {children}
    </button>
  )
}

export function Pill({ children, tone = 'muted' }) {
  return <span className={`ad-pill tone-${tone}`}>{children}</span>
}

export function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <label className={`ad-toggle ${disabled ? 'is-disabled' : ''}`}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span className="ad-toggle-track" aria-hidden="true">
        <i />
      </span>
      <span className="ad-toggle-text">
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </span>
    </label>
  )
}

export function Field({ label, hint, children, span }) {
  return (
    <label className={`ad-field ${span ? `span-${span}` : ''}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}

export function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  const [v, setV] = useState(value || '')
  useEffect(() => {
    const t = setTimeout(() => v !== value && onChange(v), 280)
    return () => clearTimeout(t)
  }, [v]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <label className="ad-search">
      <Search size={16} />
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  )
}

export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="ad-modal-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            className={`ad-modal ${wide ? 'is-wide' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
          >
            <header>
              <h2>{title}</h2>
              <button type="button" className="ad-icon-btn" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </header>
            <div className="ad-modal-body">{children}</div>
            {footer && <footer>{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Empty({ icon: Icon, title, text, children }) {
  return (
    <div className="ad-empty">
      {Icon && <Icon size={34} />}
      <b>{title}</b>
      {text && <p>{text}</p>}
      {children}
    </div>
  )
}

export function Loading() {
  return (
    <div className="ad-loading">
      <Loader2 size={28} className="spin" />
    </div>
  )
}

// Simple, accessible bar chart (no chart library)
export function Bars({ data, keyName, label, color = 'var(--ad-accent)', height = 140 }) {
  const max = Math.max(1, ...data.map((d) => d[keyName] || 0))
  return (
    <div className="ad-bars" style={{ height }} role="img" aria-label={`${label}: ${data.map((d) => d[keyName]).join(', ')}`}>
      {data.map((d, i) => (
        <div key={i} className="ad-bar-col" title={`${new Date(d.day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}: ${d[keyName]}`}>
          <span style={{ height: `${((d[keyName] || 0) / max) * 100}%`, background: color }} />
        </div>
      ))}
    </div>
  )
}

// Editable list of prize tiers: [{from, to, label, xp, external}]
export function PrizeEditor({ value = [], onChange }) {
  const set = (i, k, v) => onChange(value.map((p, j) => (j === i ? { ...p, [k]: v } : p)))
  const add = () => {
    const last = value[value.length - 1]
    const from = last ? Number(last.to) + 1 : 1
    onChange([...value, { from, to: from, label: '', xp: 0 }])
  }
  return (
    <div className="ad-prizes">
      {value.length > 0 && (
        <div className="ad-prize-row is-head">
          <span>From</span>
          <span>To</span>
          <span>Prize label (shown to players)</span>
          <span>XP</span>
          <span>External</span>
          <span />
        </div>
      )}
      {value.map((p, i) => (
        <div key={i} className="ad-prize-row">
          <input type="number" min={1} value={p.from} onChange={(e) => set(i, 'from', Number(e.target.value))} aria-label="From rank" />
          <input type="number" min={p.from} value={p.to} onChange={(e) => set(i, 'to', Number(e.target.value))} aria-label="To rank" />
          <input value={p.label} onChange={(e) => set(i, 'label', e.target.value)} placeholder="e.g. €50 gift card + 1000 XP" aria-label="Prize label" />
          <input type="number" min={0} value={p.xp || 0} onChange={(e) => set(i, 'xp', Number(e.target.value))} aria-label="XP reward" />
          <input type="checkbox" checked={!!p.external} onChange={(e) => set(i, 'external', e.target.checked)} aria-label="External prize (needs to be sent)" title="Real-world prize you send to the winner" />
          <button type="button" className="ad-icon-btn" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove tier">
            <X size={15} />
          </button>
        </div>
      ))}
      <Btn size="sm" onClick={add}>
        + Add prize tier
      </Btn>
    </div>
  )
}

export function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const run = () => {
    setState((s) => ({ ...s, loading: true }))
    return fn()
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => setState({ data: null, error, loading: false }))
  }
  useEffect(() => {
    run()
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: run }
}
