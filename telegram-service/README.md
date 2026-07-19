# Telegram service (GramJS)

Telegram xabarlarini CRM `POST /api/calls` ga `source: "telegram"` bilan yuboradi.

Har bir xodim uchun alohida **user account** session (GramJS / MTProto) — WhatsApp Baileys oqimiga o‘xshash, lekin QR o‘rniga **telefon + OTP (+ 2FA parol)**.

## Talablar

1. [my.telegram.org](https://my.telegram.org) → **API development tools** → `api_id` va `api_hash`
2. CRM `CRM_API_KEY` (telegram service `.env` da ham)

## Lokal ishga tushirish

```bash
cd telegram-service
cp .env.example .env
# TELEGRAM_API_ID, TELEGRAM_API_HASH, CRM_API_KEY to‘ldiring
npm ci
npm run dev
```

## Auth oqimi (xodim)

1. CRM → **Xodimlar** → Telegram → **Ulash**
2. Telefon raqam (+998…)
3. Telegram ilovasidagi OTP kod
4. Agar 2FA yoqilgan bo‘lsa — cloud parol

Session `/home/auth_info/{employeeId}/session.txt` da saqlanadi (Azure persistent disk).

## CRM payload

```json
{
  "phone": "+998901234567",
  "raw_transcript": "Salom",
  "call_date": "2026-07-19T12:00:00.000Z",
  "source": "telegram",
  "direction": "incoming",
  "from_me": false,
  "employee_name": "Sardor"
}
```

Telefon ko‘rinmasa: `@username` yoki `tg:123456789`.

## Azure

GitHub Actions: `.github/workflows/azure-telegram-deploy.yml`  
Web App: `mkus-telegram-fed7cd` (resource group `mkus-crm-rg`)

CRM App Settings:

- `TELEGRAM_SERVICE_URL=https://mkus-telegram-fed7cd.azurewebsites.net`
- `TELEGRAM_SERVICE_API_KEY` — telegram service `SERVICE_API_KEY` bilan bir xil (yoki `CRM_API_KEY`)

## Cheklovlar (WhatsApp bilan solishtirish)

| | WhatsApp | Telegram |
|---|----------|----------|
| Auth | QR (Linked devices) | Telefon + OTP (+ 2FA) |
| API | Baileys (unofficial) | GramJS MTProto (user client) |
| Guruhlar | `IGNORE_GROUPS` | `IGNORE_GROUPS` (default true) |
| Telefon | Odatda bor | Ba’zan faqat `@username` / `tg:id` |
| Bot API | — | Ishlatilmaydi (user client kerak) |
