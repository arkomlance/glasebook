# Glasebook: Monetization + Growth Strategy

Owner: Clark Cluckerberg · Starting position: $0 budget, 0 users · Written 2026-09-08

The honest headline first: social networks take **years**, not months. Most die at <1k users. Glasebook's advantages are (a) it costs ~$0 to run, so we have infinite runway, and (b) the silly parody angle is genuinely differentiated — nobody shares boring. This doc is the plan to turn those advantages into users, then dollars.

---

## 1. Phased Plan (gated on real milestones)

### Phase 0 — The Flock Forms (0 → 1,000 users) · Revenue target: $0
**Goal:** prove anyone wants this. Revenue is a distraction here.
- All effort goes to growth (see Section 3). No ads, no paywalls — charging 50 users kills momentum.
- Success metric: 1,000 registered users AND 30%+ weekly active (300 people coming back weekly). Vanity signups that never return don't count.
- What we build in this phase: polish invite flow, fix onboarding drop-off, add whatever the first users ask for loudest.

### Phase 1 — First Dollars (1,000 → 50,000 users) · Revenue target: $500–$5k/mo
**Trigger:** 1,000 users with 30% weekly activity, sustained 4 weeks. Not before.
**Goal:** switch on the monetization hooks already built into the app.
- **Promoted clucks** (built in, premium-only pinning): open self-serve to small businesses, creators, and other indie projects. Start manual — advertiser DMs us, we pin the cluck by hand. Automate only when volume demands it.
- **Glasebook Premium** (flag already in schema): launch paid tier (see Section 2).
- Wiring real payments (Stripe) requires the owner's identity/KYC — the agent cannot do this step. Budget one afternoon of the owner's time when Phase 1 triggers.
- Success metric: $500 MRR (monthly recurring revenue). That's the "this is a real business" line.

### Phase 2 — Real Business (50,000+ users) · Revenue target: $20k+/mo
**Trigger:** 50k users, $5k MRR, and moderation not on fire.
- Proper ad products: self-serve dashboard, targeting by interest/coop, video clucks.
- Brand partnerships: sponsored "coop takeovers," silly branded mascots/challenges (our parody positioning is an *asset* here — brands pay for playful).
- Creator tools: tipping (we take 10%), paid coops (subscription groups), analytics for power users.
- API access for developers (rate-limited free tier, paid tiers above).

**What we deliberately do NOT do:** sell user data. Ever. It's the one thing that would nuke trust in a parody brand built on "we're not the blue app." Say it publicly; mean it.

---

## 2. Revenue Streams (with real numbers)

### Promoted clucks (self-serve feed ads)
The promoted-post slot is already pinned to the top of the feed — it looks like a cluck, which makes it naturally ad-block resistant.
- **Phase 1 pricing:** flat $25/week per promoted cluck, manual placement. Dead simple, no dashboard needed.
- **Phase 2 pricing:** CPM-based self-serve, ~$8–12 CPM (small-network rates; Facebook charges $10–30, we undercut).
- Who buys first: indie makers, crypto-adjacent projects, local businesses, OnlyFans-style creators, other silly internet brands. Not Fortune 500s — they need brand safety we can't credibly offer yet.

### Glasebook Premium — $2.99/mo or $29.99/yr
Perks (cosmetic + fun, never pay-to-win the feed):
- 🥚 Golden egg badge on profile + golden beak avatar frame
- Undo cluck (30-second edit/delete window after posting)
- Custom coop colors / profile themes
- Bookmark folders + "best of the coop" digest
- Longer clucks (500 → 2,000 chars), GIF + HD uploads
- "Founding Flock" badge for the first 1,000 premium members (scarcity sells)
- Zero feed ads for premium members (we can afford this — ads are a small share early)

### Affiliate & sponsored content (Phase 1.5)
- Affiliate links in an official "Coop Deals" account: Amazon Associates etc. Low effort, low return — treat as bonus, not strategy.
- Sponsored silly content: a brand pays $200–2k for the @Glasebook account to roast-or-toast them. Our parody voice *is* the product here.

### Later (Phase 2+)
- **API access:** free tier 1k calls/day; $49/mo pro; $499/mo enterprise.
- **Virtual goods:** animated stickers, coop decorations, mascot outfits. Pure margin, proven by every social game ever.
- **Paid coops:** creators charge $5/mo for private groups; we take 15%.

### Revenue math (mid-case, not best-case)

Assumptions: 40% of registered users are monthly-active; 2% of MAU convert to Premium (standard freemium rate); ad CPM $8–10 with realistic fill rates.

| Users | Est. MAU | Premium (2% × $2.99) | Ads | Other | **Total/mo** |
|---|---|---|---|---|---|
| 10,000 | 4,000 | ~$240 | ~$100 (manual) | ~$0 | **~$300–400** |
| 100,000 | 40,000 | ~$2,400 | ~$2,400 (300k imp @ $8 CPM) | ~$750 | **~$5,500** |
| 1,000,000 | 400,000 | ~$24,000 | ~$50,000 (5M imp @ $10 CPM) | ~$10,000 | **~$85,000** |

Reality check: the jump from 10k to 100k users is where 90% of social networks die. The math works *if* growth works — which is why Phase 0 is the whole game.

---

## 3. Growth Levers (beyond X)

X is one channel. Here are the rest, all $0:

### Already built into the app — squeeze them hard
- **Invite codes + leaderboard** (`#/leaderboard`): run weekly "Top Clucker" contests. Winners get a golden badge + their profile featured on the login page. Status is free and people grind for it.
- **Shareable public profiles with OG tags:** every profile is a landing page. When users share theirs, it looks good on X/Discord/iMessage — that's free acquisition per share.

### SEO (slow, free, compounds)
- Public profiles + public clucks get indexed by Google. Long-tail searches ("[name] glasebook") start bringing stray traffic within 2–3 months.
- Publish a silly blog on the domain: "Why we replaced likes with egg throws" — founder-story content ranks and gets linked.

### Community seeding (weeks 1–8)
- Launch posts: Product Hunt, Hacker News "Show HN", r/SideProject, Indie Hackers. The "social network run by a chicken CEO" angle is *exactly* the kind of thing these communities upvote.
- Seed 5–10 demo/founder accounts posting genuinely funny content before inviting real users. Nobody joins an empty restaurant.
- Discord/Telegram: start a "Coop" off-platform where the earliest 100 users hang out. Community first, platform second.

### PR-worthy silly stunts ($0)
- "The Egg Toss Heard Round the World": attempt a silly world record (most eggs thrown in 24 hours) — local news loves this.
- Open letter to "the blue app": a funny, clearly-parody breakup letter. Memeable, quotable, zero legal risk if it never claims affiliation.
- Chicken CEO does AMAs (Reddit, X Spaces). A mascot founder is a press hook no competitor can copy.

### Referral incentives that cost $0
- **OG badges:** first 100 / 1,000 / 10,000 users get permanent "Founding Flock" status. Scarcity + identity = invites.
- **Unlock-by-invite:** custom themes and the golden frame unlock at 5, 25, 100 successful invites. The leaderboard already tracks this.
- **Coop founding:** invite 10 friends, get to found a named coop with a custom emoji. People recruit to become mini-moderators.

---

## 4. Risks + Mitigations

| Risk | Mitigation |
|---|---|
| **Ad-blockers kill ad revenue** | Promoted clucks are native feed content, not banner ads — blockers largely can't touch them. Premium "no ads" tier also converts blockers into subscribers. |
| **Spam/scam advertisers** | Phase 1 is manual review only — every promoted cluck approved by a human (the CEO has time; there are 3 advertisers). Publish a clear ad policy: no crypto scams, no misleading health claims, no impersonation. |
| **Advertiser trust in a parody brand** | Lean into it: sell "the internet's most unserious ad inventory." Vet advertisers publicly; one scam ad destroys more trust than 100 good ads build. Keep parody aimed at Big Tech generally, never defamatory toward real people. |
| **X account bans (platform dependency)** | Never build the audience *only* on X. From day one: collect emails at signup (already have them), run the Discord/Telegram coop, cross-post to TikTok/YouTube/Reddit. If @Glasebook gets banned, we lose a channel, not the company. Keep automation human-paced — no mass mentions, no follow/unfollow games (see X launch kit playbook). |
| **Content moderation costs** | Phase 0–1: community reporting + the founder reviewing flags (volume is low). Rate limits are already in the app. Don't build AI moderation until 50k+ users. Clear Terms + DMCA process already live — that's the legal shield. |
| **The big one: nobody comes** | The $0 burn rate means we can try for years. If Glasebook stalls at 500 users after 6 months of real effort, the honest move is a post-mortem, not more money. Set that check-in date now: **March 2027.** |

---

## 5. 90-Day Action Plan (week-by-week from launch day)

**Week 1 — Go live**
- [ ] Deploy to Render (owner: 5 min, GitHub + Render accounts)
- [ ] Founder + 10 friends/family create accounts, post 50+ clucks of genuinely funny content
- [ ] Claim @Glasebook + @ClarkCluckerberg on X (owner passes verification codes to agent)
- [ ] Post launch announcement on both accounts

**Week 2 — First push**
- [ ] Daily posts on both X accounts (see x_launch_kit/content_calendar.md)
- [ ] Every new user gets a personal welcome DM pointing at their invite link
- [ ] Fix top 3 onboarding drop-offs observed in week 1

**Weeks 3–4 — Community seeding**
- [ ] Launch on Product Hunt, Hacker News (Show HN), r/SideProject, Indie Hackers
- [ ] Start the off-platform Discord/Telegram coop for earliest users
- [ ] First silly stunt: "most eggs thrown in 24 hours" record attempt
- [ ] Target: 250 users

**Weeks 5–6 — Double down on what worked**
- [ ] Kill the bottom 50% of content tactics; double the top 2 channels
- [ ] Start weekly "Top Clucker" leaderboard contest with golden badge prizes
- [ ] Publish first SEO blog post ("Why we replaced likes with egg throws")
- [ ] Target: 500 users

**Weeks 7–8 — Referral engine**
- [ ] Turn on OG badge tiers (100 / 1,000 / 10,000) and invite-unlock rewards
- [ ] "Found a coop" perk for 10+ invites goes live
- [ ] Second stunt: open breakup letter to "the blue app"
- [ ] Target: 1,000 users → **Phase 1 gate check** (is 30% weekly-active holding?)

**Weeks 9–10 — Prepare monetization (only if gate passed)**
- [ ] Owner sets up Stripe (identity/KYC — one afternoon)
- [ ] Finalize Premium perks; announce "Founding Flock" pricing ($29.99/yr launch price, locked forever)
- [ ] Line up first 3 manual promoted-cluck advertisers from indie-maker communities

**Weeks 11–12 — First dollars**
- [ ] Launch Premium + first promoted clucks
- [ ] Post revenue numbers publicly (transparency is great marketing for an indie project)
- [ ] 90-day retro: what grew, what didn't, March-2027 check-in confirmed
- [ ] Target: 2,000+ users, first $100 MRR

---

*Notes: this is a strategy doc, not legal or financial advice. Revenue figures are estimates for planning, not promises. The plan assumes the owner completes the 5-minute deploy and account-verification steps the agent cannot do on their behalf.*
