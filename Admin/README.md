# Admin panel

React 19 + TypeScript + Vite + Tailwind CSS v4. Reads **live data** from the
API's `/v1/admin` routes (`backend/src/routes/v1/admin.routes.ts`) — no mocks.

## Run

```sh
# 1. API (from backend/) — needs ADMIN_JWT_SECRET in backend/.env
npm run dev

# 2. Panel (from Admin/)
npm install
npm run dev          # http://localhost:5174 — /v1 is proxied to :4000
```

Create or reset an admin (from `backend/`):

```sh
npm run seed:admin -- --email you@example.com            # generates a password, prints it once
npm run seed:admin -- --email you@example.com --reset    # new password
```

## Security model

The **server** is the security boundary; the route guard in the panel is only UX.

| Layer | What it does |
|---|---|
| Separate `admins` collection + `ADMIN_JWT_SECRET` | An app user's phone login or token can never open the panel. |
| scrypt password hashes | Passwords are never stored. |
| Login: per-IP rate limit (10 / 15 min) + per-account lockout (5 failures → 15 min) | Stops guessing. Same error for "unknown email" and "wrong password", equal timing. |
| HttpOnly + SameSite=Strict + Secure(prod) cookie, path `/v1/admin` | Script can't read the session; other sites can't send it. |
| Required `X-Admin-Request` header + CORS limited to `ADMIN_ORIGINS` | CSRF protection. |
| Session stored in Redis, 8 h hard expiry | Sign-out is immediate and server-side. |
| `Cache-Control: no-store`, `noindex` | No admin data in caches or search engines. |
| Built page ships a strict Content-Security-Policy | Only talks to its own origin + the API. |

## Production

Serve the built `dist/` from the **same host as the API** (e.g. nginx:
`/` → `dist/`, `/v1/` → API) — then nothing else is needed. If the panel is on
a different origin, set `VITE_API_URL` at build time and list the panel origin
in the API's `ADMIN_ORIGINS`. Any static host must fall back to `index.html`.

## Structure

```
src/
  components/ui/       global building blocks (Button, Card, DataTable, Modal, …)
  components/layout/   AppShell, Sidebar, Topbar, NavItem
  components/domain/   status/reason badges
  features/<area>/     page-specific components (dashboard, users, reports, auth)
  pages/               one file per route, composed from the above
  services/ lib/ hooks/ auth/ types/
  styles/index.css     THE only place colours and fonts are defined
```

`npm run check:size` fails if any file in `src/` passes 200 lines.
