# A-BOZOR CRM — Avtosalon boshqaruv tizimi

Avtosalon (yengil avtomobil savdo markazi) uchun to'liq funksional, professional
web-CRM. Ombor, mijozlar, lidlar, savdo, shartnomalar, moliya, xodimlar va
hisobotlar — hammasi bitta tizimda.

## Texnologik stek

- **Frontend/Backend:** Next.js 15 (App Router) + TypeScript
- **UI:** TailwindCSS + qo'lda yozilgan shadcn-uslubidagi komponentlar, `lucide-react` ikonalar
- **Ma'lumotlar bazasi:** Prisma ORM + PostgreSQL
- **Autentifikatsiya:** JWT (httpOnly cookie, `jose`) + bcrypt, rol asosida ruxsatlar (RBAC)
- **Grafiklar:** Recharts
- **PDF/Chop etish:** brauzer print orqali shartnoma hujjati

## Tez ishga tushirish

```bash
cp .env.example .env          # DATABASE_URL va CRM_API_KEY ni to'ldiring
npm install                     # bog'liqliklarni o'rnatish (Prisma client avtomatik generatsiya bo'ladi)
docker compose up -d db         # lokal PostgreSQL (ixtiyoriy)
npm run db:push                 # PostgreSQL sxemasini yaratish
npm run db:seed                 # demo ma'lumotlarni yuklash
npm run dev                     # http://localhost:3000
```

Brauzerda `http://localhost:3000` ni oching.

## Demo hisoblar (parol hammasida: `admin123`)

| Rol | Email |
| --- | --- |
| Admin / Direktor | `admin@abozor.uz` |
| Sotuv menejeri | `manager@abozor.uz` |
| Buxgalter | `buxgalter@abozor.uz` |
| Ombor / Logistika | `ombor@abozor.uz` |

## Rollar va ruxsatlar (RBAC)

- **Admin** — barcha modullar
- **Sotuv menejeri** — dashboard, ombor, mijozlar, lidlar, savdolar, shartnomalar, hisobotlar (faqat o'z lidlari/savdolari)
- **Buxgalter** — dashboard, moliya, shartnomalar, savdolar, hisobotlar
- **Ombor/Logistika** — dashboard, ombor, kelayotgan mashinalar

Ruxsatlar `src/lib/rbac.ts` da, sahifa darajasida `src/middleware.ts`, API darajasida
`requirePermission()` orqali himoyalangan.

## Modullar

| Modul | Yo'l | Tavsif |
| --- | --- | --- |
| Dashboard | `/dashboard` | KPI kartalar, savdo/foyda grafiklari, activity feed, follow-up eslatmalar |
| Ombor | `/inventory` | Mashinalar CRUD, filtr/qidiruv, rasm galereya, narx tarixi, statuslar |
| Kelayotgan | `/incoming` | Logistika: buyurtma → yo'lda → bojxona → omborga tushdi (avto-inventar) |
| Mijozlar | `/customers` | Mijoz kartochkasi, VIP, murojaatlar tarixi (activity log) |
| Lidlar | `/leads` | Kanban voronka (drag-and-drop), manba, follow-up |
| Savdolar | `/deals` | Savdo yaratish (naqd/kredit/bo'lib to'lash/trade-in), foyda hisobi |
| Shartnomalar | `/contracts` | Shartnoma arxivi, to'lov jadvali, PDF/chop etish |
| Moliya | `/finance` | Kirim/chiqim, sof foyda, komissiya, grafiklar, xarajatlar |
| Xodimlar | `/employees` | Sotuvchilar KPI, konversiya, reyting |
| Hisobotlar | `/reports` | Sana bo'yicha filtr, Excel(CSV)/PDF export |
| Sozlamalar | `/settings` | Kompaniya, valyuta kursi, foydalanuvchilar/rollar |

## Ma'lumotlar bazasi

Asosiy jadvallar: `users`, `customers`, `cars`, `leads`, `calls`, va boshqalar. To'liq tuzilma:
[`prisma/schema.prisma`](prisma/schema.prisma).

Lokal PostgreSQL: `docker compose up -d db`, keyin `.env` da:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mkus_crm?schema=public"
```

### Tashqi API: qo'ng'iroq transkriptlari

`POST /api/calls` — `X-API-Key` header `.env` dagi `CRM_API_KEY` bilan mos kelishi kerak.

```json
{
  "phone": "+998901234567",
  "transcript": "Mijoz Toyota Camry haqida so'radi",
  "call_date": "2026-07-12T10:30:00Z",
  "file_name": "call_001.mp3"
}
```

### Railway deploy

Batafsil: [`deploy/RAILWAY.md`](deploy/RAILWAY.md)

## Loyiha tuzilishi

```
src/
  app/
    (dashboard)/       # himoyalangan sahifalar (sidebar+topbar layout)
    api/               # REST API route'lari (rolga qarab himoyalangan)
    login/             # login sahifa
    print/contract/    # PDF/chop etish uchun toza hujjat
  components/          # qayta ishlatiladigan UI va modul komponentlari
    ui/                # button, card, table, modal, toast, ...
    layout/            # sidebar, topbar, app-shell
  lib/                 # prisma, auth, rbac, constants, analytics, utils
  middleware.ts        # autentifikatsiya + rol asosida yo'naltirish
prisma/
  schema.prisma        # ma'lumotlar bazasi sxemasi
  seed.ts              # demo ma'lumotlar
```

## Xavfsizlik

- Parollar bcrypt (12 round) bilan hash qilinadi; yangi parollar kamida 8 belgi
- Har bir API endpoint rol asosida himoyalangan (`requirePermission`)
- JWT cookie: `httpOnly`, `secure`, `sameSite=strict` (production)
- Productionda zaif `JWT_SECRET` / `CRM_API_KEY` bilan ishga tushmaydi
- Login, `/api/calls`, public ariza uchun rate limiting
- API kalit solishtirish timing-safe; fayl yuklash magic-byte tekshiruvi
- Security headers: HSTS, X-Frame-Options, nosniff va boshqalar
- Muhim amallar audit log (`activity_logs`) ga yoziladi

Production deploy oldin: `openssl rand -base64 32` bilan `JWT_SECRET` va `CRM_API_KEY` o'rnating.
Seed parollarini (`admin123`) darhol almashtiring.

## Skriptlar

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run db:seed` — demo ma'lumot
- `npm run db:reset` — bazani tozalab qayta yaratish
