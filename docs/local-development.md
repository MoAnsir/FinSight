# Local Development Guide

## Prerequisites

- Node 22+
- pnpm 11+
- Docker Desktop (running)
- Anthropic API key — optional, AI features degrade gracefully without one

---

## First-time setup

```bash
# 1. Install dependencies
pnpm install

# 2. Create the API env file
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — only DATABASE_URL and JWT_SECRET are required to start

# 3. Start the database
docker compose up postgres -d

# 4. Run migrations
pnpm --filter @finsight/api exec prisma migrate dev --name init

# 5. Seed dev account + 222 mock transactions
pnpm --filter @finsight/api db:seed
pnpm --filter @finsight/api db:seed:transactions

# 6. Start everything
pnpm dev
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:5173 |
| API | http://localhost:3001 |
| API health | http://localhost:3001/health |
| Prometheus metrics | http://localhost:3001/metrics |
| Prisma Studio | http://localhost:5555 |

**Dev credentials:** `dev@finsight.local` / `password123`

---

## AI features

AI features (chat, forecast) work without a key — the UI shows an amber banner and the API returns a placeholder message. To enable them:

```bash
# In apps/api/.env
ANTHROPIC_API_KEY=sk-ant-...
```

Restart the API after adding the key. The `/health` endpoint's `features.ai` field will flip to `true`.

---

## Daily commands

```bash
# Start all apps
pnpm dev

# Start only the API
pnpm --filter @finsight/api dev

# Start only the web app
pnpm --filter @finsight/web dev

# Start the database only
docker compose up postgres -d
```

---

## Code quality

```bash
# Type-check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Run all tests
pnpm test

# Build for production
pnpm build
```

---

## Database

```bash
# Open Prisma Studio (visual DB browser)
pnpm --filter @finsight/api db:studio
# → http://localhost:5555

# Create a migration after editing schema.prisma
pnpm --filter @finsight/api exec prisma migrate dev --name <describe-change>

# Apply migrations (CI / production)
pnpm --filter @finsight/api exec prisma migrate deploy

# Regenerate Prisma client without a migration
pnpm --filter @finsight/api exec prisma generate

# Reset the database (drops all data — dev only)
pnpm --filter @finsight/api exec prisma migrate reset

# Re-seed after a reset
pnpm --filter @finsight/api db:seed
pnpm --filter @finsight/api db:seed:transactions
```

---

## Docker

```bash
# Start postgres only (recommended for dev)
docker compose up postgres -d

# Start the full stack (postgres + api + web)
docker compose up -d

# Follow API logs
docker compose logs -f api

# Rebuild after a Dockerfile change
docker compose up --build -d

# Stop everything
docker compose down

# Stop everything and delete the database volume (full reset)
docker compose down -v
```

---

## Branches

All new work goes on feature branches, merged to `main` via PR.

| Branch prefix | Use for |
|---------------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `refactor/` | Code quality, no behaviour change |
| `docs/` | Documentation only |
| `ci/` | CI/CD pipeline changes |

```bash
# Create a branch
git checkout -b feat/my-feature

# Keep it up to date with main
git fetch origin
git rebase origin/main
```

---

## Troubleshooting

**"Invalid or missing token" errors after a code update**  
Auth moved from localStorage to httpOnly cookies. Sign out and back in to get a fresh cookie.

**API won't start — DATABASE_URL error**  
Check `apps/api/.env` exists and `DATABASE_URL` is set. Copy from `.env.example` if missing.

**Prisma client out of date**  
Run `pnpm --filter @finsight/api exec prisma generate` after pulling schema changes.

**Port 3001 already in use**  
Change `PORT` in `apps/api/.env` and update the `proxy` in `apps/web/vite.config.ts` to match.

**`pnpm dev` fails with "Missing packageManager field"**  
Run `pnpm install` from the repo root to update the lockfile.
