# Azure ga deploy — MKUS CRM

## Talablar

- Azure CLI (`az`) — o'rnatilgan
- Azure subscription (Free trial yoki to'lovli)
- GitHub repo: `mustafokh/crm-a-bozor`

---

## 1. Azure'ga kirish

Terminalda:

```bash
az login --use-device-code
```

Brauzerda https://login.microsoft.com/device oching va kodni kiriting.

Tekshirish:

```bash
az account show
```

---

## 2. Infratuzilma (avtomatik skript)

```bash
bash scripts/azure-setup.sh
```

Skript quyidagilarni yaratadi:

| # | Resurs | Tavsif |
|---|--------|--------|
| 1 | **Resource Group** | `mkus-crm-rg` — barcha resurslar guruhi |
| 2 | **PostgreSQL Flexible Server** | Burstable **B1ms** (eng arzon barqaror) |
| 3 | **Database** | `mkus_crm` |
| 4 | **App Service Plan** | **B1** Linux (~$13/oy) |
| 5 | **Web App** | Node.js **20 LTS** |
| 6 | **App Settings** | `DATABASE_URL`, `JWT_SECRET`, `CRM_API_KEY` |

> **F1 (Free)** Next.js + Prisma uchun juda cheklangan (512 MB RAM, vaqtinchalik to'xtash). Shuning uchun **B1** tavsiya etiladi.

Sozlamalar `.azure-env` faylga saqlanadi (git'ga kirmaydi).

---

## 3. GitHub'dan deploy

Skript tugagach:

```bash
source .azure-env

az webapp deployment github-actions add \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --repo mustafokh/crm-a-bozor \
  --branch main \
  --login-with-github
```

Bu GitHub Actions workflow yaratadi — har `main` push'da Azure'ga deploy bo'ladi.

**Yoki** Azure Portal → App Service → **Deployment Center** → GitHub → repo tanlang.

---

## 4. Seed (birinchi marta)

Azure Portal → App Service → **SSH** yoki **Advanced Tools (Kudu)**:

```bash
cd /home/site/wwwroot
npm run db:seed
```

Login: `admin@abozor.uz` / `admin123` — parolni darhol almashtiring.

---

## 5. Narx (taxminiy)

| Resurs | ~Narx/oy |
|--------|----------|
| PostgreSQL B1ms | ~$12–15 |
| App Service B1 | ~$13 |
| **Jami** | **~$25–30** |

Free trial $200 kredit bilan bir necha oy bepul bo'lishi mumkin.

---

## Muammolar

| Xato | Yechim |
|------|--------|
| PostgreSQL ulanmaydi | Firewall: AllowAzureServices qoidasi borligini tekshiring |
| Build xato | App Settings: `SCM_DO_BUILD_DURING_DEPLOYMENT=true` |
| JWT/CRM xato | `JWT_SECRET` 32+ belgi, `CRM_API_KEY` 24+ belgi |
| App to'xtab qoladi | B1'da **Always On** yoqing (Settings → Configuration) |
