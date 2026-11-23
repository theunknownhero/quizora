// Server settings, read from environment variables (see .env.example).
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
export const ROOT = join(here, '..')

// Minimal .env loader (no dependency): KEY=value lines, # comments.
const envFile = join(ROOT, '.env')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

const env = process.env
export const config = {
  port: Number(env.PORT || 8787),
  isProd: env.NODE_ENV === 'production',
  // Public URL of the site, used in email links and to check the Origin of requests.
  appUrl: (env.APP_URL || 'http://localhost:5173').replace(/\/$/, ''),
  // Extra allowed origins, comma-separated (e.g. a staging domain).
  extraOrigins: (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  dbFile: env.DB_FILE || join(here, 'data', 'quizora.db'),
  sessionDays: Number(env.SESSION_DAYS || 30),
  // Email: set RESEND_API_KEY + MAIL_FROM to send real emails via resend.com; otherwise emails are logged.
  resendKey: env.RESEND_API_KEY || '',
  mailFrom: env.MAIL_FROM || 'Quizora <no-reply@example.com>',
}
