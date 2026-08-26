# EA QMS — Change Control Frontend

Svelte 5 SPA against a **completed** Go API. This is a **port** of existing HTML
prototypes, not a redesign.

## Working method — read this first

**Claude Code writes the code. Lain reviews every line and approves every step.**

### Rules for Claude

1. **Plan before writing.** For anything beyond a trivial edit, propose the
   approach and wait for approval. Use plan mode.
2. **Explain what you wrote and why**, especially where a blueprint rule or an API
   constraint drove a choice. Lain must be able to explain every line to a third
   party; if the reasoning is not obvious from the code, say it.
3. **Ask before any shell command.** No exceptions.
4. **Never run git commands.** Propose a commit message; Lain runs git.
5. **Stop and ask** when documents disagree or something is ambiguous. Never
   assume, never go beyond documented scope. **Flag rather than invent.**
6. **After each step, tell Lain exactly what to verify** — what to click in the
   browser, which endpoint to check, which psql query to run. Do not declare a
   step done; propose the check that would prove it.
7. **Before starting a step, verify the blueprint sections it depends on against
   the Go** — the two or three it is built on, not the document. Map below.

### Rules Lain enforces — Claude cannot

Here so Claude knows the intent — it has no memory across sessions and cannot
detect session boundaries, so it cannot self-police these.

- **One build step per session.** If a step is finished, say so and stop. Do not
  begin the next one.
- **No component extraction until the same markup has been written inline three
  times.** Claude cannot count across sessions. When extraction seems warranted,
  **propose it and let Lain decide** — never extract unilaterally.

## The documents — read on demand, never all at once

| Question | Read |
|---|---|
| What shape is this — nullability, enum values, field traps? | **`src/lib/types.ts` first.** Its comments carry what the spec states only in passing. **Silent on flow, auth lifetime and handler internals** — use the Go for those |
| What does the API *actually do*? | **`../ea-qms-backend`** — `handlers_*.go`, `sql/queries/`, `sql/schema/`, `constants.go`, `middleware.go`, `main.go`. **Read it whenever a document makes a claim about API behaviour.** Everything else here is a transcription of it |
| What does this endpoint accept/return? | `docs/openapi.yaml` — the written contract |
| What must the client do, in what order? | `docs/FRONTEND_BLUEPRINT.md` Part A |
| How do we build it in Svelte? | `docs/FRONTEND_BLUEPRINT.md` Part B |
| Which fields can this role edit in this state? | `docs/Security_Matrix_V2_1.md` |
| Exact valid value for a dropdown? | `docs/CC_Field_Reference.md` — **overrides the BRD** on the six hyphenated enums |
| What is the business rule, and why? | `docs/EA_QMS_BRD_V1_2.md` |
| What does this screen look like? | `docs/prototypes/` — `owner/`, `approver/`, `admin/` (Admin + Viewer), plus `global.css` |

**Before building any screen**, read the matching prototype in `docs/prototypes/`
and the relevant blueprint section. Do not work from memory of them.

### Precedence when documents disagree

0. **`../ea-qms-backend`** — the implementation. Nothing outranks it, and it is
   the only tiebreak that works when the documents *agree*.
1. **`src/lib/types.ts`** — shapes, nullability, enum values, field traps.
2. **`openapi.yaml`** for request and response shapes generally. A transcription
   of the handlers, so **not infallible** — if a real response disagrees, check
   the Go and fix the spec.
3. **`docs/CC_Field_Reference.md`** for enum strings — it overrides the BRD.
4. **`docs/FRONTEND_BLUEPRINT.md`** for everything else. The `.claude/rules/`
   files are **extracts** that load at write time; if a rule disagrees with the
   blueprint, **the blueprint is right and the rule is stale**.

⚠️ **Agreement is not corroboration when one document was copied from another.**
Precedence resolves disagreements only; when all of them agree and all are wrong,
level 0 is the only thing that catches it. It has happened — see `PROGRESS.md`.

## Rule 7 — verify a step's sections before starting it

Two or three sections, not the document. **Check each claim against the Go**
rather than skimming: what has been found so far read as plausible prose, and
some of it was *omission*, which skimming cannot surface. **A13 is out of
scope** — it summarises what other sections already state.

| Sections | Before | Against |
|---|---|---|
| **A1** Authentication | Step 3 — ✅ done | `handlers_auth.go`, `middleware.go`, `main.go`, `sql/queries/refresh_tokens.sql` |
| **A2** Save-then-submit · **A3** Partial updates | Step 7 | `handlers_cc.go` — `HandlerSaveDraft` |
| **A6** Files | Steps 12, 14 | `handlers_files.go`, `file_sanitizer.go` |
| **A7** E-signatures | Steps 9, 12 | `handlers_workflow.go` |
| **A10** Per-screen notes | Steps 5, 15 | `handlers_dashboard.go`, `handlers_users.go` |
| **A11** IDs and names | Wherever an id or name is compared or rendered | the handler building that response |
| **A12** CORS | Step 3 | `middleware.go` — `middlewareCORS` |

**Push every correction into `.claude/rules/` too** — those load at write time
and the blueprint does not, so a stale rule pulls the code back toward the error
just fixed. Record the audit in `PROGRESS.md`, **including claims that proved
correct**, so they are not re-investigated next session.

⚠️ **Findings go to `.claude/rules/` and `PROGRESS.md` — never here.**
`CLAUDE.md` changes only when a **rule** changes, never to record a finding.

## Traps that will otherwise cost a day

1. **Enum values use ASCII hyphens (`-`), not en-dashes (`–`).** The BRD and the
   prototypes render six values with U+2013; the database requires U+002D. Copying
   an `<option value>` from a prototype makes every submission 400 with an error
   that never mentions the character. **Take enum values from `openapi.yaml` or
   `docs/CC_Field_Reference.md`.** Blueprint A4.

2. **Save then submit.** Transitions carry **no field values** — they validate what
   is already stored. Submit must be disabled while the form is dirty, or the API
   rejects fields the user can see filled in. Blueprint A2.

3. **A value read from the URL must be `$derived`, never a plain `let`.** Query
   params change without remounting, so a plain `let` reads once and goes stale.
   Silent — no error anywhere. Blueprint B3.

4. **File download cannot be `<a href>`.** It needs the bearer token and a link
   cannot send headers. `fetch` → `.blob()` → object URL. Blueprint A6.2.

5. **`null` clears a field; `""` is a parse error on dates.** Text fields accept
   both. Date and time fields accept only `null`. Blueprint A3, A5.

6. **CORS fails confusingly.** A blocked request reaches the server and executes —
   the browser only hides the response. A write can succeed while the client sees a
   network error. Check the browser console first. Blueprint A12.

## Stack — settled, do not re-litigate

Svelte 5 runes · SvelteKit **SPA mode** (`ssr = false`, `adapter-static`) ·
TypeScript · **Bun** (not npm/npx) · `global.css` unchanged · native `fetch`
behind one wrapper · **no `svelte/store`**.

**Every SvelteKit server feature is out** — `load`, form actions,
`+page.server.ts`, `+server.ts`, hooks, cookies. The Go API is the backend.

**No component extraction until the same markup is written inline three times.**

**One page renders the CC form in every state for every role** — the Security
Matrix becomes `{#if}` and `disabled`. Do not create a page per state.

Full allowed and forbidden lists: blueprint B3 and B4.

## Environment

| | Where | Address |
|---|---|---|
| Go API | **Windows service** — not `go run .` | `http://localhost:1304` |
| PostgreSQL | WSL — `sudo service postgresql start` | `localhost:5432` |
| Dev server | WSL | `http://localhost:5173` |
| Browser | Windows | — |

```
PUBLIC_API_URL=http://localhost:1304/api     # note the /api suffix
ALLOWED_ORIGINS=http://localhost:5173        # set in the API's .env
```

**Check the API is up:** `curl http://localhost:1304/api/login` — **`405 Method
Not Allowed` is success** (login is POST-only, so a GET reaching the mux proves
the path works).

**API reference with Try it out:** `http://localhost:1304/docs`

### Test users

Password for all four: **`DevPassw0rd!`**

`admin@eaqms.local` · `owner@eaqms.local` · `approver@eaqms.local` ·
`viewer@eaqms.local`

Ten seeded change controls across five states, including one rejected at **both**
gates and eventually closed — useful for the signature-history panel.

## Build order

Blueprint **B9** — seventeen steps, each independently verifiable and each stating
what it proves. Work through them in order.

**One constraint:** file upload cannot come before the `In Implementation` view —
the only upload field is writable in that state alone.

**Step 1 includes copying `docs/prototypes/global.css` to `src/lib/global.css`.**
Vite will not serve from `docs/`, so the layout imports the copy. If the two ever
diverge, `docs/prototypes/global.css` is the original.

## PROGRESS.md — the memory between sessions

`CLAUDE.md` and `.claude/rules/` reload each session; the conversation does not.

**At the start of a session:** read `PROGRESS.md` for the next step, what was
decided, and what is flagged. Do not ask Lain to re-explain what is in it.

**At the end of each step, once Lain confirms it works**, record four things:

1. **The step done** — and *what was verified*, not that it was built. "Saved a
   partial body; confirmed in psql that untouched fields were unchanged" beats
   "Save Draft works."
2. **Any decision** — with the reasoning and the rejected alternative. Numbered.
3. **Any flag** — deferred, with why. **A flag is not a defect**; keep them apart.
4. **Anything that contradicted a document** — and which was wrong. If the
   document was wrong, name it and say it needs amending.

**Record reversals too**, with the reasoning for both the original decision and
the change. Keep entries short — the file earns its length or stops being read.
