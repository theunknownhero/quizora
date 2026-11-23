import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useApp } from '../state/AppState.jsx'
import { resendVerification } from '../state/authStore.js'
import { useT } from '../i18n/useT.js'
import { useNavigate } from 'react-router-dom'
import { levelProgress, tierFor } from '../lib/levels.js'

// Navbar account area: "Log in" when signed out, avatar + dropdown when signed in.
export default function AccountMenu() {
  const { user, openAuth, openOnboarding, logout } = useApp()
  const [open, setOpen] = useState(false)
  const t = useT()
  const [resend, setResend] = useState('') // '' | 'sending' | 'sent' | error text
  const ref = useRef(null)
  const navigate = useNavigate()

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

  if (!user) {
    return (
      <button type="button" className="acct-login" onClick={() => openAuth('login')}>
        {t('nav.login')}
      </button>
    )
  }

  return (
    <div className="acct" ref={ref}>
      <button type="button" className="acct-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`Account: ${user.username}`} onClick={() => setOpen((o) => !o)}>
        <span className="acct-avatar">{user.username[0].toUpperCase()}</span>
        <span className="acct-lvl" title={`Level ${levelProgress(user.xp).level}`}>{levelProgress(user.xp).level}</span>
        {!user.emailVerified && <span className="acct-dot" aria-label="Email not confirmed" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="acct-menu"
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            <div className="acct-who">
              <span className="acct-avatar lg">{user.username[0].toUpperCase()}</span>
              <div>
                <b>{user.username}</b>
                <small>{user.email}</small>
              </div>
            </div>
            <div className="acct-level">
              <span>
                {tierFor(levelProgress(user.xp).level).emoji} Level {levelProgress(user.xp).level} · {tierFor(levelProgress(user.xp).level).title}
              </span>
              <i>
                <b style={{ width: `${levelProgress(user.xp).pct}%` }} />
              </i>
            </div>
            {!user.emailVerified && (
              <div className="acct-verify">
                <b>📧 Confirm your email</b>
                <span>{resend === 'sent' ? 'New link sent. Check your inbox.' : resend && resend !== 'sending' ? resend : `We sent a link to ${user.email}.`}</span>
                {resend !== 'sent' && (
                  <button
                    type="button"
                    disabled={resend === 'sending'}
                    onClick={async () => {
                      setResend('sending')
                      try {
                        await resendVerification(user.email)
                        setResend('sent')
                      } catch (e) {
                        setResend(e.message)
                      }
                    }}
                  >
                    {resend === 'sending' ? 'Sending…' : 'Resend link'}
                  </button>
                )}
              </div>
            )}
            <button type="button" role="menuitem" onClick={() => (setOpen(false), navigate('/profile'))}>
              👤 My profile
            </button>
            <button type="button" role="menuitem" onClick={() => (setOpen(false), navigate('/profile?tab=playlists'))}>
              🎵 My playlists
            </button>
            <button type="button" role="menuitem" onClick={() => (setOpen(false), openOnboarding())}>
              ✨ {t('nav.editInterests')}
            </button>
            <button type="button" role="menuitem" className="danger" onClick={() => (setOpen(false), logout())}>
              ↩ {t('nav.logout')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
