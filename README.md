# VYORA

VYORA is a premium, privacy-aware messenger workspace built with React, TypeScript and Vite. The repository starts from a deliberately small base and now contains a polished, responsive MVP client plus the contracts and infrastructure notes required to grow it into a production service.

> **Current status:** the browser client is a functional local-first preview. Messages, conversations, theme preferences and settings persist in `localStorage`. The API/database layer is scaffolded and documented but is not connected to the client yet. Calling and external AI processing are intentionally marked as unavailable rather than simulated.

## Quick start

```bash
npm install
npm run dev
```

Open the URL printed by Vite. The app is configured to bind to `0.0.0.0` so it also works in a proxied preview environment.

Useful commands:

```bash
npm run typecheck  # TypeScript validation
npm test           # component smoke tests
npm run build      # production bundle
npm run preview    # serve the production bundle
```

Docker preview (web + PostgreSQL + Redis):

```bash
docker compose up --build
```

The web container is served by nginx on `http://localhost:4173`; change the example passwords and wire the API before any non-local deployment.

## What is implemented

- Original VYORA visual language: glass surfaces, violet/blue light, geometric wordmark, responsive design tokens and light/dark themes.
- Desktop three-column messenger layout and mobile full-screen conversation flow with bottom navigation.
- Local-first chat list with pinned chats, unread counters, presence indicators and conversation details.
- Functional message composer: send, Enter-to-send, emoji picker, reply context, edit, delete, reactions and read-state indicators.
- Local search across conversations/messages, notifications popover and toast feedback.
- Contacts with username-based invite flow and chat creation.
- Saved Messages workspace, profile modal and preference center.
- Honest Calls area: call history UI is available, but no fake WebRTC connection is shown.
- VYORA AI workspace with disclosure, local preview responses and explicit context/privacy language.
- Reduced-motion and forced-colors accommodations, keyboard-friendly controls, large touch targets and responsive safe-area padding.
- Test coverage for the first-run workspace, sending a message, contact flow and theme persistence.

## Not connected yet

- Registration, email verification, password reset and sessions are represented in the client flow but require the server API to become authoritative.
- WebSocket delivery, reconnect queues, server-side message IDs, attachments/object storage and push notifications are not connected in this local preview.
- WebRTC/STUN/TURN and group media server are not enabled.
- External AI providers are not called. A future provider must run behind the server AI gateway with explicit user consent and data minimization.
- End-to-end encryption is a planned, audited phase. VYORA does **not** claim that current chats are end-to-end encrypted.

## Architecture

The intended production split is:

```text
apps/web        React + TypeScript + Vite client
apps/api        Node/TypeScript HTTP + WebSocket boundary
packages/types  shared domain types and API contracts
packages/core   authorization, message ordering, idempotency and policy
infra/          Docker, PostgreSQL, Redis and S3-compatible storage
```

The current repository keeps the preview app in `src/`, a server skeleton in `server/`, the first PostgreSQL migration in `db/migrations/`, and design/API decisions in `docs/`.

See:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/API.md`](docs/API.md)
- [`db/migrations/001_initial.sql`](db/migrations/001_initial.sql)
- [`.env.example`](.env.example)

## Security baseline

Secrets belong only in environment variables or a secrets manager. The production API must use TLS, secure HttpOnly same-site session cookies, Argon2id password hashing, strict object-level authorization, request validation, rate limits, CSRF protection for cookie mutations, safe attachment scanning and audit events that exclude message bodies. See the security sections in the architecture and API docs before connecting a database.

## Product roadmap

1. Replace local persistence with authenticated REST endpoints and a WebSocket gateway.
2. Add server idempotency and cursor pagination, then reconcile optimistic messages after reconnect.
3. Move attachments to presigned S3 uploads with MIME/size scanning and private authorization.
4. Add Web Push with opt-in previews and notification preferences per conversation.
5. Integrate WebRTC one-to-one calls, then an audited SFU for group calls.
6. Evaluate a documented, audited E2EE protocol for eligible conversations before making any encryption claim.
7. Add Playwright end-to-end coverage, API integration tests, observability and CI checks.
