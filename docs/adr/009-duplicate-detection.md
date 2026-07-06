# ADR-009: Duplicate detection via SHA-256 hash of raw CSV row

**Status:** Accepted (with known limitations)  
**Date:** 2026-07-06

## Context

CSV import is idempotent by design — importing the same file twice should not create duplicate transactions. We need a way to detect that a row has already been imported.

Options considered:

1. **Unique constraint on (date, description, amount)** — business-key deduplication
2. **Hash of raw CSV row** — content-addressed deduplication
3. **Explicit idempotency key** — client-supplied UUID per import batch

## Decision

Hash the raw CSV row object (`JSON.stringify(row)`) with SHA-256 and store it in a unique `hash` column on `Transaction`. An import attempt that produces a duplicate hash is caught by the DB constraint and counted as `skipped`.

```ts
const hash = crypto.createHash('sha256').update(JSON.stringify(row)).digest('hex')
```

## Why not business-key deduplication?

`(date, description, amount)` fails for legitimate duplicate transactions: buying coffee twice at Pret on the same day for the same amount produces two real transactions that are indistinguishable by business key. A unique constraint would silently drop the second one.

## Known limitations of the row hash approach

**Fragile to format changes.** The hash is computed over the raw CSV text before parsing. This means:

- A date formatted as `2025-06-01` vs `01/06/2025` produces a different hash for the same transaction
- Leading/trailing whitespace in any field changes the hash
- Column reordering changes the hash
- Re-exporting from your bank in a slightly different format will create duplicates

**No cross-format deduplication.** If a user imports from Monzo CSV and later connects a bank feed that delivers the same transactions as JSON, the hash will differ and the transaction will be imported again.

**The seed data uses `crypto.randomUUID()` as the hash**, which bypasses deduplication entirely for seeded data. This is intentional — seed data is synthetic and would otherwise hash-collide if re-seeded.

## Mitigation

The fragility is documented rather than fixed because the correct solution depends on the data source:

- For CSV-only imports: normalise fields (trim whitespace, parse and reformat dates) before hashing
- For bank API integration: use the bank's own transaction ID as the hash
- For multi-source deduplication: move to business-key matching with a fuzzy window (same amount ± 1 day)

This is tracked as future work. The current approach is correct for the single-source CSV case and the limitation is visible in the UI (`skipped` count).
