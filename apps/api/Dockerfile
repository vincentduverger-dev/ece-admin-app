FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json prisma.config.ts ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY prisma ./prisma

RUN npm ci

COPY apps/api ./apps/api

EXPOSE 3000

CMD ["npm", "run", "dev", "-w", "apps/api"]
