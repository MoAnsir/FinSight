FROM node:22-alpine AS base
# Upgrade Alpine packages to patch OS-level CVEs before anything else
RUN apk upgrade --no-cache && npm install -g npm@latest && corepack enable pnpm

FROM base AS builder
WORKDIR /app
# Copy all workspace manifests so pnpm knows the full workspace on install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @finsight/api build
RUN pnpm --filter @finsight/api exec prisma generate
# Deploy creates a standalone dir with only production deps (no vitest, vite, tsx, etc.)
RUN pnpm --filter @finsight/api deploy --prod --legacy /deploy

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /deploy/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
EXPOSE 3001
CMD ["node", "dist/index.js"]
