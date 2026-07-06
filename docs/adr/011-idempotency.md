# ADR-011: Idempotency on financial mutations

**Status:** Accepted (partial implementation)  
**Date:** 2026-07-06

## Context

Financial mutations — particularly transaction import — must be safe to retry. Network failures, timeouts, and double-clicks can cause a client to send the same request twice. Without idempotency, the result is duplicate data or double-charges.

## Current implementation

Transaction import is idempotent by construction: the SHA-256 row hash stored in the `Transaction.hash` unique column means that re-importing the same CSV row is a no-op (the DB constraint rejects the duplicate and the import counts it as `skipped`). This provides idempotency without requiring the client to supply an idempotency key.

See ADR-009 for the limitations of hash-based deduplication.

## What is not yet idempotent

**Budget mutations** (`POST /budgets`, `PUT /budgets/:id`, `DELETE /budgets/:id`) have no idempotency protection. A double-submit on "Create Budget" creates two identical budgets. Mitigation in the UI: the submit button is disabled while the mutation is pending. This is a UI-layer guard, not a server-side guarantee.

**Category updates** (`PATCH /transactions/:id`) are naturally idempotent — applying the same category twice produces the same result. No special handling needed.

## Planned: explicit idempotency keys

The correct server-side solution for budget mutations is an idempotency key: the client generates a UUID per intent and sends it as a header (`Idempotency-Key: <uuid>`). The server stores the key and response; on retry, it returns the cached response without re-executing the mutation.

This pattern is used by Stripe, Monzo, and most financial APIs. Implementation requires:
1. A Redis or Postgres table to store `(key, userId, response, expiresAt)`
2. Middleware that checks the key before executing the handler
3. Client-side key generation per mutation intent (not per request — a retry must reuse the key)

This is not implemented because the risk surface for a personal budgeting app without real money movement is low. If FinSight were to integrate with a payment rail or ledger system, idempotency keys would be mandatory before launch.

## Audit log

Re-categorising a transaction is a financial data change that affects historical reporting. The current implementation overwrites the `category` field in place with no record of what it was before. A `CategoryChangeLog` table should record `(transactionId, previousCategory, newCategory, changedAt, changedBy)` so that:

- The user can see when and why a category changed
- Insights and budgets can be recomputed against a point-in-time snapshot
- Disputes about historical spend can be resolved

This is tracked as future work alongside the audit trail for import batches.
