# DEPLOY.md — Glasebook free-tier deployment plan

**Recommended service: [Render](https://render.com) free Web Service.** $0/month, no credit card
required. One service runs the whole monolith (API + frontend + SQLite).

## What you (the owner) must create — all free, ~5 minutes

1. **GitHub account** (free) — put this `glasebook/` folder in a new repo and push it.
   Do NOT commit `.env`, `data/`, `uploads/`, or `node_modules` (`.gitignore` covers the rest —
   create one if missing with those entries).
2. **Render account** (free) — sign up at render.com with your GitHub account.
3. In Render: **New → Web Service → select your `glasebook` repo**, then set:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment variables** (Render dashboard → Environment):
     - `NODE_ENV` = `production`
     - `APP_URL` = `https://YOUR-APP-NAME.onrender.com` (your Render URL)
     - `SESSION_SECRET` = a long random string — generate one locally with
       `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
       and paste it in. Never reuse the dev fallback.
   - Click **Create Web Service**. Render installs, boots, and gives you a public
     `https://…onrender.com` URL. SQLite initializes itself on first boot
     (`data/glasebook.db` is created automatically).

## After it boots

- Visit the URL, sign up — you're user #1 of your own network. 🐔
- Your invite link (nav → Invite) is `https://YOUR-APP-NAME.onrender.com/#/signup?ref=YOURCODE`.
- Optional: SSH-free seeding — the app starts with an empty DB on Render; the
  `seed.js` demo users are only for local dev. Your first real signup is the founder account.

## Free-tier caveats (honest)

- **Ephemeral disk:** Render's free tier has no persistent disk. If the service
  restarts, `data/glasebook.db` and `uploads/` reset. Fine for launch/MVP; when you
  have real users, upgrade path: Render paid disk ($0.10/GB/mo) **or** move the DB to a
  free Postgres (e.g. Neon/Supabase free tier) — the schema is small and portable.
- **Spin-down:** free services sleep after ~15 min idle; first load takes ~30–60 s to wake.
- **No custom domain on free** — you get `*.onrender.com`.

## Alternatives (also $0)

- **Fly.io** — free allowance exists but requires a credit card on file; persistent
  volume possible via `fly volumes` (still within free allowance for this size).
- **Oracle Cloud Always Free** — 2 small VMs forever; run with plain `npm start`
  behind no proxy. More setup work, but no sleep and persistent disk.

## Launch checklist

- [ ] `SESSION_SECRET` set to a real random value
- [ ] `APP_URL` matches the public URL (invite links depend on it)
- [ ] `NODE_ENV=production` (enables `Secure` cookies)
- [ ] Test signup → cluck → invite link on the live URL
- [ ] Share your invite link and start building the flock
