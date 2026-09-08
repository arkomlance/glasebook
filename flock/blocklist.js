'use strict';
/**
 * flock/blocklist.js — content safety filter for all flock-generated text.
 * Rejects: profanity, slurs, hate, politics/elections, real-person references,
 * URLs (muses never post links), and contact-info patterns.
 * All checks are case-insensitive, whole-word where it matters.
 */

// Whole-word patterns (word boundaries) — avoids false hits like "metaphor".
const WORDS = [
  // profanity
  'fuck', 'fucking', 'shit', 'shitty', 'bitch', 'bitches', 'asshole', 'dick',
  'piss', 'pissed', 'damn', // NOTE: mild; kept blocked for a family-friendly coop
  'crap', 'hell',
  // slurs / hate (non-exhaustive; the bank is hand-written clean, this is a backstop)
  'retard', 'retarded', 'fag', 'faggot', 'dyke', 'tranny', 'kike', 'chink',
  'spic', 'wetback', 'nigger', 'nigga', 'coon', 'raghead', 'gook',
  // politics / elections
  'trump', 'biden', 'maga', 'democrat', 'republican', 'election', 'vote for',
  'senator', 'congress', 'president of the united states', 'white house',
  'putin', 'zelensky', 'xi jinping',
  // real people / companies (keep the coop fictional)
  'zuckerberg', 'finkd', 'elon', 'musk', 'bezos', 'gates', 'taylor swift',
  'meta platforms',
  // scams / contact harvesting
  'crypto', 'bitcoin', 'nft', 'giveaway', 'dm me', 'whatsapp', 'telegram',
];

const PATTERNS = [
  /https?:\/\//i, // no links from muses
  /www\./i,
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // phone numbers
  /[\w.+-]+@[\w-]+\.[\w.]+/, // email addresses
];

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const WORD_RE = new RegExp(`\\b(${WORDS.map(escRe).join('|')})\\b`, 'i');

function check(text) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, reason: 'empty' };
  if (text.length > 2000) return { ok: false, reason: 'too-long' };
  const w = text.match(WORD_RE);
  if (w) return { ok: false, reason: `blocked-word:${w[1].toLowerCase()}` };
  for (const re of PATTERNS) {
    if (re.test(text)) return { ok: false, reason: `blocked-pattern:${re.source.slice(0, 24)}` };
  }
  return { ok: true };
}

/** Validate the whole content bank at boot; returns list of violations. */
function validateBank(bank) {
  const bad = [];
  const pools = { ...(bank.clucks || {}), ...(bank.replies || {}) };
  for (const [muse, arr] of Object.entries(pools)) {
    for (const t of arr) {
      const r = check(t);
      if (!r.ok) bad.push({ muse, reason: r.reason, text: String(t).slice(0, 60) });
    }
  }
  for (const arc of bank.arcs || []) {
    for (const p of arc.posts || []) {
      const r = check(p.text);
      if (!r.ok) bad.push({ muse: p.muse, reason: r.reason, text: String(p.text).slice(0, 60), arc: arc.title });
      for (const rp of p.replies || []) {
        const r2 = check(rp.text);
        if (!r2.ok) bad.push({ muse: rp.muse, reason: r2.reason, text: String(rp.text).slice(0, 60), arc: arc.title });
      }
    }
  }
  return bad;
}

module.exports = { check, validateBank };
