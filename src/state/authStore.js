// Accounts via Supabase Auth + a `profiles` table (see supabase/schema.sql).
// Supabase handles passwords, sessions, email confirmation and password reset.
import { supabase, supabaseConfigured } from '../lib/supabase.js'

export { supabaseConfigured }

const origin = () => window.location.origin
const fail = (message, fields = {}, code) => Object.assign(new Error(message), { fields, code })
const need = () => {
  if (!supabaseConfigured) throw fail('Accounts aren’t set up yet. Please try again later.')
}

// Same rules as the database check (supabase/schema.sql) for instant feedback in the form
export const rules = {
  username: (v) =>
    !v ? 'Pick a username' : !/^[a-zA-Z0-9_.]{3,20}$/.test(v) ? '3–20 characters: letters, numbers, _ or .' : null,
  email: (v) => (!v ? 'Enter your email' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'That email doesn’t look right' : null),
  password: (v) =>
    !v ? 'Create a password' : v.length < 8 ? 'At least 8 characters' : !/[a-zA-Z]/.test(v) || !/\d/.test(v) ? 'Use letters and numbers' : null,
}

export function passwordStrength(v = '') {
  let s = 0
  if (v.length >= 8) s++
  if (v.length >= 12) s++
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++
  if (/\d/.test(v)) s++
  if (/[^a-zA-Z0-9]/.test(v)) s++
  return Math.min(4, s) // 0..4
}

// Combine the Supabase auth user with their profile row into the shape the app uses
export async function loadUser(authUser) {
  if (!authUser) return null
  const { data: p, error } = await supabase.from('profiles').select('username, interests, topics, countries, onboarded').eq('id', authUser.id).maybeSingle()
  if (error) console.error('[profiles]', error.message)
  return {
    id: authUser.id,
    email: authUser.email,
    emailVerified: !!authUser.email_confirmed_at,
    username: p?.username || authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'player',
    profile: {
      interests: p?.interests || [],
      topics: p?.topics || [],
      countries: p?.countries || [],
      onboarded: !!p?.onboarded,
    },
  }
}

export async function currentUser() {
  if (!supabaseConfigured) return null
  const { data } = await supabase.auth.getSession()
  return data.session ? loadUser(data.session.user) : null
}

export async function register({ username, email, password }) {
  need()
  const { data: free, error: rpcErr } = await supabase.rpc('username_available', { candidate: username })
  if (rpcErr) throw fail('Couldn’t check that username. Try again.')
  if (!free) throw fail('That username is taken', { username: 'That username is taken' })

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username }, emailRedirectTo: `${origin()}/verify-email` },
  })
  if (error) {
    if (/already registered/i.test(error.message)) throw fail('An account with this email already exists', { email: 'Already registered — try logging in' })
    if (/database error/i.test(error.message)) throw fail('That username is taken', { username: 'That username is taken' })
    if (/password/i.test(error.message)) throw fail(error.message, { password: error.message })
    if (/rate limit/i.test(error.message)) throw fail('Too many attempts. Please wait a few minutes and try again.')
    throw fail(error.message)
  }
  // With email confirmation on (recommended), there's no session until the link is clicked.
  return { needsConfirmation: !data.session, user: data.session ? await loadUser(data.user) : null }
}

export async function login({ identifier, password }) {
  need()
  const { data, error } = await supabase.auth.signInWithPassword({ email: identifier.trim(), password })
  if (error) {
    if (/not confirmed/i.test(error.message)) throw fail('Please confirm your email first. Check your inbox for the link.', {}, 'email_not_confirmed')
    if (/rate limit/i.test(error.message)) throw fail('Too many attempts. Please wait a few minutes and try again.')
    throw fail('Wrong email or password', { password: ' ' })
  }
  return loadUser(data.user)
}

export async function logout() {
  if (supabaseConfigured) await supabase.auth.signOut()
}

export async function saveProfile(userId, profile) {
  need()
  const patch = {}
  for (const k of ['interests', 'topics', 'countries', 'onboarded']) if (profile[k] !== undefined) patch[k] = profile[k]
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  if (error) throw fail('Couldn’t save your preferences. Try again.')
  const { data } = await supabase.auth.getUser()
  return loadUser(data.user)
}

export async function resendVerification(email) {
  need()
  const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${origin()}/verify-email` } })
  if (error) throw fail(/rate limit|seconds/i.test(error.message) ? 'Please wait a minute before asking for another link.' : error.message)
}

export async function forgotPassword(email) {
  need()
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin()}/reset-password` })
  // Same answer whether or not the email has an account; only surface rate limits.
  if (error && /rate limit|seconds/i.test(error.message)) throw fail('Please wait a minute before asking for another link.')
}

export async function resetPassword(password) {
  need()
  const { data, error } = await supabase.auth.updateUser({ password })
  if (error) throw fail(/session|expired|jwt/i.test(error.message) ? 'This reset link is invalid or has expired. Request a new one.' : error.message, { password: error.message })
  return loadUser(data.user)
}
