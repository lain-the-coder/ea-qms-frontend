# Frontend — Progress

Read this at the start of every session. Update it at the end of every build step,
once the step has been verified.

---

## Status

**Current step:** 3, login + auth store + `api.ts`. **Verified, awaiting commit.** Next: step 4
**Last verified:** Step 3. Eight of nine checks were run and passed, and check 7 was skipped. See the checkpoint

| Step | | Verified by |
|---|---|---|
| 1 · Scaffold + `global.css` | ✅ | Lain — browser side-by-side |
| 2 · `types.ts` | 🔶 | Two review passes. Lain's line-by-line read found **six**; an independent review against the Go handlers found **five more**. All **eleven `types.ts` findings** fixed; **the fixes themselves are not yet verified**, except `MeResponse` (defect 6): step 3 confirmed that `GET /me` returns exactly its four fields. ⚠️ Nine of those eleven were also `openapi.yaml` defects — and the running spec-defect total is *separately* eleven, after the A1 audit added two. **Two different elevens.** Spec defects are numbered 1–11 in the corrections table; `types.ts` findings are not numbered |
| 3 · Login + auth store + `api.ts` | ✅ | Lain: browser, Network tab and psql. Eight of nine checks were run and passed, then `revoke()` and the retry-then-signature branch. Check 7, the optional timeout probe, was skipped |
| 4 · Authenticated layout | ⬜ | |
| 5 · Dashboard | ⬜ | |
| 6 · All Change Controls | ⬜ | |
| 7a · CC form, read-only | ⬜ | |
| 7b · Bind the fields | ⬜ | |
| 7c · Save Draft | ⬜ | |
| 7d · Dirty tracking | ⬜ | |
| 8 · Create + `Initiated` role views | ⬜ | |
| 9 · T2 submit + e-signature modal | ⬜ | |
| 10 · T3 cancel | ⬜ | |
| 11 · Approver flow (T4/T5) | ⬜ | |
| 12 · `In Implementation` + file upload | ⬜ | |
| 13 · T6 + final decision + signature history | ⬜ | |
| 14 · File download | ⬜ | |
| 15 · Admin user management | ⬜ | |
| 16 · Activity-gated refresh | ⬜ | |
| 17 · Inactivity popup | ⬜ | |

---

## Checkpoints

*One entry per completed step. What was built, and — more importantly — what was
verified. "Confirmed in psql that untouched fields were unchanged" is worth more
than "Save Draft works."*

<!--
### ✅ Step N — <name>

**Built:** …

**Verified:**
- …
- …

**Notes:** anything the next session needs and cannot read from the code.
-->

### ✅ Step 1 — Scaffold + `global.css`

**Built:** SvelteKit scaffold (`bunx sv create`, sv 0.17.0, minimal + TypeScript,
Bun). `adapter-static` with `fallback: 'index.html'`. Root `+layout.ts`
(`ssr = false`, `prerender = false`). `docs/prototypes/global.css` copied to
`src/lib/global.css` and imported once in the root `+layout.svelte`, alongside
the Bootstrap Icons stylesheet. A throwaway `+page.svelte` holding the sidebar
and one card, verbatim from `owner/dashboard-cc-owner.html`.

**Verified:**
- **B12's open question is closed: `global.css` works unchanged inside a Svelte
  component.** Compared side by side in the browser against
  `owner/dashboard-cc-owner.html` — sidebar width and height, the two-tone
  header, the indigo logo bar, nav link colours, the card's padding and radius,
  the `In Implementation` and `Initiated` badges, the eye icons, and typography
  all match. **Descendant selectors survived** `app.html`'s
  `<div style="display: contents">` wrapper
- The Bootstrap Icons glyphs render as glyphs, not boxes — decision 1 works from
  a bundled font with no network call
- Content differs only where the proof page is deliberately partial: it copies
  the sidebar, page header and one card, so the Action Required and Overview
  sections are absent. No styling difference anywhere
- `bun run build` succeeds; `build/index.html` exists and no routes are
  prerendered, which is what `fallback` plus `prerender = false` should produce
- `bootstrap-icons.mSm7cUeB.woff2` is fingerprinted into
  `build/_app/immutable/assets/` — the font is bundled, nothing calls the CDN
- `cmp` confirms `src/lib/global.css` is byte-identical to the `docs/` original,
  all 1808 lines

**Notes for the next session:**
- **There is no `svelte.config.js`.** SvelteKit 2.63 + Vite 8 put kit config
  inside `vite.config.ts`, as options to the `sveltekit()` plugin. The adapter
  and its `fallback` live there. Do not go looking for the old file.
- The scaffold set `compilerOptions.runes: true` for everything outside
  `node_modules`. **Kept deliberately** — it enforces B2's runes-only rule at the
  compiler rather than by convention, so a stray `export let` fails the build
  instead of silently working.
- `app.html` wraps the app in `<div style="display: contents">`. `global.css` has
  no `body > *` or `:root >` selectors, so this should be harmless — that is
  precisely what the browser check tests.
- `global.css` contains no `url()`, `@import`, `@font-face` or `src:`, and
  `docs/prototypes/` holds no image or font files. Moving the file could not
  break a relative asset path. `--font-family-base` names `"Inter"` but never
  loads it, so both the prototype and the app fall back to `system-ui` equally —
  a font import is not the fix if typography ever differs.

### 🔶 Step 2 — `types.ts` (fixes awaiting re-check)

**Built:** `src/lib/types.ts` — the whole of `openapi.yaml`'s `components/schemas`
plus the two list endpoints' query parameters. 14 enums as `as const` arrays with
unions derived from them; read/write shapes split.

**Verified so far:**
- A scratchpad script diffs `types.ts` against `openapi.yaml`: enum members in
  order, property names **both** directions, `nullable: true` ↔ `| null`,
  `required` ↔ `?`, en-dashes in string literals, inline path schemas, and query
  parameter names. Clean at `ChangeControlResponse` 55 / `SaveDraftRequest` 24 /
  `SaveImplementationRequest` 5 / `CreateChangeControlResponse` 11
- The param check was **negative-tested** — reverting `active` to `is_active`
  makes it fail, so it is not silently passing
- `bun run check` — 166 files, 0 errors, 0 warnings
- **Lain read the whole file line by line.** That is what found the first six
  defects below; no automated check would have caught any of them, because
  `types.ts` matched the spec and *the spec was wrong*
- **A second, independent review read `types.ts` against the Go handlers rather
  than against the spec.** It found five more — three of which were also spec
  defects (7–9). **This is the pass that matters**: the first read compared the
  code to the contract, the second compared both to the implementation, and only
  the second could find a comment that was true of the spec and false of the API
- `bun run check` again after both rounds — 166 files, 0 errors, 0 warnings, and
  `docs/openapi.yaml` still parses under PyYAML

**Still to verify:** all eleven `types.ts` fixes. The script and `bun run check` pass, but
neither can tell whether the new shapes match the API — only steps 3 and 5 do.
**Findings 4 and 5 of the second round are the two that will bite at runtime**
(silent limit clamping, and the RFC 3339 write format) and neither is provable
before step 7b.

**Method note for future steps:** eight of the eleven `types.ts` findings were
*comments and descriptions*, not types — statements about behaviour that no compiler, schema
validator or diff script can check. The transcription checker was clean
throughout. **Read the handler, not the spec**, whenever a comment makes a claim
about what the API does.

**Note:** the script lives in the session scratchpad, not the repo. If it is worth
keeping, that is a decision to take deliberately — it needs `pyyaml`, which is not
a project dependency.

### ✅ Step 3 — Login + auth store + `api.ts`

**Built:**
- **`src/lib/auth.svelte.ts`**: a `$state` store holding `user: MeResponse`, `accessToken` (memory only) and `endedReason`, plus `getRefreshToken`, `startSession` and `endSession`. It is the only module that touches `localStorage`, and it has no runtime imports.
- **`src/lib/api.ts`**:
  - `send`: one fetch. It attaches a bearer only when given a token, and has no 401 logic.
  - `toResult`: turns a response into `ApiResult<T>`.
  - `login`, `refresh`, `revoke`: unauthenticated.
  - `request<T>`: authenticated, with the A1.2 refresh-and-retry.
- **`src/routes/login/+page.svelte`**: `owner/login.html`, ported without the Remember-me row.
- **`PUBLIC_API_URL`**: `.env` (gitignored) and `.env.example`.

Import direction: page → `api.ts` → `auth.svelte.ts` → `types.ts` (type-only imports). There is no cycle.

**Verified (Lain):**
- **The A1.2 exemption.** A wrong password, with a stale refresh token planted in `localStorage`, gave OPTIONS 204 and `POST /login` 401. The correct attempt then gave 200. **No `/refresh` anywhere**
- Login lands on `/`, the step-1 throwaway page (flag 2)
- `localStorage` holds only `ea-qms.refresh_token`. psql: the token prefix matches, `expires_at` = `created_on` + 24 h, and `revoked_at` is null. sessionStorage holds only SvelteKit's own scroll/snapshot keys, so the plan's "empty" was the wrong expectation, not a code fault. The one cookie belongs to a browser extension
- **`X-Instance-ID` is readable from JavaScript** (`'emicon'`), which confirms BACKEND_CHANGES §3's CORS expose
- A deactivated viewer sees `Account is deactivated`, not `Incorrect email or password`. The viewer was restored afterwards
- **The 401 path**, run from the console after a reload: `GET /me` 401 → `POST /refresh` 200 → `GET /me` 200. The result was `{ok: true}` with exactly `MeResponse`'s four fields
- **A failed e-signature never enters the retry.** `POST /decision` on CC-008 with a wrong password produced one 401 and no `/refresh`. The caller got `{ok: false, status: 401, error: 'Invalid credentials'}`. There was no redirect, `localStorage` was intact, the state was unchanged, and **exactly one** new `SignatureFailed` row was written
- `bun run check`: 170 files, 0 errors. `bun run build` succeeds. `openapi.yaml` still parses under PyYAML after defects 12–13

- **`revoke()`**: `POST /revoke` gave 204, the `localStorage` key was removed, and psql shows `revoked_at` set. **A second call sent no request.** `getRefreshToken()` returns null and `revoke()` returns before `send()`, so the blank-token 400 can't happen
- **The retry-then-signature branch** (flag 11, now closed). Lain signed in as approver, reloaded to drop the access token, and repeated check 9 on CC-008:
  - `POST /decision` 401: no bearer header, so `middlewareAuth` rejected it
  - `POST /refresh` 200
  - `POST /decision` 401 `Invalid credentials`

  The caller got `{ok: false, status: 401, error: 'Invalid credentials'}`. There was no redirect and the session stayed intact. CC-008's `SignatureFailed` count went from 1 to 2: two HTTP attempts wrote **one row**, because the first attempt never reached the handler. The retry's 401 correctly did not end the session

**Not verified:**
- Check 7, the 30 s deadline probe, was skipped. See flag 10

**Notes for the next session:**
- `revoke()` owns A1.4's ordering, so step 4's logout button just calls it and navigates
- Step 4's silent refresh on load reuses `refresh()` and handles its outcome itself. `refresh()` writes nothing to the store
- `request()` has no `FormData` branch yet (that comes at step 12) and no blob path (step 14). Both are absent deliberately
- Vite's dev server allows `await import('/src/lib/api.ts')` from the browser console. That is how `api.ts` was exercised before any screen called it

---

## Decisions

*Numbered, with reasoning and the rejected alternative. Reversals are recorded as
new rows that say what changed and why — the original stays.*

| # | Decision | Reasoning |
|---|---|---|
| 1 | **Bootstrap Icons bundled via `bun add bootstrap-icons`**, its stylesheet imported in the root layout | The prototypes load it from jsDelivr and use 225 `<i class="bi bi-*">` tags across ~20 glyphs; `global.css` styles them (`.sidebar .logo i`). No document mentioned the icon font at all. **Rejected the CDN `<link>`** — B12 already lists CDN-loaded assets as a known problem, and icons would vanish offline. **Rejected deferring** — `.sidebar .logo i` is part of what step 1 must prove |
| 2 | **Step 1's `+page.svelte` is throwaway**, deleted at step 4 | The step's deliverable is a browser comparison, which needs prototype markup on screen. Step 4 builds the real authenticated layout and `/` becomes a redirect. Recorded so it is deleted rather than grown |
| 3 | **Favicon as a plain `<link>` in `app.html`**, asset moved to `static/favicon.svg` | The scaffold used `<svelte:head>`, and B4 forbids special elements. `app.html` is the document shell, not a component, so a plain `<link>` involves no special element. Uses `%sveltekit.assets%` so it survives being served from a sub-path. **Rejected keeping `<svelte:head>`** — a forbidden construct in the first file written sets the wrong precedent |
| 4 | **Enums are `as const` arrays with unions derived** — `export const REQUIRES_TESTING = [...] as const` then `type RequiresTesting = (typeof REQUIRES_TESTING)[number]` | The derived type is identical to B6's hand-written union, and step 7b's selects iterate the array instead of retyping the strings — so the six ASCII-hyphen values exist in **one** place and trap 1 can only be reintroduced by editing `types.ts`. All 14 get it, including read-only ones, so there is no rule about which are arrays. **Rejected pure type-only unions** (B6's literal form): it compiles to nothing, but the hyphenated strings would be retyped in the form markup, which is exactly where the trap bites. Cost accepted: `types.ts` emits runtime JS |
| 5 | **Interface names follow `openapi.yaml`, not B6** — `ChangeControlResponse`, `ErrorResponse`, `ValidationErrorResponse` | One mechanical rule: every name is a schema name in the spec, so any type is greppable in the contract. B6 names only three of ~30 differently. **Rejected B6's names** — a three-entry translation table in the reader's head, for no gain. B6 and `.claude/rules/api.md` both need amending (below) |
| 6 | **Dates and times are plain `string`**, not a branded alias | `format: date-time` has no runtime meaning; `type DateTime = string` buys no safety and adds a concept the blueprint never introduces. The constraints live in comments on the five fields that carry them |
| 7 | **`FileUploadResponse` is an alias of `FileRef`** | The spec defines two schemas with identical properties. Aliasing says they are the same thing; if the API diverges it becomes its own interface |
| 8 | **`GET /users` filter: fixed the spec to `active`, not the handler to `is_active`** | The handler reads `q.Get("active")` (`handlers_users.go:188`) and the Postman collection exercises `?active=true` in three requests — so `active` is the shipped, tested behaviour and the spec was the transcription error. This is CLAUDE.md's precedence rule applied literally. **Rejected changing the Go handler**: a code change to an API declared complete, breaking three Postman requests and any other consumer, to fix a naming inconsistency. **Rejected accepting both names** — two names for one filter is a worse contract than either alone |
| 9 | **No `RevokeRequest` alias** — `POST /revoke`'s discoverability handled by a comment on `RefreshRequest` instead | The alias was offered and declined. `openapi.yaml:1054` points `/revoke` at the `RefreshRequest` schema, so `RevokeRequest` is **not a schema name in the spec** — adding it breaks decision 5's one rule, that every name here is greppable in the contract, and buys an identical type under a second name. The stated goal was "so the revoke endpoint appears in the file"; the comment achieves that, and also records the two things `api.ts` needs at step 3 and could not get from a type — that revoke sends **no** `Authorization` header, and that local state is cleared on **any** outcome including a network failure. **Rejected the alias**: a translation-table entry for zero type safety |
| 10 | **Login errors render in `.esig-error show`** | The prototype has no error element. `.esig-error` is an existing `global.css` class, used by the e-signature modals, so no new CSS is needed. **Rejected plain unstyled text**: it looks unfinished beside the rest of the form |
| 11 | **"Remember me" and "Forgot password?" are dropped** | Neither has anything behind it in the API. There is no reset endpoint, the session lifetime is fixed server-side, and `forgot-password.html` doesn't exist even among the prototypes. B12 drops unsupported list controls on the same precedent. **Rejected porting them as inert controls**, because controls that do nothing mislead |
| 12 | **On the 401 path, the session ends only on a 401 or 400 from `/refresh`, or when no token is stored.** A network error or a 500 from the refresh is returned to the caller, and the session stands | Those failures say nothing about the token, which may still be perfectly valid. **Rejected reading A1.2 literally** ("failure → logout"): a Wi-Fi blip or a service restart would throw away a valid 24-hour session. A1.2, B7 and the rule file are amended |
| 13 | **Refresh and retry only on a 401 whose body is `Unauthorized`.** `Account is deactivated` ends the session without a refresh. Every other 401 goes to the caller untouched, and the retry's response gets the same rule | **The audit trail is the decisive reason.** All five signed transitions return 401 `Invalid credentials` for a failed e-signature, and each attempt writes a `SignatureFailed` row outside the transaction. A retry on status alone would turn one failed attempt into **two rows in a regulated record**, so the wrapper would be falsifying it. It would also log the user out for a typo. A sweep of every 401 in the Go found that `middlewareAuth` sends only those two strings. **Rejected a no-retry flag on the transitions**: the signature modal is exactly where a token expires while the user is still typing, and a flag is one more allowlist to forget. Matching on prose fails safe, and flag 7 records what would remove the coupling |
| 14 | **The exemption for the auth endpoints is structural, not a path list** | `send()` has no 401 logic, and attaches a bearer only when it is handed a token. `login`, `refresh` and `revoke` pass `null`. Only `request()` has the retry, so nothing has to be kept in sync when an endpoint is added. **Rejected matching paths inside one wrapper**, an allowlist that fails silently when someone forgets it |
| 15 | **Calls return `ApiResult<T>` instead of throwing.** The shape is `{ok: true, data}` or `{ok: false, status, error: ErrorBody}`, with `status: 0` when no response arrived | TypeScript forces an `ok` check before `data` is reachable, which matches B3's explicit `loading`/`error` state. There is no try/catch at every call site, and no error class: B4 forbids class-based state, and `ApiError` is the pre-step-2 name (B6). **Rejected throwing** |
| 16 | **`endedReason` on the auth store carries A1.7's message to the login screen.** It is one field more than B8 lists | **Rejected `/login?reason=`**: that is user-editable text rendered on the sign-in page, and it would survive a reload |
| 17 | **`revoke()` clears local state itself, before the call.** `login()` and `refresh()` touch nothing | A1.4's ordering *is* the rule, so it lives in one place where step 4's logout button can't get it wrong. `revoke()` returns `void`, because nothing the server says changes what the tab does next. **Rejected a pure `revoke(token)`**, which would leave the ordering to each caller |
| 18 | **No 204 guard in `toResult`.** A comment says why | A sweep confirmed `/revoke` as the API's only non-preflight 204, and it bypasses `toResult`. A guard would need `data: undefined as T`, a cast that lies to every caller about `T`. A future 204 endpoint should get an explicit `ApiResult<void>` path |
| 19 | **`PUBLIC_API_URL` comes from `$env/static/public`.** `.env.example` is committed and `.env` is gitignored | The value is inlined at build time, and a missing variable fails the build. **Rejected `$env/dynamic/public`**: it needs a runtime env file, which this static SPA doesn't serve. The cost is that pointing at a different API means rebuilding |

---

## Flags

*Known, deliberately deferred, with the reason. **A flag is not a defect** — keep
the two apart, or the real problems get lost among the accepted trade-offs.*

| # | Flag | Status |
|---|---|---|
| 1 | **Five copies of `global.css` now exist** — `docs/prototypes/` plus `owner/`, `approver/`, `admin/`, plus `src/lib/`. Every prototype links it as `href="global.css"`, relative to itself, so all three role folders rendered unstyled until a copy sat beside them. **`docs/prototypes/global.css` is canonical; the other four must stay in step.** All five verified identical at step 1 (md5 `8115796f`, 1808 lines) | Accepted. Re-check they match whenever any copy is touched. The alternative — rewriting ~35 prototypes to `href="../global.css"` and keeping one copy — was not done: the prototypes are the visual authority and editing them for the port's convenience is the wrong direction |
| 2 | `src/routes/+page.svelte` is throwaway proof markup (decision 2) | **Delete at step 4**, when the real authenticated layout lands and `/` becomes a redirect |
| 3 | **`README.md` is the untouched `sv` boilerplate** — titled "sv", tells the reader to run `npx sv create`, and gives `npm install` / `npm run dev` / `npm run build` in three places. The project is Bun-only, so **every command in it is wrong**. Only line 18 is true: it records the actual `bun x sv@0.17.0 create --template minimal --types ts --install bun .` | Deferred to **~step 5**, when there is a running app to describe rather than a shell. **Keep line 18's invocation** when it is rewritten — it is the evidence behind the first document correction below |
| 4 | ~~`docs/openapi.yaml` here has diverged from the backend's copy~~ **Closed 2026-09-11.** Lain diffed the two copies first. Every difference was one of the eleven fixes, and nothing existed only on the backend side. Lain then copied this file over the backend's, committed it there, rebuilt `server.exe` and restarted the Windows service. Verified at `localhost:1304/docs`: `/refresh`'s 401 cause table, the `active` parameter, and the three new schemas. ⚠️ **Defects 12 and 13 (step 3) put the two copies apart again**, by two descriptions | Closed. 12 and 13 are **not worth a rebuild on their own**, so they go into the backend with its next rebuild, the same way |
| 5 | **Step 7b needs a date/time conversion helper, both directions.** `<input type="date">` reads and writes `YYYY-MM-DD`; every date *write* field on the API takes RFC 3339 (`"2026-09-01T00:00:00Z"`) and rejects the bare date with a 400. `<input type="time">` is `HH:MM`; the TIME fields round-trip as `"0000-01-01T09:00:00Z"`. So **four functions**: date→input, input→date, time→input, input→time, each mapping `null` ↔ `''` — because `null` clears a field and `''` is a parse error. Five fields need it: the four in `SaveDraftRequest`, plus `actual_implementation_date` in `SaveImplementationRequest` at step 12 | **Deferred to 7b**, where the bindings land and it can be tested. Recorded now because the failure is invisible until then: TypeScript types all five as `string`, so the wrong format compiles cleanly and 400s at runtime. **The list filters are the exception** — `created_after` / `created_before` take `YYYY-MM-DD` and must NOT go through the helper |
| 6 | **`file:line` references go stale whenever the backend changes.** A1 was audited *after* the six backend changes and still cited `main.go:96-98` for routes that had moved to 130-132. So this is a class of problem, not one instance. Step 3 fixed A1's by naming the function instead: "`middlewareAuth`'s `is_active` check", not `middleware.go:69`. **Not yet swept:** `types.ts`, the rest of Part A, `openapi.yaml`, `.claude/rules/` | Deferred. When swept, replace a reference with the function name wherever it names something stable. Keep `file:line` in this file's historical entries, where it records evidence as it stood at the time |
| 7 | **`request()` branches on 401 message *strings*.** It retries only on `Unauthorized` and ends the session on `Account is deactivated` (step 3). The coupling to `middlewareAuth`'s wording fails safe: if the wording changes, the retry stops firing and an expired token shows as an error, never as a wrongful logout. **What would remove it:** a machine-readable error code on error responses | Deferred. It changes a completed API. If it is ever done, `request()` switches to the code and its two message constants are deleted |
| 8 | **Concurrent refreshes are not deduplicated.** Two parallel 401s fire two `/refresh` calls | Harmless while refresh tokens are not rotated, since both calls succeed. Revisit only if step 5's Network tab shows duplicate refreshes |
| 9 | **`X-Instance-ID` is readable but not captured** | Check 4 proved it is exposed, but nothing needs it until a screen shows A8.2's generic 500 message. Add it to `ApiResult`'s failure branch then, not before |
| 10 | ⚠️ **BACKEND_CHANGES §6 is probably wrong: a timeout most likely reaches the browser as a network error, not a 500.** This is inferred from how `net/http` works, not observed. `WriteTimeout`'s connection deadline starts when the headers are read. `middlewareLogging`'s 30 s context starts slightly later, so the write deadline passes first and the handler's 500 can't be flushed. The server **log** still says 500, because `responseRecorder` records the status the handler attempted. That is probably where §6's claim came from | **Unverified, because check 7 was skipped.** `api.ts` handles both outcomes (status 0 and 500). To prove it: run `BEGIN; LOCK TABLE users IN ACCESS EXCLUSIVE MODE;` in psql, sign in, watch the Network tab at about 30 s, then `ROLLBACK;`. If confirmed, amend §6 |
| 11 | ~~`request()`'s retry-then-signature branch has not run~~ **Closed at step 3.** After a reload on CC-008: `/decision` 401 (no bearer) → `/refresh` 200 → `/decision` 401 `Invalid credentials`. The error was returned to the caller, the session was kept, and one `SignatureFailed` row was written. See the step 3 checkpoint | Closed |

---

## Document corrections needed

*Where the code and a guardrail document disagreed, and which was wrong. If a
document was wrong, it needs amending — otherwise the next reader "corrects" the
code back.*

> **What the `ValidationErrorResponse` defect showed about the precedence rule.**
> CLAUDE.md says `.claude/rules/` files are extracts, and that a rule
> disagreeing with the blueprint means **the rule is stale and the blueprint is
> right**. Here the rule and the blueprint **agreed** — and both were wrong,
> because the rule was a faithful extract of a blueprint sentence that had never
> been checked against the handlers. Precedence resolves *disagreements*; it
> cannot detect an error propagated intact from one document into another. The
> spec had the same sentence, so all three tiers agreed.
>
> **Only the Go source breaks that kind of tie.** CLAUDE.md already says to read
> the handler before believing the spec — the same applies to the blueprint and
> to the rules, and agreement between documents is not corroboration when one was
> copied from the other.

| Document | What is wrong | |
|---|---|---|
| `FRONTEND_BLUEPRINT.md` B9, step 1 | Says `bun create svelte@latest`. What was actually run is `bunx sv create . --template minimal --types ts --no-add-ons` (sv 0.17.0), which the CLI reports non-interactively as `bun x sv@0.17.0 create --template minimal --types ts --install bun .`. **The blueprint's form was never tried**, so we cannot say it is dead — only that `sv` is what worked | Amend to the `sv` form |
| `FRONTEND_BLUEPRINT.md` B2 | The stack table is **silent on an icon font**, while saying "no UI library". The prototypes depend on Bootstrap Icons for 225 tags across ~20 glyphs, so the omission turned a lookup into decision 1 | Add a Styling row: `global.css` **and** a bundled Bootstrap Icons |
| `FRONTEND_BLUEPRINT.md` B2 / B5 | Both imply a `svelte.config.js` (B5's tree shows `+layout.ts` for `ssr = false`, and B2 names the adapter). The current scaffold has **no `svelte.config.js`** — kit config is passed to the `sveltekit()` plugin in `vite.config.ts`. `+layout.ts` is unaffected and still correct | Note the file location |
| `FRONTEND_BLUEPRINT.md` B6 · `.claude/rules/api.md` | Both name the read type `ChangeControl` and the errors `ApiError` / `ValidationError`. The code uses the spec's `ChangeControlResponse` / `ErrorResponse` / `ValidationErrorResponse` — decision 5. **The rule file matters more than the blueprint here**: it loads at write time, so it will pull step 3 back toward `ApiError` unless amended | **Both done** — see the two ✅ rows below. Rule file rewritten to spec names throughout; B6 carries a translation table |
| ✅ `.claude/rules/api.md` — two defects, plus the A1.4 error in a later round | Its `ErrorBody` was a **two**-member union, reintroducing the `blocked_cc_ids` gap it warned about four lines later; and it said `issues` "comes from the transitions" — defect 8. Both sat in the file that loads at **write time**, so step 3's `api.ts` would have been written against them | **Fixed.** Three-member union with the two-independent-`in`-checks pattern spelled out, spec names throughout, and a "Where `issues` actually comes from" heading naming the four endpoints. Its **Dates** section was already correct and was left alone |
| ✅ `FRONTEND_BLUEPRINT.md` **A8.1** — the source of the rule file's defect | Said the `issues` shape "comes from the transitions". **This is where `.claude/rules/api.md` got it**, which is the point of the precedence rule failing here: CLAUDE.md says a stale rule loses to the blueprint, but the blueprint held the same error, so following precedence would have *confirmed* the wrong answer rather than catching it | **Fixed.** Narrowed to the two save endpoints plus T2/T6, with the design reason stated so it is not "corrected" back, and a closing line: render every item when there is one, but do not write a transition caller that expects one |
| ✅ `FRONTEND_BLUEPRINT.md` **A9** — restructured after a third finding | **A9's blanket claims were the defect, not any single fact.** "Sort is fixed at `last_updated_on DESC`" is true of `GET /changecontrols` **only**: `users.sql:22` and `:32` both `ORDER BY full_name` — **ascending**, the opposite direction — so `GET /users` and `GET /approvers` sort alphabetically. `ListApprovers` has **no `LIMIT` at all** (`users.sql:29-32`), so none of A9's pagination applies to it. My own added line, "**both** list responses echo `limit` back", carried the same assumption — that there are two list endpoints. **There are four.** Lain checked the SQL before flagging | **Fixed by restructuring, not patching.** New **A9.0** table — four endpoints × sort × paginated — that must be read before applying anything else; A9.1 retitled to name the two paginated endpoints; A9.2 splits filters by endpoint. A flat bullet list is what let three blanket claims sit unnoticed |
| ⤷ found while fixing it: a **fourth** list endpoint | `GET /changecontrols/{ccID}/signatures` — `esignatures.sql:10`, `ORDER BY signed_on ASC`, **no `LIMIT`**. Chronological and uncapped, so the old blanket sort claim was wrong for it too. Relevant at **step 13**: the panel must render oldest-first and must not reverse | In the A9.0 table, and on `SignatureListResponse` in `types.ts` |
| ⤷ found while fixing it: A9 was **silent on `?active=`** | A9 listed `owner`, `assigned`, `state`, `search` — all change-control params — and omitted the users list's only filter, which is the one carrying the naming trap (spec defect 5). A reader building step 15 from A9 alone would not have known the parameter existed, let alone that `?is_active=` fails silently | Added to A9.2 under `GET /users`, with the silent-ignore consequence spelled out. `created_after` / `created_before` and their `YYYY-MM-DD` format added to the change-control group at the same time — A9 had never mentioned them either |
| ✅ `types.ts` — the sort and pagination facts now sit where they are read | The SQL is the only place these were recorded. Steps 6, 13 and 15 read `types.ts`, not `users.sql` | Sort direction on both `*ListParams`, each naming the other's opposite direction; **not paginated** plus sort on `ListApproversResponse` and `SignatureListResponse` |
| ⤷ the round before: A9's **missing** limit ceiling | The predicted defect — "A9 states a 100 limit" — **was not there.** A9 stated **no maximum at all**; the ceiling and the clamping were simply absent. But it did say "use `total` for the page count", which is where the silent clamp bites: `Math.ceil(total / limit)` from the *requested* limit is wrong the moment the server caps it, with no error anywhere | **Fixed** — the 200 ceiling, the clamp-not-reject behaviour, and the rule to compute the page count from the **response's** `limit`. Now in **A9.1**. Relevant at **step 6** |
| ✅ **A1 audited against `handlers_auth.go`, `middleware.go`, `main.go` and the refresh-token SQL** — before step 3, which is built on it | **Every number in A1.1 and A1.2 is correct** and is now confirmed rather than assumed: `accessTokenTTL = 30 * time.Minute`, `refreshTokenTTL = 24 * time.Hour`, `refreshInactivityWindow = 2 * time.Hour` (`handlers_auth.go:19-21`); 24 min really is 80% of 30; `/refresh` returns `{token}` only, so **not rotated** is right; `expires_at` is written once at login and never updated, so the absolute expiry genuinely does not move. A1.3 is right — all three auth endpoints are mounted **without** `middlewareAuth` (`main.go:96-98`). **Two claims were wrong and three things were missing** — below | A1.2 and A1.4 corrected in place; **A1.4a, A1.6, A1.7, A1.8 added**. Same corrections pushed into `.claude/rules/api.md`, which had inherited the A1.4 error |
| ⤷ **defect · A1.4 "logging out never fails"** | False at the one case a client actually produces. `/revoke` is 204 for every *token* state — valid, already revoked, never existed (`RevokeRefreshToken` carries `AND revoked_at IS NULL`, so a second call updates nothing and still succeeds). **But a blank or missing `refresh_token` is a 400** (`handlers_auth.go:120-130`): the body is validated before the token is ever looked up. So logging out with empty `localStorage` — already logged out, storage cleared, fresh browser — **400s** | A1.4 rewritten with the rule for step 3: **call `/revoke` only when a token is present; clear local state unconditionally and *before* the call.** Local state is what ends the session; the call only stops the token being reused elsewhere |
| ⤷ **defect · A1.2's 401 flow had no exemption** | `request → 401 → refresh → retry` is correct for authenticated requests and wrong for the three that are not. `/login`, `/refresh` and `/revoke` bypass the auth middleware and 401 for their **own** reasons. Applied literally, **a mistyped password fires a refresh** against whatever stale token `localStorage` holds, and the user gets logged out instead of "incorrect email or password" | Exemption added to A1.2 — from the 401 path **and** from the bearer header — and to the rule file. **This one would have shipped**: it produces a plausible-looking logout, not an error |
| ⤷ **gap · deactivation is immediate** (new A1.6) | A1 never mentioned it. `middlewareAuth` re-reads the user and checks `is_active` on **every** authenticated request (`middleware.go:69`), and `/refresh` checks again (`:85`). A valid access token does **not** keep a deactivated user working for up to 30 minutes — the assumption anyone would make from A1 as written | Matters at **step 15**: deactivating a user takes effect on their next action, with no client-side work needed |
| ⤷ **gap · a 401 has three meanings** (new A1.7) | `Invalid refresh token` · `Session expired` · `Account is deactivated`. A1 said only "failure → logout". All three do log out, but the third is **not fixable by signing in again** — showing "your session expired" sends a deactivated user into a login loop against an account that will keep rejecting them | A1.7 is a three-row table with what to tell the user. **Carry the message from the failed refresh into the login screen** rather than discarding it |
| ⤷ **gap · logout ends one session** (new A1.4a) | `HandlerLogin` inserts a new refresh-token row every time and **never revokes prior ones** (`handlers_auth.go:216-232`). Two browsers leave two live tokens; `/revoke` kills only the one in the body. There is no sign-out-everywhere | Recorded so the UI does not imply otherwise. Deactivation (A1.6) is the only thing that stops every session at once |
| ⤷ **gap · only `/refresh` advances the window** (new A1.8) | `TouchRefreshToken` is called in **exactly one place** (`handlers_auth.go:92`) and nowhere else. **Ordinary API calls do not slide the 2-hour window** — ninety minutes of saving drafts moves `updated_on` not at all. A1.2's activity gating was already right, but read as tidiness; it is in fact the *entire* mechanism by which an abandoned tab dies, because the refresh is the only signal the server gets | Stated explicitly, with the corollary that the window is measured from the **last refresh**, not the last request |
| ⤷ **checked and found correct** — recorded so it is not re-investigated | `handlers_auth.go:68` uses `time.Since(row.UpdatedOn)` where line 64 uses `time.Now().UTC().After(...)` — an inconsistency that looks like a timezone bug. It is not: `refresh_tokens.updated_on` is **`TIMESTAMPTZ`** (`sql/schema/006_refresh_tokens.sql:7`), so the driver returns an absolute instant and `time.Since` computes the correct duration whatever the server's zone | No change. **A1 was right and the code is right** |
| ⚠️ **`openapi.yaml` — two more defects, 10 and 11**, both in the auth section | **10:** `/refresh`'s 401 example was `{ error: Invalid or expired refresh token }` — **a message the API never sends**, and its description omitted deactivation entirely. **11:** `/revoke`'s "Logging out should never fail" is the sentence that propagated into A1.4 and the rule file, while `400` sat listed three lines below it | Both fixed: the 401 now carries the three-row cause table and a real example; `/revoke` says idempotent *across every token state* and calls out the 400. `/login`'s 401 was already correct — "Wrong credentials, or the account is deactivated" |
| ⚠️ **`openapi.yaml` — defects 12 and 13**, found at step 3 by sweeping every 401 in the Go | **12:** the shared `Unauthorized` response said only "Missing, malformed or expired access token". It left out `Account is deactivated`, which `middlewareAuth` sends on **any** authenticated route. That is one of the two strings `request()` branches on, so the spec did not document the contract the client now depends on. **13:** `/refresh`'s 401 table left out `Unauthorized`, which `HandlerRefresh` sends when the token's user no longer exists | Both fixed in this copy. **Not yet in the backend's copy** (flag 4) |
| ⚠️ **`openapi.yaml` was right about all four list endpoints** — the inversion of the previous two rounds | The spec already said `last_updated_on DESC` for change controls, "Sorted by full name" for `/users`, "sorted by name" for `/approvers`, and "**Oldest first**, uncapped" for signatures — and it correctly omits `limit`/`offset` from the two unpaginated endpoints. **The blueprint was the only document wrong this round** | **No spec change.** Recorded because it cuts against the working assumption built up over rounds one and two — the spec is not reliably the weakest document, and "check the spec" is not a substitute for checking the SQL or the handler |
| ✅ `FRONTEND_BLUEPRINT.md` **B6 / B7** — same two-member union, found while fixing A8.1 | B6's code block defined `ErrorBody` with two members and B7 said "parse **both** error shapes". Neither was in the brief; both are the same defect as the rule file's, at its source. A8.3 documents `blocked_cc_ids` in prose two pages earlier, which is exactly what makes the omission read as covered | **Fixed.** Three-member union in B6 with both `in` checks shown and the trap named; B7 now says all three and "two independent checks, not a chain" |
| ✅ `FRONTEND_BLUEPRINT.md` B6 — decision 5's naming, now recorded in the document | The row above had been outstanding since round one. Fixing B6's union meant writing spec names into a section that still said `ApiError` three lines up, so leaving it would have made B6 internally inconsistent | **Fully applied.** B6's interface declaration and its two-interfaces-per-resource line now read `ChangeControlResponse`; `.claude/rules/api.md`'s read/write example did too and was fixed with them. The table at the end of B6 stays as a **record of the rename** — relabelled "Was, before step 2 / Is", since B6 no longer uses the old names anywhere. Sweep confirms no bare `ChangeControl`, `ApiError` or `ValidationError` outside that table |
| **`openapi.yaml` — eleven defects, all fixed in this copy** | **1–6** found by Lain reading `types.ts` line by line. **7–9** by a second review reading `types.ts` against the handlers. **10–11** by the A1 audit, both in the auth section — see that row below. Each confirmed in Go before being changed. `types.ts` had transcribed 1–9 faithfully — the spec was wrong, not the transcription | **All eleven also need applying to the backend's canonical copy** — flag 4 |
| ⤷ 1 · unquoted `Yes`/`No` | `ExpectedDowntime` and `RequiresTraining` had bare `Yes`/`No`. YAML 1.1 resolves those to booleans, so the members vanish for any 1.1 parser (PyYAML, Go `yaml.v2`). Someone had already quoted `"No"` in two places and missed `Yes` in both. Values confirmed against `CC_Field_Reference.md:61,63` | Quoted, with a description saying why. Swept the whole file — these were the only two |
| ⤷ 2 · `UserResponse` merged three shapes | The Go handlers build **four** distinct structs: `GetMe` returns 4 fields (no `is_active`, no timestamp), create/list return `created_on`, both PUTs return `updated_on`. The spec had one type carrying **both** timestamps, so `user.created_on` after a status change was typed-but-`undefined` | Split into `MeResponse` / `UserResponse` / `UserStatusResponse`; the four endpoint `$ref`s repointed |
| ⤷ 3 · `ListApproversResponse` missing | `GET /approvers` defined its response **inline** rather than as a named schema, so a `components/schemas` transcription skipped it entirely. `api.ts` needs it at step 3 | Added as a named schema. The checker now fails on **any** inline path schema — the class of bug, not the instance. Only one other existed: the multipart upload body, which needs no interface |
| ⤷ 4 · `CreateChangeControlResponse` short by two | Go returns 11 fields; the spec defined 9, missing `last_updated_by_id` / `_name`. Its own description said "the eight fields" while listing nine | Both fields added, description corrected to eleven |
| ⤷ 5 · `is_active` was the wrong param name | The handler reads `q.Get("active")` (`handlers_users.go:188`). An unrecognised query param is **ignored silently**, so `?is_active=true` returns every user with no error — the worst failure mode available | Spec and `types.ts` changed to `active`, per decision 8, with the mismatch documented in both. The checker now diffs query param names and was negative-tested against this exact bug |
| ⤷ 6 · `GET /me` over-specified | Listed as returning `UserResponse` (7 fields); the handler returns 4. This is the shape the auth store holds at step 3, so `auth.user.is_active` would have been typed-but-`undefined` | New `MeResponse`, and `/me` repointed at it |
| ⤷ 7 · password failures said "returned together" | Read naturally as an `issues` array. `handlers_users.go:78-82` **joins** `validatePassword`'s slice with `strings.Join(problems, ", ")` into the single `error` string — a plain `ErrorResponse`. A create-user form iterating `issues` would have rendered nothing | Both the spec description and the `CreateUserRequest.password` comment now say **joined into `error`, no `issues` array**, with the wording of a real message |
| ⤷ 8 · `ValidationErrorResponse` claimed "the transition endpoints" | Only **T2 and T6** collect issues; cancel, decision and final-decision fail on the first problem. Confirmed by which handlers declare a `validationErrorResponse` struct — `handlers_workflow.go:22` and `:862`, and nowhere else in that file | **Comment narrowed, nothing else changed** — the split is correct design and was recorded as such: T3/T4/T5/T7/T8 validate a small request body the user just typed, T2/T6 validate stored state across twenty-odd fields. Same fix in the spec |
| ⤷ 9 · `limit` maximum wrong **and** the clamping undocumented | Spec said `maximum: 100`; `helpers.go:23` has `maxPageLimit = 200`. Worse, `helpers.go:98-99` **clamps** — `limit=500` returns 200 rows with `200 OK` and no indication of the cap. Only `limit < 1` or a non-integer is a 400 | `maximum: 200` in the spec, with a description saying it marks the clamp point rather than a validation boundary; the `types.ts` header now says **read `limit` back off the response** before computing "page N of M" |
| **`types.ts` only — two more from the same review** | Not spec defects; the spec was right and the transcription dropped something | |
| ⤷ `ErrorBody` excluded `BlockedRoleChangeResponse` | The interface existed but was not in the union, so `blocked_cc_ids` from the 409 on `PUT /users/{id}` and `/active` was unreachable without a cast — in the one place where the message must say the whole request was rejected | Three-way union. The two discriminating keys are disjoint, so `'issues' in err` and `'blocked_cc_ids' in err` narrow as independent checks and `ErrorResponse` is what remains |
| ⤷ **the date write format was never carried across** | ⚠️ **The one that would have cost a day.** The spec's `info` section does say all dates are RFC 3339 and that `2026-10-15` is not accepted — but `types.ts` said only "clear with `null`, not `''`", so the more likely error went unmentioned. `handlers_cc.go:764-768` and `:1428` unmarshal into `*time.Time`, so `"2026-09-01"` — **exactly what `<input type="date">` produces** — 400s identically to `''`. Meanwhile `handlers_cc.go:373,383` parse the list filters with layout `2006-01-02` and reject a timestamp. Two formats in one file, in opposite directions, with nothing in either document putting them side by side | Comments made explicit at all seven sites — the four in `SaveDraftRequest`, `actual_implementation_date` in `SaveImplementationRequest`, and `created_after` / `created_before` — each naming the *other* format so the contrast is visible from either end. **Flag 5** carries the conversion helper to step 7b |
| ✅ **`FRONTEND_BLUEPRINT.md` A1.2: the exemption list was incomplete** (step 3) | It exempted `/login`, `/refresh` and `/revoke`, and stopped there. **All five signed transitions also return 401**: `Invalid credentials`, for a failed e-signature. Applied as written, the rule logs a user out for mistyping a signature password, and it writes two `SignatureFailed` rows for one attempt. That is the same class of defect as the login case the A1 audit found. **The A1 audit missed it because A1 was checked against the auth files, and this 401 lives in the workflow handlers** | **Fixed.** A1.2's flow now branches on the response body (decision 13) and applies decision 12 to refresh failures. B7, A7.3 ("safe when the *user* retries") and the rule file are amended to match. **Lesson for rule 7:** a claim about *every* response with a given status code has to be checked against every handler that sends that status, not just the section's own file list |
| ✅ `FRONTEND_BLUEPRINT.md` A1.7: a fourth refresh 401 | `HandlerRefresh` also sends `Unauthorized` when the token's user no longer exists | Row added. The case is unreachable through the API, which has no delete-user endpoint |
| ✅ `FRONTEND_BLUEPRINT.md` A1: stale line references | Five `file:line` citations predated the backend changes. For example, it cited `main.go:96-98` for routes that are now at 130-132 | Replaced with function names. The wider problem is flag 6 |
| ✅ `.claude/rules/api.md`: "parse **both** error shapes" | This line survived the step-2 fix of the same file. It sat three bullets above the three-member union it contradicts, and the file loads at write time | Now says "all three", with the two independent `in` checks |
| ✅ **A12 audited: the trap is narrower than stated** | A12, B11 and CLAUDE.md trap 6 all said a request from a misconfigured origin "reaches the server and executes", so "a write can succeed while the client sees a network error". **That is true only of simple requests.** `middlewareCORS` answers a disallowed origin's preflight with 204 and **no** `Access-Control-Allow-Origin`, so the browser never sends the real request. A request that carries `Authorization` or a JSON `Content-Type` is always preflighted. The only requests that skip the preflight are a GET or a multipart upload **sent with no token**, and `middlewareAuth` rejects those before any handler runs. So nothing the app sends from a disallowed origin executes. ⚠️ An earlier draft of this finding said "every request is preflighted". That was wrong, since check 6's first call was a token-less GET, but the conclusion survives the correction. Reasoned from `middlewareCORS` and the Fetch spec's preflight rules, and **not observed** with a wrong `ALLOWED_ORIGINS` | **A12, B11 and trap 6 amended.** What stays true, and is kept in all three: status 0 on a write doesn't prove nothing happened, because a connection dropped after the commit looks the same. That is a network problem, not a CORS one |
| `BACKEND_CHANGES.md` §6 | Probably wrong about the 500, but unproven. See flag 10 | Amend if check 7 is run and confirms it |

---

## Carried over from the backend phase

Things already known that the frontend has to respect. Do not re-derive these.

| | |
|---|---|
| **API** | Complete. 23 endpoints, unchanged during this build |
| **Enum values** | ASCII hyphens, not en-dashes. Take them from `docs/openapi.yaml` |
| **Save then submit** | Transitions carry no field values; Submit is disabled while dirty |
| **`openapi.yaml`** | Hand-written from the handler code — a transcription, so **not infallible**. If a response disagrees, check the Go handler and fix the spec. **Thirteen defects found so far**: six at step 2, three more on a second reading of the same file, two in the A1 audit, and two in step 3's sweep of every 401 — so treat this as a live warning, not a formality. **The count keeps rising because the checking keeps going**, not because the spec is unusually bad |
| **The backend source is on disk** | `../ea-qms-backend` — `handlers_*.go`, `sql/queries/`, `sql/schema/`, `constants.go`, `middleware.go`, `main.go`. The real authority; every finding so far was confirmed against it rather than assumed. **Read the handler before believing the spec.** Now also in `CLAUDE.md`, which loads every session — `PROGRESS.md` alone was the wrong place for it |
| **Rule 7 — verify before each step** | `CLAUDE.md` carries the **section map**: which Part A sections each step depends on, and which Go files to check them against. Corrections go into `.claude/rules/` too, since that is what loads at write time — the blueprint does not |
| **Why rule 7 exists** — the evidence, kept here so `CLAUDE.md` can stay at the instruction | **Part A has been checked in patches, not as a whole.** What has been checked produced **thirteen `openapi.yaml` defects** and **three blueprint claims that would have shipped**: A1.4's "logging out never fails", A1.2's missing 401 exemption, and, at step 3, the same exemption's missing e-signature case. The rest of Part A is unverified prose **that reads exactly as confidently as the parts that were wrong.** Nothing found so far was an obvious error; three were *omissions*, which skimming cannot surface — hence "check each claim", not "review the section" |
| **Audit status of Part A** | ✅ **A1** (step 3, plus the e-signature 401 found while building it), **A8** and **A9** done. ✅ **A12** was audited before step 3, and amended there: the trap is narrower than stated (see the corrections table). ⬜ **A2/A3** (step 7), **A6** (12, 14), **A7** (9, 12), **A10** (5, 15) and **A11** are outstanding. **A13 deliberately excluded** — it summarises what other sections state, so auditing it re-checks claims through a second document instead of against the Go |
| **Two rationales trimmed from `CLAUDE.md`'s map** | **A6** — it claims the PDF type is verified by inspecting the file's bytes, so check `file_sanitizer.go`, not just `handlers_files.go`; that is where the claim lives or fails. **A12** — it claims a blocked request still reaches the server *and executes*. Verify before relying on it: it decides whether a failed write needs re-checking in psql, or can be assumed not to have happened. **Resolved at step 3:** a CORS block never executes a write, but status 0 on a write can still hide a commit, through a dropped connection rather than CORS. See the corrections table |
| **`src/lib/types.ts` outranks the spec** | For shapes, nullability, enum values and field-level traps — it is the most verified document here. **Not** for flow, auth lifetime or handler internals, where it is silent rather than brief. In `CLAUDE.md`'s precedence list at position 1, below the Go itself |
| **Untested** | ~~`global.css` inside a Svelte component~~ — **proven at step 1** · the activity-gated refresh (step 16), still open |
