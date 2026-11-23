// Site-wide pieces driven by admin settings: announcement bar, ban notice, XP event chip,
// maintenance screen and feature switches.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Megaphone, X, ShieldAlert, Zap, Wrench, Power, ArrowRight, Info, AlertTriangle, PartyPopper } from 'lucide-react'
import { useApp } from '../state/AppState.jsx'
import { xpEventActive } from '../lib/siteConfig.js'
import Navbar from './Navbar.jsx'
import './site-chrome.css'

const TONES = { info: Info, success: PartyPopper, warning: AlertTriangle, promo: Megaphone }

function readDismissed() {
  try {
    return localStorage.getItem('qz.annDismissed') || ''
  } catch {
    return ''
  }
}

export function AnnouncementBar() {
  const { site, user } = useApp()
  const a = site.announcement || {}
  const [dismissed, setDismissed] = useState(readDismissed)
  const key = `${a.text}|${a.link}`
  const banned = user?.bannedUntil && new Date(user.bannedUntil) > new Date()
  const showAnn = a.enabled && a.text && dismissed !== key
  const Icon = TONES[a.tone] || Info

  const dismiss = () => {
    setDismissed(key)
    try {
      localStorage.setItem('qz.annDismissed', key)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="sc-bars" aria-live="polite">
      <AnimatePresence>
        {banned && (
          <motion.div key="ban" className="sc-bar is-ban" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
            <ShieldAlert size={18} />
            <span>
              Your account is suspended
              {new Date(user.bannedUntil).getFullYear() < 9000 ? ` until ${new Date(user.bannedUntil).toLocaleString()}` : ''}.
              {user.banReason ? ` Reason: ${user.banReason}` : ''}
            </span>
          </motion.div>
        )}
        {showAnn && (
          <motion.div key="ann" className={`sc-bar is-${a.tone || 'info'}`} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
            <Icon size={18} />
            <span>{a.text}</span>
            {a.link &&
              (a.link.startsWith('/') ? (
                <Link to={a.link} className="sc-link">
                  {a.link_label || 'Learn more'} <ArrowRight size={14} />
                </Link>
              ) : (
                <a href={a.link} target="_blank" rel="noopener noreferrer" className="sc-link">
                  {a.link_label || 'Learn more'} <ArrowRight size={14} />
                </a>
              ))}
            <button type="button" className="sc-x" onClick={dismiss} aria-label="Dismiss announcement">
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function XpEventChip() {
  useApp() // re-render when settings reload
  const e = xpEventActive()
  if (!e) return null
  return (
    <span className="sc-xp" title={e.ends_at ? `Until ${new Date(e.ends_at).toLocaleString()}` : 'Live now'}>
      <Zap size={13} fill="currentColor" /> {e.label || `${e.multiplier}× XP`}
    </span>
  )
}

export function MaintenanceScreen() {
  const { site, openAuth, user } = useApp()
  return (
    <main className="placeholder sc-maint">
      <div className="placeholder-card">
        <span className="placeholder-emoji">
          <Wrench size={60} />
        </span>
        <h1>Back soon</h1>
        <p>{site.maintenance?.message || 'We are making Quizora even better. Please check back shortly.'}</p>
        {!user && (
          <button type="button" className="link-btn" onClick={() => openAuth('login')}>
            Staff login
          </button>
        )}
      </div>
    </main>
  )
}

// Wraps a page that can be switched off in the admin panel. Staff always see it.
export function FeatureGate({ name, label, children }) {
  const { site, staff } = useApp()
  if (site.features?.[name] === false && !staff) {
    return (
      <>
        <Navbar />
        <main className="placeholder">
          <div className="placeholder-card">
            <span className="placeholder-emoji">
              <Power size={60} />
            </span>
            <h1>{label} is paused</h1>
            <p>This part of Quizora is switched off for now. Check back soon!</p>
            <Link to="/" className="btn btn-primary btn-lg">
              Back home
            </Link>
          </div>
        </main>
      </>
    )
  }
  return children
}
