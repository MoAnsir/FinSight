# ADR-007: JWT stored in httpOnly cookies, not localStorage

**Status:** Accepted  
**Date:** 2026-07-06

## Context

The initial implementation stored JWTs in `localStorage`. This is a standard pattern in many tutorials but is unsuitable for a financial application because:

- Any JavaScript running on the page can read `localStorage`, including injected scripts from XSS attacks.
- Finance apps are a high-value XSS target. A stolen JWT gives an attacker full account access for the token's lifetime (7 days).

## Decision

Store the JWT in an **httpOnly, SameSite=Strict, Secure** cookie set by the server on login/register.

- `httpOnly` — JavaScript cannot read the cookie at all, eliminating the XSS theft vector.
- `SameSite=Strict` — The cookie is never sent on cross-site requests, eliminating CSRF without needing a token. A request forged from `evil.com` will not include the cookie.
- `Secure` — Cookie is only sent over HTTPS (enforced in production; relaxed in development for localhost).

A dedicated `POST /auth/logout` endpoint clears the cookie server-side. The frontend stores only the user's profile (id, email, name) in Zustand for display purposes — no token is held client-side.

## CSRF analysis

With `SameSite=Strict`, CSRF tokens provide no additional security benefit for a single-origin SPA. The browser enforces that the cookie is only sent on same-site navigations; a forged cross-site POST from another origin will arrive without the cookie and receive a 401. A CSRF token would be redundant here.

If the product ever needs to support subdomain-split deployments (e.g. `app.finsight.io` calling `api.finsight.io`), `SameSite=Lax` + a CSRF double-submit token would be required. This is not in scope.

## Consequences

**Positive**
- Eliminates the primary XSS token theft vector in the original design.
- Passes basic security review for a finance portfolio.

**Negative**
- Cookies require `credentials: 'include'` on every `fetch` call. This is handled centrally in `apps/web/src/lib/api.ts`.
- Multi-tab logout requires a server-side check (e.g. a token denylist). Currently we accept that revoking a session requires waiting for the 7-day expiry. This is documented as a known limitation.
- File upload requests (`FormData`) must also pass `credentials: 'include'` — applied to all import endpoints.
