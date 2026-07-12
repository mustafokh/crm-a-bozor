# Railway ga deploy

## 1. GitHub

```bash
git init && git add . && git commit -m "MKUS CRM PostgreSQL"
git remote add origin https://github.com/USER/mkus-crm.git
git push -u origin main
```

## 2. Railway

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Reponi tanlang: `mustafokh/crm-a-bozor`
3. **+ New** → **Database** → **PostgreSQL**
4. CRM servis → **Settings** → **Build**:
   - **Builder: Nixpacks** (Dockerfile emas!)
   - Root'da `Dockerfile` yo'q — faqat `nixpacks.toml` + `railway.toml`
5. CRM servis → **Variables**:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | `openssl rand -base64 32` |
| `CRM_API_KEY` | `openssl rand -base64 32` |
| `NODE_ENV` | `production` |

5. **Settings** → **Networking** → **Generate Domain**

Deploy avtomatik: Nixpacks build + `npm run start:prod` (`prisma db push` + start).

> Railway **Dockerfile ishlatmaydi** — `railway.toml` da `NIXPACKS` builder. Docker faqat lokal `docker compose` uchun.

### Rasm yuklashlar (ixtiyoriy, doimiy saqlash)

Agar `/api/upload` orqali yuklangan rasmlar redeploy'dan keyin yo'qolmasin:

1. CRM servis → **Volumes** → **Add Volume**
2. **Mount path:** `/app/public/uploads`

> Dockerfile'da `VOLUME` ishlatilmaydi — Railway faqat dashboard orqali volume qo'shishni qo'llab-quvvatlaydi.

## 3. Seed (ixtiyoriy, birinchi marta)

Railway shell:

```bash
npm run db:seed
```

## 4. POST /api/calls

```bash
curl -X POST https://YOUR-APP.up.railway.app/api/calls \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_CRM_API_KEY" \
  -d '{
    "phone": "+998901234567",
    "transcript": "Mijoz Toyota Camry haqida so'radi",
    "call_date": "2026-07-12T10:30:00Z",
    "file_name": "call_001.mp3"
  }'
```

Javob: `{"ok":true,"id":"..."}`
