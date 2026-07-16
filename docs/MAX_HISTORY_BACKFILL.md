# MAX channel history backfill

## Purpose

The regular webhook and hourly `GET /updates` reconciliation only process new or recently queued updates. The backfill mode imports the existing channel history through the official `GET /messages` method.

Backfill is idempotent: events are matched by `source=MAX` and `externalId=message.body.mid`. Repeated runs update existing rows instead of creating duplicates.

## Endpoints

All endpoints require an authenticated user with the `ADMIN` role.

### Start or continue

```http
POST /api/max-import/backfill?maxPages=25
```

Parameters:

- `maxPages`: number of 100-message pages processed in one request, from 1 to 500; default 25.
- `reset=true`: discard the saved cursor and restart from the current time or from an explicit `from` value.
- `from`: upper history cursor, either Unix milliseconds or an ISO date.
- `to`: lower history boundary, either Unix milliseconds or an ISO date.

Examples:

```bash
# Safe diagnostic: one page, starting from the newest messages
curl -ks -X POST \
  'https://test.ab-event.pro/api/max-import/backfill?reset=true&maxPages=1' \
  -H "Authorization: Bearer $ADMIN_JWT" | python3 -m json.tool

# Continue from the saved cursor
curl -ks -X POST \
  'https://test.ab-event.pro/api/max-import/backfill?maxPages=25' \
  -H "Authorization: Bearer $ADMIN_JWT" | python3 -m json.tool

# Import no earlier than 1 January 2026
curl -ks -X POST \
  'https://test.ab-event.pro/api/max-import/backfill?reset=true&maxPages=25&to=2026-01-01T00:00:00Z' \
  -H "Authorization: Bearer $ADMIN_JWT" | python3 -m json.tool
```

### State

```http
GET /api/max-import/backfill-status
```

```bash
curl -ks \
  'https://test.ab-event.pro/api/max-import/backfill-status' \
  -H "Authorization: Bearer $ADMIN_JWT" | python3 -m json.tool
```

The cursor and totals are stored in `SiteConfig` under `maxImport.backfillState`, so an interrupted run can continue later.

## Processing rules

Each historical message is passed to the same `MaxImportService` used by webhook delivery. Therefore parsing, image generation, direction mapping, `#Хит`, status calculation, and deduplication remain consistent.

If a post does not contain a separate URL, the source MAX post URL is appended before parsing and becomes the event link fallback.

Messages without text and without an image are skipped.

## Recommended rollout

1. Deploy the backend.
2. Run one page with `reset=true&maxPages=1`.
3. Inspect `Event`, `EventImage`, `MaxImportLog`, and the public APIs.
4. Continue in batches of 10–25 pages.
5. Stop when `completed=true`.
6. Rebuild the frontend cache or restart the frontend only if server-rendered data remains stale.
