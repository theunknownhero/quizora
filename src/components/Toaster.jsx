import { AnimatePresence, motion } from 'motion/react'
import { useApp } from '../state/AppState.jsx'
import { achievementById, tiersStyle } from '../data/achievements.js'
import { AlertTriangle, Link2, CheckCircle2, Info, UserPlus, Gamepad2, Users } from 'lucide-react'

// Interface toasts pass a short emoji; show the matching Lucide icon instead. Achievement toasts keep their badge emoji.
const ICONS = { '⚠️': AlertTriangle, '🔗': Link2, '✅': CheckCircle2, 'ℹ️': Info, '👋': UserPlus, '🎮': Gamepad2, '🤝': Users }

// Global notifications (achievement unlocks, small confirmations)
export function useAnnounce() {
  const { pushToast } = useApp()
  return (ids = []) =>
    ids.forEach((id, i) => {
      const a = achievementById(id)
      if (a) setTimeout(() => pushToast({ kind: 'achievement', emoji: a.emoji, title: 'Achievement unlocked', text: a.name, tier: a.tier }), i * 600)
    })
}

export default function Toaster() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="toaster" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            type="button"
            layout
            className={`toast toast-${t.kind || 'info'}`}
            style={t.tier ? { '--tier': tiersStyle[t.tier]?.color } : undefined}
            onClick={() => dismissToast(t.id)}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            {t.emoji && (
              <span className="toast-emoji">{t.kind !== 'achievement' && ICONS[t.emoji] ? (() => { const I = ICONS[t.emoji]; return <I size={20} /> })() : t.emoji}</span>
            )}
            <span className="toast-body">
              <small>{t.title}</small>
              <b>{t.text}</b>
              {t.action && (
                <span
                  role="link"
                  className="toast-action"
                  onClick={(e) => {
                    e.stopPropagation()
                    t.action.onClick()
                    dismissToast(t.id)
                  }}
                >
                  {t.action.label}
                </span>
              )}
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}
