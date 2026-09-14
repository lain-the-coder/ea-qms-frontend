<!--
	The change-control list, mounted at two URLs (decision 29).

	Markup from docs/prototypes/owner/all-change-controls.html, whose approver
	and admin variants differ only in the Create button and the eye link's
	target. The empty state comes from admin/my-change-controls-empty.html.

	`/change-controls` is this with no preset; `/my-change-controls` is this
	with `owner=me`. The two prototypes differ in the title, the active sidebar
	link and the Ownership select — and the Ownership select is gone, so what
	is left is one screen.

	THE URL IS THE REQUEST. Every filter and every page lives in the query
	string, so each is `$derived` (B3): a query parameter changes without
	remounting, and a plain `let` would read once and go stale with no error
	anywhere. An invalid value is passed to the API verbatim and its 400 is
	rendered, rather than being quietly reinterpreted here.

	`owner` is the one exception, below.
-->
<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { request } from '$lib/api';
	import { auth } from '$lib/auth.svelte';
	import { BADGE, formatDateTime } from '$lib/format';
	import {
		STATES,
		type ChangeControlListResponse,
		type CreateChangeControlResponse
	} from '$lib/types';

	let { title, ownerPreset = false }: { title: string; ownerPreset?: boolean } = $props();

	// The (app) layout mounts this page only once `auth.user` is set.
	const user = $derived(auth.user!);

	// The prototype's per-page select. The API's own default is 50, so 20 is
	// sent explicitly on every request (A9.1).
	const PAGE_SIZES = [10, 20, 50];
	const DEFAULT_LIMIT = 20;

	// The four filters the API actually supports. `owner` and `assigned` are
	// deliberately absent — see the note above the filter bar.
	const FILTERS = ['search', 'state', 'created_after', 'created_before'] as const;

	// ── Everything read from the URL ────────────────────────────────────────
	const params = $derived(page.url.searchParams);
	const search = $derived(params.get('search') ?? '');
	// NOT `state` — a variable of that name shadows the `$state` rune, and
	// `$state(true)` below is then parsed as a store subscription on it.
	const stateFilter = $derived(params.get('state') ?? '');
	const createdAfter = $derived(params.get('created_after') ?? '');
	const createdBefore = $derived(params.get('created_before') ?? '');
	const filtered = $derived(FILTERS.some((name) => (params.get(name) ?? '') !== ''));

	/**
	 * The query string sent to the API.
	 *
	 * ⚠️ `owner` is set here and NEVER read from the URL. The handler tests
	 * `q.Get("owner") == "me"` exactly, so any other value — a UUID, `ME`, a
	 * leading space — leaves the filter unapplied and returns the unfiltered
	 * list with `200 OK` and no warning. Reading it from the URL would let a
	 * hand-edited `?owner=<someone else's uuid>` leave a page headed "My Change
	 * Controls" listing everyone's records, with nothing at all to show for it.
	 *
	 * The four filters and `offset` pass through verbatim; `limit` falls back
	 * to the UI's default when absent.
	 */
	function buildQuery(q: URLSearchParams): string {
		const out = new URLSearchParams();
		if (ownerPreset) out.set('owner', 'me');
		for (const name of [...FILTERS, 'offset'] as const) {
			const value = q.get(name);
			if (value !== null && value !== '') out.set(name, value);
		}
		out.set('limit', q.get('limit') || String(DEFAULT_LIMIT));
		return out.toString();
	}

	const query = $derived(buildQuery(params));

	// ── The fetch ───────────────────────────────────────────────────────────
	let loading = $state(true);
	let error = $state<string | null>(null);
	let result = $state<ChangeControlListResponse | null>(null);

	// Only the newest request may write the state. The debounced search can
	// leave two in flight, and the slower one must not overwrite the newer.
	let latest = 0;

	async function load(q: string) {
		const mine = ++latest;
		loading = true;
		error = null;
		const res = await request<ChangeControlListResponse>('GET', `/changecontrols?${q}`);
		if (mine !== latest) return;
		if (res.ok) {
			result = res.data;
		} else {
			error = res.error.error;
			// Otherwise a 400 would leave the previous page's rows on screen
			// under an error message.
			result = null;
			// A failed query is not "already loaded", so the next navigation
			// retries it even if the URL is unchanged. This is what lets a
			// dropped connection recover without a reload.
			lastQuery = null;
		}
		loading = false;
	}

	/**
	 * **`onMount` AND `afterNavigate`, deduplicated on the query string.**
	 *
	 * Neither alone is correct here:
	 *
	 * - `onMount` fires once. A filter change is a navigation *without* a
	 *   remount, so the table would never refetch — the bug B3 warns about,
	 *   one layer up from the `$derived` it warns about it in.
	 * - `afterNavigate` alone does not fire on load **in this app**. It
	 *   registers its callback through `onMount`, and SvelteKit dispatches the
	 *   initial `type: 'enter'` during hydration, to whatever is registered at
	 *   that moment. The `(app)` layout gates this component behind
	 *   `auth.user`, which stays null until the restore's `/refresh` and
	 *   `/me` resolve — long after hydration. So on a hard reload this
	 *   component is created *after* `'enter'` has already been dispatched,
	 *   and it would sit on "Loading…" for ever.
	 *
	 * `$effect` is not the answer either (decision 30): `request()` reads
	 * `auth.accessToken` before its first `await`, so an effect would refetch
	 * on every token change.
	 *
	 * Running both and keying on the query string makes the order irrelevant:
	 * whichever fires first issues the request, and the other is a no-op.
	 * `afterNavigate` is what catches the cases a "reload after each `goto`"
	 * would miss — Back and Forward, and the sidebar link tapped while already
	 * on this route.
	 *
	 * B3 lists neither `afterNavigate` nor this pairing, so it is a deliberate
	 * addition to the SvelteKit subset rather than a silent import.
	 */
	let lastQuery: string | null = null;

	function loadIfChanged() {
		if (query === lastQuery) return;
		lastQuery = query;
		load(query);
	}

	onMount(loadIfChanged);
	afterNavigate(loadIfChanged);

	// ── Changing the URL ────────────────────────────────────────────────────

	/**
	 * The current URL with `changes` applied; a null or empty value drops the
	 * parameter.
	 *
	 * **`offset` is dropped unless it is one of the changes** — A9.1's offset
	 * reset. Changing a filter while on page 3 otherwise lands the user on an
	 * empty page.
	 */
	function urlWith(changes: Record<string, string | null>): string {
		const next = new URLSearchParams(page.url.searchParams);
		for (const [name, value] of Object.entries(changes)) {
			if (value === null || value === '') next.delete(name);
			else next.set(name, value);
		}
		if (!('offset' in changes)) next.delete('offset');
		const qs = next.toString();
		return qs ? `${page.url.pathname}?${qs}` : page.url.pathname;
	}

	function setParam(name: string, value: string | null) {
		goto(urlWith({ [name]: value }), { keepFocus: true, noScroll: true });
	}

	// Clears the four filters and, with them, `offset`. `limit` is a page size,
	// not a filter, so it survives.
	function clearFilters() {
		goto(urlWith(Object.fromEntries(FILTERS.map((name) => [name, null]))), {
			keepFocus: true,
			noScroll: true
		});
	}

	// Typing does not navigate on every keystroke: one request 300 ms after the
	// last one. `replaceState` keeps a typing run to a single history entry, so
	// Back leaves the search rather than walking back through it letter by
	// letter, and `keepFocus` leaves the caret where it was.
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	function onSearchInput(event: Event & { currentTarget: HTMLInputElement }) {
		const value = event.currentTarget.value;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			goto(urlWith({ search: value }), {
				replaceState: true,
				keepFocus: true,
				noScroll: true
			});
		}, 300);
	}

	// A pending timer would otherwise fire after the user has left, navigating
	// them back to this list.
	onDestroy(() => clearTimeout(searchTimer));

	// ── Pagination ──────────────────────────────────────────────────────────
	//
	// ⚠️ Every figure here comes from the RESPONSE, never from the URL.
	// `parsePagination` clamps a limit above 200 silently — `?limit=500`
	// returns 200 rows with `200 OK` and nothing saying so — so page
	// arithmetic done on the requested value would be quietly wrong (A9.1).
	const total = $derived(result?.total ?? 0);
	const limit = $derived(result?.limit ?? DEFAULT_LIMIT);
	const offset = $derived(result?.offset ?? 0);
	const rows = $derived(result?.change_controls ?? []);
	const pageCount = $derived(Math.max(1, Math.ceil(total / limit)));
	const currentPage = $derived(Math.floor(offset / limit) + 1);
	const pages = $derived(Array.from({ length: pageCount }, (_, i) => i + 1));

	// The clamp made visible: when the server used a page size the select does
	// not offer, show it as a fourth option rather than leaving the select
	// displaying a number that was never used.
	const pageSizes = $derived(
		PAGE_SIZES.includes(limit) ? PAGE_SIZES : [...PAGE_SIZES, limit].sort((a, b) => a - b)
	);

	// ── Create (step 7a+) ───────────────────────────────────────────────────
	// The same handler as the dashboard's; the reasoning is there. Its own
	// error, separate from `error` above, which replaces the table.
	let creating = $state(false);
	let createError = $state<string | null>(null);

	async function create() {
		// Set before the first `await`, so a second click sends no second POST.
		if (creating) return;
		creating = true;
		createError = null;
		const res = await request<CreateChangeControlResponse>('POST', '/changecontrols');
		if (res.ok) {
			// Stays `creating` until the new page mounts. `cc_id`, not `id` (A11).
			goto(`/change-controls/${res.data.cc_id}`);
			return;
		}
		// ⚠️ A status 0 or 500 does not prove nothing was created (flag 30).
		createError = res.error.error;
		creating = false;
	}

	function goToPage(n: number) {
		const target = (n - 1) * limit;
		goto(urlWith({ offset: target === 0 ? null : String(target) }), {
			keepFocus: true,
			noScroll: true
		});
	}
</script>

<div class="page-header-with-action">
	<div>
		<h1>{title}</h1>
	</div>
	{#if user.role === 'CC Owner'}
		<!-- As on the dashboard: Create is a POST followed by a `goto`, so it
		     is a button rather than the prototype's link. `POST
		     /changecontrols` is `requireRole(roleCCOwner)`, and `requireRole`
		     is exact equality, so an Admin does not get it either. The label
		     is the loading feedback: `global.css` has no `.btn:disabled`. -->
		<button type="button" class="btn primary" disabled={creating} onclick={create}>
			<i class="bi bi-plus-circle"></i>
			{creating ? 'Creating…' : 'Create Change Control'}
		</button>
	{/if}
</div>

<!-- Only a CC Owner can set this, because only they see the button. -->
{#if createError}
	<div class="esig-error show">{createError}</div>
{/if}

<!-- The filter bar renders in every state, including the error and empty ones.
     The prototype's empty state replaces the whole card, which would strand a
     user whose filter matched nothing with no way to clear it.

     ⚠️ There is no Ownership control. The prototype offers "Created by me",
     "Owned by me", "Created by me or Owned by me" and "Awaiting my approval",
     and the API can express only two of those: `owner=me` and `assigned=me`.
     Worse, the two are disjoint by role. Only a CC Owner can own a record —
     `POST /changecontrols` is `requireRole(roleCCOwner)` and no UPDATE ever
     reassigns `change_owner_id`, so the owner is always the creator, which is
     why there is no separate creator to filter on. Only an Approver can be
     assigned one, enforced when the approver is set. So for every one of the
     four roles at least one option can only ever return zero rows.

     `/my-change-controls` is the owner half; the approver's queue is step 11. -->
<section class="card">
	<div class="search-filter-section">
		<div class="search-box">
			<i class="bi bi-search"></i>
			<!-- Three columns, not the prototype's five: the query is ILIKE over
			     cc_id, change_title and the owner's name. It does not search
			     affected systems, and there is no creator. -->
			<input
				type="text"
				placeholder="Search by CC ID, title or owner"
				value={search}
				oninput={onSearchInput}
			/>
		</div>

		<div class="filter-row">
			<div class="filter-group">
				<label for="filter-state">State</label>
				<!-- Iterating STATES keeps the six strings in one place
				     (decision 4). It includes Cancelled, which the prototype's
				     dropdown omits — cancelled records do appear in this list,
				     so a filter that cannot select them would be the only state
				     on screen with no way to reach it. -->
				<select
					id="filter-state"
					class="filter-select"
					value={stateFilter}
					onchange={(e) => setParam('state', e.currentTarget.value)}
				>
					<option value="">All States</option>
					{#each STATES as option}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</div>

			<!-- The prototype's single "Date Range" select offered Last 7/30/90
			     days and a "Custom…" that opens nothing. The API takes two
			     bounds, so it becomes two date inputs. Both are YYYY-MM-DD —
			     the opposite of every date WRITE field, which takes RFC 3339 —
			     and `<input type="date">` produces exactly that, so these must
			     not go through step 7b's conversion helper.

			     `.filter-select` sets only padding, border, radius, font-size,
			     background and cursor, with nothing select-specific, so it
			     carries an input unchanged and no new CSS is needed. -->
			<div class="filter-group">
				<label for="filter-created-after">Created after</label>
				<input
					id="filter-created-after"
					type="date"
					class="filter-select"
					value={createdAfter}
					onchange={(e) => setParam('created_after', e.currentTarget.value)}
				/>
			</div>

			<div class="filter-group">
				<label for="filter-created-before">Created before</label>
				<!-- Inclusive of the whole day: the query compares against
				     `created_before + INTERVAL '1 day'`, because `created_on` is
				     a TIMESTAMPTZ and a bare date parses as midnight. -->
				<input
					id="filter-created-before"
					type="date"
					class="filter-select"
					value={createdBefore}
					onchange={(e) => setParam('created_before', e.currentTarget.value)}
				/>
			</div>

			<button class="btn-filter-clear" type="button" onclick={clearFilters}>
				<i class="bi bi-x-circle"></i> Clear Filters
			</button>
		</div>
	</div>
</section>

{#if loading}
	<p>Loading…</p>
{:else if error}
	<!-- No prototype has this state. `.esig-error` follows decision 10. It
	     covers both the API's 400s — `Invalid state`, `invalid limit: must be a
	     positive integer` — and an unreachable server. -->
	<div class="esig-error show">{error}</div>
{:else if result}
	<section class="card">
		{#if rows.length > 0}
			<div class="table-container">
				<table class="data-table">
					<thead>
						<!-- Plain text, not the prototype's `.sortable` spans: those
						     carry `cursor: pointer` and a hover effect, and no list
						     endpoint has a sort parameter. The order is fixed at
						     `last_updated_on DESC` in SQL (A9.0).

						     "Created By" is dropped — it would be identical to
						     Change Owner in every row. -->
						<tr>
							<th>CC ID</th>
							<th>Change Title</th>
							<th>Current State</th>
							<th>Change Owner</th>
							<th>Created On</th>
							<th>Last Updated</th>
							<th>Approver</th>
							<th class="table-actions-col">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each rows as cc}
							<tr>
								<td class="table-id">{cc.cc_id}</td>
								<td class="table-title">{cc.change_title ?? 'Untitled'}</td>
								<td>
									<span class="table-badge {BADGE[cc.current_state]}">{cc.current_state}</span>
								</td>
								<td>{cc.change_owner_name}</td>
								<td>{formatDateTime(cc.created_on)}</td>
								<td>{formatDateTime(cc.last_updated_on)}</td>
								<td>{cc.assigned_approver_name ?? 'Not Assigned'}</td>
								<td class="table-actions">
									<!-- The eye only. The prototype's pencil went to the
									     same URL, and the form decides editability from
									     the Security Matrix in one place. 404s until 7a
									     (flag 14). `cc_id` is the business key that goes
									     in the URL, not `id`. -->
									<a
										href="/change-controls/{cc.cc_id}"
										class="btn-icon"
										title="View"
										aria-label="View {cc.cc_id}"
									>
										<i class="bi bi-eye"></i>
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="pagination">
				<div class="pagination-info">
					Showing {offset + 1}–{offset + rows.length} of {total} records
				</div>
				<div class="pagination-controls">
					<button
						class="pagination-btn"
						disabled={currentPage === 1}
						onclick={() => goToPage(currentPage - 1)}
					>
						<i class="bi bi-chevron-left"></i> Previous
					</button>
					{#each pages as n}
						<button
							class="pagination-btn {n === currentPage ? 'active' : ''}"
							onclick={() => goToPage(n)}
						>
							{n}
						</button>
					{/each}
					<button
						class="pagination-btn"
						disabled={currentPage === pageCount}
						onclick={() => goToPage(currentPage + 1)}
					>
						Next <i class="bi bi-chevron-right"></i>
					</button>
				</div>
				<div class="pagination-size">
					<label for="page-size">Show</label>
					<select
						id="page-size"
						value={limit}
						onchange={(e) => setParam('limit', e.currentTarget.value)}
					>
						{#each pageSizes as size}
							<option value={size}>{size}</option>
						{/each}
					</select>
					<label for="page-size">per page</label>
				</div>
			</div>
		{:else}
			<!-- Three messages for three different nothings. The prototype's
			     "You haven't created or been assigned as owner of any change
			     controls yet" is dropped: there is no creator, and "assigned"
			     means the approver, so the sentence describes neither filter.
			     Decision 34's precedent. -->
			<div class="empty-state">
				<div class="empty-state-icon">
					<i class="bi bi-inbox"></i>
				</div>
				<h2 class="empty-state-title">No Change Controls Found</h2>
				<p class="empty-state-message">
					{#if filtered}
						No change controls match these filters.
					{:else if ownerPreset}
						You don't own any change controls yet.
					{:else}
						There are no change controls yet.
					{/if}
				</p>
				{#if filtered}
					<button class="btn secondary" type="button" onclick={clearFilters}>
						<i class="bi bi-x-circle"></i> Clear Filters
					</button>
				{/if}
			</div>
		{/if}
	</section>
{/if}
