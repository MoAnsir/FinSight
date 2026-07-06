# ADR-003: Fastify over Express

**Status:** Accepted  
**Date:** 2025-01

## Context

We needed a Node.js HTTP framework for the API. Express is the dominant choice by familiarity. Fastify is the main performance-oriented alternative.

## Decision

Use **Fastify**.

## Reasons

- **Performance** — Fastify is consistently 2–3× faster than Express in benchmarks. At our scale this doesn't matter, but it demonstrates awareness of the choice.
- **Built-in schema validation** — Fastify integrates JSON Schema validation into the request lifecycle. We use Zod instead (via manual parsing), but the framework doesn't fight this.
- **Plugin ecosystem** — `@fastify/jwt`, `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`, and `@fastify/multipart` are all first-party, well-maintained, and designed for Fastify's lifecycle. The Express equivalents (`jsonwebtoken`, `cors`, `helmet`) are third-party with varying maintenance quality.
- **TypeScript support** — Fastify's TypeScript types are excellent and ship with the package. Express types are in `@types/express` and lag behind.
- **Structured logging** — Fastify uses Pino by default, producing structured JSON logs ready for ingestion by Datadog, CloudWatch, etc. Express has no built-in logging.

## Trade-offs

- Smaller community than Express; fewer tutorials and examples.
- Some Express middleware is not directly compatible (requires adaptation).
- The plugin/decorator pattern is unfamiliar to Express developers.
