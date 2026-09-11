<!--
	Settings → Profile. Read-only in Phase 1 (A10): name, email and role, all
	from `auth.user`, so there is no fetch. It holds Sign Out because that is
	where every prototype puts it. No prototype has one in the sidebar.

	Markup from docs/prototypes/owner/settings-profile-enduser.html and, for an
	Admin, docs/prototypes/admin/settings-profile.html. The two differ only
	where `isAdmin` branches below.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { revoke } from '$lib/api';
	import { auth } from '$lib/auth.svelte';

	// The (app) layout mounts this page only once `auth.user` is set, and
	// removes it when the user is cleared, so the assertion holds.
	const user = $derived(auth.user!);
	const isAdmin = $derived(user.role === 'Admin');
	// "Default CC Owner" gives "DC". The prototype hard-codes "JD".
	const initials = $derived(
		user.full_name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((word) => word[0].toUpperCase())
			.join('')
	);

	// The prototype's Sign Out is a link, and `.logout-btn` is styled for one,
	// so the markup stays a link and its own navigation is cancelled here.
	// That keeps the order explicit.
	//
	// `revoke()` is not awaited. It clears local state before its first
	// `await`, so the tab is signed out as soon as it is called, and it never
	// rejects (decision 17). Awaiting would only hold the page for the
	// /revoke round-trip.
	function signOut(e: MouseEvent) {
		e.preventDefault();
		revoke();
		goto('/login');
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
			<!-- Step 15. A 404 until then. -->
			<a href="/settings/users">
				<i class="bi bi-people"></i> User Management
			</a>
		{/if}
		<a href="/settings" class="active">
			<i class="bi bi-person-circle"></i> Profile
		</a>
	</nav>

	<div class="settings-content">
		<!-- Account Info -->
		<section class="card">
			<div class="profile-header">
				<div class="profile-avatar">{initials}</div>
				<div class="profile-header-info">
					<h3>{user.full_name}</h3>
					<!-- The end-user prototype reads "End User" here, which is not a
					     role. The real one is shown. -->
					<p>{user.role} &nbsp;·&nbsp; {user.email}</p>
				</div>
			</div>

			<p class="profile-section-label">Account Details</p>

			<!-- `for`/`id` pairs are added; the prototype's labels have none. -->
			<div class="grid-2">
				<div class="form-group">
					<label for="profile-name">Full Name</label>
					<input
						type="text"
						id="profile-name"
						class="form-control"
						value={user.full_name}
						disabled
					/>
					{#if isAdmin}
						<div class="field-hint">Name is changed by an Admin in User Management.</div>
					{/if}
				</div>
				<div class="form-group">
					<label for="profile-email">Email Address</label>
					<input
						type="email"
						id="profile-email"
						class="form-control"
						value={user.email}
						disabled
					/>
					{#if isAdmin}
						<div class="field-hint">Email cannot be changed.</div>
					{/if}
				</div>
			</div>

			<div class="form-group">
				<label for="profile-role">Role</label>
				<input type="text" id="profile-role" class="form-control" value={user.role} disabled />
			</div>
		</section>

		<!-- Session -->
		<section class="card">
			<h2 style="margin-top: 0">Session</h2>
			<p
				style="
					font-size: var(--font-size-sm);
					color: var(--color-text-secondary);
					margin: 0 0 var(--spacing-lg) 0;
				"
			>
				{#if isAdmin}
					Signed in as <strong>{user.email}</strong>
				{:else}
					Signing out will end your current session.
				{/if}
			</p>
			<a href="/login" class="logout-btn" onclick={signOut}>
				<i class="bi bi-box-arrow-right"></i> Sign Out
			</a>
		</section>
	</div>
</div>
