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
request → 401 "Unauthorized"
  → POST /refresh (once)
      → success: retry the original request (once)
      → 401 or 400: clear the store, redirect to login
      → network error or 500: return the error, and the session stands
request → 401 "Account is deactivated" → clear the store, redirect to login
request → any other 401 → return it to the caller untouched
```

**Never loop.** One refresh, one retry, then give up.

⚠️ **The status alone cannot say whether the token is the problem, but the
body can.** Every signed transition (T2–T8) returns 401 `Invalid credentials`
when the e-signature fails. On status alone, a mistyped signature password
would trigger a refresh. The refresh would succeed and the retry would fail the
same way, so the user would be logged out for a typo. Worse, each attempt
writes its own `SignatureFailed` audit row, so the wrapper would turn one
failed attempt into two in a regulated record. `middlewareAuth` sends exactly
two 401 messages: `Unauthorized` (token missing, invalid or expired) and
`Account is deactivated`. Only the first is worth a refresh. Every other 401 is
a handler's own verdict. Apply the same rule to the retry's response.

Matching on the message couples the client to `middlewareAuth`'s wording. If
the wording changes, the retry stops firing and an expired token surfaces as an
error. That is the safe direction to fail. A machine-readable error code would
remove the coupling, and it is deferred because it changes a completed API.

**Only a verdict on the token ends the session.** A 401 or 400 from `/refresh`
logs out. A network error or a 500 says nothing about the token, so the error
goes back to the caller and the session is kept.

⚠️ **Exempt `/login`, `/refresh` and `/revoke` from that path.** All three are
registered in `main.go` without `middlewareAuth`. They take no bearer token, and
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
malformed body, is a **400**. `HandlerRevoke` decodes the body and checks for a
blank token before it ever reaches the database. So "logging out never fails"
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

**Login never revokes existing refresh tokens.** `HandlerLogin` inserts a new
row each time through `CreateRefreshToken` and revokes nothing. Two browsers, or a re-login without a
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
**every authenticated request**, and `HandlerRefresh` checks it again
independently. A valid, unexpired access token does
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
| `Unauthorized` | The token's user no longer exists (`HandlerRefresh`'s user lookup) | Session ended — sign in again |

All three end in the same place: clear the store, go to `/login`. But the third
is not the user's fault and not fixable by retrying, so showing "your session
expired" there sends them into a login loop against an account that will keep
rejecting them. **Carry the message from the failed refresh into the login
screen** rather than discarding it.

`POST /login` returns the same `Account is deactivated` if they try.

### A1.8 What only refresh advances

**`TouchRefreshToken` is called in exactly one place**: `HandlerRefresh`, after
validation and before the new JWT is minted. Nothing else
in the codebase touches it.

**Ordinary API calls do not advance the sliding window.** Saving a draft for
ninety minutes straight moves `updated_on` not at all. Only a refresh does: the scheduled one, the 401
path's, or the restore on a hard reload (A1.9), so every reload counts as
activity. This is what makes A1.2's activity gating load-bearing rather than tidy: the
refresh is the *only* signal the server has, so gating it on real interaction is
the entire mechanism by which an abandoned tab eventually dies.

It also means the 2-hour window is measured from **the last refresh**, not the
last request — a subtlety that matters only if the scheduled refresh is ever made
conditional on something other than activity.

### A1.9 Restoring the session on load

The access token and the user live in memory, so a hard reload loses both. Only
the refresh token in `localStorage` survives. The `(app)` layout restores the
session once, on mount:

1. **If no refresh token is stored, go to `/login` without sending a request.**
   `HandlerRefresh` validates the body before the lookup, so a blank
   `refresh_token` is a **400** here, exactly as on `/revoke` (A1.4).
2. **`POST /refresh`.** It returns `{token}` only, so the user comes from the
   next call.
3. **`GET /me`**, through the same wrapper as every other call, so a
   deactivation between the two calls is handled there. It returns the store's
   four fields.

| `/refresh` outcome | Meaning | Do |
|---|---|---|
| 401 (any A1.7 body) or 400 | A verdict on the token | Clear the store, carry the message, go to `/login` |
| No response (status 0) or 500 | Says nothing about the token | Keep the token; show the error and a Retry |

Redirecting on a 0 or a 500 would make the user sign in again, which mints a
second live token and leaves the first valid and orphaned (A1.4a).

⚠️ **Do not redirect on a null `auth.user`.** It is null for a valid session
until the restore finishes. Gate rendering on it instead:
- The sidebar renders at once, and the content area shows "Loading…".
- Pages mount only once the user is set, so no page fetch can run before there
  is a token to send.

Only a verdict on the token redirects.

The restore's refresh calls `TouchRefreshToken` like any other (A1.8).

## A2. The save-then-submit contract

**The single most important sequencing rule in the API.**

**The two submit transitions carry no field values.** `POST /{ccID}/submit` (T2)
and `POST /{ccID}/submit-final` (T6) send only `{email, password}` and validate
**what is already stored**. The other transitions do carry values, which their
own body writes: T3 `cancellation_reason`; T4/T5 `decision`, `risk_level` and
`decision_comments`; T7/T8 `final_decision` and `final_comments`. Nothing is saved
beforehand for those.

```
User edits the form
  → PUT /{ccID}              save (as often as you like)
  → POST /{ccID}/submit      validate what was saved, sign, transition
```

**Consequence:** Submit must **refuse while the form is dirty**, with a message,
or must save first. Otherwise the user submits with unsaved edits and the API
rejects fields they can see filled in on screen — because that text never left
the browser. Amended at 7d: **refuse, not `disabled`**. `global.css` has no
`.btn:disabled`, so a disabled Submit looks enabled and a click on it says
nothing. The refusal runs at click time and again just before the POST. "Dirty"
includes a partly typed date or time, which reports `''` and so is invisible
to the diff.

This applies to **both** save endpoints:

| State | Save endpoint | Then |
|---|---|---|
| `Initiated` | `PUT /{ccID}` — 24 fields | `POST /{ccID}/submit` |
| `In Implementation` | `PUT /{ccID}/implementation` — 5 fields | `POST /{ccID}/submit-final` |

⚠️ **Field values sent to a submit are silently ignored.** Both submit handlers
decode into a two-field struct with no `DisallowUnknownFields`. A body carrying
`change_title` beside the credentials is therefore not a 400: the key is dropped,
and the transition validates the stored value. Nothing on the server catches a
submit of unsaved edits, so the client's dirty gate is the only guard.

**Saves and transitions cannot interleave.** Every writer to `change_controls` (both
saves, all five transitions and the file upload) opens a transaction and takes
`SELECT … FOR UPDATE` on the row before checking its state. A save racing a submit
either commits first, and the submit validates the saved values, or it waits and
gets a 409, because the state has moved.

### A2.1 Where validation happens

| Check | Save | Transition |
|---|---|---|
| Length, enum membership, JSON type | ✅ | ❌ |
| Assignee exists, is active and holds the Approver role | ✅ (400) | ❌ (presence only) |
| Presence of mandatory fields | ❌ | ✅ |
| Business-day date rules | ❌ | ✅ |
| `actual_implementation_date` not in the future | ❌ | ✅ |
| Evidence file exists | ❌ | ✅ (T6) |
| E-signature | ❌ | ✅ |

A draft can be saved empty, and a date valid on Monday may be invalid by
Thursday — so those rules can only apply at submission.

**Mirror the presence checks and the date rules client-side** so the signature
modal never opens on a form that will be rejected. The API enforces them
regardless; the client-side copy is purely to avoid asking for a password before a
certain failure. Amended at step 9: T2 checks presence **and** the business-day
rules in one pass, so a presence-only mirror let a present-but-early date through
to the modal (A5.3).

## A3. Partial updates — absent, null, value

Both save endpoints accept a **partial** body (RFC 7386 merge-patch):

| You send | Result |
|---|---|
| key **absent** | unchanged |
| `"field": null` | **cleared** |
| `"field": "value"` | set |
| `"field": ""` | **cleared** — text and enum fields only |

⚠️ **`""` is a parse error on the four date and time fields and on
`assigned_approver_id`.** Only `null` clears those. A cleared date picker must
send `null`, and so must the approver select, whose "Select Approver" option has
`value=""`. The dates unmarshal into `*time.Time` and the approver into
`*uuid.UUID`, and neither parses an empty string.

**Only the fields listed for that state are accepted.** Any other key returns
**400** listing every offending key, and **nothing is written** — the rejection is
atomic, so a valid field sent alongside an invalid key is not saved either.

**Send only the fields that changed** (decided at step 7c). The server's own rule,
that a value equal to the stored one writes nothing, makes a whole-form body look
safe. It is not, for two reasons, both observed:
- **It reverts another tab's save.** A tab loaded before another tab saved sends
  the old values back. On the audited fields (the two dates and the approver) it
  also writes a `FieldUpdated` row recording a change nobody made.
- **Not every value round-trips.** The time input holds `HH:MM`, so a TIME stored
  with seconds by another client (`0000-01-01T11:00:15Z`) goes back as `11:00:00`,
  with a 200.

Build the body by comparing the form to the record through the same conversion
that built the form, so the comparison is plain string equality. An empty diff
sends nothing, because `{}` is a 400. A diff does not prevent a lost update on the
*same* field across tabs. The API has no version check.

**How "absent means unchanged" is implemented:** not by the query.
`UpdateChangeControlDraft` assigns all 24 columns unconditionally. The handler
seeds every parameter from the row it locked, each present key overwrites only
its own, and the `UPDATE` runs only when some value differs.

**Also true of `PUT /{ccID}`**, audited against `HandlerSaveDraft`:
- **An empty body `{}` is a 400**, `No fields to update`.
- **The checks run in this order:** body parse, empty body, unknown keys (400),
  not found (404), not the owner (403), not `Initiated` (409). So a non-owner
  sending a bad key gets 400, not 403. Ownership is `change_owner_id` against the
  caller, with no role check.
- **Text and enum values are trimmed, and whitespace-only becomes `null`**,
  before the length and enum checks. The response can therefore differ from what
  was sent, so rebuild the form from it.
- **A save that changes nothing is still 200** and returns the record, and
  `last_updated_on` does not move. The response is re-read inside the
  transaction, so it is identical to `GET`.
- **Value errors stop at the first failing field**, in the handler's field order.
  Each comes back as a plain `ErrorResponse` naming the field in prose (`Change
  Title must be 200 characters or fewer`). Length, enum, JSON type and the assignee
  check all behave this way. Only unknown keys produce `issues`.
- **Every 400 is atomic, audit rows included.** Each error returns before the
  commit, so an audit row that an earlier field already inserted is rolled back
  with everything else.
- **A partly typed date reads as empty.** `<input type="date">` reports
  `value === ''` for `25/10/`, the same as a cleared picker, so a save would send
  `null` and clear the stored date. Check `input.validity.badInput` on the date
  and time inputs, and refuse the save.

**And of `PUT /{ccID}/implementation`**, audited against
`HandlerSaveImplementationDetails`. It is the same machine with a different
whitelist, so everything above holds — the `json.RawMessage` map, the seed from
the locked row, unknown keys before the transaction, trimming, `""` → `null`, a
no-op that writes nothing and leaves `last_updated_on` where it was, and the
re-read before the commit. What differs:

- **Five keys, not 24:** `actual_implementation_date`,
  `post_implementation_issues`, `implementation_summary`,
  `deviations_from_plan`, `validation_performed`. The unknown-key 400 reads
  `Some fields cannot be edited in the In Implementation state`.
- **The state check is `In Implementation`**, so the 409 is that.
- ⚠️ **`implementation_evidence` is not one of the five** — see A10. It is the
  one field the Security Matrix marks editable that this endpoint rejects.
- **No business rules at all.** Any date is accepted here; "cannot be in the
  future" is checked at **T6**, not at save.
- ⚠️ **`actual_implementation_date` is a DATE column taking RFC 3339**, like the
  four in `SaveDraftRequest`. `"2026-09-01"` is a 400; send
  `"2026-09-01T00:00:00Z"`.
- **It writes no audit rows, and that is correct.** BRD **SC-5** names the nine
  critical fields — Decision, Risk Level, Decision Comments, Final Decision,
  Final Comments, Cancellation Reason, Target Closure Date, Proposed
  Implementation Date, Assign Approver — and none of these five is among them.
  All nine are audited elsewhere: three in the draft save, three at T4/T5, two at
  T7/T8, one at T3. **Expect no `audit_logs` row after an implementation save**;
  its absence is conformance, not a gap.

⚠️ **The draft save's approver audit row is written under
`field_name = 'assign_approver'`**, not `assigned_approver_id`. The other two
audited draft fields use their column names. A psql check needs the right string.

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

The same `""` → 400 applies to `assigned_approver_id`, which is not a date but
unmarshals into `*uuid.UUID` (A3).

### A5.2 Time-of-day fields carry a placeholder date

`implementation_window_start` and `_end` are `TIME` columns and return as:

```
"0000-01-01T09:00:00Z"
```

The date portion is an artifact — Go's `time.Time` always carries one. Strip it
for display; send the same shape back.

`<input type="time">` yields `HH:MM` only while it has no `step` attribute. Add one
and the value gains seconds, so `0000-01-01T${value}:00Z` stops being valid RFC
3339 and every save 400s. That failure is loud.

### A5.3 Two date rules, enforced at T2

- `proposed_implementation_date` ≥ **2 business days** from today
- `target_closure_date` ≥ **10 business days** from today

Weekdays only; public holidays are not modelled. **Computed in UTC** — in a UTC+
deployment, a submission between midnight and the offset is evaluated against the
previous calendar day.

The rule is `date.Before(businessDaysFrom(today, n))`: the date must not be
**earlier** than the boundary. `businessDaysFrom` steps one day at a time and steps
over weekends, so the boundary is always a weekday. **The date itself need not be
one** — a Saturday after the boundary is valid. There is nothing to disable
day-by-day in the picker; there are two boundary dates.

**The client mirror (step 9):**
- **The gate** compares the stored `YYYY-MM-DD` against the boundary in the submit
  gate, computed **at click time**, never cached. The gate already refuses while
  dirty, so the form's strings are the stored row, and lexical `<` is Go's
  `Before`. The messages are the Go's sentences, word for word.
- ⚠️ **UTC dates only.** Between 00:00 and 04:00 in Dubai the local date is a day
  ahead of the server's, so a local-date boundary would be stricter than the
  server for four hours a night. Use UTC getters and setters only.
- **`min` on the two inputs** greys out days that can never pass. It is an
  affordance, not the gate. It can go stale on a page left open overnight, but only
  in the lenient direction, since the boundary only moves forward, and the gate
  then refuses.
- **The client can still disagree with the server** when midnight UTC falls between
  the gate check and the server's check, or when the device clock is wrong near
  midnight. The server is authoritative, and `Date` is not a CORS-exposed header.

### A5.4 `actual_implementation_date` must not be in the future

Retrospective by nature. **Accepted at save, rejected at T6** — so a user can
draft on Monday for work scheduled Wednesday.

**Disable future dates in the picker** so the rule is never hit.

The Go is `cc.ActualImplementationDate.After(today)`, with `today` truncated to
midnight UTC and the sentence collected into the same `issues` array as the
presence checks, **last**: `Actual Implementation Date cannot be in the future`.

**The client mirror (step 13a)**, following A5.3's shape:
- **The gate** compares the stored `YYYY-MM-DD` against `todayUTC()` with `>`,
  computed at click time, never cached. `After` is strict, so **today itself
  passes** — never `>=`. Only a present date is tested, so a missing one is not
  reported twice. The sentence is the Go's, word for word.
- ⚠️ **UTC only, and the trap runs the OPPOSITE way to A5.3's.** Between 00:00
  and 04:00 in Dubai the local date is a day *ahead* of UTC, so a local-date
  version would **allow** a date the server rejects. A5.3's equivalent mistake is
  merely strict; this one is lenient, which is worse — it collects a password for
  a submission that is going to 400.
- **`max` on the input** greys out the days T6 refuses. An affordance, not the
  gate. ⚠️ **Unlike `min`, a stale `max` is STRICTER than the server:** a page
  left open past midnight UTC refuses today in the picker although the server
  accepts it, with nothing on screen explaining why, and the gate cannot rescue
  it because there is nothing to refuse. It is kept because `max` blocks the
  picker and not the keyboard — the date can still be typed, and it then binds,
  saves and submits — and because any load, save or upload response clears it.
  Recorded as a flag rather than absorbed.

### A5.5 Display: slice dates, format instants

| Column type | Fields | Display |
|---|---|---|
| `DATE` | `proposed_implementation_date`, `target_closure_date`, `actual_implementation_date` | `iso.slice(0, 10)` |
| `TIME` | `implementation_window_start`, `_end` | `iso.slice(11, 16)` |
| `TIMESTAMPTZ` | `created_on`, `last_updated_on`, `implementation_approval_on`, `final_approval_on`, `actual_closure_date`, `uploaded_on`, `signed_on` | `formatDateTime`, in the browser's zone |

⚠️ **Never pass a DATE through `new Date()`.** A DATE is midnight UTC. In any zone
west of UTC that instant is still the previous day, so every date on the form
would read one day early. From a UTC+ zone the bug cannot be seen, so test it with
a timezone override.

`actual_closure_date` is the odd one out. Despite its name it is a
`TIMESTAMPTZ`, set to the same instant as `final_approval_on`. TIMESTAMPTZ values
arrive with the server's offset (`+04:00`), not `Z`.

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

**PDF only, 10 MB maximum** (`10 << 20` bytes, compared with `>`). **Two
checks, both real gates:** the filename must end in `.pdf`, in any case, and
the bytes must start with `%PDF-` (`http.DetectContentType`, in the handler).
So a renamed `.png` fails, and so does a genuine PDF named `report.txt`. Both
return `Only PDF files are accepted`. One file per field: re-uploading
**replaces** it (an upsert on `(change_control_id, field_name)`), and there is
no delete endpoint. **Once a file exists it can be replaced but never
removed**, so the UI must say that an upload replaces.

Owner only (by `change_owner_id`, with no role check, as in A7.6),
`In Implementation` only.

⚠️ **Every 400 is checked before the transaction opens**, so it precedes the
404, 403 and 409. A bad file sent to a record that has moved on returns the
400, not the 409. This is the same shape as A7.4's body checks. The full list
and its order are in `openapi.yaml`.

**Which checks a file input can reach.** Of the handler's checks, only four:
- the size
- the extension
- an empty file
- the magic bytes

Everything else is fixed by how the client builds the request:
- the path
- the part name
- multipart itself

Two checks can never fire from any client:
- **The blank-filename check.** Go stores a part with an empty filename as a
  plain form value, so it reports `Missing file payload in request` first.
- **The second size check.** `FileHeader.Size` is the byte count Go actually
  read, so it is the same number as the first.

The client applies the first three before sending, with the Go's sentences.
Otherwise it uploads the whole file only to draw a certain 400. Over about
11 MB, `MaxBytesReader` closes the connection while the browser is still
sending, so the failure may arrive as status 0 rather than the 400. That is
reasoned from `net/http`, not observed. The magic-byte check is left to the
server.

**The stored filename may differ from the one chosen.** `sanitizeFilename`, in
order:
1. It turns `\` into `/` and strips any directory.
2. It drops C0 controls, DEL, `"`, `'`, `` ` `` and `;`.
3. It trims.
4. An empty result, `.` or `.pdf` becomes `evidence.pdf`.
5. It caps the name at 255 runes, keeping the extension.

The extension check reads the raw name first. From Windows, `O'Brien; v2.pdf`
is stored as `OBrien v2.pdf`. Other non-ASCII characters, bidi overrides
included, are kept. The response and the screen show the stored name.

**The response is the whole record** (`ChangeControlResponse`), re-read inside
the transaction like A7.7's. So `setRecord()` it, and never refetch. Because
that rebuilds every form object, **the upload refuses while the form is dirty**
and locks the form while in flight, as a save does.

**Side effects:**
- `last_updated_on` and `last_updated_by_id` move on every upload.
- **No audit row is written**, which is correct under SC-5.
  `file_attachments.uploaded_by_id` and `uploaded_on` are the trail.

**A retry is safe:** if a status 0 or 500 hid a commit, the upsert replaces the
file with the same bytes. Unlike Create (flag 30), repeating an upload creates
nothing new.

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

**401 `Invalid credentials`** — that exact string, from all five transitions. It
is the only thing separating a failed signature from a dead token, and `api.ts`
branches on it (A1.2). The record is **untouched**, and an audit row records the
attempt.

Retrying is safe when the *user* retries. The wrapper must **never** retry it
automatically, because each attempt writes its own `SignatureFailed` row.
Never store the password; clear it when the modal closes.

⚠️ **Never trim the password.** The Go trims the email and **not** the password,
so a trimmed password with a leading or trailing space draws a false 401 and an
audit row. The prototypes trim both.

**The rule is per field, not "never trim" (step 10).** A client-side check
applies what the server applies to that field before its own check, and **every
value is sent as typed**. So the password is checked `=== ''`. The email and
T3's `cancellation_reason` are checked after `trim()`, because the Go runs
`TrimSpace` on both, and the reason's 500-rune limit is counted after the trim.
JavaScript's `trim()` and Go's `TrimSpace` disagree on U+0085 and U+FEFF. For a
check, both directions are safe: the client refuses a reason that is only
U+FEFF, which the server would have stored, and anything the server refuses
instead comes back as a plain 400 that stays in the modal (A7.8).

**The gate buffers follow the same rule (step 11).** `decision_comments` and
`final_comments` are checked in the submit gate after `trim()` for blank, and
their 2000-rune limit is counted after the trim, because T4/T5 and T7/T8 do both
before the transaction opens. ⚠️ **The length check runs at those two gates
only.** T2 and T6 check no lengths, and the columns are plain `TEXT`, so a value
over the limit written straight to the database passes both. Refusing it there
would block a transition the server allows.

Two mechanics behind the row, both deliberate:
- It is written with `cfg.db`, **not** the transaction, so it survives the
  `defer tx.Rollback()` that undoes everything else.
- If writing it fails, that is logged and the handler **still returns 401**.

⚠️ **A failed signature does not always leave a row.** If password verification
returns an *error* rather than a mismatch, the handler returns **500 `Something
went wrong` with no `SignatureFailed` row**. So a 500 from a transition is not a
signature failure, and must not be reported as one.

### A7.4 The signature comes last

The API validates the request, then the record, then the signature, in all five
transitions — so the modal should only open once the client-side checks pass.

⚠️ **But "presence" means two different things, and the order differs.**
- **T2 and T6** validate the **stored row**: 404, then 403, then 409, then the
  presence checks and date rules, then the signature. Amended at step 9: **they
  also have body checks, which run first**, before the transaction opens. These
  are `CC-ID cannot be blank`, `Invalid request body`, `Email cannot be blank` and
  `Password cannot be blank`. So a blank password is a plain 400 even on a record
  that has moved on, and the modal refuses both blanks before sending.
- **T3, T4/T5 and T7/T8** validate the **body the user just typed**, and those
  checks run **before the transaction opens** — so they precede the 404, the 403
  and the 409. An approver submitting a decision with blank comments on a record
  that has already moved on gets `Decision Comments cannot be blank` (400), not
  the 409.

Both orders put the signature last, which is what A7.4 is for. The difference
matters when reading an error: a 400 does not prove the record is still in the
state you think it is.

### A7.5 Show the meaning being signed

Each **transition** has a fixed meaning string — seven constants, one per
transition. Display it in the modal so the user knows what they are attesting
to. **ASCII hyphens** — see A4.

⚠️ **Per transition, not per endpoint.** The two decision endpoints each cover
two transitions, and pick between them from the submitted field:

| Endpoint | `Approve` | `Reject` |
|---|---|---|
| `POST …/decision` | T4 `Approved - Implementation Approval` | T5 `Rejected - Implementation Approval` |
| `POST …/final-decision` | T7 `Approved - Final Approval` | T8 `Rejected - Final Approval` |

So the modal's meaning must follow the user's choice live. Both approver
prototypes hardcode the approve string.

### A7.6 Authorisation is by RECORD, not by role

⚠️ **None of the five transition routes carries `requireRole`.** All are mounted
behind `middlewareAuth` alone, and each handler authorises by comparing the
caller to the record:

| Transitions | Check | 403 when |
|---|---|---|
| T2, T3, T6 | `user.ID == cc.ChangeOwnerID` | not this record's owner |
| T4/T5, T7/T8 | `cc.AssignedApproverID != nil && *… == user.ID` | **not this record's assignee** |

**This is where the Security Matrix and the API diverge.** The Matrix's
"Approver" column is a *role*; the API cares only about assignment. An Approver
who is not this record's assignee gets 403 `Forbidden`, so enabling the gate for
every Approver — which is what reading the Matrix literally produces — offers an
action that cannot succeed.

The client predicate mirrors the server and adds **no** role check the server
does not make. Compare on the id, never the name (A11). Same principle as the
draft save, whose 403 is ownership and not role.

### A7.7 A transition returns the whole record

All five return **200 with the full `ChangeControlResponse`**, re-fetched inside
the transaction through the same query `GET /{ccID}` uses, with the five user
joins. The read happens **before the commit**, so a failure at any point leaves
nothing written and the error and the record's state agree.

**So the caller sets the record from the response and does not refetch.** A
refetch would be a second round trip for data already in hand, and it would open
a window in which the form shows the old state.

**The signature history is not in the response**, so after a 200 the caller
refetches `GET …/signatures` alone. The rule above covers the record, not this
separate resource (step 9). ⚠️ That GET is a second `await` after the 200 is
checked, so it needs **its own** sequence check. Otherwise a navigation in between
lands the old record's signatures on the new record's panel.

### A7.8 T3 collects its reason inside the signature modal (step 10)

T3 is the one transition whose body carries a value **typed in the modal**:
`cancellation_reason`, beside the credentials. It is not a separate modal. The
signature modal asks for the reason when the meaning being signed is
`Cancelled`, which only T3 signs. **No presence gate:** the handler checks no
stored field, so a draft may be cancelled at any completeness. **It does refuse
while the form is dirty,** like every other bar button. T3 ignores field values,
so the record frozen for good is the stored one. In a regulated system, the
permanent record and the screen that authorised it should agree.

**Where an error goes: wherever the user can act on it.**
- Failures about the record (409, 403, 404, `issues`) close the modal.
- **A plain 400 is always a body check made before the transaction opens**, so
  it is about something the user typed. For T2 and T3 every body value is typed
  in the modal, so a plain 400 stays in the modal, nothing cleared.
- A 401 `Invalid credentials` clears **only** the password. The email and the
  reason are kept.
- ⚠️ **T4/T5 and T7/T8 carry fields from the form behind the modal, and the row
  is unchanged for them (step 11).** The submit gate trims and checks the comment
  lengths (A7.3), so ordinary typing reaches no field 400. Only a paste does:
  U+0085 as the whole comment, or U+FEFF past the limit. The same U+0085 in the
  email draws `Email cannot be blank`, which belongs in the modal. The code
  cannot tell the two apart without the message (forbidden) or a copy of Go's
  whitespace table (rejected at step 10), and routing by transition would
  misroute the email case. So a field 400 shows in the modal verbatim, naming
  the field. Back is beside it, and it keeps the form's buffer.

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

- the two save endpoints — **only** for keys not editable in the current state.
  A bad *value* (length, enum, type, assignee) is a plain `ErrorResponse` for the
  first failing field
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
transition caller that *expects* one: **T2 and T6 also return plain
`ErrorResponse` 400s** for a blank email or password or a bad body (A7.4).

**Where the list renders (step 9): a dialog, never the action bar.** The error's
**shape** decides where it goes, not its length:
- **A body with `issues` opens a requirements dialog.** The heading is `error`
  verbatim, and every item is listed verbatim, one per line, in a `<ul>`. Bare
  labels stay bare.
- **A plain `{ error }` goes to the bar.**

An `issues` array is the only error whose length depends on the data, from 1 item
to 20. The first attempt joined the labels onto one line in the sticky bar.
Twenty labels then squeezed the bar's buttons onto three lines, so the bar cannot
hold this kind of message at any length. The client's submit gate returns the same
shape as the server, so both open the same dialog.

**Known cost:** once the dialog is dismissed, nothing marks a date that is present
but too early. Errors beside the field (A8.2's 400 row) would fix it.

**The order of the items differs from the server's, and that is accepted (step
13a).** At T6 the Go lists Implementation Evidence first, then the four fields;
the client lists them in `MANDATORY`'s order, with Evidence last. Both then put
the date sentence after the labels. **The same items are listed either way, and
nobody sees both refusals at once** — the client's gate is what stops the request,
so the server's list is only reachable from Postman. Reordering either side to
match the other would pin the client to the handler's statement order, which is
not part of the contract. Do not raise it again as a defect.

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
- **The exact 400s**, both from `parsePagination`:
  `invalid limit: must be a positive integer` for a non-integer or `< 1`, and
  `invalid offset: must be a non-negative integer` for a non-integer or `< 0`.
  An empty `?limit=` counts as absent and takes the default. **Pagination is
  parsed before every other parameter**, so `?limit=abc&state=Bogus` returns
  the limit error alone — only ever one error per response.
- **`offset`, not page numbers.** `offset = (page - 1) * limit`. There is no
  ceiling: an offset past the end is `[]` with `200 OK` and the true `total`,
  not an error.
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
  ⚠️ **The handler tests `q.Get("owner") == "me"` — exact, and not trimmed.**
  Any other value (a UUID, `ME`, a leading space) **leaves the filter
  unapplied**: the unfiltered list comes back with `200 OK` and no warning
  anywhere. Same failure mode as `?is_active=` below. So a screen presetting
  `owner=me` must **set it itself and never read it from the URL**, or a
  hand-edited `?owner=<someone else's uuid>` turns "My Change Controls" into
  everyone's, silently. Step 6 does exactly that.
- ⚠️ **The two are disjoint by role, which is why there is no ownership
  dropdown.** Only a **CC Owner** can own a record — `POST /changecontrols` is
  `requireRole(roleCCOwner)`, `requireRole` is exact equality rather than a
  hierarchy (so not an Admin either), and **no `UPDATE` ever reassigns
  `change_owner_id`**. The owner is therefore always the creator, which is why
  no creator is recorded separately and "Created by me" is not a filter that
  can exist. Only an **Approver** can be assigned one — a non-Approver assignee
  is a 400 at save time. For every one of the four roles at least one of the
  two can only ever return zero rows.
- **`?state=` accepts one value.** `q.Get` reads the first, and a comma list is
  one string, so `A,B` is a 400 `Invalid state`. For "either pending state",
  make **one call per state**. Filtering an unfiltered `?assigned=me` on the
  client breaks `total` and pagination.
  ⚠️ **An unfiltered `?assigned=me` is not "both gates".** It returns every
  state the caller is assigned in: Initiated, In Implementation and Closed as
  well. At step 11 the approver had 14 records, 7 of them pending.
  ⚠️ **Not the dashboard's `pending_approvals` block.** It spans both gates but
  is capped at **2 items** (`dashboardCardItems`). An approver with seven
  pending records would see two, with no error. Its `pending_approvals_total`
  is uncapped, so it can show a count but never the queue.
- **`?search=`** matches CC-ID, change title and owner name only — **three
  columns**, not descriptions, not affected systems, not the approver's name.
  Case-insensitive substring (`ILIKE`). A search box whose placeholder promises
  more than three fields is wrong; the prototypes' does.
  ⚠️ **`%` and `_` are not escaped** (backend flag 24). They are `LIKE`
  metacharacters, so `50% capacity` matches **every** record and `CC_001`
  matches `CC-001` and `CC0001` alike. Neither looks like a failure — the list
  just returns the wrong rows. **Do not work around it client-side**: the fix
  is server-side, and escaping here would make the frontend disagree with
  Postman, curl and every other consumer.
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

### Sidebar
The same five links for every role: Dashboard, All Change Controls, My Change
Controls, Approvals and Settings (BRD §2.3.4 and §9.5.1, and all three role
prototypes). There is no API call behind the sidebar and nothing in it is
role-conditional. All Change Controls stays active on the CC form, as in every
`cc-form-*` prototype.

**Sign Out is not in the sidebar.** Every prototype puts it on Settings → Profile.

### Dashboard
One call returns everything. **The lists are capped (2, 2, 5); the totals are
not** — three drafts returns `my_drafts_total: 3` with two items, so the card
reads "3" over two rows.

All five `overview` keys are always present, reporting `0` where no records exist.
The five cards link to `?state=<value>`.

`Cancelled` is absent from the counts but can appear in recent activity.

**Overview and recent activity are system-wide.** Every role sees the same
numbers and the same five rows. Only the two action cards are personal. The
prototypes imply otherwise in two places: the Admin's empty message ("change
controls you're involved with") and the owner prototype's comment. The two
cards and recent activity are all ordered `last_updated_on DESC`.

### Change control form
**One form, every state and role.** Do not build a page per state.

**The Security Matrix decides what is editable.**
- **Everything else is read-only, as a disabled control**, so enabling a field
  never means rewriting its markup.
- **System fields no role can ever edit stay as `.meta-value` text:** CC ID, the
  approval By and On values, the statuses and Actual Closure Date.

⚠️ **The Matrix's columns are ROLES; the API authorises by IDENTITY.** Read the
columns as follows, and never as a role check:

| Matrix column | The predicate | Because |
|---|---|---|
| CC Owner | `cc.change_owner_id === user.id` | `HandlerSaveDraft`, `HandlerSaveImplementationDetails`, the upload, T2, T3 and T6 all compare `change_owner_id`; none has a role check |
| Approver | `cc.assigned_approver_id === user.id` | T4/T5 and T7/T8 compare `assigned_approver_id`. **A non-assigned Approver gets 403** |
| Viewer, Admin | never editable | they appear as the actor in no state |

Only a CC Owner can own a record and only an Approver can be assigned one
(A9.2), so the identity check subsumes the role check without stating it. See
**A7.6**.

⚠️ **`In Implementation` is six cells in the Matrix but five on the save
endpoint.** `implementation_evidence` is editable and mandatory, but it is not
in the implementation save's whitelist — it goes through
`POST …/files/implementation_evidence`. Sending it in the save body is a 400
carrying `issues: ["implementation_evidence"]`. So the state has **two** writers,
and a diff built from `SaveImplementationRequest`'s keys cannot reach the wrong
one.

**Nothing is hidden by state.** A field with no value yet renders empty. This
departs from BRD Rule P5, whose "Not applicable" boxes the prototypes draw as
`.field-na`.
- **One exception:** `cancellation_reason` renders only on a Cancelled record,
  read-only, below Comments (BRD Rule P6).
- T3's modal writes it; the form never does.

**An asterisk appears only on a field the viewer can edit now AND that the
transition they are working toward requires:** `editable(field) && mandatory`.
- **A disabled field never carries one.** So a Viewer, an Admin, or anyone on a
  Closed or Cancelled record sees none.
- **It is an instruction to whoever has to act.** This departs deliberately from
  the prototypes, which star disabled fields.

**Editable and mandatory are different sets.** The owner can edit 24 fields in
Initiated, but T2 requires 20. T6 does not require `deviations_from_plan`. The
mandatory sets, confirmed against the Go:

| State | Transition | Required | Source |
|---|---|---|---|
| Initiated | T2 | the 24 draft fields **except** both window times, `comments_for_approver` and `comments`: 20 | `HandlerSubmitForImplApproval`'s presence checks |
| Pending Implementation Approval | T4/T5 | `decision`, `risk_level`, `decision_comments` | `HandlerImplementationDecision`'s body, all three blank-checked |
| In Implementation | T6 | `actual_implementation_date`, `post_implementation_issues`, `implementation_summary`, `validation_performed`, `implementation_evidence` | `HandlerSubmitForFinalApproval`'s presence checks |
| Pending Final Approval | T7/T8 | `final_decision`, `final_comments` | `HandlerFinalDecision`'s body |
| Closed, Cancelled | — | none | |

The form page holds these as `MANDATORY`, a `Record<State, …>`, and `required()`
combines it with `editable()`. Step 8 implements only `editable()`, and the
asterisks follow.

`change_title` can be `null` on a draft. The input's placeholder arrives with
editability.

⚠️ **A rejection's values stay on the record.** T2 and T6 set only the state,
the status and the updater.
- **After T5**, an `Initiated` record still shows Decision `Reject`, its Risk
  Level and its comments, beside a status of `Not Submitted`.
- **After T8**, Final Decision still reads `Reject`.
- **The approver reopening either gate** finds their fields pre-filled with the
  previous rejection.

The Signature History is its own call, `GET /changecontrols/{ccID}/signatures`,
open to all roles and fetched beside the record. A record that has never been
submitted has none. One returned to `Initiated` by T5 does.

### User management
The pencil and the status toggle are **separate calls** — `PUT /users/{userID}`
and `PUT /users/{userID}/active`.

Disable the status toggle on your own row, and hide the role selector for
yourself. **Both are 400, not 403:** `Self Deactivation is not allowed` and
`Self Role Change is not allowed`. The only 403 on these endpoints is
`requireRole`'s `Forbidden`, for a non-Admin. The self-role check fires only
when the requested role *differs*, so a body carrying your own current role is a
200 no-op.

### Profile
**Read-only in Phase 1.** No self-update endpoint and no change-password endpoint.
Name, email and role display only.

### Approvals
`?assigned=me` returns your records but takes **one** state, and with none it
returns **every** state you are assigned in, not just the two gates (A9.2).

**Built at step 11 as one list with one gate at a time.** The State select offers
only Pending Implementation Approval and Pending Final Approval, with **no "All"
option**, and the page lands on the first. Each view is one
`?assigned=me&state=…` request, so `total` and pagination are exact. It is
`ChangeControlList` with props, not a copy. **Known cost:** the dashboard's
pending count spans both gates, so it can read higher than the landing view,
and nothing on the page says the other gate holds more.

⚠️ **The dashboard's `pending_approvals` block is not a substitute.** It spans
both gates, but it is capped at 2 items, and only `pending_approvals_total` is
uncapped. A queue built from it shows at most two records, and nothing says so.

## A11. IDs and names

**The change-control shapes** carry every user reference as a pair:

```json
"change_owner_id": "73960fc2-…",
"change_owner_name": "Default CC Owner"
```

**Compare on the id** — `cc.change_owner_id === currentUser.id` decides whether a
button renders. Names are not unique (only `email` is) and can change.

**Display the name.** The client cannot resolve a UUID, and a lookup per record
would be N+1.

**Not every name has an id.** Two responses carry a name alone, and neither is
ever compared:
- `SignatureItem.signer_name`
- the dashboard's `recent_activity[].last_updated_by_name`

**Two lifetimes.**
- **The names on a change control are live joins** on `users`. Renaming a user
  changes them on every record at once.
- **`signer_name` is a snapshot** taken at signing (BR-8.8.5), and it never
  changes.

The CC form shows both. After a rename, Signature History carries the old name
while the Approvals card shows the new one. That is by design, not a stale cache.

**Which names can be null.**
- **Never null:** `change_owner_name` and `last_updated_by_name` (inner joins on
  NOT NULL keys).
- **Null exactly when their id is:** `assigned_approver_name`,
  `implementation_approval_by_name` and `final_approval_by_name`.
- The two approval-by pairs are set on **approve only**, by T4 and T7.

**`last_updated_by_name` is not always the owner.** Both saves, the file upload
and every transition set it to the caller. So after any approver decision (T4,
T5, T7 or T8) it is the approver.

## A12. CORS

The API allows origins listed in its `ALLOWED_ORIGINS` environment variable.
`http://localhost:5173` (the Svelte dev server) must be among them.

A misconfigured origin fails in a confusing way, but **it cannot write**.

- **Preflight.** A request with an `Authorization` header or a JSON
  `Content-Type` makes the browser send a preflight `OPTIONS` first.
  `middlewareCORS` answers a disallowed origin's preflight with no
  `Access-Control-Allow-Origin`, so the browser stops there and **never sends
  the real request**.
- **Requests that skip the preflight** are a GET or a multipart upload sent
  with no token. `middlewareAuth` rejects those with a 401 before any handler
  runs.

So nothing this app sends from a disallowed origin gets past the preflight or
the auth check. The client just sees a network error with nothing useful in it
(`status: 0` from `api.ts`). Check the browser console for a CORS error before
suspecting the API.

⚠️ **Status 0 on a write still does not prove that nothing happened.** A
connection dropped after the commit looks identical. That is a network
problem, not a CORS one.

*This was corrected at step 3. It had said that a blocked request "reaches the
server and executes", which is true only of simple requests, and in this app
those are always token-less. The result was reasoned from `middlewareCORS` and
the Fetch spec's preflight rules, not observed with a wrong `ALLOWED_ORIGINS`.*

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
| `$effect` | **Not for fetches.** Use `onMount`, below. Its one use is the mount-only redirect at `/`. Nothing else |

⚠️ **Mount-only fetches use `onMount` from `svelte`, not `$effect`.** An effect
subscribes to every piece of state it reads synchronously, and that includes
reads inside the functions it calls. `request()` reads `auth.accessToken` before
its first `await`. So a fetch inside `$effect` refetches whenever the token
changes:
- on the 401 path's refresh
- every 24 minutes, once the scheduled refresh (step 16) exists

There is no error, only extra requests. `onMount` subscribes to nothing, so it
runs once by construction. The `(app)` layout's restore uses it for the same
reason.

⚠️ **A fetch that must REPEAT when the URL changes needs `onMount` *and*
`afterNavigate`.** This is the list screens, step 6 onwards. Neither is correct
alone:

- **`onMount` fires once.** A filter or page change is a navigation *without* a
  remount, so the table would never refetch — the same silent staleness as the
  `$derived` rule below, one layer up.
- **`afterNavigate` does not fire on load in this app.** It registers its
  callback through `onMount` (`client.js:add_navigation_callback`), and
  SvelteKit dispatches the initial `type: 'enter'` **during hydration**, to
  whatever is registered at that moment. Every page under `(app)` is gated
  behind `auth.user`, which stays null until the layout's restore resolves
  `/refresh` and `/me` — long after hydration. The component is therefore
  created *after* `'enter'` has been dispatched and never receives it, and a
  hard reload sits on "Loading…" for ever with nothing in the console.

Run both, keyed on the query string, and the ordering stops mattering:

```ts
let lastQuery: string | null = null;

function loadIfChanged() {
  if (query === lastQuery) return;     // `query` is $derived from the URL
  lastQuery = query;
  load(query);
}

onMount(loadIfChanged);
afterNavigate(loadIfChanged);
```

Whichever fires first issues the request; the other is a no-op. `afterNavigate`
earns its place by catching what "reload after each `goto`" would miss: **Back
and Forward**, and the sidebar link tapped while already on that route. Clear
`lastQuery` on failure, so the same URL can be retried after an outage without a
reload. Add a sequence counter where requests can overlap — a debounced search
makes them overlap routinely.

⚠️ **Never name a variable `state`.** It shadows the `$state` rune, and
`$state(true)` is then compiled as a store subscription on your variable. The
errors point at the `$state` lines, not at the declaration, and read
`Cannot use 'state' as a store`. Use `stateFilter` or `currentState`. The same
holds for `props`, `derived`, `effect` and `inspect`.

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
reaching outside the reactive system in response to state. A fetch on mount is
not a response to state, so it uses `onMount` (above).

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

Grouped by job, so each piece has a reason to be here.

- **Routing:** filesystem routes with dynamic params (`[ccId]`), and
  `+layout.svelte` for the root and the authenticated shell.
- **Reading the URL:** `page` from `$app/state`, meaning `page.params` and
  `page.url.searchParams`, always through `$derived`.
- **Navigating:** `goto`.
- **Navigation hooks, one job each:**
  - **`afterNavigate`**, paired with `onMount`, refetches when the URL changes
    without a remount (above).
  - **`beforeNavigate`** holds a navigation away from unsaved edits, on the CC
    form only. It also covers reload and tab close, as `type: 'leave'`,
    through SvelteKit's own `beforeunload` listener, so no `<svelte:window>`
    is needed (B4). It asks with `confirm()`, because the callback is
    synchronous and a styled dialog cannot be awaited in time. For `leave` it
    only calls `cancel()`, and the browser shows its native dialog.
    ⚠️ **It returns early when `auth.user` is null.** `request()`'s forced
    sign-out navigates through the same callbacks, and a prompt there would let
    the user stay on a form that cannot save. **Every sign-out must clear
    `auth.user` before it navigates.**

**Not used:** `onNavigate`, `navigating`, `invalidate` and `preloadData`, shallow
routing, and snapshots. Snapshots restore edits only on history traversal, and
they would restore them onto a record that may have changed since.

### Deliberately skipped

Not forbidden, simply not needed. If one of these turns out to be the right tool,
say so rather than reaching for it silently.

`bind:group` · `<select multiple>` · numeric input binding · event capturing ·
event-handler spreading · the `{#each}` index parameter · the `style:` directive ·
component CSS custom properties.

**One `style:` use exists, and it cancels rather than adds** (decision 71):
`style:margin-bottom="0"` on the save error in the form's sticky action bar.
`.esig-error`'s `margin-bottom` spaces it inside the e-signature modal. A flex row
with `align-items: center` centres against that margin, lifting the box half of
`--spacing-lg` above the button. Any `.esig-error` placed inside a flex row needs
the same cancellation. **By construction the bar holds only one plain sentence:**
anything with `issues` goes to a dialog (A8.1).

⚠️ **That alone did not make the bar safe.** A flex item shrinks to its narrowest
possible width, which for a `.btn` is its longest word. So at half-screen width, a
single long sentence wrapped every button word by word. This was confirmed with
DevTools closed.

**The fix is non-breaking spaces in every bar button label**
(`Back&nbsp;to&nbsp;List`, or ` ` in a JS string). It needs no CSS and no
second `style:`. The rejected alternatives were `white-space: nowrap` in
`global.css`, which is canonical and kept in five copies, and a `style:` on each
button. **The cost is a convention:** a bar button added without it brings the
defect back, silently and only at narrow widths.

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
- `$effect` for anything beyond the mount-only redirect at `/`. Fetches on mount
  use `onMount` (B3). Deriving state in an effect is the classic Svelte 5
  anti-pattern: use `$derived`
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

T2 and T6 need no write type beyond their credentials, since they carry no field
values (A2). T3, T4/T5 and T7/T8 carry their own fields beside the credentials.

### `null` meets `bind:value`

An input bound to `null` renders the string `"null"`. Convert at the boundaries,
not in the markup:

```ts
// API → form
const form = $state({ change_title: cc.change_title ?? '' });

// form → API, on save: '' → null, and no trim
change_title: form.change_title === '' ? null : form.change_title
```

`'' → null` turns an emptied box back into a clear instruction, which matches A3.
**Date and time fields, and `assigned_approver_id`, must send `null`**, since `""`
is a parse error there (A3, A5.1). On text and enum fields the API normalises `""`
to `null` anyway. **Do not trim a value you send.** The server trims, and Go's
`TrimSpace` and JavaScript's `trim()` disagree on U+0085 and U+FEFF. (A
client-side *check* may trim where the server does. See A7.3.)

**Keep the record and the form as two objects.** `cc` holds what the server last
sent, and `form` holds what is on screen. Only a fetch or a save response
replaces `cc`, and `form` is rebuilt from it each time. Binding straight to `cc`
overwrites the server's copy on the first keystroke, and then nothing can tell
which fields changed.

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
- On a **401 whose body is `Unauthorized`**: refresh once and retry once. A
  401 or 400 from the refresh clears the store and runs `goto('/login')`. Any
  other refresh failure is returned, and the session is kept. Never loop.
  `Account is deactivated` logs out without a refresh. **Every other 401**,
  such as `Invalid credentials` from a failed e-signature, goes back to the
  caller untouched. A1.2
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

**Built at step 12.** `send()` branches on `body instanceof FormData`. The
upload goes through `request()` like every other call, so it gets the token and
the 401 refresh-and-retry. The retry passes the same `FormData` a second time,
which is safe: `fetch` serialises it afresh on each call and does not consume
it the way it consumes a stream.

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
populate the user. The steps, the outcomes and the failure path are in **A1.9**.

⚠️ The `(app)/+layout.svelte` guard must **not** redirect when `auth.user` is
null. On a hard reload it is null for a valid session until the restore finishes,
so that redirect would log out every reload. The guard gates rendering on
`auth.user` and lets the restore decide.

`auth.user.role` is what the CC form branches on, alongside `cc.current_state`, to
express the Security Matrix.

## B9. Build order

Nineteen steps: the seventeen numbered ones, with step 7 split into 7a–7d, step 8
into 8a–8b and step 13 into 13a–13b, plus 7a+ and 7d+. Amended at 7d, which added
7d+, at step 8, which split it, and at step 13, which split it. **A split does not
change the count** — 7a–7d are still step 7, 8a–8b are still step 8 and 13a–13b
are still step 13; only the two `+` steps are additions, which
is why the table has more rows than the number says. Each step is independently
verifiable against the running API — do not start one until the previous works
end to end, and do not merge two because they feel contiguous.

| # | Step | Proves |
|---|---|---|
| 1 | **Scaffold** — `bun create svelte@latest` (TypeScript), `bun add -D @sveltejs/adapter-static`, set `ssr=false`, **copy `docs/prototypes/global.css` → `src/lib/global.css`** and import it in the root layout, commit | The shell builds and **the prototype styling survives inside a component** — verify a card and the sidebar render as they do in the prototype |
| 2 | **`types.ts`** from `openapi.yaml` | The contract is transcribed before any code depends on it |
| 3 | **Login page + auth store + `api.ts`** against the real `POST /login` | Auth works, CORS is configured, the token is stored |
| 4 | **Authenticated layout** — sidebar, route guard, silent refresh on load | Navigation and session restoration |
| 5 | **Dashboard** | First data fetch, first `{#each}`, and every list shape in one screen |
| 6 | **All Change Controls and My Change Controls**: one list on two routes. Filters and pagination come from URL params, and `/my-change-controls` presets `owner=me` | Query-parameter handling, `total` vs `limit`, offset reset, and `$derived` on URL values |
| **7a** | **The CC form, read-only**: fetch a record by `[ccId]` **and its signature history**, and render every field as a **disabled control**, with `disabled` coming from one `editable()` that returns false for now. System fields stay text. Amended at step 7a, which replaced "all 24 fields as text" | The route, the fetch, the field layout against the prototype, and date display across time zones (A5.5). No binding yet |
| **7a+** | **Create**: the "+ Create Change Control" button (CC Owner only), `POST /changecontrols`, then `goto` the new record | The 201 and the generated CC-ID, and 7a rendering an **all-null** record. Moved out of step 8 at step 4. See below |
| **7b** | **Bind the fields** — `bind:value` throughout, with the `null` ↔ `''` conversion at both boundaries | Every input type in the owner's Initiated slice: text, textarea, the six enum selects, the approver select from `GET /approvers`, dates, times. Amended at 7b: the page has eleven selects, seven of them in that slice |
| **7c** | **Save Draft** — send only the changed fields, and handle the response | The absent/null/value model, the write-shaped type, RFC 3339 conversion, and the plain 400. Amended at 7c: a save's `issues` lists only unknown keys, which a body built from `SaveDraftRequest`'s keys cannot contain |
| **7d** | **Dirty tracking** — compare current state to the last-loaded record | The gate that step 9 depends on |
| **7d+** | **Navigation guard**: `beforeNavigate` asks before leaving a dirty form, the browser's native dialog covers reload and tab close, and there is **no prompt on a forced sign-out** | `dirty`'s first consumer, and a guard that stands aside once the session has ended. Added at 7d. See below |
| **8a** | **The permissions restructure**: `editable()` switches on state, the approver's two gate slices become editable for the **assigned** approver only, every other role and state is locked, and flag 25's section notes, placeholders and the four remaining info-banners land. Widened at step 8 — it was "the `Initiated` role views" | The Security Matrix as `{#if}` and `disabled`, **authorisation by identity rather than role** (A7.6), and the Viewer's read-only view. The gate buttons run their client-side checks and stop where the modal will open |
| **8b** | **The `In Implementation` slice and its save** — `PUT /{ccID}/implementation`, Save Draft in that state, and Submit for Final Approval's gate. Absorbed from step 12 | The second save endpoint, and dirty tracking over a second form object. See below |
| 9 | **T2 submit + the e-signature modal** — written once, inline, and opened with a meaning and a sender, so steps 11 and 13 reuse it. Also: the date rules in the submit gate, a requirements dialog for every `issues` body, and the bar's error ordering (flag 42) | The first transition end to end, the save-then-submit gate, and the modal's three outcome paths: a rejected signature, a transport failure, and a failure about the record |
| 10 | **T3 cancel** — the step-9 signature modal, which asks for the reason when the meaning is `Cancelled`. Amended at step 10: not a third modal | The one transition that collects **a reason *and* credentials together**, and where a body error belongs when the field is inside the modal (A7.8) |
| 11 | **Approver flow** — the queue (`/approvals`: the list with `assigned=me`, one gate at a time), and the implementation decision (T4/T5) through the step-9 modal, with the meaning chosen by the decision. Also: a navigation guard for the gate buffers, separate from `dirty` | The second role, the first approval gate, and a leftover rejection on screen |
| 12 | **File upload** — the evidence control: the prototype's box, where choosing or dropping one file is the upload, with no Upload button. Narrowed at step 8: the save half moved to 8b. Amended at step 12: the response is the whole record, so the upload refuses while the form is dirty and locks it while in flight | `FormData`, the part named `file`, the PDF/size limits, and the stored filename differing from the chosen one |
| **13a** | **T6** — `In Implementation` → `Pending Final Approval` through the step-9 modal, with one constant meaning. Also: the future-date rule in the submit gate and `max` on the date input. Split from step 13 at step 13a | The owner's second submit, the gate's second date rule, and a record leaving the state that owns the upload — the box and the editable fields go with it |
| **13b** | **The final decision (T7/T8)** through the same modal, with the meaning chosen by the decision, **and the full loop** on one record: T6 → T8 reject → `In Implementation` → resubmit → T7 approve → `Closed`. The signature history panel moved to 7a | The last gate, a rejection returning a record to an earlier state, and the whole state machine exercised end to end |
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

**Create comes straight after 7a**, not bundled with the role views in step 8.
Its redirect target is 7a's route, so it cannot come earlier.

Placed there, it gives 7b–7d a fresh record with **every field `null`**:
- the hardest case for 7b's `null ↔ ''` conversion
- the cleanest psql check for 7c, since untouched fields must still be `null`

Seeded records cannot be reset: `cmd/seed` creates only the four users. Create
and the role views share nothing but the word `Initiated`.

It is labelled `7a+` rather than renumbering 7b–7d, because other documents cite
those numbers.

**The navigation guard comes straight after 7d**, as `7d+`. It reads `dirty`, so
it cannot come earlier. Without it, leaving a dirty form loses the edits
silently. It was not folded into 7d, for three reasons:
- It brings a new SvelteKit API, `beforeNavigate`, and a new UI pattern,
  `confirm()`.
- `request()`'s forced sign-out navigates through the same callbacks. A guard
  that prompts there lets the user stay on a form that can no longer save,
  which is worse than no guard.
- Its checks are as many as 7d's.

It is labelled `7d+` for the same reason as `7a+`.

**My Change Controls is step 6's list with `owner=me` preset.** It uses the
same endpoint, response shape and pagination, so it is one component on two
routes rather than a step of its own.

The prototypes' Ownership filter needs a decision at that step. Nothing records
a creator separately from the owner, so "Created by me" and "Owned by me" are
the same filter.

Step 9 introduces the signature once, before it appears in five more places.

**Step 8 is split into 8a and 8b, and it absorbed step 12's save half.** As
written, step 8 was "the Initiated role views" and the three other editable
slices waited for steps 11, 12 and 13 — so until then the form had one working
slice and three dead ones.

Pulling them forward runs into one asymmetry. The approver's five gate fields
need no save: nothing writes them but the transition itself, so they can be made
editable on their own. The owner's five `In Implementation` fields **do** save,
through a second endpoint. Making them editable without it would give the owner
five live controls with no Save button, no "Unsaved changes" hint and no
navigation guard — because `dirty` is built on the draft diff — so edits would
vanish on any navigation with nothing on screen saying so. That is the defect
7d+ exists to prevent, in a different state.

So the line falls between them:
- **8a** is everything that needs no new endpoint.
- **8b** brings the `In Implementation` slice **and** its save together, so those
  fields are never editable without something to save them with.

Step 12 keeps the upload alone, which is the genuinely different mechanism
(`FormData`) and deserves its own step either way.

**Step 13 is split into 13a and 13b**, for a reason that is about the build
rather than the code: **each session starts fresh**, so a verified checkpoint
between two transitions is worth more than doing both at once. As one step it was
T6, T7, T8 and a five-transition loop — and a loop that fails halfway leaves no
way to tell which transition was wrong.

- **13a** is T6 alone, plus the two things only T6 needs: the future-date rule in
  the gate (A5.4) and `max` on the input.
- **13b** is T7/T8, which need a `Record<Decision, …>` meaning as step 11 did,
  **and the full loop**, which cannot run until both exist.

13a spends exactly one record — only its success check transitions anything —
so count `In Implementation` before starting, and leave 13b a record to run the
loop from.

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
| Exact JSON field names and shapes | `openapi.yaml` |
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
request blocked by CORS either stops at the preflight or, having no token, is
rejected by the auth check. Either way it never runs a handler (A12), so it
cannot have written anything.

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
