# Mahfil Fund API

Fastify + TypeScript + Prisma with API-owned password and rotating-session authentication.
Supabase is used only by the server-side private object-storage integration.

## Environment

See `[.env.example](.env.example)`.

For the coordinated release procedure, use [`../SECURITY_CUTOVER.md`](../SECURITY_CUTOVER.md).

## Key endpoints

- `GET /health`
- `POST /auth/login`, `/auth/refresh`, `/auth/logout`
- `POST /auth/complete-first-login`
- `GET /me`
- `GET|POST /communities/:communityId/events`
- `GET|POST /communities/:communityId/donors`
- `GET|POST /communities/:communityId/donations`
- `GET|POST /communities/:communityId/expenses`
- `POST /communities/:communityId/sync/push`
- `GET /communities/:communityId/sync/pull?since=...`
- `GET /communities/:communityId/reports/event-summary?eventId=...`
- `GET /communities/:communityId/audit-logs` (community admin only)
- `GET /platform/users` (super admin only)

## Source ownership

- `src/core`: HTTP/error/pagination/OpenAPI boundaries.
- `src/modules/<feature>`: feature routes and transactional domain services.
- `src/integrations`: background outbox processing and external adapters.
- `src/plugins`: Fastify authentication, tenant, metadata, and idempotency lifecycle.

## Offline sync (example)

- **Push queued operations**:

```bash
curl -X POST "$API_URL/communities/$COMMUNITY_ID/sync/push" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: device-123" \
  -d '{
    "operations": [
      {
        "opId": "11111111-1111-1111-1111-111111111111",
        "entity": "donor",
        "op": "create",
        "payload": {
          "clientGeneratedId": "22222222-2222-2222-2222-222222222222",
          "fullName": "Abdul Karim",
          "phone": "01700000000",
          "donorType": "individual",
          "preferredLanguage": "bn",
          "tags": []
        }
      }
    ]
  }'
```

- **Pull deltas**:

```bash
curl "$API_URL/communities/$COMMUNITY_ID/sync/pull?since=2026-01-01T00:00:00.000Z" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```
