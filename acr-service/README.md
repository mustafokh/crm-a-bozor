# ACR call ingest (cloud)

**Production:** runs **inside CRM** (`src/lib/acr/sync.ts`) on Azure Always On — laptop not needed.

Flow: Phone Cube ACR → Google Drive `Cube ACR/` → CRM poller → Whisper (`language=en`) → `POST /api/calls`

## Azure App Settings (CRM `mkus-crm-fed7cd`)

| Key | Value |
|-----|--------|
| `ACR_SYNC_ENABLED` | `true` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` | from one-time OAuth `token.json` |
| `WHISPER_LANGUAGE` | `en` |
| `DRIVE_FOLDER_NAME` | `Cube ACR` |
| `ACR_CHECK_INTERVAL_MS` | `300000` (5 min) |

Uses existing `OPENAI_API_KEY`, `CRM_API_KEY`, `APP_URL`.

## Verify

```bash
curl -s -X POST https://mkus-crm-fed7cd.azurewebsites.net/api/acr/sync \
  -H "X-API-Key: $CRM_API_KEY"
```

## Stop laptop

Stop local `Desktop/cube-acr-crm/call_to_crm.py` — CRM does this now.

This folder’s `worker.py` is optional local/debug only (do not commit secrets).
