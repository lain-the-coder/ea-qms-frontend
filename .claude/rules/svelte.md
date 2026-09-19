---
paths:
  - "src/**/*.svelte"
  - "src/**/*.svelte.ts"
---

# Svelte 5 conventions

Full reasoning in `docs/FRONTEND_BLUEPRINT.md` B3 and B4. These are the rules that
must be present while writing, not looked up afterwards.

## Runes

`$state` · `$derived` · `$props`. **`$effect` is not for fetches.** Its one use is the
mount-only redirect at `/`.

⚠️ **Mount-only fetches use `onMount` from `svelte`, never `$effect`.** An effect
subscribes to every piece of state it reads synchronously, including reads inside
functions it calls. `request()` reads `auth.accessToken` before its first `await`,
so a fetch in `$effect` refetches whenever the token changes: on the 401 refresh,
and every 24 minutes once the scheduled refresh (step 16) exists. `onMount`
subscribes to nothing. The dashboard and the `(app)` layout's restore both use it.

⚠️ **A fetch that must REPEAT when the URL changes uses `onMount` AND
`afterNavigate`, deduplicated on the query string.** A filter or page change is a
navigation *without* a remount, so `onMount` alone never refetches — but
`afterNavigate` alone does not fire on load in this app:

- `afterNavigate` registers its callback through `onMount`
  (`client.js:add_navigation_callback`), and SvelteKit dispatches the initial
  `type: 'enter'` during hydration to whatever is registered **at that moment**.
- Every page under `(app)` is gated behind `auth.user`, which stays null until
  the layout's restore resolves `/refresh` and `/me` — long after hydration. So
  the component is created *after* `'enter'` has been dispatched and never
  receives it. A hard reload sits on "Loading…" for ever, with no error.

Run both and key on the query string, so the order stops mattering:

```ts
let lastQuery: string | null = null;

function loadIfChanged() {
  if (query === lastQuery) return;   // `query` is $derived from the URL
  lastQuery = query;
  load(query);
}

onMount(loadIfChanged);
afterNavigate(loadIfChanged);
```

Whichever fires first issues the request; the other is a no-op. `afterNavigate`
is what catches what a "reload after each `goto`" would miss — **Back and
Forward**, and the sidebar link tapped while already on that route. Clear
`lastQuery` on failure so the same URL can be retried. Add a sequence counter
(`const mine = ++latest`) when requests can overlap, as a debounced search makes
them. `ChangeControlList.svelte` is the worked example.

⚠️ **`beforeNavigate` is the unsaved-edits guard, on the CC form only** (flag 43).
- **It reads two predicates** (step 11, flag 47): `dirty` (unsaved edits) and
  `unsubmitted` (an assigned approver's typed decision, which nothing saves).
  Each has its own sentence, because "unsaved changes" is untrue for a buffer.
  **Never fold `unsubmitted` into `dirty`.**
- **Return early when neither is true, or `auth.user === null`.** `request()`'s forced
  sign-out calls `goto('/login')`, which runs the same callbacks. A prompt there
  lets the user stay on a form that cannot save.
- **Every sign-out must clear `auth.user` before it navigates.** That includes
  any future inactivity popup (step 17, deferred to Phase 2).
- **For `type: 'leave'`, only `cancel()`.** SvelteKit's `beforeunload` listener
  then shows the browser's dialog. `confirm()` is blocked there, and no
  `<svelte:window>` is needed.
- **Otherwise, `confirm()`.** The callback is synchronous, so a styled dialog
  cannot answer in time.
- **Any `goto` added to the form page must be decided against this guard.**

⚠️ **A load that replaces the record clears it first** (`cc = null`, `form = null`).
Controls outside `{#if loading}` read the record, so stale values keep them live
during the load, and a `mine = ++latest` check taken after the increment cannot
tell.

**Deriving state inside `$effect` is the Svelte 5 anti-pattern.** If a value can be
computed from other state, it is `$derived`.

⚠️ **Never name a variable `state`.** It shadows the `$state` rune: `$state(true)`
is then compiled as a store subscription on your variable, and the errors point
at the `$state` lines rather than the declaration —

```
Cannot use 'state' as a store. 'state' needs to be an object with a subscribe method
```

Use `stateFilter`, `currentState`, `ccState`. The same applies to any name a rune
starts with — `props`, `derived`, `effect`, `inspect`.

⚠️ **Anything read from the URL must be `$derived`:**

```ts
let state = page.url.searchParams.get('state');            // WRONG — goes stale
let state = $derived(page.url.searchParams.get('state'));  // right
```

Query params change without remounting the component, so a plain `let` reads once
and never again. Silent failure — the filter just stops working. Same for route
params like `[ccId]`.

**Do not destructure a rune** — `const { user } = auth` breaks reactivity. Read
`auth.user`.

## Syntax

Svelte 5 only. **`onclick={...}`, never `on:click`.** No `export let` — use
`$props`. No `$:` reactive statements. No `svelte/store`.

## Template

`{#if}` / `{:else if}` / `{:else}`, `{#each}`, interpolation.

**Prefer explicit `loading` / `error` state over `{#await}`** — fetched data must
land in `$state` for form binding anyway, so `{#await}` is a second mechanism for
one job.

## Forbidden

Snippets (`{#snippet}`) · transitions and animations · context API
(`setContext`/`getContext`) · actions (`use:`) · `$bindable` · class-based state ·
special elements (`<svelte:window>` etc.).

**One exception:** `{@render children()}` in `+layout.svelte` is required by
SvelteKit. It is the only permitted snippet syntax.

**Every SvelteKit server feature is forbidden** — `load`, form actions,
`+page.server.ts`, `+server.ts`, hooks, cookies. This is a static SPA; the Go API
is the backend.

## Deliberately skipped

Not banned, just not needed. Say so before reaching for one: `bind:group` ·
`<select multiple>` · numeric input binding · event capturing · event-handler
spreading · the `{#each}` index · the `style:` directive · component CSS custom
properties.

**One `style:` use exists** (decision 71): `style:margin-bottom="0"` on the save
error's `.esig-error` in the form's sticky action bar. The class's modal-stacking
margin lifts the box in a flex row with `align-items: center`. **Any `.esig-error`
inside a flex row needs the same cancellation.** Do not remove it as an unneeded
directive. **The bar holds one plain sentence by construction** — anything with
`issues` goes to a dialog (decision 90).

⚠️ **Every button label in a flex action bar uses non-breaking spaces** (flag 39,
option B): `Back&nbsp;to&nbsp;List`, or `'Save Draft'` inside a JS string.
- **Why:** a flex item shrinks to its narrowest possible width, which for a `.btn`
  is its longest word. One long sentence in a half-screen window wrapped every
  button word by word.
- **Why this fix:** `&nbsp;` makes the whole label that narrowest width, so the
  message wraps instead of the buttons.
- **Rejected:** `nowrap` in `global.css` (canonical, five copies) and a per-button
  `style:`.
- ⚠️ **A new bar button without it brings the defect back silently**, and only at
  narrow widths. Step 10's `Cancel&nbsp;CC` has it. Single-word in-flight labels
  (`Saving…`, `Signing…`) need nothing.

**Avoid `:global`** — `global.css` is imported once at the root and applies
everywhere. Reaching for `:global` usually means the markup drifted from the
prototype.

## Markup comes from the prototypes

Before writing a screen, read the matching file in `docs/prototypes/` — `owner/`,
`approver/`, or `admin/`. Reuse its markup structure and `global.css` classes.
**Invent nothing visual.** No new CSS tokens, no components that do not appear in
a prototype.

⚠️ **But the prototypes, the BRD and the Security Matrix are guides, not
scripture.** Lain wrote all three, and they contain their author's mistakes.
**When following one produces something obviously wrong on screen, RAISE IT
rather than complying silently** — Lain can override any of them, and has.
Decision 81 is the worked example: `success_criteria`'s prototype placeholder is
a copy-paste of Validation Approach's, so the text there is **written, not
ported**. A prompt describing the wrong field is worse than one we wrote.

This does not license invention. The test that decides it:

| | |
|---|---|
| **Untrue** — cut it | The build cannot ever do what the copy says. "You will be notified" is the case: Phase 1 has no SMTP, so the notification never arrives. Drop the sentence, keep the rest (flag 46, decisions 34 and 43) |
| **Incomplete** — keep it | The build cannot do it *yet*, and a later step will. The Implementation Evidence hint was the case: the upload arrived at step 12, and until then the surrounding flow was visibly scaffolded, so it read as unfinished rather than as a lie |

**Incomplete, not untrue.** Ask which one before dropping or keeping copy for a
feature that is not built.

⚠️ **The evidence upload box opens its picker from code, never through
`<label for>`.** A label opens a file picker natively, before any handler can
refuse, which gets past the dirty refusal. The box is the prototype's
`.upload-box` with `role="button"`, `tabindex` and Enter/Space. It opens the
hidden `<input type="file">` through `getElementById().click()`, because
`bind:this` is not in B3. Its `dragover` and `drop` always call
`preventDefault()`, even while locked: an unhandled drop navigates the tab to
the file.

⚠️ **The evidence file's name is the download control** (step 14): a
`<span role="button" tabindex="0" class="login-link">` inside the `.meta-value`,
with Enter and Space handled in code, as on the upload box.
- **It sits outside `mayEdit`.** Every role in every state downloads, and it is
  gated only on `implementation_evidence !== null`.
- **Never `<a href>`**, because a link cannot send the bearer (trap 4).
- **`.login-link`** is the only link colour in global.css with no layout rules.
  The text cursor on hover is a known cost of not adding a second `style:` (a
  step-14 flag).
- **The save is a detached `document.createElement('a')`** with `download` set,
  clicked and never appended. Its click does not reach `document`, so
  `beforeNavigate` never fires, and a dirty form is neither prompted nor
  touched.

## Enum values

Never copy an `<option value>` from a prototype — six of them use en-dashes
(U+2013) where the API requires ASCII hyphens (U+002D). **Take values from
`docs/openapi.yaml` or `docs/CC_Field_Reference.md`.**

## Permissions

Which fields are editable in a given state comes from
`docs/Security_Matrix_V2_1.md`, which lists them per state. That becomes `{#if}`
and `disabled` — one page for all states and roles, never a page per state.

⚠️ **The Matrix is per ROLE; the API is per IDENTITY. Follow the API.**
No transition route carries `requireRole` — all five are mounted behind
`middlewareAuth` alone. Authorisation is a comparison against the record:

| Matrix column | What the Go actually checks | Sends |
|---|---|---|
| CC Owner | `user.ID == cc.ChangeOwnerID` | T2, T3, both saves, the upload |
| Approver | `cc.AssignedApproverID != nil && *… == user.ID` | T4/T5, T7/T8 |

So an Approver who is **not this record's assignee** gets 403 `Forbidden`.
Enabling the gate for every Approver is what reading the Matrix literally would
do. Compare on the id, never the name (A11), and add **no** role check the
server does not make — the predicate's job is to mirror it. Blueprint A7.6.

⚠️ **`editable()` has one arm per state, not a branch.** Each arm asks the same
two questions — is this the right person, and is this field in that state's
slice — and the slice is always an object whose keys come from a write type, so
no field list is ever typed by hand:

```ts
switch (cc.current_state) {
  case 'Initiated':                        return isOwner() && field in draftForm;
  case 'Pending Implementation Approval':  return isAssignedApprover() && field in implDecision;
  // …no `default`: the switch is exhaustive over `State`, so a new state
  // fails `bun run check` instead of silently returning false.
}
```

⚠️ **Not every form object is dirty-tracked.** The CC form holds the record
(`cc`) plus one object per editable slice. A slice is dirty-tracked only if an
endpoint saves it incrementally:

| Object | Saved by | Dirty-tracked |
|---|---|---|
| `draftForm` (24) | `PUT /changecontrols/{id}` | yes |
| `implForm` (5) | `PUT …/implementation` | yes |
| `implDecision` (3) · `finalDecision` (2) | **nothing** — they go with the signature in one call | **no** |

The two decision objects are **input buffers**. No endpoint writes `decision`,
`risk_level`, `decision_comments`, `final_decision` or `final_comments` except
the transition itself, so there is nothing for them to be unsaved *from*.
**Do not fold them into `dirty`**: the submit gate refuses while `dirty`, so an
approver's own typing would block their own submission. **They are guarded
separately**, by `unsubmitted`: the buffer compared through `changes()` against
the builder that seeded it, in the gate's state, for the assigned approver only.
The guard reads it, and the bar does not.

⚠️ **Two dialogs in the markup, one `dialog` state** (decisions 88 and 90).
- **The two:** `kind: 'sign'` is the e-signature modal, opened with
  `openEsig(meaning, send)`. `kind: 'requirements'` is the requirements dialog,
  opened **only** by `fail()`, for a body with `issues`.
- **They share nothing but `.modal > .modal-content`**, which is two copies of that
  markup. **T3 is not a third** (step 10). The signature modal shows the reason
  field when `meaning === 'Cancelled'`, so the credentials markup exists once.
- ⚠️ **Extraction, settled at step 10:** the only shared markup is the two wrapper
  `div`s, and a wrapper component needs `{@render children()}`, which is forbidden
  outside `+layout.svelte`. So a `Modal` wrapper cannot be built under these rules
  at any count. `EsigModal` (the whole signature block) has one copy.
- **No pre-flight state in the signature modal.** Its text would be untrue above a
  list of reasons you cannot sign.
- **While either is open, `editable()` locks every control** (`&& dialog === null`),
  and `save()` and every submit handler return. The overlay blocks the pointer
  but not Tab.
- **`editable()`'s locks:** `saving`, `uploading` and `dialog`. Any request
  whose response goes through `setRecord()` needs one, because it rebuilds every
  form object. **The upload also refuses while dirty**, through
  `unsavedRefusal('uploading')`, because edits typed *before* the click would be
  discarded, and a lock cannot protect those (api.md, "The evidence upload").
- **No Escape-to-close and no focus management** (flag 52). No prototype has
  either. Two modal blocks now serve four uses (T2, T3, and both gates to come),
  so someone should decide it deliberately.
- **Known cost (flag 51):** after the requirements dialog is dismissed, nothing
  marks a date that is present but too early.
- **Both approver gates (steps 11 and 13b) chose the meaning at open time**
  and build `send` from a **snapshot** of their buffer, so what is shown is
  what is signed.
- **`closeDialog()` clears the email and password on every way out**, including
  `load()`.

⚠️ **The bar shows `shownError`, not `actionError`** (decision 89). Set errors
only through `fail(body, pinned)`.
- **The rule:** an error hides once `screenKey()` (the four form objects plus
  `incomplete`) differs from the key taken when the error was set.
- **The exception:** only a 409 is pinned, because its reload changes the screen
  by design.
- **Known cost (flag 50):** an error that is still true can hide. For example, an
  over-long Comments 400 hides when Title is edited.

⚠️ **`load()` clears every one of them** before its first `await`, not just the
draft. A stale buffer keeps that state's action button live against a record no
longer on screen, and the `mine = ++latest` check cannot catch it.

⚠️ **Asterisks: never copy them from a prototype.** An asterisk appears only when
**both** of these are true (blueprint A10):
- the viewer can edit the field now
- the transition they are working toward requires it

In code that is `required(field) = editable(field) && MANDATORY[current_state].includes(field)`.

- **A disabled field never carries one.** The prototypes star disabled fields, and
  this departs from them deliberately.
- **Editable and mandatory are different sets.** 24 fields are editable in
  Initiated, but T2 requires 20.
- **The sets are confirmed against the Go.** They are listed in A10 and held once,
  as `MANDATORY` in the form page. Do not retype them in the markup.
