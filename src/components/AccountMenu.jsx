import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useApp } from '../state/AppState.jsx'
import { useSocial } from '../state/SocialState.jsx'
import { resendVerification } from '../state/authStore.js'
import { useT } from '../i18n/useT.js'
import { useNavigate } from 'react-router-dom'
import { levelProgress, tierFor } from '../lib/levels.js'
import { UserRound, ListChecks, Sparkles, LogOut, MailWarning, Users, Swords, Trophy, Medal } from 'lucide-react'

// Navbar account area: "Log in" when signed out, avatar + dropdown when signed in.
export default function AccountMenu() {
  const { user, openAuth, openOnboarding, logout } = useApp()
  const [open, setOpen] = useState(false)
  const t = useT()
  const [resend, setResend] = useState('') // '' | 'sending' | 'sent' | error text
  const ref = useRef(null)
  const navigate = useNavigate()
  const social = useSocial()
  const requests = social?.incoming.length || 0

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
        {requests > 0 && <span className="acct-req" aria-label={`${requests} friend requests`}>{requests}</span>}
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
                {(() => { const I = tierFor(levelProgress(user.xp).level).icon; return <I size={14} className="ico" /> })()} Level {levelProgress(user.xp).level} · {tierFor(levelProgress(user.xp).level).title}
              </span>
              <i>
                <b style={{ width: `${levelProgress(user.xp).pct}%` }} />
              </i>
            </div>
            {!user.emailVerified && (
              <div className="acct-verify">
                <b>
                  <MailWarning size={15} className="ico" /> Confirm your email
                </b>
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
              <UserRound size={16} /> My profile
            </button>
            <button type="button" role="menuitem" onClick={() => (setOpen(false), navigate('/play-together'))}>
              <Swords size={16} /> Play together
            </button>
            <button type="button" role="menuitem" onClick={() => (setOpen(false), navigate('/tournaments'))}>
              <Medal size={16} /> Tournaments
            </button>
            <button type="button" role="menuitem" onClick={() => (setOpen(false), navigate('/leaderboards'))}>
              <Trophy size={16} /> Leaderboards
            </button>
            <button type="button" role="menuitem" onClick={() => (setOpen(false), navigate('/friends'))}>
              <Users size={16} /> Friends
              {requests > 0 ? <em className="acct-menu-badge">{requests}</em> : social?.onlineFriends.length ? <small className="acct-menu-on">{social.onlineFriends.length} online</small> : null}
            </button>
            <button type="button" role="menuitem" onClick={() => (setOpen(false), navigate('/profile?tab=quizlists'))}>
              <ListChecks size={16} /> My QuizLists
            </button>
            <button type="button" role="menuitem" onClick={() => (setOpen(false), openOnboarding())}>
              <Sparkles size={16} /> {t('nav.editInterests')}
            </button>
            <button type="button" role="menuitem" className="danger" onClick={() => (setOpen(false), logout())}>
              <LogOut size={16} /> {t('nav.logout')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
