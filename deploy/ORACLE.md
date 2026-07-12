# MKUS CRM — Oracle Cloud ga deploy

## 1. Oracle akkaunt ochish

1. [cloud.oracle.com](https://cloud.oracle.com) → **Start for free**
2. Email, mamlakat, karta (tekshiruv uchun, Always Free da pul yechilmaydi)
3. **Home Region** tanlang: **Germany Central (Frankfurt)** yoki **France Central** — Yevropaga yaqin

> Agar rad etsa: boshqa email yoki VPNsiz qayta urinib ko'ring.

---

## 2. Virtual Machine (VM) yaratish

Console → **Compute** → **Instances** → **Create instance**

| Sozlama | Qiymat |
|---------|--------|
| Name | `mkus-crm` |
| Image | **Ubuntu 22.04** (aarch64) |
| Shape | **Ampere** → `VM.Standard.A1.Flex` |
| OCPU | **1** (yoki 2) |
| Memory | **6 GB** (yoki 12) |
| Boot volume | 50 GB |
| SSH keys | **Generate** yoki o'z kalitingizni yuklang (.pub) |

**Networking:** Public IP yoqilgan bo'lsin.

**Create instance** bosing. 2–3 daqiqa kuting.

**Public IP** ni yozib oling (masalan `123.45.67.89`).

---

## 3. Firewall ochish (MUHIM!)

Oracle ikkita joyda port ochiladi:

### A) Instance → Subnet → Security List

1. Instance sahifasida **Subnet** linkini bosing
2. **Default Security List** → **Add Ingress Rules**:

| Source | Port | Tavsif |
|--------|------|--------|
| 0.0.0.0/0 | 22 | SSH |
| 0.0.0.0/0 | 80 | HTTP |
| 0.0.0.0/0 | 443 | HTTPS |

### B) Ubuntu ichida (keyinroq skript ham ochadi)

---

## 4. SSH orqali serverga kirish

Kompyuteringizda (Mac):

```bash
# Oracle dan yuklab olgan private key
chmod 400 ~/Downloads/ssh-key-*.key
ssh -i ~/Downloads/ssh-key-*.key ubuntu@ORACLE_PUBLIC_IP
```

---

## 5. Serverni tayyorlash

Serverda (SSH ichida):

```bash
# Loyihani keyin yuklaysiz, avval skript:
sudo apt update && sudo apt install -y git

# Yoki loyiha yuklangandan keyin:
cd /opt/mkus-crm
sudo bash scripts/oracle-setup.sh
```

---

## 6. Loyihani Mac dan yuklash

**Yangi terminal** (Mac, loyiha papkasida):

```bash
cd "/Users/shukurullohkarimberganov/CRM A-BOZOR"

# SSH key bilan rsync
bash scripts/deploy-rsync.sh ubuntu@ORACLE_PUBLIC_IP /opt/mkus-crm

# Agar SSH key kerak bo'lsa:
rsync -avz -e "ssh -i ~/Downloads/ssh-key-*.key" \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude prisma/*.db --exclude .env \
  ./ ubuntu@ORACLE_PUBLIC_IP:/opt/mkus-crm/
```

---

## 7. .env va Docker ishga tushirish

Serverda:

```bash
cd /opt/mkus-crm

cp .env.production.example .env
nano .env
```

`.env` ichida:

```env
JWT_SECRET=paste-openssl-rand-output-here
SEED_DB=true
```

JWT generatsiya (serverda):

```bash
openssl rand -base64 32
```

Ishga tushirish:

```bash
sudo docker compose up -d --build
```

Loglar:

```bash
sudo docker compose logs -f
```

---

## 8. Tekshirish

Brauzerda: **http://ORACLE_PUBLIC_IP**

- Login: `admin@abozor.uz`
- Parol: `admin123` → **darhol o'zgartiring!**

---

## 9. Domen + HTTPS (ixtiyoriy)

Domen DNS da A-record → Oracle Public IP

```bash
sudo certbot --nginx -d crm.mkus.uz
```

---

## Muammolar

| Muammo | Yechim |
|--------|--------|
| Sayt ochilmaydi | Security List da 80-port ochilganini tekshiring |
| `docker: permission denied` | `sudo docker compose ...` ishlating |
| Build xato | `sudo docker compose build --no-cache` |
| DB bo'sh | `.env` da `SEED_DB=true` qayta build |

---

## Yangilash (keyin)

Mac dan:
```bash
bash scripts/deploy-rsync.sh ubuntu@ORACLE_IP /opt/mkus-crm
```

Serverda:
```bash
cd /opt/mkus-crm && sudo docker compose up -d --build
```
