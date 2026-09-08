'use strict';
/**
 * Glasebook backend — single deployable monolith.
 * Implements API_CONTRACT.md v1 exactly.
 *
 * Stack: Express 4, node:sqlite (DatabaseSync), bcryptjs,
 * express-session + hand-rolled SQLite session store, express-rate-limit, multer.
 */
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { db, genInviteCode } = require('./db');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-insecure-session-secret-change-me';
const NODE_ENV = process.env.NODE_ENV || 'development';

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function avatarUrlFor(u) {
  return u.avatar_url || `/avatars/default/${u.id}.svg`;
}
function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatarUrl: avatarUrlFor(u),
    premium: !!u.premium,
    inviteCode: u.invite_code || null,
  };
}
// profileUser: `premium` always included; `inviteCode` ONLY when the
// requester is the user themselves (never expose other users' codes).
function profileUser(u, includeInvite = false) {
  const out = {
    id: u.id,
    name: u.name,
    bio: u.bio,
    avatarUrl: avatarUrlFor(u),
    coverUrl: u.cover_url || null,
    premium: !!u.premium,
    createdAt: u.created_at,
  };
  if (includeInvite) out.inviteCode = u.invite_code || null;
  return out;
}
function miniUser(u) {
  return { id: u.id, name: u.name, avatarUrl: avatarUrlFor(u) };
}
function friendPair(a, b) {
  return a < b ? [a, b] : [b, a];
}
function parseId(v) {
  const n = Number.parseInt(v, 10);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
const isEmail = (s) =>
  typeof s === 'string' &&
  s.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

function postShape(row) {
  return {
    id: row.id,
    author: { id: row.author_id, name: row.author_name, avatarUrl: row.author_avatar || `/avatars/default/${row.author_id}.svg` },
    text: row.text,
    imageUrl: row.image_url || null,
    promoted: !!row.promoted,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    likedByMe: !!row.liked_by_me,
    createdAt: row.created_at,
  };
}

const POSTS_SELECT = `
  SELECT p.id, p.text, p.image_url, p.promoted, p.created_at,
         u.id AS author_id, u.name AS author_name, u.avatar_url AS author_avatar,
         (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
         EXISTS(SELECT 1 FROM likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) AS liked_by_me
  FROM posts p JOIN users u ON u.id = p.user_id
`;

const getUserById = db.prepare('SELECT * FROM users WHERE id = ?');
const getUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const areFriends = db.prepare(
  'SELECT 1 FROM friendships WHERE user_id_1 = ? AND user_id_2 = ?'
);

function friendIdsOf(userId) {
  const rows = db
    .prepare('SELECT user_id_1, user_id_2 FROM friendships WHERE user_id_1 = ? OR user_id_2 = ?')
    .all(userId, userId);
  return rows.map((r) => (r.user_id_1 === userId ? r.user_id_2 : r.user_id_1));
}

function addNotification({ userId, type, actorId, postId = null }) {
  if (userId === actorId) return; // never notify yourself
  db.prepare(
    'INSERT INTO notifications (user_id, type, actor_id, post_id) VALUES (?, ?, ?, ?)'
  ).run(userId, type, actorId, postId);
}

// ---------------------------------------------------------------------------
// Session store (hand-rolled, backed by SQLite)
// ---------------------------------------------------------------------------
class SQLiteSessionStore extends session.Store {
  constructor(database) {
    super();
    this.db = database;
    this.getStmt = database.prepare('SELECT data, expires FROM sessions WHERE sid = ?');
    this.setStmt = database.prepare(
      'INSERT OR REPLACE INTO sessions (sid, expires, data) VALUES (?, ?, ?)'
    );
    this.destroyStmt = database.prepare('DELETE FROM sessions WHERE sid = ?');
    this.touchStmt = database.prepare('UPDATE sessions SET expires = ? WHERE sid = ?');
  }
  get(sid, cb) {
    try {
      const row = this.getStmt.get(sid);
      if (!row) return cb(null, null);
      if (row.expires < Date.now()) {
        this.destroy(sid, () => {});
        return cb(null, null);
      }
      cb(null, JSON.parse(row.data));
    } catch (e) {
      cb(e);
    }
  }
  set(sid, sess, cb) {
    try {
      const maxAge =
        (sess.cookie && sess.cookie.maxAge) || 30 * 24 * 3600 * 1000;
      this.setStmt.run(sid, Date.now() + maxAge, JSON.stringify(sess));
      cb(null);
    } catch (e) {
      cb(e);
    }
  }
  destroy(sid, cb) {
    try {
      this.destroyStmt.run(sid);
      cb(null);
    } catch (e) {
      cb(e);
    }
  }
  touch(sid, sess, cb) {
    try {
      const maxAge =
        (sess.cookie && sess.cookie.maxAge) || 30 * 24 * 3600 * 1000;
      this.touchStmt.run(Date.now() + maxAge, sid);
      cb(null);
    } catch (e) {
      cb(e);
    }
  }
  clear(cb) {
    try {
      this.db.exec('DELETE FROM sessions');
      cb(null);
    } catch (e) {
      cb(e);
    }
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.use(
  session({
    name: 'glasebook.sid',
    secret: SESSION_SECRET,
    store: new SQLiteSessionStore(db),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: NODE_ENV === 'production',
      maxAge: 30 * 24 * 3600 * 1000,
    },
  })
);

// CSRF: require X-CSRF-Token on every unsafe method under /api.
// Token lives in the session; issued via GET /api/auth/csrf.
function csrfProtection(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const token = req.get('X-CSRF-Token');
  if (!token || !req.session.csrfToken || token !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
  next();
}
app.use('/api', csrfProtection);

// Rate limiting on auth routes: 10 req / 15 min per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}
function currentUser(req) {
  return req.session.userId ? getUserById.get(req.session.userId) || null : null;
}

// ---------------------------------------------------------------------------
// Uploads (multer: images only, <=5MB, random filenames)
// ---------------------------------------------------------------------------
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp']);
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, crypto.randomBytes(16).toString('hex') + ext);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype.startsWith('image/') && IMAGE_EXTS.has(ext)) return cb(null, true);
    cb(new Error('Only image uploads are allowed (png, jpg, gif, webp, avif, bmp)'));
  },
});

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
app.post('/api/auth/signup', authLimiter, (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body.password;

  if (!name || name.length > 60) return res.status(400).json({ error: 'Name must be 1-60 characters' });
  if (!isEmail(email)) return res.status(400).json({ error: 'Invalid email address' });
  if (typeof password !== 'string' || password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (getUserByEmail.get(email)) return res.status(400).json({ error: 'Email already registered' });

  // Optional referral: record who invited this user (invalid codes are ignored).
  let referredBy = null;
  if (typeof req.body.inviteCode === 'string' && req.body.inviteCode.trim()) {
    const referrer = db
      .prepare('SELECT id FROM users WHERE invite_code = ?')
      .get(req.body.inviteCode.trim().toUpperCase());
    if (referrer) referredBy = referrer.id;
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, invite_code, referred_by) VALUES (?, ?, ?, ?, ?)')
    .run(name, email, hash, genInviteCode(), referredBy);
  const user = getUserById.get(info.lastInsertRowid);
  req.session.userId = user.id;
  res.status(201).json({ user: publicUser(user) });
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body.password;
  const user = getUserByEmail.get(email);
  if (!user || typeof password !== 'string' || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('glasebook.sid');
    res.json({ ok: true });
  });
});

app.get('/api/auth/me', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user: publicUser(user) });
});

app.get('/api/auth/csrf', (req, res) => {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  res.json({ csrfToken: req.session.csrfToken });
});

// ---------------------------------------------------------------------------
// Profiles & uploads
// ---------------------------------------------------------------------------
app.get('/api/profile/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid user id' });
  const user = getUserById.get(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const viewerId = req.session.userId || null;
  const friendsCount = db
    .prepare('SELECT COUNT(*) AS c FROM friendships WHERE user_id_1 = ? OR user_id_2 = ?')
    .get(id, id).c;

  let isFriend = false;
  let friendshipStatus = 'none';
  if (viewerId && viewerId !== id) {
    const [a, b] = friendPair(viewerId, id);
    if (areFriends.get(a, b)) {
      isFriend = true;
      friendshipStatus = 'friends';
    } else if (db.prepare('SELECT 1 FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?').get(viewerId, id)) {
      friendshipStatus = 'outgoing';
    } else if (db.prepare('SELECT 1 FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?').get(id, viewerId)) {
      friendshipStatus = 'incoming';
    }
  }

  res.json({ user: profileUser(user, viewerId === id), friendsCount, isFriend, friendshipStatus });
});
app.put('/api/profile', requireAuth, (req, res) => {
  const updates = [];
  const params = [];
  if (req.body.name !== undefined) {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 60) return res.status(400).json({ error: 'Name must be 1-60 characters' });
    updates.push('name = ?');
    params.push(name);
  }
  if (req.body.bio !== undefined) {
    if (typeof req.body.bio !== 'string') return res.status(400).json({ error: 'Bio must be a string' });
    const bio = req.body.bio.trim();
    if (bio.length > 500) return res.status(400).json({ error: 'Bio must be at most 500 characters' });
    updates.push('bio = ?');
    params.push(bio || null);
  }
  if (updates.length) {
    params.push(req.session.userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }
  res.json({ user: profileUser(getUserById.get(req.session.userId), true) });
});

app.post('/api/upload/avatar', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided' });
  const url = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(url, req.session.userId);
  res.json({ avatarUrl: url });
});

app.post('/api/upload/cover', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided' });
  const url = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE users SET cover_url = ? WHERE id = ?').run(url, req.session.userId);
  res.json({ coverUrl: url });
});

// Default avatar: deterministic SVG identicon per user id.
function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}
app.get('/avatars/default/:id.svg', (req, res) => {
  const id = parseId(req.params.id) || 0;
  const user = id ? getUserById.get(id) : null;
  const hue = (id * 137) % 360;
  const initial = escapeXml(user && user.name ? user.name.trim()[0].toUpperCase() : 'G');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">` +
    `<rect width="200" height="200" fill="hsl(${hue},55%,42%)"/>` +
    `<circle cx="100" cy="72" r="34" fill="rgba(255,255,255,0.85)"/>` +
    `<path d="M40 168c8-34 32-52 60-52s52 18 60 52" fill="rgba(255,255,255,0.85)"/>` +
    `<text x="100" y="200" font-size="0" fill="none">${initial}</text>` +
    `</svg>`;
  res.type('image/svg+xml');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------
app.post('/api/posts', requireAuth, upload.single('file'), (req, res) => {
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if (!text || text.length > 2000)
    return res.status(400).json({ error: 'Post text must be 1-2000 characters' });
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  // Monetization hook (dormant): `promoted` only honored for premium authors.
  const author = getUserById.get(req.session.userId);
  const wantsPromoted =
    req.body.promoted === true || req.body.promoted === 'true' || req.body.promoted === '1';
  const promoted = wantsPromoted && author.premium ? 1 : 0;
  const info = db
    .prepare('INSERT INTO posts (user_id, text, image_url, promoted) VALUES (?, ?, ?, ?)')
    .run(req.session.userId, text, imageUrl, promoted);
  const row = db.prepare(POSTS_SELECT + ' WHERE p.id = ?').get(req.session.userId, info.lastInsertRowid);
  res.status(201).json({ post: postShape(row) });
});

app.get('/api/feed', requireAuth, (req, res) => {
  const me = req.session.userId;
  const ids = [me, ...friendIdsOf(me)];
  const placeholders = ids.map(() => '?').join(',');
  const rows = db
    .prepare(
      `${POSTS_SELECT} WHERE p.user_id IN (${placeholders}) ORDER BY p.promoted DESC, p.created_at DESC, p.id DESC LIMIT 200`
    )
    .all(me, ...ids);
  res.json({ posts: rows.map(postShape) });
});

app.get('/api/profile/:id/posts', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid user id' });
  if (!getUserById.get(id)) return res.status(404).json({ error: 'User not found' });
  const me = req.session.userId || 0;
  const rows = db
    .prepare(
      `${POSTS_SELECT} WHERE p.user_id = ? ORDER BY p.created_at DESC, p.id DESC LIMIT 200`
    )
    .all(me, id);
  res.json({ posts: rows.map(postShape) });
});

app.delete('/api/posts/:id', requireAuth, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid post id' });
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.user_id !== req.session.userId) return res.status(403).json({ error: 'Not your post' });
  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Likes & comments
// ---------------------------------------------------------------------------
app.post('/api/posts/:id/like', requireAuth, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid post id' });
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const me = req.session.userId;
  const info = db
    .prepare('INSERT OR IGNORE INTO likes (post_id, user_id) VALUES (?, ?)')
    .run(id, me);
  if (info.changes > 0) addNotification({ userId: post.user_id, type: 'like', actorId: me, postId: id });
  const likeCount = db.prepare('SELECT COUNT(*) AS c FROM likes WHERE post_id = ?').get(id).c;
  res.json({ liked: true, likeCount });
});

app.delete('/api/posts/:id/like', requireAuth, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid post id' });
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(id, req.session.userId);
  const likeCount = db.prepare('SELECT COUNT(*) AS c FROM likes WHERE post_id = ?').get(id).c;
  res.json({ liked: false, likeCount });
});

app.get('/api/posts/:id/comments', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid post id' });
  if (!db.prepare('SELECT 1 FROM posts WHERE id = ?').get(id))
    return res.status(404).json({ error: 'Post not found' });
  const rows = db
    .prepare(
      `SELECT c.id, c.text, c.created_at, u.id AS uid, u.name, u.avatar_url
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ? ORDER BY c.created_at ASC, c.id ASC`
    )
    .all(id);
  res.json({
    comments: rows.map((r) => ({
      id: r.id,
      author: { id: r.uid, name: r.name, avatarUrl: r.avatar_url || `/avatars/default/${r.uid}.svg` },
      text: r.text,
      createdAt: r.created_at,
    })),
  });
});

app.post('/api/posts/:id/comments', requireAuth, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid post id' });
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if (!text || text.length > 500)
    return res.status(400).json({ error: 'Comment text must be 1-500 characters' });
  const me = req.session.userId;
  const info = db
    .prepare('INSERT INTO comments (post_id, user_id, text) VALUES (?, ?, ?)')
    .run(id, me, text);
  addNotification({ userId: post.user_id, type: 'comment', actorId: me, postId: id });
  const c = db.prepare('SELECT * FROM comments WHERE id = ?').get(info.lastInsertRowid);
  const author = getUserById.get(me);
  res.status(201).json({
    comment: { id: c.id, author: miniUser(author), text: c.text, createdAt: c.created_at },
  });
});

// ---------------------------------------------------------------------------
// Friends
// ---------------------------------------------------------------------------
app.get('/api/friends', requireAuth, (req, res) => {
  const me = req.session.userId;
  const ids = friendIdsOf(me);
  const friends = ids.map((fid) => {
    const u = getUserById.get(fid);
    return { id: u.id, name: u.name, avatarUrl: avatarUrlFor(u), bio: u.bio };
  });
  res.json({ friends });
});

app.get('/api/friends/requests', requireAuth, (req, res) => {
  const me = req.session.userId;
  const incoming = db
    .prepare(
      `SELECT fr.id, fr.created_at, u.id AS uid, u.name, u.avatar_url
       FROM friend_requests fr JOIN users u ON u.id = fr.from_user_id
       WHERE fr.to_user_id = ? ORDER BY fr.created_at DESC`
    )
    .all(me)
    .map((r) => ({
      id: r.id,
      from: { id: r.uid, name: r.name, avatarUrl: r.avatar_url || `/avatars/default/${r.uid}.svg` },
      createdAt: r.created_at,
    }));
  const outgoing = db
    .prepare('SELECT to_user_id FROM friend_requests WHERE from_user_id = ?')
    .all(me)
    .map((r) => r.to_user_id);
  res.json({ incoming, outgoing });
});

app.post('/api/friends/request/:userId', requireAuth, (req, res) => {
  const targetId = parseId(req.params.userId);
  if (!targetId) return res.status(400).json({ error: 'Invalid user id' });
  const me = req.session.userId;
  if (targetId === me) return res.status(400).json({ error: 'Cannot friend yourself' });
  if (!getUserById.get(targetId)) return res.status(404).json({ error: 'User not found' });
  const [a, b] = friendPair(me, targetId);
  if (areFriends.get(a, b)) return res.status(400).json({ error: 'Already friends' });
  const existing = db
    .prepare(
      'SELECT 1 FROM friend_requests WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)'
    )
    .get(me, targetId, targetId, me);
  if (existing) return res.status(400).json({ error: 'Friend request already pending' });
  db.prepare('INSERT INTO friend_requests (from_user_id, to_user_id) VALUES (?, ?)').run(me, targetId);
  addNotification({ userId: targetId, type: 'friend_request', actorId: me });
  res.status(201).json({ ok: true });
});

app.post('/api/friends/accept/:requestId', requireAuth, (req, res) => {
  const rid = parseId(req.params.requestId);
  if (!rid) return res.status(400).json({ error: 'Invalid request id' });
  const me = req.session.userId;
  const fr = db
    .prepare('SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ?')
    .get(rid, me);
  if (!fr) return res.status(404).json({ error: 'Friend request not found' });
  const [a, b] = friendPair(fr.from_user_id, fr.to_user_id);
  db.prepare('INSERT OR IGNORE INTO friendships (user_id_1, user_id_2) VALUES (?, ?)').run(a, b);
  db.prepare('DELETE FROM friend_requests WHERE id = ?').run(rid);
  addNotification({ userId: fr.from_user_id, type: 'friend_accept', actorId: me });
  res.json({ ok: true });
});

app.post('/api/friends/decline/:requestId', requireAuth, (req, res) => {
  const rid = parseId(req.params.requestId);
  if (!rid) return res.status(400).json({ error: 'Invalid request id' });
  const me = req.session.userId;
  const fr = db
    .prepare('SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ?')
    .get(rid, me);
  if (!fr) return res.status(404).json({ error: 'Friend request not found' });
  db.prepare('DELETE FROM friend_requests WHERE id = ?').run(rid);
  res.json({ ok: true });
});

app.delete('/api/friends/:userId', requireAuth, (req, res) => {
  const targetId = parseId(req.params.userId);
  if (!targetId) return res.status(400).json({ error: 'Invalid user id' });
  const me = req.session.userId;
  const [a, b] = friendPair(me, targetId);
  db.prepare('DELETE FROM friendships WHERE user_id_1 = ? AND user_id_2 = ?').run(a, b);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Invites / referrals (growth)
// ---------------------------------------------------------------------------
app.get('/api/invite', requireAuth, (req, res) => {
  const user = getUserById.get(req.session.userId);
  const inviteCode = user.invite_code;
  res.json({ inviteCode, inviteUrl: `${APP_URL}/#/signup?ref=${inviteCode}` });
});

// Public leaderboard: top inviters by successful referral count.
app.get('/api/leaderboard', (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.avatar_url, COUNT(r.id) AS invite_count
       FROM users u LEFT JOIN users r ON r.referred_by = u.id
       GROUP BY u.id ORDER BY invite_count DESC, u.id ASC LIMIT 20`
    )
    .all();
  res.json({
    leaders: rows.map((r) => ({
      user: { id: r.id, name: r.name, avatarUrl: r.avatar_url || `/avatars/default/${r.id}.svg` },
      inviteCount: r.invite_count,
    })),
  });
});

// ---------------------------------------------------------------------------
// Messages (1:1 conversations)
// ---------------------------------------------------------------------------
function getConversationForUser(convId, userId) {
  return db
    .prepare('SELECT * FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)')
    .get(convId, userId, userId);
}
function otherParticipant(conv, me) {
  const otherId = conv.user1_id === me ? conv.user2_id : conv.user1_id;
  const u = getUserById.get(otherId);
  return { id: u.id, name: u.name, avatarUrl: avatarUrlFor(u) };
}

app.get('/api/conversations', requireAuth, (req, res) => {
  const me = req.session.userId;
  const convs = db
    .prepare(
      `SELECT * FROM conversations WHERE user1_id = ? OR user2_id = ?
       ORDER BY updated_at DESC, id DESC`
    )
    .all(me, me);
  const result = convs.map((c) => {
    const last = db
      .prepare('SELECT text, created_at, sender_id FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1')
      .get(c.id);
    const unreadCount = db
      .prepare(
        `SELECT COUNT(*) AS c FROM messages m
         WHERE m.conversation_id = ? AND m.sender_id != ?
           AND m.id > COALESCE((SELECT last_read_message_id FROM conversation_reads WHERE user_id = ? AND conversation_id = ?), 0)`
      )
      .get(c.id, me, me, c.id).c;
    return {
      id: c.id,
      otherUser: otherParticipant(c, me),
      lastMessage: last
        ? { text: last.text, createdAt: last.created_at, senderId: last.sender_id }
        : null,
      unreadCount,
    };
  });
  res.json({ conversations: result });
});

app.post('/api/conversations', requireAuth, (req, res) => {
  const targetId = parseId(req.body.userId);
  if (!targetId) return res.status(400).json({ error: 'Invalid userId' });
  const me = req.session.userId;
  if (targetId === me) return res.status(400).json({ error: 'Cannot message yourself' });
  if (!getUserById.get(targetId)) return res.status(404).json({ error: 'User not found' });
  const [a, b] = friendPair(me, targetId);
  let conv = db.prepare('SELECT * FROM conversations WHERE user1_id = ? AND user2_id = ?').get(a, b);
  if (!conv) {
    const info = db.prepare('INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)').run(a, b);
    conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(info.lastInsertRowid);
  }
  res.json({
    conversation: { id: conv.id, otherUser: otherParticipant(conv, me), createdAt: conv.created_at },
  });
});

app.get('/api/conversations/:id/messages', requireAuth, (req, res) => {
  const convId = parseId(req.params.id);
  if (!convId) return res.status(400).json({ error: 'Invalid conversation id' });
  const me = req.session.userId;
  const conv = getConversationForUser(convId, me);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  let after = null;
  if (req.query.after !== undefined) {
    after = parseId(req.query.after);
    if (after === null) return res.status(400).json({ error: 'Invalid after parameter' });
  }
  const rows = after
    ? db.prepare('SELECT * FROM messages WHERE conversation_id = ? AND id > ? ORDER BY id ASC').all(convId, after)
    : db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC').all(convId);

  const maxId = db.prepare('SELECT COALESCE(MAX(id), 0) AS m FROM messages WHERE conversation_id = ?').get(convId).m;
  db.prepare(
    'INSERT INTO conversation_reads (user_id, conversation_id, last_read_message_id) VALUES (?, ?, ?) ' +
    'ON CONFLICT(user_id, conversation_id) DO UPDATE SET last_read_message_id = excluded.last_read_message_id'
  ).run(me, convId, maxId);

  res.json({
    messages: rows.map((m) => ({ id: m.id, senderId: m.sender_id, text: m.text, createdAt: m.created_at })),
  });
});

app.post('/api/conversations/:id/messages', requireAuth, (req, res) => {
  const convId = parseId(req.params.id);
  if (!convId) return res.status(400).json({ error: 'Invalid conversation id' });
  const me = req.session.userId;
  const conv = getConversationForUser(convId, me);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if (!text || text.length > 1000)
    return res.status(400).json({ error: 'Message text must be 1-1000 characters' });
  const info = db
    .prepare('INSERT INTO messages (conversation_id, sender_id, text) VALUES (?, ?, ?)')
    .run(convId, me, text);
  db.prepare('UPDATE conversations SET updated_at = strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\') WHERE id = ?').run(convId);
  const otherId = conv.user1_id === me ? conv.user2_id : conv.user1_id;
  addNotification({ userId: otherId, type: 'message', actorId: me });
  const m = db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({
    message: { id: m.id, senderId: m.sender_id, text: m.text, createdAt: m.created_at },
  });
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
app.get('/api/notifications', requireAuth, (req, res) => {
  const me = req.session.userId;
  const rows = db
    .prepare(
      `SELECT n.id, n.type, n.post_id, n.read, n.created_at,
              u.id AS uid, u.name, u.avatar_url
       FROM notifications n JOIN users u ON u.id = n.actor_id
       WHERE n.user_id = ? ORDER BY n.created_at DESC, n.id DESC`
    )
    .all(me);
  res.json({
    notifications: rows.map((r) => ({
      id: r.id,
      type: r.type,
      actor: { id: r.uid, name: r.name, avatarUrl: r.avatar_url || `/avatars/default/${r.uid}.svg` },
      postId: r.post_id,
      read: !!r.read,
      createdAt: r.created_at,
    })),
  });
});

app.post('/api/notifications/read', requireAuth, (req, res) => {
  const me = req.session.userId;
  if (req.body.ids !== undefined) {
    if (!Array.isArray(req.body.ids) || !req.body.ids.every((v) => parseId(v) !== null))
      return res.status(400).json({ error: 'ids must be an array of notification ids' });
    const ids = req.body.ids.map((v) => parseId(v));
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`UPDATE notifications SET read = 1 WHERE user_id = ? AND id IN (${placeholders})`).run(me, ...ids);
    }
  } else {
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(me);
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------
app.get('/api/search', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) return res.json({ users: [] });
  const rows = db
    .prepare('SELECT id, name, avatar_url FROM users WHERE name LIKE ? ESCAPE \'\\\' ORDER BY name ASC LIMIT 10')
    .all(`%${q.replace(/[%_\\]/g, (c) => '\\' + c)}%`);
  res.json({
    users: rows.map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatar_url || `/avatars/default/${u.id}.svg` })),
  });
});

// ---------------------------------------------------------------------------
// Legal pages (terms, privacy, DMCA) — clean URLs served from public/legal/
// ---------------------------------------------------------------------------
app.get('/terms', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'legal', 'terms.html')));
app.get('/privacy', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'legal', 'privacy.html')));
app.get('/dmca', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'legal', 'dmca.html')));

// ---------------------------------------------------------------------------
// Static assets + frontend
// ---------------------------------------------------------------------------
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use(express.static(PUBLIC_DIR));

// 404 for unknown /api routes (JSON), SPA fallback for everything else.
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  if (req.method !== 'GET') return res.status(404).json({ error: 'Not found' });
  const index = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(index)) return res.sendFile(index);
  next();
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err && (err.name === 'MulterError' || err.message === 'Only image uploads are allowed (png, jpg, gif, webp, avif, bmp)')) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5MB or smaller' : err.message;
    return res.status(400).json({ error: msg });
  }
  // eslint-disable-next-line no-unused-vars
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Glasebook API listening on port ${PORT} (env: ${NODE_ENV})`);
});
