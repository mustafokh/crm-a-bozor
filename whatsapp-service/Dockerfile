# Node 20 + native deps for Baileys
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build \
  && npm prune --omit=dev

# Persistent auth volume mount point
RUN mkdir -p /data/auth_info
ENV AUTH_DIR=/data/auth_info
ENV PORT=8080
ENV HOST=0.0.0.0
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "dist/index.js"]
