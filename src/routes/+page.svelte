<!--
	THROWAWAY — step 1 only. Deleted at step 4, when the real authenticated layout
	(B5) is built and `/` becomes a redirect. This is not the seed of anything.

	Markup is copied verbatim from docs/prototypes/owner/dashboard-cc-owner.html:
	the sidebar, the page header, and the Recent Activity card. Nothing visual is
	invented (B1). The only edits are `href` values, which point at prototype
	.html files that are not routes here.

	Its whole job is to answer the question B12 leaves open — whether `global.css`
	survives being loaded by a component rather than a complete document, with
	SvelteKit's `<div style="display: contents">` wrapper sitting between <body>
	and .app-layout.
-->

<div class="app-layout">
	<aside class="sidebar">
		<div class="sidebar-header">
			<div class="logo">
				<i class="bi bi-files"></i>
				<a href="/" style="color: inherit; text-decoration: none;"><span>EA QMS</span></a>
			</div>
		</div>

		<div class="sidebar-body">
			<nav>
				<a href="/" class="active">Dashboard</a>
				<a href="/">All Change Controls</a>
				<a href="/">My Change Controls</a>
				<a href="/">Approvals</a>
				<a href="/">Settings</a>
			</nav>
		</div>
	</aside>

	<main class="content">
		<div class="page-header-with-action">
			<div>
				<h1>Dashboard</h1>
				<p class="page-subtitle">Welcome back, John Doe</p>
			</div>
			<a href="/" class="btn primary">
				<i class="bi bi-plus-circle"></i> Create Change Control
			</a>
		</div>

		<section class="dashboard-section">
			<h2 class="dashboard-section-title">
				<i class="bi bi-clock"></i> Recent Activity
			</h2>

			<div class="card">
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
							<tr>
								<td class="table-id">CC-003</td>
								<td class="table-title">Security patch deployment for payment gateway</td>
								<td>
									<span class="table-badge badge-in-implementation">In Implementation</span>
								</td>
								<td>23 Jan 2026, 9:15 AM</td>
								<td>John Doe</td>
								<td class="table-actions">
									<a href="/" class="btn-icon" title="View">
										<i class="bi bi-eye"></i>
									</a>
								</td>
							</tr>

							<tr>
								<td class="table-id">CC-001</td>
								<td class="table-title">Kiosk payment receipt currency display update</td>
								<td>
									<span class="table-badge badge-initiated">Initiated</span>
								</td>
								<td>21 Jan 2026, 4:50 PM</td>
								<td>John Doe</td>
								<td class="table-actions">
									<a href="/" class="btn-icon" title="View">
										<i class="bi bi-eye"></i>
									</a>
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<div style="margin-top: var(--spacing-lg); text-align: center;">
					<a href="/" class="dashboard-link-standalone">View All Change Controls <i class="bi bi-arrow-right"></i></a>
				</div>
			</div>
		</section>
	</main>
</div>
