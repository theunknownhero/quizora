# Quizora

Quiz games library: React + Vite, hosted on **Vercel**, accounts on **Supabase**.

## Run locally

```bash
npm install
cp .env.example .env.local   # then paste your Supabase URL + anon key
npm run dev                  # http://localhost:5173
```

Without the two Supabase values the site still runs. Accounts are just switched off, and every quiz stays playable as a guest.

## 1. Set up Supabase (once)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates the `profiles` table (username + onboarding picks), its security rules, and the sign-up trigger.
3. **Authentication → Sign In / Providers → Email**:
   - Keep **Email** enabled and **Confirm email** ON.
   - Set **minimum password length** to 8.
4. **Authentication → URL Configuration**:
   - **Site URL**: your Vercel address, e.g. `https://quizora.vercel.app`.
   - **Redirect URLs**: add
     - `https://quizora.vercel.app/**`
     - `http://localhost:5173/**` (for local testing)
     - your custom domain later, e.g. `https://yourdomain.com/**`
5. **Project Settings → API**: copy the **Project URL** and the **anon public** key. Never use the `service_role` key in this app.
6. Recommended before launch: **Authentication → Emails → SMTP Settings**. Plug in an email provider (e.g. Resend), because Supabase's built-in email only sends a few messages per hour. You can also restyle the confirm and reset emails under **Email Templates**.

## 2. Deploy on Vercel

1. [vercel.com/new](https://vercel.com/new) → import `theunknownhero/quizora`. Framework: **Vite** is detected automatically.
2. **Environment Variables** (Production and Preview):
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public key
3. Deploy. Then put the final Vercel URL into Supabase's **Site URL** and **Redirect URLs** (step 1.4).

`vercel.json` sends every page to the app, so links like `/play/hungary-or-not` and `/reset-password` work when opened directly.

## How accounts work

- Supabase Auth handles sign-up, login, sessions, email confirmation and password reset. Users log in with their **email** and password.
- `profiles` holds the username and onboarding picks. Row Level Security means each person can only read and update their own row, and only the preference columns.
- Usernames are unique (case-insensitive). The site checks availability before sign-up with the `username_available` function.
- Code: [`src/lib/supabase.js`](src/lib/supabase.js) (client) and [`src/state/authStore.js`](src/state/authStore.js) (all account calls).
