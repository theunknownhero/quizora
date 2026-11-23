// Password hashing, tokens, validation and rate limiting.
import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto'

// scrypt (memory-hard). Stored format: scrypt$N$r$p$salt$hash
const N = 32768
const R = 8
const P = 1
const KEYLEN = 64
const scryptAsync = (pw, salt, n = N, r = R, p = P) =>
  new Promise((res, rej) => scrypt(pw, salt, KEYLEN, { N: n, r, p, maxmem: 256 * n * r }, (e, k) => (e ? rej(e) : res(k))))

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await scryptAsync(password, salt)
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$')
}

export async function verifyPassword(password, stored) {
  const [alg, n, r, p, salt, hash] = String(stored).split('$')
  if (alg !== 'scrypt') return false
  const key = await scryptAsync(password, Buffer.from(salt, 'base64'), Number(n), Number(r), Number(p))
  const expected = Buffer.from(hash, 'base64')
  return expected.length === key.length && timingSafeEqual(expected, key)
}

// A real hash to compare against when the user doesn't exist, so response time doesn't reveal that.
export const DUMMY_HASH = await hashPassword(randomBytes(12).toString('hex'))

export const newToken = () => randomBytes(32).toString('base64url')
export const sha256 = (s) => createHash('sha256').update(s).digest('hex')

// Same rules as the frontend
export const rules = {
  username: (v) => (typeof v !== 'string' || !/^[a-zA-Z0-9_.]{3,20}$/.test(v) ? '3–20 characters: letters, numbers, _ or .' : null),
  email: (v) => (typeof v !== 'string' || v.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'That email doesn’t look right' : null),
  password: (v) =>
    typeof v !== 'string' || v.length < 8
      ? 'At least 8 characters'
      : v.length > 200
        ? 'That password is too long'
        : !/[a-zA-Z]/.test(v) || !/\d/.test(v)
          ? 'Use letters and numbers'
          : null,
}

// Simple in-memory fixed-window rate limiter (per key). Fine for a single server process.
const buckets = new Map()
export function rateLimit(key, limit, windowMs) {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return { ok: true }
  }
  b.count++
  return b.count > limit ? { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) } : { ok: true }
}
setInterval(() => {
  const now = Date.now()
  for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k)
}, 10 * 60 * 1000).unref()
