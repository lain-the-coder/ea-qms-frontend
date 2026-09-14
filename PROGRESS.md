# Frontend — Progress

Read this at the start of every session. Update it at the end of every build step,
once the step has been verified.

---

## Status

**Current step:** 7a+, Create. **Verified, awaiting commit.** Next: step 7b (bind the fields)
**Last verified:** Step 7a+. A triple-click on Slow 3G sent **one** POST, and a forced 401 retry created **one** record, not two. See the checkpoint

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
| 7b · Bind the fields | ⬜ | |
| 7c · Save Draft | ⬜ | |
| 7d · Dirty tracking | ⬜ | |
| 8 · `Initiated` role views | ⬜ | |
| 9 · T2 submit + e-signature modal | ⬜ | |
| 10 · T3 cancel | ⬜ | |
| 11 · Approver flow (T4/T5) | ⬜ | |
| 12 · `In Implementation` + file upload | ⬜ | |
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
| 5 | **Step 7b needs a date/time conversion helper, both directions.** `<input type="date">` reads and writes `YYYY-MM-DD`; every date *write* field on the API takes RFC 3339 (`"2026-09-01T00:00:00Z"`) and rejects the bare date with a 400. `<input type="time">` is `HH:MM`; the TIME fields round-trip as `"0000-01-01T09:00:00Z"`. So **four functions**: date→input, input→date, time→input, input→time, each mapping `null` ↔ `''` — because `null` clears a field and `''` is a parse error. Five fields need it: the four in `SaveDraftRequest`, plus `actual_implementation_date` in `SaveImplementationRequest` at step 12 | **Half built at 7a.** The read direction is `dateInput` and `timeInput`, inline in the form page (decision 57), and the timezone check proved it. **The write direction is deferred to 7b**, where the bindings land and it can be tested. Recorded now because the failure is invisible until then: TypeScript types all five as `string`, so the wrong format compiles cleanly and 400s at runtime. **The list filters are the exception** — `created_after` / `created_before` take `YYYY-MM-DD` and must NOT go through the helper |
| 6 | **`file:line` references go stale whenever the backend changes.** A1 was audited *after* the six backend changes and still cited `main.go:96-98` for routes that had moved to 130-132. So this is a class of problem, not one instance. Step 3 fixed A1's by naming the function instead: "`middlewareAuth`'s `is_active` check", not `middleware.go:69`. **Not yet swept:** `types.ts`, the rest of Part A, `openapi.yaml`, `.claude/rules/` | Deferred. When swept, replace a reference with the function name wherever it names something stable. Keep `file:line` in this file's historical entries, where it records evidence as it stood at the time |
| 7 | **`request()` branches on 401 message *strings*.** It retries only on `Unauthorized` and ends the session on `Account is deactivated` (step 3). The coupling to `middlewareAuth`'s wording fails safe: if the wording changes, the retry stops firing and an expired token shows as an error, never as a wrongful logout. **What would remove it:** a machine-readable error code on error responses | Deferred. It changes a completed API. If it is ever done, `request()` switches to the code and its two message constants are deleted |
| 8 | **Concurrent refreshes are not deduplicated.** Two parallel 401s fire two `/refresh` calls | Harmless while refresh tokens are not rotated, since both calls succeed. Revisit only if step 5's Network tab shows duplicate refreshes. **Step 7a's form is the first page to send two authenticated requests in parallel**, the record and its signatures, so an expired token there fires two `/refresh` calls |
| 9 | **`X-Instance-ID` is readable but not captured** | Check 4 proved it is exposed, but nothing needs it until a screen shows A8.2's generic 500 message. Add it to `ApiResult`'s failure branch then, not before |
| 10 | ⚠️ **BACKEND_CHANGES §6 is probably wrong: a timeout most likely reaches the browser as a network error, not a 500.** This is inferred from how `net/http` works, not observed. `WriteTimeout`'s connection deadline starts when the headers are read. `middlewareLogging`'s 30 s context starts slightly later, so the write deadline passes first and the handler's 500 can't be flushed. The server **log** still says 500, because `responseRecorder` records the status the handler attempted. That is probably where §6's claim came from | **Unverified, because check 7 was skipped.** `api.ts` handles both outcomes (status 0 and 500). To prove it: run `BEGIN; LOCK TABLE users IN ACCESS EXCLUSIVE MODE;` in psql, sign in, watch the Network tab at about 30 s, then `ROLLBACK;`. If confirmed, amend §6 |
| 11 | ~~`request()`'s retry-then-signature branch has not run~~ **Closed at step 3.** After a reload on CC-008: `/decision` 401 (no bearer) → `/refresh` 200 → `/decision` 401 `Invalid credentials`. The error was returned to the caller, the session was kept, and one `SignatureFailed` row was written. See the step 3 checkpoint | Closed |
| 12 | ~~**The restore's failure branch and its Retry are unproven.**~~ **Closed at step 6**, check 13 — one outage proved all three branches it had accumulated. Service stopped and a filter changed: the header and filter bar stayed and the table was replaced by "Could not reach the server" (**the list's error branch**). Service restarted and a filter changed again: the table returned **with no reload**, which is `lastQuery = null` on failure working. Reloading during the outage: the layout's error and Retry, sidebar still rendered, content gone (**the restore's branch**). Open from step 4 to step 6 | Closed |
| 13 | **`request()`'s refresh-failure branch hasn't run since the `isTokenVerdict` swap.** The change is a one-line predicate swap and it type-checks. The restore's use of the same predicate passed three checks | To prove: while signed in, revoke the token in psql. Then in the console run `(await import('/src/lib/auth.svelte.ts')).auth.accessToken = 'x'`, then `await (await import('/src/lib/api.ts')).request('GET', '/me')`. Expect `/me` 401, then `/refresh` 401, then `/login` showing "Your session ended" |
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
| 25 | **Step 8: why a field is disabled, and placeholders** (decision 56). The proposed shape:<br>- **A `.section-note` per section.** The prototype already has "These fields will become available once the change is approved for implementation".<br>- **A `.field-hint` under a control** where the section note is not enough. It is the same class as "Optional (recommended for IT changes)".<br>- **Never replacing the control.**<br>- **Placeholders on enabled fields only**, with the prototype's text.<br><br>Asterisks are already done (decision 58) | Deferred to step 8, where enabled fields first sit beside disabled ones |
| 26 | **The approver select must keep the current assignee as an option** once 7b or step 8 loads it from `GET /approvers`. That endpoint returns active approvers only. An approver can be deactivated while assigned to a Closed record, because the 409 covers active records only. Without the option, the select renders blank | Decide at 7b or step 8, whichever loads `/approvers` |
| 27 | **7c cannot save through disabled inputs, and `editable()` returns false until step 8.** 7b's plan must say which slice of `editable()` it enables first, most likely the owner's 24 fields in Initiated | Decide at 7b |
| 28 | **The leftover rejection values and defect 16 have not been observed.** No seeded record is in a state that shows them: a read-only query returned 0 rows.<br>- **At step 11, after a T5:** Decision still reads Reject beside Not Submitted, and Signature History is not empty in Initiated.<br>- **At step 13, after a T8:** Final Decision still reads Reject | Carried as a check for steps 11 and 13 |
| 29 | **Live-join vs snapshot names is reasoned, not observed** (check 12 was skipped). Renaming Default Approver should change every name on the form and none in Signature History | Optional. Run it whenever a rename happens anyway, which will be step 15 at the latest |
| 30 | **Create can make a duplicate record.** The `creating` guard covers one tab only. **A status 0 or 500 does not prove that nothing was created:** the connection can drop after `tx.Commit()` (CLAUDE.md trap 6). So a user who sees an error and clicks again, or clicks in two tabs, can make two records. The API has no idempotency key. The harm is one stray empty draft, and this is rare | **Accepted, with the message unchanged.** Lain's decision. Wording such as "check My Change Controls before retrying" makes a claim about data state, and it deserves more thought than a passing decision |

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

---

## Carried over from the backend phase

Things already known that the frontend has to respect. Do not re-derive these.

| | |
|---|---|
| **API** | Complete. 23 endpoints, unchanged during this build |
| **Enum values** | ASCII hyphens, not en-dashes. Take them from `docs/openapi.yaml` |
| **Save then submit** | Transitions carry no field values; Submit is disabled while dirty |
| **`openapi.yaml`** | Hand-written from the handler code — a transcription, so **not infallible**. If a response disagrees, check the Go handler and fix the spec. **Sixteen defects found so far**: six at step 2, three more on a second reading of the same file, two in the A1 audit, two in step 3's sweep of every 401, two in step 4's A10 audit, and one in step 7a's audit (the empty-signatures sentence) — so treat this as a live warning, not a formality. **The count keeps rising because the checking keeps going**, not because the spec is unusually bad |
| **The backend source is on disk** | `../ea-qms-backend` — `handlers_*.go`, `sql/queries/`, `sql/schema/`, `constants.go`, `middleware.go`, `main.go`. The real authority; every finding so far was confirmed against it rather than assumed. **Read the handler before believing the spec.** Now also in `CLAUDE.md`, which loads every session — `PROGRESS.md` alone was the wrong place for it |
| **Rule 7 — verify before each step** | `CLAUDE.md` carries the **section map**: which Part A sections each step depends on, and which Go files to check them against. Corrections go into `.claude/rules/` too, since that is what loads at write time — the blueprint does not |
| **Why rule 7 exists** — the evidence, kept here so `CLAUDE.md` can stay at the instruction | **Part A has been checked in patches, not as a whole.** What has been checked produced **fifteen `openapi.yaml` defects** and **four blueprint claims that would have shipped**: A1.4's "logging out never fails", A1.2's missing 401 exemption, at step 3 the same exemption's missing e-signature case, and at step 5 A9.2 and A10's advice to use the capped `pending_approvals` block as a queue. The rest of Part A is unverified prose **that reads exactly as confidently as the parts that were wrong.** Nothing found so far was an obvious error; three were *omissions*, which skimming cannot surface — hence "check each claim", not "review the section" |
| **Audit status of Part A** | ✅ **A1** (step 3, plus the e-signature 401 found while building it, and the restore-on-load path at step 4), **A8** and **A9** done — **A9 twice**: sort and pagination at step 2, then the filter parameter names and invalid-value behaviour at step 6, which found two gaps and a backend defect in a section already marked done. ✅ **A10**: the user-management and profile notes at step 4, and Dashboard and Approvals at step 5. ✅ **A12** was audited before step 3, and amended there: the trap is narrower than stated (see the corrections table). ✅ **A5** for display, **A10**'s CC-form note and **A11**, all at step 7a. ⬜ **A2/A3** (step 7c), **A6** (12, 14) and **A7** (9, 12) are outstanding. **A13 deliberately excluded** — it summarises what other sections state, so auditing it re-checks claims through a second document instead of against the Go |
| **Two rationales trimmed from `CLAUDE.md`'s map** | **A6** — it claims the PDF type is verified by inspecting the file's bytes, so check `file_sanitizer.go`, not just `handlers_files.go`; that is where the claim lives or fails. **A12** — it claims a blocked request still reaches the server *and executes*. Verify before relying on it: it decides whether a failed write needs re-checking in psql, or can be assumed not to have happened. **Resolved at step 3:** a CORS block never executes a write, but status 0 on a write can still hide a commit, through a dropped connection rather than CORS. See the corrections table |
| **`src/lib/types.ts` outranks the spec** | For shapes, nullability, enum values and field-level traps — it is the most verified document here. **Not** for flow, auth lifetime or handler internals, where it is silent rather than brief. In `CLAUDE.md`'s precedence list at position 1, below the Go itself |
| **Untested** | ~~`global.css` inside a Svelte component~~ — **proven at step 1** · the activity-gated refresh (step 16), still open |
