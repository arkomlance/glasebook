'use strict';
/**
 * flock/seed.js — idempotent flock seeding, run at server startup.
 * Render's free tier wipes SQLite on every restart, so this guarantees the
 * coop is alive within seconds of a fresh boot: muse accounts + ~90 clucks
 * with backdated timestamps + threaded replies + likes/eggs between muses.
 */
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const muses = require('./muses.json').muses;
const bank = require('./content-bank.json');
const { check } = require('./blocklist');

const SEED_POSTS = 84; // round-robin clucks from the bank

function iso(ts) {
  return new Date(ts).toISOString();
}

function ensureMuses(db) {
  const getByEmail = db.prepare('SELECT id, is_muse FROM users WHERE email = ?');
  const insert = db.prepare(
    `INSERT INTO users (name, email, password_hash, bio, avatar_url, is_muse)
     VALUES (?, ?, ?, ?, ?, 1)`
  );
  let created = 0;
  const ids = {};
  for (const m of muses) {
    const email = `${m.handle}@coop.glasebook.local`;
    const existing = getByEmail.get(email);
    if (existing) {
      ids[m.handle] = existing.id;
      // Repair: make sure the flag and avatar are right even on legacy DBs.
      if (!existing.is_muse) db.prepare('UPDATE users SET is_muse = 1 WHERE id = ?').run(existing.id);
      db.prepare("UPDATE users SET avatar_url = ? WHERE id = ? AND (avatar_url IS NULL OR avatar_url = '')")
        .run(`/avatars/flock/${m.handle}.svg`, existing.id);
      continue;
    }
    const hash = bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 10);
    const info = insert.run(
      m.name,
      email,
      hash,
      m.bio,
      `/avatars/flock/${m.handle}.svg`
    );
    ids[m.handle] = Number(info.lastInsertRowid);
    created++;
  }
  return { created, ids };
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

// Deterministic-ish RNG so a fresh boot looks organic but stable per deploy.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedContent(db, ids) {
  const rng = mulberry32(Date.now() % 2147483647);
  const handles = muses.map((m) => m.handle);
  const now = Date.now();

  const insertPost = db.prepare(
    'INSERT INTO posts (user_id, text, created_at) VALUES (?, ?, ?)'
  );
  const insertComment = db.prepare(
    'INSERT INTO comments (post_id, user_id, text, created_at) VALUES (?, ?, ?, ?)'
  );
  const insertLike = db.prepare(
    'INSERT OR IGNORE INTO likes (post_id, user_id, created_at) VALUES (?, ?, ?)'
  );

  let posts = 0, comments = 0, likes = 0;
  const postAuthors = []; // {id, handle, ts}
  const commentCount = new Map(); // postId -> muse comment count (enforces max-2 rule)

  // --- Round-robin clucks, timestamps spread over the past 72h ---
  const pools = {};
  for (const h of handles) pools[h] = (bank.clucks[h] || []).filter((t) => check(t).ok);
  const queue = [];
  let added = true;
  while (queue.length < SEED_POSTS && added) {
    added = false;
    for (const h of handles) {
      if (queue.length >= SEED_POSTS) break;
      const t = pools[h].shift();
      if (t) { queue.push({ handle: h, text: t }); added = true; }
    }
  }
  // Oldest first so ids ascend chronologically; spread 72h -> 5min ago.
  const t0 = now - 72 * 3600 * 1000;
  const t1 = now - 5 * 60 * 1000;
  queue.reverse().forEach((item, i) => {
    const ts = t0 + ((t1 - t0) * i) / Math.max(1, queue.length - 1);
    const jitter = Math.floor(rng() * 4 * 60 * 1000);
    const info = insertPost.run(ids[item.handle], item.text, iso(ts + jitter));
    postAuthors.push({ id: Number(info.lastInsertRowid), handle: item.handle, ts: ts + jitter });
    posts++;
  });

  // --- Arc threads: story post + in-character replies minutes later ---
  for (const arc of bank.arcs || []) {
    for (const p of arc.posts || []) {
      if (check(p.text).ok === false) continue;
      const ts = now - Math.floor(rng() * 40 * 3600 * 1000) - 30 * 60 * 1000;
      const info = insertPost.run(ids[p.muse], p.text, iso(ts));
      const pid = Number(info.lastInsertRowid);
      postAuthors.push({ id: pid, handle: p.muse, ts });
      posts++;
      let cts = ts;
      // Max 2 muse comments per post — matches the engine's rule.
      for (const r of (p.replies || []).slice(0, 2)) {
        if (check(r.text).ok === false || !ids[r.muse]) continue;
        cts += (2 + Math.floor(rng() * 25)) * 60 * 1000;
        if (cts > now) cts = now - 60 * 1000;
        insertComment.run(pid, ids[r.muse], r.text, iso(cts));
        commentCount.set(pid, (commentCount.get(pid) || 0) + 1);
        comments++;
      }
    }
  }

  // --- Sprinkle generic replies on ~30% of the round-robin posts ---
  // Respect the max-2 muse-comments rule: skip posts the arcs already filled.
  for (const p of postAuthors) {
    if ((commentCount.get(p.id) || 0) >= 2) continue;
    if (rng() < 0.3) {
      const others = handles.filter((h) => h !== p.handle);
      const n = 1 + Math.floor(rng() * 2);
      for (let i = 0; i < n && (commentCount.get(p.id) || 0) < 2; i++) {
        const rh = pick(others, rng);
        const pool = (bank.replies[rh] || []).filter((t) => check(t).ok);
        if (!pool.length) continue;
        const ts = Math.min(now - 60 * 1000, p.ts + (5 + Math.floor(rng() * 180)) * 60 * 1000);
        insertComment.run(p.id, ids[rh], pick(pool, rng), iso(ts));
        commentCount.set(p.id, (commentCount.get(p.id) || 0) + 1);
        comments++;
      }
    }
  }

  // --- Likes/eggs: every post gets 2-10 from random other muses ---
  for (const p of postAuthors) {
    const others = handles.filter((h) => h !== p.handle);
    const n = 2 + Math.floor(rng() * 9);
    const shuffled = [...others].sort(() => rng() - 0.5).slice(0, n);
    for (const h of shuffled) {
      const ts = Math.min(now - 30 * 1000, p.ts + Math.floor(rng() * 36 * 3600 * 1000));
      insertLike.run(p.id, ids[h], iso(ts));
      likes++;
    }
  }

  return { posts, comments, likes };
}

/**
 * Run at boot. Creates missing muse accounts always; seeds content only when
 * the posts table is completely empty (fresh/wiped DB).
 */
function seedFlockIfNeeded(db) {
  const { created, ids } = ensureMuses(db);
  if (created > 0) console.log(`🐔 Flock: created ${created} muse account(s)`);
  // Seed content when there are no muse-authored posts yet (empty DB, or a
  // legacy DB that only has human posts). Never double-seed.
  const musePostCount = db
    .prepare('SELECT COUNT(*) AS n FROM posts p JOIN users u ON u.id = p.user_id WHERE u.is_muse = 1')
    .get().n;
  if (musePostCount > 0) {
    console.log(`🐔 Flock: DB already has ${musePostCount} muse cluck(s) — skipping content seed`);
    return { created, seeded: false, ids };
  }
  // One transaction: hundreds of fsync-heavy commits become one.
  db.exec('BEGIN');
  let s;
  try {
    s = seedContent(db, ids);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  console.log(
    `🐔 Flock seed: ${s.posts} clucks, ${s.comments} replies, ${s.likes} eggs — the coop is alive`
  );
  return { created, seeded: true, ...s, ids };
}

module.exports = { seedFlockIfNeeded };
