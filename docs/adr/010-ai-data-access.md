# ADR-010: AI data access via tool use, not context injection

**Status:** Accepted  
**Date:** 2026-07-06

## Context

The AI assistant needs access to the user's financial data to answer questions accurately. Two approaches were considered:

**Option A — Context injection:** Fetch a batch of transactions upfront and include them in the system prompt or user message before calling the model.

**Option B — Tool use:** Define typed functions the model can call to retrieve exactly the data it needs for a given question.

The initial implementation used Option A (context injection with the last 100 transactions).

## Decision

Switch to tool use (Option B) with four tools:

| Tool | What it queries |
|---|---|
| `query_transactions` | Transaction rows, filterable by category / date / search |
| `compute_category_totals` | Spending grouped by category for a date range |
| `find_recurring_payments` | Transactions with repeated description + amount |
| `get_budget_status` | Budgets vs actual spending this month |

The model decides which tools to call based on the question. The API executes the Prisma queries, returns typed results, and the model uses them to construct its response.

## Why tool use is better here

**Token efficiency.** Context injection loads 100 rows regardless of whether the question needs them. "Are my subscriptions under £50/month?" needs `find_recurring_payments`, not 100 transaction rows. Tool use fetches only what the question requires — typically 80–90% fewer input tokens.

**Accuracy.** Aggregations (totals, percentages, budget comparisons) are computed in PostgreSQL, not by the model. The model cannot reliably sum a large list of numbers; the database can. Tool use routes aggregation questions to `compute_category_totals` rather than asking the model to add up raw rows.

**Auditability.** Tool calls appear in the SSE stream as named events. The frontend shows the user which data the model is querying. With context injection, the model's data access is invisible.

**Agentic pattern.** Tool use enables a proper agentic loop: the model can call multiple tools in sequence, inspect results, and decide whether more data is needed. Context injection is single-shot — the model works with whatever it was given.

## Consequences

- The agentic loop in `runAgenticLoop()` handles multi-turn tool calls. A single user message may result in 2–4 Anthropic API calls (one per tool-use round trip).
- Prompt caching on the system prompt and tool schemas amortises the per-call overhead across a conversation.
- The forecast endpoint also uses tool use — Claude queries the last 90 days of transactions via tools and produces a narrative forecast. This replaces the earlier context-injection approach.
- Tool results are typed and parameterised. The model cannot construct arbitrary SQL — it can only call the four defined tools with their declared parameter types.

## Future: MCP

The four tools could be exposed as a Model Context Protocol (MCP) server, allowing any MCP-compatible client (Claude Desktop, third-party apps) to query FinSight data without a bespoke integration. This would make the tool registry reusable across clients without duplicating the Prisma queries. Tracked as future work.
