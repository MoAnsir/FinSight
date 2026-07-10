# Architecture Overview

## Context

FinSight is a personal financial analytics platform. Users import bank statement CSVs, track budgets, and query their financial data through an AI assistant powered by Claude. The AI uses a tool-use agentic pattern — it queries real transaction data rather than receiving a data dump.

The architecture prioritises:
- **Security** — httpOnly cookies, no secrets in the browser, parameterised queries throughout
- **Correctness** — Zod validation at every boundary, `Decimal(12,2)` for money, DB-side aggregations
- **Separation of concerns** — thin HTTP routes, service layer for business logic, shared type package

---

## High-Level Design

```
Browser (React SPA)
        │  HTTPS / REST + SSE
        ▼
  Fastify API (Node 22)
        │
   ┌────┴────────────────┐
   │                     │
Prisma ORM          Anthropic SDK
   │                     │
PostgreSQL         Claude claude-sonnet-4-6
                   (tool use agentic loop)
```

The frontend and API are separate processes. The API is the only component that touches the database or external AI services. The browser never holds a JWT or API key.

---

## Request / Response Flow

### Authentication

```
POST /api/auth/login
  → Verify credentials with bcrypt
  → Sign JWT { sub: userId, email }, 7-day expiry
  → Set httpOnly SameSite=Strict cookie (finsight_token)
  → Return { user } — no token in the response body

All subsequent requests
  → Browser sends cookie automatically (credentials: include)
  → requireAuth middleware calls request.jwtVerify()
  → getRequestUser(request) extracts userId
  → userId attached to Pino log child for structured logging
```

See [ADR-007](../adr/007-jwt-httponly-cookies.md) for the threat model.

### CSV Import

```
POST /api/transactions/import (multipart/form-data)
  → requireAuth
  → TransactionService.importTransactions(userId, file, columnMap)
  → csv-parse reads rows
  → SHA-256 hash of raw row → unique constraint prevents duplicates
  → Prisma createMany
  → { imported, skipped, total }
```

See [ADR-009](../adr/009-duplicate-detection.md) for hash deduplication tradeoffs.

### AI Chat (agentic loop)

```
POST /api/ai/chat
  → Responds as SSE (text/event-stream)
  → AIService.chatStream(userId, message, conversationId?, onChunk)
      │
      └─ runAgenticLoop(systemPrompt, message, toolExecutor, onChunk)
              │
              ├─ Claude decides which tools to call
              ├─ Tool call: query_transactions → Prisma query
              ├─ Tool call: compute_category_totals → Prisma groupBy
              ├─ Tool call: find_recurring_payments → Prisma groupBy
              ├─ Tool call: get_budget_status → Budget + Transaction queries
              └─ Claude streams final answer token by token

SSE event types:
  { type: "tool", name: "query_transactions" }   ← tool being called
  { type: "text", delta: "Your top..." }         ← text chunk
  { type: "done", conversationId: "uuid" }       ← complete
  { type: "error", message: "..." }              ← failure
```

See [ADR-010](../adr/010-ai-data-access.md) for why tool use replaced context injection.

---

## Layer Architecture

```
apps/api/src/
  routes/          ← HTTP only: parse input, call service, return response
  services/        ← Business logic and DB queries (no HTTP concerns)
  lib/             ← Shared utilities: prisma client, AI client, error types
  middleware/      ← requireAuth, getRequestUser
```

Routes contain no Prisma calls. Services contain no Fastify/HTTP types. This boundary is enforced by convention — any PR adding `prisma.*` to a route file should be rejected.

**Error handling:** All routes throw `AppError`. A single `setErrorHandler` in `app.ts` catches everything and maps to structured JSON responses. Unhandled errors are logged and return a generic 500.

---

## Data Model

```
User
 └─ Account (one default per user)
     └─ Transaction (many; imported from CSV or bank feed)

User
 └─ Budget (one per category/period)

User
 └─ AIConversation
     └─ AIMessage (alternating user/assistant roles)
```

Key decisions:
- `Transaction.hash` — SHA-256 of raw CSV row; unique constraint is the idempotency mechanism for import
- `Transaction.amount` — `Decimal(12,2)`, never float. See [ADR-008](../adr/008-money-representation.md)
- `Budget.(userId, category, period)` — unique constraint, one budget per category per period

---

## Authentication

Stateless JWT stored in an **httpOnly SameSite=Strict cookie**. The browser sends it automatically on every same-origin request. JavaScript cannot read it (eliminates XSS token theft).

`POST /api/auth/logout` clears the cookie server-side.

No refresh tokens — 7-day expiry, re-login required after expiry. Acceptable for a portfolio project; a production system would add refresh token rotation.

---

## AI Integration

`apps/api/src/lib/ai.ts` exports:
- `isAIAvailable()` — feature flag, checks `ANTHROPIC_API_KEY`
- `runAgenticLoop(systemPrompt, message, toolExecutor, onChunk)` — drives the Claude tool-use loop, streams SSE chunks via callback
- `FINSIGHT_TOOLS` — the four typed tool definitions Claude can call

The tool executor is built in `AIService.buildToolExecutor(userId)` — a closure over the user's accountId that executes Prisma queries when Claude calls a tool. Claude cannot construct arbitrary queries; it can only call the four declared tools with their declared parameter types.

The AI chat endpoint streams responses via SSE. The frontend renders text token by token and shows animated badges for each tool call.

The forecast endpoint also uses `runAgenticLoop` — Claude calls `query_transactions` and `compute_category_totals` to gather data, then produces a narrative forecast. No financial modelling is done by the LLM; aggregation happens in PostgreSQL.

---

## Observability

Every request log includes: `requestId`, `method`, `url`, `statusCode`, `durationMs`.  
Authenticated requests additionally include: `userId`.

`GET /metrics` exposes Prometheus-format counters and histograms (p50/p95/p99 per route) via `fastify-metrics`.

Log format is structured JSON (Pino). In development, pretty-printed via `pino-pretty` if installed.

---

## Package Boundaries

| Package | Owns | Does not own |
|---------|------|-------------|
| `@finsight/types` | Zod schemas, inferred TS types | Business logic, DB access |
| `@finsight/config` | Shared constants (categories, providers) | Env vars, runtime state |
| `@finsight/api` | DB, auth, AI, HTTP handlers | UI, browser APIs |
| `@finsight/web` | React components, routing, UI state | DB, secrets |

---

## Security

| Control | Implementation |
|---------|---------------|
| Auth token storage | httpOnly SameSite=Strict cookie — JS cannot read it |
| CSRF | SameSite=Strict makes cross-site requests arrive without the cookie |
| Password storage | bcrypt cost factor 12; always runs for unknown emails (no timing enumeration) |
| Security headers | `@fastify/helmet` — CSP, HSTS, X-Frame-Options etc. |
| Rate limiting | `@fastify/rate-limit` — 100 req/min per IP |
| CORS | Restricted to `CORS_ORIGIN` env var |
| SQL injection | All queries through Prisma (parameterised) |
| AI key exposure | `ANTHROPIC_API_KEY` never leaves the API server |
| Input validation | Zod at every HTTP boundary before any DB access |

---

## Testing Strategy

The test suite follows the integration-first principle: the database layer is never mocked. Every service test executes real SQL against a `finsight_test` Postgres instance.

```
apps/api/src/test/
  setup.ts                   ← beforeEach wipe, shared prisma client
  factories.ts               ← createUser / createAccount / createTransaction / createBudget
  auth.integration.test.ts   ← HTTP-level tests via Fastify inject()
  transaction.service.test.ts
  budget.service.test.ts

apps/web/src/test/
  setup.ts                   ← @testing-library/jest-dom matchers
  BudgetAlertToast.test.tsx
  Button.test.tsx
  utils.test.ts
```

**Why real DB over mocks?** Mocked DB tests have historically passed while prod migrations failed (missed unique constraint violations, FK cascade behaviour, Prisma decimal precision). Integration tests catch the layer that actually breaks.

**CI:** The `test` job in `.github/workflows/ci.yml` spins up a Postgres 16 service container, runs `prisma migrate deploy`, then `pnpm test`. No secrets required to run the suite — AI tests are either skipped or the key is injected from `secrets.ANTHROPIC_API_KEY`.

---

## Known Gaps (tracked in ADRs)

- **Refresh tokens** — re-login required after 7-day expiry (ADR-007)
- **Budget mutation idempotency** — no server-side idempotency keys; UI button disable is the only guard (ADR-011)
- **Audit log** — transaction re-categorisation overwrites in place with no history (ADR-011)
- **Multi-currency** — all amounts assumed to be in GBP; `currency` column exists but is not used in aggregations (ADR-008)
- **Row hash fragility** — date format changes in CSV export break deduplication (ADR-009)
