# Glasebook API Contract (v1) — authoritative, both teams implement/consume exactly this

Base: same origin. All API routes prefixed `/api`. Auth = session cookie (httpOnly). CSRF: every unsafe request (POST/PUT/PATCH/DELETE) must include header `X-CSRF-Token` with the token from `GET /api/auth/csrf` (response `{csrfToken}`). JSON bodies `Content-Type: application/json` unless multipart. Error shape: `{error: "message"}` with proper HTTP status.

## Auth
- `POST /api/auth/signup` {name, email, password} → 201 `{user:{id,name,email,avatarUrl}}`, sets session cookie. Validate: name 1–60, email valid, password ≥ 8.
- `POST /api/auth/login` {email, password} → 200 `{user}` + session.
- `POST /api/auth/logout` → 200 `{ok:true}`.
- `GET /api/auth/me` → 200 `{user}` or 401.
- `GET /api/auth/csrf` → 200 `{csrfToken}` (public; reads/creates session).

## Profiles & uploads (multipart field name `file`, images only ≤5MB)
- `GET /api/profile/:id` → `{user:{id,name,bio,avatarUrl,coverUrl,createdAt}, friendsCount, isFriend, friendshipStatus}` (public).
- `PUT /api/profile` {name?, bio?} → 200 `{user}`.
- `POST /api/upload/avatar` → 200 `{avatarUrl}`; `POST /api/upload/cover` → 200 `{coverUrl}`. Stored under `/uploads/...`, served statically.
- Default avatar: server generates an SVG identicon per user served at `/avatars/default/:id.svg` (deterministic color from id).

## Posts
- `POST /api/posts` multipart: fields `text` (1–2000 chars), optional `file` (image ≤5MB) → 201 `{post}`.
- `GET /api/feed` → 200 `{posts:[...]}` — own + friends' posts, newest first. Post shape: `{id, author:{id,name,avatarUrl}, text, imageUrl, likeCount, commentCount, likedByMe, createdAt}`.
- `GET /api/profile/:id/posts` → 200 `{posts}` newest first (public).
- `DELETE /api/posts/:id` (author only) → 200 `{ok:true}`.

## Likes & comments
- `POST /api/posts/:id/like` → 200 `{liked:true, likeCount}`; `DELETE /api/posts/:id/like` → 200 `{liked:false, likeCount}`.
- `GET /api/posts/:id/comments` → 200 `{comments:[{id, author:{id,name,avatarUrl}, text, createdAt}]}` oldest first.
- `POST /api/posts/:id/comments` {text 1–500} → 201 `{comment}`.

## Friends
- `GET /api/friends` → `{friends:[{id,name,avatarUrl,bio}]}`.
- `GET /api/friends/requests` → `{incoming:[{id, from:{id,name,avatarUrl}, createdAt}], outgoing:[ids]}`.
- `POST /api/friends/request/:userId` → 201 `{ok:true}` (no self, no dupes).
- `POST /api/friends/accept/:requestId` → 200 `{ok:true}`.
- `POST /api/friends/decline/:requestId` → 200 `{ok:true}`.
- `DELETE /api/friends/:userId` (unfriend) → 200 `{ok:true}`.

## Messages (1:1)
- `GET /api/conversations` → `{conversations:[{id, otherUser:{id,name,avatarUrl}, lastMessage:{text,createdAt,senderId}|null, unreadCount}]}` newest activity first.
- `POST /api/conversations` {userId} → 200 `{conversation}` (find-or-create; must be friends? NO — allow any user, keep simple).
- `GET /api/conversations/:id/messages?after=<id>` → `{messages:[{id,senderId,text,createdAt}]}` oldest first; `after` returns only newer.
- `POST /api/conversations/:id/messages` {text 1–1000} → 201 `{message}`.
- Frontend polls `GET .../messages?after=` every 3s.

## Notifications
- `GET /api/notifications` → `{notifications:[{id,type,actor:{id,name,avatarUrl},postId?,read,createdAt}]}` newest first. Types: `like`, `comment`, `friend_request`, `friend_accept`, `message`.
- `POST /api/notifications/read` {ids?} → 200 `{ok:true}` (all if omitted).

## Search (nice-to-have, include if easy)
- `GET /api/search?q=` → `{users:[{id,name,avatarUrl}]}` limit 10.
