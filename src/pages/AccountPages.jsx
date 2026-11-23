// Pages opened from Supabase email links: /verify-email and /reset-password.
// Supabase puts a session in the link; supabase-js reads it automatically (detectSessionInUrl).
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { useApp } from '../state/AppState.jsx'
import { passwordStrength, resetPassword, rules } from '../state/authStore.js'
import '../components/auth/auth.css'

const STRENGTH = ['Too weak', 'Weak', 'Okay', 'Strong', 'Very strong']

// Error Supabase adds to the link (e.g. expired), from ?query or #hash
function linkError() {
  const read = (s) => new URLSearchParams(s.replace(/^[#?]/, ''))
  const h = read(window.location.hash)
  const q = read(window.location.search)
  const msg = h.get('error_description') || q.get('error_description')
  if (!msg) return ''
  const text = msg.replace(/\+/g, ' ').trim()
  return /[.!?]$/.test(text) ? text : `${text}.`
}

// Wait until we know whether the link produced a session
function useLinkSession(timeoutMs = 5000) {
  const { user, authReady } = useApp()
  const [timedOut, setTimedOut] = useState(false)
  const [error] = useState(linkError)
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), timeoutMs)
    return () => clearTimeout(t)
  }, [timeoutMs])
  if (error) return { status: 'error', error }
  if (user) return { status: 'ok', user }
  if (authReady && timedOut) return { status: 'error', error: 'This link is invalid or has expired.' }
  return { status: 'working' }
}

function Shell({ children }) {
  return (
    <>
      <Navbar />
      <main className="placeholder">
        <motion.div className="auth-card account-page" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <span className="auth-glow" aria-hidden="true" />
          {children}
        </motion.div>
      </main>
    </>
  )
}

export function VerifyEmailPage() {
  const { openOnboarding, openAuth } = useApp()
  const navigate = useNavigate()
  const { status, error, user } = useLinkSession()

  return (
    <Shell>
      {status === 'working' && (
        <>
          <span className="auth-spinner big" aria-label="Checking your link" />
          <h1 className="auth-title">Confirming your email…</h1>
        </>
      )}
      {status === 'ok' && (
        <>
          <div className="account-emoji">✅</div>
          <h1 className="auth-title">Email confirmed</h1>
          <p className="auth-sub">Welcome to Quizora, {user.username}!</p>
          {user.profile.onboarded ? (
            <Link to="/" className="btn btn-primary btn-lg auth-submit">
              Go to Quizora <span className="btn-icon">→</span>
            </Link>
          ) : (
            <button type="button" className="btn btn-primary btn-lg auth-submit" onClick={() => (navigate('/'), openOnboarding())}>
              Pick your interests <span className="btn-icon">→</span>
            </button>
          )}
        </>
      )}
      {status === 'error' && (
        <>
          <div className="account-emoji">⚠️</div>
          <h1 className="auth-title">Link didn’t work</h1>
          <p className="auth-sub">{error} Try logging in. If your email isn’t confirmed yet, you can ask for a new link there.</p>
          <button type="button" className="btn btn-primary btn-lg auth-submit" onClick={() => (navigate('/'), openAuth('login'))}>
            Log in
          </button>
        </>
      )}
    </Shell>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { setUser, openAuth } = useApp()
  const { status, error: linkErr } = useLinkSession()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const strength = passwordStrength(password)

  const submit = async (e) => {
    e.preventDefault()
    const err = rules.password(password)
    if (err) return setError(err)
    setBusy(true)
    setError('')
    try {
      setUser(await resetPassword(password))
      setDone(true)
      setTimeout(() => navigate('/'), 1800)
    } catch (e2) {
      setError(e2.message)
    } finally {
      setBusy(false)
    }
  }

  if (status === 'working') {
    return (
      <Shell>
        <span className="auth-spinner big" aria-label="Checking your link" />
        <h1 className="auth-title">Checking your link…</h1>
      </Shell>
    )
  }

  if (status === 'error' && !done) {
    return (
      <Shell>
        <div className="account-emoji">⚠️</div>
        <h1 className="auth-title">Link didn’t work</h1>
        <p className="auth-sub">{linkErr} Reset links work once and expire after 1 hour.</p>
        <button type="button" className="btn btn-primary btn-lg auth-submit" onClick={() => (navigate('/'), openAuth('forgot'))}>
          Request a new link
        </button>
      </Shell>
    )
  }

  return (
    <Shell>
      {done ? (
        <>
          <div className="account-emoji">🔐</div>
          <h1 className="auth-title">Password updated</h1>
          <p className="auth-sub">You’re logged in. Taking you home…</p>
        </>
      ) : (
        <>
          <h1 className="auth-title">Choose a new password</h1>
          <p className="auth-sub">Use at least 8 characters with letters and numbers.</p>
          <form className="auth-form" onSubmit={submit} noValidate>
            <label className={`af-field ${error ? 'has-error' : ''}`} htmlFor="rp-pw">
              <span className="af-label">New password</span>
              <span className="af-input">
                <input
                  id="rp-pw"
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => (setPassword(e.target.value), setError(''))}
                  autoComplete="new-password"
                  autoFocus
                  aria-invalid={!!error}
                />
                <button type="button" className="af-eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? '🙈' : '👁'}
                </button>
              </span>
              {error && <span className="af-error">{error}</span>}
            </label>
            {password && (
              <div className="af-strength" data-level={strength}>
                <span className="af-bars">
                  {[0, 1, 2, 3].map((i) => (
                    <i key={i} className={i < strength ? 'on' : ''} />
                  ))}
                </span>
                {STRENGTH[strength]}
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={busy}>
              {busy ? <span className="auth-spinner" aria-label="Please wait" /> : 'Save new password'}
            </button>
          </form>
        </>
      )}
    </Shell>
  )
}
