# API Reference

Base URL: `http://localhost:3001` (development)

All protected endpoints require the `finsight_token` httpOnly cookie, set automatically by the browser after login. When calling from a non-browser client (curl, Postman, tests), pass the token as `Authorization: Bearer <token>` — both mechanisms are supported.

---

## Authentication

### POST /api/auth/register

Create a new user account. Sets the `finsight_token` cookie on success.

**Request**
```json
{
  "email": "user@example.com",
  "password": "min8chars",
  "name": "Alice"
}
```

**Response `201`**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Alice"
  }
}
```

**Errors**
| Code | Reason |
|------|--------|
| 400 | Validation failed (email format, password too short) |
| 409 | Email already registered |

---

### POST /api/auth/login

Sets the `finsight_token` cookie on success.

**Request**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response `200`**
```json
{
  "user": { "id": "uuid", "email": "user@example.com", "name": "Alice" }
}
```

**Errors:** `400` validation, `401` invalid credentials

---

### POST /api/auth/logout

Clears the `finsight_token` cookie. **Response `204` No Content.**

---

### GET /api/auth/me

Returns the authenticated user.

**Response `200`**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Alice",
  "avatarUrl": null,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

---

## Transactions

### GET /api/transactions

Paginated, filterable list of transactions for the authenticated user.

**Query Parameters**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `pageSize` | number | 50 | Results per page (max 100) |
| `search` | string | — | Full-text search on description |
| `category` | string | — | Filter by category name |
| `dateFrom` | ISO date | — | Start date inclusive |
| `dateTo` | ISO date | — | End date inclusive |
| `amountMin` | number | — | Minimum amount |
| `amountMax` | number | — | Maximum amount |
| `sortBy` | `date\|amount\|description` | `date` | Sort field |
| `sortDir` | `asc\|desc` | `desc` | Sort direction |

**Response `200`**
```json
{
  "data": [
    {
      "id": "uuid",
      "accountId": "uuid",
      "date": "2025-01-15T00:00:00.000Z",
      "description": "TESCO STORES",
      "amount": "-42.50",
      "currency": "GBP",
      "category": "Food & Drink",
      "merchant": null,
      "notes": null
    }
  ],
  "total": 342,
  "page": 1,
  "pageSize": 50,
  "totalPages": 7
}
```

---

### POST /api/transactions/import

Upload a CSV and import transactions. Duplicate rows (detected by SHA-256 hash of raw row) are skipped silently.

**Request:** `multipart/form-data`
- Field `file`: CSV file, max 10 MB

**Query Parameters** — map CSV column headers to FinSight fields
| Param | Required | Description |
|-------|----------|-------------|
| `date` | Yes | CSV column name for the date |
| `description` | Yes | CSV column name for the description |
| `amount` | Yes | CSV column name for the amount |
| `currency` | No | CSV column name for the currency (defaults to GBP) |

**Example**
```bash
curl -X POST "http://localhost:3001/api/transactions/import?date=Date&description=Description&amount=Amount" \
  -b "finsight_token=$TOKEN" \
  -F "file=@statement.csv"
```

**Response `200`**
```json
{ "imported": 145, "skipped": 3, "total": 148 }
```

---

### PATCH /api/transactions/:id

Update a transaction's category, notes, or merchant. All fields optional.

**Request**
```json
{
  "category": "Food & Drink",
  "notes": "Weekly shop",
  "merchant": "Tesco"
}
```

**Response `200`:** updated transaction object. **Error `404`:** transaction not found or belongs to another user.

---

## Budgets

### GET /api/budgets

Returns all budgets with live spending progress for the current calendar month.

**Response `200`**
```json
[
  {
    "id": "uuid",
    "category": "Food & Drink",
    "limitAmount": "400.00",
    "period": "monthly",
    "spent": 312.50,
    "remaining": 87.50,
    "percentUsed": 78
  }
]
```

---

### POST /api/budgets

**Request**
```json
{
  "category": "Transport",
  "limitAmount": 150,
  "period": "monthly"
}
```

`period` must be `monthly`, `weekly`, or `yearly`. **Response `201`:** created budget object.

---

### PUT /api/budgets/:id

Replace a budget's limit or period. Same body as POST. **Response `200`.**

---

### DELETE /api/budgets/:id

**Response `204` No Content.**

---

## Insights

### GET /api/insights

Spending breakdown for the current calendar month and 6-month monthly income/expense totals.

**Response `200`**
```json
{
  "categoryBreakdown": [
    { "category": "Food & Drink", "_sum": { "amount": "-312.50" }, "_count": 28 }
  ],
  "monthlyTotals": [
    { "month": "2025-01", "income": 3200.00, "expenses": 2140.75 }
  ]
}
```

---

### GET /api/forecast

AI-generated 30-day cash flow narrative. Claude calls `query_transactions` and `compute_category_totals` tools internally to gather data before writing the forecast. Response time up to 15 seconds (tool round-trips + generation).

**Response `200`**
```json
{
  "summary": "Based on your spending over the last 90 days..."
}
```

---

## AI

### POST /api/ai/chat

**This endpoint streams via SSE (Server-Sent Events).** The response `Content-Type` is `text/event-stream`.

**Request**
```json
{
  "message": "What did I spend most on last month?",
  "conversationId": "uuid-optional"
}
```

Omit `conversationId` to start a new conversation.

**SSE Event Stream**

```
data: {"type":"tool","name":"compute_category_totals"}

data: {"type":"text","delta":"Your highest spending category "}

data: {"type":"text","delta":"last month was Food & Drink at £312.50."}

data: {"type":"done","conversationId":"uuid"}
```

**Event types**

| Type | Fields | Description |
|------|--------|-------------|
| `tool` | `name` | Claude is calling a data tool |
| `text` | `delta` | A text chunk to append to the response |
| `done` | `conversationId` | Stream complete |
| `error` | `message` | Error occurred — stream will close |

**Available tools Claude may call**

| Tool | What it queries |
|------|----------------|
| `query_transactions` | Transaction rows, filterable by category/date/search |
| `compute_category_totals` | Spending grouped by category |
| `find_recurring_payments` | Transactions with repeated description + amount |
| `get_budget_status` | Budget limits vs actual spend this month |

---

### GET /api/ai/conversations

Returns all conversations for the authenticated user, newest first, with all messages.

**Response `200`:** array of conversation objects each with a `messages` array.

---

## Health & Metrics

### GET /health

```json
{
  "status": "ok",
  "version": "1.0.0",
  "features": { "ai": true }
}
```

`features.ai` is `false` when `ANTHROPIC_API_KEY` is not set. The frontend uses this to show a warning banner on AI pages.

---

### GET /metrics

Prometheus-format metrics including request counts, response time histograms (p50/p95/p99), and error rates per route. Suitable for scraping by Prometheus or Grafana Agent.

---

## Error Format

All errors follow the same shape:

```json
{
  "statusCode": 404,
  "error": "NOT_FOUND",
  "message": "Transaction not found"
}
```

**Error codes**

| Code | HTTP status |
|------|------------|
| `BAD_REQUEST` | 400 |
| `UNAUTHORIZED` | 401 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `INTERNAL_ERROR` | 500 |

---

## Rate Limiting

100 requests per minute per IP. Exceeding returns `429 Too Many Requests`.
