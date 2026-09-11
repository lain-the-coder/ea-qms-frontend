<!--
	The dashboard. One `GET /dashboard` fills the whole page (A10).

	Markup from docs/prototypes/owner/dashboard-cc-owner.html. The empty states
	come from approver/dashboard-approver.html and admin/dashboard-empty.html.
	There is no Viewer prototype, so a Viewer sees the Admin's layout: neither
	owns drafts nor holds approvals.

	The two action cards are personal. Overview and Recent Activity are
	system-wide, and every role sees the same numbers and rows.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { request } from '$lib/api';
	import { auth } from '$lib/auth.svelte';
	import type { DashboardResponse, State } from '$lib/types';

	// The (app) layout mounts this page only once `auth.user` is set, and
	// removes it when the user is cleared, so the assertion holds.
	const user = $derived(auth.user!);

	let loading = $state(true);
	let error = $state<string | null>(null);
	let dashboard = $state<DashboardResponse | null>(null);

	async function load() {
		const res = await request<DashboardResponse>('GET', '/dashboard');
		if (res.ok) dashboard = res.data;
		else error = res.error.error;
		loading = false;
	}

	// `onMount`, not `$effect` (B3). `request()` reads `auth.accessToken`
	// before its first `await`, so an effect would subscribe to the token and
	// refetch whenever it changed: on the 401 path's refresh, and every 24
	// minutes once the scheduled refresh exists. `onMount` subscribes to
	// nothing.
	onMount(load);

	// `Record<State, …>` makes TypeScript demand all six states. No prototype
	// draws `badge-cancelled`, but global.css defines it, and recent activity
	// includes cancelled records.
	const BADGE: Record<State, string> = {
		Initiated: 'badge-initiated',
		'Pending Implementation Approval': 'badge-pending-impl',
		'In Implementation': 'badge-in-implementation',
		'Pending Final Approval': 'badge-pending-final',
		Closed: 'badge-closed',
		Cancelled: 'badge-cancelled'
	};

	// The Pending Approvals card shortens the two gate names, as the approver
	// prototype does. Only these two states can appear there (dashboard.sql).
	const GATE_LABEL: Partial<Record<State, string>> = {
		'Pending Implementation Approval': 'Implementation Approval',
		'Pending Final Approval': 'Final Approval'
	};

	// Typed `State`, so a mistyped state fails `bun run check`. The list
	// endpoint matches the string exactly, and anything else is a 400.
	// URLSearchParams encodes a space as `+`, which Go decodes back to a space.
	function stateHref(state: State): string {
		return '/change-controls?' + new URLSearchParams({ state });
	}

	// "23 Jan 2026, 9:15 AM", as the prototypes write it, in the browser's own
	// time zone. en-GB gives that order but lower-cases am/pm, hence the parts.
	const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	});

	function formatDateTime(iso: string): string {
		return DATE_TIME.formatToParts(new Date(iso))
			.map((part) => (part.type === 'dayPeriod' ? part.value.toUpperCase() : part.value))
			.join('');
	}
</script>

<div class="page-header-with-action">
	<div>
		<h1>Dashboard</h1>
		<p class="page-subtitle">Welcome back, {user.full_name}</p>
	</div>
	{#if user.role === 'CC Owner'}
		<!-- `POST /changecontrols` is CC Owner only (`requireRole` in main.go).
		     It is a button, not the prototype's link, because Create is a POST
		     followed by a `goto`. Step 7a+ wires it, and removes `disabled` and
		     `title`. -->
		<button type="button" class="btn primary" disabled title="Available at step 7a+">
			<i class="bi bi-plus-circle"></i> Create Change Control
		</button>
	{/if}
</div>

{#if loading}
	<p>Loading…</p>
{:else if error}
	<!-- No prototype has this state. `.esig-error` follows decision 10. -->
	<div class="esig-error show">{error}</div>
{:else if dashboard}
	<!-- Action Required -->
	<section class="dashboard-section">
		<h2 class="dashboard-section-title">
			<i class="bi bi-exclamation-circle"></i> Action Required
		</h2>

		<!-- Each card shows its total over a list capped at two, so the number
		     comes from `*_total`, never from the list's length. -->
		<div class="dashboard-grid-2">
			<div class="dashboard-card card-highlight">
				<div class="dashboard-card-header">
					<div>
						<h3>Pending Approvals</h3>
						<p class="dashboard-card-subtitle">Changes awaiting your decision</p>
					</div>
					<span class="dashboard-stat-number">{dashboard.pending_approvals_total}</span>
				</div>
				<div class="dashboard-card-body">
					{#if dashboard.pending_approvals.length > 0}
						<ul class="dashboard-list">
							{#each dashboard.pending_approvals as item}
								<li>
									<span class="dashboard-list-id">{item.cc_id}</span>
									<span class="dashboard-list-title">{item.change_title ?? 'Untitled'}</span>
									<span class="table-badge {BADGE[item.current_state]}">
										{GATE_LABEL[item.current_state] ?? item.current_state}
									</span>
								</li>
							{/each}
						</ul>
					{:else}
						<div class="dashboard-empty-state">
							<i class="bi bi-check-circle"></i>
							<p>No pending approvals</p>
						</div>
					{/if}
				</div>
				<div class="dashboard-card-footer">
					<a href="/approvals" class="dashboard-link">
						View All Approvals <i class="bi bi-arrow-right"></i>
					</a>
				</div>
			</div>

			<div class="dashboard-card card-highlight">
				<div class="dashboard-card-header">
					<div>
						<h3>My Drafts</h3>
						<p class="dashboard-card-subtitle">Initiated but not submitted</p>
					</div>
					<span class="dashboard-stat-number">{dashboard.my_drafts_total}</span>
				</div>
				<div class="dashboard-card-body">
					{#if dashboard.my_drafts.length > 0}
						<ul class="dashboard-list">
							{#each dashboard.my_drafts as item}
								<li>
									<span class="dashboard-list-id">{item.cc_id}</span>
									<span class="dashboard-list-title">{item.change_title ?? 'Untitled'}</span>
									<span class="table-badge {BADGE[item.current_state]}">{item.current_state}</span>
								</li>
							{/each}
						</ul>
					{:else}
						<div class="dashboard-empty-state">
							<i class="bi bi-inbox"></i>
							<p>No drafts yet</p>
						</div>
					{/if}
				</div>
				<div class="dashboard-card-footer">
					<a href="/my-change-controls" class="dashboard-link">
						View My Change Controls <i class="bi bi-arrow-right"></i>
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Overview: system-wide. All five keys are always present, and Cancelled
	     is not one of them. -->
	<section class="dashboard-section">
		<h2 class="dashboard-section-title">
			<i class="bi bi-bar-chart"></i> Overview
		</h2>

		<div class="dashboard-grid-5">
			<a href={stateHref('Initiated')} class="stat-card">
				<div
					class="stat-icon"
					style="background: var(--color-status-initiated-bg); color: var(--color-status-initiated-text);"
				>
					<i class="bi bi-file-earmark-text"></i>
				</div>
				<div class="stat-content">
					<div class="stat-number">{dashboard.overview.initiated}</div>
					<div class="stat-label">Initiated</div>
				</div>
			</a>

			<a href={stateHref('Pending Implementation Approval')} class="stat-card">
				<div
					class="stat-icon"
					style="background: var(--color-status-pending-impl-bg); color: var(--color-status-pending-impl-text);"
				>
					<i class="bi bi-clock-history"></i>
				</div>
				<div class="stat-content">
					<div class="stat-number">{dashboard.overview.pending_implementation_approval}</div>
					<div class="stat-label">Pending Approval</div>
				</div>
			</a>

			<a href={stateHref('In Implementation')} class="stat-card">
				<div
					class="stat-icon"
					style="background: var(--color-status-in-impl-bg); color: var(--color-status-in-impl-text);"
				>
					<i class="bi bi-gear"></i>
				</div>
				<div class="stat-content">
					<div class="stat-number">{dashboard.overview.in_implementation}</div>
					<div class="stat-label">In Implementation</div>
				</div>
			</a>

			<a href={stateHref('Pending Final Approval')} class="stat-card">
				<div
					class="stat-icon"
					style="background: var(--color-status-pending-final-bg); color: var(--color-status-pending-final-text);"
				>
					<i class="bi bi-hourglass-split"></i>
				</div>
				<div class="stat-content">
					<div class="stat-number">{dashboard.overview.pending_final_approval}</div>
					<div class="stat-label">Pending Final</div>
				</div>
			</a>

			<a href={stateHref('Closed')} class="stat-card">
				<div
					class="stat-icon"
					style="background: var(--color-status-closed-bg); color: var(--color-status-closed-text);"
				>
					<i class="bi bi-check-circle"></i>
				</div>
				<div class="stat-content">
					<div class="stat-number">{dashboard.overview.closed}</div>
					<div class="stat-label">Closed</div>
				</div>
			</a>
		</div>
	</section>

	<!-- Recent Activity: system-wide, most recent first, and it can include
	     cancelled records. -->
	<section class="dashboard-section">
		<h2 class="dashboard-section-title">
			<i class="bi bi-clock"></i> Recent Activity
		</h2>

		<div class="card">
			{#if dashboard.recent_activity.length > 0}
				<div class="table-container">
					<table class="data-table">
						<thead>
							<tr>
								<th>CC ID</th>
								<th>Change Title</th>
								<th>Current State</th>
								<th>Last Updated</th>
								<th>Updated By</th>
								<th class="table-actions-col">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each dashboard.recent_activity as row}
								<tr>
									<td class="table-id">{row.cc_id}</td>
									<td class="table-title">{row.change_title ?? 'Untitled'}</td>
									<td>
										<span class="table-badge {BADGE[row.current_state]}">{row.current_state}</span>
									</td>
									<td>{formatDateTime(row.last_updated_on)}</td>
									<td>{row.last_updated_by_name}</td>
									<td class="table-actions">
										<!-- `aria-label` because the link holds only an icon. -->
										<a
											href="/change-controls/{row.cc_id}"
											class="btn-icon"
											title="View"
											aria-label="View {row.cc_id}"
										>
											<i class="bi bi-eye"></i>
										</a>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div style="margin-top: var(--spacing-lg); text-align: center;">
					<a href="/change-controls" class="dashboard-link-standalone">
						View All Change Controls <i class="bi bi-arrow-right"></i>
					</a>
				</div>
			{:else}
				<!-- Reachable only when no change control exists at all. The
				     prototype's message ends "you're involved with", which is false
				     of a system-wide list, so that clause is dropped. -->
				<div class="empty-state">
					<div class="empty-state-icon">
						<i class="bi bi-clock-history"></i>
					</div>
					<h2 class="empty-state-title">No Recent Activity</h2>
					<p class="empty-state-message">
						There hasn't been any recent activity on change controls.
					</p>
					<a href="/change-controls" class="btn secondary">
						<i class="bi bi-list-ul"></i> View All Change Controls
					</a>
				</div>
			{/if}
		</div>
	</section>
{/if}
