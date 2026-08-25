---
paths:
  - "src/lib/api.ts"
  - "src/lib/types.ts"
  - "src/lib/auth.svelte.ts"
---

# API layer conventions

Full reasoning in `docs/FRONTEND_BLUEPRINT.md` A1–A9 and B6–B8. **Shapes come from
`docs/openapi.yaml`** — read it rather than inferring from a sample response.

## Read and write shapes are different types

⚠️ **The most important modelling decision in this build.**

```ts
// READ — every field present; null means empty
interface ChangeControl { change_title: string | null; /* …all 55 */ }

// WRITE — every field OPTIONAL; absent means "leave it alone"
interface SaveDraftRequest { change_title?: string | null; /* …the 24 */ }
```

The `?` **is** the absent case:

| TypeScript | JSON | Result |
|---|---|---|
| key omitted | *(absent)* | unchanged |
| `change_title: null` | `null` | cleared |
| `change_title: 'Fix'` | `"Fix"` | set |

Without `?`, TypeScript forces a value for every field, so a save built from a
response-shaped type sends the whole record and clears untouched fields. **No type
error, no runtime error — silent data loss.**

Two interfaces per resource wherever partial updates apply.

## Unions, not enums

String-literal unions for the six states, four roles, decisions and risk levels.
They match the wire format, narrow inside `{#if}`, and need no conversion.

**Copy every member from `docs/openapi.yaml`, including the ASCII hyphens.**

## `api.ts` — one wrapper, no raw fetch elsewhere

- Prefix `PUBLIC_API_URL` (`http://localhost:1304/api` — note the `/api`)
- Attach `Authorization: Bearer` from the auth store
- **Never set `Content-Type` on a `FormData` body.** A multipart request needs a
  boundary string only the browser knows; setting the header by hand omits it and
  the server cannot parse the body. The wrapper must branch on body type
- On **401**: refresh **once**, retry **once**, else clear the store and
  `goto('/login')`. Never loop
- Parse both error shapes into a discriminated union so `'issues' in err` narrows
- A separate path for file download, returning a **blob**

A raw `fetch` in a component skips the token, the refresh and the error parsing.

## Errors

```ts
interface ApiError       { error: string }
interface ValidationError { error: string; issues: string[] }
type ErrorBody = ApiError | ValidationError;
```

`issues` comes from the transitions (missing fields, failed date rules, missing
evidence — all collected) and the save endpoints (non-editable keys). **Render
every item.**

`PUT /users/{id}` and `.../active` can return `blocked_cc_ids` on a 409, and the
request is **all-or-nothing** — do not tell the user the name was saved.

## Auth

Access token (30 min) **in memory**. Refresh token (24 h absolute, 2 h sliding)
in `localStorage`, **not rotated**.

**Refresh proactively at ~24 minutes, gated on user activity.** A bare timer means
an idle tab refreshes forever and the server's inactivity window never expires.
Skip the scheduled refresh when nothing happened; the 401 path covers wake-from-idle.

`POST /revoke` is idempotent — 204 regardless. Clear local state either way.

## Dates

RFC 3339 only. `"2026-10-15"` and `""` are both 400 — **only `null` clears a date
field**. `TIME` columns return as `0000-01-01T09:00:00Z`; strip the date for
display, send the same shape back.

## `null` meets `bind:value`

An input bound to `null` renders the string `"null"`. Convert at the boundaries:

```ts
const form = $state({ change_title: cc.change_title ?? '' });   // API → form
change_title: form.change_title.trim() || null                  // form → API
```
