# MKUS WhatsApp Service (Baileys)

WhatsApp kiruvchi xabarlarini CRM `POST /api/calls` ga `source: "whatsapp"` bilan yuboradi.

## Imkoniyatlar

1. **QR kod** — `/qr` yoki `/qr.png` orqali ulanish
2. Kiruvchi xabar: telefon + matn → CRM
3. **Sessiya saqlanadi** (`AUTH_DIR`) — qayta ishga tushganda QR qayta skaner shart emas
4. Railway / Azure / Docker uchun alohida deploy

## Tezkor start (lokal)

```bash
cd whatsapp-service
cp .env.example .env
# .env da CRM_API_KEY ni to'ldiring
npm install
npm run dev
```

Brauzer: http://localhost:8080/qr  
WhatsApp → Linked devices → Link a device → QR skaner

## Env

| Key | Tavsif |
|-----|--------|
| `CRM_API_URL` | Masalan `https://mkus-crm-fed7cd.azurewebsites.net` |
| `CRM_API_KEY` | CRM `X-API-Key` |
| `AUTH_DIR` | Sessiya papkasi (default `./auth_info`) |
| `PORT` | HTTP port (default `8080`) |
| `IGNORE_GROUPS` | `true` = guruhlarni o‘tkazib yuborish |

## CRM ga yuboriladigan body

```json
{
  "phone": "+998901234567",
  "raw_transcript": "Mijoz xabar matni",
  "call_date": "2026-07-16T12:00:00.000Z",
  "source": "whatsapp",
  "file_name": "wa:MESSAGE_ID"
}
```

Header: `X-API-Key: <CRM_API_KEY>`

## Railway

1. Yangi project → **Deploy from GitHub** → root: `whatsapp-service`
2. Volume qo‘shing: mount `/data/auth_info`
3. Variables:
   - `CRM_API_URL`
   - `CRM_API_KEY`
   - `AUTH_DIR=/data/auth_info`
4. Deploy → ochilgan URL da `/qr` ni skanerlang
5. Volume saqlansa, restart dan keyin QR qayta kerak emas

`railway.toml` volume: `whatsapp_auth` → `/data/auth_info`

## Azure (Container Apps / Web App for Containers)

```bash
cd whatsapp-service
docker build -t mkuswhatsapp.azurecr.io/whatsapp:latest .
az acr login --name mkuswhatsapp
docker push mkuswhatsapp.azurecr.io/whatsapp:latest
```

Container App:

- Env: `CRM_API_URL`, `CRM_API_KEY`, `AUTH_DIR=/data/auth_info`
- Persistent storage (Azure Files) → `/data/auth_info`
- Ingress: HTTP 8080, path `/`
- Health: `/health`

Yoki `docker-compose.yml` bilan VM/ACI.

## Endpoints

| Path | Vazifa |
|------|--------|
| `GET /health` | Holat (Railway healthcheck) |
| `GET /status` | Ulanish tafsiloti |
| `GET /qr` | QR HTML |
| `GET /qr.png` | QR rasm |

## Muhim

- `AUTH_DIR` ni **volume** qiling — aks holda redeploy QR qayta so‘raydi
- WhatsApp ToS: faqat o‘z biznes raqamingiz / ruxsat bilan
- Guruhlar default o‘chirilgan (`IGNORE_GROUPS=true`)
