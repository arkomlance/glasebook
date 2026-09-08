'use strict';
/**
 * flock/make-avatars.js — generates one original SVG chicken avatar per muse
 * into public/avatars/flock/<handle>.svg. Parametric: body palette + accessory.
 * Run: node flock/make-avatars.js
 */
const fs = require('node:fs');
const path = require('node:path');
const muses = require('./muses.json').muses;

const OUT = path.join(__dirname, '..', 'public', 'avatars', 'flock');
fs.mkdirSync(OUT, { recursive: true });

function accessorySVG(kind, pal) {
  switch (kind) {
    case 'tie':
      return `<path d="M60 62 l-6 10 6 26 6 -26 z" fill="#b23a2e"/><rect x="54" y="56" width="12" height="8" rx="2" fill="#8e2b22"/>`;
    case 'glasses':
      return `<circle cx="46" cy="42" r="9" fill="none" stroke="#3e2f23" stroke-width="3"/><circle cx="72" cy="42" r="9" fill="none" stroke="#3e2f23" stroke-width="3"/><path d="M55 42 h8 M37 40 l-8 -4 M81 40 l8 -4" stroke="#3e2f23" stroke-width="3"/>`;
    case 'monocle':
      return `<circle cx="70" cy="42" r="10" fill="none" stroke="#c9a227" stroke-width="3"/><path d="M70 52 q2 10 -4 14" stroke="#c9a227" stroke-width="2" fill="none"/>`;
    case 'beret':
      return `<ellipse cx="58" cy="16" rx="22" ry="9" fill="#2c2925"/><rect x="38" y="20" width="40" height="5" rx="2" fill="#1d1b18"/><circle cx="76" cy="10" r="3" fill="#b23a2e"/>`;
    case 'chef-hat':
      return `<rect x="42" y="8" width="34" height="18" rx="8" fill="#ffffff" stroke="#d9cfc0" stroke-width="2"/><rect x="50" y="24" width="18" height="6" fill="#ffffff"/>`;
    case 'press-hat':
      return `<path d="M36 26 q22 -18 44 0 l0 -6 q-22 -14 -44 0 z" fill="#8d6e4a"/><rect x="36" y="22" width="44" height="6" rx="2" fill="#6d5439"/><rect x="52" y="4" width="12" height="8" rx="2" fill="#a98f63"/>`;
    case 'cap':
      return `<path d="M36 24 q22 -20 44 0 l-4 6 h-36 z" fill="#d23c2e"/><rect x="72" y="24" width="18" height="4" rx="2" fill="#a02c22"/>`;
    case 'headphones':
    case 'headphones-dj':
      return `<path d="M32 44 q0 -30 28 -30 t28 30" fill="none" stroke="#3e2f23" stroke-width="6"/><rect x="26" y="38" width="12" height="20" rx="5" fill="#3e2f23"/><rect x="82" y="38" width="12" height="20" rx="5" fill="#3e2f23"/>` +
        (kind === 'headphones-dj' ? `<circle cx="88" cy="62" r="4" fill="#ff7043"/>` : '');
    case 'flower':
      return `<g transform="translate(84,20)"><circle r="5" fill="#ffd54f"/><circle cx="0" cy="-8" r="5" fill="#f48fb1"/><circle cx="8" cy="0" r="5" fill="#f48fb1"/><circle cx="0" cy="8" r="5" fill="#f48fb1"/><circle cx="-8" cy="0" r="5" fill="#f48fb1"/></g>`;
    case 'crystal':
      return `<path d="M84 8 l8 12 -8 12 -8 -12 z" fill="#9d4edd" opacity="0.9"/><path d="M84 8 l8 12 h-16 z" fill="#c77dff"/>`;
    case 'quill':
      return `<g transform="translate(88,52) rotate(35)"><path d="M0 0 q14 -4 20 -20 q-16 2 -20 20 z" fill="#eceff1" stroke="#90a4ae" stroke-width="1.5"/><path d="M0 0 L20 -20" stroke="#5e35b1" stroke-width="2"/></g>`;
    default:
      return '';
  }
}

function chickenSVG(muse) {
  const pal = muse.palette;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="${muse.name} avatar">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="75%">
      <stop offset="0%" stop-color="#fff8ec"/>
      <stop offset="100%" stop-color="#f5e3bd"/>
    </radialGradient>
  </defs>
  <rect width="120" height="120" rx="26" fill="url(#bg)"/>
  ${accessorySVG(muse.accessory, pal)}
  <path d="M28 78 c-10 -2 -16 -8 -18 -16 c8 0 14 2 18 6 c-6 -6 -8 -14 -6 -20 c6 4 10 8 12 14 z" fill="${pal.wing}"/>
  <ellipse cx="58" cy="76" rx="26" ry="21" fill="${pal.body}"/>
  <ellipse cx="52" cy="78" rx="13" ry="10" fill="${pal.wing}" opacity="0.85"/>
  <path d="M48 96 v10 M48 106 l-5 4 M48 106 l5 4 M68 96 v10 M68 106 l-5 4 M68 106 l5 4" stroke="#e07b2a" stroke-width="3" stroke-linecap="round" fill="none"/>
  <circle cx="66" cy="38" r="17" fill="${pal.body}"/>
  <circle cx="58" cy="20" r="6" fill="${pal.comb}"/>
  <circle cx="67" cy="17" r="6.5" fill="${pal.comb}"/>
  <circle cx="76" cy="20" r="6" fill="${pal.comb}"/>
  <path d="M82 36 l13 4 -13 5 z" fill="#e07b2a"/>
  <circle cx="70" cy="35" r="3.6" fill="#3e2f23"/>
  <circle cx="71.2" cy="33.8" r="1.2" fill="#ffffff"/>
</svg>`;
}

for (const muse of muses) {
  const file = path.join(OUT, `${muse.handle}.svg`);
  fs.writeFileSync(file, chickenSVG(muse));
  console.log('wrote', path.relative(path.join(__dirname, '..'), file));
}
console.log(`Done: ${muses.length} avatars.`);
