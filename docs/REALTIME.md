# Real-time features roadmap for Grudge

This document outlines options, trade-offs, and a small PoC for adding real-time features to Grudge: chat, live notifications, and match updates.

Goals
- Low-latency real-time chat for team rooms
- Live notifications for admin actions, assignment updates, match availability
- Optional live match score/update feed for scrimmages

Constraints & assumptions
- Starting from a Next.js (App Router) app, Prisma + SQLite in dev. Production will use PostgreSQL or MySQL.
- Prefer minimal infra changes for a PoC; later we can select more robust hosted services.
- Security: must support authenticated users and per-team authorization.

Option 1 — Hosted real-time (recommended for fastest time-to-value)
- Providers: Pusher (Channels), Ably, or Supabase Realtime.
- Pros: minimal infra, scalable, secure SDKs, presence/typing built-in, good developer UX.
- Cons: recurring cost, vendor lock-in for some features.

PoC using Pusher Channels
1. Create a Pusher app (or Ably) and store keys in environment variables.
2. Server: create short-lived presence channel auth endpoints under `app/api/realtime/auth` that validate `getServerSession` and sign channel subscriptions with team membership checks.
3. Client: use the Pusher/Ably JS client to subscribe to `private-team-{teamId}` or `presence-team-{teamId}` channels for chat and notifications.
4. Emit events from server routes where relevant (e.g., after assignment creation call Pusher.trigger('private-team-1', 'assignment.created', { ... }))
5. UI: lightweight listeners to append chat messages and notifications to state.

Option 2 — Self-hosted Socket.IO + Redis
- Architecture: Node (or serverless function) hosts Socket.IO gateway; use Redis Pub/Sub for multi-instance broadcasting.
- Pros: full control, no vendor lock-in for core functionality.
- Cons: more infra and ops, scaling needs Redis and sticky sessions or an adapter.

PoC using Socket.IO + Redis
1. Add a small Socket.IO server (separate process, e.g., `server/realtime.ts`) that handles authentication via a token endpoint (signed by server using session or JWT).
2. Use `@socket.io/redis-adapter` with a managed Redis instance (e.g., AWS Elasticache or Azure Redis) for multi-instance scaling.
3. On server events (assignment created, demote, etc.), publish to Redis so the socket server can broadcast.

Option 3 — Serverless + Database-triggered events (Postgres LISTEN/NOTIFY or Supabase)
- If using PostgreSQL, database triggers can push NOTIFY messages; a small listener service can forward to websockets or Pusher.
- Pros: tight coupling with DB changes; low-latency for DB-driven events.
- Cons: added complexity and coupling; not all DBs support LISTEN/NOTIFY equally.

Security model (applies to all options)
- Always authenticate socket/channel subscriptions via server-side signed auth endpoints.
- Enforce team membership on the auth endpoint so users can only subscribe to their teams' channels.
- Validate and sanitize events when emitting from server routes.

Minimal PoC plan (1 week)
1. Implement a Pusher-based PoC (fastest):
   - Add `REaltime` env variables and a small `app/api/realtime/auth/route.ts` to sign subscriptions.
   - Add client code in `app/components/TeamChatClient.tsx` to subscribe and show messages.
   - Update assignment/match endpoints to trigger pusher events on create/update.
2. Add basic presence (optional) to show who is online in a team room.
3. Add server tests that mock Pusher client to assert triggers are invoked.

Follow-up for production
- Choose provider and account tier based on estimated concurrent connections and message volume.
- Add monitoring and rate limits.
- For self-hosted Socket.IO, provision Redis and autoscaling rules.

Recommendation
- Start with the hosted provider (Pusher/Ably/Supabase) for PoC and MVP speed. Move to self-hosted Socket.IO + Redis only if cost or feature needs require it.

Files to add for PoC
- `app/api/realtime/auth/route.ts` — signs channel subscriptions using session and team membership checks
- `app/components/TeamChatClient.tsx` — client subscription and UI
- small server-side triggers: call a helper `realtime.trigger(teamId, event, payload)` from key endpoints

Estimated effort
- PoC (hosted): 2–4 days
- Production (self-hosted + Redis): 1–2 weeks (depends on infra availability)

Notes
- I can implement the Pusher PoC next (server auth + client) if you want — it'll be the fastest route to live updates.
