# ADR-002: TanStack Router over React Router

**Status:** Accepted  
**Date:** 2025-01

## Context

We needed a client-side router for the React SPA. The main contenders were React Router v6/v7 and TanStack Router v1.

## Decision

Use **TanStack Router**.

## Reasons

- **Full type safety** — route params, search params, and loader data are all typed end-to-end. Navigating to `/transactions?page=abc` is a type error at compile time. React Router's search param handling requires manual parsing.
- **Built-in search param state** — TanStack Router treats URL search params as first-class state with schema validation (via Zod). This replaces the need for a separate `useSearchParams` + parsing layer for filters, pagination, and sorting.
- **File-based routing with Vite plugin** — the `@tanstack/router-plugin` generates the route tree from the file system automatically, eliminating manual route registration boilerplate.
- **Route context** — the router context allows injecting `queryClient` at the root, making loader-level prefetching straightforward.

## Trade-offs

- Smaller ecosystem and fewer StackOverflow answers than React Router.
- The generated `routeTree.gen.ts` file must not be manually edited — this is unfamiliar to developers used to explicit route config.
- TanStack Router is newer; some patterns are still evolving.
