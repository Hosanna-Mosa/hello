# Public website

React 19 + TypeScript + Vite + Tailwind CSS v4. The pages Google Play review
asks for, plus a landing page.

| Route | Play Console field |
|---|---|
| `/privacy-policy` | Privacy policy URL |
| `/delete-account` | Delete account URL (in-app steps **and** a working web flow) |
| `/child-safety` | Child safety standards (CSAE) — required for social apps |
| `/terms`, `/community-guidelines` | UGC policy: published terms + rules |
| `/contact`, `/safety` | Support contact, report/block instructions |

## Before submitting to Play

Fill in every `TODO` in **`src/config/site.ts`** — company name, support /
privacy / safety emails, address, governing law. The policies quote them.

## Run

```sh
npm install
npm run dev     # http://localhost:5173 — /v1 is proxied to the API on :4000
npm run build   # → dist/
```

The delete-account page calls the API (`/v1/auth/code`, `/v1/auth/verify`,
`DELETE /v1/me`). In production set `VITE_API_URL` to the API origin and add
the site's origin to the API's `CORS_ORIGINS`.

The host **must** serve `index.html` for unknown paths so a reviewer opening
`/privacy-policy` directly gets the page (`public/_redirects` covers Netlify;
nginx: `try_files $uri /index.html;`).

## Structure

```
src/
  components/ui/       global building blocks (Button, Card, Section, Alert, …)
  components/layout/   SiteLayout, SiteHeader, MobileMenu, SiteFooter
  components/legal/    renders any policy from data (ContentDocument & parts)
  content/             policy WORDING as typed data — edit text here
  features/<area>/     page-specific components (home, deleteAccount, contact, safety)
  pages/               one file per route
  config/site.ts       every product/company fact, in one place
  styles/index.css     THE only place colours and fonts are defined
```

`npm run check:size` fails if any file in `src/` passes 200 lines.
