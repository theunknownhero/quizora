// Asks signed-in players without a saved date of birth to add it once (needed to gate 18+ quizzes).
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ShieldCheck, X } from 'lucide-react'
import { useApp } from '../../state/AppState.jsx'
import { setBirthDate } from '../../state/authStore.js'
import { validBirthDate } from '../../lib/age.js'
import BirthDateInput from '../BirthDateInput.jsx'
import './auth.css'

const SKIP_KEY = 'qz.ageSkip'

export default function AgeCheck() {
  const { user, authView, onboarding, ageCheck, closeAgeCheck, reloadUser, pushToast } = useApp()
  const [skipped, setSkipped] = useState(() => {
    try {
      return sessionStorage.getItem(SKIP_KEY) === '1'
    } catch {
      return false
    }
  })
  const [value, setValue] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const open = !!user && !user.birthDate && !authView && !onboarding && (ageCheck || !skipped)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && later()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  function later() {
    try {
      sessionStorage.setItem(SKIP_KEY, '1')
    } catch {
      /* ignore */
    }
    setSkipped(true)
    closeAgeCheck()
  }

  const submit = async (e) => {
    e.preventDefault()
    const err = validBirthDate(value)
    setError(err)
    if (err) return
    setBusy(true)
    try {
      await setBirthDate(value)
      await reloadUser()
      closeAgeCheck()
      pushToast({ emoji: '✅', title: 'Saved', text: 'Thanks! Your date of birth is saved.' })
    } catch (ex) {
      setError(ex.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="auth-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={later}>
          <motion.div
            className="auth-card age-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="age-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
          >
            <button type="button" className="auth-close" onClick={later} aria-label="Ask me later">
              <X size={18} />
            </button>
            <span className="age-ico">
              <ShieldCheck size={30} />
            </span>
            <h2 id="age-title">One quick thing</h2>
            <p className="muted">Some quizzes are 18+. Add your date of birth so we only show you quizzes that suit your age. It stays private, and you can only set it once.</p>
            <form onSubmit={submit} className="auth-form" noValidate>
              <BirthDateInput id="age-dob" value={value} onChange={setValue} error={error} />
              <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="auth-forgot age-later" onClick={later}>
                Ask me later
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
