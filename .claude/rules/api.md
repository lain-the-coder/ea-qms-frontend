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
interface ChangeControlResponse { change_title: string | null; /* …all 55 */ }

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

**Three** shapes, not two — the names are the spec's (see `src/lib/types.ts`):

```ts
interface ErrorResponse           { error: string }
interface ValidationErrorResponse { error: string; issues: string[] }
interface BlockedRoleChangeResponse { error: string; blocked_cc_ids: string[] }

type ErrorBody =
  | ErrorResponse
  | ValidationErrorResponse
  | BlockedRoleChangeResponse;
```

Narrow with two **independent** `in` checks — the discriminating keys are
disjoint, so order does not matter and `ErrorResponse` is what remains:

```ts
if ('issues' in err) …              // collected validation failures
else if ('blocked_cc_ids' in err) … // the 409 below
else …                              // `error` alone
```

Leaving the third member out is what makes `blocked_cc_ids` unreachable without
a cast, in the one place the user must be told the whole request was rejected.

### Where `issues` actually comes from

**Four endpoints, not "the transitions":**

- the two save endpoints — keys not editable in the current state
- **T2 and T6 only** — the two *submit* transitions: missing mandatory fields,
  failed date rules, missing evidence

Cancel (T3), the implementation decision (T4/T5) and the final decision (T7/T8)
fail on the **first** problem with a plain `ErrorResponse`. By design: they
validate a small request body the user just typed. Only `HandlerSubmitForImplApproval`
and `HandlerSubmitForFinalApproval` declare an issues array.

**Render every item** when there is one.

`PUT /users/{id}` and `.../active` can return `blocked_cc_ids` on a 409, and the
request is **all-or-nothing** — do not tell the user the name was saved.

## Auth

Access token (30 min) **in memory**. Refresh token (24 h absolute, 2 h sliding)
in `localStorage`, **not rotated**.

**Refresh proactively at ~24 minutes, gated on user activity.** A bare timer means
an idle tab refreshes forever and the server's inactivity window never expires.
Skip the scheduled refresh when nothing happened; the 401 path covers wake-from-idle.
**Only `/refresh` advances that window** — ordinary API calls do not.

⚠️ **`/login`, `/refresh` and `/revoke` are exempt from both the bearer header
and the 401-refresh-retry path.** They are mounted without the auth middleware
and 401 for their own reasons. Without the exemption a mistyped password fires a
refresh and logs the user out instead of saying "incorrect email or password".

`POST /revoke` is idempotent across every **token** state — valid, already
revoked, never existed — all 204. **But a blank or missing `refresh_token` is a
400.** So: call it only when a token is present, and **clear local state
unconditionally, before the call** — local state is what ends the session; the
call only stops the token being reused elsewhere. Logout does not end the user's
*other* sessions: login never revokes prior tokens.

**A 401 has three meanings** — `Invalid refresh token`, `Session expired`,
`Account is deactivated`. All three log out, but the third is not fixable by
signing in again, so carry the message to the login screen instead of showing a
generic "session expired". `is_active` is re-checked on **every** request, so
deactivation bites immediately, not in 30 minutes.

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
