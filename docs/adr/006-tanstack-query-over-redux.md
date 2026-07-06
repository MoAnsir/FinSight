# ADR-006: TanStack Query over Redux

**Status:** Accepted  
**Date:** 2025-01

## Context

The frontend needs to fetch, cache, and keep server data fresh. The traditional approach is to store API responses in Redux (or Zustand/MobX). TanStack Query (formerly React Query) is a purpose-built server state library.

## Decision

Use **TanStack Query** for all server state. Use **Zustand** only for UI state (auth token, theme, sidebar visibility).

## Reasons

- **Server state ≠ client state** — data from the API has a lifecycle: it goes stale, it needs to be refetched, it can be invalidated by mutations. Redux treats everything as a flat key-value store and makes the developer manage staleness manually.
- **Less boilerplate** — a Redux slice for `transactions` requires an action creator, a reducer, a thunk (or saga/observable), a selector, and loading/error state fields. TanStack Query replaces all of this with `useQuery`.
- **Background refetch** — TanStack Query automatically refetches stale data when the user returns to a tab or reconnects to the network. This is non-trivial to implement in Redux.
- **Cache invalidation** — after a mutation (e.g. creating a budget), `queryClient.invalidateQueries({ queryKey: ['budgets'] })` triggers a refetch of all budget queries. Redux requires dispatching actions and writing reducer logic to achieve the same.
- **Devtools** — TanStack Query Devtools show every query's state, data, and staleness in a panel in the browser.

## Trade-offs

- TanStack Query manages server state only. Local UI state (which modal is open, sidebar collapse state) still needs a separate solution — we use Zustand for this.
- Developers new to the library sometimes misuse it for client-only state, which leads to unnecessary network requests.
