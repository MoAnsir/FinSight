# ADR-008: Money stored as Decimal(12,2), not float or integer minor units

**Status:** Accepted  
**Date:** 2026-07-06

## Context

Financial applications have three common approaches to storing money:

1. **Float** (`DOUBLE PRECISION`) — native to most languages, trivial to use
2. **Integer minor units** — store pence/cents as an integer (£12.50 → 1250)
3. **Fixed-point decimal** (`DECIMAL(12,2)`) — exact decimal representation in the database

The choice matters because floating-point arithmetic is non-associative: `0.1 + 0.2 !== 0.3` in IEEE 754. For a financial application, rounding errors accumulate across aggregations and can produce incorrect totals.

## Decision

Use `DECIMAL(12,2)` in PostgreSQL via Prisma's `Decimal` type.

- Precision 12: supports balances up to £9,999,999,999.99 — sufficient for personal finance
- Scale 2: two decimal places covers GBP, USD, EUR and most major currencies
- Prisma returns `Decimal` objects; convert to `Number` only at the serialisation boundary (API response) using `Number(amount)`

## Why not integer minor units?

Integer minor units (storing pence) are the standard in payment processing systems (Stripe, Monzo's internal ledger). The advantages are exact arithmetic and no decimal conversion bugs. The disadvantage for this project: CSV imports give amounts as decimal strings (`-42.50`), not minor units. Converting at import introduces a transformation step that can fail silently on malformed input. `DECIMAL(12,2)` accepts `-42.50` directly.

If FinSight ever integrates with a bank API or payment processor, the import layer should convert minor units to `DECIMAL` at the boundary and this ADR should be revisited.

## Why not float?

`SELECT SUM(amount) FROM Transaction` on a float column returns a value that differs from the mathematically correct sum by up to several pence on a dataset of hundreds of transactions. This is unacceptable for a budgeting application where the user is making financial decisions based on the numbers shown.

## Consequences

- All arithmetic on amounts must use the Prisma `Decimal` type or PostgreSQL's native decimal arithmetic — never JavaScript `Number` for intermediate calculations
- Aggregations (`_sum`, `$queryRaw` SUM) are done in PostgreSQL and returned as `Decimal` — correct by construction
- The `Number(amount)` cast in API responses and frontend is safe because it is the final display conversion, not an intermediate calculation
- Multi-currency support is not handled: all amounts are assumed to be in the account's base currency. See the `currency` column on `Transaction` for future work.
