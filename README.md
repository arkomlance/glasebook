# 🐔 Glasebook

Glasebook is a parody-inspired original social network. Not affiliated with Meta Platforms, Inc.

A playful, Facebook's-fun-unserious-cousin social network: cluck posts, throw eggs at (like) them,
gather your flock (friends), and slide into the coop (messages). Built as a single
deployable Node.js monolith — free to run, easy to host.

## Ownership

Glasebook is owned by **Clark Cluckerberg**. © 2026 Glasebook. All rights reserved.

## Tech stack

| Layer    | Choice |
|----------|--------|
| Runtime  | Node.js 24 |
| Server   | Express 4 (single monolith serves API + static frontend) |
| Database | SQLite via built-in `node:sqlite` — file at `./data/glasebook.db`, zero dependencies |
| Auth     | Sessions (`express-session` + custom SQLite store), `bcryptjs` password hashing, httpOnly cookies |
| Security | Manual CSRF tokens (`X-CSRF-Token`), `express-rate-limit` on auth routes, image-only uploads ≤ 5 MB via `multer`, parameterized queries, XSS escaping on the client |
| Frontend | No build step — plain HTML/CSS/JS SPA in `public/` |

## Quick start (local)

```bash
cd glasebook
npm install
cp .env.example .env   # then set a real SESSION_SECRET
node seed.js           # creates 3 demo users with posts, friends, messages
npm start              # serves on http://localhost:3000
```

Demo login: `demo@glasebook.local` / `glasebook123`
(two more seeded users: `ava@glasebook.local`, `mia@glasebook.local`, same password).

## Features

- **Auth** — signup/login/logout, bcrypt hashing, httpOnly session cookies, CSRF protection, rate-limited auth endpoints
- **Profiles** — avatar + cover upload, bio, public shareable profile pages with Open Graph preview tags
- **Clucks** — text + image posts, egg throws (likes), comments, delete your own
- **Feed** — your flock's clucks, newest first; promoted posts pin to top (dormant monetization hook)
- **Friends** — requests, accept/decline, unfriend, user search
- **Messages** — 1:1 conversations, polling-based live updates
- **Notifications** — egg throws, comments, friend requests/accepts, messages; mark-all-read
- **Growth** — unique invite link per user (`#/signup?ref=CODE`), referral tracking, `#/leaderboard` of top inviters, playful "Welcome to the flock!" onboarding
- **Monetization hooks (dormant)** — `promoted` flag on posts (only settable by `premium` users), `premium` flag on users. No payments wired up yet — the schema is ready.

## Project layout

```
server.js        # Express app: all API routes, static serving, uploads
db.js            # SQLite schema + connection + invite-code helpers
seed.js          # demo data (idempotent)
public/          # frontend SPA (index.html, styles.css, app.js)
uploads/         # user-uploaded images (gitignored, ephemeral on free hosts)
data/            # SQLite file (gitignored)
API_CONTRACT.md  # the API spec both sides implement
```

## Environment variables

| Var | Purpose | Default |
|-----|---------|---------|
| `PORT` | listen port | `3000` |
| `APP_URL` | public URL, used to build invite links | `http://localhost:3000` |
| `SESSION_SECRET` | signs session cookies — **set a long random value in production** | dev fallback |
| `NODE_ENV` | `production` enables secure cookies | `development` |

See [DEPLOY.md](DEPLOY.md) for the free hosting walkthrough.
