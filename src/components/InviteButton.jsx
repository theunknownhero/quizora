// "Invite to a quiz" button with a small game picker. Sends a live invite to a friend.
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Send, Check } from 'lucide-react'
import { games } from '../data/games.js'
import { isAdultOnly } from '../lib/age.js'
import { useApp } from '../state/AppState.jsx'
import * as social from '../state/social.js'

export default function InviteButton({ friend, compact = false }) {
  const { pushToast } = useApp()
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(null)
  const ref = useRef(null)
  // Only live, non-adult quizzes: we can't see a friend's age, the server checks 18+ invites anyway
  const list = games.filter((g) => g.status === 'live' && !isAdultOnly(g))

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

  const invite = async (g) => {
    setOpen(false)
    try {
      await social.sendGameInvite(friend.id, g.slug)
      setSent(g.slug)
      pushToast({ emoji: '✅', title: 'Invite sent', text: `${friend.username} will get your invite to ${g.title}` })
    } catch (e) {
      pushToast({ emoji: '⚠️', title: 'Invite', text: e.message })
    }
  }

  return (
    <div className="inv" ref={ref}>
      <button type="button" className={`soc-btn ${compact ? 'is-icon' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Invite ${friend.username} to a quiz`}>
        {sent ? <Check size={15} /> : <Send size={15} />}
        {!compact && (sent ? 'Invited' : 'Invite')}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="inv-menu" role="menu" initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.96 }} transition={{ duration: 0.15 }}>
            <b>Invite to…</b>
            {list.map((g) => (
              <button key={g.slug} type="button" role="menuitem" onClick={() => invite(g)}>
                <span className="inv-thumb" style={{ background: `linear-gradient(135deg, ${g.gradient[0]}, ${g.gradient[1]})` }}>
                  {g.emoji}
                </span>
                {g.title}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
