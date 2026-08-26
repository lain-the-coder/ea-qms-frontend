# EA QMS — Change Control Frontend Blueprint

**Version 1.0** · Written at backend completion, against the built API
Supersedes DRAFT V0.9

---

## How to read this

**Part A — The API contract.** Framework-agnostic. Everything the backend expects
of any client: request sequencing, traps, per-screen behaviour. This survives a
change of framework.

**Part B — The Svelte 5 build.** Stack, conventions, structure, build order.

**Neither part documents request and response shapes.** Those live in
**`openapi.yaml`** — hand-written from the handler code, not generated from
example traffic — which is the definitive source for field names, nullability,
enum values and status codes.

`openapi.yaml` is one document with three ways to read it:

| | |
|---|---|
| **The file** | Uploaded alongside this one. Searchable and diffable — the copy to actually work from |
| <https://lain-the-coder.github.io/ea-qms-backend/> | The same content rendered as a browsable site. No setup |
| `localhost:1304/docs` | The same again, with **Try it out** working, because the docs are served from the same origin as the API |

Separately, a **Postman collection** lives in the backend repository. It is the
only client that can call the API from outside a browser, and therefore the only
one not subject to CORS.

When this document and `openapi.yaml` disagree, **`openapi.yaml` is right** — it
was written directly from the handler code.

⚠️ **But it is a transcription, not a generated artifact.** Transcriptions have
errors. If a real response does not match the spec, **check the Go handler before
assuming the client is wrong** — and fix the spec, in the same commit.

## Guardrail documents

| Document | Authority on |
|---|---|
| **BRD V1.2** | Business rules, workflow, roles, Phase 1 limitations |
| **`CC_Field_Reference.md` V1.2** | Field-level validation, max lengths, **canonical enum strings** |
| **Security Matrix V2.1** | Which fields are editable/read-only/hidden per role per state |
| **`openapi.yaml`** | Request and response shapes |
| **The HTML prototypes + `global.css`** | Visual source of truth — this build is a port, not a redesign |

---

# Part A — The API contract

*Framework-agnostic. Applies to any client.*

## A1. Authentication

### A1.1 Two tokens, two lifetimes

| | Lifetime | Store where |
|---|---|---|
| **Access token** (JWT) | 30 minutes | Memory only |
| **Refresh token** (opaque) | 24 h absolute, **2 h sliding inactivity** | `localStorage` |

The refresh token is **not rotated** — `POST /refresh` returns a new access token
and the same refresh token. Keep using it.

The sliding window advances on every successful refresh. The 24-hour absolute
expiry does not move, so a session cannot outlive a day regardless of activity.

**Why `localStorage` for the refresh token:** an httpOnly cookie is impossible
without a server on the frontend's origin, and this is a static SPA. Accepted for
Phase 1 — document it rather than hiding it. Access tokens stay in memory so a
closed tab does not leave one behind.

### A1.2 Refresh proactively, and retry once on 401

Refresh at **~24 minutes** — 80% of the access token's life — rather than waiting
for a 401.

⚠️ **Gate it on activity.** A bare timer means an idle tab refreshes forever —
`updated_on` advances every 24 minutes, the server's 2-hour sliding window never
expires, and since the inactivity popup is optional (A1.5), **nothing enforces
inactivity at all.** The server cannot tell a working user from an open tab; a
refresh *is* activity as far as it knows.

Skip the scheduled refresh if there has been no user interaction since the last
one. The reactive path below covers waking from idle.

Also implement that reactive path, since a laptop that slept will wake with a dead
token:

```
request → 401
  → POST /refresh (once)
      → success: retry the original request (once)
      → failure: clear the store, redirect to login
```

**Never loop.** One refresh, one retry, then give up.

⚠️ **Exempt `/login`, `/refresh` and `/revoke` from that path.** All three are
mounted without the auth middleware (`main.go:96-98`), take no bearer token, and
return 401 for their *own* reasons — a wrong password, a dead refresh token.
Applied literally to every response, the rule above turns a mistyped password
into a refresh attempt with whatever stale token `localStorage` still holds, and
the user is shown a logout instead of "incorrect email or password".

The wrapper needs the same exemption for the bearer header: **do not attach one
to these three.** A1.3.

### A1.3 The refresh token goes in the JSON body

```
POST /refresh   { "refresh_token": "..." }
```

Not an `Authorization` header — it is not a bearer credential.

### A1.4 Logout is idempotent — but only once a token is in the body

`POST /revoke` returns **204** whether the token was valid, already revoked, or
never existed. `RevokeRefreshToken` carries `AND revoked_at IS NULL`, so a second
revoke updates nothing and still returns 204.

⚠️ **It is not unconditionally 204.** A blank or missing `refresh_token`, or a
malformed body, is a **400** — the handler validates the body before it ever
reaches the database (`handlers_auth.go:120-130`). So "logging out never fails"
holds for every *token* state and fails at the one case the client actually
produces: **logging out when `localStorage` holds no refresh token** — already
logged out, storage cleared, a fresh browser.

The rule for the wrapper:

- **Only call `/revoke` if a refresh token is present.** Skip the call otherwise.
- **Clear local state unconditionally** — before the call, not after it, and
  regardless of the outcome including a network failure.

Local state is what logs the user out. The call is what stops the token being
reusable elsewhere; it is not what ends the session in this tab.

### A1.4a Logout ends *this* session, not every session

**Login never revokes existing refresh tokens** — `HandlerLogin` inserts a new
row each time (`handlers_auth.go:216-232`). Two browsers, or a re-login without a
logout, leave two independent live tokens, and `/revoke` kills only the one in the
body.

There is no "sign out everywhere", and deactivating the user is the only thing
that stops all of them at once (A1.6). Do not present logout as more than it is.

### A1.5 The inactivity popup is courtesy, not enforcement

The server's 2-hour sliding window is the real rule. A client-side "Still there?"
prompt at ~30 minutes idle is a UX nicety: **Yes** → `POST /refresh`, **No** or
timeout → `POST /revoke` and log out.

Build it last. The system is correct without it.

### A1.6 Deactivation takes effect on the next request, not in 30 minutes

`middlewareAuth` re-reads the user from the database and checks `is_active` on
**every authenticated request** (`middleware.go:69`), and `/refresh` checks it
again independently (`handlers_auth.go:85`). A valid, unexpired access token does
**not** keep a deactivated user working until it expires.

So when an Admin deactivates someone at step 15, that user's next action —
whatever it is — returns 401, the refresh that follows also returns 401, and they
are logged out. That is the intended path and it needs no client-side work. What
it does need is the *right message*: this is not an expired session.

### A1.7 A 401 has three meanings, and the body says which

| Body | What happened | What the user should be told |
|---|---|---|
| `Invalid refresh token` | Not found, or revoked | Session ended — sign in again |
| `Session expired` | 24 h absolute reached, **or** 2 h idle | Session expired — sign in again |
| `Account is deactivated` | `is_active = false` (A1.6) | **Your account has been deactivated** — signing in again will not help |

All three end in the same place: clear the store, go to `/login`. But the third
is not the user's fault and not fixable by retrying, so showing "your session
expired" there sends them into a login loop against an account that will keep
rejecting them. **Carry the message from the failed refresh into the login
screen** rather than discarding it.

`POST /login` returns the same `Account is deactivated` if they try.

### A1.8 What only refresh advances

**`TouchRefreshToken` is called in exactly one place** — `HandlerRefresh`, after
validation and before the new JWT is minted (`handlers_auth.go:92`). Nothing else
in the codebase touches it.

**Ordinary API calls do not advance the sliding window.** Saving a draft for
ninety minutes straight moves `updated_on` not at all; only the scheduled refresh
does. This is what makes A1.2's activity gating load-bearing rather than tidy: the
refresh is the *only* signal the server has, so gating it on real interaction is
the entire mechanism by which an abandoned tab eventually dies.

It also means the 2-hour window is measured from **the last refresh**, not the
last request — a subtlety that matters only if the scheduled refresh is ever made
conditional on something other than activity.

## A2. The save-then-submit contract

**The single most important sequencing rule in the API.**

Transitions carry **no field values**. `POST /{ccID}/submit` and
`POST /{ccID}/submit-final` send only `{email, password}` and validate **what is
already stored**.

```
User edits the form
  → PUT /{ccID}              save (as often as you like)
  → POST /{ccID}/submit      validate what was saved, sign, transition
```

**Consequence:** the Submit button must be **disabled while the form is dirty**,
or must save first. Otherwise the user submits with unsaved edits and the API
rejects fields they can see filled in on screen — because that text never left
the browser.

This applies to **both** save endpoints:

| State | Save endpoint | Then |
|---|---|---|
| `Initiated` | `PUT /{ccID}` — 24 fields | `POST /{ccID}/submit` |
| `In Implementation` | `PUT /{ccID}/implementation` — 5 fields | `POST /{ccID}/submit-final` |

### A2.1 Where validation happens

| Check | Save | Transition |
|---|---|---|
| Length, enum membership, JSON type | ✅ | ❌ |
| Presence of mandatory fields | ❌ | ✅ |
| Business-day date rules | ❌ | ✅ |
| `actual_implementation_date` not in the future | ❌ | ✅ |
| Evidence file exists | ❌ | ✅ (T6) |
| E-signature | ❌ | ✅ |

A draft can be saved empty, and a date valid on Monday may be invalid by
Thursday — so those rules can only apply at submission.

**Mirror the presence checks client-side** so the signature modal never opens on a
form that will be rejected. The API enforces them regardless; the client-side copy
is purely to avoid asking for a password before a certain failure.

## A3. Partial updates — absent, null, value

Both save endpoints accept a **partial** body (RFC 7386 merge-patch):

| You send | Result |
|---|---|
| key **absent** | unchanged |
| `"field": null` | **cleared** |
| `"field": "value"` | set |
| `"field": ""` | **cleared** — text fields only |

⚠️ **`""` is a parse error on date and time fields.** Only `null` clears those.
A cleared date picker must send `null`.

**Only the fields listed for that state are accepted.** Any other key returns
**400** listing every offending key, and **nothing is written** — the rejection is
atomic, so a valid field sent alongside an invalid key is not saved either.

Sending the whole form on every save is fine; sending only what changed is fine.

## A4. The en-dash trap

⚠️ **The single most likely silent failure in this port.**

The BRD and the HTML prototypes render six enum values with an **en-dash**
(`–`, U+2013). The database CHECK constraints require an **ASCII hyphen**
(`-`, U+002D). Copying an `<option value>` from a prototype produces a 400 on
every submission, with an error message that does not mention the character.

| Affected | Correct value |
|---|---|
| `requires_testing` | `Yes - Full testing`, `Yes - Partial testing` |
| `post_implementation_issues` | `Issues requiring follow-up` |
| Signature meanings (display) | `Approved - Implementation Approval`, `Rejected - Implementation Approval`, `Approved - Final Approval`, `Rejected - Final Approval` |

**Take every option value from `openapi.yaml` or `CC_Field_Reference.md`, never by
copy-paste from the HTML.** The display text may keep an en-dash if preferred —
only the submitted value matters.

## A5. Dates and times

### A5.1 RFC 3339 only

```
"2026-10-15T00:00:00Z"      ✅
"2026-10-15"                ❌ 400
""                          ❌ 400 — use null
```

`DATE` columns arrive and depart as **midnight UTC**.

### A5.2 Time-of-day fields carry a placeholder date

`implementation_window_start` and `_end` are `TIME` columns and return as:

```
"0000-01-01T09:00:00Z"
```

The date portion is an artifact — Go's `time.Time` always carries one. Strip it
for display; send the same shape back.

### A5.3 Two date rules, enforced at T2

- `proposed_implementation_date` ≥ **2 business days** from today
- `target_closure_date` ≥ **10 business days** from today

Weekdays only; public holidays are not modelled. **Computed in UTC** — in a UTC+
deployment, a submission between midnight and the offset is evaluated against the
previous calendar day.

### A5.4 `actual_implementation_date` must not be in the future

Retrospective by nature. **Accepted at save, rejected at T6** — so a user can
draft on Monday for work scheduled Wednesday.

**Disable future dates in the picker** so the rule is never hit.

## A6. Files

### A6.0 One upload field, not two

The BRD describes two file fields — **Supporting Documents** (field 24, in
`Initiated`) and **Implementation Evidence** (field 34, in `In Implementation`).

**Only Implementation Evidence is implemented** (BRD V1.2 §13.1 L12). The database
schema and its CHECK constraint still permit `supporting_documents`; the API's
whitelist rejects it with a 400.

**Consequences for the port:**

- The `Initiated` form has **no upload control**. The block was removed from
  `cc-form-initated-state.html`
- File upload appears **only** on the `In Implementation` view
- The CC response carries `implementation_evidence` and nothing else file-related

### A6.1 Upload is multipart with a part named `file`

```
POST /changecontrols/{ccID}/files/implementation_evidence
Content-Type: multipart/form-data          ← let the browser set this
```

**Do not set `Content-Type` by hand** — the browser generates it with a boundary
string, and overriding it breaks parsing.

**PDF only, 10 MB maximum.** The type is verified by inspecting the file's
contents, so renaming a `.png` does not work. One file per field: re-uploading
**replaces**, and there is no delete endpoint.

Owner only, `In Implementation` only.

### A6.2 Download cannot be a hyperlink

⚠️ The endpoint requires the bearer token, and `<a href>` cannot send headers.
The obvious approach fails with a 401.

```js
const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
const blob = await res.blob();          // throws if the transfer was truncated
const href = URL.createObjectURL(blob);
// synthesise a click, then URL.revokeObjectURL(href)
```

The `try/catch` also covers truncation: the browser compares bytes received
against `Content-Length` and rejects the promise itself. No manual byte counting.

`Content-Disposition` carries the filename; `Content-Length` the size. Both are
exposed to JavaScript by the CORS configuration.

Download is open to **any authenticated role, in any state** — an approver must
review evidence, and a closed record's evidence must stay reachable.

### A6.3 Do not probe for a file's existence

The CC response carries `implementation_evidence` — `null`, or an object with
`file_name`, `file_size`, `content_type`, `uploaded_on`. Use that to decide
whether to render a download link.

Calling the download endpoint to find out would transfer up to 10 MB to learn a
filename.

## A7. E-signatures

### A7.1 The modal collects EMAIL and password

⚠️ The prototypes label the first field "Username". **There is no username** — the
API compares against the user's email, case-insensitively.

### A7.2 Sign as yourself only

The email must match the **logged-in user** (BR-8.8.3). Valid credentials
belonging to somebody else are rejected with 401.

Pre-fill the field with the current user's email.

### A7.3 A failed signature changes nothing

401, an audit row recording the attempt, and the record **untouched**. Retrying is
safe. Never store the password; clear it when the modal closes.

### A7.4 The signature comes last

The API validates presence, then business rules, then the signature. A validation
failure never reaches the signature check — so the modal should only open once the
client-side checks pass.

### A7.5 Show the meaning being signed

Each transition has a fixed meaning string. Display it in the modal so the user
knows what they are attesting to. **ASCII hyphens** — see A4.

## A8. Errors

### A8.1 Two shapes

```json
{ "error": "Change Control not found" }
```

```json
{
  "error": "Cannot submit: some requirements are not met",
  "issues": ["Change Category", "Implementation Evidence",
             "Target Closure Date must be at least 10 business days from today"]
}
```

The second comes from **four endpoints**, not from "the transitions":

- the two save endpoints — keys not editable in the current state
- **T2 and T6 only** — the two *submit* transitions: missing mandatory fields,
  failed date rules, missing evidence, **all collected**

**Cancel (T3), the implementation decision (T4/T5) and the final decision
(T7/T8) return the first shape**, stopping at the first problem. That is by
design, not an inconsistency to route around: they validate a small request body
the user has just typed, where one message points at one field. T2 and T6
validate stored state across twenty-odd fields, where stopping at the first would
mean twenty round trips. Verified against the handlers — only
`HandlerSubmitForImplApproval` and `HandlerSubmitForFinalApproval` build an
issues array.

**Render every item** when there is one, not just the first. But do not write a
transition caller that *expects* one.

### A8.2 What each status means for the UI

| Code | Do |
|---|---|
| **400** | Show the message, or the `issues` list, next to the fields |
| **401** | The wrapper handles it — refresh once, retry once, else log out |
| **403** | "You do not have permission" — the record loaded, the action is not yours |
| **404** | The record is gone; return to the list |
| **409** | **Refetch the record.** Someone changed its state, so the UI is stale |
| **500** | Generic apology. Nothing actionable client-side |

**409 is the interesting one.** It means the request was valid but the record
moved — the honest response is to reload it and re-render.

### A8.3 A 409 with a body

`PUT /users/{userID}` and `.../active` can return blocked CC-IDs:

```json
{ "error": "Cannot change role while the user has active change controls",
  "blocked_cc_ids": ["CC-001", "CC-003"] }
```

**The request is all-or-nothing** — a name change submitted alongside a blocked
role change is *also* rejected. Do not tell the user the name was saved.

## A9. Lists and pagination

### A9.0 Four list endpoints, and only two are paginated

**Nothing below is true of all of them.** Check this table before applying any
rule in A9.1 or A9.2 — sort order and pagination differ per endpoint, and each
was read off the SQL, not inferred.

| Endpoint | Sort | Paginated? |
|---|---|---|
| `GET /changecontrols` | `last_updated_on` **DESC** | **Yes** — `limit` / `offset`, plus `total` |
| `GET /users` | `full_name` **ASC** | **Yes** — `limit` / `offset`, plus `total` |
| `GET /approvers` | `full_name` **ASC** | **No — returns every active approver** |
| `GET /changecontrols/{ccID}/signatures` | `signed_on` **ASC** — chronological | **No — returns the whole history** |

**No endpoint has a sort parameter.** Sort is fixed in SQL in all four cases, so
column headers are not sortable anywhere — but *what* it is fixed at differs, and
the two user-facing lists sort in opposite directions.

**`GET /approvers` and the signature list take no `limit` or `offset` at all**
(`users.sql:29-32`, `esignatures.sql:6-10` — neither query has a `LIMIT`
clause). Sending them is not an error; they are simply ignored. Nothing in A9.1
applies to either — no `total`, no page count, no offset reset. The approver
dropdown renders the whole array, and the signature panel renders the whole
history oldest-first.

### A9.1 Pagination — `GET /changecontrols` and `GET /users` only

- **`limit` defaults to 50, and its ceiling is 200.** Send it explicitly if the
  UI shows fewer.
- ⚠️ **Above 200 the server clamps — it does not reject.** `limit=500` returns
  200 rows with `200 OK` and nothing saying the value was capped; only `limit < 1`
  or a non-integer is a 400. **So the limit a request asked for is not
  necessarily the limit it got.**
- **`offset`, not page numbers.** `offset = (page - 1) * limit`.
- **Reset `offset` to 0 whenever a filter changes**, or the user lands on an empty
  page.
- **`total` is the count matching the filter**, ignoring pagination — use it for
  the page count, not `items.length`.
- **Compute the page count from the `limit` in the *response*, not the one you
  sent.** Both paginated responses echo `limit` back for exactly this reason.
  Using the requested value makes `Math.ceil(total / limit)` silently wrong for
  anyone who hand-edits the URL — the arithmetic is off, no error is raised
  anywhere, and pages beyond the first are unreachable or empty.

### A9.2 Filters

**`GET /changecontrols`:**

- **`?owner=me` and `?assigned=me`** are flags resolved server-side from the
  token. No user ID ever appears in a URL.
- **`?state=` accepts one value.** For "either pending state", use the dashboard's
  `pending_approvals` block, which is purpose-built for it.
- **`?search=`** matches CC-ID, change title and owner name only — not
  descriptions, not affected systems.
- **`?created_after=` / `?created_before=`** are **`YYYY-MM-DD`**, inclusive —
  **not** the RFC 3339 that every date *write* field requires (A5.1). A full
  timestamp is a 400 here, exactly as a bare date is a 400 there. Same API,
  opposite formats, decided by direction of travel.

**`GET /users`** (Admin only):

- ⚠️ **`?active=true|false`**, **NOT `?is_active=`** — the response field is
  `is_active` but the query parameter is not. **An unrecognised query parameter
  is ignored silently**, so `?is_active=true` returns every user, including the
  deactivated ones, with `200 OK` and no error at all. Omit the parameter
  entirely for all users.

**`GET /approvers`** takes no parameters — it is already filtered server-side to
active users holding the Approver role.

## A10. Per-screen notes

### Dashboard
One call returns everything. **The lists are capped (2, 2, 5); the totals are
not** — three drafts returns `my_drafts_total: 3` with two items, so the card
reads "3" over two rows.

All five `overview` keys are always present, reporting `0` where no records exist.
The five cards link to `?state=<value>`.

`Cancelled` is absent from the counts but can appear in recent activity.

### Change control form
**One form, every state and role.** The Security Matrix decides what is editable,
read-only or hidden — mirroring how the prototypes are one form in different
states. Do not build a page per state.

`change_title` can be `null` on a draft; render a placeholder.

### User management
The pencil and the status toggle are **separate calls** — `PUT /users/{userID}`
and `PUT /users/{userID}/active`.

Disable the status toggle on your own row (the API returns 400) and hide the role
selector for yourself (403).

### Profile
**Read-only in Phase 1.** No self-update endpoint and no change-password endpoint.
Name, email and role display only.

### Approvals
`?assigned=me` returns your records but takes **one** state. The dashboard's
`pending_approvals` block spans both gates — each item carries its own
`current_state` for the badge.

## A11. IDs and names

Every reference comes as a pair:

```json
"change_owner_id": "73960fc2-…",
"change_owner_name": "Default CC Owner"
```

**Compare on the id** — `cc.change_owner_id === currentUser.id` decides whether a
button renders. Names are not unique and can change.

**Display the name.** The client cannot resolve a UUID, and a lookup per record
would be N+1.

Note `last_updated_by_name` is **not** always the owner — after a rejection it is
the approver.

## A12. CORS

The API allows origins listed in its `ALLOWED_ORIGINS` environment variable.
`http://localhost:5173` (the Svelte dev server) must be among them.

A misconfigured origin fails in a confusing way: **the request reaches the server
and executes**, and only then does the browser refuse to hand the response to
JavaScript. A database write can succeed while the client sees a network error.

If requests fail with no useful message, check the browser console for a CORS
error before suspecting the API.

## A13. Deviations from the original BRD

Each of these is deliberate, recorded in **BRD V1.2**, and reflected in the API.
They are collected here because they are easy to miss individually — if an older
copy of a guardrail document says otherwise, **the API is the contract**.

| Deviation | Original | Now | Why |
|---|---|---|---|
| **Session inactivity** | 30 minutes | **2 hours** | The access token's 30-minute life and the inactivity window were identical, which made the sliding window meaningless — a session could never idle out before the token expired anyway |
| **File types** | PDF, DOCX, XLSX, PNG, JPG | **PDF only** | Evidence should be a fixed artefact. It also makes the type check unforgeable: DOCX and XLSX are both ZIP archives and cannot be told apart by inspecting contents |
| **Supporting Documents** | field 24, uploadable in `Initiated` | **not implemented** | Deferred to a later release (L12). Only Implementation Evidence exists |
| **Blocked role change** | *"the name change can still be saved"* | **all-or-nothing** | A 409 whose transaction commits is incoherent, and the response would have to explain what was and was not saved. The prototype's role-block message was corrected to match |
| **Search** | excluded from scope | **`?search=` implemented** | Text matching on CC-ID, title and owner name. Saved searches and reporting remain out of scope |
| **`actual_implementation_date`** | no rule stated | **must not be in the future**, at T6 | The field is retrospective; the BRD only ruled out a *minimum* lead time, saying nothing about the other direction |

---

# Part B — The Svelte 5 build

*Decisions below are settled. Refine details during the build; do not re-litigate
the stack or the forbidden list.*

## B1. Philosophy — the same identity as the backend

**Flat first.** Abstractions are earned by felt pain, not predicted from the spec.
Do not build a generic `<FormField>` until the same markup has been written inline
**three times**.

**This build is a port, not a redesign.** The prototypes define every screen. When
in doubt, their markup and `global.css` classes are the answer — invent nothing
visual.

**The frontend is deliberately thin.** All correctness lives in the API and the
database: presence validation, enum validity, role and ownership and state checks,
e-signature verification. The frontend renders state, collects input, and displays
the API's verdicts.

It **mirrors** business rules for UX — disabling a button the API would reject —
but never treats its copy as the source of truth. Where the two disagree, the API
wins and the UI is wrong.

## B2. Stack

| Concern | Choice |
|---|---|
| Framework | **Svelte 5** (runes) |
| App shell | **SvelteKit in SPA mode** — `ssr = false`, `prerender = false`, `adapter-static`. Build output is a static folder; **no Node server exists at runtime** |
| Language | **TypeScript** |
| Runtime & package manager | **Bun** — `bun create`, `bun install`, `bun run`. Not npm, not npx |
| Styling | **`global.css` as-is**, imported once in the root layout. No Tailwind, no UI library, no new design tokens |
| HTTP | Native `fetch` behind one wrapper (`lib/api.ts`). No axios, no query library |
| State | Svelte 5 runes only. **No `svelte/store`** — `writable`/`readable` are the legacy API |
| Backend | The Go API. SvelteKit's server features are unused (see B4) |

## B3. The allowed feature set

This is the whole language used in this build. Anything not listed here needs a
reason before it appears.

### Runes

| | |
|---|---|
| `$state` | Local component state, and cross-component state in `.svelte.ts` modules — the auth store |
| `$derived` | Anything computed from other state. **See the rule below** |
| `$props` | Component inputs, typed |
| `$effect` | **Mount-only fetches.** Nothing else |

⚠️ **`$derived` is mandatory for anything read from the URL.**

```ts
// Wrong — reads once and goes stale, silently
let state = page.url.searchParams.get('state');

// Right
let state = $derived(page.url.searchParams.get('state'));
```

Changing a query parameter does **not** remount the component. A plain `let` runs
at initialisation and never again, so the filter appears to be ignored — with no
error and nothing in the console. This is a silent-bug class, not a style
preference.

The same applies to route params on the CC form: `[ccId]` changing without a
remount would leave the page showing the previous record.

⚠️ **Deriving state inside `$effect` is the classic Svelte 5 anti-pattern.** If a
value can be computed from other state, it is `$derived`. `$effect` is for
reaching outside the reactive system — which here means exactly one thing:
fetching on mount.

### Template

`{#if}` / `{:else if}` / `{:else}`, `{#each}`, text interpolation.

**Prefer explicit `loading` and `error` state over `{#await}`.** Fetched data has
to land in `$state` anyway so that form inputs can bind to it, so `{#await}` ends
up wrapping a promise whose result you immediately copy into state. Two mechanisms
for one job.

```svelte
<!-- Prefer -->
{#if loading}
  <p>Loading…</p>
{:else if error}
  <p class="error">{error}</p>
{:else}
  <!-- the form, bound to $state -->
{/if}
```

### Bindings and events

`bind:value` on inputs, selects and textareas. Event attributes —
`onclick={...}`, `onsubmit={...}` — in Svelte 5 style, **not** `on:click`.
Callback props for child-to-parent communication: a prop that happens to be a
function.

### TypeScript

`interface` for API shapes. String-literal unions for the six states and four
roles. Typed `$props`. `| null` on nullable fields, matching `openapi.yaml`
exactly. See **B6**.

### SvelteKit subset

Filesystem routing including dynamic params (`[ccId]`), `+layout.svelte` for the
root and the authenticated shell, `goto` for programmatic navigation, and
`page.url.searchParams` for list filters and pagination.

### Deliberately skipped

Not forbidden, simply not needed. If one of these turns out to be the right tool,
say so rather than reaching for it silently.

`bind:group` · `<select multiple>` · numeric input binding · event capturing ·
event-handler spreading · the `{#each}` index parameter · the `style:` directive ·
component CSS custom properties.

**Avoid `:global`** — `global.css` is imported once at the root and its classes
apply everywhere already, so a `:global` escape hatch is a sign the markup drifted
from the prototype.

## B4. Forbidden

- Snippets (`{#snippet}`), transitions and animations, the context API
  (`setContext`/`getContext`), actions (`use:`), `$bindable`, class-based state,
  special elements (`<svelte:window>` and friends)

  **One exception:** `{@render children()}` in `+layout.svelte` is how SvelteKit 5
  renders nested routes and is **required**. It is the only permitted use of
  snippet syntax. Do not write `{#snippet}` anywhere.
- Svelte 4 syntax: `export let`, `on:click`, `$:` reactive statements,
  `svelte/store`
- **Every SvelteKit server feature** — `load` functions, form actions,
  `+page.server.ts`, `+server.ts`, hooks, cookie and session handling. The Go API
  is the backend; anything labelled "server" in the SvelteKit docs does not apply
  here
- `$effect` for anything beyond load-on-mount. Deriving state in an effect is the
  classic Svelte 5 anti-pattern — use `$derived`
- New CSS tokens, or visual components not present in the prototypes

## B5. Project structure

```
src/
├── routes/
│   ├── +layout.svelte                    # imports global.css once
│   ├── +layout.ts                        # ssr = false, prerender = false
│   ├── login/+page.svelte
│   └── (app)/                            # authenticated group
│       ├── +layout.svelte                # sidebar shell + route guard
│       ├── dashboard/+page.svelte
│       ├── change-controls/
│       │   ├── +page.svelte              # All CCs — filters via URL params
│       │   └── [ccId]/+page.svelte        # THE form — all states, all roles
│       ├── my-change-controls/+page.svelte
│       ├── approvals/+page.svelte
│       └── settings/
│           ├── +page.svelte               # profile (read-only)
│           └── users/+page.svelte          # admin only
└── lib/
    ├── api.ts                            # fetch wrapper: base URL, bearer, refresh-and-retry
    ├── auth.svelte.ts                    # $state store: user + accessToken
    ├── types.ts                          # mirrors openapi.yaml
    └── components/                       # extracted ONLY after 3× repetition
```

**One page renders the CC form in every state and for every role** — the Security
Matrix expressed as `{#if}` and `disabled`, mirroring how the prototypes are one
form in different states. **Do not create a page per state.**

`EsigModal` and `SignatureTable` will likely earn extraction. Let them earn it.

## B6. `types.ts` — derive it from `openapi.yaml`

Write the interfaces from the specification, not from observed responses. The spec
records which fields are nullable; a sample response does not.

### Unions, not enums

```ts
export type State =
  | 'Initiated'
  | 'Pending Implementation Approval'
  | 'In Implementation'
  | 'Pending Final Approval'
  | 'Closed'
  | 'Cancelled';

export type Role = 'Admin' | 'CC Owner' | 'Approver' | 'Viewer';

export type Decision = 'Approve' | 'Reject';        // imperative, not past tense
export type RiskLevel = 'Low' | 'Medium' | 'High';

export type RequiresTesting =
  | 'Yes - Full testing'        // ASCII hyphen — see A4
  | 'Yes - Partial testing'
  | 'No';
```

String-literal unions rather than `enum`: they match the wire format exactly,
narrow correctly inside `{#if}` blocks, and need no conversion at the boundary.

**Copy every member from `openapi.yaml`**, including the ASCII hyphens (A4).

### Read and write shapes are different types

⚠️ **The most important modelling decision in this build.**

A response always contains every field. A save request must be able to **omit**
one — that is the "absent" case in A3, and it is how a partial update leaves a
field alone.

```ts
// READ — every field present; null means empty
export interface ChangeControlResponse {
  cc_id: string;
  current_state: State;
  change_title: string | null;
  proposed_implementation_date: string | null;
  assigned_approver_id: string | null;
  implementation_evidence: FileRef | null;
  // …all 55
}

// WRITE — every field OPTIONAL; absent means "leave it alone"
export interface SaveDraftRequest {
  change_title?: string | null;
  proposed_implementation_date?: string | null;
  assigned_approver_id?: string | null;
  // …the 24 editable fields, all optional
}
```

The `?` **is** the absent case. Without it, TypeScript forces a value for every
field, and a save built from a response-shaped type sends the whole record —
clearing anything the user did not touch, with no type error and no runtime error.
Silent data loss.

Read the two together against A3:

| TypeScript | JSON sent | Result |
|---|---|---|
| key omitted | *(absent)* | unchanged |
| `change_title: null` | `"change_title": null` | cleared |
| `change_title: 'Fix'` | `"change_title": "Fix"` | set |

**Expect two interfaces per resource wherever partial updates apply** — so
`ChangeControlResponse` / `SaveDraftRequest`, and `ChangeControlResponse` /
`SaveImplementationRequest`.

Transitions need no write type beyond their credentials, since they carry no field
values (A2).

### `null` meets `bind:value`

An input bound to `null` renders the string `"null"`. Convert at the boundaries,
not in the markup:

```ts
// API → form
const form = $state({ change_title: cc.change_title ?? '' });

// form → API, on save
change_title: form.change_title.trim() || null
```

`|| null` turns an emptied box back into a clear instruction, which matches A3 —
and the API normalises `""` to `null` for text fields anyway. **Date and time
fields must send `null`**, since `""` is a parse error there (A5.1).

### Errors are a discriminated union

**Three members, not two.** The names below are the `openapi.yaml` schema names,
which is what the code uses — see the note at the end of B6.

```ts
export interface ErrorResponse             { error: string }
export interface ValidationErrorResponse   { error: string; issues: string[] }
export interface BlockedRoleChangeResponse { error: string; blocked_cc_ids: string[] }

export type ErrorBody =
  | ErrorResponse
  | ValidationErrorResponse
  | BlockedRoleChangeResponse;
```

Narrow with two **independent** `in` checks. The discriminating keys are
disjoint, so order does not matter and `ErrorResponse` is simply what remains:

```ts
if ('issues' in err) …              // A8.1 — collected validation failures
else if ('blocked_cc_ids' in err) … // A8.3 — the 409 on the two user PUTs
else …                              // `error` alone
```

**Omitting the third member is the trap.** A8.3 is documented in prose two pages
earlier, so it reads as covered; but if the union has only two members,
`blocked_cc_ids` is unreachable without a cast — in the one place where the user
must be told that the whole request was rejected, not just part of it.

### Type names follow `openapi.yaml`

`src/lib/types.ts` names every type after its `components/schemas` entry, so any
type in the code can be looked up in the contract with no translation table. B6
now uses those names throughout.

**Three were renamed** — recorded here because earlier drafts of B6, and anything
written from them, use the left column:

| Was, before step 2 | Is |
|---|---|
| `ChangeControl` | `ChangeControlResponse` |
| `ApiError` | `ErrorResponse` |
| `ValidationError` | `ValidationErrorResponse` |

A naming change only. The read/write split, the `?`, and the null-versus-absent
model are unchanged and still govern.

## B7. `api.ts` — one wrapper, no raw fetch in components

Responsibilities:

- Prefix the base URL from `PUBLIC_API_URL` (see **B11**)
- Attach `Authorization: Bearer` from the auth store
- Set `Content-Type: application/json` for JSON bodies — **and never for
  `FormData`** (below)
- On **401**: refresh once, retry once, else clear the store and `goto('/login')`.
  Never loop
- Parse **all three** error shapes into the discriminated union from B6, so the
  caller can narrow with `'issues' in err` and `'blocked_cc_ids' in err` — two
  independent checks, not a chain
- Expose a separate path for the file download, which returns a **blob** rather
  than JSON (A6.2)

A raw `fetch` in a component is a request that skips the token, the refresh and
the error parsing. There should be none.

### ⚠️ Never set `Content-Type` on a `FormData` body

```ts
// Wrong — the request arrives and fails, with an error that does not say why
headers: { 'Content-Type': 'multipart/form-data' }

// Right — omit it entirely and let the browser set it
const body = new FormData();
body.append('file', file);          // the part MUST be named "file"
fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
```

A multipart request needs a **boundary string** in its `Content-Type`, and only
the browser knows what it generated. Setting the header by hand omits the
boundary, the server cannot split the body into parts, and the upload fails with a
message that points nowhere near the cause.

This is the single most common file-upload bug. The wrapper must branch on the
body type rather than setting the header unconditionally.

## B8. `auth.svelte.ts` — the store

`$state` in a `.svelte.ts` module, holding the current user and access token:

```ts
import type { Role } from './types';

interface User { id: string; full_name: string; email: string; role: Role }

export const auth = $state<{ user: User | null; accessToken: string | null }>({
  user: null,
  accessToken: null,
});
```

Export the **object**, not the fields — destructuring a rune's properties breaks
reactivity, so consumers read `auth.user`, never `const { user } = auth`.

The **refresh token** lives in `localStorage`; the **access token** in memory only.
On app start, attempt one silent refresh to restore a session, then `GET /me` to
populate the user.

The `(app)/+layout.svelte` guard checks `auth.user` and redirects to `/login` when
it is null.

`auth.user.role` is what the CC form branches on, alongside `cc.current_state`, to
express the Security Matrix.

## B9. Build order

Seventeen steps. Each is independently verifiable against the running API — do not
start one until the previous works end to end, and do not merge two because they
feel contiguous.

| # | Step | Proves |
|---|---|---|
| 1 | **Scaffold** — `bun create svelte@latest` (TypeScript), `bun add -D @sveltejs/adapter-static`, set `ssr=false`, **copy `docs/prototypes/global.css` → `src/lib/global.css`** and import it in the root layout, commit | The shell builds and **the prototype styling survives inside a component** — verify a card and the sidebar render as they do in the prototype |
| 2 | **`types.ts`** from `openapi.yaml` | The contract is transcribed before any code depends on it |
| 3 | **Login page + auth store + `api.ts`** against the real `POST /login` | Auth works, CORS is configured, the token is stored |
| 4 | **Authenticated layout** — sidebar, route guard, silent refresh on load | Navigation and session restoration |
| 5 | **Dashboard** | First data fetch, first `{#each}`, and every list shape in one screen |
| 6 | **All Change Controls** — filters and pagination via URL params | Query-parameter handling, `total` vs `limit`, offset reset, and `$derived` on URL values |
| **7a** | **The CC form, read-only** — fetch a record by `[ccId]` and render all 24 fields as text | The route, the fetch, and the field layout against the prototype. No binding yet |
| **7b** | **Bind the fields** — `bind:value` throughout, with the `null` ↔ `''` conversion at both boundaries | Every input type: text, textarea, the eight selects, dates, times |
| **7c** | **Save Draft** — build a partial body, send it, handle the response | The absent/null/value model, the write-shaped type, RFC 3339 conversion, the 400 `issues` shape |
| **7d** | **Dirty tracking** — compare current state to the last-loaded record | The gate that step 9 depends on |
| 8 | **Create + the `Initiated` role views** — `POST /changecontrols`, then the same form as Approver, Viewer and Admin | The Security Matrix as `{#if}` and `disabled`, and **the Viewer's read-only view** |
| 9 | **T2 submit + the e-signature modal** | The first transition end to end, and the save-then-submit gate |
| 10 | **T3 cancel** | The one modal that collects **a reason *and* credentials together** — unlike every other transition |
| 11 | **Approver flow** — the queue, and the implementation decision (T4/T5) | The second role, and the first approval gate |
| 12 | **The `In Implementation` view** — save implementation details, then **file upload** | The second save endpoint, then `FormData`, the part named `file`, and the PDF/size limits |
| 13 | **T6 + the final decision (T7/T8)** + the signature history panel | The remaining gates, and the full state machine exercised |
| 14 | **File download** | Blob handling, `Content-Disposition` |
| 15 | **Admin settings — user management** | **Not a variation of anything else:** inline edit rows, two separate endpoints for the pencil and the toggle, and a 409 carrying `blocked_cc_ids` |
| 16 | **Activity-gated proactive refresh** | The gating, not just the timer — see A1.2 |
| 17 | **Inactivity popup** | Courtesy only — the system is correct without it |

**Why this order.** Steps 1–4 are infrastructure: nothing renders until they work.
Step 5 exercises every list shape in one screen, which is a cheap way to validate
`types.ts`.

**Step 7 is split into four**, because as one step it is the whole form at once:
24 fields, the partial-update model, two kinds of value conversion, eight selects
and dirty tracking. Each of 7a–7d is verifiable on its own; the four together are
not. Do not merge them back.

Step 9 introduces the signature once, before it appears in five more places.

**Upload cannot come earlier than step 12**, because the only upload field is
`implementation_evidence` and it is writable only in `In Implementation` — a state
a record can only reach by passing through steps 9 and 11. Steps 9–13 walk a
single record through the whole state machine in order, so each transition is
tested on a record that arrived there legitimately rather than one nudged into
place by hand.

**Step 15 is not a variation.** The approver views are variations of the form;
the admin user table is a different screen with its own interactions and its own
error shape. Budget for it accordingly.

## B10. Settled during the build

These were open in V0.9 and are now answered:

| Question | Answer |
|---|---|
| Exact JSON field names and shapes | `openapi.yaml` — 46 schemas |
| The 400 validation payload | `{error, issues[]}` — see A8.1 |
| Dashboard response shape | Four blocks — see A10 and the spec |
| API base URL handling | `PUBLIC_API_URL=http://localhost:1304/api` — see **B11** |
| CORS origin for dev | `http://localhost:5173`, already in the API's `ALLOWED_ORIGINS` |
| Runtime and package manager | **Bun** |
| Where the API runs | A Windows service on `localhost:1304` — **B11** |

## B11. The development environment

This section describes **one machine**. It will differ elsewhere — but the pieces
sit on two sides of a boundary, and knowing which is which saves an afternoon.

### Where everything runs

| | Where | Address |
|---|---|---|
| **The Go API** | A **Windows service**, already installed and running | `http://localhost:1304` |
| **PostgreSQL** | Inside **WSL** | `localhost:5432` |
| **The Svelte dev server** | Inside **WSL** | `http://localhost:5173` |
| **The browser** | **Windows** | — |

The API is **not** started with `go run .` — it is a service. If it is not
responding, restart it from Windows rather than looking for a terminal.

Postgres may need starting after a WSL restart:

```bash
sudo service postgresql start
```

### `localhost` means the same thing on both sides

WSL is configured for **mirrored networking** — `C:\Users\<you>\.wslconfig`:

```ini
[wsl2]
networkingMode=mirrored
```

Without this, WSL's default NAT mode makes `localhost` inside WSL mean *WSL
itself*, so `curl http://localhost:1304` from a WSL shell gets connection refused
and the Windows host has to be addressed by an IP that **changes on reboot**.

Worth being precise about what this does and does not fix:

| | Needed mirrored mode? |
|---|---|
| `curl` from a WSL shell | **Yes** |
| Any test or script in WSL calling the API | **Yes** |
| **The browser calling the API** | **No** — the browser is on Windows and always reached `localhost:1304` fine |

The app is an SPA with `ssr = false`, so **every API call originates in the
browser**, not in WSL. Mirrored mode is for tooling, not for the app.

### The two variables that must agree

```
# API — .env on the Windows side
ALLOWED_ORIGINS=http://localhost:5173

# Frontend — .env in the project
PUBLIC_API_URL=http://localhost:1304/api
```

Each names where the *other* lives. Change a port or deploy either half, and both
change.

**Note the `/api` suffix.** Every path in `openapi.yaml` is relative to it, so
`POST /login` in the spec is `http://localhost:1304/api/login`. `api.ts` prefixes
the base and never repeats `/api`.

### When requests fail with nothing useful

Check the **browser console** for a CORS error before suspecting the API. A
blocked request still reaches the server and executes — the browser simply refuses
to hand the response to JavaScript (A12), so a write can succeed while the client
sees a network error.

The fastest check is `curl` from WSL, which is not subject to CORS:

```bash
curl http://localhost:1304/api/login          # 405 Method Not Allowed = the API is up
```

A 405 is success here: login is POST-only, so a GET reaching the mux and being
refused proves the whole path works.

## B12. Known deferred

- Inline styles in the dashboard and settings prototypes resolve naturally during
  componentisation
- The list views still carry a "Created By" column, sort chevrons, and a date-range
  dropdown that the API does not support — see A9 and drop them during the port.
  There is no `created_by` field: the creator **is** the owner, immutably, so the
  two columns could never differ
- Offline Swagger UI (the docs page loads its assets from a CDN)
- **`global.css` has never been used inside a Svelte component.** The prototypes
  are complete documents; components are fragments. Descendant selectors such as
  `.app-layout > .sidebar` should survive, but nothing has proven it. Step 1's
  check is the real test — treat it as one, not as scaffolding
- **The activity-gated refresh (A1.2) is designed and never built.** The gating is
  the subtle half; a bare timer is easy to write and the dead inactivity window is
  invisible once it is wrong

---

**End of blueprint.**

Part A is a contract and should change only when the API changes. Part B is a
plan and will change as it meets reality — when it does, amend it rather than
letting the code and the document drift apart.
