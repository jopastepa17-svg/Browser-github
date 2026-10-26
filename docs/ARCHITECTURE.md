# VYORA architecture

## Scope of this repository

The first implementation is a local-first web client that can be previewed without a database. It deliberately uses seed data and `localStorage` so the product flows can be exercised offline. The local store is a demo boundary, not an authentication or security boundary.

## Production modules

### Web client

- React + TypeScript with a small feature-oriented surface.
- CSS custom properties provide the VYORA design system without runtime styling overhead.
- Conversation state is optimistic: an outgoing message receives a client id, renders immediately, then is reconciled with the server event when the API is connected.
- A cursor-based message query should virtualize long histories and never load an entire conversation into memory.

### API service

- Node.js/TypeScript boundary for auth, profiles, conversations, messages, contacts, notifications and AI consent.
- Validate all external input at the boundary with a schema library such as Zod.
- Authorize every resource by checking membership/role on the server; never trust a conversation id from the browser.
- Cookie sessions should be opaque, HttpOnly, Secure in production and SameSite=Lax/Strict according to the deployment topology. Store only a hash of the session token.
- Passwords should use Argon2id with a reviewed parameter set. Never log passwords, tokens, message bodies or attachment URLs.

### Real-time gateway

- WebSocket connections authenticate from the existing session and subscribe only to conversations the user can access.
- Events have stable server ids, a conversation sequence and an idempotency key. The client deduplicates by event id/idempotency key.
- Reconnect flow: exponential backoff with jitter, authenticate again, request events after the last acknowledged sequence, reconcile pending sends, then resume presence.
- Redis is optional for the first deployment but becomes useful for presence, rate limits and fan-out between API instances.

### Data and files

- PostgreSQL is the source of truth for accounts, memberships, messages and moderation metadata.
- Attachments use private S3-compatible object storage. The API issues a short-lived presigned upload only after checking conversation membership; a background worker scans MIME/size and marks the attachment safe before serving it.
- Messages use soft deletion metadata for the initial retention policy. A scheduled job can hard-delete content after the documented retention window.

## Authorization model

1. Resolve the authenticated user from the session.
2. Load the target conversation and member role in the same transaction/query.
3. Check the action against the role and conversation policy.
4. Perform the mutation with a conditional predicate (for example `WHERE conversation_id = $1 AND user_id = $2`).
5. Write a minimal audit event for sensitive actions.

Group roles are intentionally data-driven: owner, admin, moderator and member can map to explicit permissions. A client-side button is only a convenience; the API remains authoritative.

## Privacy and AI

AI is a server-side module with a consent and context-selection boundary. The client must send an explicit context id plus the minimum selected text, not an entire account history by default. The service should redact secrets and attachment URLs, provide a retention setting, and expose the provider/data handling to the user. This preview makes no external AI request and does not claim E2EE for AI processing.

## Calls

One-to-one calls can use WebRTC with short-lived signaling messages and configured STUN/TURN. Group calls should use a reviewed SFU rather than a browser mesh. The product must show a clear unavailable state until signaling, TURN credentials, connection state and abuse controls are operational.

## Deployment

A production deployment should terminate TLS at a trusted edge, run the web client behind a CDN, run stateless API/WebSocket replicas, use managed PostgreSQL with backups, and keep Redis/S3 credentials in a secrets manager. Add structured logs, health/readiness probes, metrics for message latency/reconnects/error rate, and a redacted security event stream before exposing the service publicly.
