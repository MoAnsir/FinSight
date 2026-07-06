# API Reference

Base URL: `http://localhost:3001` (development)

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

---

## Authentication

### POST /api/auth/register

Create a new user account.

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
  "token": "eyJ...",
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
  "token": "eyJ...",
  "user": { "id": "uuid", "email": "user@example.com", "name": "Alice" }
}
```

**Errors:** `400` validation, `401` invalid credentials

---

### GET /api/auth/me

Returns the authenticated user. Requires `Authorization` header.

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
| `dateFrom` | ISO date | — | Start date (inclusive) |
| `dateTo` | ISO date | — | End date (inclusive) |
| `amountMin` | number | — | Minimum transaction amount |
| `amountMax` | number | — | Maximum transaction amount |
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
      "notes": null,
      "isTransfer": false
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

Upload a CSV file and import transactions.

**Request:** `multipart/form-data`
- Field `file`: CSV file (max 10 MB)

**Query Parameters** (column name mapping)
| Param | Required | Description |
|-------|----------|-------------|
| `date` | Yes | CSV column name for the date |
| `description` | Yes | CSV column name for the description |
| `amount` | Yes | CSV column name for the amount |
| `currency` | No | CSV column name for the currency |

**Example**
```bash
curl -X POST http://localhost:3001/api/transactions/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@statement.csv" \
  "?date=Date&description=Description&amount=Amount"
```

**Response `200`**
```json
{
  "imported": 145,
  "skipped": 3,
  "total": 148
}
```

`skipped` = duplicates detected by SHA-256 hash of the raw row.

---

### PATCH /api/transactions/:id

Update a transaction's category, notes, or merchant.

**Request**
```json
{
  "category": "Food & Drink",
  "notes": "Weekly shop",
  "merchant": "Tesco"
}
```

All fields are optional. **Response `200`:** updated transaction object.

---

## Budgets

### GET /api/budgets

Returns all budgets with live spending progress for the current month.

**Response `200`**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
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

`period` must be `monthly`, `weekly`, or `yearly`.

**Response `201`:** created budget object.

**Error `409`:** budget already exists for this category + period.

---

### PUT /api/budgets/:id

Replace a budget's limit or period. Same request body as POST. **Response `200`.**

---

### DELETE /api/budgets/:id

**Response `204` No Content.**

---

## Insights

### GET /api/insights

Spending breakdown for the current calendar month + 6-month monthly totals.

**Response `200`**
```json
{
  "categoryBreakdown": [
    {
      "category": "Food & Drink",
      "_sum": { "amount": "-312.50" },
      "_count": 28
    }
  ],
  "monthlyTotals": [
    {
      "month": "2025-01",
      "income": 3200.00,
      "expenses": 2140.75
    }
  ]
}
```

---

### GET /api/forecast

AI-generated 30-day cash flow forecast based on the last 90 days of transactions. Response time up to 10 seconds.

**Response `200`**
```json
{
  "summary": "Based on your spending over the last 90 days, your average monthly outgoings are £2,140. You have two recurring direct debits totalling £850 (rent + broadband) typically hitting in the first week of the month..."
}
```

---

## AI

### POST /api/ai/chat

Send a message to the AI assistant. Provides your recent transactions as context.

**Request**
```json
{
  "message": "What did I spend most on last month?",
  "conversationId": "uuid-optional"
}
```

Omit `conversationId` to start a new conversation.

**Response `200`**
```json
{
  "conversationId": "uuid",
  "message": {
    "id": "uuid",
    "conversationId": "uuid",
    "role": "assistant",
    "content": "Last month your highest spending category was Food & Drink at £312.50 across 28 transactions...",
    "createdAt": "2025-01-15T12:00:00.000Z"
  }
}
```

---

### GET /api/ai/conversations

Returns all conversations for the authenticated user, newest first, with all messages included.

**Response `200`:** array of conversation objects each with a `messages` array.

---

## Error Format

All errors follow the same shape:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Human-readable description"
}
```

## Rate Limiting

100 requests per minute per IP. Exceeding this returns `429 Too Many Requests`.
