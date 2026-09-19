<!--
	Settings → User Management. Admin only: all four endpoints are
	`requireRole(roleAdmin)`, which is exact equality.

	Markup from docs/prototypes/admin/settings-admin.html. The header and the
	settings nav are the second inline copy; the first is /settings (Profile).

	Not a variation of the CC form (B9), and none of its machinery is here.
	What carried over is the reasoning, not the code:
	- errors are routed by SHAPE, never by message (decision 90)
	- an error goes where the user can act on it (decision 95), so a row's
	  error is a banner under that row, and the create error sits under the
	  create form
	- server sentences are shown verbatim, and client checks mirror the
	  server's and send values as typed (decision 96)
	- only what changed is sent (decision 65)
	No user endpoint returns `issues`, so there is no requirements dialog. The
	banner sits under the row being edited, so there is no `screenKey()`. A 409
	here is a guard, not "the record moved", so nothing reloads.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { request } from '$lib/api';
	import { auth } from '$lib/auth.svelte';
	import { formatDateTime } from '$lib/format';
	import {
		ROLES,
		type CreateUserRequest,
		type ErrorBody,
		type Role,
		type SetUserActiveRequest,
		type UpdateUserRequest,
		type UserListResponse,
		type UserResponse,
		type UserStatusResponse
	} from '$lib/types';

	// The (app) layout mounts this page only once `auth.user` is set.
	const user = $derived(auth.user!);
	// Gates the create form only, as `requireRole` would. The list is fetched
	// for every role, so a non-Admin sees the API's own 403 (decision 38).
	const isAdmin = $derived(user.role === 'Admin');

	const ROLE_BADGE: Record<Role, string> = {
		Admin: 'admin',
		'CC Owner': 'cc-owner',
		Approver: 'approver',
		Viewer: 'viewer'
	};

	// The prototype's per-page select, with 20 sent explicitly: the API's own
	// default is 50 (A9.1).
	const PAGE_SIZES = [10, 20, 50];
	const DEFAULT_LIMIT = 20;

	// ── Everything read from the URL ────────────────────────────────────────
	const params = $derived(page.url.searchParams);

	/**
	 * The query string sent to the API: `limit` and `offset`, nothing else.
	 *
	 * The page lives in the URL so `?limit=2` can prove the paging without
	 * creating permanent users (there is no delete endpoint), and so Reload and
	 * Back keep it.
	 *
	 * ⚠️ `active` is never sent. The prototype has no status filter and shows
	 * both, so a hand-typed `?active=false` is dropped here rather than
	 * silently hiding half the users (decision 37's rule: a parameter the page
	 * does not offer is never read).
	 */
	function buildQuery(q: URLSearchParams): string {
		const out = new URLSearchParams();
		const offset = q.get('offset');
		if (offset !== null && offset !== '') out.set('offset', offset);
		out.set('limit', q.get('limit') || String(DEFAULT_LIMIT));
		return out.toString();
	}

	const query = $derived(buildQuery(params));

	// ── The fetch ───────────────────────────────────────────────────────────
	let loading = $state(true);
	let error = $state<string | null>(null);
	let result = $state<UserListResponse | null>(null);

	let latest = 0;

	async function load(q: string) {
		const mine = ++latest;
		loading = true;
		error = null;
		// An open edit and a row's error belong to the page they were on.
		editing = null;
		rowError = null;
		const res = await request<UserListResponse>('GET', `/users?${q}`);
		if (mine !== latest) return;
		if (res.ok) {
			result = res.data;
		} else {
			error = res.error.error;
			result = null;
			// A failed query is not "already loaded", so it can be retried.
			lastQuery = null;
		}
		loading = false;
	}

	// `onMount` AND `afterNavigate`, deduplicated on the query string. The
	// reasoning is in ChangeControlList.svelte: `afterNavigate` alone never
	// fires on a hard reload in this app, and `onMount` alone never refetches.
	let lastQuery: string | null = null;

	function loadIfChanged() {
		if (query === lastQuery) return;
		lastQuery = query;
		load(query);
	}

	onMount(loadIfChanged);
	afterNavigate(loadIfChanged);

	// ── Pagination ──────────────────────────────────────────────────────────
	// Every figure comes from the RESPONSE: `parsePagination` clamps a limit
	// above 200 silently (A9.1).
	const total = $derived(result?.total ?? 0);
	const limit = $derived(result?.limit ?? DEFAULT_LIMIT);
	const offset = $derived(result?.offset ?? 0);
	const rows = $derived(result?.users ?? []);
	const pageCount = $derived(Math.max(1, Math.ceil(total / limit)));
	const currentPage = $derived(Math.floor(offset / limit) + 1);
	const pages = $derived(Array.from({ length: pageCount }, (_, i) => i + 1));

	// The clamp made visible (decision 39).
	const pageSizes = $derived(
		PAGE_SIZES.includes(limit) ? PAGE_SIZES : [...PAGE_SIZES, limit].sort((a, b) => a - b)
	);

	// The current URL with `changes` applied; null drops the parameter.
	function goWith(changes: Record<string, string | null>) {
		const next = new URLSearchParams(page.url.searchParams);
		for (const [name, value] of Object.entries(changes)) {
			if (value === null) next.delete(name);
			else next.set(name, value);
		}
		const qs = next.toString();
		goto(qs ? `${page.url.pathname}?${qs}` : page.url.pathname, {
			keepFocus: true,
			noScroll: true
		});
	}

	function goToPage(n: number) {
		const target = (n - 1) * limit;
		goWith({ offset: target === 0 ? null : String(target) });
	}

	// A new page size starts again at page 1 (A9.1's offset reset).
	function setPageSize(value: string) {
		goWith({ limit: value, offset: null });
	}

	// ── A row's response ────────────────────────────────────────────────────

	/**
	 * Both PUTs return `UserStatusResponse`, which has `updated_on` and NO
	 * `created_on`. So the fields are picked into the existing row, never the
	 * row replaced, or Created On would be lost.
	 *
	 * A row no longer on screen (the page changed mid-request) is skipped.
	 * The row does not re-sort after a rename until the next load.
	 */
	function merge(res: UserStatusResponse) {
		const row = result?.users.find((u) => u.id === res.id);
		if (row) {
			row.full_name = res.full_name;
			row.role = res.role;
			row.is_active = res.is_active;
		}
		// Your own rename: Profile reads `auth.user`, which would otherwise
		// keep the old name until a reload. The role cannot change here.
		if (auth.user && res.id === auth.user.id) auth.user.full_name = res.full_name;
	}

	// ── Row errors: one banner, under the row whose control produced it ─────

	/**
	 * `action` is which control the client used, known because it chose the
	 * endpoint. The banner's heading comes from it, never from the message.
	 */
	let rowError = $state<{ id: string; action: 'edit' | 'status'; body: ErrorBody } | null>(
		null
	);

	/**
	 * The banner's text, as segments so the heading and each CC-ID can be
	 * <strong>, as drawn. Routed by SHAPE (decision 90):
	 * - a 409 with `blocked_cc_ids` gets the prototype's sentence, with the
	 *   ids joined "A, B and C"
	 * - anything else is the server's own sentence, verbatim. No user endpoint
	 *   returns `issues`.
	 *
	 * "No part of this change has been saved" is true for the edit: the CC
	 * guard returns before any write, and the transaction rolls back (backend
	 * decision 22). It is not said for the toggle, which has one field and
	 * visibly never moved.
	 */
	function banner(
		err: { action: 'edit' | 'status'; body: ErrorBody },
		name: string
	): { text: string; strong: boolean }[] {
		if (!('blocked_cc_ids' in err.body)) return [{ text: err.body.error, strong: false }];
		const ids = err.body.blocked_cc_ids;
		const one = ids.length === 1;
		const edit = err.action === 'edit';
		const out = [
			{ text: edit ? 'Role change blocked.' : 'Deactivation blocked.', strong: true },
			{ text: ` ${name} is associated with active Change ${one ? 'Control' : 'Controls'} `, strong: false }
		];
		ids.forEach((id, i) => {
			out.push({ text: id, strong: true });
			if (i < ids.length - 2) out.push({ text: ', ', strong: false });
			else if (i === ids.length - 2) out.push({ text: ' and ', strong: false });
		});
		out.push({
			text:
				`. ${one ? 'This record' : 'These records'} must be Closed or Cancelled before ` +
				(edit
					? 'the role can be changed. No part of this change has been saved.'
					: 'the user can be deactivated.'),
			strong: false
		});
		return out;
	}

	// ── The edit row ────────────────────────────────────────────────────────

	// One row at a time. Opening another pencil replaces the edit and drops
	// its typing (flag 66, accepted: a retype, and no guard is built for it).
	let editing = $state<{ id: string; full_name: string; role: Role } | null>(null);
	let savingEdit = $state(false);

	function isEditing(u: UserResponse): boolean {
		return editing !== null && editing.id === u.id;
	}

	// On the id, never the name (A11).
	function isSelf(u: UserResponse): boolean {
		return u.id === user.id;
	}

	function startEdit(u: UserResponse) {
		if (savingEdit) return;
		editing = { id: u.id, full_name: u.full_name, role: u.role };
		rowError = null;
	}

	function cancelEdit() {
		if (savingEdit) return;
		editing = null;
		rowError = null;
	}

	/**
	 * Sends only what differs from the row (decision 65), so a stale tab
	 * cannot revert another Admin's change. Your own row has no role select,
	 * so its role never differs and is never sent.
	 *
	 * An empty diff sends nothing and just closes the row. The row going
	 * back to display is the answer; there is no "No changes to save", which
	 * is Save Draft's answer on a form that stays open.
	 *
	 * ⚠️ A 409 is all-or-nothing: the CC guard runs before any write, so a
	 * name sent beside a blocked role was not saved either. The row stays
	 * open with what was typed, so the Admin can retry with the name alone.
	 */
	async function saveEdit(u: UserResponse) {
		if (savingEdit || editing === null) return;
		const body: UpdateUserRequest = {};
		if (editing.full_name !== u.full_name) body.full_name = editing.full_name;
		if (editing.role !== u.role) body.role = editing.role;
		rowError = null;
		if (body.full_name === undefined && body.role === undefined) {
			editing = null;
			return;
		}
		// The handler's only check a typed value can fail, with its sentence.
		// Trimmed for the check, as Go trims; sent as typed.
		if (body.full_name !== undefined && body.full_name.trim() === '') {
			rowError = { id: u.id, action: 'edit', body: { error: 'Full Name cannot be blank' } };
			return;
		}
		// Set before the first `await`, so a second click sends nothing.
		savingEdit = true;
		const res = await request<UserStatusResponse>('PUT', `/users/${u.id}`, body);
		savingEdit = false;
		if (res.ok) {
			merge(res.data);
			if (editing?.id === u.id) editing = null;
		} else {
			// ⚠️ A status 0 does not prove nothing was saved (trap 6). Clicking
			// again is safe: a committed change now matches, so the retry is
			// a no-op 200 that brings the row up to date.
			rowError = { id: u.id, action: 'edit', body: res.error };
		}
	}

	// ── The status toggle ───────────────────────────────────────────────────

	// Per row, and not `$state`: nothing on screen reads it (decision 115's
	// precedent). A second click on the same row is ignored.
	const toggling = new Set<string>();

	/**
	 * `preventDefault()` stops the browser flipping the checkbox, so it never
	 * shows a status the server has not confirmed. A 200 moves it through
	 * `merge`; on a failure there is nothing to put back.
	 *
	 * No confirm dialog: no prototype or BRD draws one, and it is reversible.
	 */
	async function toggleStatus(e: MouseEvent, u: UserResponse) {
		e.preventDefault();
		if (toggling.has(u.id)) return;
		toggling.add(u.id);
		if (rowError?.id === u.id) rowError = null;
		const body: SetUserActiveRequest = { is_active: !u.is_active };
		const res = await request<UserStatusResponse>('PUT', `/users/${u.id}/active`, body);
		toggling.delete(u.id);
		if (res.ok) merge(res.data);
		else rowError = { id: u.id, action: 'status', body: res.error };
	}

	// ── Create ──────────────────────────────────────────────────────────────

	const newUser = $state<{ full_name: string; email: string; password: string; role: Role | '' }>(
		{ full_name: '', email: '', password: '', role: '' }
	);
	let creating = $state(false);
	let createError = $state<string | null>(null);
	let createNotice = $state<string | null>(null);

	/**
	 * The handler's four blank checks, in its order, with its sentences
	 * (decision 96: apply what the server applies, send as typed). The name,
	 * email and role are trimmed for the check, as Go trims them. The password
	 * is compared with `''` only, because it is never trimmed (BR-8.2.16).
	 *
	 * ⚠️ The password POLICY is not mirrored. Its 400 comes before the
	 * transaction, writes nothing, loses nothing typed, and already lists
	 * every unmet rule in one sentence. A mirror would copy Go's Unicode
	 * category tables into `\p{…}` classes, which decision 96 declined to do
	 * for whitespace.
	 *
	 * The role check is also what makes the body a `CreateUserRequest`
	 * without a cast: `''` is not a `Role`.
	 */
	function createBody(): CreateUserRequest | string {
		if (newUser.full_name.trim() === '') return 'Full Name cannot be blank';
		if (newUser.email.trim() === '') return 'Email cannot be blank';
		if (newUser.password === '') return 'Password cannot be blank';
		if (newUser.role === '') return 'Role cannot be blank';
		return {
			full_name: newUser.full_name,
			email: newUser.email,
			password: newUser.password,
			role: newUser.role
		};
	}

	/**
	 * ⚠️ Unlike flag 30's duplicate record, a status 0 after a commit is safe
	 * to retry: the email is unique case-insensitively, so the second attempt
	 * is a 409, not a second user.
	 */
	async function createUser() {
		if (creating) return;
		createNotice = null;
		const body = createBody();
		if (typeof body === 'string') {
			createError = body;
			return;
		}
		creating = true;
		createError = null;
		const res = await request<UserResponse>('POST', '/users', body);
		creating = false;
		if (!res.ok) {
			// Verbatim, with everything typed kept so it can be fixed.
			createError = res.error.error;
			return;
		}
		// Cleared, so the password leaves the page's state.
		newUser.full_name = '';
		newUser.email = '';
		newUser.password = '';
		newUser.role = '';
		createNotice = `Added ${res.data.full_name} (${res.data.email}).`;
		// The new user may sort onto another page, and `total` has changed.
		lastQuery = null;
		loadIfChanged();
	}
</script>

<div class="page-header-with-action">
	<div>
		<h1>Settings</h1>
		{#if isAdmin}
			<p class="page-subtitle">Manage users and your account preferences</p>
		{/if}
	</div>
</div>

<div class="settings-layout">
	<nav class="settings-nav">
		{#if isAdmin}
			<a href="/settings/users" class="active">
				<i class="bi bi-people"></i> User Management
			</a>
		{/if}
		<a href="/settings">
			<i class="bi bi-person-circle"></i> Profile
		</a>
	</nav>

	<div class="settings-content">
		{#if isAdmin}
			<!-- ================== Create User ================== -->
			<section class="card">
				<h2 style="margin-top: 0">Create New User</h2>
				<p class="page-subtitle" style="margin-bottom: var(--spacing-xl)">
					New users can sign in immediately with the credentials you set.
				</p>

				<!-- Above the grid, where `.esig-error`'s own bottom margin spaces
				     it. The notice goes below, where `.field-hint`'s top margin
				     does. No inline style either way. -->
				{#if createError}
					<div class="esig-error show">{createError}</div>
				{/if}

				<!-- `for`/`id` pairs are added; the prototype's labels have none.
				     The asterisks are the prototype's, and true: the handler
				     refuses each field blank. -->
				<div class="create-user-grid">
					<div class="form-group">
						<label for="new-full-name">Full Name *</label>
						<input
							type="text"
							id="new-full-name"
							class="form-control"
							placeholder="e.g. Sarah Johnson"
							bind:value={newUser.full_name}
						/>
					</div>
					<div class="form-group">
						<label for="new-email">Email Address *</label>
						<!-- `autocomplete="off"` and `"new-password"` below: without
						     them the browser fills in the Admin's OWN saved sign-in
						     here. -->
						<input
							type="email"
							id="new-email"
							class="form-control"
							placeholder="name@eami.ae"
							autocomplete="off"
							bind:value={newUser.email}
						/>
					</div>

					<div class="form-group">
						<label for="new-password">Password *</label>
						<input
							type="password"
							id="new-password"
							class="form-control"
							placeholder="Set initial password"
							autocomplete="new-password"
							bind:value={newUser.password}
						/>
					</div>
					<div class="form-group">
						<label for="new-role">Role *</label>
						<!-- `ROLES`, never the prototype's options (decision 4). -->
						<select id="new-role" class="form-control" bind:value={newUser.role}>
							<option value="">Select role</option>
							{#each ROLES as role}
								<option value={role}>{role}</option>
							{/each}
						</select>
					</div>
					<div class="form-group">
						<!-- The label is the loading feedback: `global.css` has no
						     `.btn:disabled` (decision 59). -->
						<button
							type="button"
							class="btn primary"
							style="width: 100%; justify-content: center"
							disabled={creating}
							onclick={createUser}
						>
							<i class="bi bi-person-plus"></i>
							{creating ? 'Adding…' : 'Add User'}
						</button>
					</div>
				</div>

				{#if createNotice}
					<div class="field-hint">{createNotice}</div>
				{/if}
			</section>
		{/if}

		<!-- ================== User List ================== -->
		{#if loading}
			<p>Loading…</p>
		{:else if error}
			<!-- The list's own failures (a pagination 400, an unreachable server)
			     and a non-Admin's 403 `Forbidden`, verbatim. -->
			<div class="esig-error show">{error}</div>
		{:else if result}
			<section class="card">
				<h2 style="margin-top: 0">All Users</h2>

				<div class="table-container" style="margin: 0; padding: 0">
					<table class="data-table">
						<thead>
							<tr>
								<th>Full Name</th>
								<th>Email</th>
								<th>Role</th>
								<th>Created On</th>
								<th>Status</th>
								<th class="table-actions-col">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each rows as u}
								<!-- One row for both modes; only the name, role and
								     actions cells switch. The edit row's background and
								     the inactive row's opacity are the prototype's.

								     ⚠️ Unkeyed (B3), so DOM nodes follow POSITION (flag 70).
								     The typed name is safe, since it lives in `editing` by
								     id, but a reorder under an open edit would rebuild the
								     input and drop focus. Unreachable while `load()`
								     clears `editing` and `merge()` never reorders. -->
								<tr
									style={isEditing(u)
										? 'background: #fafbff'
										: u.is_active
											? undefined
											: 'opacity: 0.6'}
								>
									<td style={isEditing(u) ? undefined : 'font-weight: var(--font-weight-medium)'}>
										<!-- Written out, not `isEditing(u)`, so `editing` is
										     narrowed for the binding. -->
										{#if editing !== null && editing.id === u.id}
											<input
												type="text"
												class="inline-edit-input"
												aria-label="Full Name"
												disabled={savingEdit}
												bind:value={editing.full_name}
											/>
										{:else}
											{u.full_name}
											{#if isSelf(u)}
												<span
													style="
														font-size: var(--font-size-xs);
														color: var(--color-text-light);
														margin-left: 6px;
													">(you)</span
												>
											{/if}
										{/if}
									</td>
									<td style="color: var(--color-text-secondary)">{u.email}</td>
									<td>
										<!-- Your own row keeps the badge while editing: a
										     self role change is a 400 (A10), so there is
										     no control for it. -->
										{#if editing !== null && editing.id === u.id && !isSelf(u)}
											<select
												class="inline-edit-select"
												aria-label="Role"
												disabled={savingEdit}
												bind:value={editing.role}
											>
												{#each ROLES as role}
													<option value={role}>{role}</option>
												{/each}
											</select>
										{:else}
											<span class="user-role-badge {ROLE_BADGE[u.role]}">{u.role}</span>
										{/if}
									</td>
									<!-- An instant, so `formatDateTime` (decision 57), where
									     the prototype writes the date alone. -->
									<td style="color: var(--color-text-secondary)">
										{formatDateTime(u.created_on)}
									</td>
									<td>
										<!-- Disabled on your own row, as drawn: self-
										     deactivation is a 400. It looks enabled,
										     because `.toggle-switch` has no disabled style
										     (flag 67). -->
										<label class="toggle-switch">
											<input
												type="checkbox"
												checked={u.is_active}
												disabled={isSelf(u)}
												onclick={(e) => toggleStatus(e, u)}
											/>
											<span class="toggle-track"></span>
											<span
												class="toggle-label"
												style={u.is_active ? undefined : 'color: var(--color-text-light)'}
											>
												{u.is_active ? 'Active' : 'Inactive'}
											</span>
										</label>
									</td>
									<td class="table-actions">
										{#if isEditing(u)}
											<div style="display: flex; align-items: center; gap: var(--spacing-xs)">
												<button
													type="button"
													class="btn-icon-sm save"
													title="Save"
													aria-label="Save"
													disabled={savingEdit}
													onclick={() => saveEdit(u)}
												>
													<i class="bi bi-check-lg"></i>
												</button>
												<button
													type="button"
													class="btn-icon-sm"
													title="Cancel"
													aria-label="Cancel"
													disabled={savingEdit}
													onclick={cancelEdit}
												>
													<i class="bi bi-x-lg"></i>
												</button>
											</div>
										{:else}
											<!-- On your own row too, unlike the prototype: the
											     API allows a self NAME change (backend
											     decision 21), and Profile says "Name is changed
											     by an Admin in User Management", which would
											     otherwise be untrue for an Admin. -->
											<button
												type="button"
												class="btn-icon-sm"
												title="Edit user"
												aria-label="Edit {u.full_name}"
												onclick={() => startEdit(u)}
											>
												<i class="bi bi-pencil"></i>
											</button>
										{/if}
									</td>
								</tr>

								<!-- The prototype's banner row, directly beneath the row
								     whose pencil or toggle produced the error. The text is
								     `banner()`'s, which routes by shape. -->
								{#if rowError !== null && rowError.id === u.id}
									<tr class="role-block-row">
										<td colspan="6">
											<div class="role-block-msg">
												<i class="bi bi-exclamation-triangle-fill"></i>
												<div>
													{#each banner(rowError, u.full_name) as part}{#if part.strong}<strong
																>{part.text}</strong
															>{:else}{part.text}{/if}{/each}
												</div>
											</div>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>

				<div class="pagination">
					<div class="pagination-info">
						<!-- An offset past the end is `[]` with the true total, and
						     "Showing 21–20 of 5" would be false. -->
						{#if rows.length > 0}
							Showing {offset + 1}–{offset + rows.length} of {total} users
						{:else}
							No users on this page
						{/if}
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
							disabled={currentPage >= pageCount}
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
							onchange={(e) => setPageSize(e.currentTarget.value)}
						>
							{#each pageSizes as size}
								<option value={size}>{size}</option>
							{/each}
						</select>
						<label for="page-size">per page</label>
					</div>
				</div>
			</section>
		{/if}
	</div>
</div>
