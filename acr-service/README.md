# ACR call ingest (cloud)

**Production:** runs **inside CRM** (`src/lib/acr/sync.ts`) on Azure Always On — laptop not needed.

Do **not** create a separate `mkus-acr-*` App Service (plan already hosts CRM + WhatsApp).

Flow: Phone Cube ACR → Google Drive `Cube ACR/` → CRM poller → Whisper (`language=en`) → `POST /api/calls`

## Azure App Settings (CRM `mkus-crm-fed7cd`)

| Key | Value |
|-----|--------|
| `ACR_SYNC_ENABLED` | `true` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` | from one-time OAuth `token.json` |
| `WHISPER_LANGUAGE` | `en` |
| `DRIVE_FOLDER_NAME` | `Cube ACR` |
| `ACR_CHECK_INTERVAL_MS` | `300000` (5 min) |

Uses existing `OPENAI_API_KEY`, `CRM_API_KEY`, `APP_URL`. Secrets stay in App Settings — never commit.

## Verify

```bash
curl -s https://mkus-crm-fed7cd.azurewebsites.net/api/health
curl -s https://mkus-crm-fed7cd.azurewebsites.net/api/acr/status -H "X-API-Key: $CRM_API_KEY"
curl -s -X POST https://mkus-crm-fed7cd.azurewebsites.net/api/acr/sync \
  -H "X-API-Key: $CRM_API_KEY"
```

## Stop laptop

Stop local `Desktop/cube-acr-crm/call_to_crm.py` — CRM does this now.

This folder’s optional Node/Python workers are local/debug only.
