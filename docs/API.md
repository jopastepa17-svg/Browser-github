# VYORA API contract draft

Base URL: `/api/v1`

All endpoints require TLS in production. JSON errors use `{ "error": { "code": string, "message": string, "requestId": string } }`; messages are intentionally generic for auth failures.

## Authentication

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | Create an account; rate limited, sends verification email |
| POST | `/auth/login` | Start a secure session |
| POST | `/auth/logout` | Revoke the current session |
| POST | `/auth/verify-email` | Consume a short-lived verification token |
| POST | `/auth/forgot-password` | Always return a generic response |
| POST | `/auth/reset-password` | Reset with a one-time token |
| GET | `/auth/sessions` | List the current user's devices, never session tokens |
| DELETE | `/auth/sessions/:id` | Revoke another session |

Auth mutations are protected by rate limits and CSRF protection when cookie sessions are used. Passwords are hashed with Argon2id; reset/verification tokens are stored hashed and expire.

## Conversations and messages

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/conversations?cursor=&limit=` | List conversations visible to the user |
| POST | `/conversations` | Create a direct or group conversation |
| GET | `/conversations/:id/messages?before=&limit=` | Cursor-paginated history |
| POST | `/conversations/:id/messages` | Create a message with an idempotency key |
| PATCH | `/messages/:id` | Edit own message when policy allows |
| DELETE | `/messages/:id` | Soft-delete own message or moderator deletion |
| POST | `/messages/:id/reactions` | Add/remove a reaction |
| POST | `/conversations/:id/read` | Advance the read cursor |
| POST | `/conversations/:id/typing` | Ephemeral typing signal |

Every message response includes `id`, `conversationId`, `senderId`, `createdAt`, `sequence`, `status` and an optional `replyToId`. The server rejects duplicate idempotency keys and preserves conversation ordering.

## Contacts, notifications and AI

- `GET /contacts?query=` and `POST /contacts/invites` search/invite by username.
- `GET /notifications` and `PATCH /notification-preferences` manage in-app/push preferences without exposing message content by default.
- `POST /ai/draft`, `POST /ai/summarize` accept explicit context ids and a consent record. The service returns a `providerDisclosure` and never silently uploads an entire conversation.

## WebSocket events

Connect to `/api/v1/realtime` after authentication. Server events include:

```json
{ "type": "message.created", "eventId": "evt_...", "conversationId": "conv_...", "sequence": 102, "payload": {} }
```

Other planned event types: `message.updated`, `message.deleted`, `reaction.changed`, `receipt.updated`, `typing.changed`, `presence.changed`, and `conversation.updated`. The client acknowledges the last sequence and requests a replay after reconnect.

## Rate and payload limits

The API should enforce per-account and per-IP limits, a maximum message size, attachment size/MIME allowlists, pagination caps and a maximum WebSocket fan-out. Return `429` with a retry hint. Use parameterized SQL only; never interpolate user input into queries or object-storage keys.
