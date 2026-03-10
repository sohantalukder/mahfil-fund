# Mahfil Fund API

Fastify + TypeScript + Prisma + Supabase Auth (JWT verification).

## Environment

See `[.env.example](.env.example)`.

## Key endpoints

- `GET /health`
- `GET /me`
- `GET /events` / `POST /events`
- `GET /donors` / `POST /donors`
- `GET /donations` / `POST /donations`
- `GET /expenses` / `POST /expenses`
- `POST /sync/push`
- `GET /sync/pull?since=...`
- `GET /reports/event-summary?eventId=...`
- `GET /audit-logs` (admin only)

## Offline sync (example)

- **Push queued operations**:

```bash
curl -X POST "$API_URL/sync/push" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
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
curl "$API_URL/sync/pull?since=2026-01-01T00:00:00.000Z" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

