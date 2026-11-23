// Quizora API — zero-dependency Node server (node:http + node:sqlite + node:crypto).
// Dev:  npm run api        (Vite proxies /api to this server)
// Prod: npm run build && npm start   (serves the built site from /dist and the API on one port)
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { config, ROOT } from './config.js'
import { q } from './db.js'
import { DUMMY_HASH, hashPassword, newToken, rateLimit, rules, sha256, verifyPassword } from './security.js'
import { devOutbox, sendResetEmail, sendVerifyEmail } from './mailer.js'
import { interests, topics } from '../src/data/preferences.js'
import { countries } from '../src/data/countries.js'

const COOKIE = 'qz_sid'
const DAY = 24 * 60 * 60 * 1000
const VERIFY_TTL = 2 * DAY
const RESET_TTL = 60 * 60 * 1000

// ---------- helpers ----------
class HttpError extends Error {
  constructor(status, message, fields) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

const allowedOrigins = new Set([config.appUrl, ...config.extraOrigins, ...(config.isProd ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173', `http://localhost:${config.port}`])])

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  })
  res.end(JSON.stringify(body))
}

async function readJson(req) {
  if (!String(req.headers['content-type'] || '').includes('application/json')) throw new HttpError(415, 'Send JSON')
  let size = 0
  const chunks = []
  for await (const c of req) {
    size += c.length
    if (size > 16 * 1024) throw new HttpError(413, 'Request too large')
    chunks.push(c)
  }
  try {
    return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
  } catch {
    throw new HttpError(400, 'Invalid JSON')
  }
}

const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]))

const sessionCookie = (token, maxAgeSec) =>
  [`${COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`, config.isProd ? 'Secure' : null].filter(Boolean).join('; ')

const clientIp = (req) => (config.isProd ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '') || req.socket.remoteAddress || 'unknown'

function limit(req, name, max, windowMs, extraKey = '') {
  const r = rateLimit(`${name}:${clientIp(req)}:${extraKey}`, max, windowMs)
  if (!r.ok) throw new HttpError(429, `Too many attempts. Try again in ${Math.ceil(r.retryAfter / 60)} min.`)
}

function publicUser(u) {
  let profile = {}
  try {
    profile = JSON.parse(u.profile || '{}')
  } catch {
    /* keep empty */
  }
  return { username: u.username, email: u.email, emailVerified: !!u.email_verified_at, createdAt: u.created_at, profile }
}

function createSession(res, req, userId) {
  const token = newToken()
  const now = Date.now()
  q.insertSession.run(sha256(token), userId, now, now + config.sessionDays * DAY, String(req.headers['user-agent'] || '').slice(0, 200))
  res.setHeader('Set-Cookie', sessionCookie(token, config.sessionDays * 86400))
}

function currentUser(req) {
  const token = cookies(req)[COOKIE]
  if (!token) return null
  const s = q.session.get(sha256(token))
  if (!s || s.expires_at < Date.now()) return null
  return q.userById.get(s.user_id) || null
}

function requireUser(req) {
  const u = currentUser(req)
  if (!u) throw new HttpError(401, 'Please log in')
  return u
}

function issueToken(user, kind) {
  const token = newToken()
  const now = Date.now()
  q.voidTokens.run(now, user.id, kind)
  q.insertToken.run(sha256(token), user.id, kind, now, now + (kind === 'verify' ? VERIFY_TTL : RESET_TTL))
  return token
}

function consumeToken(token, kind) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null
  const t = q.token.get(sha256(token), kind)
  if (!t || t.used_at || t.expires_at < Date.now()) return null
  q.useToken.run(Date.now(), t.token_hash)
  return t
}

const ALLOWED = {
  interests: new Set(interests.map((i) => i.id)),
  topics: new Set(topics.map((t) => t.id)),
  countries: new Set(countries.map((c) => c.code)),
}
function cleanProfile(input, current) {
  const out = { ...current }
  for (const key of ['interests', 'topics', 'countries']) {
    if (input[key] === undefined) continue
    if (!Array.isArray(input[key])) throw new HttpError(400, `${key} must be a list`)
    out[key] = [...new Set(input[key].filter((v) => typeof v === 'string' && ALLOWED[key].has(v)))]
  }
  if (input.onboarded !== undefined) out.onboarded = !!input.onboarded
  return out
}

// ---------- routes ----------
const routes = {
  'GET /api/health': () => ({ ok: true }),

  'GET /api/auth/me': (req) => {
    const u = currentUser(req)
    return { user: u ? publicUser(u) : null }
  },

  'POST /api/auth/register': async (req, res) => {
    limit(req, 'register', 10, 60 * 60 * 1000)
    const body = await readJson(req)
    const username = String(body.username || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const password = body.password
    const fields = { username: rules.username(username), email: rules.email(email), password: rules.password(password) }
    if (Object.values(fields).some(Boolean)) throw new HttpError(400, 'Check the highlighted fields', fields)
    if (q.userByUsername.get(username)) throw new HttpError(409, 'That username is taken', { username: 'That username is taken' })
    if (q.userByEmail.get(email)) throw new HttpError(409, 'An account with this email already exists', { email: 'Already registered — try logging in' })
    const hash = await hashPassword(password)
    const { lastInsertRowid } = q.insertUser.run(username, email, hash, Date.now())
    const user = q.userById.get(Number(lastInsertRowid))
    createSession(res, req, user.id)
    sendVerifyEmail(user, issueToken(user, 'verify')).catch((e) => console.error('[mail]', e))
    return { user: publicUser(user) }
  },

  'POST /api/auth/login': async (req, res) => {
    limit(req, 'login', 30, 15 * 60 * 1000)
    const body = await readJson(req)
    const identifier = String(body.identifier || '').trim()
    limit(req, 'login-id', 8, 15 * 60 * 1000, identifier.toLowerCase())
    const user = identifier ? q.userByLogin.get(identifier, identifier) : null
    const ok = await verifyPassword(String(body.password || ''), user ? user.password_hash : DUMMY_HASH)
    if (!user || !ok) throw new HttpError(401, 'Wrong username/email or password', { password: ' ' })
    createSession(res, req, user.id)
    return { user: publicUser(user) }
  },

  'POST /api/auth/logout': (req, res) => {
    const token = cookies(req)[COOKIE]
    if (token) q.deleteSession.run(sha256(token))
    res.setHeader('Set-Cookie', sessionCookie('', 0))
    return { ok: true }
  },

  'PATCH /api/me/profile': async (req) => {
    const user = requireUser(req)
    const body = await readJson(req)
    const profile = cleanProfile(body, publicUser(user).profile)
    q.setProfile.run(JSON.stringify(profile), user.id)
    return { user: publicUser(q.userById.get(user.id)) }
  },

  'POST /api/auth/verify-email': async (req) => {
    limit(req, 'verify', 30, 15 * 60 * 1000)
    const { token } = await readJson(req)
    const t = consumeToken(token, 'verify')
    if (!t) throw new HttpError(400, 'This link is invalid or has expired. Log in and request a new one.')
    q.setVerified.run(Date.now(), t.user_id)
    return { ok: true, user: publicUser(q.userById.get(t.user_id)) }
  },

  'POST /api/auth/resend-verification': (req) => {
    const user = requireUser(req)
    if (user.email_verified_at) return { ok: true, alreadyVerified: true }
    if (q.recentTokens.get(user.id, 'verify', Date.now() - 60 * 60 * 1000).n >= 3) throw new HttpError(429, 'We’ve sent a few already. Check your inbox (and spam) or try again in an hour.')
    sendVerifyEmail(user, issueToken(user, 'verify')).catch((e) => console.error('[mail]', e))
    return { ok: true }
  },

  'POST /api/auth/forgot-password': async (req) => {
    limit(req, 'forgot', 8, 15 * 60 * 1000)
    const { email } = await readJson(req)
    const user = typeof email === 'string' ? q.userByEmail.get(email.trim().toLowerCase()) : null
    // Always the same answer, so this can't be used to find out who has an account.
    if (user && q.recentTokens.get(user.id, 'reset', Date.now() - 60 * 60 * 1000).n < 3) {
      sendResetEmail(user, issueToken(user, 'reset')).catch((e) => console.error('[mail]', e))
    }
    return { ok: true }
  },

  'POST /api/auth/reset-password': async (req, res) => {
    limit(req, 'reset', 10, 15 * 60 * 1000)
    const { token, password } = await readJson(req)
    const pwError = rules.password(password)
    if (pwError) throw new HttpError(400, pwError, { password: pwError })
    const t = consumeToken(token, 'reset')
    if (!t) throw new HttpError(400, 'This reset link is invalid or has expired. Request a new one.')
    q.setPassword.run(await hashPassword(password), t.user_id)
    q.deleteUserSessions.run(t.user_id) // sign out everywhere else
    q.setVerified.run(q.userById.get(t.user_id).email_verified_at || Date.now(), t.user_id) // the link proves they own the email
    createSession(res, req, t.user_id)
    return { user: publicUser(q.userById.get(t.user_id)) }
  },
}

if (!config.isProd) {
  // Local development only: see the emails that would have been sent.
  routes['GET /api/dev/outbox'] = () => ({ emails: devOutbox() })
}

// ---------- static files (production) ----------
const DIST = join(ROOT, 'dist')
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2' }
async function serveStatic(req, res, pathname) {
  const safe = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '')
  let file = join(DIST, safe)
  if (!file.startsWith(DIST + sep) && file !== DIST) return send(res, 400, { error: 'Bad path' })
  try {
    if (!(await stat(file)).isFile()) throw new Error()
  } catch {
    file = join(DIST, 'index.html') // SPA fallback
  }
  try {
    const data = await readFile(file)
    const long = file.includes(`${sep}assets${sep}`)
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': long ? 'public, max-age=31536000, immutable' : 'no-cache' })
    res.end(data)
  } catch {
    send(res, 404, { error: 'Not found — run `npm run build` first' })
  }
}

// ---------- server ----------
const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Frame-Options', 'DENY')
  const url = new URL(req.url, 'http://local')
  const isApi = url.pathname.startsWith('/api/')
  try {
    if (!isApi) {
      if (config.isProd && (req.method === 'GET' || req.method === 'HEAD')) return await serveStatic(req, res, url.pathname)
      return send(res, 404, { error: 'Not found' })
    }
    // CSRF protection: state-changing requests must come from our own site.
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const origin = req.headers.origin
      if (origin ? !allowedOrigins.has(origin) : config.isProd) throw new HttpError(403, 'Request blocked (origin)')
    }
    const handler = routes[`${req.method} ${url.pathname}`]
    if (!handler) throw new HttpError(404, 'Not found')
    const result = await handler(req, res)
    send(res, 200, result)
  } catch (err) {
    if (err instanceof HttpError) return send(res, err.status, { error: err.message, fields: err.fields })
    console.error(err)
    send(res, 500, { error: 'Something went wrong on our side' })
  }
})

server.listen(config.port, () => {
  console.log(`Quizora API on http://localhost:${config.port}  (${config.isProd ? 'production' : 'development'})`)
  if (!config.resendKey) console.log('Emails are not sent — they are printed here and listed at /api/dev/outbox. Set RESEND_API_KEY to send real emails.')
})
