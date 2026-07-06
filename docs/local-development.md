# Local Development Cheat Sheet

## Prerequisites

- Node 22+
- pnpm 9+
- Docker Desktop (running)
- Anthropic API key — get one at console.anthropic.com

---

## First-time setup

Run these once after cloning the repo.

```bash
# 1. Install dependencies
pnpm install

# 2. Create the API env file
cp apps/api/.env.example apps/api/.env
# Open apps/api/.env and set ANTHROPIC_API_KEY=sk-ant-...

# 3. Start the database
docker compose up postgres -d

# 4. Run migrations
pnpm --filter @finsight/api exec prisma migrate dev --name init

# 5. Start everything
pnpm dev
```

The web app will be at http://localhost:5173 and the API at http://localhost:3001. Register a new account, then upload a CSV on the onboarding page.

---

## Daily dev commands

```bash
# Start all apps (API + web in parallel)
pnpm dev

# Start the database only
docker compose up postgres -d

# Stop the database
docker compose down
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

# Format all files
pnpm format

# Build for production
pnpm build
```

---

## Database

```bash
# Open Prisma Studio (visual DB browser)
pnpm --filter @finsight/api exec prisma studio
# → http://localhost:5555

# Create a new migration (after editing prisma/schema.prisma)
pnpm --filter @finsight/api exec prisma migrate dev --name <describe-change>

# Apply existing migrations (CI / production)
pnpm --filter @finsight/api exec prisma migrate deploy

# Regenerate the Prisma client without a migration
pnpm --filter @finsight/api exec prisma generate

# Reset the database (drops all data — dev only)
pnpm --filter @finsight/api exec prisma migrate reset
```

---

## Docker

```bash
# Start the full stack (postgres, redis, api, web)
docker compose up -d

# Follow API logs
docker compose logs -f api

# Rebuild containers after a Dockerfile change
docker compose up --build -d

# Stop everything and remove containers
docker compose down

# Stop everything and delete database volume (full reset)
docker compose down -v
```

---

## Local URLs

| Service | URL |
|---------|-----|
| Web app | http://localhost:5173 |
| API | http://localhost:3001 |
| API health check | http://localhost:3001/health |
| Prisma Studio | http://localhost:5555 |
