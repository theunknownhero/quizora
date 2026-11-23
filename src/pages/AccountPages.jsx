// Pages opened from email links: /verify-email?token=… and /reset-password?token=…
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { useApp } from '../state/AppState.jsx'
import { passwordStrength, resetPassword, rules, verifyEmail } from '../state/authStore.js'
import '../components/auth/auth.css'

const STRENGTH = ['Too weak', 'Weak', 'Okay', 'Strong', 'Very strong']

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
  const [params] = useSearchParams()
  const { setUser, user } = useApp()
  const [state, setState] = useState({ status: 'working', message: '' })
  const started = useRef(false) // tokens are single-use: don't send twice (React dev mode runs effects twice)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const token = params.get('token')
    if (!token) return setState({ status: 'error', message: 'This link is missing its code.' })
    verifyEmail(token)
      .then((d) => {
        if (user && d.user && d.user.username === user.username) setUser(d.user)
        setState({ status: 'ok' })
      })
      .catch((e) => setState({ status: 'error', message: e.message }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Shell>
      {state.status === 'working' && (
        <>
          <span className="auth-spinner big" aria-label="Checking your link" />
          <h1 className="auth-title">Confirming your email…</h1>
        </>
      )}
      {state.status === 'ok' && (
        <>
          <div className="account-emoji">✅</div>
          <h1 className="auth-title">Email confirmed</h1>
          <p className="auth-sub">Thanks! Your account is all set.</p>
          <Link to="/" className="btn btn-primary btn-lg auth-submit">
            Go to Quizora <span className="btn-icon">→</span>
          </Link>
        </>
      )}
      {state.status === 'error' && (
        <>
          <div className="account-emoji">⚠️</div>
          <h1 className="auth-title">Link didn’t work</h1>
          <p className="auth-sub">{state.message}</p>
          <Link to="/" className="btn btn-ghost btn-lg auth-submit">
            Back to Quizora
          </Link>
        </>
      )}
    </Shell>
  )
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { setUser, openAuth } = useApp()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const token = params.get('token')
  const strength = passwordStrength(password)

  const submit = async (e) => {
    e.preventDefault()
    const err = rules.password(password)
    if (err) return setError(err)
    setBusy(true)
    setError('')
    try {
      setUser(await resetPassword(token, password))
      setDone(true)
      setTimeout(() => navigate('/'), 1800)
    } catch (e2) {
      setError(e2.message)
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <Shell>
        <div className="account-emoji">⚠️</div>
        <h1 className="auth-title">Link didn’t work</h1>
        <p className="auth-sub">This reset link is missing its code. Request a new one.</p>
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
          <p className="auth-sub">For security, you’ll be signed out on your other devices.</p>
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
