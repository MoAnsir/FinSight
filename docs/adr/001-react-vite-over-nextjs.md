# ADR-001: React + Vite over Next.js

**Status:** Accepted  
**Date:** 2025-01

## Context

FinSight is a single-user, authenticated SPA. All routes require a logged-in user except `/login` and `/register`. There is no public-facing content that benefits from server-side rendering or static generation.

## Decision

Use **React 19 + Vite** rather than Next.js.

## Reasons

- **No SSR requirement** — every page is behind auth. SSR's primary benefit (SEO and first-paint for public pages) does not apply.
- **Simpler mental model** — Vite is a build tool, not a framework. There is no App Router, no Server Components, no server actions, no edge runtime. The frontend is purely a static asset bundle served by Nginx or a CDN.
- **Explicit control** — routing, data fetching, and state management are chosen independently (TanStack Router, TanStack Query, Zustand) rather than inherited from a framework's opinions.
- **Faster dev server** — Vite's native ESM dev server starts in milliseconds regardless of project size.
- **Smaller deployment unit** — the built output is a folder of static files deployable to any CDN (Vercel, Netlify, Cloudflare Pages) without a Node.js runtime.

## Trade-offs

- No automatic code splitting by route (handled manually via TanStack Router's lazy loading).
- No built-in image optimisation — acceptable for V1 (no user-uploaded images).
- If requirements change to include public marketing pages or server components, migrating to Next.js would be non-trivial.
