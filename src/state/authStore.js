// Client for the Quizora API (server/index.js). Sessions live in an httpOnly cookie set by the
// server, so no tokens or passwords are ever stored in the browser.

async function api(method, path, body) {
  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw Object.assign(new Error('Can’t reach the server. Check your connection and try again.'), { offline: true })
  }
  let data = {}
  try {
    data = await res.json()
  } catch {
    /* empty body */
  }
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong'), { status: res.status, fields: data.fields || {} })
  return data
}

// Same rules as the server, for instant feedback in the form
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

export const me = () => api('GET', '/auth/me').then((d) => d.user)
export const register = (data) => api('POST', '/auth/register', data).then((d) => d.user)
export const login = (data) => api('POST', '/auth/login', data).then((d) => d.user)
export const logout = () => api('POST', '/auth/logout', {})
export const saveProfile = (profile) => api('PATCH', '/me/profile', profile).then((d) => d.user)
export const verifyEmail = (token) => api('POST', '/auth/verify-email', { token })
export const resendVerification = () => api('POST', '/auth/resend-verification', {})
export const forgotPassword = (email) => api('POST', '/auth/forgot-password', { email })
export const resetPassword = (token, password) => api('POST', '/auth/reset-password', { token, password }).then((d) => d.user)
