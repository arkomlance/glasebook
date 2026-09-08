/* Glasebook SPA — plain JS, no build step. Consumes API contract exactly.
   Original barnyard theme. All icons are hand-made inline SVG. */
"use strict";

/* ================= utilities ================= */

// Escape ALL user content before injecting into the DOM (text and attributes).
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function timeAgo(iso) {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return s + "s";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h";
  const d = Math.floor(h / 24);
  if (d < 7) return d + "d";
  const w = Math.floor(d / 7);
  if (w < 5) return w + "w";
  return new Date(t).toLocaleDateString();
}

function toast(msg, kind) {
  const box = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast" + (kind ? " " + kind : "");
  el.setAttribute("role", "status"); // announced by screen readers
  el.textContent = msg; // textContent: never interpreted as HTML
  box.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity .3s";
    setTimeout(() => el.remove(), 320);
  }, 3200);
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(
      () => toast("Copied to clipboard!", "success"),
      () => fallbackCopy(text)
    );
  }
  fallbackCopy(text);
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    toast("Copied to clipboard!", "success");
  } catch (e) {
    toast("Couldn't copy — long-press to copy manually.", "error");
  }
  ta.remove();
}

/* ================= icons (hand-made inline SVG) ================= */

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  friends: '<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M15.5 3.1a4 4 0 0 1 0 7.8"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  gift: '<path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
  trophy: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v6a5 5 0 0 1-10 0z"/><path d="M7 6H4a1 1 0 0 0-1 1c0 2.5 2 4 4 4"/><path d="M17 6h3a1 1 0 0 1 1 1c0 2.5-2 4-4 4"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  comment: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  pencil: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>',
  star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  megaphone: '<path d="M3 11l18-7v16L3 13z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  // an egg — the "throw an egg" button
  egg: '<ellipse cx="12" cy="13" rx="7" ry="8.6"/><path d="M8.6 11.5l2-2.2 2 2.2 2-2.2 2 2.2"/>',
};

function icon(name, cls) {
  return '<svg class="icon' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true">' +
    (ICONS[name] || ICONS.bell) + "</svg>";
}

// Original Glasebook mascot: a cheerful little hen, drawn by hand.
const MASCOT_SVG =
  '<svg viewBox="0 0 48 48" aria-hidden="true">' +
    '<path d="M14 30c-5-1-8-4-9-8 4 0 7 1 9 3-3-3-4-7-3-10 3 2 5 4 6 7z" fill="#d97b2f"/>' +
    '<ellipse cx="26" cy="30" rx="12" ry="9.5" fill="#f2b134"/>' +
    '<ellipse cx="24" cy="31" rx="6" ry="4.5" fill="#e09b2d"/>' +
    '<path d="M22 38v5M22 43l-2.5 2M22 43l2.5 2M30 38v5M30 43l-2.5 2M30 43l2.5 2" stroke="#e07b2a" stroke-width="2" stroke-linecap="round" fill="none"/>' +
    '<circle cx="34" cy="15" r="7.5" fill="#f2b134"/>' +
    '<circle cx="29" cy="7.5" r="2.6" fill="#b23a2e"/>' +
    '<circle cx="34" cy="6" r="2.8" fill="#b23a2e"/>' +
    '<circle cx="39" cy="7.5" r="2.6" fill="#b23a2e"/>' +
    '<path d="M41 14.5l5.5 2-5.5 2.2z" fill="#e07b2a"/>' +
    '<circle cx="35.5" cy="14" r="1.7" fill="#3e2f23"/>' +
  "</svg>";

/* ================= state ================= */

const state = {
  me: null,
  csrfToken: null,
  timers: [],          // view-scoped intervals, cleared on route change
  msgPoll: null,
  searchTimer: null,
  inviteCode: null,    // ?ref= code captured on signup page
};

function clearTimers() {
  state.timers.forEach(clearInterval);
  state.timers = [];
  if (state.msgPoll) { clearInterval(state.msgPoll); state.msgPoll = null; }
}

function every(ms, fn) {
  state.timers.push(setInterval(fn, ms));
}

/* ================= API client ================= */

const UNSAFE = ["POST", "PUT", "PATCH", "DELETE"];

async function ensureCsrf() {
  if (!state.csrfToken) await refreshCsrf();
}

async function refreshCsrf() {
  const res = await fetch("/api/auth/csrf", { credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data && data.error) || "Could not load CSRF token");
  state.csrfToken = data.csrfToken;
}

async function api(path, opts) {
  opts = opts || {};
  const method = (opts.method || "GET").toUpperCase();
  const headers = {};
  let body = opts.body;

  if (UNSAFE.includes(method)) {
    await ensureCsrf();
    headers["X-CSRF-Token"] = state.csrfToken;
  }
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }
  const res = await fetch(path, {
    method,
    headers,
    body,
    credentials: "include",
  });
  if (res.status === 401) {
    state.me = null;
    if (!location.hash.startsWith("#/login") && !location.hash.startsWith("#/signup")) {
      location.hash = "#/login";
    }
    throw new Error("Please log in first.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data && data.error) || ("Request failed (" + res.status + ")"));
  return data;
}

const get = (p) => api(p, { method: "GET" });
const post = (p, b) => api(p, { method: "POST", body: b });
const put = (p, b) => api(p, { method: "PUT", body: b });
const del = (p) => api(p, { method: "DELETE" });

// New growth endpoints: degrade gracefully when the backend hasn't added them yet.
function isNotFound(err) {
  return err && /\(404\)/.test(err.message || "");
}

async function getInviteInfo() {
  try {
    const data = await get("/api/invite");
    return data && data.inviteCode ? data : null;
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
}

async function getLeaderboard() {
  try {
    const data = await get("/api/leaderboard");
    return data && Array.isArray(data.leaders) ? data.leaders : null;
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
}

/* ================= page meta (shareable profiles) ================= */

const DEFAULT_META = {
  title: "Glasebook — Cluck with your flock",
  description: "Glasebook is a cozy, original social network. Share clucks, throw eggs at what you love, and grow your flock.",
  image: "",
};

function setMetaTag(attr, key, value) {
  let el = document.querySelector("meta[" + attr + '="' + key + '"]');
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr === "property" ? "property" : "name", key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value || "");
}

function setPageMeta(meta) {
  document.title = meta.title || DEFAULT_META.title;
  setMetaTag("property", "og:title", meta.title || DEFAULT_META.title);
  setMetaTag("property", "og:description", meta.description || DEFAULT_META.description);
  setMetaTag("property", "og:image", meta.image || DEFAULT_META.image);
  setMetaTag("name", "description", meta.description || DEFAULT_META.description);
}

function resetPageMeta() {
  setPageMeta(DEFAULT_META);
}

function profileUrlFor(userId) {
  return location.origin + location.pathname + "#/profile/" + userId;
}

/* ================= nav ================= */

const badgeState = { requests: 0, messages: 0, notifications: 0 };

function renderNav() {
  const nav = document.getElementById("nav");
  if (!state.me) { nav.innerHTML = ""; return; }
  const me = state.me;
  nav.innerHTML =
    '<div class="nav-inner">' +
      '<a class="logo" href="#/feed" aria-label="Glasebook home">' + MASCOT_SVG + "Glasebook</a>" +
      '<div class="search-wrap">' +
        '<span class="search-icon">' + icon("search") + "</span>" +
        '<input id="nav-search" type="text" placeholder="Search the flock" aria-label="Search the flock" autocomplete="off">' +
        '<div class="search-results" id="nav-search-results" style="display:none"></div>' +
      "</div>" +
      '<div class="nav-icons">' +
        navIcon("#/leaderboard", "trophy", "Flock leaderboard", 0, "leaderboard") +
        '<button class="icon-btn" id="invite-btn" title="Invite friends" aria-label="Invite friends">' + icon("gift") + "</button>" +
        navIcon("#/friends", "friends", "Friends", badgeState.requests, "friends") +
        navIcon("#/messages", "chat", "Messages", badgeState.messages, "messages") +
        navIcon("#/notifications", "bell", "Notifications", badgeState.notifications, "notifications") +
        '<div class="profile-menu">' +
          '<img class="nav-avatar" id="nav-avatar" src="' + esc(me.avatarUrl || ("/avatars/default/" + me.id + ".svg")) + '" alt="' + esc(me.name) + '\u2019s profile photo">' +
          '<div class="menu-dropdown" id="menu-dropdown" style="display:none">' +
            '<div class="me"><div class="name">' + esc(me.name) + '</div><div class="email">' + esc(me.email) + "</div></div>" +
            '<button data-go="#/profile/' + esc(String(me.id)) + '">' + icon("user") + " My Profile</button>" +
            '<button data-go="#/leaderboard">' + icon("trophy") + " Leaderboard</button>" +
            '<button id="logout-btn">' + icon("logout") + " Log Out</button>" +
          "</div>" +
        "</div>" +
      "</div>" +
    "</div>";

  const hash = location.hash;
  nav.querySelectorAll(".icon-btn").forEach((b) => {
    const key = b.getAttribute("data-nav");
    if ((key === "friends" && hash.startsWith("#/friends")) ||
        (key === "messages" && hash.startsWith("#/messages")) ||
        (key === "notifications" && hash.startsWith("#/notifications")) ||
        (key === "leaderboard" && hash.startsWith("#/leaderboard"))) {
      b.classList.add("active");
    }
  });

  document.getElementById("invite-btn").addEventListener("click", openInviteModal);

  const avatar = document.getElementById("nav-avatar");
  const dropdown = document.getElementById("menu-dropdown");
  avatar.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
  });
  document.addEventListener("click", function hide(e) {
    if (!dropdown.contains(e.target) && e.target !== avatar) {
      dropdown.style.display = "none";
      document.removeEventListener("click", hide);
    }
  });
  nav.querySelectorAll("[data-go]").forEach((b) =>
    b.addEventListener("click", () => { dropdown.style.display = "none"; location.hash = b.getAttribute("data-go"); })
  );
  document.getElementById("logout-btn").addEventListener("click", async () => {
    try { await post("/api/auth/logout", {}); } catch (e) { /* ignore */ }
    state.me = null;
    renderNav();
    location.hash = "#/login";
  });

  wireSearch();
}

function navIcon(href, iconName, label, badge, key) {
  return (
    '<a class="icon-btn" data-nav="' + key + '" href="' + href + '" title="' + esc(label) + '" aria-label="' + esc(label) + '">' +
    icon(iconName) +
    (badge > 0 ? '<span class="badge">' + esc(String(badge > 99 ? "99+" : badge)) + "</span>" : "") +
    "</a>"
  );
}

async function refreshBadges() {
  if (!state.me) return;
  try {
    const [req, convs, notifs] = await Promise.all([
      get("/api/friends/requests"),
      get("/api/conversations"),
      get("/api/notifications"),
    ]);
    badgeState.requests = (req.incoming || []).length;
    badgeState.messages = (convs.conversations || []).reduce((n, c) => n + (c.unreadCount || 0), 0);
    badgeState.notifications = (notifs.notifications || []).filter((n) => !n.read).length;
  } catch (e) { /* keep old values */ }
  renderNav();
}

function wireSearch() {
  const input = document.getElementById("nav-search");
  const box = document.getElementById("nav-search-results");
  if (!input) return;
  input.addEventListener("input", () => {
    clearTimeout(state.searchTimer);
    const q = input.value.trim();
    if (!q) { box.style.display = "none"; box.innerHTML = ""; return; }
    state.searchTimer = setTimeout(async () => {
      try {
        const data = await get("/api/search?q=" + encodeURIComponent(q));
        const users = data.users || [];
        if (!users.length) {
          box.innerHTML = '<div class="none">Nobody by that name in the flock</div>';
        } else {
          box.innerHTML = users.map((u) =>
            '<a href="#/profile/' + esc(String(u.id)) + '">' +
              avatarFor(u, "avatar avatar-sm") +
              "<span>" + esc(u.name) + "</span>" +
            "</a>"
          ).join("");
        }
        box.style.display = "block";
      } catch (e) { /* ignore */ }
    }, 250);
  });
  input.addEventListener("blur", () => setTimeout(() => { box.style.display = "none"; }, 200));
  input.addEventListener("focus", () => { if (box.innerHTML) box.style.display = "block"; });
}

/* ================= shared bits ================= */

const SILLY_LOADING = [
  "Herding chickens…",
  "Warming up the coop…",
  "Rummaging for eggs…",
  "Fluffing the nest…",
  "Counting eggs…",
];

function spinner(msg) {
  return (
    '<div class="spinner" role="status">' +
    '<div class="mascot-bob">' + MASCOT_SVG + "</div>" +
    "<div>" + esc(msg || SILLY_LOADING[Math.floor(Math.random() * SILLY_LOADING.length)]) + "</div>" +
    "</div>"
  );
}

function emptyState(msg) {
  return (
    '<div class="empty">' +
    '<div class="mascot-calm">' + MASCOT_SVG + "</div>" +
    "<div>" + esc(msg) + "</div>" +
    "</div>"
  );
}

function avatarFor(user, cls) {
  const id = user && user.id != null ? user.id : "0";
  const src = (user && user.avatarUrl) || ("/avatars/default/" + id + ".svg");
  const alt = user && user.name ? user.name + "'s avatar" : "Profile photo";
  return '<img class="' + (cls || "avatar") + '" src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy">';
}

/* ================= router ================= */

const app = document.getElementById("app");

// Static landing markup ships inside index.html (SEO + no-JS fallback). The SPA
// reuses this exact HTML for logged-out visits to #/ so there's a single source.
const STATIC_LANDING_HTML = app.innerHTML;

function renderLanding() {
  document.getElementById("nav").innerHTML = "";
  setPageMeta({
    title: "Glasebook — Cluck with your flock",
    description: "Glasebook is the silly, cozy social network where you cluck your thoughts, throw eggs at what you love, and grow your flock. Free to join — hop in the coop!",
    image: "",
  });
  // Zero API calls: the landing page works with no authentication at all.
  if (!app.querySelector("[data-landing]")) app.innerHTML = STATIC_LANDING_HTML;
}

function route() {
  clearTimers();
  resetPageMeta();
  const hash = location.hash || "#/";
  if (!state.me) {
    if (hash === "#/signup") return renderSignup();
    if (hash === "#/login") return renderLogin();
    return renderLanding(); // public marketing page: #/ and any other logged-out route
  }
  renderNav();
  if (hash === "#/" || hash === "#/feed") return renderFeed();
  if (hash.startsWith("#/profile/")) return renderProfile(hash.slice("#/profile/".length));
  if (hash === "#/friends") return renderFriends();
  if (hash.startsWith("#/messages/")) return renderThread(hash.slice("#/messages/".length));
  if (hash === "#/messages") return renderMessages(null);
  if (hash === "#/notifications") return renderNotifications();
  if (hash === "#/leaderboard") return renderLeaderboard();
  if (hash === "#/onboarding") return renderOnboarding();
  if (hash === "#/login") return renderFeed(); // already logged in
  if (hash === "#/signup") return renderFeed();
  return renderFeed();
}

window.addEventListener("hashchange", route);

/* ================= auth screens ================= */

function authShell(inner, title, subtitle) {
  app.innerHTML =
    '<div class="auth-wrap">' +
      '<div class="auth-brand">' + MASCOT_SVG + "<h1>Glasebook</h1><p>" + esc(subtitle || "A cozy little corner of the internet to cluck with your flock.") + "</p></div>" +
      '<div class="card auth-card"><h2>' + esc(title) + "</h2>" + inner + "</div>" +
    "</div>";
}

function renderLogin() {
  document.getElementById("nav").innerHTML = "";
  resetPageMeta();
  authShell(
    '<div class="form-error" id="form-error"></div>' +
    '<form id="login-form">' +
      '<div class="field"><label for="login-email">Email</label><input id="login-email" type="email" name="email" required autocomplete="email"></div>' +
      '<div class="field"><label for="login-password">Password</label><input id="login-password" type="password" name="password" required autocomplete="current-password"></div>' +
      '<button class="btn btn-primary btn-block" type="submit">Log In</button>' +
    "</form>" +
    '<div class="auth-switch">New to Glasebook? <a href="#/signup">Join the flock</a></div>',
    "Log In"
  );
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("form-error");
    err.textContent = "";
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    try {
      const email = e.target.email.value.trim();
      const password = e.target.password.value;
      const data = await post("/api/auth/login", { email, password });
      state.me = data.user;
      await refreshBadges();
      toast("Welcome back, " + state.me.name + "!", "success");
      location.hash = "#/feed";
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      btn.disabled = false;
    }
  });
}

function renderSignup() {
  document.getElementById("nav").innerHTML = "";
  resetPageMeta();
  // Capture ?ref= invite code from the URL (e.g. /?ref=ABC123#/signup).
  const params = new URLSearchParams(location.search || "");
  const refCode = (params.get("ref") || "").trim();
  state.inviteCode = refCode || null;

  authShell(
    (refCode
      ? '<div class="ref-banner">' + icon("gift") + "<span>You were invited to the flock! Your inviter earns a spot toward the leaderboard.</span></div>"
      : "") +
    '<div class="form-error" id="form-error"></div>' +
    '<form id="signup-form">' +
      '<div class="field"><label for="signup-name">Name</label><input id="signup-name" type="text" name="name" required maxlength="60" autocomplete="name"></div>' +
      '<div class="field"><label for="signup-email">Email</label><input id="signup-email" type="email" name="email" required autocomplete="email"></div>' +
      '<div class="field"><label for="signup-password">Password (8+ characters)</label><input id="signup-password" type="password" name="password" required minlength="8" autocomplete="new-password"></div>' +
      '<button class="btn btn-primary btn-block" type="submit">Sign Up</button>' +
    "</form>" +
    '<div class="auth-switch">Already in the flock? <a href="#/login">Log in</a></div>',
    "Join the flock"
  );
  document.getElementById("signup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("form-error");
    err.textContent = "";
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    try {
      const name = e.target.name.value.trim();
      const email = e.target.email.value.trim();
      const password = e.target.password.value;
      const payload = { name, email, password };
      if (state.inviteCode) payload.inviteCode = state.inviteCode;
      const data = await post("/api/auth/signup", payload);
      state.me = data.user;
      state.inviteCode = null;
      await refreshBadges();
      location.hash = "#/onboarding";
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      btn.disabled = false;
    }
  });
}

/* ================= onboarding (post-signup growth) ================= */

async function renderOnboarding() {
  setPageMeta({ title: "Welcome to the flock! | Glasebook" });
  app.innerHTML =
    '<div class="onboard-wrap">' + MASCOT_SVG.replace('aria-hidden="true"', 'aria-hidden="true" class="mascot"') +
      "<h1>Welcome to the flock!</h1>" +
      '<p class="lead">Your coop is ready, ' + esc(state.me.name.split(" ")[0]) + ". Glasebook is more fun with friends — " +
      "invite yours now and climb the flock leaderboard.</p>" +
      '<div class="invite-box" id="onboard-invite">' + spinner("Fetching your invite link…") + "</div>" +
      '<a class="btn btn-primary btn-block" href="#/feed">Start clucking</a>' +
      '<div style="margin-top:10px"><a href="#/leaderboard" style="font-size:14px">Peek at the leaderboard</a></div>' +
    "</div>";

  const box = document.getElementById("onboard-invite");
  try {
    const info = await getInviteInfo();
    if (!info) {
      box.innerHTML = '<div class="loading-line">Invite links are hatching — check back soon!</div>';
      return;
    }
    box.innerHTML = inviteLinkHTML(info);
    wireInviteBox(box, info);
  } catch (e) {
    box.innerHTML = '<div class="loading-line">Couldn\'t load your invite link: ' + esc(e.message) + "</div>";
  }
}

function inviteLinkHTML(info) {
  return (
    '<div style="font-weight:700;margin-bottom:4px">' + icon("gift") + ' Your invite link</div>' +
    '<div style="font-size:13px;color:var(--soil-muted)">Friends who join with it count toward your leaderboard spot.</div>' +
    '<div class="invite-link-row">' +
      '<input type="text" id="invite-url" aria-label="Your invite link" readonly value="' + esc(info.inviteUrl || "") + '">' +
      '<button class="btn btn-gold" id="invite-copy">' + icon("copy") + " Copy</button>" +
    "</div>" +
    '<div class="invite-stats">' +
      '<div class="stat-chip"><b id="invite-count">…</b>friends joined</div>' +
      '<div class="stat-chip"><b>' + esc(info.inviteCode || "—") + "</b>your code</div>" +
    "</div>"
  );
}

async function wireInviteBox(box, info) {
  const input = box.querySelector("#invite-url");
  const copyBtn = box.querySelector("#invite-copy");
  if (copyBtn && input) {
    copyBtn.addEventListener("click", () => {
      input.select();
      copyText(input.value);
    });
  }
  // Derive the user's invite count from the public leaderboard, if available.
  const countEl = box.querySelector("#invite-count");
  if (countEl) {
    try {
      const leaders = await getLeaderboard();
      const mine = state.me && (leaders || []).find((l) => l.user && String(l.user.id) === String(state.me.id));
      countEl.textContent = mine ? String(mine.inviteCount || 0) : "0";
    } catch (e) {
      countEl.textContent = "0";
    }
  }
}

/* ================= invite modal ================= */

// Shared modal wiring: click-backdrop to close, Escape to close, focus first control.
function wireModal(backId, close, focusSelector) {
  document.getElementById(backId).addEventListener("click", (e) => {
    if (e.target.id === backId) close();
  });
  const onKey = (e) => {
    if (e.key === "Escape") {
      close();
      document.removeEventListener("keydown", onKey);
    }
  };
  document.addEventListener("keydown", onKey);
  if (focusSelector) {
    setTimeout(() => {
      const el = document.querySelector(focusSelector);
      if (el) el.focus();
    }, 60);
  }
}

async function openInviteModal() {
  const root = document.getElementById("modal-root");
  root.innerHTML =
    '<div class="modal-back" id="modal-back">' +
      '<div class="modal" role="dialog" aria-label="Invite friends">' +
        "<h3>Invite friends to the flock</h3>" +
        '<div id="invite-modal-body">' + spinner("Fetching your invite link…") + "</div>" +
        '<div class="btn-row"><button class="btn btn-secondary" id="invite-close">Close</button></div>' +
      "</div>" +
    "</div>";

  const close = () => { root.innerHTML = ""; };
  wireModal("modal-back", close, "#invite-close");
  document.getElementById("invite-close").addEventListener("click", close);

  const body = document.getElementById("invite-modal-body");
  try {
    const info = await getInviteInfo();
    if (!info) {
      body.innerHTML = emptyState("Invite links are hatching — check back soon!");
      return;
    }
    body.innerHTML = inviteLinkHTML(info) +
      '<div style="margin-top:10px"><a href="#/leaderboard">See the flock leaderboard</a></div>';
    wireInviteBox(body, info);
    body.querySelector("a[href='#/leaderboard']").addEventListener("click", close);
  } catch (e) {
    body.innerHTML = emptyState("Couldn't load your invite link: " + e.message);
  }
}

/* ================= leaderboard ================= */

async function renderLeaderboard() {
  setPageMeta({ title: "Flock leaderboard | Glasebook" });
  app.innerHTML =
    '<div class="feed-col">' +
      "<h2 class=\"section-title\" style=\"margin-top:0\">" + icon("trophy") + " Flock leaderboard</h2>" +
      '<p style="color:var(--soil-muted);margin-bottom:14px;font-size:14px">The top inviters on Glasebook. Bring your friends and claim your perch!</p>' +
      '<div id="leaderboard-body">' + spinner() + "</div>" +
      '<div class="card" style="text-align:center">' +
        '<button class="btn btn-gold" id="lb-invite-btn">' + icon("gift") + " Invite friends</button>" +
      "</div>" +
    "</div>";

  document.getElementById("lb-invite-btn").addEventListener("click", openInviteModal);

  const body = document.getElementById("leaderboard-body");
  try {
    const leaders = await getLeaderboard();
    if (!leaders) {
      body.innerHTML = '<div class="card">' + emptyState("The leaderboard is hatching — check back soon!") + "</div>";
      return;
    }
    if (!leaders.length) {
      body.innerHTML = '<div class="card">' + emptyState("No inviters yet — be the first to grow the flock!") + "</div>";
      return;
    }
    body.innerHTML = '<div class="card">' + leaders.map((l, i) => {
      const u = l.user || {};
      const rankCls = i === 0 ? " r1" : i === 1 ? " r2" : i === 2 ? " r3" : "";
      return (
        '<div class="leader-row">' +
          '<div class="rank' + rankCls + '">' + (i + 1) + "</div>" +
          '<a href="#/profile/' + esc(String(u.id)) + '">' + avatarFor(u) + "</a>" +
          '<div class="info"><div class="name"><a href="#/profile/' + esc(String(u.id)) + '" style="color:inherit">' + esc(u.name || "Unknown") + "</a></div></div>" +
          '<div class="count"><b>' + esc(String(l.inviteCount || 0)) + "</b> invite" + ((l.inviteCount || 0) === 1 ? "" : "s") + "</div>" +
        "</div>"
      );
    }).join("") + "</div>";
  } catch (e) {
    body.innerHTML = '<div class="card">' + emptyState("Couldn't load the leaderboard: " + e.message) + "</div>";
  }
}

/* ================= feed ================= */

let composerFile = null;

function renderFeed() {
  setPageMeta({ title: "Glasebook — Cluck with your flock" });
  app.innerHTML =
    '<div class="feed-col">' +
      '<div class="card composer">' +
        '<div class="card-header">' + avatarFor(state.me) +
          '<div class="who"><div class="name">' + esc(state.me.name) + "</div></div>" +
        "</div>" +
        '<form id="composer-form">' +
          '<textarea name="text" aria-label="What\u2019s cluckin\u2019?" placeholder="What\'s cluckin\'?" maxlength="2000" required></textarea>' +
          '<img class="preview-img" id="composer-preview" style="display:none" alt="Photo preview">' +
          '<div class="row">' +
            '<label class="file-label">' + icon("camera") + ' Photo<input type="file" id="composer-file" accept="image/*"></label>' +
            '<span style="flex:1"></span>' +
            '<button class="btn btn-primary" type="submit">Cluck</button>' +
          "</div>" +
        "</form>" +
      '</div>' +
      '<div id="feed-posts">' + spinner() + "</div>" +
    "</div>";

  composerFile = null;
  const fileInput = document.getElementById("composer-file");
  const preview = document.getElementById("composer-preview");
  fileInput.addEventListener("change", () => {
    composerFile = fileInput.files[0] || null;
    if (composerFile) {
      if (composerFile.size > 5 * 1024 * 1024) {
        toast("Image must be 5MB or less.", "error");
        fileInput.value = "";
        composerFile = null;
        preview.style.display = "none";
        return;
      }
      preview.src = URL.createObjectURL(composerFile);
      preview.style.display = "block";
    } else {
      preview.style.display = "none";
    }
  });

  document.getElementById("composer-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = e.target.text.value.trim();
    if (!text && !composerFile) { toast("Write something or add a photo first.", "error"); return; }
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const form = new FormData();
      form.append("text", text || " ");
      if (composerFile) form.append("file", composerFile);
      const data = await post("/api/posts", form);
      toast("Clucked!", "success");
      e.target.reset();
      composerFile = null;
      preview.style.display = "none";
      const list = document.getElementById("feed-posts");
      list.insertAdjacentHTML("afterbegin", postCardHTML(data.post));
      const newCard = list.firstElementChild;
      if (newCard) newCard.classList.add("post-new");
      wirePostCard(list.firstElementChild, data.post);
      refreshBadges();
    } catch (ex) {
      toast(ex.message, "error");
    } finally {
      btn.disabled = false;
    }
  });

  loadFeed();
  every(60000, loadFeed); // refresh feed minutely
}

async function loadFeed() {
  const list = document.getElementById("feed-posts");
  if (!list) return;
  try {
    const data = await get("/api/feed");
    const posts = data.posts || [];
    if (!posts.length) {
      list.innerHTML = emptyState("This coop is quiet… cluck something or find your flock!");
      return;
    }
    list.innerHTML = posts.map(postCardHTML).join("");
    Array.from(list.children).forEach((el) => {
      const post = posts.find((p) => String(p.id) === el.getAttribute("data-post-id"));
      if (post) wirePostCard(el, post);
    });
  } catch (e) {
    list.innerHTML = emptyState("Couldn't load the feed: " + e.message);
  }
}

function postCardHTML(p) {
  const mine = state.me && String(p.author.id) === String(state.me.id);
  return (
    '<div class="card post-card" data-post-id="' + esc(String(p.id)) + '">' +
      '<div class="card-header">' +
        '<a href="#/profile/' + esc(String(p.author.id)) + '" aria-label="' + esc(p.author.name) + '\u2019s profile">' + avatarFor(p.author) + "</a>" +
        '<div class="who">' +
          '<div class="name"><a href="#/profile/' + esc(String(p.author.id)) + '" style="color:inherit">' + esc(p.author.name) + "</a></div>" +
          '<div class="time"><time datetime="' + esc(p.createdAt || "") + '">' + esc(timeAgo(p.createdAt)) + "</time></div>" +
        "</div>" +
        (mine ? '<button class="delete-btn" data-del title="Delete cluck" aria-label="Delete cluck">' + icon("trash") + "</button>" : "") +
      "</div>" +
      (p.promoted ? '<div class="post-badges"><span class="badge-pill badge-promoted">' + icon("megaphone") + " Promoted</span></div>" : "") +
      '<div class="post-text">' + esc(p.text) + "</div>" +
      (p.imageUrl ? '<img class="post-image" src="' + esc(p.imageUrl) + '" alt="cluck image" loading="lazy">' : "") +
      '<div class="post-actions">' +
        '<button class="action-btn peck-btn' + (p.likedByMe ? " pecked" : "") + '">' +
          icon("egg") +
          '<span class="peck-label">' + (p.likedByMe ? "Egged \uD83E\uDD5A" : "Throw an egg \uD83E\uDD5A") + '</span> <span class="peck-count">(' + esc(String(p.likeCount || 0)) + ")</span>" +
        "</button>" +
        '<button class="action-btn comment-toggle">' + icon("comment") + ' <span>Comment</span> <span class="comment-count">(' + esc(String(p.commentCount || 0)) + ")</span></button>" +
      "</div>" +
      '<div class="comments" style="display:none">' +
        '<div class="comment-list"><div class="loading-line">Loading comments…</div></div>' +
        '<form class="comment-form"><input type="text" aria-label="Write a comment" placeholder="Write a comment…" maxlength="500" required>' +
        '<button class="btn btn-primary" type="submit">Send</button></form>' +
      "</div>" +
    "</div>"
  );
}

function wirePostCard(el, post) {
  const postId = post.id;

  const delBtn = el.querySelector("[data-del]");
  if (delBtn) {
    delBtn.addEventListener("click", async () => {
      if (!confirm("Delete this cluck? This can't be undone.")) return;
      try {
        await del("/api/posts/" + encodeURIComponent(postId));
        el.remove();
        toast("Cluck deleted.", "success");
      } catch (e) { toast(e.message, "error"); }
    });
  }

  const peckBtn = el.querySelector(".peck-btn");
  peckBtn.addEventListener("click", async () => {
    peckBtn.disabled = true;
    try {
      const data = post.likedByMe
        ? await del("/api/posts/" + encodeURIComponent(postId) + "/like")
        : await post("/api/posts/" + encodeURIComponent(postId) + "/like", {});
      post.likedByMe = data.liked;
      post.likeCount = data.likeCount;
      peckBtn.classList.toggle("pecked", data.liked);
      peckBtn.querySelector(".peck-label").textContent = data.liked ? "Egged \uD83E\uDD5A" : "Throw an egg \uD83E\uDD5A";
      el.querySelector(".peck-count").textContent = "(" + data.likeCount + ")";
      if (data.liked) {
        // little celebratory chicken bounce
        peckBtn.classList.remove("peck-pop");
        void peckBtn.offsetWidth; // restart the animation
        peckBtn.classList.add("peck-pop");
        setTimeout(() => peckBtn.classList.remove("peck-pop"), 380);
      }
    } catch (e) { toast(e.message, "error"); }
    finally { peckBtn.disabled = false; }
  });

  const toggle = el.querySelector(".comment-toggle");
  const commentsBox = el.querySelector(".comments");
  const commentList = el.querySelector(".comment-list");
  let loaded = false;

  toggle.addEventListener("click", async () => {
    const open = commentsBox.style.display !== "none";
    commentsBox.style.display = open ? "none" : "block";
    if (!open && !loaded) {
      loaded = true;
      try {
        const data = await get("/api/posts/" + encodeURIComponent(postId) + "/comments");
        const comments = data.comments || [];
        post.commentCount = comments.length;
        el.querySelector(".comment-count").textContent = "(" + comments.length + ")";
        commentList.innerHTML = comments.length
          ? comments.map(commentHTML).join("")
          : '<div class="loading-line">No comments yet. Be the first!</div>';
      } catch (e) {
        commentList.innerHTML = '<div class="loading-line">Couldn\'t load comments.</div>';
        loaded = false;
      }
    }
  });

  el.querySelector(".comment-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = e.target.querySelector("input");
    const text = input.value.trim();
    if (!text) return;
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    try {
      const data = await post("/api/posts/" + encodeURIComponent(postId) + "/comments", { text });
      input.value = "";
      const noneMsg = commentList.querySelector(".loading-line");
      if (noneMsg) noneMsg.remove();
      commentList.insertAdjacentHTML("beforeend", commentHTML(data.comment));
      post.commentCount = (post.commentCount || 0) + 1;
      el.querySelector(".comment-count").textContent = "(" + post.commentCount + ")";
    } catch (ex) { toast(ex.message, "error"); }
    finally { btn.disabled = false; }
  });
}

function commentHTML(c) {
  return (
    '<div class="comment">' +
      '<a href="#/profile/' + esc(String(c.author.id)) + '">' + avatarFor(c.author, "avatar avatar-sm") + "</a>" +
      '<div class="bubble"><div class="cname">' + esc(c.author.name) + '</div><div class="ctext">' + esc(c.text) + "</div></div>" +
    "</div>" +
    '<div class="ctime"><time datetime="' + esc(c.createdAt || "") + '">' + esc(timeAgo(c.createdAt)) + "</time></div>"
  );
}

/* ================= profile ================= */

async function renderProfile(userId) {
  app.innerHTML = spinner();
  try {
    const data = await get("/api/profile/" + encodeURIComponent(userId));
    const u = data.user;
    const isMe = state.me && String(state.me.id) === String(u.id);
    const avatarSrc = u.avatarUrl || ("/avatars/default/" + u.id + ".svg");
    const coverInner = u.coverUrl ? '<img src="' + esc(u.coverUrl) + '" alt="' + esc(u.name) + '\u2019s cover photo">' : "";

    // Shareable profile: dynamic preview metadata.
    const absAvatar = new URL(avatarSrc, location.href).href;
    const friendsN = data.friendsCount || 0;
    setPageMeta({
      title: u.name + " | Glasebook",
      description: u.bio ? String(u.bio).slice(0, 160) : u.name + " has " + friendsN + " friend" + (friendsN === 1 ? "" : "s") + " on Glasebook.",
      image: absAvatar,
    });

    let actions = "";
    if (isMe) {
      actions = '<button class="btn btn-secondary" id="edit-profile-btn">' + icon("pencil") + " Edit Profile</button>";
    } else {
      const fs = (data.friendshipStatus || "none").toLowerCase();
      if (fs === "friends") {
        actions =
          '<button class="btn btn-secondary" id="msg-btn">' + icon("chat") + " Message</button>" +
          '<button class="btn btn-secondary" id="unfriend-btn">' + icon("check") + " Friends</button>";
      } else if (fs === "incoming") {
        actions =
          '<button class="btn btn-primary" id="accept-btn">' + icon("check") + " Accept Request</button>" +
          '<button class="btn btn-secondary" id="decline-btn">' + icon("x") + " Decline</button>";
      } else if (fs === "outgoing") {
        actions = '<button class="btn btn-secondary" disabled>Request Sent</button>';
      } else {
        actions = '<button class="btn btn-primary" id="addfriend-btn">' + icon("plus") + " Add Friend</button>";
      }
      // Message anyone, per contract ("must be friends? NO")
      if (fs !== "friends") actions += '<button class="btn btn-secondary" id="msg-btn">' + icon("chat") + " Message</button>";
    }
    actions += '<button class="btn btn-secondary" id="share-profile-btn">' + icon("share") + " Share profile</button>";

    app.innerHTML =
      '<div class="feed-col" style="max-width:900px">' +
        '<div class="card" style="padding:0;overflow:hidden">' +
          '<div class="cover">' + coverInner + "</div>" +
          '<div class="profile-head">' +
            '<div class="profile-ava-row"><img class="profile-avatar" src="' + esc(avatarSrc) + '" alt="' + esc(u.name) + '\u2019s avatar"></div>' +
            "<h2>" + esc(u.name) +
              (u.premium ? ' <span class="badge-pill badge-premium">' + icon("star") + " Premium</span>" : "") +
            "</h2>" +
            (u.bio ? '<div class="bio">' + esc(u.bio) + "</div>" : "") +
            '<div class="fcount">' + esc(String(friendsN)) + " friends</div>" +
            '<div class="profile-actions">' + actions + "</div>" +
          "</div>" +
        "</div>" +
        '<div class="section-title">Clucks</div>' +
        '<div id="profile-posts">' + spinner() + "</div>" +
      "</div>";

    document.getElementById("share-profile-btn").addEventListener("click", () => {
      copyText(profileUrlFor(u.id));
    });

    if (isMe) {
      document.getElementById("edit-profile-btn").addEventListener("click", () => openEditModal(u));
    } else {
      const addBtn = document.getElementById("addfriend-btn");
      if (addBtn) addBtn.addEventListener("click", async () => {
        addBtn.disabled = true;
        try {
          await post("/api/friends/request/" + encodeURIComponent(userId), {});
          toast("Friend request sent!", "success");
          renderProfile(userId);
        } catch (e) { toast(e.message, "error"); addBtn.disabled = false; }
      });
      const accBtn = document.getElementById("accept-btn");
      if (accBtn) accBtn.addEventListener("click", () => acceptRequestFrom(userId).then(() => renderProfile(userId)));
      const decBtn = document.getElementById("decline-btn");
      if (decBtn) decBtn.addEventListener("click", () => declineRequestFrom(userId).then(() => renderProfile(userId)));
      const unBtn = document.getElementById("unfriend-btn");
      if (unBtn) unBtn.addEventListener("click", async () => {
        if (!confirm("Unfriend " + u.name + "?")) return;
        try {
          await del("/api/friends/" + encodeURIComponent(userId));
          toast("Unfriended.", "success");
          renderProfile(userId);
        } catch (e) { toast(e.message, "error"); }
      });
      const msgBtn = document.getElementById("msg-btn");
      if (msgBtn) msgBtn.addEventListener("click", async () => {
        try {
          const c = await post("/api/conversations", { userId: u.id });
          location.hash = "#/messages/" + c.conversation.id;
        } catch (e) { toast(e.message, "error"); }
      });
    }

    loadProfilePosts(userId);
  } catch (e) {
    app.innerHTML = emptyState("Couldn't load this profile: " + e.message);
  }
}

async function loadProfilePosts(userId) {
  const list = document.getElementById("profile-posts");
  if (!list) return;
  try {
    const data = await get("/api/profile/" + encodeURIComponent(userId) + "/posts");
    const posts = data.posts || [];
    if (!posts.length) { list.innerHTML = emptyState("No clucks yet."); return; }
    list.innerHTML = posts.map(postCardHTML).join("");
    Array.from(list.children).forEach((el) => {
      const p = posts.find((x) => String(x.id) === el.getAttribute("data-post-id"));
      if (p) wirePostCard(el, p);
    });
  } catch (e) {
    list.innerHTML = emptyState("Couldn't load clucks: " + e.message);
  }
}

// Find the incoming request id from a given user, then accept / decline.
async function findIncomingRequestId(fromUserId) {
  const data = await get("/api/friends/requests");
  const req = (data.incoming || []).find((r) => String(r.from.id) === String(fromUserId));
  return req ? req.id : null;
}

async function acceptRequestFrom(fromUserId) {
  try {
    const rid = await findIncomingRequestId(fromUserId);
    if (!rid) throw new Error("Request not found.");
    await post("/api/friends/accept/" + encodeURIComponent(rid), {});
    toast("Friend request accepted!", "success");
    refreshBadges();
  } catch (e) { toast(e.message, "error"); }
}

async function declineRequestFrom(fromUserId) {
  try {
    const rid = await findIncomingRequestId(fromUserId);
    if (!rid) throw new Error("Request not found.");
    await post("/api/friends/decline/" + encodeURIComponent(rid), {});
    toast("Request declined.", "success");
    refreshBadges();
  } catch (e) { toast(e.message, "error"); }
}

function openEditModal(u) {
  const root = document.getElementById("modal-root");
  const avatarSrc = u.avatarUrl || ("/avatars/default/" + u.id + ".svg");
  root.innerHTML =
    '<div class="modal-back" id="modal-back">' +
      '<div class="modal" role="dialog" aria-label="Edit profile">' +
        "<h3>Edit Profile</h3>" +
        '<form id="edit-form">' +
          '<div class="upload-previews">' +
            '<div class="up av"><img id="pv-avatar" src="' + esc(avatarSrc) + '" alt="Avatar preview">Avatar</div>' +
            '<div class="up"><img id="pv-cover" src="' + esc(u.coverUrl || "") + '" alt="Cover preview" style="' + (u.coverUrl ? "" : "display:none") + '">Cover</div>' +
          "</div>" +
          '<div class="field"><label for="edit-name">Name</label><input id="edit-name" type="text" name="name" value="' + esc(u.name) + '" maxlength="60" required></div>' +
          '<div class="field"><label for="edit-bio">Bio</label><textarea id="edit-bio" name="bio" maxlength="500" placeholder="Tell the flock about yourself…">' + esc(u.bio || "") + "</textarea></div>" +
          '<div class="field"><label for="up-avatar">Avatar photo</label><input type="file" id="up-avatar" accept="image/*"></div>' +
          '<div class="field"><label for="up-cover">Cover photo</label><input type="file" id="up-cover" accept="image/*"></div>' +
          '<div class="form-error" id="edit-error"></div>' +
          '<div class="btn-row">' +
            '<button type="button" class="btn btn-secondary" id="edit-cancel">Cancel</button>' +
            '<button type="submit" class="btn btn-primary">Save</button>' +
          "</div>" +
        "</form>" +
      "</div>" +
    "</div>";

  const close = () => { root.innerHTML = ""; };
  wireModal("modal-back", close, "#edit-form input[name=name]");
  document.getElementById("edit-cancel").addEventListener("click", close);

  document.getElementById("edit-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("edit-error");
    err.textContent = "";
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const name = e.target.name.value.trim();
      const bio = e.target.bio.value.trim();

      const upA = document.getElementById("up-avatar").files[0];
      if (upA) {
        if (upA.size > 5 * 1024 * 1024) throw new Error("Avatar must be 5MB or less.");
        const f = new FormData(); f.append("file", upA);
        const r = await post("/api/upload/avatar", f);
        document.getElementById("pv-avatar").src = r.avatarUrl;
      }
      const upC = document.getElementById("up-cover").files[0];
      if (upC) {
        if (upC.size > 5 * 1024 * 1024) throw new Error("Cover must be 5MB or less.");
        const f = new FormData(); f.append("file", upC);
        const r = await post("/api/upload/cover", f);
        const pv = document.getElementById("pv-cover");
        pv.src = r.coverUrl; pv.style.display = "block";
      }

      const data = await put("/api/profile", { name, bio });
      state.me = Object.assign({}, state.me, data.user);
      renderNav();
      toast("Profile updated!", "success");
      close();
      renderProfile(u.id);
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      btn.disabled = false;
    }
  });
}

/* ================= friends ================= */

let friendsTab = "friends";

function renderFriends() {
  setPageMeta({ title: "Friends | Glasebook" });
  app.innerHTML =
    '<div class="feed-col">' +
      '<div class="tabs">' +
        '<button class="tab' + (friendsTab === "friends" ? " active" : "") + '" data-tab="friends">Friends</button>' +
        '<button class="tab' + (friendsTab === "requests" ? " active" : "") + '" data-tab="requests">Requests</button>' +
        '<button class="tab' + (friendsTab === "search" ? " active" : "") + '" data-tab="search">Find People</button>' +
      "</div>" +
      '<div id="friends-body">' + spinner() + "</div>" +
    "</div>";

  app.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => { friendsTab = t.getAttribute("data-tab"); renderFriends(); })
  );

  if (friendsTab === "friends") loadFriendsList();
  else if (friendsTab === "requests") loadRequests();
  else loadPeopleSearch();
}

async function loadFriendsList() {
  const body = document.getElementById("friends-body");
  try {
    const data = await get("/api/friends");
    const friends = data.friends || [];
    if (!friends.length) { body.innerHTML = emptyState("No friends yet — go find your flock!"); return; }
    body.innerHTML = '<div class="card">' + friends.map((f) =>
      '<div class="row-item">' +
        '<a href="#/profile/' + esc(String(f.id)) + '">' + avatarFor(f) + "</a>" +
        '<div class="info"><div class="name"><a href="#/profile/' + esc(String(f.id)) + '" style="color:inherit">' + esc(f.name) + "</a></div>" +
        (f.bio ? '<div class="sub">' + esc(f.bio) + "</div>" : "") + "</div>" +
        '<div class="acts"><button class="btn btn-secondary" data-msg="' + esc(String(f.id)) + '" aria-label="Message">' + icon("chat") + "</button>" +
        '<button class="btn btn-secondary" data-unfriend="' + esc(String(f.id)) + '" data-name="' + esc(f.name) + '">Unfriend</button></div>' +
      "</div>"
    ).join("") + "</div>";

    body.querySelectorAll("[data-unfriend]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Unfriend " + b.getAttribute("data-name") + "?")) return;
        try {
          await del("/api/friends/" + encodeURIComponent(b.getAttribute("data-unfriend")));
          toast("Unfriended.", "success");
          loadFriendsList();
        } catch (e) { toast(e.message, "error"); }
      })
    );
    body.querySelectorAll("[data-msg]").forEach((b) =>
      b.addEventListener("click", async () => {
        try {
          const c = await post("/api/conversations", { userId: b.getAttribute("data-msg") });
          location.hash = "#/messages/" + c.conversation.id;
        } catch (e) { toast(e.message, "error"); }
      })
    );
  } catch (e) {
    body.innerHTML = emptyState("Couldn't load friends: " + e.message);
  }
}

async function loadRequests() {
  const body = document.getElementById("friends-body");
  try {
    const data = await get("/api/friends/requests");
    const incoming = data.incoming || [];
    const outgoing = data.outgoing || [];
    let html = "";
    if (!incoming.length && !outgoing.length) {
      body.innerHTML = emptyState("No friend requests right now — the henhouse is calm.");
      return;
    }
    if (incoming.length) {
      html += '<div class="section-title">Incoming</div><div class="card">' + incoming.map((r) =>
        '<div class="row-item">' +
          '<a href="#/profile/' + esc(String(r.from.id)) + '">' + avatarFor(r.from) + "</a>" +
          '<div class="info"><div class="name"><a href="#/profile/' + esc(String(r.from.id)) + '" style="color:inherit">' + esc(r.from.name) + "</a></div>" +
          '<div class="sub">' + esc(timeAgo(r.createdAt)) + " ago</div></div>" +
          '<div class="acts">' +
            '<button class="btn btn-primary" data-accept="' + esc(String(r.id)) + '">' + icon("check") + " Accept</button>" +
            '<button class="btn btn-secondary" data-decline="' + esc(String(r.id)) + '">' + icon("x") + " Decline</button>" +
          "</div>" +
        "</div>"
      ).join("") + "</div>";
    }
    if (outgoing.length) {
      html += '<div class="section-title">Sent (' + esc(String(outgoing.length)) + ")</div>" +
        '<div class="card"><div class="loading-line">You have ' + esc(String(outgoing.length)) + " pending sent request(s).</div></div>";
    }
    body.innerHTML = html;

    body.querySelectorAll("[data-accept]").forEach((b) =>
      b.addEventListener("click", async () => {
        try {
          await post("/api/friends/accept/" + encodeURIComponent(b.getAttribute("data-accept")), {});
          toast("New friend in the flock!", "success");
          refreshBadges();
          loadRequests();
        } catch (e) { toast(e.message, "error"); }
      })
    );
    body.querySelectorAll("[data-decline]").forEach((b) =>
      b.addEventListener("click", async () => {
        try {
          await post("/api/friends/decline/" + encodeURIComponent(b.getAttribute("data-decline")), {});
          toast("Request declined.", "success");
          refreshBadges();
          loadRequests();
        } catch (e) { toast(e.message, "error"); }
      })
    );
  } catch (e) {
    body.innerHTML = emptyState("Couldn't load requests: " + e.message);
  }
}

function loadPeopleSearch() {
  const body = document.getElementById("friends-body");
  body.innerHTML =
    '<div class="card"><div class="field"><label for="people-q">Search by name</label>' +
    '<input type="text" id="people-q" placeholder="Type a name…" autocomplete="off"></div>' +
    '<div id="people-results"></div></div>';
  const input = document.getElementById("people-q");
  const results = document.getElementById("people-results");
  let timer = null;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (!q) { results.innerHTML = ""; return; }
    timer = setTimeout(async () => {
      results.innerHTML = spinner("Searching…");
      try {
        const data = await get("/api/search?q=" + encodeURIComponent(q));
        const users = (data.users || []).filter((u) => String(u.id) !== String(state.me.id));
        results.innerHTML = users.length
          ? users.map((u) =>
              '<div class="row-item">' +
                '<a href="#/profile/' + esc(String(u.id)) + '">' + avatarFor(u) + "</a>" +
                '<div class="info"><div class="name"><a href="#/profile/' + esc(String(u.id)) + '" style="color:inherit">' + esc(u.name) + "</a></div></div>" +
                '<div class="acts"><a class="btn btn-secondary" href="#/profile/' + esc(String(u.id)) + '">View</a></div>' +
              "</div>"
            ).join("")
          : emptyState("Nobody by that name in the flock.");
      } catch (e) {
        results.innerHTML = emptyState("Search failed: " + e.message);
      }
    }, 300);
  });
  input.focus();
}

/* ================= messages ================= */

function renderMessages(activeId) {
  setPageMeta({ title: "Messages | Glasebook" });
  app.innerHTML =
    '<div class="msg-layout">' +
      '<div class="card conv-list" id="conv-list">' + spinner() + "</div>" +
      '<div class="card thread thread-hidden" id="thread">' + (activeId ? "" : '<div class="empty-thread">Select a conversation ' + icon("chat") + "</div>") + "</div>" +
    "</div>";
  loadConversations(activeId);
}

async function loadConversations(activeId) {
  const list = document.getElementById("conv-list");
  if (!list) return;
  try {
    const data = await get("/api/conversations");
    const convs = data.conversations || [];
    if (!convs.length) {
      list.innerHTML = emptyState("No conversations yet. Visit a friend's profile to message them!");
      return;
    }
    list.innerHTML = convs.map((c) => {
      const other = c.otherUser || {};
      const last = c.lastMessage;
      return (
        '<button class="conv-item' + (String(c.id) === String(activeId) ? " active" : "") + (c.unreadCount > 0 ? " unread" : "") + '" data-conv="' + esc(String(c.id)) + '">' +
          avatarFor(other) +
          '<div class="info"><div class="top"><span class="name">' + esc(other.name || "Unknown") + "</span>" +
          (last ? '<span class="time">' + esc(timeAgo(last.createdAt)) + "</span>" : "") + "</div>" +
          '<div class="preview">' + (last ? esc(last.text) : "<i>No messages yet</i>") + "</div></div>" +
          (c.unreadCount > 0 ? '<span class="badge" style="position:static">' + esc(String(c.unreadCount)) + "</span>" : "") +
        "</button>"
      );
    }).join("");
    list.querySelectorAll("[data-conv]").forEach((b) =>
      b.addEventListener("click", () => { location.hash = "#/messages/" + b.getAttribute("data-conv"); })
    );
  } catch (e) {
    list.innerHTML = emptyState("Couldn't load conversations: " + e.message);
  }
  every(10000, () => loadConversations(activeId));
}

let threadLastId = 0;
let threadAppending = false;

async function renderThread(convId) {
  setPageMeta({ title: "Messages | Glasebook" });
  // mobile: show thread, hide list
  app.innerHTML =
    '<div class="msg-layout">' +
      '<div class="card conv-list conv-hidden" id="conv-list">' + spinner() + "</div>" +
      '<div class="card thread" id="thread">' + spinner() + "</div>" +
    "</div>";
  loadConversations(convId);

  const thread = document.getElementById("thread");
  try {
    const data = await get("/api/conversations/" + encodeURIComponent(convId) + "/messages");
    const msgs = data.messages || [];
    threadLastId = msgs.length ? msgs[msgs.length - 1].id : 0;

    // Resolve the other user's name for the header via conversations list
    const convs = await get("/api/conversations").catch(() => ({ conversations: [] }));
    const conv = (convs.conversations || []).find((c) => String(c.id) === String(convId));
    const otherName = conv && conv.otherUser ? conv.otherUser.name : "Conversation";

    thread.innerHTML =
      '<div class="thread-head">' +
        '<button class="btn btn-secondary back-btn" id="back-btn">' + icon("back") + " Back</button>" +
        '<div class="name">' + esc(otherName) + "</div>" +
      "</div>" +
      '<div class="msgs" id="msgs"></div>' +
      '<form class="send-row" id="send-form">' +
        '<input type="text" id="send-input" aria-label="Type a message" placeholder="Type a message…" maxlength="1000" required autocomplete="off">' +
        '<button class="btn btn-primary" type="submit">' + icon("send") + " Send</button>" +
      "</form>";

    const msgsEl = document.getElementById("msgs");
    msgs.forEach((m) => msgsEl.insertAdjacentHTML("beforeend", msgBubbleHTML(m)));
    scrollMsgs();

    document.getElementById("back-btn").addEventListener("click", () => { location.hash = "#/messages"; });

    document.getElementById("send-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("send-input");
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      try {
        const res = await post("/api/conversations/" + encodeURIComponent(convId) + "/messages", { text });
        const m = res.message;
        threadLastId = Math.max(threadLastId, m.id);
        msgsEl.insertAdjacentHTML("beforeend", msgBubbleHTML(m));
        scrollMsgs();
      } catch (ex) {
        toast(ex.message, "error");
        input.value = text;
      }
    });

    // Poll for new messages every 3s
    state.msgPoll = setInterval(async () => {
      if (threadAppending) return;
      if (!document.getElementById("msgs")) { clearInterval(state.msgPoll); state.msgPoll = null; return; }
      threadAppending = true;
      try {
        const d = await get("/api/conversations/" + encodeURIComponent(convId) + "/messages?after=" + encodeURIComponent(threadLastId));
        const fresh = d.messages || [];
        if (fresh.length) {
          fresh.forEach((m) => {
            threadLastId = Math.max(threadLastId, m.id);
            msgsEl.insertAdjacentHTML("beforeend", msgBubbleHTML(m));
          });
          scrollMsgs();
          refreshBadges();
        }
      } catch (e) { /* keep polling quietly */ }
      finally { threadAppending = false; }
    }, 3000);

    refreshBadges(); // viewing marks as read server-side presumably; refresh counts
  } catch (e) {
    thread.innerHTML = emptyState("Couldn't load this conversation: " + e.message);
  }
}

function msgBubbleHTML(m) {
  const mine = state.me && String(m.senderId) === String(state.me.id);
  return (
    '<div class="bubble-row' + (mine ? " me" : "") + '">' +
      '<div><div class="msg-bubble">' + esc(m.text) + '</div><div class="msg-time"><time datetime="' + esc(m.createdAt || "") + '">' + esc(timeAgo(m.createdAt)) + "</time></div></div>" +
    "</div>"
  );
}

function scrollMsgs() {
  const el = document.getElementById("msgs");
  if (el) el.scrollTop = el.scrollHeight;
}

/* ================= notifications ================= */

const NOTIF_ICON = {
  like: "egg",
  comment: "comment",
  friend_request: "friends",
  friend_accept: "check",
  message: "chat",
};

function notifText(n) {
  const name = n.actor ? n.actor.name : "Someone";
  switch (n.type) {
    case "like": return "<b>" + esc(name) + "</b> threw an egg at your cluck \uD83E\uDD5A.";
    case "comment": return "<b>" + esc(name) + "</b> commented on your cluck.";
    case "friend_request": return "<b>" + esc(name) + "</b> sent you a friend request.";
    case "friend_accept": return "<b>" + esc(name) + "</b> joined your flock.";
    case "message": return "<b>" + esc(name) + "</b> sent you a message.";
    default: return "<b>" + esc(name) + "</b> did something.";
  }
}

function renderNotifications() {
  setPageMeta({ title: "Notifications | Glasebook" });
  app.innerHTML =
    '<div class="feed-col">' +
      '<div class="card" style="display:flex;align-items:center;justify-content:space-between">' +
        "<h2>Notifications</h2>" +
        '<button class="btn btn-secondary" id="mark-read">' + icon("check") + " Mark all as read</button>" +
      "</div>" +
      '<div id="notif-list">' + spinner() + "</div>" +
    "</div>";

  document.getElementById("mark-read").addEventListener("click", async () => {
    try {
      await post("/api/notifications/read", {});
      toast("All caught up!", "success");
      loadNotifications();
      refreshBadges();
    } catch (e) { toast(e.message, "error"); }
  });

  loadNotifications();
}

async function loadNotifications() {
  const list = document.getElementById("notif-list");
  if (!list) return;
  try {
    const data = await get("/api/notifications");
    const notifs = data.notifications || [];
    if (!notifs.length) { list.innerHTML = '<div class="card">' + emptyState("Nothing here yet — quiet as a henhouse.") + "</div>"; return; }
    list.innerHTML = '<div class="card" style="padding:8px">' + notifs.map((n) =>
      '<button class="notif' + (n.read ? "" : " unread") + '" data-id="' + esc(String(n.id)) + '">' +
        '<span class="nic">' + icon(NOTIF_ICON[n.type] || "bell") + "</span>" +
        (n.actor ? avatarFor(n.actor, "avatar avatar-sm") : "") +
        '<div class="info">' + notifText(n) +
          '<div style="font-size:12px;color:var(--soil-muted)">' + esc(timeAgo(n.createdAt)) + "</div></div>" +
        (n.read ? "" : '<span class="dot"></span>') +
      "</button>"
    ).join("") + "</div>";

    list.querySelectorAll(".notif").forEach((b) =>
      b.addEventListener("click", async () => {
        const id = b.getAttribute("data-id");
        try { await post("/api/notifications/read", { ids: [id] }); } catch (e) { /* ignore */ }
        b.classList.remove("unread");
        const dot = b.querySelector(".dot");
        if (dot) dot.remove();
        refreshBadges();
      })
    );
    refreshBadges();
  } catch (e) {
    list.innerHTML = emptyState("Couldn't load notifications: " + e.message);
  }
}

/* ================= boot ================= */

async function boot() {
  try {
    await refreshCsrf();
  } catch (e) {
    // CSRF fetch may fail before backend is up; keep going, api() will retry.
  }
  try {
    const data = await get("/api/auth/me");
    state.me = data.user;
  } catch (e) {
    state.me = null;
  }
  if (state.me) {
    refreshBadges();
    every(30000, refreshBadges);
  }
  route();
}

boot();
