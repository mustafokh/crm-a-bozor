#!/usr/bin/env bash
# MKUS CRM — Azure App Service + PostgreSQL Flexible Server
# Ishga tushirish: bash scripts/azure-setup.sh
set -euo pipefail

# ── Sozlamalar (kerak bo'lsa o'zgartiring) ──
RESOURCE_GROUP="${RESOURCE_GROUP:-mkus-crm-rg}"
LOCATION="${LOCATION:-uaenorth}"
APP_NAME="${APP_NAME:-mkus-crm-$(openssl rand -hex 3)}"
DB_SERVER="${DB_SERVER:-mkus-crm-db-$(openssl rand -hex 3)}"
PLAN_NAME="${PLAN_NAME:-mkus-crm-plan}"
DB_USER="${DB_USER:-mkusadmin}"
DB_NAME="${DB_NAME:-mkus_crm}"
GITHUB_REPO="${GITHUB_REPO:-mustafokh/crm-a-bozor}"
GITHUB_BRANCH="${GITHUB_BRANCH:-main}"

echo "=========================================="
echo "  MKUS CRM — Azure deploy"
echo "=========================================="
echo "Resource Group : $RESOURCE_GROUP"
echo "Location       : $LOCATION"
echo "App Service    : $APP_NAME"
echo "PostgreSQL     : $DB_SERVER"
echo "GitHub         : $GITHUB_REPO ($GITHUB_BRANCH)"
echo ""

if ! az account show &>/dev/null; then
  echo "Avval Azure'ga kiring: az login"
  exit 1
fi

SUB=$(az account show --query name -o tsv)
echo ">> Azure akkaunt: $SUB"
echo ""

# Parollar va kalitlar
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)}"
JWT_SECRET="$(openssl rand -base64 32)"
CRM_API_KEY="$(openssl rand -base64 32)"

echo ">> 1/6 Resource group yaratilmoqda..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none
echo "   ✓ $RESOURCE_GROUP"

echo ">> 2/6 PostgreSQL Flexible Server (Burstable B1ms)..."
az postgres flexible-server create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DB_SERVER" \
  --location "$LOCATION" \
  --admin-user "$DB_USER" \
  --admin-password "$DB_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --public-access 0.0.0.0 \
  --yes \
  --output none
echo "   ✓ Server: $DB_SERVER.postgres.database.azure.com"

echo ">> 3/6 PostgreSQL database yaratilmoqda..."
az postgres flexible-server db create \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$DB_SERVER" \
  --database-name "$DB_NAME" \
  --output none
echo "   ✓ Database: $DB_NAME"

echo ">> 4/6 App Service Plan (B1 Linux — eng arzon barqaror)..."
az appservice plan create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$PLAN_NAME" \
  --location "$LOCATION" \
  --sku B1 \
  --is-linux \
  --output none
echo "   ✓ Plan: $PLAN_NAME (B1)"

echo ">> 5/6 Web App (Node.js 20)..."
az webapp create \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$PLAN_NAME" \
  --name "$APP_NAME" \
  --runtime "NODE:22-lts" \
  --output none
echo "   ✓ Web App: https://${APP_NAME}.azurewebsites.net"

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_SERVER}.postgres.database.azure.com:5432/${DB_NAME}?sslmode=require"

echo ">> 6/6 Environment variables va startup..."
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --settings \
    DATABASE_URL="$DATABASE_URL" \
    JWT_SECRET="$JWT_SECRET" \
    CRM_API_KEY="$CRM_API_KEY" \
    NODE_ENV=production \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true \
    WEBSITE_NODE_DEFAULT_VERSION="~20" \
  --output none

az webapp config set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --startup-file "npm run start:prod" \
  --output none

# Azure servislaridan PostgreSQL'ga kirish
az postgres flexible-server firewall-rule create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DB_SERVER" \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0 \
  --output none 2>/dev/null || true

echo ""
echo "=========================================="
echo "  Infratuzilma tayyor!"
echo "=========================================="
echo ""
echo "App URL    : https://${APP_NAME}.azurewebsites.net"
echo "DB server  : ${DB_SERVER}.postgres.database.azure.com"
echo ""
echo "GitHub deploy uchun (keyingi qadam):"
echo "  az webapp deployment github-actions add \\"
echo "    --resource-group $RESOURCE_GROUP \\"
echo "    --name $APP_NAME \\"
echo "    --repo $GITHUB_REPO \\"
echo "    --branch $GITHUB_BRANCH \\"
echo "    --login-with-github"
echo ""
echo "Yoki Azure Portal → App Service → Deployment Center → GitHub"
echo ""
echo "⚠️  DB parol va kalitlar (xavfsiz joyga saqlang):"
echo "DB_PASSWORD=$DB_PASSWORD"
echo "JWT_SECRET=$JWT_SECRET"
echo "CRM_API_KEY=$CRM_API_KEY"
echo ""

# .azure-env faylga saqlash (gitignore'da)
ENV_FILE="$(dirname "$0")/../.azure-env"
cat > "$ENV_FILE" <<EOF
# Azure deploy — $(date -u +%Y-%m-%dT%H:%M:%SZ)
RESOURCE_GROUP=$RESOURCE_GROUP
APP_NAME=$APP_NAME
DB_SERVER=$DB_SERVER
APP_URL=https://${APP_NAME}.azurewebsites.net
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
CRM_API_KEY=$CRM_API_KEY
DATABASE_URL=$DATABASE_URL
EOF
chmod 600 "$ENV_FILE"
echo "Sozlamalar saqlandi: .azure-env (git'ga kirmaydi)"
