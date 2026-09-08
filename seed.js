'use strict';
/**
 * seed.js — creates 3 demo users with posts, comments, likes, a friendship
 * triangle and a starter conversation so the feed isn't empty.
 *
 *   demo@glasebook.local / glasebook123   (friends with both below)
 *   ava@glasebook.local  / glasebook123
 *   mia@glasebook.local  / glasebook123
 *
 * Idempotent: exits early if the demo users already exist.
 */
const bcrypt = require('bcryptjs');
const { db, genInviteCode } = require('./db');

const PASSWORD = 'glasebook123';
const hash = bcrypt.hashSync(PASSWORD, 10);

const DEMO = [
  { name: 'Demo User', email: 'demo@glasebook.local', bio: 'Just here for a good time on Glasebook.' },
  { name: 'Ava Stone', email: 'ava@glasebook.local', bio: 'Sourdough enthusiast. Third attempt\'s the charm.' },
  { name: 'Mia Park', email: 'mia@glasebook.local', bio: 'Shipping side projects and drinking coffee.' },
];

const exists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(DEMO[0].email);
if (exists) {
  console.log('Seed data already present — nothing to do.');
  process.exit(0);
}

const ids = {};
for (const d of DEMO) {
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, bio, invite_code) VALUES (?, ?, ?, ?, ?)')
    .run(d.name, d.email, hash, d.bio, genInviteCode());
  ids[d.email] = Number(info.lastInsertRowid);
}
const demo = ids['demo@glasebook.local'];
const ava = ids['ava@glasebook.local'];
const mia = ids['mia@glasebook.local'];

// Friendships: everyone is friends with everyone.
for (const [a, b] of [[demo, ava], [demo, mia], [ava, mia]]) {
  const [x, y] = a < b ? [a, b] : [b, a];
  db.prepare('INSERT OR IGNORE INTO friendships (user_id_1, user_id_2) VALUES (?, ?)').run(x, y);
}

const addPost = (userId, text) =>
  Number(
    db.prepare('INSERT INTO posts (user_id, text) VALUES (?, ?)').run(userId, text).lastInsertRowid
  );
const addComment = (postId, userId, text) =>
  db.prepare('INSERT INTO comments (post_id, user_id, text) VALUES (?, ?, ?)').run(postId, userId, text);
const addLike = (postId, userId) =>
  db.prepare('INSERT OR IGNORE INTO likes (post_id, user_id) VALUES (?, ?)').run(postId, userId);
const notify = (userId, type, actorId, postId = null) => {
  if (userId === actorId) return;
  db.prepare('INSERT INTO notifications (user_id, type, actor_id, post_id) VALUES (?, ?, ?, ?)')
    .run(userId, type, actorId, postId);
};

const p1 = addPost(demo, 'Just joined Glasebook! Excited to connect with everyone here.');
const p2 = addPost(demo, 'Beautiful day for a walk in the park.');
const p3 = addPost(ava, 'My sourdough finally rose properly! Third attempt\u2019s the charm.');
const p4 = addPost(ava, 'Currently reading: a very good book about very tiny habits.');
const p5 = addPost(mia, 'Shipped my first side project today. Scary and exciting.');
const p6 = addPost(mia, 'Coffee count today: 4. Regrets: 0.');

addComment(p1, ava, 'Welcome! Glad you made it.');
notify(demo, 'comment', ava, p1);
addComment(p1, mia, 'Woohoo, the gang is all here!');
notify(demo, 'comment', mia, p1);
addComment(p3, demo, 'Save me a slice!');
notify(ava, 'comment', demo, p3);
addComment(p5, ava, 'Congrats! Link please.');
notify(mia, 'comment', ava, p5);

for (const [post, user] of [[p1, ava], [p1, mia], [p2, ava], [p3, demo], [p3, mia], [p5, demo], [p5, ava], [p6, ava]]) {
  addLike(post, user);
  const owner = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(post).user_id;
  notify(owner, 'like', user, post);
}

// Starter conversation between demo and Ava.
const [c1, c2] = demo < ava ? [demo, ava] : [ava, demo];
const convId = Number(
  db.prepare('INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)').run(c1, c2).lastInsertRowid
);
const sendMsg = (senderId, text) => {
  db.prepare('INSERT INTO messages (conversation_id, sender_id, text) VALUES (?, ?, ?)').run(convId, senderId, text);
  db.prepare("UPDATE conversations SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(convId);
  const other = senderId === demo ? ava : demo;
  notify(other, 'message', senderId);
};
sendMsg(ava, 'Hey! Saw you joined Glasebook — welcome!');
sendMsg(demo, 'Thanks Ava! Still figuring things out around here.');

console.log('Seeded 3 demo users (password: glasebook123) with posts, comments, likes, and messages.');
