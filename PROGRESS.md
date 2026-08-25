# Frontend — Progress

Read this at the start of every session. Update it at the end of every build step,
once the step has been verified.

---

## Status

**Current step:** 2 — `types.ts`, **fixes applied, awaiting Lain's re-check**
**Last verified:** Step 1, side-by-side against `owner/dashboard-cc-owner.html`

| Step | | Verified by |
|---|---|---|
| 1 · Scaffold + `global.css` | ✅ | Lain — browser side-by-side |
| 2 · `types.ts` | 🔶 | Lain read the whole file and found **six** spec defects (below). All fixed; **the fixes themselves are not yet verified** |
| 3 · Login + auth store + `api.ts` | ⬜ | |
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
- **Lain read the whole file line by line.** That is what found all six defects
  below; no automated check would have caught any of them, because `types.ts`
  matched the spec and *the spec was wrong*

**Still to verify:** the six fixes. The script and `bun run check` pass, but
neither can tell whether the new shapes match the API — only steps 3 and 5 do.

**Note:** the script lives in the session scratchpad, not the repo. If it is worth
keeping, that is a decision to take deliberately — it needs `pyyaml`, which is not
a project dependency.

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

---

## Flags

*Known, deliberately deferred, with the reason. **A flag is not a defect** — keep
the two apart, or the real problems get lost among the accepted trade-offs.*

| # | Flag | Status |
|---|---|---|
| 1 | **Five copies of `global.css` now exist** — `docs/prototypes/` plus `owner/`, `approver/`, `admin/`, plus `src/lib/`. Every prototype links it as `href="global.css"`, relative to itself, so all three role folders rendered unstyled until a copy sat beside them. **`docs/prototypes/global.css` is canonical; the other four must stay in step.** All five verified identical at step 1 (md5 `8115796f`, 1808 lines) | Accepted. Re-check they match whenever any copy is touched. The alternative — rewriting ~35 prototypes to `href="../global.css"` and keeping one copy — was not done: the prototypes are the visual authority and editing them for the port's convenience is the wrong direction |
| 2 | `src/routes/+page.svelte` is throwaway proof markup (decision 2) | **Delete at step 4**, when the real authenticated layout lands and `/` becomes a redirect |
| 3 | **`README.md` is the untouched `sv` boilerplate** — titled "sv", tells the reader to run `npx sv create`, and gives `npm install` / `npm run dev` / `npm run build` in three places. The project is Bun-only, so **every command in it is wrong**. Only line 18 is true: it records the actual `bun x sv@0.17.0 create --template minimal --types ts --install bun .` | Deferred to **~step 5**, when there is a running app to describe rather than a shell. **Keep line 18's invocation** when it is rewritten — it is the evidence behind the first document correction below |
| 4 | **`docs/openapi.yaml` here has diverged from the backend's copy** — six fixes applied to this one, none to the canonical one, so the two now disagree | **Open, and this one has a visible symptom:** the backend copy is canonical **and `go:embed`ed into the binary**, so `http://localhost:1304/docs` keeps serving the wrong spec until it is patched **and the binary rebuilt**. Apply the same edits there by hand rather than copying this file over — the two may have drifted in ways nobody has checked |

---

## Document corrections needed

*Where the code and a guardrail document disagreed, and which was wrong. If a
document was wrong, it needs amending — otherwise the next reader "corrects" the
code back.*

| Document | What is wrong | |
|---|---|---|
| `FRONTEND_BLUEPRINT.md` B9, step 1 | Says `bun create svelte@latest`. What was actually run is `bunx sv create . --template minimal --types ts --no-add-ons` (sv 0.17.0), which the CLI reports non-interactively as `bun x sv@0.17.0 create --template minimal --types ts --install bun .`. **The blueprint's form was never tried**, so we cannot say it is dead — only that `sv` is what worked | Amend to the `sv` form |
| `FRONTEND_BLUEPRINT.md` B2 | The stack table is **silent on an icon font**, while saying "no UI library". The prototypes depend on Bootstrap Icons for 225 tags across ~20 glyphs, so the omission turned a lookup into decision 1 | Add a Styling row: `global.css` **and** a bundled Bootstrap Icons |
| `FRONTEND_BLUEPRINT.md` B2 / B5 | Both imply a `svelte.config.js` (B5's tree shows `+layout.ts` for `ssr = false`, and B2 names the adapter). The current scaffold has **no `svelte.config.js`** — kit config is passed to the `sveltekit()` plugin in `vite.config.ts`. `+layout.ts` is unaffected and still correct | Note the file location |
| `FRONTEND_BLUEPRINT.md` B6 · `.claude/rules/api.md` | Both name the read type `ChangeControl` and the errors `ApiError` / `ValidationError`. The code uses the spec's `ChangeControlResponse` / `ErrorResponse` / `ValidationErrorResponse` — decision 5. **The rule file matters more than the blueprint here**: it loads at write time, so it will pull step 3 back toward `ApiError` unless amended | Amend **both**, rule file first |
| **`openapi.yaml` — six defects, all fixed in this copy** | Found by Lain reading `types.ts` line by line, then each confirmed against the Go handlers. **`types.ts` had transcribed all six faithfully** — the spec was wrong, not the transcription | **All six also need applying to the backend's canonical copy** — flag 4 |
| ⤷ 1 · unquoted `Yes`/`No` | `ExpectedDowntime` and `RequiresTraining` had bare `Yes`/`No`. YAML 1.1 resolves those to booleans, so the members vanish for any 1.1 parser (PyYAML, Go `yaml.v2`). Someone had already quoted `"No"` in two places and missed `Yes` in both. Values confirmed against `CC_Field_Reference.md:61,63` | Quoted, with a description saying why. Swept the whole file — these were the only two |
| ⤷ 2 · `UserResponse` merged three shapes | The Go handlers build **four** distinct structs: `GetMe` returns 4 fields (no `is_active`, no timestamp), create/list return `created_on`, both PUTs return `updated_on`. The spec had one type carrying **both** timestamps, so `user.created_on` after a status change was typed-but-`undefined` | Split into `MeResponse` / `UserResponse` / `UserStatusResponse`; the four endpoint `$ref`s repointed |
| ⤷ 3 · `ListApproversResponse` missing | `GET /approvers` defined its response **inline** rather than as a named schema, so a `components/schemas` transcription skipped it entirely. `api.ts` needs it at step 3 | Added as a named schema. The checker now fails on **any** inline path schema — the class of bug, not the instance. Only one other existed: the multipart upload body, which needs no interface |
| ⤷ 4 · `CreateChangeControlResponse` short by two | Go returns 11 fields; the spec defined 9, missing `last_updated_by_id` / `_name`. Its own description said "the eight fields" while listing nine | Both fields added, description corrected to eleven |
| ⤷ 5 · `is_active` was the wrong param name | The handler reads `q.Get("active")` (`handlers_users.go:188`). An unrecognised query param is **ignored silently**, so `?is_active=true` returns every user with no error — the worst failure mode available | Spec and `types.ts` changed to `active`, per decision 8, with the mismatch documented in both. The checker now diffs query param names and was negative-tested against this exact bug |
| ⤷ 6 · `GET /me` over-specified | Listed as returning `UserResponse` (7 fields); the handler returns 4. This is the shape the auth store holds at step 3, so `auth.user.is_active` would have been typed-but-`undefined` | New `MeResponse`, and `/me` repointed at it |

---

## Carried over from the backend phase

Things already known that the frontend has to respect. Do not re-derive these.

| | |
|---|---|
| **API** | Complete. 23 endpoints, unchanged during this build |
| **Enum values** | ASCII hyphens, not en-dashes. Take them from `docs/openapi.yaml` |
| **Save then submit** | Transitions carry no field values; Submit is disabled while dirty |
| **`openapi.yaml`** | Hand-written from the handler code — a transcription, so **not infallible**. If a response disagrees, check the Go handler and fix the spec. **Step 2 found six defects in it**, so treat this as a live warning, not a formality |
| **The backend source is on disk** | `../ea-qms-backend` — `handlers_*.go` are readable and are the real authority. Every step-2 finding was confirmed against them rather than assumed. **Read the handler before believing the spec** |
| **Untested** | ~~`global.css` inside a Svelte component~~ — **proven at step 1** · the activity-gated refresh (step 16), still open |
