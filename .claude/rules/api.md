---
paths:
  - "src/lib/api.ts"
  - "src/lib/types.ts"
  - "src/lib/auth.svelte.ts"
  - "src/routes/**/*.svelte"
  - "src/lib/components/*.svelte"
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
- On a **401 whose body is `Unauthorized`**: refresh **once**, retry **once**.
  A 401 or 400 from the refresh (`isTokenVerdict`) clears the store and runs
  `goto('/login')`. A network error or 500 from the refresh is returned, and
  the session is kept.
  Never loop. See "Auth" below for the other 401s
- Parse **all three** error shapes into the `ErrorBody` union (below), so the
  caller narrows with `'issues' in err` and `'blocked_cc_ids' in err`, two
  independent checks
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

- the two save endpoints — **only** for keys not editable in the current state.
  A bad *value* (length, enum, type, assignee) is a plain `ErrorResponse` for the
  first failing field
- **T2 and T6 only** — the two *submit* transitions: missing mandatory fields,
  failed date rules, missing evidence

Cancel (T3), the implementation decision (T4/T5) and the final decision (T7/T8)
fail on the **first** problem with a plain `ErrorResponse`. By design: they
validate a small request body the user just typed. Only `HandlerSubmitForImplApproval`
and `HandlerSubmitForFinalApproval` declare an issues array.

**Render every item** when there is one.

`PUT /users/{id}` and `.../active` can return `blocked_cc_ids` on a 409, and the
request is **all-or-nothing** — do not tell the user the name was saved.

## Saving (blueprint A2, A3)

⚠️ **Send only the fields that changed**, compared through the same function that
built the form. A whole-form body reverts another tab's save, writing false
`FieldUpdated` rows on the dates and the approver, and truncates a TIME stored
with seconds. An empty diff sends nothing: `{}` is a 400.

- ⚠️ **T2 and T6 carry no field values, and silently ignore any they are sent.**
  No 400 catches a submit of unsaved edits, so Submit must be disabled while the
  form is dirty. T3, T4/T5 and T7/T8 do carry their own fields.
- **Lock the form while a save is in flight**, because the response rebuilds
  `form`. Keep the lock out of the permission check that the asterisks read.
- **A partly typed date reads `''`.** Check `validity.badInput` on the four date
  and time inputs and refuse the save, or it clears the stored date.
- **A save's value errors are plain `ErrorResponse`s for the first failing
  field.** Every 400 is atomic, audit rows included.
- **A 409 means the record has left the state: refetch it** (A8.2).

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
The exemption comes from how `api.ts` is built: those three have their own
functions, and only `request()` has a 401 path.

⚠️ **Retry only on a 401 whose body is `Unauthorized`.** The status alone
cannot tell a dead token from a failed e-signature. Every signed transition
returns 401 `Invalid credentials`. Retrying it logs the user out for a typo,
and it writes a **second `SignatureFailed` audit row** for one attempt.
`middlewareAuth` sends only `Unauthorized` and `Account is deactivated`. The
second ends the session with no refresh. Every other 401 goes back to the
caller. Apply the same rule to the retry's response. This couples the client
to the wording in `middleware.go`, and it fails safe if that wording changes.

⚠️ **Restoring on load (blueprint A1.9).** A hard reload loses the user and the
access token, and only the refresh token survives. **Never redirect on a null
`auth.user`**: it is null for a valid session until the restore finishes, so
gate rendering on it instead.

The restore itself:
- If no refresh token is stored, go to `/login` **without** calling `/refresh`.
  A blank token is a 400 there, as on `/revoke`.
- Otherwise call `/refresh`, then `GET /me` through `request()`.
- **`isTokenVerdict(status)`** decides the outcome. A 401 or 400 **from
  `/refresh` only** ends the session. A 0 or 500 keeps the token and shows a
  Retry. Never apply the predicate to any other endpoint, where a 400 is a
  validation error.

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
display, send the same shape back. `<input type="time">` gives `HH:MM` only while
it has no `step` attribute.

⚠️ **`""` is also a 400 on `assigned_approver_id`** (`*uuid.UUID` cannot parse
it). Text and enum fields are the only ones where `""` clears.

⚠️ **Display: slice, never parse** (blueprint A5.5).

| Column | Display |
|---|---|
| `DATE` | `iso.slice(0, 10)` |
| `TIME` | `iso.slice(11, 16)` |
| `TIMESTAMPTZ` (`created_on`, `*_approval_on`, `actual_closure_date`, `uploaded_on`, `signed_on`) | an instant: `formatDateTime`, in the browser's zone |

- **A DATE must not go through `new Date()`.** Rendered anywhere west of UTC, `new Date('2026-10-25T00:00:00Z')` reads 24 Oct.
- **The bug cannot be seen from +04:00.** Test it with a timezone override.

## `null` meets `bind:value`

An input bound to `null` renders the string `"null"`. Convert at the boundaries:

```ts
const form = $state({ change_title: cc.change_title ?? '' });   // API → form
change_title: form.change_title === '' ? null : form.change_title  // form → API, no trim
```

`'' → null` is **load-bearing** on five fields, where `""` is a 400: the four
dates and times, and `assigned_approver_id`. On the 13 text fields and six enum
selects it only tidies, because the server trims and nulls `""` itself.
**Never trim on the client**: Go's `TrimSpace` and JavaScript's `trim()` disagree
on U+0085 and U+FEFF.

`form` and the record (`cc`) are **two objects**. Only a fetch or a save response
replaces `cc`, and `form` is rebuilt from it every time, since the server trims.
