import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useApp } from '../../state/AppState.jsx'
import { forgotPassword, passwordStrength, rules } from '../../state/authStore.js'
import './auth.css'

const Icon = ({ d }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)
const ICONS = {
  user: 'M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  mail: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm0 1 8 7 8-7',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 1 1 8 0v3',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
}
const STRENGTH = ['Too weak', 'Weak', 'Okay', 'Strong', 'Very strong']

function Field({ id, label, icon, error, type = 'text', value, onChange, autoComplete, autoFocus, children, hint }) {
  return (
    <label className={`af-field ${error ? 'has-error' : ''}`} htmlFor={id}>
      <span className="af-label">{label}</span>
      <span className="af-input">
        <Icon d={ICONS[icon]} />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
          spellCheck="false"
          autoCapitalize="off"
        />
        {children}
      </span>
      {(error || hint) && (
        <span id={`${id}-msg`} className={error ? 'af-error' : 'af-hint'}>
          {error && error.trim() ? error : hint}
        </span>
      )}
    </label>
  )
}

export default function AuthModal() {
  const { authView, openAuth, closeAuth, login, register } = useApp()
  const view = authView
  const [form, setForm] = useState({ identifier: '', username: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')

  useEffect(() => {
    setErrors({})
    setFormError('')
    setShowPw(false)
    setSentTo('')
  }, [view])

  useEffect(() => {
    if (!view) return
    const onKey = (e) => e.key === 'Escape' && closeAuth()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [view, closeAuth])

  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (view === 'forgot') {
      const err = rules.email(form.email.trim())
      setErrors({ email: err })
      if (err) return
      setBusy(true)
      try {
        await forgotPassword(form.email.trim())
        setSentTo(form.email.trim())
      } catch (e2) {
        setFormError(e2.message)
      } finally {
        setBusy(false)
      }
      return
    }
    if (view === 'register') {
      const errs = { username: rules.username(form.username), email: rules.email(form.email), password: rules.password(form.password) }
      setErrors(errs)
      if (Object.values(errs).some(Boolean)) return
    } else {
      const errs = { identifier: form.identifier ? null : 'Enter your username or email', password: form.password ? null : 'Enter your password' }
      setErrors(errs)
      if (Object.values(errs).some(Boolean)) return
    }
    setBusy(true)
    try {
      if (view === 'register') await register({ username: form.username.trim(), email: form.email.trim(), password: form.password })
      else await login({ identifier: form.identifier, password: form.password })
      setForm({ identifier: '', username: '', email: '', password: '' })
    } catch (err) {
      setErrors(err.fields || {})
      setFormError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const strength = passwordStrength(form.password)
  const isReg = view === 'register'
  const isForgot = view === 'forgot'

  return (
    <AnimatePresence>
      {view && (
        <motion.div
          className="auth-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && closeAuth()}
        >
          <motion.div
            className="auth-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            initial={{ y: 40, scale: 0.95, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            <span className="auth-glow" aria-hidden="true" />
            <button type="button" className="auth-close" onClick={closeAuth} aria-label="Close">
              ✕
            </button>
            <div className="auth-brand" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <h2 id="auth-title" className="auth-title">
              {isForgot ? 'Reset your password' : isReg ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="auth-sub">
              {isForgot ? 'Enter your email and we’ll send you a link to choose a new password.' : isReg ? 'Save your scores and get quizzes picked for you.' : 'Log in to keep your streaks and picks.'}
            </p>

            {isForgot ? (
              sentTo ? (
                <div className="auth-sent" role="status">
                  <span className="auth-sent-icon">📬</span>
                  <p>
                    If an account exists for <b>{sentTo}</b>, a reset link is on its way. It’s valid for 1 hour. Check your spam folder too.
                  </p>
                  <button type="button" className="btn btn-ghost btn-lg auth-submit" onClick={() => openAuth('login')}>
                    Back to log in
                  </button>
                </div>
              ) : (
                <form className="auth-form" onSubmit={submit} noValidate>
                  <Field id="fp-mail" label="Email" icon="mail" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" autoFocus />
                  {formError && (
                    <p className="auth-form-error" role="alert">
                      {formError}
                    </p>
                  )}
                  <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={busy}>
                    {busy ? <span className="auth-spinner" aria-label="Please wait" /> : 'Send reset link'}
                  </button>
                  <button type="button" className="auth-back" onClick={() => openAuth('login')}>
                    ← Back to log in
                  </button>
                </form>
              )
            ) : (
            <>
            <div className="auth-tabs" role="tablist">
              {[
                ['login', 'Log in'],
                ['register', 'Sign up'],
              ].map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={view === k} className={view === k ? 'is-on' : ''} onClick={() => openAuth(k)}>
                  {view === k && <motion.span layoutId="auth-tab" className="auth-tab-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className="auth-tab-label">{l}</span>
                </button>
              ))}
            </div>

            <form className="auth-form" onSubmit={submit} noValidate>
              {isReg ? (
                <>
                  <Field id="reg-user" label="Username" icon="user" value={form.username} onChange={set('username')} error={errors.username} autoComplete="username" autoFocus hint="3–20 characters: letters, numbers, _ or ." />
                  <Field id="reg-mail" label="Email" icon="mail" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
                </>
              ) : (
                <Field id="log-id" label="Username or email" icon="user" value={form.identifier} onChange={set('identifier')} error={errors.identifier} autoComplete="username" autoFocus />
              )}
              <Field
                id={isReg ? 'reg-pw' : 'log-pw'}
                label="Password"
                icon="lock"
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                error={errors.password}
                autoComplete={isReg ? 'new-password' : 'current-password'}
              >
                <button type="button" className="af-eye" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                  <Icon d={showPw ? ICONS.eyeOff : ICONS.eye} />
                </button>
              </Field>
              {!isReg && (
                <button type="button" className="auth-forgot" onClick={() => openAuth('forgot')}>
                  Forgot password?
                </button>
              )}
              {isReg && form.password && (
                <div className="af-strength" data-level={strength} aria-live="polite">
                  <span className="af-bars">
                    {[0, 1, 2, 3].map((i) => (
                      <i key={i} className={i < strength ? 'on' : ''} />
                    ))}
                  </span>
                  {STRENGTH[strength]}
                </div>
              )}

              <AnimatePresence>
                {formError && (
                  <motion.p className="auth-form-error" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {formError}
                  </motion.p>
                )}
              </AnimatePresence>

              <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={busy}>
                {busy ? <span className="auth-spinner" aria-label="Please wait" /> : isReg ? 'Create account' : 'Log in'}
                {!busy && <span className="btn-icon">→</span>}
              </button>
            </form>

            <p className="auth-switch">
              {isReg ? 'Already have an account?' : 'New to Quizora?'}{' '}
              <button type="button" onClick={() => openAuth(isReg ? 'login' : 'register')}>
                {isReg ? 'Log in' : 'Create an account'}
              </button>
            </p>
            <button type="button" className="auth-guest" onClick={closeAuth}>
              Continue as guest
            </button>
            </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
