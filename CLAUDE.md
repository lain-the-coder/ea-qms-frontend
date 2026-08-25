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

### Rules Lain enforces — Claude cannot

These are here so Claude knows the intent, not because it can self-police them.
Claude has no memory of previous sessions and cannot detect session boundaries.

- **One build step per session.** If a step is finished, say so and stop. Do not
  begin the next one.
- **No component extraction until the same markup has been written inline three
  times.** Claude cannot count across sessions. When extraction seems warranted,
  **propose it and let Lain decide** — never extract unilaterally.

## The documents — read on demand, never all at once

| Question | Read |
|---|---|
| What does this endpoint accept/return? | `docs/openapi.yaml` — **the definitive contract** |
| What must the client do, in what order? | `docs/FRONTEND_BLUEPRINT.md` Part A |
| How do we build it in Svelte? | `docs/FRONTEND_BLUEPRINT.md` Part B |
| Which fields can this role edit in this state? | `docs/Security_Matrix_V2_1.md` |
| Exact valid value for a dropdown? | `docs/CC_Field_Reference.md` — **overrides the BRD** on the six hyphenated enums |
| What is the business rule, and why? | `docs/EA_QMS_BRD_V1_2.md` |
| What does this screen look like? | `docs/prototypes/` — `owner/`, `approver/`, `admin/` (Admin + Viewer), plus `global.css` |

**Before building any screen**, read the matching prototype in `docs/prototypes/`
and the relevant blueprint section. Do not work from memory of them.

### Precedence when documents disagree

1. **`openapi.yaml`** for request and response shapes. It was hand-written *from*
   the handler code — a transcription, so **not infallible**. If a real response
   does not match it, check the Go handler before assuming the client is wrong,
   and fix the spec.
2. **`docs/CC_Field_Reference.md`** for enum strings — it overrides the BRD.
3. **`docs/FRONTEND_BLUEPRINT.md`** is canonical for everything else. The
   `.claude/rules/` files are **extracts** kept short so they load at write time;
   if a rule disagrees with the blueprint, **the blueprint is right and the rule
   is stale** — say so rather than following the rule.

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

**One constraint:** file upload cannot come before the `In Implementation` view.
The only upload field is writable only in that state, which a record reaches after
two transitions.

**Step 1 includes copying `docs/prototypes/global.css` to `src/lib/global.css`.**
Vite will not serve from `docs/`, so the layout imports the copy. If the two ever
diverge, `docs/prototypes/global.css` is the original.

## PROGRESS.md — the memory between sessions

**Each session starts with a fresh context window.** `CLAUDE.md` and
`.claude/rules/` reload automatically; the conversation does not. `PROGRESS.md` is
what carries everything else.

**At the start of a session:** read `PROGRESS.md` to see which step is next, what
was decided, and what is flagged. Do not ask Lain to re-explain what is written
there.

**At the end of each build step, once Lain confirms it works:** update
`PROGRESS.md` before moving on. Four things:

1. **Mark the step done** — and record what was verified, not just that it was
   built. "Saved a partial body; confirmed in psql that untouched fields were
   unchanged" beats "Save Draft works."
2. **Any decision made** — with the reasoning, and the alternative that was
   rejected. Numbered, so it can be referred to later.
3. **Any flag** — something known, deliberately deferred, with why. A flag is not
   a defect; keep the two apart.
4. **Anything that contradicted a document** — and whether the document or the
   code was wrong. If the document was wrong, say which one and that it needs
   amending.

**Reversals get recorded too**, with the reasoning for both the original decision
and the change. A log containing only successes is fiction, and the next session
will re-litigate a settled question without it.

Keep entries short. This file is read at the start of every session, so it earns
its length or it stops being read.
