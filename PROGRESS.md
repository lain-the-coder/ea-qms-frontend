# Frontend — Progress

Read this at the start of every session. Update it at the end of every build step,
once the step has been verified.

---

## Status

**Current step:** 2 — `types.ts`
**Last verified:** Step 1, side-by-side against `owner/dashboard-cc-owner.html`

| Step | | Verified by |
|---|---|---|
| 1 · Scaffold + `global.css` | ✅ | Lain — browser side-by-side |
| 2 · `types.ts` | ⬜ | |
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

---

## Decisions

*Numbered, with reasoning and the rejected alternative. Reversals are recorded as
new rows that say what changed and why — the original stays.*

| # | Decision | Reasoning |
|---|---|---|
| 1 | **Bootstrap Icons bundled via `bun add bootstrap-icons`**, its stylesheet imported in the root layout | The prototypes load it from jsDelivr and use 225 `<i class="bi bi-*">` tags across ~20 glyphs; `global.css` styles them (`.sidebar .logo i`). No document mentioned the icon font at all. **Rejected the CDN `<link>`** — B12 already lists CDN-loaded assets as a known problem, and icons would vanish offline. **Rejected deferring** — `.sidebar .logo i` is part of what step 1 must prove |
| 2 | **Step 1's `+page.svelte` is throwaway**, deleted at step 4 | The step's deliverable is a browser comparison, which needs prototype markup on screen. Step 4 builds the real authenticated layout and `/` becomes a redirect. Recorded so it is deleted rather than grown |
| 3 | **Favicon as a plain `<link>` in `app.html`**, asset moved to `static/favicon.svg` | The scaffold used `<svelte:head>`, and B4 forbids special elements. `app.html` is the document shell, not a component, so a plain `<link>` involves no special element. Uses `%sveltekit.assets%` so it survives being served from a sub-path. **Rejected keeping `<svelte:head>`** — a forbidden construct in the first file written sets the wrong precedent |

---

## Flags

*Known, deliberately deferred, with the reason. **A flag is not a defect** — keep
the two apart, or the real problems get lost among the accepted trade-offs.*

| # | Flag | Status |
|---|---|---|
| 1 | **Five copies of `global.css` now exist** — `docs/prototypes/` plus `owner/`, `approver/`, `admin/`, plus `src/lib/`. Every prototype links it as `href="global.css"`, relative to itself, so all three role folders rendered unstyled until a copy sat beside them. **`docs/prototypes/global.css` is canonical; the other four must stay in step.** All five verified identical at step 1 (md5 `8115796f`, 1808 lines) | Accepted. Re-check they match whenever any copy is touched. The alternative — rewriting ~35 prototypes to `href="../global.css"` and keeping one copy — was not done: the prototypes are the visual authority and editing them for the port's convenience is the wrong direction |
| 2 | `src/routes/+page.svelte` is throwaway proof markup (decision 2) | **Delete at step 4**, when the real authenticated layout lands and `/` becomes a redirect |

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

---

## Carried over from the backend phase

Things already known that the frontend has to respect. Do not re-derive these.

| | |
|---|---|
| **API** | Complete. 23 endpoints, unchanged during this build |
| **Enum values** | ASCII hyphens, not en-dashes. Take them from `docs/openapi.yaml` |
| **Save then submit** | Transitions carry no field values; Submit is disabled while dirty |
| **`openapi.yaml`** | Hand-written from the handler code — a transcription, so **not infallible**. If a response disagrees, check the Go handler and fix the spec |
| **Untested** | ~~`global.css` inside a Svelte component~~ — **proven at step 1** · the activity-gated refresh (step 16), still open |
