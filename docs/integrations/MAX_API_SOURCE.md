# MAX Bot API — Official Documentation References

## Sources

| Document | URL |
|---|---|
| Developer portal | https://dev.max.ru/ |
| API methods index | https://dev.max.ru/docs-api |
| GET /updates | https://dev.max.ru/docs-api/methods/GET/updates |
| POST /subscriptions | https://dev.max.ru/docs-api/methods/POST/subscriptions |
| GET /subscriptions | https://dev.max.ru/docs-api/methods/GET/subscriptions |
| TypeScript SDK | https://github.com/max-messenger/max-bot-api-client-ts |
| Python SDK | https://github.com/max-messenger/max-botapi-python |
| Go SDK | https://pkg.go.dev/github.com/max-messenger/max-bot-api-client-go |
| PHP SDK + docs | https://github.com/BushlanovDev/max-bot-api-client-php |
| Java SDK | https://github.com/etsft/max-bot-api-java |

## Confirmed API Facts

### Base URL
`https://platform-api2.max.ru`
(Migration from `platform-api.max.ru` mandatory by July 19, 2026)

### Authentication
```
Authorization: Bearer <MAX_BOT_TOKEN>
```
No "Bot" prefix. Token obtained from @MasterBot in MAX messenger via /create command.

### Bot Identity Verification
```
GET /me
Authorization: Bearer <token>
```

### Webhook Subscription
```
POST /subscriptions
Content-Type: application/json
Authorization: Bearer <token>

{
  "url": "https://your-domain.com/api/max-webhook",
  "secret": "<MAX_WEBHOOK_SECRET>",
  "updateTypes": ["message_created", "bot_added"]
}
```
Requirements:
- HTTPS only, port 443
- Certificate from trusted CA (self-signed rejected since May 25, 2026)
- Secret: 5–256 chars, A-Z a-z 0-9 hyphen

### Webhook Validation
Each delivery includes header:
```
X-Max-Bot-Api-Secret: <the secret you registered>
```
Validate with **timing-safe comparison** (not regular string equality).

### Updates Polling (backup / development)
```
GET /updates?limit=100&marker=<last_marker>&types=message_created,bot_added
Authorization: Bearer <token>
```
Parameters: `limit` (1–1000), `timeout` (0–90s), `marker` (int64), `types` (comma-separated).
Returns: `{ updates: [...], marker: <next_marker> }`.
**Not suitable for production** — use webhook.

### Update Types
| Type | Trigger |
|---|---|
| `message_created` | New message posted in chat/channel |
| `message_edited` | Message edited |
| `message_removed` | Message deleted |
| `message_callback` | User clicked inline button |
| `bot_added` | Bot added to a chat or channel |
| `bot_removed` | Bot removed |
| `user_added` | User joined chat |
| `user_removed` | User left chat |
| `bot_started` | User opened direct dialog |
| `bot_stopped` | User blocked bot |
| `chat_title_changed` | Chat renamed |

### message_created Event Schema (key fields)
```json
{
  "updateType": "message_created",
  "timestamp": 1720000000000,
  "message": {
    "sender": { "userId": 12345, "name": "..." },
    "recipient": {
      "chatId": 987654321
    },
    "timestamp": 1720000000000,
    "body": {
      "mid": "mid.unique.string",
      "text": "Post text content",
      "attachments": [
        {
          "type": "image",
          "payload": {
            "url": "https://...",
            "token": "...",
            "width": 1280,
            "height": 720
          }
        }
      ]
    }
  }
}
```

### bot_added Event Schema
```json
{
  "updateType": "bot_added",
  "timestamp": 1720000000000,
  "chatId": 987654321,
  "chat": {
    "chatId": 987654321,
    "type": "channel",
    "title": "Channel name"
  }
}
```

### Chat/Channel IDs
- **Numeric only** — no @username addressing
- `chat.chatId` in updates is the integer identifier
- To resolve `GET /chats/{chatLink}` works for **public usernames** only
- **Invite links** (`max.ru/join/...`) cannot be resolved via API — the bot must be added to the channel by an admin; it then receives a `bot_added` update containing the numeric `chatId`

### Channel ID Resolution Procedure
1. Add the bot (created via @MasterBot) to the MAX channel as admin
2. The backend will log: `Bot added to chat. chatId=<N>. Set MAX_SOURCE_CHANNEL_ID=<N> in env`
3. An admin notification is created in the dashboard
4. Set `MAX_SOURCE_CHANNEL_ID=<N>` in production environment variables
5. Set `MAX_IMPORT_ENABLED=true` to activate import

### Rate Limits
- 30 requests per second
- HTTP 429 on excess — honor `Retry-After` header (exponential backoff recommended)

### Image Attachments
- `payload.url` — direct download URL (may require Authorization header)
- Validate MIME type before storing
- Enforce maximum file size
- Store locally; never hotlink signed/temporary URLs

## What Was Removed (and Why)

The previous implementation called:
```
GET https://api.max.ru/v1/channels/posts?channel_url=...
```
This endpoint is **not documented** in any official MAX Bot API source.
It consistently returned HTTP 404. It has been removed entirely.

The hardcoded `MAX_IMPORT_CHANNEL` join link in `packages/shared` was used only
by this broken endpoint and has been removed. The public-facing `MAX_CHANNEL`
constant (used in UI links) is preserved.
