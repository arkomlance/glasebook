'use strict';
/**
 * flock/engine.js — ongoing flock activity ticker (in-process).
 *
 * Every few minutes a random muse posts a cluck, replies to a recent muse
 * cluck, or throws eggs (likes) — all from the content bank, all filtered.
 *
 * SAFETY (non-negotiable):
 *  - FLOCK_ENABLED=0 kills the ticker entirely (seed still runs at boot).
 *  - Per-hour cap (12) and per-day cap (60) on actions.
 *  - Max 2 muse comments per post; never two comments in a row by the same muse.
 *  - A muse never comments on its own cluck.
 *  - No DMs, ever. No replies to human content, ever.
 *  - Every string passes the blocklist before insert; bank validated at boot.
 *  - No immediate text repeats (recent-text memory).
 */
const muses = require('./muses.json').muses;
const bank = require('./content-bank.json');
const { check, validateBank } = require('./blocklist');

const HOUR_CAP = 12;
const DAY_CAP = 60;
const MAX_MUSE_COMMENTS_PER_POST = 2;

const state = {
  timer: null,
  hourCount: 0,
  dayCount: 0,
  hourReset: 0,
  dayReset: 0,
  recentTexts: [], // last 40 posted texts, no repeats
  lastCommenterByPost: new Map(),
  museIds: {},
};

function log(...a) { console.log('🐔 Flock engine:', ...a); }

function resetWindows() {
  const now = Date.now();
  if (now >= state.hourReset) { state.hourCount = 0; state.hourReset = now + 3600 * 1000; }
  if (now >= state.dayReset) { state.dayCount = 0; state.dayReset = now + 24 * 3600 * 1000; }
}

function rememberText(t) {
  state.recentTexts.push(t);
  if (state.recentTexts.length > 40) state.recentTexts.shift();
}

function freshText(pool) {
  const cands = pool.filter((t) => check(t).ok && !state.recentTexts.includes(t));
  if (!cands.length) return null;
  return cands[Math.floor(Math.random() * cands.length)];
}

function tick(db) {
  resetWindows();
  if (state.hourCount >= HOUR_CAP || state.dayCount >= DAY_CAP) return; // capped: skip quietly

  const roll = Math.random();
  try {
    if (roll < 0.55) doPost(db);
    else if (roll < 0.8) doReply(db);
    else doEggs(db);
  } catch (err) {
    console.error('🐔 Flock engine tick failed:', err.message);
  }
}

function countAction() {
  state.hourCount++;
  state.dayCount++;
}

function doPost(db) {
  const muse = muses[Math.floor(Math.random() * muses.length)];
  const pool = bank.clucks[muse.handle] || [];
  const text = freshText(pool);
  if (!text) return;
  db.prepare('INSERT INTO posts (user_id, text) VALUES (?, ?)').run(state.museIds[muse.handle], text);
  rememberText(text);
  countAction();
  log(`${muse.name} clucked (${state.hourCount}/h, ${state.dayCount}/d)`);
}

function doReply(db) {
  // Recent muse posts (last 48h) with < MAX_MUSE_COMMENTS_PER_POST muse comments.
  const rows = db.prepare(
    `SELECT p.id, p.user_id FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE u.is_muse = 1 AND p.created_at > datetime('now', '-2 days')
     ORDER BY p.created_at DESC LIMIT 25`
  ).all();
  const candidates = rows.filter((r) => {
    const n = db.prepare(
      `SELECT COUNT(*) AS n FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ? AND u.is_muse = 1`
    ).get(r.id).n;
    return n < MAX_MUSE_COMMENTS_PER_POST;
  });
  if (!candidates.length) return;
  const target = candidates[Math.floor(Math.random() * candidates.length)];
  const others = muses.filter((m) => state.museIds[m.handle] !== target.user_id);
  const muse = others[Math.floor(Math.random() * others.length)];
  if (state.lastCommenterByPost.get(target.id) === muse.handle) return; // no doubles
  const pool = bank.replies[muse.handle] || [];
  const text = freshText(pool);
  if (!text) return;
  db.prepare('INSERT INTO comments (post_id, user_id, text) VALUES (?, ?, ?)')
    .run(target.id, state.museIds[muse.handle], text);
  state.lastCommenterByPost.set(target.id, muse.handle);
  rememberText(text);
  countAction();
  log(`${muse.name} replied to post ${target.id}`);
}

function doEggs(db) {
  const rows = db.prepare(
    `SELECT p.id FROM posts p JOIN users u ON u.id = p.user_id
     WHERE u.is_muse = 1 AND p.created_at > datetime('now', '-2 days')
     ORDER BY RANDOM() LIMIT 4`
  ).all();
  if (!rows.length) return;
  const muse = muses[Math.floor(Math.random() * muses.length)];
  const mid = state.museIds[muse.handle];
  const like = db.prepare('INSERT OR IGNORE INTO likes (post_id, user_id) VALUES (?, ?)');
  let n = 0;
  for (const r of rows) {
    // Never egg your own cluck — modesty is a virtue.
    const author = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(r.id).user_id;
    if (author === mid) continue;
    const info = like.run(r.id, mid);
    n += Number(info.changes);
  }
  if (n > 0) { countAction(); log(`${muse.name} threw ${n} egg(s)`); }
}

function startFlockEngine(db) {
  if (process.env.FLOCK_ENABLED === '0') {
    log('disabled via FLOCK_ENABLED=0 — seed only, no new activity');
    return null;
  }
  const bad = validateBank(bank);
  if (bad.length) {
    console.error(`🐔 Flock engine: BLOCKLIST VIOLATIONS in bank (${bad.length}) — refusing to start`);
    bad.slice(0, 5).forEach((b) => console.error('  ', JSON.stringify(b)));
    return null;
  }
  // Resolve muse ids (seed runs first at boot, so they exist).
  const rows = db.prepare("SELECT id, email FROM users WHERE is_muse = 1").all();
  for (const m of muses) {
    const row = rows.find((r) => r.email === `${m.handle}@coop.glasebook.local`);
    if (row) state.museIds[m.handle] = row.id;
  }
  if (Object.keys(state.museIds).length < muses.length) {
    console.error('🐔 Flock engine: muse accounts missing — refusing to start');
    return null;
  }
  const tickMs = parseInt(process.env.FLOCK_TICK_MS, 10);
  const interval = Number.isSafeInteger(tickMs) && tickMs > 0 ? tickMs : 3 * 60 * 1000;
  const jitter = () => interval + Math.floor(Math.random() * interval);
  const loop = () => {
    tick(db);
    state.timer = setTimeout(loop, jitter());
    if (state.timer.unref) state.timer.unref();
  };
  resetWindows();
  const firstMs = parseInt(process.env.FLOCK_FIRST_TICK_MS, 10);
  const firstDelay = Number.isSafeInteger(firstMs) && firstMs >= 0 ? firstMs : 60 * 1000;
  state.timer = setTimeout(loop, firstDelay); // first tick ~1 min after boot
  if (state.timer.unref) state.timer.unref();
  log(`started — tick every ~${Math.round(interval / 60000)}min, caps ${HOUR_CAP}/h + ${DAY_CAP}/d, kill switch FLOCK_ENABLED=0`);
  return state.timer;
}

module.exports = { startFlockEngine };
