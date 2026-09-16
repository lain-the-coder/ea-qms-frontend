# Frontend — Progress

Read this at the start of every session. Update it at the end of every build step,
once the step has been verified.

⚠️ **New decisions and flags APPEND TO THE END of their own table, ascending.**
Inserting one above an existing row costs a reorder — three of them in one step
is what prompted this line.

---

## Status

**Current step:** 8b, the `In Implementation` slice and its save. **Verified, awaiting commit.** Next: step 9 (T2 submit + the e-signature modal)
**Last verified:** Step 8b. A one-key implementation save left four fields holding real values untouched, so the partial body is proven against data that could have been clobbered rather than against nulls. Three implementation saves wrote **no** `audit_logs` row, which confirms BRD SC-5 in the database and closes the finding I had wrongly framed as a compliance gap. See the checkpoint

| Step | | Verified by |
|---|---|---|
| 1 · Scaffold + `global.css` | ✅ | Lain — browser side-by-side |
| 2 · `types.ts` | 🔶 | Two review passes. Lain's line-by-line read found **six**; an independent review against the Go handlers found **five more**. All **eleven `types.ts` findings** fixed; **the fixes themselves are not yet verified**, except `MeResponse` (defect 6): step 3 confirmed that `GET /me` returns exactly its four fields. ⚠️ Nine of those eleven were also `openapi.yaml` defects — and the running spec-defect total is *separately* eleven, after the A1 audit added two. **Two different elevens.** Spec defects are numbered 1–11 in the corrections table; `types.ts` findings are not numbered |
| 3 · Login + auth store + `api.ts` | ✅ | Lain: browser, Network tab and psql. Eight of nine checks were run and passed, then `revoke()` and the retry-then-signature branch. Check 7, the optional timeout probe, was skipped |
| 4 · Authenticated layout | ✅ | Lain: browser, Network tab and psql. Ten of eleven checks passed. The API-down check was skipped (flag 12) |
| 5 · Dashboard | ✅ | Lain: browser, Network tab and psql, across all four roles. Checks 1–8 passed; check 9 (optional) was skipped |
| 6 · All + My Change Controls | ✅ | Lain: browser, Network tab and psql, across all four roles. **All thirteen checks passed**, the optional one included |
| 7a · CC form, read-only | ✅ | Lain: browser, Network tab and psql. 11 of 12 checks passed, one only partly (Approver and Viewer not opened separately). The optional rename check was skipped. **The timezone check passed** |
| 7a+ · Create | ✅ | Lain: browser, Network tab and psql, across all four roles. **All eight checks passed**, plus `bun run check` and `bun run build` |
| 7b · Bind the fields | ✅ | Lain: browser, Network tab and psql. Checks 1–7 passed (7 with Approver only, not Viewer or Admin). The optional flag-26 check was skipped. `bun run check` and `bun run build` pass |
| 7c · Save Draft | ✅ | Lain: browser, Network tab, psql and Postman. Checks 1–12 passed; check 13 (the 409, optional) was skipped. `bun run check` and `bun run build` pass |
| 7d · Dirty tracking | ✅ | Lain: browser, Network tab, console and psql. Checks 1–9 passed, including both required checks (3 and 5). Check 10 was my `bun run check` and `bun run build`. Optional check 11 (flag 34) was skipped |
| 7d+ · Navigation guard | ✅ | Lain: browser, Network tab under throttling, console and psql. Checks 1–7 passed, check 3 on its second, corrected setup. Optional check 8 (the 409) was skipped. `bun run check` and `bun run build` pass |
| 8a · Permissions by identity + the approver's gates | ✅ | Lain: browser and psql, across all four roles and five states. **All ten checks passed**, plus three re-checks after the document sweep. `bun run check` and `bun run build` pass |
| 8b · `In Implementation` + its save | ✅ | Lain: browser, Network tab and psql. **Eleven of twelve checks passed**; check 8 (the 409) was skipped. Checks 1 and 3 were run together against fields holding real values. `bun run check` and `bun run build` pass |
| 9 · T2 submit + e-signature modal | ⬜ | |
| 10 · T3 cancel | ⬜ | |
| 11 · Approver flow (T4/T5) | ⬜ | |
| 12 · File upload | ⬜ | Narrowed at 8a: the save half moved to 8b |
| 13 · T6 + final decision | ⬜ | The signature history moved to 7a (decision 49) |
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

### ✅ Step 4 — Authenticated layout

**Built:**
- **`src/routes/(app)/+layout.svelte`** holds three things:
  - the prototype sidebar, with B5's hrefs and `active` from `$derived(page.url.pathname)`
  - a content area gated on `auth.user`
  - `restore()`, which runs `/refresh` and then `GET /me` once, on mount
- **`(app)/dashboard/+page.svelte`**: a placeholder showing only the page header. Step 5 replaces it.
- **`(app)/settings/+page.svelte`**: Settings → Profile, with end-user and Admin variants, holding Sign Out.
- **`src/routes/+page.svelte`**: the step-1 proof markup is deleted, and `/` now redirects to `/dashboard`. This closes flag 2.
- **`api.ts`**: new `isTokenVerdict(status)`, shared by `request()` and `restore()`.
- The login page now goes to `/dashboard` instead of `/`.

**Verified (Lain):**
- Signing in as owner lands on `/dashboard`, showing "Welcome back, Default CC Owner", with Dashboard active.
- **A hard reload** sends one `POST /refresh` (200), then `GET /me` (200). There is no visit to `/login` and no flash of the login form. psql shows `updated_on` advanced on that token.
- With no stored token, reloading `/settings` goes to `/login` with **no `/refresh` request** and no message. This proves the blank-token guard.
- **Each A1.7 message arrives through the restore:**
  - a revoked token gives "Your session ended"
  - `updated_on` set 3 h back gives "Your session expired"
  - a deactivated viewer gives the deactivated message; the viewer was restored afterwards
- **Sign Out** gives `POST /revoke` 204, an empty `localStorage` and `revoked_at` set.
  - **The console was clean**, which proves the `auth.user!` assertion in the pages: Svelte removes the page before it re-reads the store. The only console error came from the browser extension, as at step 3.
  - Back then lands on `/login` with no `/refresh`.
- Admin sees the User Management tab; owner and viewer do not. All roles see the same five links.
- **Throttled to Slow 4G:** the sidebar appears, then "Loading…", then the dashboard. About 2 s of blank screen came first, while the Vite dev server shipped modules, before any app code ran; it is not the layout.
- `/` redirects to `/dashboard`, and Back does not return to `/`.
- `bun run check`: 176 files, 0 errors. `bun run build` succeeds.

**Not verified:**
- **The load-failure branch and Retry.** The API-down check was skipped (flag 12).
- **`request()`'s refresh-failure branch since the `isTokenVerdict` swap** (flag 13). The restore's use of the predicate *was* exercised, by the revoked, expired and deactivated checks. `request()`'s use was not.

**Notes for the next session:**
- **SvelteKit 2.63 types `page.url.pathname` as the union of the routes that exist.** Comparing it against a route that isn't built yet fails `bun run check`. The layout declares `const path: string` to avoid this. That widens the type; it is not a cast.
- **Pages under `(app)` may assume `auth.user` is set.** The layout mounts them only once it is, and check 8 proved they are removed before it is cleared. Both pages use `const user = $derived(auth.user!)`.
- Step 5 replaces the dashboard placeholder. Its mount fetch cannot run before the restore finishes.
- Step 5 renders "+ Create Change Control" for the CC Owner. The button stays unwired until 7a+ (decision 27).
- `isTokenVerdict` is for `/refresh` responses only. A 400 from anywhere else is a validation error.

### ✅ Step 5 — Dashboard

**Built:**
- **`(app)/dashboard/+page.svelte`**: ported from the three dashboard prototypes, and filled by one `GET /dashboard` through `onMount` (decision 30). The Viewer, who has no prototype, gets the Admin layout.
- **`(app)/+layout.svelte`**: the restore moved from `$effect` to `onMount`, with no change in behaviour (decision 30).
- **Documents, in the same commit as the code:**
  - B3, B4 and `.claude/rules/svelte.md`: the `onMount` rule.
  - A9.2, A10 and a `types.ts` comment: the `pending_approvals` defect.
  - A10: the system-wide and ordering gaps.

**Verified (Lain):**
- **Owner:** the page matches `owner/dashboard-cc-owner.html` side by side, with exactly one `GET /dashboard`. **A hard reload gives `/refresh`, then `/me`, then `/dashboard`**, so the `onMount` switch kept the restore intact, and the page waits for it.
- **Overview** read 2/2/3/1/2 and matched psql exactly. psql shows 2 Cancelled, and the cards omit it.
- **The cap, on My Drafts:** CC-013 was created through the console. My Drafts then showed **3 over two rows** (CC-013, CC-010), and CC-009 dropped off. `Untitled` rendered for the null title, in both My Drafts and Recent Activity.
- **The cap, on Pending Approvals** (approver): `pending_approvals_total` read 3 over two rows, and psql independently returns 3. **This is the defect below, observed on the card where it matters.** Both gates appeared in one card with the short labels: CC-001 "Final Approval" and CC-008 "Implementation Approval". There was no Create button, and My Drafts read 0.
- **Recent Activity:** five rows, `last_updated_on DESC`, matching the API response exactly.
  - CC-002 shows "Default Approver" as the updater, which confirms A11's note that the updater is not always the owner.
  - `2026-09-02T20:57` rendered as "2 Sept 2026, 8:57 PM", converted correctly.
- **Viewer and Admin:** zeros and empty states, and no Create button. **Overview and Recent Activity were identical to the approver's**, so the system-wide blocks do not vary by role.
- **The `onMount` rule, proven:**
  - Setting `auth.accessToken = 'x'` from the console sent **no request**.
  - Navigating away and back then gave `GET /dashboard` 401, `/refresh` 200, `GET /dashboard` 200.

  So a remount refetches and a token change does not. This is also the first time `request()`'s refresh-*success* path ran from a real page.
- **Stat-card hrefs** read `?state=Pending+Implementation+Approval`, `?state=Pending+Final+Approval` and `?state=In+Implementation`.
- `bun run check`: 176 files, 0 errors, 0 warnings. `bun run build` succeeds.
- `HandlerCreateChangeControl` reads no request body. That was confirmed in the Go before check 3's body-less POST was run.

**Not verified:**
- Check 9, which was optional, was skipped. So **flags 12 and 13 stay open**, and the page's own error branch has not run (flag 12 now covers it).
- **The Recent Activity empty state cannot be reached** while any change control exists. It is ported, not tested.

**Notes for the next session:**
- **Step 6 needs all three of the page's helpers**: `BADGE`, `formatDateTime` and `stateHref`. Whether they move to `lib/` is flag 22.
- **The stat cards encode spaces as `+`.** Step 6's `$derived(page.url.searchParams.get('state'))` should decode them back to a space. Confirm this in step 6's first check.
- CC-013 now exists: the owner's draft, with every field null.
- Chrome's `en-GB` writes September as "Sept". This is noted, and it is not a defect.
- The Create button is a disabled placeholder. 7a+ owes three changes (flag 23).

### ✅ Step 6 — All Change Controls and My Change Controls

**Built:**
- **`src/lib/components/ChangeControlList.svelte`** — the whole screen, mounted
  at two URLs (decision 29). The first component in the build.
- **`(app)/change-controls/+page.svelte`** and **`(app)/my-change-controls/+page.svelte`** —
  9 and 11 lines. The second passes `ownerPreset`.
- **`src/lib/format.ts`** — `BADGE` and `formatDateTime` moved off the dashboard
  (flag 22). `stateHref` stayed: still one caller.
- **Documents, in the same commit as the code:** B3, the SvelteKit subset and
  `.claude/rules/svelte.md` (the `onMount` + `afterNavigate` pairing, and the
  `state` shadowing trap); A9.1 and A9.2; `types.ts` on `owner`, `assigned` and
  `search`.

**Verified (Lain) — all thirteen checks:**
- **Step 5's open `+` question is closed.** The Pending Approval stat card sends
  `?state=Pending+Implementation+Approval&limit=20` and gets **200, not 400** —
  `URLSearchParams` writes `+`, Go's `url.Values` decodes it back to a space.
- **A hard reload on `/change-controls`** gives `/refresh` → `/me` →
  `/changecontrols` and the table renders. **This is the check that would have
  failed on the approved plan** — see the correction below.
- **State then `created_after`:** one request each, `offset` absent from the URL
  both times. **Back twice moved the controls and the table together** — the
  `$derived` + navigation proof, and the one check a plain `let` fails while
  passing every other check on this list.
- **Search:** one request ~300 ms after typing stops, the caret stays put, and a
  single Back leaves the whole search rather than walking back per keystroke.
  CC-ID, title and owner-name fragments each match — **three columns confirmed
  against the SQL**.
- **Pagination:** per page 10 gives `Showing 1–10 of N`; Next sends `offset=10`;
  changing State on page 2 dropped `offset` and landed on page 1 (A9.1's reset).
- `total` matched psql with a filter applied.
- **`/my-change-controls`:** every owner is the caller, no Ownership control, and
  hand-editing `?owner=<another user's uuid>` left the request sending
  `owner=me` with the list unchanged. **The silent-no-op defence works.**
- **The three hand-edited 400s** each render the API's own message, and
  `?limit=abc&state=Bogus` shows **only** the limit error — pagination parses
  first.
- **`?limit=500`:** `200 OK`, response `limit` 200, and the per-page select
  showed a fourth option reading 200. The silent clamp is now visible.
- Empty states keep the filter bar and a working Clear Filters. An approver on
  `/my-change-controls` gets the unfiltered message and no Create button.
- Create for the CC Owner only, on both routes; the same eight columns for all
  four roles. The dashboard is unchanged after the helper move.
- **Flag 12, all three branches, in one outage** (check 13): service stopped and
  a filter changed → header and filter bar stayed, table replaced by "Could not
  reach the server"; service restarted and a filter changed → **the table
  returned with no reload**, which is `lastQuery = null` on failure doing its
  job; reloading during the outage → the layout's error and Retry with the
  sidebar still rendered.
- `bun run check`: 182 files, 0 errors, 0 warnings. `bun run build` succeeds.

**Notes for the next session:**
- **`ChangeControlListResponse`** is the type name, not `ListChangeControlsResponse`.
  The latter is the Go struct; `types.ts` follows the spec (decision 5).
- The eye links go to `/change-controls/{cc_id}` — **`cc_id`, the business key,
  not `id`**. Step 7a owns that route.
- `stateHref` is still on the dashboard. If step 11 or 13 needs a second caller,
  move it to `format.ts` then.
- The list sends `limit=20` on **every** request, including the first. The API's
  own default is 50, so an absent `limit` would not have matched the select.

### ✅ Step 7a — The CC form, read-only

**Built:**
- **`(app)/change-controls/[ccId]/+page.svelte`**: the one form for every state and every role (B5), ported from `owner/cc-form-closed.html`.
  - **The 34 fields the Security Matrix can enable are real controls.** Each takes `disabled` from `editable()`, which returns false (decision 48).
  - **The 13 system fields are `.meta-value` text.**
  - **`required()` adds an asterisk** only where `editable()` and the next transition's `MANDATORY` set agree, so 7a shows none (decision 58).
- **Signature History**, moved in from step 13 (decision 49). It is a parallel `GET …/signatures` with its own error branch.
- **The fetch** runs on `onMount` + `afterNavigate`, deduplicated on `ccId`, with a sequence counter.
- **Documents, in the same commit:**
  - B9 (the 7a and 13 rows), a new A5.5, A10's CC-form note and A11.
  - `types.ts`: defect 16, the two leftover-rejection comments and `last_updated_by_id`.
  - `openapi.yaml`: defect 16.
  - `.claude/rules/api.md`: the display rules.

**Verified (Lain): 11 of 12 checks, one of them partly:**
- ⚠️ **The timezone check, proving slicing over `new Date()`.** This is the one bug that cannot be seen from +04:00.
  - A San Francisco override on CC-007 moved Created On 11 hours (11:03 PM → 12:03 PM) and Last Updated from 1:15 PM to 2:15 AM.
  - **The three DATE inputs did not move:** 25 Oct, 20 Dec, 12 Aug.
- **TIME, observed live.** A5.2 is no longer inferred.
  - `PUT` set CC-014's windows to `0000-01-01T09:30:00Z` and `…11:00:00Z`, and `GET` returned them exactly.
  - The form shows 09:30 and 11:00, unmoved under the override.
- **Side by side with `owner/cc-form-closed.html`:**
  - The structure matches, `Yes - Partial testing` has an ASCII hyphen, and there are exactly two GETs.
  - Every value was cross-checked against the JSON. The T4 and T7 signature times equal the approval times, and the upload sits between T4 and T6.
- **Controls:** 0 enabled. 34 `.form-control`, or 35 on CC-003 and CC-006.
- **CC-014, every optional field null:**
  - Every control is empty, the system fields show `—`, and both statuses read Not Submitted.
  - "No file uploaded" and "No signatures yet" appear.
  - `innerText.includes('null')` is false.
- **Signatures:**
  - CC-005 shows eight rows in order with the right pills; CC-007 shows four.
  - psql agrees: `T2>T5>T2>T4>T6>T8>T6>T7` and `T2>T4>T6>T7`.
- **Evidence:** `GIFT.pdf · 138.4 KB · Uploaded 15 Aug 2026, 11:06 PM`, and not clickable.
- **Cancelled, CC-003 and CC-006:**
  - The badge and banner are red, both statuses read N/A, and there is one red T3 row.
  - Cancellation Reason matches psql. It is absent on CC-007.
- **Not found:** `/change-controls/CC-999` shows "Change Control not found", and Back to List works.
- **Hard reload:** `/refresh` → `/me` → CC → signatures.
- **The header gap** is correct on CC-014 and CC-007, and no label ends in `*`.
- **Tooling:** `bun run check` gives 184 files, 0 errors, 0 warnings. `bun run build` succeeds, and `openapi.yaml` parses.

**Not verified:**
- **Check 11, partly.** Admin matched the owner; Approver and Viewer were not opened separately. `editable()` is unconditional, so the code path is identical. Step 8 is where the roles diverge, and they must be checked there.
- **Check 12 was skipped.** Live-join vs snapshot names after a rename is reasoned from the SQL, not observed (flag 29).
- **The leftover rejection values and defect 16** cannot be shown on seeded data (flag 28).

**Notes for the next session:**
- **CC-005 is the record rejected at both gates**, not CC-007.
- **CC-014 now has window times 09:30–11:00** (check 6). 7a+ creates fresh all-null records for 7b–7d.
- **`editable(_field)` takes only the field.** The role, the state and the ownership come from component scope. `MANDATORY` is confirmed against the Go. Step 8 changes only `editable()`'s body.
- **`dateInput`, `timeInput`, `dateTimeOrDash`, `formatFileSize` and `SIGNATURE_CLASS` are inline in the page**, one caller each. 7b adds flag 5's write direction beside the first two.
- **`.page-header` has no bottom margin.** The prototypes' gap comes from the banner that always follows it, so the header is wrapped in `.page-header-with-action` (decision 54).

### ✅ Step 7a+ — Create

**Built:**
- **The Create button is wired in both files that render it**: the dashboard, and `ChangeControlList.svelte`, which serves `/change-controls` and `/my-change-controls`. Each has its own inline `create()`: `POST /changecontrols`, then `goto('/change-controls/' + cc_id)` (decision 59).
- A synchronous `creating` guard, `disabled={creating}` and a `Creating…` label.
- A separate `createError` in `.esig-error show` under the header row.
- No change to `api.ts`, `types.ts` or the `[ccId]` page.

**Rule 7, against the Go (all correct, nothing to amend):**
- `HandlerCreateChangeControl` reads no body. It inserts the CC and a `Created` audit row in one transaction and returns **201**.
- The route is `middlewareAuth(requireRole(roleCCOwner, …))`; a wrong role gets 403 `Forbidden`.
- **`CreateChangeControlResponse`'s eleven fields match the Go struct** by name and type. Only the declaration order differs. The schema defaults (`Initiated`, `Not Submitted` ×2) are members of `State` and `ApprovalStatus`, and `cc_id` is `GENERATED ALWAYS`.
- **`request()`'s retry cannot double-create.** An `Unauthorized` 401 comes only from `middlewareAuth`, before the handler runs.

**Verified (Lain): all eight checks:**
- **Dashboard:** one POST, **201** with eleven keys, landing on CC-016. Every control was empty, the state Initiated, both statuses Not Submitted, and there were no signatures. **Three requests in total:** the POST, then 7a's two GETs.
- **psql:** CC-016 is `Initiated` with a null title, and `change_owner_id = last_updated_by_id` is `t`. **Exactly one `Created` audit row.**
- **Back:** My Drafts shows CC-016 first, and its total went up.
- **`/change-controls` and `/my-change-controls`** each created one record.
- ⚠️ **Double-click:** triple-clicked on Slow 3G. **One POST, and the count went up by exactly one.**
- **Error path, with the service stopped:** the red error appeared under the header, the dashboard content stayed intact, the button went back to "Create Change Control", and the count was unchanged. After a restart, a click succeeded.
- ⚠️ **The 401 retry:** after `auth.accessToken = 'x'`, the sequence was POST 401 → `/refresh` 200 → POST 201 → 7a's two GETs. **The count went up by one, not two.**
- **Approver, Viewer and Admin:** no Create button on any of the three screens.
- `bun run check`: 184 files, 0 errors, 0 warnings. `bun run build` succeeds.

**Notes for the next session:**
- ⚠️ **The plan's check 7 was wrong.** "Reload, then click" does not force a 401: the reload runs the restore, which mints a fresh access token. Lain used `auth.accessToken = 'x'` instead, as at step 5. **To force the 401 path on any page, overwrite the token; never reload.** That earlier attempt created one extra record.
- **Change controls now run to CC-022, and CC-016 onward are all-null Initiated drafts owned by the owner.** They are 7b–7d's material (decision 27).
- `global.css` has no `.btn:disabled` rule. Any other `.btn` that is disabled during a request needs label feedback the same way.

### ✅ Step 7b — Bind the fields

**Built:**
- **`[ccId]/+page.svelte`**:
  - **Two objects** (decision 60). `cc` is the record; `form: DraftForm` holds the 24 draft fields as strings. `setRecord()` is the only assignment to either, and it always rebuilds `form` from `cc`.
  - **`editable()`'s first slice** (decision 61): Initiated, owner by id, `field in form`.
  - **24 `bind:value={form.…}`.** The ten other-state fields and `cancellation_reason` still read `value=` from `cc`.
  - **`GET /approvers`** as a third parallel request (decision 62), with `approverOptions()` for flag 26 and its own error line.
  - **`dateOutput` / `timeOutput`**, flag 5's write half, inline and uncalled (decision 63).
- **Documents, in the same commit:** defect 17 in seven places, including CLAUDE.md trap 5 (decision 64). Blueprint A3's four gaps, A5.2's `step` note, B6's two-object rule, and B9's 7b row. `api.md` carries the same.

**Rule 7 — A3 (first audit) and A5's write direction, against `HandlerSaveDraft`.** See the corrections table for the defect and the gaps. **Checked and found correct:**
- An absent key leaves the column unchanged: every param is seeded from the locked row.
- Unknown keys are collected, sorted, and rejected before the transaction opens, so nothing is written.
- Unchanged values write no audit row, so sending the whole form is safe.
- The four date and time fields are strict RFC 3339 through `*time.Time`. The two DATE audit rows store `YYYY-MM-DD`.
- `ListActiveCCIDsForUser` counts every state but Closed and Cancelled, so an Initiated record's assignee cannot be deactivated or role-changed.

**Verified (Lain): checks 1–7:**
- **Requests:** a hard reload on CC-016 as owner gave `/refresh` → `/me` → record, `/signatures`, `/approvers`. **Typing sent nothing.**
- **24 enabled of 34.**
- **20 asterisks**, none on Window Start, Window End, Comments for Approver or Comments. **`required()` was unchanged**; they appeared only because `editable()` turned on.
- **Every input type took input**: text, textarea, all six enum selects, a date, a time, the approver. A live `requires_testing` read `Yes - Partial testing` with `charCodeAt(4) === 45`, an ASCII hyphen. **After a reload everything was empty, and psql showed CC-016 still all-null.**
- **Approver options:** "Select Approver" then three approvers, matching psql in name and order. Each `value` is the UUID.
- **CC-014** showed 09:30 and 11:00, enabled and typeable. **Under the San Francisco override neither the times nor CC-007's dates moved**, so the 7a timezone proof holds through `toDraftForm`.
- **Each half of `editable()` failed on its own:**
  - Owner on CC-007: owner holds, state fails. 0 enabled, 0 asterisks, the select disabled on Default Approver.
  - Approver on CC-016: state holds, owner fails. 0 enabled, 0 asterisks, still three GETs.
- `bun run check`: 184 files, 0 errors, 0 warnings. `bun run build` succeeds.

**Not verified:**
- **Check 7 for Viewer and Admin.** The predicate is identical for every non-owner, and step 8 checks all roles anyway.
- **Check 8, skipped.** `approverOptions()`'s missing-assignee branch is reasoned, not observed.
- **That `form` and `cc` stay separate** was shown by reading `toDraftForm`, not behaviourally. 7d's revert-reads-clean check proves it.
- **`dateOutput` and `timeOutput` have no caller.** 7c's psql check is their proof.

**Notes for the next session:**
- **7c inherits four flags:** 31–34.
- **The approver select's "Select Approver" is `""`, which the API rejects** (defect 17). 7c's body must send `null` for it, as for the dates.
- **Three active approvers exist**, not one.
- **Step 8 restructures `editable()`**, see flag 27.

### ✅ Step 7c — Save Draft

**Built:**
- **`[ccId]/+page.svelte`**:
  - **A diff body** (decision 65). `draftChanges(form, cc)` compares each of the 24 against `toDraftForm(cc)`. `toWire` turns `''` into `null` and calls `dateOutput` / `timeOutput`. An empty diff sends nothing.
  - **A partial date or time blocks the save** (decision 66), through `validity.badInput` read with `getElementById` (decision 70).
  - **The lock is split from permission** (decision 67): `canSaveDraft()`, `mayEdit(field)` for `required()`, and `editable(field) = mayEdit && !saving`.
  - **`saveDraft()`**: a synchronous guard; a `latest` check so a response cannot land on another record; `setRecord` on 200; a refetch on 409 (decision 68); `cc` and `form` untouched otherwise.
  - **The action bar** (decision 69): Save Draft as a `<button>` that stays on the form, with the error or a timestamped "Saved …" hint beside it, and `style:margin-bottom="0"` on the error (decision 71).
  - **Beyond the plan:** `loadIfChanged()` clears the save message when the CC-ID changes, so CC-A's "Saved" cannot show on CC-B. It is not cleared in `load()`, because a 409's error must survive its reload.
- **Documents, in the same commit:** blueprint A2, A2.1, A3, A8.1, B3, B6 and B9; `api.md`, `svelte.md` and the `types.ts` Signatures header; CLAUDE.md trap 2. **`api.md`'s `paths` now cover the components that call the API**, which they had not since step 3. See the corrections table.

**Rule 7 — A2 (first audit) and the query behind A3**, against `HandlerSaveDraft`, `UpdateChangeControlDraft`, every `GetChangeControlForUpdate` call, both submit handlers and the five transition structs. The defect and gaps are in the corrections table. **Checked and found correct:**
- T2 and T6 bodies are `{email, password}` only, and both validate the row they locked. T2's 20 presence checks match `MANDATORY`.
- The business-day rules run at T2, in UTC. "Not in the future" runs at T6 only, and the implementation save has no such check. Evidence is checked at T6.
- The e-signature is checked **after** the presence checks, so a presence 400 writes no `SignatureFailed` row. For A7 at step 9.
- The seed covers **24 of 24** columns. The Go would compile with one missing, and that column would be nulled on every save that changed something else, so this is the fragile point.
- `sameTimePtr` compares instants with `Equal`, and text is compared after trimming.
- `openapi.yaml`'s three "no field values" sentences are each scoped to T2 or T6, and are correct.

**Verified (Lain): checks 1–12:**
- **A partial body on an all-null record:** the payload had exactly four keys, with the date as `2026-10-25T00:00:00Z`, the time as `0000-01-01T09:30:00Z` and the approver as a UUID. psql showed those four set and the other 20 null. **Exactly two `FieldUpdated` rows**, the date and the approver; the title and window time are unaudited. **This proves flag 5's write direction.**
- **Only Comments changed:** a one-key payload, check 1's values unchanged, and no new audit row.
- ⚠️ **Two tabs, the first counterexample:** B changed the date to 2026-10-26 and saved. A, not reloaded, changed Comments and saved. The payload was `comments` only, B's date survived, and A's form then showed 26/10 from the response. **There is one audit row for B's change, and no row reverting it.**
- **Clearing** the date and the approver: both null, with two audit rows whose `new_value` is null. `""` would have been a 400, so the 200 proves `toWire` sent `null`.
- **Flag 31, both halves:** the year deleted from a stored date, and day and month typed into an empty picker. No PUT either time, and the error named the field. Clearing a partial entry from an already-null date then gave "No changes to save", which is correct.
- **Empty diff:** no PUT with nothing changed, nor after typing and deleting a character.
- **Trim:** three spaces into an empty field sent `"   "` and got 200. psql showed the field still null, and **`last_updated_on` did not move**. The hint read "Saved 6:37 PM" beside a `last_updated_on` of 6:32, which is why the hint uses the client's clock. `Fix   ` was stored and shown as `Fix`.
- ⚠️ **An atomic 400:** a date change plus 2,001 characters in Comments gave "comments must be 2000 characters or fewer", and both edits stayed on screen. The date was unchanged and **no audit row was written**: the date's row was inserted and rolled back.
- **Lock:** during a slow save, 0 controls were enabled and **20 asterisks still showed**. A triple-click sent one PUT; the later clicks said "No changes to save", because the response had already rebuilt the form.
- **Network failure:** the status-0 message appeared, the edit stayed, and psql was unchanged. After a restart, Save without retyping gave 200 and the edit persisted.
- **401 retry:** `auth.accessToken = 'x'` then Save gave PUT 401, `/refresh` 200, PUT 200, and one change in psql.
- ⚠️ **TIME seconds, the second counterexample:** `implementation_window_end` was set to `0000-01-01T11:00:15Z` through Postman, and the input showed 11:00. With only Comments changed and saved, the payload was `comments` only, and **psql still shows `11:00:15`**.
- **The sticky-bar alignment** after decision 71: the error is level with the button.
- `bun run check`: 184 files, 0 errors, 0 warnings. `bun run build` succeeds.

**Not verified:**
- **Check 13, the 409, was skipped.** The refetch and the error surviving it are reasoned, not observed.
- **A save interrupted by navigation** (the `latest` guard) was not exercised.

**Notes for the next session:**
- **7d's dirty check is the same comparison as the body.** "Dirty" is `draftChanges(form, cc)` being non-empty, and decision 68 says what each outcome leaves behind. Whether 7d calls `draftChanges` is 7d's decision.
- ⚠️ **A partial date is not in the diff.** A dirty check built on the diff alone reads clean beside `25/10/`, so 7d has to decide whether `incompleteDateTimes()` counts as dirty.
- Create a fresh draft for 7d. The 7c record now holds values, including an `11:00:15` window end.

### ✅ Step 7d — Dirty tracking

**Built:**
- **`[ccId]/+page.svelte`**:
  - **`dirty`** (decision 72): a `$derived` over `draftChanges(form, cc)` being non-empty, **or** `incomplete` being non-empty.
  - **`incomplete`** (decision 73): a `$state` copy of `incompleteDateTimes()`, refreshed by `oninput` **and** `onkeyup` on the four date and time inputs. It is reset in `setRecord()`. `saveDraft()` still reads the DOM fresh at click time.
  - **The hint slot** (decisions 74 and 75): the error first, then "Unsaved changes" while dirty, then `saveNotice`. Save Draft keeps `disabled={saving}` only, and "No changes to save" stays.
  - **Step 9's gate is written in the doc comment on `dirty`.**
- **Documents, in the same commit:** blueprint A2's Consequence paragraph; `api.md`'s Saving section, where two overlapping partial-date bullets are merged into one; CLAUDE.md trap 2, in wording only. See the corrections table.

**No rule-7 audit.** 7d touches no endpoint. A2 was audited at 7c, and its finding (a submit ignores field values) is why the step exists.

**Verified (Lain): checks 1–9:**
- **Clean:** no hint. Save said "No changes to save", with no PUT.
- **Typing:** one character in Title gave "Unsaved changes" at once, with no request. Deleting it removed the hint and revealed the earlier "No changes to save", which is decision 75's ordering working.
- ⚠️ **`onkeyup`, proven on its own:** `25/10` typed with the keyboard into an empty picker gave the hint. Save named the field, with no PUT. After backspacing every segment, `validity.badInput` read false in the console, so `incomplete` cleared. The 7c error was still on screen and hid the hint (flag 42).
- **A stored date with its year deleted:** "Unsaved changes" appeared **before any click**, and Save blocked with no PUT.
- ⚠️ **`oninput`, proven on its own:** a date picked from the calendar popup with the mouse only, no keys pressed, gave the hint. **Both events are live, and both are needed.**
- **Save, type, undo:** `affected_systems_modules = "wwrt"` saved, and "Saved 22:37" showed. Typing replaced it with "Unsaved changes". Undoing brought back "Saved 22:37" with the same time. **psql: `last_updated_on` still 22:37:38**, so the typing wrote nothing.
- **A 400** (2,001 characters in Comments): the error outranked "Unsaved changes", and the edits stayed.
- **Other readers:** Approver on CC-024 and Owner on CC-007 saw no hint and no Save.
- **Navigation:** a partial date left on CC-024, then another draft opened, showed no hint.
- `bun run check`: 184 files, 0 errors, 0 warnings. `bun run build` succeeds.

**Not verified:**
- **Check 11, skipped:** flag 34's `\r\n` false-dirty is reasoned, not observed.
- **One browser only** (flag 41).
- **The recompute cost** is read from the Svelte runtime (`deriveds.js`), not measured.

**Notes for the next session:**
- ⚠️ **Step 9: Submit is refused, not `disabled`.** The doc comment on `dirty` is the checklist:
  - refuse synchronously before the modal opens if `saving`, `dirty`, or `incompleteDateTimes()` is non-empty (a fresh read, not `incomplete`)
  - check `dirty` again just before the POST, unless the open modal locks the form
  - the server validates its stored row, which can include another tab's save (flag 38)
- **Any future date or time input the owner can edit needs both events.** That means `actual_implementation_date` at step 12.
- **Step 8 does not touch `dirty`.** For every non-owner, `form` never changes, so it reads false.
- CC-024 is 7d's draft and now holds values.

### ✅ Step 7d+ — Navigation guard

**Built:**
- **`[ccId]/+page.svelte`**:
  - **`beforeNavigate`** (decisions 77 and 78). It returns early if `!dirty || auth.user === null`. For `leave` it only calls `cancel()`. For anything else it cancels unless `confirm('Leave this page? Your unsaved changes will be lost.')` returns true.
  - **`load()` clears `cc` and `form`** before its first `await` (decision 79). That fixes the 7c defect in the corrections table.
  - Two comments that said `setRecord()` is the only assignment are reworded.
- **Documents, in the same commit:**
  - B3's SvelteKit subset, regrouped by job, with `beforeNavigate` and a "Not used" line.
  - `.claude/rules/svelte.md`: two ⚠️ blocks, the guard and clearing before a load.

**No rule-7 audit.** No endpoint is involved. `client.js` (kit 2.70.3) was re-read instead, and flag 43's claims held, with two refinements. See the corrections table.

**Every `goto` in `src/` was swept.** Only `api.ts`'s `signOut()` can run while the form is mounted:
- The layout's restore runs before any page mounts.
- Settings, the lists, the dashboard, login and `/` are other routes.
- The form page has no `goto`, no `<form>` and no external link.

**Verified (Lain): checks 1–7:**
- **Sidebar link while dirty:** our `confirm()` appeared.
  - Cancel kept the form with its edit.
  - OK left, and returning showed the record without the unsaved text.
- **Back to List:** the same, both ways.
- ⚠️ **Same-document Back between records** (CC-023 → sidebar list → CC-024 row → `history.go(-2)`, throttled to 10 kb/s with 5000 ms latency):
  - It showed `confirm()`, not the native dialog.
  - Cancel kept CC-024 with its edit, with **no second prompt**.
  - OK gave "Loading…" with **no Save Draft and no hint** until CC-023's requests landed. **This is the 7c defect fix, exercised for the first time.**
- **F5 and tab close while dirty:** each showed Chrome's own dialog, and Cancel stayed.
- **`25/10/` in an empty date as the only change:** it prompted, so `incomplete` protects work the diff cannot see.
- ⚠️ **The sign-out trap:**
  - Setup: the owner's refresh tokens revoked in psql (103 rows), then `auth.accessToken = 'x'`.
  - Save Draft while dirty gave PUT 401 → `/refresh` 401 → `/login` with "Your session ended". **No prompt.**
  - It also ran `request()`'s refresh-failure branch, which closes flag 13.
- **A clean form never prompted**, before an edit or after a save.
- `bun run check`: 184 files, 0 errors, 0 warnings. `bun run build` succeeds.

**Not verified:**
- **Check 8, skipped:** the clearing on a 409's reload is reasoned only. The code path is the same as check 3's.
- **Chrome only** (flag 41's caveat applies).

⚠️ **Check 3's first run tested the wrong thing, and the setup was mine.** "Open two records in sequence" allowed CC-024 to be typed in the address bar. That made Back **cross-document**:
- The browser restored CC-023 from bfcache.
- No script ran and nothing was requested, so `load()` never ran.
- A Cancel under that setup would have met the `leave` branch, not `confirm()`.

The corrected setup is recorded above.

**Notes for the next session:**
- ⚠️ **Every sign-out must clear `auth.user` before it navigates.** Step 17's inactivity popup is next to add one.
- ⚠️ **Any `goto` added to the form page must be decided against the guard.** Watch T3's modal at step 10.
- **To test anything that must refetch on Back, stay in one document.** Use in-app links and `history.go(-n)`, never the address bar.
- **A page restored from bfcache shows the record as it was when left, with no refetch.** Not new: decision 65 already covers a long-open tab.

### ✅ Step 8a — Permissions by identity, and the approver's two gates

**Scope.** B9's step 8 was "the `Initiated` role views". Lain widened it to every
editable slice, then split it: **8a** is everything needing no new endpoint,
**8b** brings the `In Implementation` slice *and* its save together. The split
exists because making those five fields editable without a save would give the
owner live controls with no Save button, no "Unsaved changes" hint and no
navigation guard — the defect 7d+ exists to prevent, in a different state.
Step 12 keeps the upload alone.

**Built** — `[ccId]/+page.svelte` only, plus two files for `Untitled`:
- **`mayEdit()` switches on `cc.current_state`**, one arm per state, **no
  `default`** so the switch is exhaustive over `State`. The `In Implementation`
  arm returns false, naming 8b.
- **`isOwner()` / `isAssignedApprover()`** replace the inline ownership test.
- **Four objects over the record** (decision 80): `draftForm` (renamed from
  `form`), `implDecision` (3), `finalDecision` (2), and `implForm` at 8b. Only
  the first is dirty-tracked here.
- **`toWire` generalised**, keyed on `EditableField` over a five-entry
  `WIRE_FORMAT` table, and **one generic `changes<K>()`**, so `'' → null` and
  "changed" each exist once for both save bodies. Lain's catch: two copies is
  how the body and the dirty gate drift apart.
- **`FIELD_LABELS` (all 35) — the Go's own `problems` strings**, so our refusals
  and the server's `issues` read identically. `DATE_TIME_LABELS` is gone.
- **`SIGNATURE_NOT_BUILT` + `submitGate()`** and one handler per gate.
- **Flag 25, in full:** four info-banners (decision 54's deferral), the
  Implementation Details note, the Approvals notes (decision 84), fifteen
  placeholders (decision 81) and fifteen counters (decision 83).
- `saveError`/`saveNotice` → `actionError`/`actionNotice`.

**Documents, in the same commit:** blueprint A7 (A7.3–A7.5 amended, **A7.6 and
A7.7 added**), A10, A3 and B9; both rule files carry the same.

**Rule 7 — A7 audited for the first time, and A10's role notes**, against all
five transitions, `HandlerSaveImplementationDetails`, the five workflow queries,
`constants.go`, `main.go`'s route table and BRD SC-5. **Seven claims proved
correct** and are recorded in the corrections table so they are not
re-investigated; the defect and the gaps are there too.

**Verified (Lain): all ten checks, plus three re-checks after the sweep:**
- ⚠️ **Check 2 is the one the Security Matrix would have failed.** CC-004
  reassigned in psql to another approver, then opened as `approver@eaqms.local`:
  **0 enabled, 0 asterisks, no Submit Decision**, "Awaiting approval". Finding 1
  confirmed in the browser — authorisation is by assignment, not by role.
- **Assigned approver:** CC-008 gave 3 enabled / 3 asterisks / "Review required"
  / Submit Decision; CC-001 (Pending Final Approval) gave 2 and 2.
- **Owner on CC-002 (In Implementation):** 0 enabled, 0 asterisks, no Save Draft,
  banner and section note both correct — the 8b slice is inert, as intended.
- **Viewer and Admin across four records in four states:** 0 enabled, 0
  asterisks, only Back to List, every time.
- **Owner on CC-024:** 24 enabled, 20 asterisks, Save Draft — 7b–7d unchanged —
  plus the new "Before you submit" banner.
- **No banner promises a notification**, and each still reads as a complete
  sentence (flag 46).
- **Placeholders** present for the owner, absent for an approver on the same
  record. Success Criteria now has one.
- **The gate:** Decision Comments blank → the bar names the field, **no request**.
  All three filled → "Electronic signature is not built yet.", **still no
  request**.
- ⚠️ **Check 10, the in-flight window.** CC-008 → list → CC-001 by in-app links,
  then `history.go(-2)` under a custom throttle: while "Loading…" showed, the bar
  held **only Back to List**. **The 7c defect did not recur in three new
  objects** — `load()` clears all of them before its first `await`.
- **The Approvals notes** read correctly in Initiated, Pending Implementation
  Approval and In Implementation, both subsections.
- **The counter** appears at `161/200` on Change Title and reads
  `204 / 200 — 4 over the limit` past it. ⚠️ **200, not 2000** — the sweep of the
  Go is what got that right.
- **`Untitled` renders italic** on the list for CC-016…CC-022.
- `bun run check`: 184 files, 0 errors, 0 warnings. `bun run build` succeeds.

**Not verified:**
- **The leftover-rejection note** (decision 84's first branch). No record is in
  that state; flag 28 already carries it to step 11.
- **The counter on the three In Implementation fields.** They are in `LIMITS`
  but not editable until 8b.

**Notes for the next session:**
- ⚠️ **The Approvals gap was found by a sweep, not by a check.** Checks 1–8 all
  passed with five approval controls sitting unexplained, because every check
  counted enabled controls and asterisks — and the counts were right. Decision 56
  had promised those explanations and the plan did not carry them forward. **Same
  shape as the 7c defect: a check tests what was built, not what was left out.**
- ⚠️ **Lain's standing instruction, given during this step:** the BRD, the
  Security Matrix and the prototypes are **guides containing their author's
  mistakes, not scripture**. When following one produces something obviously
  wrong on screen, **raise it rather than complying silently** — Lain can
  override any of them. Decision 81 is the first exercise of this.
- **8b's checklist** is in the plan: `implForm`, `implChanges` via the shared
  `toWire`, `canSaveImplementation()`, the second `dirty` term,
  `DATE_TIME_FIELDS` gaining `actual_implementation_date` with **both**
  `oninput` and `onkeyup`, `load()` clearing `implForm` too, the evidence
  asterisk and its `.field-hint`, and Submit for Final Approval.
- ⚠️ **8b writes a third copy of the partial-date refusal wording**
  (`saveDraft`, `submitGate`, then `saveImplementation`). **That hits the
  three-copies threshold — propose the extraction to Lain, do not do it.**
- **Flag 45's count becomes 3 at 8b.** Check it with
  `grep -c "?? SIGNATURE_NOT_BUILT" "src/routes/(app)/change-controls/[ccId]/+page.svelte"`,
  never a search for the bare name. Flag 45 has the reason.

### ✅ Step 8b — The `In Implementation` slice and its save

**Built** — `[ccId]/+page.svelte` only:
- **`implForm`**, the fourth object and the second dirty-tracked one, keyed to
  `SaveImplementationRequest`'s five. `toImplForm` is a literal like the other
  three (decision 60); `implChanges` is **one line over the generic
  `changes()`**; `toWire` needed **no change at all**, because
  `actual_implementation_date` was already in `WIRE_FORMAT` from 8a. Nothing in
  the second save knows anything about dates.
- **`saveImplementation()`** against `PUT /changecontrols/{ccID}/implementation`,
  with decision 68's outcome table unchanged, and **one `saving` flag shared
  with `saveDraft()`** (decision 85).
- **`mayEdit`'s `In Implementation` arm**: `implForm`'s five, plus
  `implementation_evidence` named explicitly — the one arm whose slice is not a
  single object.
- **`incompleteMessage(verb)`** (decision 86), replacing both existing copies.
- **`submitForFinalApproval()`**, and one Save Draft button dispatching through
  `save()`.
- The three implementation counters and placeholders **lit up as a consequence
  of `mayEdit` turning true** — they were already in `LIMITS` and `PLACEHOLDERS`
  from 8a. `actual_implementation_date` joins `DATE_TIME_FIELDS` and carries
  both `oninput` and `onkeyup`.
- The Implementation Evidence label now carries its asterisk, with the
  prototype's `.field-hint` beneath it (decision 87).

**No rule-7 audit.** A3's second save endpoint and A7 were both audited at 8a,
against the very handler this step calls. Nothing new was read.

**Verified (Lain): eleven of twelve checks:**
- ⚠️ **Checks 1 and 3 run together, which is stronger than either alone.** A
  two-key save (the date as `2026-09-24T00:00:00Z`) left the other three null;
  then three keys; then **a one-key save with the other four holding real
  values, which all survived**. So the partial body is proven against fields
  that could actually have been clobbered, not only against nulls — the gap in
  7c's equivalent check.
- **SC-5 conformance observed.** After three implementation saves the newest
  `audit_logs` row is still CC-002's seeded T4 from 2026-08-16. `decision` and
  `risk_level` have rows because they are on SC-5's critical list; none of the
  five implementation fields is. **The withdrawn finding is now confirmed in the
  database, not just in the BRD.**
- **`dirty`'s second term and the guard both reach `implForm`:** typing gave
  "Unsaved changes" with no request; a sidebar link gave `confirm()`; Cancel
  kept the edit and OK lost it.
- **Both events on `actual_implementation_date`**, each proven alone — keyboard
  `25/10` into the empty picker, and a mouse-only popup pick. The save named the
  field and sent nothing. ⚠️ On the second half the 7c save error masked the
  hint: **flag 42 again**, unchanged since 7d.
- ⚠️ **Check 6, the in-flight window.** CC-002 → list → CC-011 by in-app links,
  then `history.go(-2)` under throttling: during "Loading…" the bar held **only
  Back to List** — neither Save Draft nor Submit for Final Approval. `implForm`
  is cleared with the other three.
- **The T6 gate fires in order:** dirty → "Save your changes before submitting";
  saved, then → "Cannot submit: Implementation Evidence is required". No request
  either time. **The evidence special case works — checked against the record,
  not against a form value that does not exist.**
- **Empty diff:** no request, "No changes to save".
- **One `toWire`, two bodies:** the implementation save sent
  `actual_implementation_date: "2026-09-24T00:00:00Z"`; the draft save sent
  `target_closure_date: "2026-09-17T00:00:00Z"` and `affected_systems_modules:
  null` on a cleared field. Same shapes from both endpoints.
- The `SIGNATURE_NOT_BUILT` use count reads **3**, as flag 45 predicts. Flag 45
  carries the `grep` form to run it with.
- `bun run check`: 184 files, 0 errors, 0 warnings. `bun run build` succeeds.

**Not verified:**
- **Check 8, the 409, was skipped.** The path is unchanged from 7c, whose own
  409 check was also skipped — so **the refetch-on-409 branch has never been
  observed on either endpoint**. Carried.
- **The three implementation counters past their limit.** They share
  `lengthHint` with the fifteen proven at 8a.

**Notes for the next session:**
- ⚠️ **`submitGate()` needed a special case, and it would have failed loudly
  without it.** `implementation_evidence` is in `MANDATORY` but in no form
  object, so `values[field]` read blank and **every** T6 submit would have
  reported it missing. It now tests `cc.implementation_evidence === null`,
  matching T6's `FileAttachmentExists`. It also needed `const record = cc`:
  `cc` is reassignable, so TypeScript drops the narrowing inside the filter
  callback.
- **Step 12 is upload-only now.** It swaps the disabled `.upload-box` for a real
  control and deletes nothing else — the asterisk, the hint and
  `editable('implementation_evidence')` are all already true and waiting.
- **Step 13 removes the last two `SIGNATURE_NOT_BUILT` uses** and the
  declaration with them.

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
| 20 | **The dashboard lives at `/dashboard`, and `/` redirects to it** via a mount-only `$effect` calling `goto(…, { replaceState: true })` | B5's tree and flag 2 agree. The step brief named both `(app)/+page.svelte` and `routes/+page.svelte`, but a route group adds no URL segment, so both map to `/` and SvelteKit refuses to build. **Rejected: the dashboard at `/`**, which departs from B5. **Accepted:** an effect that navigates rather than fetches stretches B3's wording, because the only alternative, a `load` redirect, is forbidden by B4 |
| 21 | **The guard never redirects on a null `auth.user`.** It gates rendering in the template instead. Only three places redirect, each after a verdict on the session: the restore, `request()`'s sign-out, and Sign Out | On a hard reload `auth.user` is null for a valid session until the restore finishes, so a redirect on null would log out every reload. Pages mount only once the user is set, so step 5's fetch cannot run without a token. **Rejected: B8's literal "redirects when it is null"**, now amended |
| 22 | **The restore runs `/refresh`, then `GET /me` through `request()`, and lives in the layout** | This is B8 as written. Going through `request()` means a deactivation between the two calls is handled the same way as on any page. **Rejected: calling `/me` with no token** and letting `request()`'s 401 path do the refresh. It reuses the rule, but costs a deliberate 401 and a server auth warning on every reload |
| 23 | **Decision 12's rule is extracted as `isTokenVerdict(status)`** in `api.ts`, and used by both `request()` and `restore()`. Lain's proposal | One rule in one place, with no extra round trip. **Its doc comment restricts it to `/refresh` responses.** From any other endpoint a 400 is a validation error, and the predicate would sign the user out for a bad field. **Rejected: duplicating** `401 \|\| 400` in the layout |
| 24 | **A restore that fails with 0 or 500 shows the error and a Retry, and keeps the token** | Decision 12: the failure says nothing about the token. `.esig-error show` follows decision 10's precedent, and `.btn.secondary` is an existing class. **Rejected: redirecting to `/login`**, because signing in again mints a second live token and leaves the first orphaned (A1.4a) |
| 25 | **While the restore runs, the sidebar renders and the content area shows B3's `<p>Loading…</p>`** | No prototype has a loading state. B3's pattern is the one every screen uses for its own fetch, so a reload looks like any later loading. `send()` has no client timeout, so a hung connection would otherwise leave a blank page. **Rejected: a blank page**, which looks broken when the connection is slow. **Rejected: a full-page loader**, which invents a layout. **Cost accepted:** a visitor with no valid session briefly sees the static sidebar before the redirect |
| 26 | **Sign Out lives on Settings → Profile, built at step 4.** It stays the prototype's `<a class="logout-btn">`. The handler calls `preventDefault()`, then `revoke()` (not awaited), then `goto('/login')` | Every prototype puts it there, and none has one in the sidebar. It stays a link because `.logout-btn` sets no cursor or font and `global.css` has no `button` reset, so the class is styled for a link. `revoke()` clears local state before its first `await` and never rejects, so awaiting it would only hold the page. **Rejected: a sidebar button**, which invents UI. **Rejected: a temporary button** on the placeholder |
| 27 | **Create moves out of step 8 to straight after 7a, as step 7a+.** The role views stay at 8 | Create's redirect target is 7a's route, so it cannot come earlier. Straight after 7a, steps 7b–7d get a fresh record with every field `null`. That is the hardest case for the `null ↔ ''` conversion, and the cleanest psql check for 7c. Seeded records cannot be reset, because `cmd/seed` creates only users. Create and the role views share nothing but the word `Initiated`. **Labelled `7a+` rather than renumbered**, because flag 5 and three checkpoint entries cite 7b–7d. **Rejected: before all of step 7**, where the check would end on a 404. **Rejected: staying in step 8** |
| 28 | **Profile shows the user's real role where the end-user prototype says "End User"**, and its labels get `for`/`id` pairs | "End User" is not one of the four roles. Labels without a control raise Svelte's a11y warning. Neither change alters anything visible |
| 29 | **My Change Controls is folded into step 6: one list component on two routes**, with `/my-change-controls` presetting `owner=me` | Lain's decision. It uses the same endpoint, response shape and pagination, with one filter preset, so a step of its own would build the same table twice. Confirmed in the Go: `HandlerListChangeControls` maps `owner=me` to `change_owner_id`. The two owner prototypes differ only in the title and the Ownership select. **This extracts a component before the third inline copy**, which the 3× rule allows when Lain decides it. **Rejected: a separate step**, and two inline copies of the table |
| 30 | **Mount-only fetches use `onMount`, not `$effect`. The `(app)` layout's restore moved to `onMount` in the same commit.** Lain chose `onMount`, then directed the layout change | An effect subscribes to every piece of state it reads synchronously, including reads inside functions it calls. `request()` reads `auth.accessToken` before its first `await`, so a fetch inside `$effect` refetches on every token change: the 401 path's refresh, and step 16's timer. Check 7 proved `onMount` doesn't. **The layout moved too** because otherwise B3 and the rule would say `onMount` while the one shipped mount fetch used `$effect`: a rule and the code disagreeing, with only a comment explaining why. `$effect`'s one remaining use is the `/` redirect, and B3 and the rule both name it. **Rejected: `untrack` inside `$effect`**, and **a plain `$effect` that accepts the refetches**. Reverses B3's "`$effect` for mount-only fetches" |
| 31 | **Create is a disabled `<button>` with `title="Available at step 7a+"`, CC Owner only.** Lain chose the button and added the title | Create is a POST followed by a `goto`, not a navigation, so a button is what it ends up as; the prototype's `<a>` is not. Without the title, a greyed button reads as a bug. `requireRole(roleCCOwner)` guards the route. **Rejected: an enabled button with no handler**, which decision 11 argues against, and **omitting it** until 7a+ |
| 32 | **The Pending Approvals card uses the prototype's short labels**, "Implementation Approval" and "Final Approval". The table uses the full state name | That is how the approver prototype draws them. Only those two states can reach the card (`dashboard.sql`). **Rejected: full names everywhere**, which would depart from the prototype |
| 33 | **A null `change_title` renders as plain `Untitled`** | A10 asks for a placeholder, and no prototype has one. `global.css` has no muted utility class, so it gets no styling rather than a new token |
| 34 | **Empty-state wording.** The drafts card says "No drafts yet", Admin's wording, over the Approver's "No drafts found". Recent Activity drops Admin's "…change controls you're involved with" | The two prototypes disagree, so one was picked. The dropped clause is false: the list is system-wide (`ListRecentActivity` has no `WHERE`). Same precedent as decision 28. The prototype is not edited (flag 1's reasoning) |
| 35 | **Dates render as "23 Jan 2026, 9:15 AM" in the browser's zone**, via `Intl.DateTimeFormat('en-GB')` with `formatToParts`. The parts are used only to upper-case am/pm. **Stat cards link through `stateHref(state: State)`**, built with `URLSearchParams` | The date format matches the prototypes. Timestamps are absolute instants, so local display is correct. Typing the link helper as `State` means a mistyped state fails `bun run check`, rather than 400ing at step 6. **Cost accepted:** Chrome writes "Sept" |
| 36 | **The Ownership dropdown is dropped entirely**, not reduced. Lain's decision, after rejecting three proposals of mine | The prototype's four options need two API calls, `owner=me` and `assigned=me` — and **the two are disjoint by role**, which is the part I missed. Only a CC Owner can own a record (`POST /changecontrols` is `requireRole(roleCCOwner)`; `requireRole` is exact equality, so not an Admin either; and **no `UPDATE` ever reassigns `change_owner_id`**). Only an Approver can be assigned one. So every role gets at least one option that can only ever return zero rows — my role-gated variant offered an Approver "Owned by me", which is the same objection I had raised about offering a non-approver "Awaiting my approval". A control wrong for all four roles is worse than no control. `/my-change-controls` covers the owner half; the approver's queue is step 11 (flag 21). **Rejected: three options · keeping it on both routes · role-gating it** |
| 37 | **`/my-change-controls` sets `owner=me` itself and never reads `owner` from the URL.** The one place where "the URL is the request" does not apply | `q.Get("owner") == "me"` is exact and untrimmed, and **any other value silently leaves the filter unapplied** — `200 OK`, no warning. Reading it from the URL would let a hand-edited `?owner=<another uuid>` leave a page headed "My Change Controls" listing everyone's records, with nothing to show for it. Ignoring the parameter before the handler does means it cannot happen. Check 7 proves it. **Rejected: validating the value client-side**, which duplicates a rule the server already owns |
| 38 | **Every other parameter passes through verbatim, and an invalid value renders the API's own 400** — no client-side sanitising | One rule, and every bad value is loud: `Invalid state`, `invalid limit: must be a positive integer`. Reinterpreting a bad value on the client produces the failure this project keeps finding — a filter that looks applied and is not. **Rejected: clamping `limit` to the three offered sizes** and **dropping an unknown `state`**, both of which turn a typo into a silently different result set |
| 39 | **The clamp is made visible:** when the response's `limit` is not one of 10/20/50, the per-page select renders a fourth option showing it | A9.1 says to compute page counts from the response's `limit` because the server clamps above 200 silently. Doing that but leaving the select showing 20 would make the UI lie about what it just did. Two lines turn a documented silent behaviour into something on screen. Check 9 |
| 40 | **Date Range becomes two date inputs**, Created after and Created before, replacing the 7/30/90-day preset select. Lain's decision | The API takes two `YYYY-MM-DD` bounds, not a range enum. A preset select would have to store either a computed absolute date — which means a bookmarked "Last 7 days" silently becomes "last 8 days" tomorrow — or a non-API parameter needing translation both ways. `.filter-select` sets only padding, border, radius, font-size, background and cursor, with nothing select-specific, so it carries an `<input type="date">` unchanged and no new CSS is needed. **Rejected: the preset select**, and **"Custom…"**, which opens UI no prototype draws |
| 41 | **Created By column dropped; headers are plain text; Actions is the eye alone.** Lain's decision | Created By would be identical to Change Owner in every row — the owner *is* the creator. The `.sortable` spans carry `cursor: pointer` and a hover effect while **no list endpoint has a sort parameter** (A9.0), so they are decision 11's case exactly. Both prototype icons went to the same URL, and the form decides editability from the Security Matrix in one place |
| 42 | **The State filter offers all six states, including Cancelled**, which the prototype's dropdown omits | Cancelled records **do** appear in this list, so omitting it would leave one state visible in the table with no way to filter to it. Iterating `STATES` also keeps the six strings in one place (decision 4), so trap 1 stays impossible here. **Rejected: the prototype's five**, which is a Overview-card rule (`dashboard.sql` excludes Cancelled) misapplied to the list |
| 43 | **The filter bar renders in every state** — loading, error and empty — instead of the prototype's empty state replacing the whole card | The prototype's empty state has no filter bar, which strands a user whose filter matched nothing with no way to clear it. Three empty messages instead of one: filtered, unfiltered-and-mine, unfiltered-and-all. The prototype's "you haven't created or been assigned as owner" is dropped — there is no creator and "assigned" means the approver, so it describes neither filter. Decision 34's precedent |
| 44 | **The fetch runs on `onMount` AND `afterNavigate`, deduplicated on the query string.** Reverses the approved plan, which said `afterNavigate` alone | See the corrections table: `afterNavigate` alone **never fires on load in this app**. Keying both on the query string makes the framework's ordering irrelevant — whichever fires first issues the request, the other is a no-op — rather than something that has to be reasoned about again at step 11 and 15. `lastQuery` is cleared on failure so an outage recovers without a reload, which check 13 proved. A sequence counter guards the debounced search's overlapping requests. **Rejected: `afterNavigate` alone** (broken), **`onMount` alone** (never refetches), and **`$effect`** (decision 30) |
| 45 | **Search is debounced 300 ms**, then `goto` with `replaceState`, `keepFocus` and `noScroll`. Lain chose debounce over Enter/blur | A search box that looks live and is not is worse than one timer. `replaceState` keeps a typing run to one history entry, so Back leaves the search rather than walking back per keystroke; `keepFocus` keeps the caret. The input takes `value={search}` from the URL rather than `bind:`, so Back puts the old text back in the box. The timer is cleared on destroy — otherwise it fires after the user has left and navigates them back. **Rejected: Enter/blur** |
| 46 | **`BADGE` and `formatDateTime` move to `src/lib/format.ts`; `stateHref` stays on the dashboard.** Lain's call on flag 22 | They are functions and a lookup table, not markup, so the three-copies rule is not the test. `stateHref` has one caller and the list builds its own URLs, so moving it would be moving a function to be near nothing. **Rejected: moving all three**, and **a second inline copy** |
| 47 | **With `?state=Bogus` the State dropdown renders BLANK, and that is kept.** Lain's observation at check 8 | No option carries that value, so the browser selects none. Snapping back to "All States" would have the control contradicting the error message beside it — the request *did* carry a state, and it was rejected. The other two 400s leave the select on "All States" correctly, because `state` is genuinely absent. Only reachable by hand-editing the URL. **Rejected: falling back to "All States"**, which is decision 38's silent reinterpretation wearing a different hat |
| 48 | **`disabled` goes through one `editable(field)` that returns false.** `EditableField` is derived from the write types, with 35 members | It adds no markup. Step 8's diff becomes one function body, checkable against the Security Matrix, instead of 34 attributes. A misspelt key fails `bun run check`. It takes only the field, so implementing it touches no call site, and 7b needs enabled fields before step 8. **Rejected: hardcoding `disabled`**, which 7b and step 8 would each edit. **Rejected: implementing the Matrix now**, which is step 8's scope and audit |
| 49 | **Signature History moves from step 13 into 7a**, and B9 is amended | Lain's leaning. It is read-only, from one uncapped endpoint open to all roles, and already styled. Deferring it would leave every side-by-side check partial for six steps. It is fetched in parallel, and a failure shows inside its own card only. The pills are keyed on `transition` through `Record<Transition, …>`. The empty state drops the prototype's owner-only second sentence (decision 34). **Rejected: deferring** |
| 50 | **Evidence renders as `name · size · Uploaded time` text**, or a disabled "No file uploaded" box. `content_type` is not shown, and the size is 1024-based | `content_type` is always the constant `contentTypePDF`, stored after a byte check. 1024 matches `maxUploadBytes = 10 << 20`. Step 14 changes only the file name, into a `<button>` (never `<a href>`, trap 4). Step 12 swaps the empty box for the upload control. **Rejected: the prototype's plain "(uploaded)" text**, which hides metadata the response carries |
| 51 | **`cancellation_reason` renders only on a Cancelled record**, disabled, below Comments. It is the one field hidden by state. Lain's decision | The brief said the reason belonged in the modal only. Four documents display it read-only on Cancelled: BRD Rule P6, the Security Matrix note, `CC_Field_Reference` #50 and `owner/cc-form-cancelled.html`. Omitting it would leave no screen showing why a record was cancelled. **Rejected: rendering it in every state**, and **omitting it** |
| 52 | **System fields are `.meta-value` text, with `—` for null.** Everything the Matrix can enable is an empty disabled control where the prototypes draw `.field-na` "Not applicable" boxes | Lain's architecture: 7b and step 8 must not rewrite the markup. This departs from BRD Rule P5 (§1052). The explanations `.field-na` carried are not dropped (decision 56). **Rejected: `.field-na`**. **Rejected: disabled inputs for system fields**, which would imply they could become editable |
| 53 | **The status badge is `status-badge cancelled` for Cancelled and `initiated` for every other state** | `global.css` defines only those two, and every non-cancelled prototype uses `initiated`. `BADGE` gives `table-badge` classes, which do not style `.status-badge`. **Rejected: new badge CSS** (B4) |
| 54 | **Only the Closed and Cancelled banners are built, and the header is wrapped in `.page-header-with-action`** | The other four banners address a role that can act, so each lands with its state's role step. **The header correction, Lain's catch:** `.page-header` has no bottom margin, and every prototype gets its gap from the banner that always follows it, so CC-014 sat flush. The wrapper supplies `margin-bottom: var(--spacing-xl)`. `.content` is a block container, so that margin collapses with a banner's top margin, and Closed and Cancelled keep the prototype's spacing. **Rejected: new CSS**, and **inventing state-neutral banners** |
| 55 | **The 14 `<label>`s over text carry `svelte-ignore a11y_label_has_associated_control`.** They sit over the system fields and the evidence | They have no control to point at. **Rejected: `<span>`**, which loses the `.form-group label` and `.meta-item label` styling, when new CSS is forbidden. **Rejected: accepting 14 warnings**, which breaks the 0-warning baseline |
| 56 | **Placeholders and per-field explanations are deferred to step 8 with a proposed shape** (flag 25), not dropped. Revised during the step at Lain's correction: the plan had recorded them with no shape | The prototype's explanations do real work once an owner sees 24 enabled fields beside 10 disabled ones. **Rejected: recording them as dropped** |
| 57 | **DATE and TIME are sliced (`slice(0, 10)`, `slice(11, 16)`), never parsed.** TIMESTAMPTZ goes through `formatDateTime` | `new Date('2026-10-25T00:00:00Z')` reads 24 Oct anywhere west of UTC, and that cannot be seen from +04:00. The San Francisco override proved the fix. The rule is now in A5.5 and in the rule file. This is flag 5's read direction |
| 58 | **An asterisk appears only on a field the viewer can edit now and that the transition they are working toward requires:** `required(field) = editable(field) && MANDATORY[current_state].includes(field)`. Lain's rule. At 7a no label has one | The asterisk is an instruction to whoever has to act. It takes two conditions because the sets differ: 24 fields are editable at T2 but 20 are required, and T6 excludes `deviations_from_plan`. **`MANDATORY` is confirmed in the Go:** T2's 20 presence checks, T4/T5's body (**including `decision_comments`**, where Lain's message had said Decision and Risk Level only), T6's 5 and T7/T8's 2. **It departs deliberately from `cc-form-closed.html`**, which stars most fields. It also replaces the state-and-role pattern I derived from the 13 prototypes, whose T2 group was starred for non-owners and on Cancelled. **Rejected: the prototypes' asterisks**, and **that derived pattern**. **Propagated, at Lain's catch** that it had been recorded here only: the rule and the Go-confirmed sets are in blueprint A10, and a short extract is in `svelte.md`'s Permissions section. That extract loads while step 8 edits the page, and it points at A10 and `MANDATORY` rather than retyping the sets |
| 59 | **Create is an inline `create()` in each of the two files that render the button.** A synchronous `creating` guard stops a second POST, `disabled={creating}` and a `Creating…` label are the visible half, and the error lives in its own `createError` under the header | **Two files, not three:** both list routes mount `ChangeControlList.svelte`. Each handler is about eight lines, and its `$state` has to live in the component anyway. **The guard, not `disabled`, prevents the duplicate.** It is set before the first `await`, whereas `disabled` depends on the DOM updating before the next click. `creating` stays true on success, so nothing can be clicked between the 201 and the new page. **The label is Lain's call.** `global.css` has no `.btn:disabled`, so a disabled button looks unchanged. It is a loading state, not domain copy. **The error is separate from the page's load `error`**, because that slot replaces the content, and a failed create would otherwise blank a page that loaded. The button markup is now written twice, below the three-copies threshold. **Rejected:** a `createChangeControl()` in `api.ts`, the first endpoint-specific authenticated wrapper, for two callers · reusing the load `error` slot · `alert()` · `disabled` alone |
| 60 | **Two objects: `cc` is what the server last sent, `form` is what is on screen.** `form` is `Record<keyof SaveDraftRequest, string>`, built by `toDraftForm()` as an object literal. `setRecord()` is the only assignment to either, and it rebuilds `form` from `cc` wholesale. Lain's central requirement for the step | Binding to `cc` would overwrite the server's copy on the first keystroke, and then 7c could not tell which fields changed, nor 7d whether any did. **Wholesale rebuild, because the server trims** text and nulls `""`: a form that kept its own values would read dirty for ever after a save. Copying primitives means no shared reference. **A literal, never a spread**, because excess-property checking applies to literals only. **Rejected: `$derived` for `form`**, which is not an independent writable copy, and syncing through `$effect`, which B3 forbids |
| 61 | **`editable()`'s first slice: `current_state === 'Initiated'`, `change_owner_id === user.id`, and `field in form`.** Flag 27 | **Ownership, not role**, as `HandlerSaveDraft`'s 403 checks it. It has no role check, and only a CC Owner can own a record (decision 36). **`field in form`** because `DraftForm`'s type already pins the 24, so there is no third list of names. The predicate is already right for every role in Initiated. **Rejected: a `DRAFT_FIELDS` array**, and **a role check** that the server does not make. It does not extend: see flag 27 |
| 62 | **`GET /approvers` is fetched at 7b, in parallel, on every load**, with its own error under the select | The select is one of the 24 and required at T2, and the server validates the assignee, so options cannot be invented. **Always, not only when editable:** a conditional fetch waits for the record (a waterfall) and copies `editable()`'s predicate, which decision 48 exists to prevent. The cost is three GETs on every record, for every role. **Rejected: deferring the field to step 8**, which would leave the slice at 23 |
| 63 | **`dateOutput` and `timeOutput` are inline beside the read helpers and uncalled until 7c.** Flag 5's write half | The 7a checkpoint recorded they would land here. String building, never `Date`. `tsconfig` has no `noUnusedLocals`, so an uncalled function breaks nothing. **Rejected: moving all four to `format.ts` to test them from the console**, which moves functions for testability against decision 46 |
| 64 | **CLAUDE.md trap 5 is amended with defect 17.** Lain's direction | It was the seventh copy of the claim. Leaving one copy uncorrected is the propagation problem hit three times already. Only the trap's wording changed: no evidence and no history, per the rule that findings do not go in CLAUDE.md |
| 65 | **Save Draft sends only the fields that differ from the record.** `draftChanges(form, cc)` compares each of the 24 against `toDraftForm(cc)`, the function that built `form`, so the comparison is string equality with no per-type logic. Lain asked for this to be argued, not defaulted | "Sending all 24 is safe" holds only when every value round-trips and the tab is current. **Two counterexamples, both observed:** a tab loaded before another tab's save reverts it and writes a false `FieldUpdated` row on an audited field (check 3), and a TIME stored with seconds comes back truncated with a 200 (check 12). A diff also makes the body inspectable in the Network tab, where a whole-form body's safety shows only in psql. **Costs accepted:** an empty diff must send nothing (a 400), a status 0 after a commit leaves `cc` stale (flag 37), and a same-field lost update across tabs is still possible (flag 38). **Rejected: all 24 every time** |
| 66 | **A partly typed date or time blocks the save** and names the field. No request is sent | `25/10/` reports `value === ''`, so the body would send `null` and clear the stored date (flag 31). **Rejected: omitting the field.** "Saved" would appear and then either silently revert the input to the stored date or leave the partial text beside the message. A block is loud |
| 67 | **The in-flight lock lives in `editable()`, and permission moves to `mayEdit()`**, which `required()` reads. `canSaveDraft()` holds decision 61's predicate | Flag 32: the save response rebuilds `form`, so a keystroke typed mid-save would be lost. `&& !saving` in the single predicate would also have removed all 20 asterisks for the length of every save, which Lain agreed would have been wrong and easy to miss. A synchronous `saving` guard stops a second PUT, and a `latest` check stops a response landing on a record navigated to since. **Rejected: the lock in the single predicate**, and **a field-by-field merge**, which would have to reimplement Go's trim |
| 68 | **The outcomes of a save.** 200: `setRecord`. 400, 403, 404, 0 and 500: `cc` and `form` untouched, the error shown. 409: refetch the record, per A8.2. 401: never seen by `saveDraft()`, which gets the retry's result, a returned refresh failure (the 0/500 row), or an unmount | Written for 7d. After a 400 or a network failure the edits stay, so the user can fix or resend them, and a resend is safe because equal values write nothing (check 10). A 409 means the record left Initiated, so the edits could not be saved anyway. The status-0 message is `request()`'s own, with no claim about data state (flag 30's precedent). **Rejected: refetching on a network failure**, which would discard edits the server may never have seen |
| 69 | **Save Draft stays on the form, as a `<button class="btn secondary">`, and reports in the sticky action bar.** A `.field-hint` reads "Saved {date, time}" or "No changes to save", or the error shows in `.esig-error show`. Lain chose staying and the hint | **The prototype and the BRD disagreed.** `cc-form-initated-state.html` links Save Draft to My Change Controls. BRD US-CC-02 says the record "remains in the Initiated state with all fields still editable", and NFR-10.1.2 asks for a success confirmation; the prototype is a static mock. **The timestamp keeps the hint true after later typing**, which a bare "Saved" would not without dirty tracking. It uses the client's clock because a no-op save does not move `last_updated_on`. **The error sits in the bar, not above it**, a change from the approved preview: the bar is sticky, and a block above it would sit below Signature History, off-screen when Save is clicked mid-page. **Rejected: navigating away**; **a button-label-only cue**, which would need an input listener; **the error above the bar** |
| 70 | **`validity.badInput` is read with `document.getElementById(field)`**, once, at save time. The four inputs' ids already equal their keys, and their labels come from a `satisfies`-checked map | `bind:this` is not on B3's allowed list, and it would add four element variables for one read. **Rejected: an `oninput` tracker**, which misses a partial entry typed into an empty picker, since the value stays `''` and no `input` event fires |
| 71 | **The first inline style: `style:margin-bottom="0"` on the save error's `.esig-error`**, with a one-line comment. Lain's decision and wording | `.esig-error` carries `margin-bottom: var(--spacing-lg)` to space it above the fields in the e-signature modal. Both `.form-actions` and `.actions-right` set `align-items: center`, so the markup was right. A flex row centres the margin box, which lifted the visible box half of `--spacing-lg` above the button. **Cancelling a margin meant for another context is a local override, not a new rule.** It uses the `style:` directive rather than a `style` attribute. B3 and `svelte.md` record the one use (flag 39). **Rejected:** editing `global.css`, which must stay identical to the prototype copy · the error above the bar · a grey `.field-hint`, indistinguishable from "Saved" · `align-self: flex-end` · accepting the offset |
| 72 | **`dirty` is a `$derived`: `draftChanges(form, cc)` non-empty, or `incomplete` non-empty.** Lain's expectation, plus the partial-date term | **It uses the save body's own comparison**, so the gate and the body cannot disagree. A faster `some()` comparator would be a second definition of "changed" that could drift. **Every known error is false-dirty, the safe direction**: flag 34's `\r\n`, and flag 37's stale `cc`. **Cost, decided:** `$derived` is lazy and memoised (`deriveds.js`). A write only marks it stale, it recomputes once per flush when the hint reads it, and `equals` re-renders the hint only when the boolean flips. That is 24 string comparisons per keystroke. **Rejected: debouncing**, which opens a stale-clean window · **memoising the baseline**, for no measurable gain |
| 73 | **A partial date reaches `dirty` through `incomplete`, a `$state` copy of `incompleteDateTimes()` refreshed by `oninput` AND `onkeyup`** on the four inputs, and reset in `setRecord()` | `validity.badInput` is DOM state, which no `$derived` can track. **Each event covers what the other misses:** typing into an empty picker fires no `input`, and the popup fires no `keyup`. Checks 3 and 5 proved each half on its own. **Extends decision 70 rather than reversing it:** that decision rejected an `oninput`-only tracker, and the click-time fresh read stays as the backstop. The reset is safe because `load()` unmounts the form, and a save cannot start while a date is partial. **Rejected: `onfocusout`**, which updates only after focus has left, and so leaves the gate open until then |
| 74 | **Save Draft stays enabled, and `dirty` drives an "Unsaved changes" hint.** Step 9's Submit is **refused at click time** with a message, never `disabled`. Lain's choice, over `disabled={!dirty}` as briefed | **`global.css` has no `.btn:disabled`** (only `.pagination-btn:disabled`, :760), and no prototype draws a disabled `.btn`. A disabled Save or Submit looks and hovers like an active one, so a click does nothing and says nothing, against NFR-10.1.2 and decision 11. **"No changes to save" stays**, as the answer to clicking Save on a clean form, not as a race fallback. A2, `api.md` and CLAUDE.md trap 2 said "disabled", and are amended. **Rejected: `disabled={!dirty}`** · **disabled plus an inline `style:opacity`**, a second visual override of `global.css` that Submit would copy |
| 75 | **The hint's order is error, then "Unsaved changes", then `saveNotice`. `saveNotice` is never cleared on typing** | Lain asked whether to clear "Saved 6:37 PM" on the first keystroke. Decision 69 timestamped it *because* there was no dirty tracking. Beside unsaved edits it is true but misleading, just before a submit, so it is hidden. **Hidden, not cleared:** undoing back to the saved values brings it back, and it is still true (check 6). The same ordering lets an older "No changes to save" reappear after an undo, which Lain judged correct at check 2. **Rejected: clearing on the first keystroke**, which loses that, and needs a handler on 24 controls or an `$effect` |
| 76 | **The navigation guard is a step of its own, 7d+, straight after 7d. Step 8 and the rest keep their numbers.** Lain asked me to argue 7d or flag, and chose the flag and the step | It reads `dirty`, so it cannot come earlier, and until it exists a dirty form is lost silently. **It was not folded into 7d.** 7d was already verified and recorded. The guard brings a new API (`beforeNavigate`) and a new UI pattern (`confirm()`), and no document asks for it. The sign-out trap needed `client.js` read, and its seven checks match 7d's in number. **Labelled `7d+`**, as decision 27 labelled 7a+, because other entries cite 8–17. The design and checks are in flag 43. **Rejected:** folding it into 7d · deferring it past step 8 |
| 77 | **`beforeNavigate` on the CC form is the unsaved-edits guard, and B3's SvelteKit subset is regrouped by job** | **One mechanism.** SvelteKit's own `beforeunload` listener covers reload and tab close as `leave`, so no `<svelte:window>` is needed (B4). **`auth.user === null` returns early, on both sides of a race.** `navigate()` awaits `get_navigation_intent` before running the callbacks. So the layout's flush may unmount the page first, which removes the callback, or the callback runs and finds the user null. Check 6 proved no prompt. **The subset** was a sentence that grew by appending. It is now routing, reading the URL, navigating, and two navigation hooks with one job each, plus a "Not used" line. `onMount` was never in it: it is Svelte's and sits under Runes. **Rejected:** `<svelte:window onbeforeunload>` (B4, and it duplicates SvelteKit's listener) · snapshots, which restore edits only on history traversal, and onto a record that may have changed |
| 78 | **The guard asks with `window.confirm()`: "Leave this page? Your unsaved changes will be lost."** Squares with decision 59's rejection of `alert()` | **Decision 59 rejected reporting through a native modal**, because the create error had an in-page home. **Here nothing in the page can answer in time.** `cancel()` must be called inside a synchronous callback (`client.js`:1685), and a styled dialog cannot be awaited. The line drawn: **native dialogs only where a synchronous answer is required, never to report.** **The wording is Lain's.** "Discard unsaved changes?", flag 43's proposal, made Cancel ambiguous, because it could read as "cancel the changes". Naming the action makes OK leave and Cancel stay. **Rejected: always `cancel()`, then an in-bar "Leave anyway?" that calls `goto(to.url)`.** It turns a cancelled Back into a push, so history loops. It invents a control no prototype draws (B4). And `leave` would still use the native dialog, so there would be two looks |
| 79 | **`load()` clears `cc` and `form` before its first `await`** | It fixes the 7c defect in the corrections table. While loading there is no record, so `dirty` and `canSaveDraft()` are false. That hides the hint and Save Draft, and stops the guard prompting over a load with nothing to lose. **Steps 9–13's buttons read the same predicates, so they inherit it.** A 409's `saveError` is separate state and survives. Check 3 proved it under throttling. **Rejected:** `!loading` guards in the markup, which every later action button would repeat, and which leave `dirty` true during a load for step 9's click-time check · accepting it as a flag, when what lingered was a live Save button |
| 80 | **The approver's five gate fields are INPUT BUFFERS, not forms.** `implDecision` (3) and `finalDecision` (2) are `$state` objects seeded from the record and cleared by `load()`, with **no diff, no `dirty` term and no navigation guard** | Confirmed in the Go: nothing writes `decision`, `risk_level`, `decision_comments`, `final_decision` or `final_comments` except the transition itself — `UpdateChangeControlDraft` and `UpdateImplementationDetails` do not touch them, and neither save's whitelist contains them. So there is nothing for them to be unsaved *from*. They are still seeded from `cc`, because T2 and T6 clear nothing and an approver reopening a gate after a rejection must find the previous values (A10). **Rejected: folding them into `dirty`** — `submitGate()` refuses while `dirty`, so an approver's own typing would block their own submission. The cost is flag 47 |
| 81 | ⚠️ **`success_criteria`'s placeholder is WRITTEN, not ported** — "Describe what must be true for this change to be considered successful". **B1's "invent nothing visual" overridden by Lain, for this one field** | `cc-form-initated-state.html` repeats Validation Approach's placeholder there verbatim (:279 and :288) — a copy-paste slip in the mock, so there was nothing to port. **A prompt that describes the wrong field is worse than one we wrote.** My proposal had been to omit it, on the grounds that inventing copy is the bigger sin; Lain's ruling is that the prototypes are guides containing their author's mistakes, not scripture, and that following one into something obviously wrong on screen should be **raised, not complied with silently**. No trailing full stop, matching the other fourteen. **Rejected: omitting it** (leaves one of 24 fields unprompted for no reason the user can see), and **porting the duplicate** (misinstructs). The prototype is not edited (flag 1) |
| 82 | **A missing title renders `<em>Untitled</em>`**, in all four places it appears. Revises decision 33 | Decision 33 left it unstyled because `global.css` has no muted utility class and B4 forbids new tokens. The result was that a record with no title read identically to one actually titled "Untitled". `<em>` is a tag, not a CSS rule, so it costs nothing B4 protects, and it says the true thing: this is a placeholder standing in for a value. Truthiness rather than `??`, so a stored `''` reads the same way — the server nulls whitespace, but this no longer depends on that. **Rejected: a new CSS token** and **leaving it** |
| 83 | **A live character counter under every length-limited field**, as a `.field-hint`, shown only past 80% of the limit. Flag 36 revised at Lain's ruling | Without it an over-long field is a 400 *after* a round trip, with no way to see how far over. ⚠️ **The limits were swept from the Go, not assumed: `change_title` is 200 and `affected_systems_modules` is 500**, not the 2000 the other sixteen carry — both `<input type="text">`, both easy to get wrong from memory. **Flag 36's second objection does not survive the sweep:** it argued that HTML `maxlength` counts UTF-16 units where Go counts runes, which defeats `maxlength` but not a counter — `[...value].length` iterates by code point and `len([]rune(s))` counts code points, so the two agree. The 80% threshold is a judgement call, stated as one: below it the counter is noise under thirteen fields at once. Text-only over the limit ("14 over the limit"), because `global.css` has a `--color-danger` token but no red text class and B4 forbids adding one. **Rejected: `maxlength`** (wrong unit, and silent truncation is worse than a 400 that explains itself) · **blocking the save** (the server decides) · **a second inline `style:` override** for colour, available if wanted |
| 84 | **The Approvals card gets a `.section-note` per subsection, per state — including one for leftover rejection values.** Lain's ruling, after a sweep | Decision 52 replaced the prototypes' `.field-na` boxes with empty disabled controls, and decision 56 promised the **explanations those boxes carried** would not be dropped. 8a delivered that for Implementation Details and not for Approvals, leaving five empty disabled controls with nothing saying why — a promise half-kept. ⚠️ **The leftover case is worse than unexplained:** T2 and T6 clear nothing, so after a rejection Decision reads `Reject` beside a status of `Not Submitted` (a contradiction on its face) and, once resubmitted, beside `Pending` (a decision apparently already taken). Detected as `decision !== null && implementation_approval_status !== 'Approved'`, which covers both statuses and Cancelled, rather than testing one. **The controls are right to show the values** — the approver reopening the gate must see what they wrote — **it is the screen that has to say what they are.** **Rejected: restoring `.field-na`** (decision 52) and **clearing the fields client-side** (they are the record) |
| 85 | **The second save shares `saving` and the Save Draft button with the first.** One flag, one button, a `save()` dispatcher | The two states are mutually exclusive, so only one save can ever be in flight. **A second flag could only fall out of step with `editable()`'s lock**, which reads this one (flag 32) — it would buy nothing and add a way to be wrong. The single button is the same argument: rendering two would write `canSaveDraft()` and `canSaveImplementation()` twice each, in markup, to produce a control that looks identical either way. **Rejected: a `savingImpl` flag** and **two buttons**. Submit for Final Approval is its own button because it is a different action, and its own handler because step 13 wires it while step 11 does not (flag 45) |
| 86 | **`incompleteMessage(verb)` — one definition of the partial-date refusal, for three callers.** Lain chose it over writing the third copy | I flagged at 8a that 8b would write a third copy and proposed it rather than extracting (CLAUDE.md: propose, never extract unilaterally). ⚠️ **The three-copies rule was not the test.** Decision 46 settled that it governs *markup*, not functions, so the question was only whether one definition beats three — and a sentence that must read the same under three different buttons is exactly that case. The verb stays a parameter so the message still names the action it refused; a single wording ("before continuing") was rejected for losing that, since one action bar serves up to three buttons. **Rejected: the third copy**, and **a verbless helper** |
| 87 | ⚠️ **"Incomplete, not untrue" — the test for copy about a feature that is not built yet.** The Implementation Evidence hint is **kept**; the "You will be notified" sentences were **dropped**. Lain's ruling | Both are text describing something the build cannot currently do, and the two go opposite ways, so the distinction had to be named or the next case would be decided by coin flip. **Untrue: the build can never do it.** Phase 1 has no SMTP (FR-6.4.1), so the notification never arrives — cut the sentence, keep the rest (flag 46). **Incomplete: a later step will.** The upload lands at step 12, and the surrounding flow is visibly scaffolded — the asterisk, the disabled box and a Submit that stops at `SIGNATURE_NOT_BUILT` — so it reads as unfinished rather than as a lie. **I proposed keeping the hint in the plan, then raised it again at 8b as possibly the same fault as the notification sentence; Lain drew the line.** Now in `.claude/rules/svelte.md`, which loads at write time, beside the standing instruction that the BRD, the Matrix and the prototypes are guides containing their author's mistakes |

---

## Flags

*Known, deliberately deferred, with the reason. **A flag is not a defect** — keep
the two apart, or the real problems get lost among the accepted trade-offs.*

| # | Flag | Status |
|---|---|---|
| 1 | **Five copies of `global.css` now exist** — `docs/prototypes/` plus `owner/`, `approver/`, `admin/`, plus `src/lib/`. Every prototype links it as `href="global.css"`, relative to itself, so all three role folders rendered unstyled until a copy sat beside them. **`docs/prototypes/global.css` is canonical; the other four must stay in step.** All five verified identical at step 1 (md5 `8115796f`, 1808 lines) | Accepted. Re-check they match whenever any copy is touched. The alternative — rewriting ~35 prototypes to `href="../global.css"` and keeping one copy — was not done: the prototypes are the visual authority and editing them for the port's convenience is the wrong direction |
| 2 | ~~`src/routes/+page.svelte` is throwaway proof markup (decision 2)~~ **Closed at step 4.** The proof markup is deleted and `/` redirects to `/dashboard` (decision 20) | Closed |
| 3 | **`README.md` is the untouched `sv` boilerplate** — titled "sv", tells the reader to run `npx sv create`, and gives `npm install` / `npm run dev` / `npm run build` in three places. The project is Bun-only, so **every command in it is wrong**. Only line 18 is true: it records the actual `bun x sv@0.17.0 create --template minimal --types ts --install bun .` | Deferred to **~step 5**, when there is a running app to describe rather than a shell. **Not done at step 5**, at Lain's direction, to keep the step focused. Still open. **Keep line 18's invocation** when it is rewritten — it is the evidence behind the first document correction below |
| 4 | ~~`docs/openapi.yaml` here has diverged from the backend's copy~~ **Closed 2026-09-11.** Lain diffed the two copies first. Every difference was one of the eleven fixes, and nothing existed only on the backend side. Lain then copied this file over the backend's, committed it there, rebuilt `server.exe` and restarted the Windows service. Verified at `localhost:1304/docs`: `/refresh`'s 401 cause table, the `active` parameter, and the three new schemas. ⚠️ **Defects 12–15 (steps 3 and 4) put the two copies apart again**, in the auth and users sections | Closed. 12–16 are **not worth a rebuild on their own**, so they go into the backend with its next rebuild, the same way. Defect 16 (step 7a) is in the signatures section |
| 5 | **Step 7b needs a date/time conversion helper, both directions.** `<input type="date">` reads and writes `YYYY-MM-DD`; every date *write* field on the API takes RFC 3339 (`"2026-09-01T00:00:00Z"`) and rejects the bare date with a 400. `<input type="time">` is `HH:MM`; the TIME fields round-trip as `"0000-01-01T09:00:00Z"`. So **four functions**: date→input, input→date, time→input, input→time, each mapping `null` ↔ `''` — because `null` clears a field and `''` is a parse error. Five fields need it: the four in `SaveDraftRequest`, plus `actual_implementation_date` in `SaveImplementationRequest` at step 12 | **Both halves built.** The read direction is `dateInput` and `timeInput`, inline in the form page (decision 57), and the timezone check proved it. **The write direction, `dateOutput` and `timeOutput`, was built at 7b** (decision 63). **Verified at 7c:** check 1's payload carried `2026-10-25T00:00:00Z` and `0000-01-01T09:30:00Z`, and psql stored both. Recorded now because the failure is invisible until then: TypeScript types all five as `string`, so the wrong format compiles cleanly and 400s at runtime. **The list filters are the exception** — `created_after` / `created_before` take `YYYY-MM-DD` and must NOT go through the helper |
| 6 | **`file:line` references go stale whenever the backend changes.** A1 was audited *after* the six backend changes and still cited `main.go:96-98` for routes that had moved to 130-132. So this is a class of problem, not one instance. Step 3 fixed A1's by naming the function instead: "`middlewareAuth`'s `is_active` check", not `middleware.go:69`. **Not yet swept:** `types.ts`, the rest of Part A, `openapi.yaml`, `.claude/rules/` | Deferred. When swept, replace a reference with the function name wherever it names something stable. Keep `file:line` in this file's historical entries, where it records evidence as it stood at the time |
| 7 | **`request()` branches on 401 message *strings*.** It retries only on `Unauthorized` and ends the session on `Account is deactivated` (step 3). The coupling to `middlewareAuth`'s wording fails safe: if the wording changes, the retry stops firing and an expired token shows as an error, never as a wrongful logout. **What would remove it:** a machine-readable error code on error responses | Deferred. It changes a completed API. If it is ever done, `request()` switches to the code and its two message constants are deleted |
| 8 | **Concurrent refreshes are not deduplicated.** Two parallel 401s fire two `/refresh` calls | Harmless while refresh tokens are not rotated, since both calls succeed. Revisit only if step 5's Network tab shows duplicate refreshes. **Step 7a's form is the first page to send two authenticated requests in parallel**, the record and its signatures, so an expired token there fires two `/refresh` calls |
| 9 | **`X-Instance-ID` is readable but not captured** | Check 4 proved it is exposed, but nothing needs it until a screen shows A8.2's generic 500 message. Add it to `ApiResult`'s failure branch then, not before |
| 10 | ⚠️ **BACKEND_CHANGES §6 is probably wrong: a timeout most likely reaches the browser as a network error, not a 500.** This is inferred from how `net/http` works, not observed. `WriteTimeout`'s connection deadline starts when the headers are read. `middlewareLogging`'s 30 s context starts slightly later, so the write deadline passes first and the handler's 500 can't be flushed. The server **log** still says 500, because `responseRecorder` records the status the handler attempted. That is probably where §6's claim came from | **Unverified, because check 7 was skipped.** `api.ts` handles both outcomes (status 0 and 500). To prove it: run `BEGIN; LOCK TABLE users IN ACCESS EXCLUSIVE MODE;` in psql, sign in, watch the Network tab at about 30 s, then `ROLLBACK;`. If confirmed, amend §6 |
| 11 | ~~`request()`'s retry-then-signature branch has not run~~ **Closed at step 3.** After a reload on CC-008: `/decision` 401 (no bearer) → `/refresh` 200 → `/decision` 401 `Invalid credentials`. The error was returned to the caller, the session was kept, and one `SignatureFailed` row was written. See the step 3 checkpoint | Closed |
| 12 | ~~**The restore's failure branch and its Retry are unproven.**~~ **Closed at step 6**, check 13 — one outage proved all three branches it had accumulated. Service stopped and a filter changed: the header and filter bar stayed and the table was replaced by "Could not reach the server" (**the list's error branch**). Service restarted and a filter changed again: the table returned **with no reload**, which is `lastQuery = null` on failure working. Reloading during the outage: the layout's error and Retry, sidebar still rendered, content gone (**the restore's branch**). Open from step 4 to step 6 | Closed |
| 13 | ~~**`request()`'s refresh-failure branch hasn't run since the `isTokenVerdict` swap.**~~ **Closed at 7d+**, check 6. Tokens revoked in psql, `auth.accessToken = 'x'`, then Save Draft gave PUT 401 → `/refresh` 401 → `/login` with "Your session ended". It went through a real Save rather than the console `request('GET', '/me')` below. The change is a one-line predicate swap and it type-checks. The restore's use of the same predicate passed three checks | Closed. The original recipe, kept: while signed in, revoke the token in psql. Then in the console run `(await import('/src/lib/auth.svelte.ts')).auth.accessToken = 'x'`, then `await (await import('/src/lib/api.ts')).request('GET', '/me')`. Expect `/me` 401, then `/refresh` 401, then `/login` showing "Your session ended" |
| 14 | **These links 404 until their steps land.** ~~`/change-controls` and its `?state=` stat-card links~~ and ~~`/my-change-controls`~~ **landed at step 6.** ~~The eye links to `/change-controls/{ccId}`~~, on both the dashboard and the list, **landed at step 7a.** Still open: `/approvals` (step 11) and the Admin's `/settings/users` (step 15) | Accepted, narrowed at step 6. Each stops 404ing when its step lands |
| 15 | ~~**B9 has no step for My Change Controls.**~~ **Closed at step 4.** BRD §9.5.1 lists it and three prototypes draw it. It is folded into step 6 (decision 29) | Closed |
| 16 | **Nothing returns the user to their page after login.** A reload that ends at `/login` loses the page the user was on, and login always goes to `/dashboard` | Deferred. No document asks for it. If added, the target must be checked as a same-origin path, since `/login?next=` is user-editable |
| 17 | **`/login` does not redirect a user who is already signed in.** Signing in again from there mints a second live token (A1.4a) | Deferred. Cosmetic until someone reaches `/login` with a live session, for example by typing the URL |
| 18 | **The Admin's Settings link opens Profile, not User Management.** The Admin prototype's sidebar goes to `settings-admin.html`. The build sends every role to `/settings` | Decide at step 15, when `/settings/users` exists |
| 19 | ~~**`CLAUDE.md` says "seventeen steps". B9 now has eighteen**~~ **Closed at step 4.** At Lain's direction the count was **removed** from `CLAUDE.md` rather than updated. A count kept in two documents had drifted twice, and B9 is now the only place it lives. This corrects a stale pointer rather than recording a finding, so the `CLAUDE.md` rule is not breached | Closed |
| 20 | ~~**The prototypes' Ownership filter offers choices the API can't tell apart.**~~ **Closed at step 6 — the control is dropped entirely** (decision 36). The collapse into `owner=me` was the smaller half of it: the two surviving filters are **disjoint by role**, so every role gets at least one option that can only ever return zero rows | Closed |
| 21 | **Step 11's Approvals queue must not come from the dashboard's `pending_approvals` block**, which is capped at 2. An approver with seven pending records would see two, and never know. Build it from one `?assigned=me&state=…` call per pending state. Filtering an unfiltered `?assigned=me` on the client breaks `total` and pagination | Decide at step 11 how two independently paginated queues are laid out. The prototype `approver/approvals.html` is the starting point |
| 22 | ~~**Three helpers live inline in the dashboard page.**~~ **Closed at step 6** (decision 46). `BADGE` and `formatDateTime` are in `src/lib/format.ts`; `stateHref` stayed on the dashboard, which is still its only caller | Closed |
| 23 | ~~**The Create button is a placeholder.** It is disabled, with `title="Available at step 7a+"` (decision 31)~~ **Closed at step 7a+.** Wired in both files, with `disabled` and `title` removed (decision 59) | Closed |
| 24 | ⚠️ **BACKEND — `search` reaches the `ILIKE` pattern with `%` and `_` unescaped** (`change_controls.sql:70-72` and `:104-106`). sqlc parameterises the value, so there is **no injection** — but both are `LIKE` metacharacters, so searching `50% capacity` matches **every** record and `CC_001` matches `CC-001` and `CC0001` alike. Neither looks like a failure; the list just returns the wrong rows. Found in step 6's rule-7 audit | **Not worked around client-side, deliberately** — escaping in the frontend would make it disagree with Postman, curl and every other consumer of the same endpoint. **The fix is server-side**: escape the pattern, or add an `ESCAPE` clause. Goes to the backend with its next change, like flag 4's spec defects. Recorded in A9.2 and on `ChangeControlListParams.search` so it is not rediscovered as a frontend bug |
| 25 | **Step 8: why a field is disabled, and placeholders** (decision 56). The proposed shape:<br>- **A `.section-note` per section.** The prototype already has "These fields will become available once the change is approved for implementation".<br>- **A `.field-hint` under a control** where the section note is not enough. It is the same class as "Optional (recommended for IT changes)".<br>- **Never replacing the control.**<br>- **Placeholders on enabled fields only**, with the prototype's text.<br><br>Asterisks are already done (decision 58) | **Closed at 8a**, to the proposed shape. Four info-banners (decision 54's deferral), a `.section-note` on Implementation Details and one per Approvals subsection (decision 84), fifteen placeholders and fifteen length counters (decision 83). ⚠️ **The Approvals half was missed on the first pass** and only found by a deliberate sweep for "a document won and the screen got worse" — decision 56 had promised it and the plan had not carried it forward. **One piece lands at 8b:** the Implementation Evidence `.field-hint`, which needs the field editable first |
| 26 | ~~**The approver select must keep the current assignee as an option**~~ **Closed at 7b.** `approverOptions()` appends the assignee when `/approvers` lacks them, compared on id (decision 62). **The Go narrowed it:** `ListActiveCCIDsForUser` counts Initiated as active, so the case arises only on Closed and Cancelled records, whose select is disabled, and never where it is editable | Closed. **The branch is reasoned, not observed**: check 8 was skipped |
| 27 | ~~**`editable()` returns false until step 8**~~ **Closed at 7b** with the owner's 24 in Initiated (decision 61). ⚠️ **`field in form` does not extend. Step 8 restructures the predicate; it does not add a branch.** It works only because `DraftForm`'s keys ARE the owner's Initiated slice. The approver's gate fields (`decision`, `risk_level`, `decision_comments`, `final_decision`, `final_comments`) and the owner's five `In Implementation` fields go to other endpoints and need their own form objects, so `editable()` must choose per state | Closed. The restructure is step 8's |
| 28 | **The leftover rejection values and defect 16 have not been observed.** No seeded record is in a state that shows them: a read-only query returned 0 rows.<br>- **At step 11, after a T5:** Decision still reads Reject beside Not Submitted, and Signature History is not empty in Initiated.<br>- **At step 13, after a T8:** Final Decision still reads Reject | Carried as a check for steps 11 and 13 |
| 29 | **Live-join vs snapshot names is reasoned, not observed** (check 12 was skipped). Renaming Default Approver should change every name on the form and none in Signature History | Optional. Run it whenever a rename happens anyway, which will be step 15 at the latest |
| 30 | **Create can make a duplicate record.** The `creating` guard covers one tab only. **A status 0 or 500 does not prove that nothing was created:** the connection can drop after `tx.Commit()` (CLAUDE.md trap 6). So a user who sees an error and clicks again, or clicks in two tabs, can make two records. The API has no idempotency key. The harm is one stray empty draft, and this is rare | **Accepted, with the message unchanged.** Lain's decision. Wording such as "check My Change Controls before retrying" makes a claim about data state, and it deserves more thought than a passing decision |
| 31 | **A partly typed or invalid date reports `value === ''`.** For example, day and month with no year, or 30 Feb. `dateOutput` turns that into `null`, so a save would **clear the stored date** with no error. Only `input.validity.badInput` tells it apart from a deliberately emptied picker | **Closed at 7c.** The save is blocked and the field named (decision 66). Check 5 proved both halves |
| 32 | **Keystrokes typed while a save is in flight are lost**, because the response goes through `setRecord()` and rebuilds `form`. **Recommendation: lock the form while saving**, `&& !saving` in `editable()`. A field-by-field merge would have to tell a server trim from a user edit, which means reimplementing Go's `TrimSpace`, and the whitespace sets differ (Go counts U+0085, JS counts U+FEFF) | **Closed at 7c.** The lock is in `editable()` and permission in `mayEdit()`, so the asterisks survive (decision 67). Check 9 proved it |
| 33 | **The save body.** An empty body is a 400, so an empty diff sends **no request**. Apply `'' → null` to all 24 uniformly, so the builder carries no per-type knowledge; it is load-bearing on five (defect 17). **No client-side trim**: the server trims, and the whitespace sets differ. A whole-form body is never empty and is safe for 400s and audit rows, but overwrites another tab's changes | **Closed at 7c.** A diff body (decision 65), with `'' → null` applied uniformly and no client trim. Checks 2, 3, 4, 6 and 12 proved it |
| 34 | **A `<textarea>` reports line breaks as `\n`.** A stored `\r\n` stays in `form` until the user types in that box, after which it is `\n`, so undoing the edit still reads dirty. Affects only values written with `\r\n` outside a browser | **Closed at 7d, accepted.** It errs false-dirty, the safe direction for a gate. A Save stores `\n`, and the form then reads clean (decision 72). Check 11, which would have observed it, was skipped |
| 35 | **A save's 400 is not shown next to the field**, which A8.2 asks for. The message names the field in prose and sits in the action bar. Placing it would mean parsing the prose back to a field key | Accepted for 7c. Revisit at step 9, where T2's `issues` lists field labels, up to 22 of them. ⚠️ **Step 9: the submit error must render as a list, not a sentence** (Lain, at 7d). T2's 400 collects every missing mandatory field into `issues`, and it is the first list of errors to reach the screen. Today the action bar renders a save error as one string, with any `issues` joined by commas. That was enough because a save stops at its first failing field, and its `issues` can only list unknown keys. A8.1 says to render every item but not how they look, so step 9 decides the markup, from a prototype if one draws it, and checks it against flag 39's flex-row margin |
| 36 | ~~**No `maxlength` on the text fields.**~~ **Revised at 8a** (decision 83). No `maxlength` — that part stands, and for the reason given — but "accepted" hid a real cost: an over-long field was a 400 *after* a round trip, with nothing on screen showing how far over. ⚠️ **The UTF-16-vs-runes objection defeats `maxlength` and not a counter**: `[...value].length` and `len([]rune(s))` both count code points. And **the limits are not uniform** — `change_title` is 200, `affected_systems_modules` is 500, the other sixteen are 2000 | **Closed at 8a.** A `.field-hint` counter past 80% of the limit, on all fifteen editable limited fields; the three In Implementation ones are in `LIMITS` already and light up at 8b. The server still decides |
| 37 | **A status 0 after a commit leaves `cc` stale.** If the user then reverts a field to that stale value, the diff omits it, the server keeps the committed value, and the next 200 shows it. This is the one case where a diff is less exact than a whole-form body. It shows on the next save, and is not silent in the database | Accepted. Rare: it needs a connection dropped after the commit, then a revert |
| 38 | **BACKEND — saves have no concurrency control.** The row lock serialises writes, but nothing detects a stale client: there is no version column and no `If-Match`. A diff body narrows a lost update to the same field edited in two tabs; it does not prevent it | Not worked around client-side. The fix is server-side, with the next backend change |
| 39 | **Any `.esig-error` inside a flex row needs its `margin-bottom` cancelled** (decision 71). The two `createError`s, on the dashboard and in `ChangeControlList.svelte`, sit as blocks and need nothing | Watch from step 9, wherever an error sits beside a button |
| 40 | **CLAUDE.md trap 2 says "Transitions carry no field values"**, the universal claim corrected in A2 at 7c. It is true of T2 and T6 only. Its point, save before submit, stands | **Closed at 7c.** Amended at Lain's direction, in wording only, as trap 5 was at 7b: a trap that states something false about the API is a wrong rule, not a finding being recorded |
| 41 | **The `keyup`/`input` pair has been proven in one browser only**, the one Lain used for checks 3 and 5. Another engine's date picker could produce a partial entry without either event | Accepted. `dirty` would read clean beside it, but the click-time fresh read in `saveDraft()` still blocks the save, and step 9's Submit must do the same read (decision 73) |
| 42 | **A save's error stays on screen after the user fixes its cause, until the next click.** This is 7c behaviour. Since 7d it also outranks "Unsaved changes", so a fixed partial date shows the old error, not the hint (check 3). **Observed again at 8b check 5**, on `actual_implementation_date` — so it is not specific to the draft slice, and every new action button inherits it | Revisit at step 9 with flag 35, where T2's `issues` list makes stale errors more likely. **Seen twice now, in two states** |
| 43 | ~~**Leaving a dirty form loses the edits silently.**~~ **Closed at 7d+** (decisions 77–79). Kept as written; the confirm wording and two `client.js` details below were superseded, see the corrections table.<br><br> For example, a sidebar link, Back to List, browser Back, a reload or closing the tab. `dirty` (decision 72) makes a guard possible, and nothing guarded it before 7d. Lain found it during the 7d checks.<br><br>**Three premises corrected from `@sveltejs/kit` 2.70.3's `client.js`. Lain's brief had all three wrong:**<br>- **One mechanism, not two.** `beforeNavigate` covers tab close, reload and a typed URL as `type: 'leave'`. SvelteKit's own `beforeunload` listener (2662–2690) calls `preventDefault()` when a callback cancels, and the browser shows its native dialog. `<svelte:window onbeforeunload>` would break B4, and a manual listener would duplicate SvelteKit's.<br>- **"Our own message" means `window.confirm()`.** Callbacks run synchronously (1685), so `confirm()` then `cancel()` works for `link`, `goto` and `popstate`. A styled dialog cannot be awaited, and no prototype draws one. `confirm()` is blocked inside `beforeunload`, so `leave` gets `cancel()` alone.<br>- ⚠️ **The sign-out trap. This is why the guard needed `client.js` read, not ten lines added.** `api.ts`'s `signOut()` clears the session and then calls `goto('/login')`. No `goto` option skips `beforeNavigate`, and whether the form unmounts before the callbacks run is a microtask race. **A guard that asks "discard changes?" when the session is already dead, and lets the user stay on a form that cannot save, is worse than no guard.** The BRD accepts losing unsaved data on timeout (`EA_QMS_BRD_V1_2.md`:2969).<br><br>**On confirm, nothing needs clearing, for a reason that depends on the destination:**<br>- *Another route:* the component is destroyed, and `onMount`'s cleanup removes the callback.<br>- *The same route with another CC* (Back/Forward between records): **the component is reused.** `loadIfChanged()` clears the save message, `load()` unmounts the form, and `setRecord()` rebuilds `form` and resets `incomplete`.<br>- *`leave`:* the document is gone.<br><br>**Proposed shape:**<br>- `beforeNavigate` in the form page, beside `onMount` and `afterNavigate`.<br>- Return early if `!dirty \|\| auth.user === null`.<br>- For `type === 'leave'`, call `cancel()`.<br>- Otherwise, `cancel()` unless `confirm('Discard unsaved changes?')` returns true.<br>- Add `beforeNavigate` to B3's SvelteKit subset, with its reason.<br>- Two decisions to record: the new API, and `confirm()` against decision 59's rejection of `alert()`.<br><br>⚠️ **Also in scope, to decide deliberately:** on a confirmed same-route move, "Unsaved changes" can stay in the bar while the next record loads. The action bar sits outside `{#if loading}`, and `cc` and `form` keep the old values until the response arrives.<br><br>**Checks:**<br>1. A sidebar link while dirty, cancelled (the form and edits stay) and confirmed (you leave).<br>2. Back to List, both ways.<br>3. Browser Back between two records while dirty. Cancelling keeps CC-B with its edits after SvelteKit's `history.go(-delta)`. Confirming loads CC-A with no hint and no stale message.<br>4. A reload and a tab close while dirty show the native dialog.<br>5. A partial date as the only change prompts.<br>6. A forced sign-out while dirty, via `auth.accessToken = 'x'` plus a revoked token in psql, reaches `/login` **with no prompt**.<br>7. A clean form never prompts, including right after a save. | **Closed at 7d+.** Checks 1–7 passed, with check 3 re-run in one document. The "also in scope" item was a defect shipped at 7c, fixed by decision 79 |
| 44 | **Navigating away during an in-flight save still prompts that the changes will be lost.** `dirty` stays true until the response rebuilds `form`, but the PUT has already gone, so the edits may be saved after all | Accepted. It errs false-dirty, the safe direction (decision 72), and the window is one round-trip. Not observed |
| 45 | **`SIGNATURE_NOT_BUILT` is scaffolding in the form page**, standing where `showEsigModal(meaning)` will open. Every caller reaches it only once `submitGate()` has passed, which is exactly the moment the modal should open — so each step replaces the call rather than adding to it. ⚠️ **`tsconfig` has no `noUnusedLocals`, so nothing in the build will notice a leftover.** The flag is the whole mechanism.<br><br>**Count the uses with**<br>`grep -c "?? SIGNATURE_NOT_BUILT" "src/routes/(app)/change-controls/[ccId]/+page.svelte"`<br>⚠️ **Quote the path** — it holds `(`, `)`, `[` and `]`. `??` is literal to `grep`, so no escaping is needed. (`rg '\?\? SIGNATURE_NOT_BUILT' src/` is the same check, but **`rg` is not installed here** — it ships with Claude Code, not with the machine.)<br><br>⚠️ **The command must live HERE and not in the source file.** Twice now a version of this check has counted itself: first a search for the bare name, which matches the comments describing it, and then the command itself, pasted into the very file it counts — that read 4 where there were 3. **A self-counting check is wrong every time.**<br><br>after 8a **2** · after 8b **3** · step 11 **2** · step 13 **0**, when the declaration and both comments go too. Step 9 adds none: T2's Submit arrives already wired | Open, and **the count is observed, not assumed** — 2 at 8a and **3 at 8b**, each confirmed by running the command above. **Closes at step 13**, and steps 11 and 13 each carry it as a check |
| 46 | **"You will be notified" is dropped from three info-banners** — Pending Implementation Approval, In Implementation and Pending Final Approval, each in its non-actor variant. Phase 1 has no SMTP (FR-6.4.1): the Go logs `notification pending` and sends nothing, so the sentence is a promise the system cannot keep for **every** role, not a stylistic divergence. Each banner keeps its heading and a complete, true first sentence, so nothing is invented to fill the gap. Decision 34 set the precedent by dropping the Admin dashboard's "change controls you're involved with" *because it was false*, and decision 43 did the same again — the precedent covers factual claims, not only wording. The prototypes are not edited (flag 1) | Deferred. **Restore all three with FR-6.4.1**, from the prototypes, if SMTP ever lands |
| 47 | ⚠️ **The approver's gate fields have no navigation guard.** An assigned approver can type Decision, Risk Level and Decision Comments, click a sidebar link, and lose all three with **no prompt**. `implDecision` and `finalDecision` are input buffers outside `dirty`, and `beforeNavigate` returns early on `!dirty`. Same class as the gap Lain found during 7d's checks, which became 7d+.<br><br>⚠️ **Folding the buffers into `dirty` is the WRONG fix.** `submitGate()` refuses while `dirty`, so an approver's own typing would block their own submission — every Submit Decision would answer "Save your changes before submitting", for changes that have no save. `dirty` means *unsaved edits to a saved record*, and these fields are never saved incrementally: nothing writes them but the transition itself.<br><br>**A guard for them needs its own predicate** — the buffer differs from the record, evaluated only in the two gate states — kept separate from `dirty` and read by `beforeNavigate` alongside it | Deferred to **step 11**, where the e-signature modal makes those fields worth typing carefully and the design question ("typed but not submitted" vs "unsaved") has to be answered anyway. Decide it there for both gates at once, since step 13 inherits it |

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
| ✅ **A10 audited against `handlers_users.go`** (step 4) | **Checked and found correct**, recorded so it is not re-investigated: Profile is read-only, with no self-update or change-password route. `GET /me` returns exactly `MeResponse`'s four fields. The pencil and the toggle are separate handlers. The status toggle on your own row returns 400. **One defect and one gap are below.** The Dashboard and Approvals notes were audited at step 5 (below) | See the two rows below |
| ⤷ **defect · A10 "hide the role selector for yourself (403)"** | `HandlerUpdateUserDetails` returns **400** `Self Role Change is not allowed`, and only when the requested role *differs* from the current one. Sending your own current role is a 200 no-op. The only 403 is `requireRole`'s `Forbidden`. A step-15 branch on 403 would never fire | **Fixed** in A10 |
| ⤷ **gap · A10 had no sidebar note** | BRD §2.3.4, §9.5.1 and all three role prototypes agree. Every role gets the same five links, there is no API call behind them, and Sign Out sits on Profile, not in the sidebar | **Added** to A10 |
| ⚠️ **`openapi.yaml` — defects 14 and 15**, from the A10 audit | **14:** `PUT /users/{userID}` put self-role under **403**, with the example `You cannot change your own role`. The API sends neither: it returns 400 `Self Role Change is not allowed`. **15:** the 400 on `PUT /users/{userID}/active` gave the example `You cannot deactivate your own account`, but the Go sends `Self Deactivation is not allowed`. It also described only self-deactivation, when the Go returns 400 for a malformed body, a missing `is_active` and a bad user ID too | Both fixed in this copy. **Not yet in the backend's copy** (flag 4) |
| ✅ **B8: "the guard … redirects to `/login` when it is null"** | Applied literally, this logs the user out on **every hard reload**. `auth.user` is null for a valid session until the restore finishes. This is the race step 4's brief warned about | **Amended.** B8 now says to gate rendering, and points to A1.9 |
| ✅ **A1 gap: restoring on load was one sentence in B8** | Three things were missing. `/refresh` returns the same blank-token 400 as `/revoke`, because `HandlerRefresh` validates the body first, so the restore must not call it with nothing stored. A1.2's "return the error; the session stands" has no caller to return to on load. And nothing said what renders in the meantime | **New A1.9** covers the steps, a table of outcomes, and the render gating. The same points are in `.claude/rules/api.md` |
| ✅ **A1.8: "only the scheduled refresh does"** | *Any* successful `/refresh` calls `TouchRefreshToken`, including the one on the 401 path and the restore's. So every hard reload slides the 2-hour window | **Reworded** |
| ✅ **B9: create moved to step 7a+** (decision 27) | Not a defect. B9's table and its "Why this order" text record the reorder, and the progress table above matches | Applied. `CLAUDE.md`'s "seventeen" is flag 19 |
| ✅ **A10's Dashboard and Approvals notes, audited** (step 5) against `handlers_dashboard.go`, `sql/queries/dashboard.sql`, `constants.go`, `main.go` and `HandlerListChangeControls` | **Checked and found correct**, recorded so they are not re-investigated:<br>- one call, behind `middlewareAuth` with no role wrapper<br>- caps of 2, 2 and 5 (`dashboardCardItems`, `dashboardRecentItems`), with the totals from separate `COUNT(*)`s<br>- all five `overview` keys always present: the struct starts at zero<br>- Cancelled excluded from the counts (`WHERE current_state <> 'Cancelled'`) and included in recent activity (no `WHERE`)<br>- the list handler accepts exactly the six state strings, case-sensitive, and anything else is a 400 `Invalid state`<br>- `?state=` takes one value<br>- empty lists are `[]`, never `null`<br>- `last_updated_by_name` is never null: an INNER JOIN on a `NOT NULL` FK<br><br>Checks 2, 4 and 6 confirmed the caps and the overview in the browser. **One defect and one gap are below** | See below |
| ⤷ **defect · "use the dashboard's `pending_approvals` block for either pending state"** | This was in **three documents**: A9.2, A10's Approvals note, and the `types.ts` comment on `ChangeControlListParams.state`. All three agreed, and all three were wrong. **The block is capped at 2 items** (`dashboardCardItems`). A step-11 queue built from it shows at most two records, with no error. Check 4 observed it: a total of 3 over two rows. It is the same shape as the `ValidationErrorResponse` and A1.4 defects: **advice propagated intact between documents, which only the Go could break.** `openapi.yaml` never carried it | **Fixed in all three places.** Each now says to make one call per pending state, and why. Carried to step 11 as flag 21 |
| ⤷ **gap · A10 never said recent activity is system-wide** | Two prototypes imply it is personal: the Admin's empty message ("change controls you're involved with") and the owner prototype's comment ("Shows their CCs"). A10 was silent on it, and on the ordering | **Added to A10:** Overview and recent activity are system-wide, and the two cards and recent activity are all `last_updated_on DESC`. Check 6 confirmed that every role sees identical blocks. The prototypes are not edited (flag 1). Decision 34 drops the clause in the port |
| ✅ **B3, B4 and `.claude/rules/svelte.md`: "`$effect` for mount-only fetches"** | This was a Svelte finding, not a Go one, and it surfaced while planning step 5. An effect tracks synchronous reads inside the functions it calls, and `request()` reads `auth.accessToken` before its first `await`. So the documented pattern would refetch on every token change. **B3, B4 and the rule all agreed**, which again is not corroboration | **Amended in all three**, in the same commit as the code, and the layout moved too (decision 30). Check 7 proved the fix |
| ✅ **A9 re-audited for step 6** against `HandlerListChangeControls`, `parsePagination` and **both** queries in `change_controls.sql` | A9 was already audited at step 2, for sort and pagination. This round checked only what that pass did not: **the exact parameter names the handler reads, and what it does with an invalid value.** **Checked and found correct**, recorded so they are not re-investigated:<br>- `created_after` is `>=` and `created_before` is `< date + INTERVAL '1 day'` — **both inclusive**, as A9.2 said<br>- `search` is three columns: `cc_id`, `change_title`, `owner.full_name`<br>- `ListChangeControls` and `CountChangeControls` carry an **identical `WHERE`**, which is what makes A9.1's "`total` is the count matching the filter" true<br>- `state` is case-sensitive over the six `constants.go` strings; `?state=A&state=B` silently takes the first<br><br>**One gap and one backend defect are below.** The invalid-value behaviour is now in A9.1 and A9.2 in full | A9.1 and A9.2 amended |
| ⤷ **gap · A9.2 never said a non-`me` `owner` is silently ignored** | It said `?owner=me` and `?assigned=me` are "flags resolved server-side", which is true and says nothing about any other value. `q.Get("owner") == "me"` is **exact and untrimmed**, so a UUID, `ME` or `" me"` leaves the filter unapplied and returns the **unfiltered** list with `200 OK`. This is the same failure mode A9 already called out for `?is_active=` on `/users` — and here it is worse, because the page is *titled* "My Change Controls". Drove decision 37 | **Added to A9.2 and to `types.ts`.** Check 7 proves the defence |
| ⤷ **gap · A9.2 never said the two filters are disjoint by role** | The bigger half of flag 20, and **Lain found it, not me** — I had proposed a role-gated dropdown that offered an Approver "Owned by me". `requireRole` is exact equality, `POST /changecontrols` is CC-Owner-only, and **no `UPDATE` reassigns `change_owner_id`**, so the owner is always the creator and an Approver can never own one. `handlers_cc.go` says it outright: *"The single-role model means an owner can never appear here."* | **Added to A9.2**, with the reasoning, so the dropdown is not reinvented |
| ⚠️ **BACKEND defect — unescaped `ILIKE` pattern.** Flag 24 | Found in the same audit. Not a frontend fix; see the flag | Recorded in A9.2 and `types.ts` |
| ⚠️ **`FRONTEND_BLUEPRINT.md` B3 and `.claude/rules/svelte.md`: `afterNavigate` alone does not fire on load.** **A reversal of step 6's own approved plan, caught while writing the code** | The plan said the fetch would use `afterNavigate` and **not** `onMount`, on the stated grounds that it "fires once per navigation including the initial mount". That is true of SvelteKit in general and **false in this app**. `afterNavigate` registers its callback through `onMount` (`client.js:add_navigation_callback`), and the initial `type: 'enter'` is dispatched **during hydration** (`client.js:739`) to whatever is registered at that moment. Every `(app)` page is gated behind `auth.user`, which stays null until the restore resolves `/refresh` and `/me` — long after hydration. So the component is created *after* `'enter'` and never receives it: **a hard reload would have sat on "Loading…" for ever, with nothing in the console.** The same gating is why step 5 needed `onMount`; the interaction was not obvious from either fact alone | **Fixed before it shipped** — `onMount` **and** `afterNavigate`, both calling one `loadIfChanged()` keyed on the query string, so the ordering stops mattering (decision 44). B3, the SvelteKit subset and the rule file all carry the pairing and the reason. Check 2 proves it |
| ⚠️ **`.claude/rules/svelte.md` and B3: naming a variable `state` shadows the `$state` rune** | Not a document defect — an undocumented trap, hit while writing the list. `const state = $derived(...)` makes every later `$state(true)` compile as a **store subscription on that variable**, and svelte-check reports `Cannot use 'state' as a store` **against the `$state` lines**, not the declaration. Four errors pointing at the wrong place. The filter is now `stateFilter` | **Added to both**, with the error text so it is recognisable, and extended to `props`, `derived`, `effect` and `inspect` |
| ⚠️ **`openapi.yaml` was right about `/dashboard`** | Its caps (`maxItems` 2, 2, 5), the "role-blind" description, "system-wide" on `recent_activity`, and a single-value `state` all match the Go | **No spec change.** The defect count stays at fifteen |
| ✅ **A11 audited** (step 7a) against `HandlerGetChangeControl`, `toChangeControlResponse`, `GetChangeControlByCcID` and a sweep of every `_name"` JSON tag in `handlers_*.go` | **Checked and found correct:**<br>- The owner and updater names are INNER JOINs on NOT NULL keys, and never null.<br>- The approver and both approval-by names are LEFT JOINs, null exactly when their id is.<br>- Names are not unique (the only UNIQUE is on `email`), and they can change (`PUT /users`).<br>- The approval-by pairs are set on approve only.<br><br>**One defect and two gaps are below** | A11 rewritten |
| ⤷ **defect · "Every reference comes as a pair"** | A universal claim, and false in two responses: `SignatureItem.signer_name` and `DashboardActivityItem.last_updated_by_name` carry a name with no id. Pairs exist on the change-control shapes only | Fixed in A11 |
| ⤷ **gap · two name lifetimes on one screen** | The CC names are live joins, and `signer_name` is a snapshot (BR-8.8.5). After a rename, the form and its Signature History disagree, by design | Added to A11. Not yet observed (flag 29) |
| ⤷ **gap · `last_updated_by` "after a rejection"** | True but too narrow. Both saves, the upload and every transition set it to the caller | A11 and `types.ts` |
| ✅ **A5 audited for display** (step 7a) against `002_change_controls.sql`, the `ChangeControl` model and `lib/pq` | **Correct:**<br>- A DATE marshals as UTC midnight (A5.1).<br>- A TIME marshals with the `0000-01-01` placeholder (A5.2), **observed live at check 6**.<br><br>**Gap:** A5 had no display rules, and passing a DATE through `new Date()` is a trap invisible from +04:00. Also, `actual_closure_date` is a TIMESTAMPTZ despite its name | **New A5.5**, plus the rule file's Dates section. The San Francisco override proved it |
| ✅ **A10's CC-form note** (step 7a) | "Editable, read-only **or hidden**" is superseded: nothing is hidden except `cancellation_reason` (decision 51). The P5 departure is recorded. **Gap:** T2 and T6 clear nothing, so a rejection's values stay on the record beside a Not Submitted status, and they pre-fill the approver's reopened gate. At the implementation gate those are Decision, Risk Level and the comments; at the final gate, Final Decision and its comments | A10 rewritten, and `types.ts` comments on `decision` and `final_decision`. Not yet observed (flag 28) |
| ⚠️ **`openapi.yaml` defect 16, also in `types.ts`** | "A record in `Initiated` has no signatures". T5 returns a record to `Initiated` carrying its T2 and T5 signatures | Both fixed. **Not in the backend's copy** (flag 4) |
| ✅ **B9's 7a row: "render all 24 fields as text"** | Wrong twice over for the settled architecture: the fields are disabled controls, and the response has 55 keys, not 24. The 13 row also carried the signature panel | Both rows amended (decision 49) |
| ⚠️ **The step brief contradicted four documents on `cancellation_reason`** | The brief said the reason belonged in the modal only. BRD Rule P6, the Security Matrix note, `CC_Field_Reference` #50 and the Cancelled prototype all display it on the Cancelled form. **The documents were right**, and none needs amending | Decision 51 |
| ⚠️ **REVERSAL · "CC-007's timestamps were edited outside the API". My finding, retracted before it became a flag** | **The mistake.** I compared CC-007's record against an eight-signature history pasted in the brief under CC-007's heading. The history was **CC-005's**: psql matched its first and last `signed_on` to CC-005.<br><br>**The sweep.** A read-only sweep of all 14 records then tested every invariant the Go guarantees:<br>- the state agrees with the last signature<br>- `created_on` precedes the first signature, and `last_updated_on` follows the last<br>- the approval On and By values equal the T4 and T7 signatures<br>- closure equals final approval<br>- the upload falls between T4 and T6<br>- `created_on` follows `cc_number` order<br><br>**All hold on every record.** CC-007 is `T2>T4>T6>T7`, and the record rejected at both gates is CC-005. Lain's check 2 confirmed it in the browser | **No data problem.** **The lesson:** a finding built on pasted evidence is checked against the database before it becomes a flag. Pasted evidence can be mislabelled, and the conclusion inherits the label |
| ✅ **`CreateChangeControlResponse` and `openapi.yaml`'s `POST /changecontrols`**, audited at step 7a+ against `HandlerCreateChangeControl`, `CreateChangeControl` in `change_controls.sql`, the schema defaults and `main.go` | **Checked and found correct**, recorded so they are not re-investigated:<br>- There is no request body.<br>- **201**, with the eleven fields named and typed as in `types.ts`. Only the order differs.<br>- `Initiated` and `Not Submitted` ×2 come from column defaults. `cc_id` is `GENERATED ALWAYS`.<br>- The 401, 403 and 500 responses match the spec.<br><br>Check 1 confirmed the eleven keys live. Defect 4's fix at step 2 holds | **No change.** The defect count stays at sixteen |
| ✅ **A3 audited for the first time, with A5's write direction** (step 7b) against `HandlerSaveDraft`, `google/uuid`'s `ParseBytes` and `ListActiveCCIDsForUser` | What proved correct is in the 7b checkpoint. **One defect and four gaps are below** | A3, A5.1, A5.2, B6 and `api.md` amended |
| ⤷ ⚠️ **defect 17 · `""` is a 400 on `assigned_approver_id` too** | Every document said `""` fails only on dates and times. `json.Unmarshal` into `*uuid.UUID` reaches `ParseBytes`, whose length switch has no case for 0, giving 400 `Assigned Approver ID must be a UUID or null`. The select's "Select Approver" option produces exactly `""`. **Seven copies, all in agreement:** `openapi.yaml` (the `info` note and `SaveDraftRequest`), `types.ts`, A3, A5.1, B6, `api.md` and CLAUDE.md trap 5. **Agreement again was not corroboration** | **Fixed in all seven** (decision 64). **Not in the backend's copy** (flag 4) |
| ⤷ **gaps · A3 was silent on four behaviours** | **An empty body is a 400**, `No fields to update`. **The check order**: parse, empty, unknown keys (400), not found (404), not owner (403), not Initiated (409), so a non-owner sending a bad key gets 400. **Text and enum values are trimmed**, whitespace-only becomes `null`, before the length and enum checks. **A no-op save is 200** and does not move `last_updated_on` (the spec already said so) | Added to A3 |
| ⤷ **gap · A5.2 and the time input's `step`** | `<input type="time">` yields `HH:MM` only without `step`. With one, `timeOutput` builds invalid RFC 3339 and every save 400s, loudly | Added to A5.2 and `api.md` |
| ✅ **B9's 7b row: "the eight selects"** | The page has eleven selects, seven in the owner's Initiated slice | Amended |
| ✅ **A2 audited for the first time, with the query behind A3** (step 7c), against `HandlerSaveDraft`, `UpdateChangeControlDraft`, every `GetChangeControlForUpdate` call, both submit handlers and the five transition structs | What proved correct is in the 7c checkpoint. **One defect and five gaps are below** | A2, A2.1, A3, A8.1, B6 and B9 amended; `api.md` and the `types.ts` Signatures header carry the same |
| ⤷ ⚠️ **defect · "Transitions carry no field values"** | A universal claim, true of T2 and T6 only. `CancelRequest` carries `cancellation_reason`; `DecisionRequest` carries `decision`, `risk_level` and `decision_comments`; `FinalDecisionRequest` carries `final_decision` and `final_comments`. **Four copies:** A2's opening sentence, B6, the `types.ts` Signatures header and CLAUDE.md trap 2. `openapi.yaml`'s three are each scoped to T2 or T6, and are right | Fixed in A2, B6, `types.ts` and **CLAUDE.md trap 2**, the last at Lain's direction and in wording only (flag 40) |
| ⤷ **gap · a submit silently ignores field values** | Both submit handlers decode into `{Email, Password}` with no `DisallowUnknownFields`. A body carrying fields is not a 400: the fields are dropped and the stored values validated. Nothing server-side catches a submit of unsaved edits | Added to A2 and `api.md`. This is why step 9's dirty gate is the only guard |
| ⤷ **gap · saves and transitions serialise** | Every writer to `change_controls` takes `FOR UPDATE` first: both saves, all five transitions and the upload. That is what makes the missing `WHERE current_state` in the `UPDATE` safe | Added to A2 |
| ⤷ **gap · A2.1 omitted the assignee check at save** | Save verifies that the approver exists, is active and holds the Approver role, each a 400. T2 checks presence only | Row added to A2.1 |
| ⤷ **gap · A3's "the whole form is fine", and the mechanism** | False in two observed cases, checks 3 and 12 (decision 65). And "absent means unchanged" comes from the handler's seed, not the query, which assigns all 24 unconditionally and runs only when something changed | A3 rewritten |
| ⤷ **gap · a save's value errors, and atomicity** | A bad value stops at the first failing field and returns a plain `ErrorResponse`; only unknown keys give `issues`. A8.1 implied the save endpoints' 400s take the `issues` shape. Every 400 rolls back audit rows already inserted, which check 8 observed | A3, A8.1 and `api.md` amended |
| ✅ **B6 and `api.md`: `form.change_title.trim() \|\| null`** | The example trimmed on the client. Flag 32 had already found that Go's `TrimSpace` and JavaScript's `trim()` disagree on U+0085 and U+FEFF, and 7c decided against a client trim. The example is what a writer copies | Both now show `'' → null` with no trim, and say why |
| ✅ **B9's 7c row: "the 400 `issues` shape"** | A save's `issues` lists only unknown keys, which a body built from `SaveDraftRequest`'s keys cannot contain. The step proves the plain 400 | Amended |
| ⚠️ **`.claude/rules/api.md` never loaded for a file that calls the API** (found at 7c) | Its `paths` frontmatter has been unchanged since the project-setup commit, and listed only `api.ts`, `types.ts` and `auth.svelte.ts`. **Six files import from `api.ts`, and none was in scope:**<br>- the login page (step 3)<br>- the `(app)` layout and Settings (step 4)<br>- the dashboard (step 5)<br>- `ChangeControlList.svelte` (step 6)<br>- the form page (7a onward)<br><br>So **from step 3 on, every screen that talks to the API was written without the API rules loaded**. That covers the 401 exemptions, the three-member error union, the date formats and `'' → null`. **Nobody noticed for five steps, because every plan read the blueprint first.** The write-time mechanism was not doing its job, and nothing told us it wasn't. It surfaced only because 7c added a section meant for the form page and asked where it would load. `svelte.md` was checked in the same pass: its `src/**/*.svelte` and `src/**/*.svelte.ts` already cover every component and the store | **Fixed:** `src/routes/**/*.svelte` and `src/lib/components/*.svelte` added to `api.md`'s `paths`. **Lesson:** a rule file's `paths` are a claim about where the governed code lives, and they go stale silently when that moves. Re-check them whenever a new kind of file starts doing what the rule governs |
| ⚠️ **The prototype and the BRD disagreed on Save Draft** | `cc-form-initated-state.html` links Save Draft to My Change Controls, while BRD US-CC-02 keeps the record on screen and editable. **The BRD was right.** The prototype is a static mock, and it is not edited (flag 1's reasoning) | Decision 69 |
| ✅ **B9: the navigation guard added as step 7d+** (decision 76) | Not a defect. B9's table gains a 7d+ row, and "Why this order" gains a paragraph, as 7a+ did. **The count, "Eighteen", now reads "Nineteen"** and names its counting rule: the seventeen numbered steps, with 7 split into 7a–7d, plus 7a+ and 7d+. Without the rule the number looked wrong, since the table has 22 rows. A sweep found no other live count. Flag 19 and the 7a+ row above mention it only as history | Applied, and the progress table matches |
| ✅ **"Submit must be disabled while dirty"** (found at 7d): blueprint A2, `.claude/rules/api.md` and CLAUDE.md trap 2 | Not a Go finding. **The rule prescribed something `global.css` cannot render.** It has no `.btn:disabled`, so a disabled Submit looks enabled and a click on it says nothing. **All three agreed**, and none had checked the stylesheet | **Amended in all three:** Submit is refused, with a message, at click time and again before the POST (decision 74). Trap 2 changed in wording only. **`api.md` had also stated the partial-date rule twice**, once from 7c and once added at 7d, so the two bullets are merged into one |
| ⚠️ **DEFECT IN SHIPPED CODE, since 7c: Save Draft stayed clickable while the form reloaded.** Found while planning 7d+, not by any check | **Cause.** `load()` set `loading` but left `cc` and `form` holding the previous record. The action bar sits outside `{#if loading}`, so `canSaveDraft()` stayed true, and Save Draft stayed live against a record the form no longer showed. **The staleness check could not catch it.** `saveDraft()` reads `mine = latest` at click time, after `load()` has incremented it, so its response counts as current.<br><br>**Two paths reached it:**<br>- **A 409's reload.** `HandlerSaveDraft` has one 409, "not Initiated" (`handlers_cc.go:528`). So a second click drew another 409 and another reload, and wrote nothing.<br>- **Back or Forward between two records while a load was in flight.** The click sent the previous record's edits to the previous CC-ID. If that response landed after the load's, `setRecord()` put the previous record on screen under the new URL, and later saves targeted it.<br><br>**Nobody noticed.** No check clicked Save during a load, and loads are fast locally | **Fixed at 7d+** (decision 79). Check 3 exercised the clearing under throttling. The 409 path, check 8, was skipped |
| ✅ **Flag 43's `client.js` premises, re-read at 7d+** | **Held:** `leave` through SvelteKit's `beforeunload` (2662–2690) · synchronous callbacks (1685) · `history.go(-delta)` on a cancelled `popstate` (2922) · registration in `onMount` (2240). **Two refinements:**<br>- **The sign-out "microtask race" has a precise cause.** `navigate()` awaits `get_navigation_intent` before `_before_navigate`, so a `goto` never reaches the callbacks in the same tick. The conclusion is unchanged.<br>- **The return pop after a cancel exits at 2877** (`history_index === current_history_index`), not through the `shallow` branch, as the 7d+ plan said. Also unchanged: no second prompt, which check 3 observed.<br><br>**New:** callbacks are skipped while a navigation is in flight (`is_navigating`) | No document carried the two refinements. B3 and `svelte.md` state only the conclusions |
| ⚠️ **7d+ plan, check 3: "open two records in sequence"** | **My wording, and it allowed an address-bar navigation.** A typed URL is a new document. Back from it is cross-document, so the browser restored CC-023 from bfcache: no script, no request, no `load()`. The run looked like a failure of the fix and tested nothing. SvelteKit's `pageshow` listener (2970) only resets `navigating` | Re-run in one document and passed. **Lesson: a check that depends on client-side routing must say how to navigate, not only where to** |
| ✅ **B3's SvelteKit subset regrouped** (decision 77) | Not a defect. The subset had grown by appending, first `afterNavigate` and now `beforeNavigate`. It is now grouped by job, with a "Not used" line. The brief counted `onMount` as a subset addition, but it is Svelte's and sits under Runes | Applied, with `.claude/rules/svelte.md` in step |
| ✅ **A7 audited for the first time, and A10's role notes** (step 8a), against all five signed transitions, `HandlerSaveImplementationDetails`, `UpdateImplementationDetails`, the four approve/reject queries, `constants.go`, `main.go`'s route table and **BRD SC-5** | **Checked and found correct**, recorded so they are not re-investigated:<br>- **A7.1** — all five request structs carry `email`/`password`; no username anywhere<br>- **A7.4's core claim** — the signature is checked last in **all five**, not only T2/T6<br>- **A7.5** — seven meaning constants, one per transition, already ASCII-hyphenated<br>- **A10's MANDATORY table**, re-counted: T2 = 20, T4/T5 = 3, T6 = 5 (`deviations_from_plan` genuinely absent), T7/T8 = 2<br>- **A10's leftover-rejection note** — T2 and T6 set only state, status, updater and timestamp; the reject queries leave the approval By/On columns untouched<br>- **The implementation save's mechanics** — `json.RawMessage` map, seed from the locked row, `changed` flag, and the seed covers **5 of 5** columns<br>- **The audit coverage matches BRD SC-5 exactly** — see the withdrawn finding below<br><br>**Two gaps became new sections, and three claims were refined.** Below | A7.3–A7.5 amended; **A7.6 and A7.7 added**; A10 and A3 amended; `api.md` gains a Transitions section and `svelte.md` a rewritten Permissions section |
| ⤷ ⚠️ **gap · A7 never said authorisation is by RECORD, not by role** (new A7.6) | **The finding that drove the whole step.** No transition route carries `requireRole` — `main.go` mounts all five behind `middlewareAuth` alone. T2/T3/T6 compare `change_owner_id`; T4/T5/T7/T8 compare `assigned_approver_id`. **So an Approver who is not this record's assignee gets 403 `Forbidden`.** The Security Matrix's "Approver" column is a *role*, so following it literally would have enabled the gate for all three seeded approvers and offered two of them an action that cannot succeed. **The Matrix and the API disagree, and nothing said so.** Same class as decision 61's "ownership, not role", now needed three more times | New A7.6 with the check table; A10 gains the column → predicate mapping; `svelte.md`'s Permissions section leads with it. **Check 2 confirmed it in the browser** |
| ⤷ ⚠️ **gap · A7 was silent on the response** (new A7.7) | All five transitions return **200 with the full `ChangeControlResponse`**, re-fetched inside the transaction through the same query `GET /{ccID}` uses, with the five user joins, **before the commit**. So a caller sets the record from the response and **must not refetch** — which steps 9, 11 and 13 each need and none of them would have found in A7 | New A7.7; `api.md`'s Transitions section |
| ⤷ **refinement · A7.4's order is not one order** | The claim holds for all five, but "presence" means two different things. **T2 and T6** validate the *stored row*: 404 → 403 → 409 → presence → signature. **T3, T4/T5, T7/T8** validate the *body*, and those checks run **before the transaction opens**, so they precede the 404, 403 and 409. An approver submitting blank comments on a record that has moved on gets the 400, not the 409 — so a 400 does not prove the record is still in the state you think. Same class as the A3 check-order gap found at 7b | A7.4 rewritten with both orders |
| ⤷ **refinement · A7.3 never named the 401 body, and "an audit row" is not always true** | All five send **`Invalid credentials`** — the exact string `request()` branches on (decision 13), and A7 is what step 9 reads. Two mechanics added: the `SignatureFailed` row is written with `cfg.db`, **not** the transaction, so it survives the rollback, and a failed audit insert is logged while the handler still returns 401. ⚠️ **But a password-verification *error*, as opposed to a mismatch, is a 500 with NO row** — so a 500 from a transition is not a signature failure | A7.3 rewritten |
| ⤷ **refinement · A7.5's "fixed meaning string" is per TRANSITION, not per endpoint** | The two decision endpoints each cover two transitions and pick the meaning from the submitted `decision` / `final_decision`. So the modal's meaning must follow the user's choice live. Both approver prototypes hardcode the approve string | A7.5 gains the four-row table. Steps 11 and 13 |
| ⤷ ⚠️ **gap · the `In Implementation` slice is 6 in the Matrix but 5 on the endpoint** | `implementation_evidence` is editable and mandatory at T6, but it is **not** in `implementationEditableFields`. Sending it draws 400 `Some fields cannot be edited in the In Implementation state` with `issues: ["implementation_evidence"]`. It goes through `POST …/files/implementation_evidence`, which does its own owner and state check. **So the state has two writers**, and a body built from `SaveImplementationRequest`'s keys cannot reach the wrong one | A10 and A3; `api.md`'s new second-save section |
| ⤷ **gap · A3 never described the second save endpoint at all** | Same machine, different whitelist. Unknown keys before the transaction (so a non-owner with a bad key gets 400, not 403), trimming, `""` → `null`, a no-op that writes nothing and does not move `last_updated_on`, the re-read before the commit. **No business rules** — any date is accepted, and "not in the future" is T6's. `actual_implementation_date` is a DATE column taking **RFC 3339** | A3 |
| ⤷ ⚠️ **REVERSAL · "the implementation save writes no audit rows" — my finding, escalated by Lain, then withdrawn by me** | I reported zero `InsertAuditLog` calls in `HandlerSaveImplementationDetails` against three in `HandlerSaveDraft`, and flagged it. Lain directed me to escalate it to a **backend compliance defect** ahead of flag 24. **Checking the BRD first showed it is neither.** SC-5 (`EA_QMS_BRD_V1_2.md`:208) names the nine critical fields, and **none of the five implementation fields is among them**; all nine *are* audited — three in the draft save (each marked `// audit-tracked (BRD §6.6.2)`), three at T4/T5, two at T7/T8, one at T3. The upload has its own trail: `file_attachments.uploaded_by_id` and `uploaded_on`, both `NOT NULL`. **The handlers implement SC-5 exactly.**<br><br>**The lesson:** I framed an absence as a gap without checking what the specification asked for. "Compared to the other handler" is not a standard; the BRD is. Whether SC-5's list is too narrow is a BRD question, and the BRD is a controlled document | **No defect.** Flag 24 stays alone at the front of the backend queue. Recorded in A3, with the consequence that a psql check must expect **no** `audit_logs` row after an implementation save. ⚠️ Also recorded: the approver's audit row uses `field_name = 'assign_approver'`, **not** the column name |
| ⚠️ **`Security_Matrix_V2_1.md` has no `Cancelled` table** | Five state tables, and Cancelled is not one of them; only the closing Notes mention it, and then only about `cancellation_reason`. Nothing editable in Cancelled was inferred rather than read. **Lain wrote the Matrix, so this is for Lain to decide** — the inference is almost certainly right, and the document does not say it | Not amended. Raised, not assumed |

---

## Carried over from the backend phase

Things already known that the frontend has to respect. Do not re-derive these.

| | |
|---|---|
| **API** | Complete. 23 endpoints, unchanged during this build |
| **Enum values** | ASCII hyphens, not en-dashes. Take them from `docs/openapi.yaml` |
| **Save then submit** | ⚠️ **Both halves of this row were wrong and are corrected.** Only **T2 and T6** carry no field values — T3, T4/T5 and T7/T8 carry their own (flag 40, found at 7c). And Submit is **refused at click time with a message, never `disabled`**, because `global.css` has no `.btn:disabled` (decision 74, found at 7d). The point stands: save before you submit |
| **`openapi.yaml`** | Hand-written from the handler code — a transcription, so **not infallible**. If a response disagrees, check the Go handler and fix the spec. **Seventeen defects found so far**: six at step 2, three more on a second reading of the same file, two in the A1 audit, two in step 3's sweep of every 401, two in step 4's A10 audit, one in step 7a's audit (the empty-signatures sentence), and one in step 7b's A3 audit (`""` on `assigned_approver_id`) — so treat this as a live warning, not a formality. **The count keeps rising because the checking keeps going**, not because the spec is unusually bad |
| **The backend source is on disk** | `../ea-qms-backend` — `handlers_*.go`, `sql/queries/`, `sql/schema/`, `constants.go`, `middleware.go`, `main.go`. The real authority; every finding so far was confirmed against it rather than assumed. **Read the handler before believing the spec.** Now also in `CLAUDE.md`, which loads every session — `PROGRESS.md` alone was the wrong place for it |
| **Rule 7 — verify before each step** | `CLAUDE.md` carries the **section map**: which Part A sections each step depends on, and which Go files to check them against. Corrections go into `.claude/rules/` too, since that is what loads at write time — the blueprint does not |
| **Why rule 7 exists** — the evidence, kept here so `CLAUDE.md` can stay at the instruction | **Part A has been checked in patches, not as a whole.** What has been checked produced **fifteen `openapi.yaml` defects** and **four blueprint claims that would have shipped**: A1.4's "logging out never fails", A1.2's missing 401 exemption, at step 3 the same exemption's missing e-signature case, and at step 5 A9.2 and A10's advice to use the capped `pending_approvals` block as a queue. The rest of Part A is unverified prose **that reads exactly as confidently as the parts that were wrong.** Nothing found so far was an obvious error; three were *omissions*, which skimming cannot surface — hence "check each claim", not "review the section" |
| **Audit status of Part A** | ✅ **A1** (step 3, plus the e-signature 401 found while building it, and the restore-on-load path at step 4), **A8** and **A9** done — **A9 twice**: sort and pagination at step 2, then the filter parameter names and invalid-value behaviour at step 6, which found two gaps and a backend defect in a section already marked done. ✅ **A10**: the user-management and profile notes at step 4, and Dashboard and Approvals at step 5. ✅ **A12** was audited before step 3, and amended there: the trap is narrower than stated (see the corrections table). ✅ **A5** for display, **A10**'s CC-form note and **A11**, all at step 7a. ✅ **A3** and **A5**'s write direction at step 7b, which found defect 17. ✅ **A2** at step 7c, with the query behind A3, which found one defect and five gaps. ✅ **A7** at step 8a — the first audit, and the one that found the Security Matrix and the API disagreeing about who may act (A7.6); **A10**'s role notes and **A3**'s second save endpoint went with it. ⚠️ **`openapi.yaml` was NOT checked against A7's claims this round** — the audit ran blueprint-against-Go, so the spec-defect count stands at seventeen by omission, not by clearance. ⬜ **A6** (12, 14) is the last section outstanding. **A13 deliberately excluded** — it summarises what other sections state, so auditing it re-checks claims through a second document instead of against the Go |
| **Two rationales trimmed from `CLAUDE.md`'s map** | **A6** — it claims the PDF type is verified by inspecting the file's bytes, so check `file_sanitizer.go`, not just `handlers_files.go`; that is where the claim lives or fails. **A12** — it claims a blocked request still reaches the server *and executes*. Verify before relying on it: it decides whether a failed write needs re-checking in psql, or can be assumed not to have happened. **Resolved at step 3:** a CORS block never executes a write, but status 0 on a write can still hide a commit, through a dropped connection rather than CORS. See the corrections table |
| **`src/lib/types.ts` outranks the spec** | For shapes, nullability, enum values and field-level traps — it is the most verified document here. **Not** for flow, auth lifetime or handler internals, where it is silent rather than brief. In `CLAUDE.md`'s precedence list at position 1, below the Go itself |
| **Untested** | ~~`global.css` inside a Svelte component~~ — **proven at step 1** · the activity-gated refresh (step 16), still open |
| **No password reset — a KNOWN Phase 1 limitation, not a defect** | `password` appears only in `POST /users`. `PUT /users/{userID}` does not accept one, so **there is no reset path for any role, Admin included**, and email is `UNIQUE` so a locked-out user cannot simply be re-created. ⚠️ **This is deliberate. Lain left it out of Phase 1 knowingly, and a direct DB update is the fallback** if anyone is ever locked out. It is recorded here, and **not as a flag**, because a flag would imply it was missed. This is also why decision 11 dropped "Forgot password?" — there is nothing the link could do, and the drop is correct |
