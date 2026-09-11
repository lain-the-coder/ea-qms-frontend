<!--
	The authenticated shell (B5): the prototypes' sidebar, and the session
	restore a hard reload needs (B8).

	Sequencing. On a hard reload `auth.user` is null even when the session is
	valid, because the user and the access token live in memory. So nothing
	here redirects on a null user. The content area waits for `auth.user`, and
	the restore below either fills it or ends the session. Only three places
	redirect, each after a verdict: this restore, `request()`'s sign-out, and
	the Sign Out button.

	Pages under this layout mount only once `auth.user` is set, so no page can
	fetch before there is an access token to send.

	The sidebar renders at once, because it is static and the same for every
	role. While the restore runs the content area shows B3's "Loading…", not a
	blank page, which would look broken on a slow connection.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { isTokenVerdict, refresh, request } from '$lib/api';
	import { auth, endSession, getRefreshToken } from '$lib/auth.svelte';
	import type { MeResponse } from '$lib/types';

	let { children } = $props();

	// A URL value, so `$derived` (B3). The layout is not remounted when the
	// user moves between pages, so a plain `let` would keep the first path.
	//
	// Typed as `string` on purpose. SvelteKit types `pathname` as the union of
	// the routes that exist, and the sidebar links to routes that later steps
	// build, so comparing against those would not type-check. This widens the
	// type rather than casting it: every pathname is a string.
	const path: string = $derived(page.url.pathname);

	// Set when the restore failed with no verdict on the token: no response,
	// or a 500. The token is kept (decision 12), and Retry runs the restore
	// again.
	let failure = $state<string | null>(null);

	// Read once, when the layout is created, and deliberately not reactive.
	// After a client-side login the user is already set and there is nothing
	// to restore. After a hard reload it is null.
	const needsRestore = auth.user === null;

	async function restore() {
		failure = null;
		const token = getRefreshToken();
		if (token === null) {
			// No request. A blank refresh token is a 400, not a 401.
			goto('/login', { replaceState: true });
			return;
		}
		const refreshed = await refresh(token);
		if (!refreshed.ok) {
			if (isTokenVerdict(refreshed.status)) {
				// Carries A1.7's message to the login screen.
				endSession(refreshed.error.error);
				goto('/login', { replaceState: true });
			} else {
				failure = refreshed.error.error;
			}
			return;
		}
		auth.accessToken = refreshed.data.token;
		// Through `request()`, so a deactivation between the two calls ends the
		// session there, the same way it would on any other page.
		const me = await request<MeResponse>('GET', '/me');
		if (me.ok) {
			auth.user = me.data;
		} else if (auth.accessToken !== null) {
			// A null token means `request()` has already ended the session and
			// navigated to /login.
			failure = me.error.error;
		}
	}

	// A mount-only fetch, so `onMount`, not `$effect` (B3). An effect subscribes
	// to any state it reads before its first `await`, including reads inside
	// the functions it calls. `onMount` subscribes to nothing, so this runs once
	// whatever `restore()` comes to read.
	onMount(() => {
		if (needsRestore) restore();
	});
</script>

<div class="app-layout">
	<aside class="sidebar">
		<div class="sidebar-header">
			<div class="logo">
				<i class="bi bi-files"></i>
				<a href="/dashboard"><span>EA QMS</span></a>
			</div>
		</div>

		<!-- The same five links for every role: BRD §2.3.4 and §9.5.1, and all
		     three role prototypes. All Change Controls stays active on a CC
		     form, as it does in every cc-form-* prototype. -->
		<div class="sidebar-body">
			<nav>
				<a href="/dashboard" class={path === '/dashboard' ? 'active' : undefined}>Dashboard</a>
				<a
					href="/change-controls"
					class={path.startsWith('/change-controls') ? 'active' : undefined}
				>
					All Change Controls
				</a>
				<a
					href="/my-change-controls"
					class={path === '/my-change-controls' ? 'active' : undefined}
				>
					My Change Controls
				</a>
				<a href="/approvals" class={path === '/approvals' ? 'active' : undefined}>Approvals</a>
				<a href="/settings" class={path.startsWith('/settings') ? 'active' : undefined}>Settings</a>
			</nav>
		</div>
	</aside>

	<main class="content">
		{#if auth.user}
			{@render children()}
		{:else if failure}
			<!-- No prototype has this state. `.esig-error` follows the login
			     page's precedent (decision 10). -->
			<div class="esig-error show">{failure}</div>
			<button type="button" class="btn secondary" onclick={restore}>Retry</button>
		{:else}
			<p>Loading…</p>
		{/if}
	</main>
</div>
