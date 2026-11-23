# Quizora

Quiz games library (React + Vite) with a small Node API for accounts.

## Run locally

Needs Node 22.13 or newer (uses Node's built-in SQLite). Two terminals:

```bash
npm run api   # API on http://localhost:8787
npm run dev   # site on http://localhost:5173 (calls /api through the Vite proxy)
```

Emails (confirm email, reset password) are **not sent** locally. They're printed in the API terminal and listed at http://localhost:5173/api/dev/outbox, so you can click the links.

## Deploy

One Node process serves the built site and the API:

```bash
npm install
npm run build
npm start          # NODE_ENV=production, port from PORT (default 8787)
```

Before going live, create a `.env` (see `.env.example`):

| Setting | What to set |
| --- | --- |
| `APP_URL` | Your public HTTPS address, e.g. `https://quizora.com`. Used in email links and to block requests from other sites. |
| `RESEND_API_KEY`, `MAIL_FROM` | From [resend.com](https://resend.com), with your domain verified. Without these, no emails go out. |
| `DB_FILE` | Path on a **persistent disk** (the SQLite file holds all accounts). Back it up. |

Requirements for production:
- Serve over **HTTPS** (the session cookie is `Secure` in production). Put it behind your host's HTTPS or a proxy (Nginx, Caddy, Cloudflare).
- Run **one instance** (rate limits are kept in memory, and SQLite is a single file). For several servers, move to Postgres + a shared rate-limit store.
- Hosts that fit: Railway, Render, Fly.io, a VPS. Plain static hosts (Netlify/Vercel static) can't run the API.

## How accounts work

- `server/index.js`: routes. `server/db.js`: tables. `server/security.js`: hashing, validation and rate limits. `server/mailer.js`: emails.
- Passwords are hashed with scrypt. Sessions are random tokens in an `HttpOnly; SameSite=Lax` cookie, and only their SHA-256 hash is stored.
- Login attempts and email sends are rate-limited. "Forgot password" gives the same answer whether or not the email exists.
- Resetting a password signs the account out everywhere else.
- Frontend API client: `src/state/authStore.js`.
