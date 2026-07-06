# FinSight — AI-Powered Financial Analytics

FinSight lets you upload bank statement CSVs, analyse spending patterns, set budgets, forecast cash flow, and query your finances in plain English — all powered by Claude (Anthropic).

> **Portfolio project** — demonstrating React 19, TypeScript, Fastify, Prisma, AI integration, TurboRepo monorepo management, Docker, and GitHub Actions CI/CD.

---

## Quick Start

**Prerequisites:** Node 22+, pnpm 9+, Docker Desktop

```bash
# 1. Clone and install
git clone https://github.com/your-username/finsight.git
cd finsight
pnpm install

# 2. Configure environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env and add your ANTHROPIC_API_KEY

# 3. Start the database
docker compose up postgres -d

# 4. Run migrations
pnpm --filter @finsight/api exec prisma migrate dev --name init

# 5. Start everything
pnpm dev
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:5173 |
| API | http://localhost:3001 |
| API health | http://localhost:3001/health |

Register an account, upload a bank statement CSV, and you're on the dashboard in under 2 minutes.

---

## Features

| Feature | Description |
|---------|-------------|
| **CSV Import** | Upload bank exports, map columns, duplicate detection via SHA-256 hash |
| **Transaction Management** | Search, filter, paginate, and re-categorise transactions |
| **Budgets** | Monthly/weekly/yearly limits per category with live progress tracking |
| **Spending Insights** | Category breakdown and 6-month cash flow charts |
| **AI Assistant** | Ask natural-language questions about your finances |
| **Cash Flow Forecast** | AI-generated 30-day forecast from transaction history |

---

## Monorepo Structure

```
finsight/
├── apps/
│   ├── api/                  Fastify REST API
│   │   ├── prisma/           Database schema and migrations
│   │   └── src/
│   │       ├── routes/       auth, transactions, budgets, ai, insights
│   │       ├── lib/          Prisma client, Anthropic client
│   │       └── middleware/   JWT auth guard
│   └── web/                  React 19 SPA
│       └── src/
│           ├── routes/       File-based TanStack Router pages
│           ├── stores/       Zustand auth store
│           └── lib/          API client, utilities
├── packages/
│   ├── types/                Shared Zod schemas + TypeScript types
│   ├── config/               Shared constants (categories, providers)
│   └── eslint-config/        Shared ESLint flat config
├── docs/
│   ├── architecture/         System design docs
│   ├── adr/                  Architecture Decision Records
│   └── api/                  API reference
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## Tech Stack

### Frontend
| Tool | Purpose |
|------|---------|
| React 19 | UI framework |
| Vite | Build tool and dev server |
| TanStack Router | Type-safe file-based routing |
| TanStack Query | Server state, caching, background refetch |
| Recharts | Charts and data visualisation |
| Tailwind CSS v4 | Utility-first styling |
| Zustand | Lightweight UI state (auth, theme) |
| Zod | Runtime schema validation |

### Backend
| Tool | Purpose |
|------|---------|
| Fastify | HTTP framework (faster than Express, built-in schema) |
| Prisma | Type-safe ORM with migration support |
| PostgreSQL | Primary database |
| `@fastify/jwt` | Stateless JWT authentication |
| `@fastify/rate-limit` | Rate limiting (100 req/min) |
| Zod | Request/response validation |

### AI
| Tool | Purpose |
|------|---------|
| `@anthropic-ai/sdk` | Claude API client |
| claude-sonnet-4-6 | Model for chat and forecasting |

### Infrastructure
| Tool | Purpose |
|------|---------|
| pnpm workspaces | Monorepo package management |
| TurboRepo | Parallel task execution and caching |
| Docker Compose | Local development environment |
| GitHub Actions | CI — lint, typecheck, test, build |

---

## Environment Variables

### `apps/api/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing JWTs |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key (from console.anthropic.com) |
| `REDIS_URL` | No | Redis URL (for future BullMQ job queues) |
| `PORT` | No | API port (default: 3001) |
| `CORS_ORIGIN` | No | Allowed frontend origin (default: http://localhost:5173) |

---

## Development

```bash
# Run all apps in parallel
pnpm dev

# Type-check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Run all tests
pnpm test

# Build for production
pnpm build

# Open Prisma Studio (database GUI)
pnpm --filter @finsight/api exec prisma studio
```

### Adding a database migration

```bash
# After editing apps/api/prisma/schema.prisma
pnpm --filter @finsight/api exec prisma migrate dev --name describe-your-change
```

---

## Production Deployment

### Docker Compose (self-hosted)

```bash
# Copy and configure production env
cp apps/api/.env.example .env.production
# Edit .env.production with real secrets

docker compose --env-file .env.production up -d
```

### Recommended cloud deployment

| Layer | Provider |
|-------|---------|
| Frontend | Vercel or Netlify |
| API | Railway, Render, or Fly.io |
| Database | Supabase, Railway, or Neon |

---

## Project Docs

- [Local Development Cheat Sheet](docs/local-development.md)

- [Architecture Overview](docs/architecture/overview.md)
- [API Reference](docs/api/reference.md)
- [API Reference](docs/api/reference.md)
- [ADR-001: React + Vite over Next.js](docs/adr/001-react-vite-over-nextjs.md)
- [ADR-002: TanStack Router over React Router](docs/adr/002-tanstack-router.md)
- [ADR-003: Fastify over Express](docs/adr/003-fastify-over-express.md)
- [ADR-004: PostgreSQL over MongoDB](docs/adr/004-postgresql-over-mongodb.md)
- [ADR-005: REST over GraphQL](docs/adr/005-rest-over-graphql.md)

---

## Definition of Done (V1)

- [x] Monorepo scaffold with TurboRepo + pnpm workspaces
- [x] Fastify API with JWT auth, Prisma, and PostgreSQL
- [x] React frontend with TanStack Router file-based routing
- [x] CSV import with duplicate detection
- [x] Transaction management with server-side filtering
- [x] Budget CRUD with live progress tracking
- [x] Spending insights and cash flow charts
- [x] AI chat assistant (Claude claude-sonnet-4-6)
- [x] Cash flow forecast
- [x] Docker Compose local setup (`docker compose up`)
- [x] GitHub Actions CI pipeline
- [ ] 80% test coverage
- [ ] Auto-categorisation via AI
- [ ] Lighthouse score > 90
