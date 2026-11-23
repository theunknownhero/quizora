// Sends transactional emails.
// - With RESEND_API_KEY set: sends real email through https://resend.com (HTTPS API, no extra package).
// - Otherwise (local development): prints the email to the console and keeps it in an in-memory
//   "outbox" you can open at GET /api/dev/outbox (disabled in production).
import { config } from './config.js'

const outbox = []
export const devOutbox = () => outbox.slice(-20).reverse()

const layout = (title, body, cta, url) => `<!doctype html><html><body style="margin:0;background:#07060b;font-family:Inter,Arial,sans-serif;color:#f4f2ff">
<div style="max-width:480px;margin:0 auto;padding:40px 24px">
  <div style="font-size:22px;font-weight:700;margin-bottom:24px">Quizora</div>
  <div style="background:#15121f;border:1px solid #2a2540;border-radius:20px;padding:28px">
    <h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
    <p style="color:#a19db5;line-height:1.6;margin:0 0 24px">${body}</p>
    <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#22d3ee);color:#fff;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:999px">${cta}</a>
    <p style="color:#6d6982;font-size:12px;line-height:1.6;margin:24px 0 0">If the button doesn’t work, copy this link:<br>${url}</p>
  </div>
  <p style="color:#6d6982;font-size:12px;margin-top:20px">You got this email because someone used this address on Quizora. If it wasn’t you, you can ignore it.</p>
</div></body></html>`

async function send({ to, subject, html, text, link }) {
  if (config.resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: config.mailFrom, to, subject, html, text }),
    })
    if (!res.ok) console.error('[mail] send failed', res.status, await res.text().catch(() => ''))
    return
  }
  outbox.push({ to, subject, link, at: new Date().toISOString() })
  console.log(`\n[mail:dev] To: ${to}\n[mail:dev] Subject: ${subject}\n[mail:dev] Link: ${link}\n`)
}

export function sendVerifyEmail(user, token) {
  const link = `${config.appUrl}/verify-email?token=${encodeURIComponent(token)}`
  return send({
    to: user.email,
    subject: 'Confirm your Quizora email',
    link,
    text: `Hi ${user.username}, confirm your email: ${link} (valid for 48 hours)`,
    html: layout(`Hi ${user.username}, confirm your email`, 'Tap the button to confirm this is your email address. The link is valid for 48 hours.', 'Confirm email', link),
  })
}

export function sendResetEmail(user, token) {
  const link = `${config.appUrl}/reset-password?token=${encodeURIComponent(token)}`
  return send({
    to: user.email,
    subject: 'Reset your Quizora password',
    link,
    text: `Hi ${user.username}, reset your password: ${link} (valid for 1 hour)`,
    html: layout('Reset your password', 'Someone asked to reset the password for your Quizora account. The link is valid for 1 hour and can be used once.', 'Choose a new password', link),
  })
}
