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

# Run all tests (see Testing section below)
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

## Testing

The test suite is split across two packages.

### Backend (API) — integration tests

All API tests hit a real Postgres database. They require a `finsight_test` database to exist with the schema applied.

```bash
# 1. Create the test database (one-time)
docker compose up postgres -d
docker exec -it finsight-postgres-1 psql -U finsight -c "CREATE DATABASE finsight_test;"

# 2. Apply migrations to the test database
DATABASE_URL=postgresql://finsight:finsight@localhost:5432/finsight_test \
  pnpm --filter @finsight/api exec prisma migrate deploy

# 3. Run the tests
DATABASE_URL=postgresql://finsight:finsight@localhost:5432/finsight_test \
  pnpm --filter @finsight/api test
```

What's covered:

| Suite | Tests | Covers |
|-------|-------|--------|
| `auth.integration.test.ts` | 7 | Register, login, logout, duplicate email, weak password, user enumeration |
| `transaction.service.test.ts` | 10 | List, filter, paginate, multi-tenant isolation, category update, duplicate detection |
| `budget.service.test.ts` | 9 | Create, spend calculation, month boundaries, income exclusion, update, delete |

Tests run sequentially (one file at a time) to avoid DB conflicts. Each test starts from a clean slate via `beforeEach` that wipes all rows.

### Frontend (web) — component tests

No database required — the frontend tests run entirely in jsdom.

```bash
pnpm --filter @finsight/web test
```

| Suite | Tests | Covers |
|-------|-------|--------|
| `BudgetAlertToast.test.tsx` | 6 | Alert rendering, warning/exceeded variants, stacking, dismiss, auto-dismiss |
| `Button.test.tsx` | 5 | Variants, size classes, disabled state, click handler |
| `utils.test.ts` | 6 | `formatCurrency`, `formatDate` formatting and edge cases |

### Run everything

```bash
# Runs both API and web tests (CI uses this)
DATABASE_URL=postgresql://finsight:finsight@localhost:5432/finsight_test pnpm test
```

### How tests run in CI

Every pull request triggers the full test suite on GitHub Actions before it can be merged into `main`. Three jobs run in parallel:

| Job | What it does |
|-----|-------------|
| Type-check & lint | `tsc --noEmit`, ESLint, production build |
| Dependency audit | `pnpm audit --prod` — fails on high/critical CVEs in production deps |
| Tests | Spins up a Postgres 16 container, runs `prisma migrate deploy`, then `pnpm test` |

All three must pass for the merge button to go green. Pushing a fix to the branch re-triggers the checks automatically. This means the `main` branch is always in a passing state — no broken code can land without CI approval.

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
