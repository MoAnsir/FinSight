# ADR-005: REST over GraphQL

**Status:** Accepted  
**Date:** 2025-01

## Context

We needed an API style for the frontend–backend contract. GraphQL is a popular alternative to REST, especially in data-heavy applications with complex query requirements.

## Decision

Use **REST**.

## Reasons

- **Single client** — FinSight has one frontend. GraphQL's primary benefit — letting multiple different clients request exactly the fields they need — does not apply here.
- **Simpler server** — REST routes map directly to business operations (import CSV, list transactions, create budget). There is no resolver tree, no N+1 problem to solve with DataLoader, no schema stitching.
- **Easier caching** — TanStack Query caches by URL + query params. REST endpoints have stable, predictable cache keys. GraphQL POST requests require client-side normalisation (Apollo Client, urql) to cache effectively.
- **File uploads** — `POST /api/transactions/import` is a `multipart/form-data` request. Handling file uploads in GraphQL requires workarounds (the `graphql-upload` spec is not part of the GraphQL standard).
- **HTTP semantics** — using the correct HTTP verbs and status codes (`201 Created`, `204 No Content`, `409 Conflict`) communicates intent without requiring clients to parse response bodies to determine success.

## Trade-offs

- Over-fetching: some endpoints return more fields than the UI needs. Acceptable at this scale.
- If a mobile client or third-party integration is added in V2, REST versioning is more work than adding GraphQL fields.
- No built-in introspection or self-documenting schema (mitigated by the [API reference](../api/reference.md)).
