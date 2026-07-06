# ADR-004: PostgreSQL over MongoDB

**Status:** Accepted  
**Date:** 2025-01

## Context

FinSight stores financial transaction data. We needed to choose between a relational database (PostgreSQL) and a document database (MongoDB).

## Decision

Use **PostgreSQL**.

## Reasons

- **Transaction data is relational** — transactions belong to accounts, accounts belong to users, budgets reference categories. Foreign keys, cascade deletes, and joins are natural fits. Modelling this in documents requires either denormalisation (data duplication) or manual reference resolution in application code.
- **Aggregate queries** — spending analysis requires `GROUP BY category`, `SUM(amount)`, date range filters, and multi-column indexes. These are first-class SQL operations. MongoDB's aggregation pipeline is more verbose and harder to optimise.
- **`Decimal` type** — PostgreSQL's `DECIMAL(12,2)` stores monetary amounts exactly. MongoDB has no native decimal type; `Double` introduces floating-point rounding errors that are unacceptable for financial data.
- **Prisma support** — Prisma's PostgreSQL support is more mature than its MongoDB support. Migrations, introspection, and the query engine all work better with relational databases.
- **ACID guarantees** — multi-row operations (e.g. importing 500 transactions) are wrapped in a transaction. If the import fails halfway, nothing is committed. MongoDB requires explicit session-based transactions, which are more complex to manage.

## Trade-offs

- Requires a running Postgres instance (handled by Docker Compose locally, managed DB in production).
- Schema migrations require planning; MongoDB's schemaless nature allows faster iteration on the data model.
- If requirements change to storing unstructured data (e.g. arbitrary user-defined metadata), Postgres's `jsonb` column type handles this well.
