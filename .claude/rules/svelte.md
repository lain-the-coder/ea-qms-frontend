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

**Avoid `:global`** — `global.css` is imported once at the root and applies
everywhere. Reaching for `:global` usually means the markup drifted from the
prototype.

## Markup comes from the prototypes

Before writing a screen, read the matching file in `docs/prototypes/` — `owner/`,
`approver/`, or `admin/`. Reuse its markup structure and `global.css` classes.
**Invent nothing visual.** No new CSS tokens, no components that do not appear in
a prototype.

## Enum values

Never copy an `<option value>` from a prototype — six of them use en-dashes
(U+2013) where the API requires ASCII hyphens (U+002D). **Take values from
`docs/openapi.yaml` or `docs/CC_Field_Reference.md`.**

## Permissions

Which fields are editable in a given state for a given role comes from
`docs/Security_Matrix_V2_1.md`, which lists them per state. That becomes `{#if}`
and `disabled` — one page for all states and roles, never a page per state.
