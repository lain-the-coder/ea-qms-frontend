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
  the server cannot parse the body. `send()` branches on `body instanceof FormData`
- On a **401 whose body is `Unauthorized`**: refresh **once**, retry **once**.
  A 401 or 400 from the refresh (`isTokenVerdict`) clears the store and runs
  `goto('/login')`. A network error or 500 from the refresh is returned, and
  the session is kept.
  Never loop. See "Auth" below for the other 401s
- Parse **all three** error shapes into the `ErrorBody` union (below), so the
  caller narrows with `'issues' in err` and `'blocked_cc_ids' in err`, two
  independent checks
- A separate path for file download, returning a **blob**: `download()`. It
  shares `request()`'s token and retry through one private `authorised(…, read)`.
  **Never copy the retry into a second function**; add a `read` instead

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

**Render every item** when there is one — ⚠️ **in a dialog, never the sticky
bar.** On the CC form, `fail()` routes by **shape**:
- **A body with `issues` goes to the requirements dialog:** `error` as the heading,
  then every item verbatim in a `<ul>`.
- **A plain `{ error }` goes to the bar.**

The rule is shape, never length. Twenty labels joined on one line squeezed the
bar's buttons onto three lines (step 9). The client's submit gate returns the same
shape as the server, so both open the same dialog.

`PUT /users/{id}` and `.../active` can return `blocked_cc_ids` on a 409, and the
request is **all-or-nothing** — do not tell the user the name was saved.

## Saving (blueprint A2, A3)

⚠️ **Send only the fields that changed**, compared through the same function that
built the form. A whole-form body reverts another tab's save, writing false
`FieldUpdated` rows on the dates and the approver, and truncates a TIME stored
with seconds. An empty diff sends nothing: `{}` is a 400.

- ⚠️ **T2 and T6 carry no field values, and silently ignore any they are sent.**
  No 400 catches a submit of unsaved edits, so Submit must refuse, with a
  message, while the form is dirty. **Not `disabled`:** `global.css` has no
  `.btn:disabled`, so a disabled button looks enabled and a click says nothing.
  Refuse at click time, and check `dirty` again just before the POST. T3, T4/T5
  and T7/T8 do carry their own fields.
- **Lock the form while a save is in flight**, because the response rebuilds
  `form`. Keep the lock out of the permission check that the asterisks read.
- **A partly typed date reads `''`**, so only `validity.badInput` on the four
  date and time inputs tells it from an emptied picker.
  - At click time, read it fresh and refuse the save, or the save clears the
    stored date. Refuse a submit the same way.
  - For `dirty`, which the diff alone would report clean, refresh a reactive copy
    from **both** `keyup` and `input`. Typing into an empty picker fires no
    `input` event, and the popup fires no `keyup`.
- **A save's value errors are plain `ErrorResponse`s for the first failing
  field.** Every 400 is atomic, audit rows included.
- **A 409 means the record has left the state: refetch it** (A8.2).

### The second save endpoint

`PUT /changecontrols/{ccID}/implementation` takes **five** keys and no others:
`actual_implementation_date`, `post_implementation_issues`,
`implementation_summary`, `deviations_from_plan`, `validation_performed`.
Same mechanics as the draft save — seeded from the locked row, trims, `""` →
`null`, a no-op writes nothing and does not move `last_updated_on`, unknown keys
rejected **before** the transaction (so a non-owner sending a bad key gets 400,
not 403). **No business rules**: any date is accepted, and "not in the future"
belongs to T6.

⚠️ **`implementation_evidence` is NOT one of the five.** It is editable in the
Matrix and mandatory at T6, but it goes through
`POST …/files/implementation_evidence`. Putting it in the save body returns
400 `Some fields cannot be edited in the In Implementation state` with
`issues: ["implementation_evidence"]`. Build the body from
`SaveImplementationRequest`'s keys and the type forbids it.

⚠️ **`actual_implementation_date` is a DATE column taking RFC 3339** — the same
trap as the four in `SaveDraftRequest`.

**It writes no audit rows, and that is correct.** BRD **SC-5** names the nine
critical fields, and none of these five is among them. Expect no `audit_logs`
row after an implementation save.

### The evidence upload (blueprint A6.1)

`POST …/files/implementation_evidence`, a `FormData` with **one** part named
`file`. It goes through `request()`, so the token and the 401 retry apply, and
re-sending the same `FormData` is safe.

⚠️ **The response is the whole `ChangeControlResponse`.** Call `setRecord()`
and never refetch, as after a save. That rebuilds every form object, so:
- **Refuse while dirty** through `unsavedRefusal('uploading')`, **before the
  picker opens**, and again at drop and send time. A lock alone cannot help,
  because the edits were typed before the click.
- **Lock while in flight** with `uploading`. It is its own flag only because
  `saving` drives the Save button's label. `editable()`, `unsavedRefusal()` and
  `save()` all read it.

**One file, PDF only, and it REPLACES.** No `multiple`. `accept` only filters
the picker. There is no delete endpoint, so a file can be replaced but never
removed.

**Which checks a file input can reach:**
- **Size, extension and empty.** The client refuses these before sending, with
  the Go's sentences, in the Go's order: `File must be 10 MB or smaller`,
  `Only PDF files are accepted`, `File payload cannot be empty`. Otherwise the
  whole file uploads for a certain 400, and over about 11 MB the failure may
  arrive as status 0.
- **Magic bytes** (`%PDF-` at byte 0). **The server alone decides these.** They
  return the same sentence as the extension.
- **409** once the record has left `In Implementation`: pinned, then reload.

Everything else is unreachable from the UI: the path checks, the part checks,
a blank filename (a dead check), a second size check (also dead), 403 and 404.
**Every 400 precedes the 404, 403 and 409.**

**The stored name may differ from the chosen one.** `sanitizeFilename` drops
`'`, `` ` ``, `;`, `"` and control characters, and trims. Render the name from
the response, never from the `File`.

**Side effects:** `last_updated_on` and `last_updated_by_id` move on every
upload, and **no audit row is written** (SC-5).

### The evidence download (blueprint A6.2)

`GET …/files/implementation_evidence` through `download(path)`, which returns
`ApiResult<Blob>`. **Any role, any state**: there is no role, owner or state
check, while POST on the same path is owner-only.

- **The status is branched on before the body is read**, in `toResult`. Every
  error, the 401s included, is JSON, so the 401 retry works unchanged. Never
  call `.blob()` on an unchecked response: it saves a JSON error as the file.
- **Truncation is status 0**, "The download was interrupted. Try again.",
  caught in `download()` only. It is reachable through the 30 s `WriteTimeout`
  (flag 61).
- ⚠️ **The filename comes from `cc.implementation_evidence.file_name`, set as
  `a.download`, never from `Content-Disposition`.** Go writes it as raw UTF-8,
  and `Headers.get` returns one character per byte, so a non-ASCII name arrives
  garbled. The header is exposed, and it is still the wrong source.
- **Revoke the object URL straight after `click()`.** The pending download
  already holds the Blob.
- **It writes nothing**: no audit row, and `last_updated_on` does not move.
- **None of its errors is reachable from the UI** (no delete routes exist).
  Render any verbatim through `fail()`.

## Transitions

⚠️ **Authorisation is by RECORD, not by role** (A7.6). See `svelte.md`'s
Permissions table. No transition route carries `requireRole`.

⚠️ **All five return 200 with the full `ChangeControlResponse`** — re-fetched
inside the transaction with the five user joins, identical to `GET /{ccID}`.
**Call `setRecord()` on the response; never refetch** (A7.7).

**Check order.** T2 and T6 validate the *stored row*, so their presence checks
run after 404/403/409. The other three validate a body the user just typed, and
those checks run **before the transaction opens** — so they precede the 404, the
403 and the 409. A blank `decision_comments` on a record that has already moved
on returns the 400, not the 409.

⚠️ **T2 and T6 have body checks too, and they run first:** blank email, blank
password, a bad body, a blank CC-ID. Each is a **plain `ErrorResponse`** 400, so
a T2/T6 400 does not always carry `issues`. The modal refuses both blanks
before sending.

**The signature is checked last** in all five (A7.4), so the modal should only
open once the client-side checks pass. ⚠️ **T2 and T6 both have a date rule the
server checks in the same pass as presence**, so the gate mirrors both:

| | T2, in `Initiated` | T6, in `In Implementation` |
|---|---|---|
| Rule | `proposed_implementation_date` ≥ 2 business days, `target_closure_date` ≥ 10 | `actual_implementation_date` **not after today** |
| Comparison | `value < earliestSubmitDate(n)` | `value > todayUTC()` — Go is `After(today)`, so **today passes**; never `>=` |
| Sentence | `X must be at least N business days from today` | `Actual Implementation Date cannot be in the future` |

- **UTC dates only**, from one `utcMidnight()`, computed at click time and never
  cached. ⚠️ **The trap runs both ways:** a local-date boundary is too *strict*
  for T2 and too *lenient* for T6, and lenient is worse — it passes a date the
  server rejects, after the password has been collected.
- The rules only fire on a **present** value, as in the Go, so a missing date is
  never also reported as a bad one.
- **Neither save checks a date rule.** The implementation save accepts any date
  (drafting Monday for Wednesday's work), so a stored future date is a legitimate
  thing to find on screen.

⚠️ **`min` and `max` on the date inputs are affordances, never the gate — and
they fail in opposite directions.** A stale `min` (step 9) only ever offers too
many days, and the gate refuses with the server's sentence. A stale `max` (T6)
**refuses a date the server accepts**, silently, with no message. Both go stale
the same way: the attribute re-evaluates on state changes, never on the clock.
`max` stays because it blocks the picker and not the keyboard — the date can
still be typed, bound, saved and submitted — and because any load or save
response clears it. Flag 62.

**T2's and T6's issue ORDER differs from the Go's, and that is accepted.** The Go
lists Implementation Evidence first; `MANDATORY` has its own order. The items are
the same and nobody sees both refusals at once. Do not "fix" it.

⚠️ **Never trim the password.** The Go trims the email and not the password.
The prototypes trim both.

**Trimming is decided per field** (step 10). A client-side check applies what
the server applies to that field, and every value is **sent as typed**:

| Field | Go | Client check | Sent |
|---|---|---|---|
| password | not trimmed | `=== ''` | as typed |
| email | `TrimSpace` | `.trim() === ''` | as typed |
| `cancellation_reason` | `TrimSpace`, then ≤500 runes | `.trim() === ''`, `[...trim()].length > 500` | as typed |
| `decision_comments` · `final_comments` | `TrimSpace`, then ≤2000 runes | in `submitGate`: `.trim() === ''`, `[...trim()].length > 2000` | as typed |

⚠️ **The comment length check runs at the two approver gates only.** T2 and T6
check no lengths, and the columns are plain `TEXT`, so a value over the limit
written straight to the database passes both. Do not widen the rule to them.

The U+0085 / U+FEFF mismatch is safe for a check. The client refuses a reason
that is only U+FEFF, and anything the server refuses instead is a plain 400,
which stays in the modal.

**The modal's outcomes** (one modal, `openEsig(meaning, send)`):

| Result | Do |
|---|---|
| 200 | `setRecord(response)`, close, set the notice, refetch **signatures only** |
| 401 `Invalid credentials` | stay open, clear **only** the password; the email and T3's reason are kept |
| 0 / 500 | stay open, the message verbatim, nothing cleared; a retry is safe (a committed first attempt gets 409) |
| 400 without `issues` | **stay open, the message verbatim, nothing cleared** (step 10) |
| 409 | close, pinned error in the bar, reload |
| 400 with `issues` | swap to the requirements dialog, credentials cleared |
| 403 / 404 | close, error in the bar |

⚠️ **The rule: an error goes where the user can act on it.** Failures about the
record close the modal. A plain 400 is always a body check made before the
transaction, and for T2 and T3 every body value is typed **in** the modal.
⚠️ **T4/T5 and T7/T8 keep the same row (step 11)**, although their bodies carry
fields from the form behind the modal. The gate trims and checks lengths, so only
a U+0085 or U+FEFF paste reaches a field 400. The same U+0085 in the email draws
`Email cannot be blank`, which belongs in the modal. Telling them apart needs the
message (forbidden) or Go's whitespace table (rejected), and routing by
transition misroutes the email case. **No mechanism: the field 400 shows in the
modal, verbatim.**

⚠️ **T4/T5 and T7/T8: the meaning follows the decision**, from a
`Record<Decision, SignatureMeaning>` per gate, and `send` is built from a
snapshot of the buffer taken at click time.

⚠️ **T3 is the signature modal, not a third one.** `openEsig('Cancelled', send)`.
`cancelling = meaning === 'Cancelled'` adds the reason field, the prototype's
heading and subtitle, and a red confirm button. `send` builds a `CancelRequest`
from `esigReason` when called. `closeDialog()` clears the reason with the
credentials. **No presence gate. It refuses while dirty**, through
`unsavedRefusal('cancelling')`, like both submits.

⚠️ **The signatures refetch takes its own `mine` check after its own `await`.**
The 200's check does not cover a second request.

**A failed signature** is 401 `Invalid credentials` — the exact string
`request()` must not retry (see Auth below). It writes a `SignatureFailed` audit
row with `cfg.db`, not the transaction, so the row survives the rollback.
⚠️ **But a bcrypt *error* is a 500 with no row**, so a 500 from a transition is
not a signature failure.

**The meaning string is per transition, not per endpoint.** The two decision
endpoints each have two — approve and reject — chosen by the `decision` /
`final_decision` field, so the modal's meaning must follow the user's choice.
The prototypes hardcode the approve string.

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
**Never trim a value you send**: Go's `TrimSpace` and JavaScript's `trim()`
disagree on U+0085 and U+FEFF. (A client-side *check* may trim where the server
does. See Transitions.)

`form` and the record (`cc`) are **two objects**. Only a fetch or a save response
replaces `cc`, and `form` is rebuilt from it every time, since the server trims.
