# Architecture Overview

## Context

FinSight is a single-user financial analytics tool. Users upload bank statement CSVs and interact with their data through a React SPA. An AI layer (Claude) answers natural-language questions and generates forecasts.

The architecture prioritises:
- **Developer experience** — fast iteration with full type-safety end-to-end
- **Correctness** — Zod validation at every boundary (HTTP request → DB → HTTP response)
- **Simplicity** — no event streaming, no GraphQL, no microservices in V1

---

## High-Level Design

```
Browser (React SPA)
        │  HTTPS / JSON REST
        ▼
  Fastify API (Node 22)
        │
   ┌────┴────────────────┐
   │                     │
Prisma ORM          Anthropic SDK
   │                     │
PostgreSQL         Claude claude-sonnet-4-6
```

The frontend and API are deployed separately. The API is the only component that talks to the database and to external AI services. The frontend never holds an API key.

---

## Data Flow

### CSV Import

```
User selects file
  → POST /api/transactions/import (multipart)
  → CSV parsed with csv-parse
  → Each row hashed (SHA-256) for duplicate detection
  → Rows upserted into Transaction table
  → { imported, skipped } returned
```

### AI Chat

```
User sends message
  → POST /api/ai/chat { message, conversationId? }
  → Last 100 transactions fetched from DB
  → Serialised as JSON context
  → Sent to Claude with system prompt + user message
  → Response stored as AIMessage
  → { conversationId, message } returned
```

### Insights

```
GET /api/insights
  → Prisma groupBy on Transaction (current month)
  → Raw SQL for monthly totals (last 6 months)
  → { categoryBreakdown, monthlyTotals } returned
```

---

## Data Model

```
User
 └─ Account (one default per user)
     └─ Transaction (many, imported from CSV)

User
 └─ Budget (one per category per period)

User
 └─ AIConversation
     └─ AIMessage (alternating user/assistant)
```

Key design decisions:
- `Transaction.hash` — SHA-256 of the raw CSV row, unique constraint prevents duplicates on re-import
- `Transaction.amount` — stored as `Decimal(12,2)`, never float, to avoid rounding errors
- `Budget` has a `(userId, category, period)` unique constraint — one budget per category per period

---

## Authentication

Stateless JWT. On login/register the API signs a token (`{ sub: userId, email }`, 7-day expiry) with `JWT_SECRET`. The frontend stores it in `localStorage` and sends it as `Authorization: Bearer <token>` on every request.

No refresh tokens in V1 — the 7-day expiry is acceptable for a portfolio project. Refresh token rotation is the first auth improvement for V2.

---

## AI Integration

The AI client lives in `apps/api/src/lib/ai.ts`. It exports two things:

- `getAnthropicClient()` — lazy singleton, throws if `ANTHROPIC_API_KEY` is missing
- `chatWithContext(systemPrompt, userMessage, contextData?)` — wraps the Messages API, appends financial data inside `<financial_data>` XML tags

The system prompt instructs Claude to act as a financial assistant, cite transactions clearly, and format amounts with currency symbols.

The abstraction is thin by design — it's easy to add an OpenAI branch or a streaming variant without touching the route handlers.

---

## Package Boundaries

| Package | Owns | Does not own |
|---------|------|-------------|
| `@finsight/types` | Zod schemas, inferred TS types | Business logic, DB access |
| `@finsight/config` | Shared constants (categories, providers) | Env vars, runtime state |
| `@finsight/api` | DB, auth, AI, HTTP handlers | UI, browser APIs |
| `@finsight/web` | React components, routing, UI state | DB, secrets |

---

## Performance Targets

| Metric | Target | Approach |
|--------|--------|---------|
| Initial page load | < 2s | Vite code splitting, CDN for static assets |
| Filter/search response | < 300ms | Server-side filtering with DB indexes |
| AI response | < 10s | Claude claude-sonnet-4-6, streaming planned for V2 |
| Lighthouse score | > 90 | Lazy routes, image optimisation, semantic HTML |

---

## Security

- Passwords hashed with bcrypt (cost factor 12)
- JWT secret rotated per environment
- `@fastify/helmet` sets all recommended security headers
- `@fastify/rate-limit` — 100 requests/minute per IP
- CORS restricted to `CORS_ORIGIN` env var
- All DB queries go through Prisma (parameterised — no SQL injection risk)
- `ANTHROPIC_API_KEY` never leaves the API server
- OWASP Top 10 mitigations documented in [security checklist](../adr/security.md)
