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
- **Return early when `!dirty` or `auth.user === null`.** `request()`'s forced
  sign-out calls `goto('/login')`, which runs the same callbacks. A prompt there
  lets the user stay on a form that cannot save.
- **Every sign-out must clear `auth.user` before it navigates.** That includes
  step 17's inactivity popup.
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
directive.

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
| **Incomplete** — keep it | The build cannot do it *yet*, and a later step will. The Implementation Evidence hint is the case: the upload arrives at step 12, and the surrounding flow is visibly scaffolded, so it reads as unfinished rather than as a lie |

**Incomplete, not untrue.** Ask which one before dropping or keeping copy for a
feature that is not built.

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
approver's own typing would block their own submission.

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
