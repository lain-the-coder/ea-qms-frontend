<!--
	PLACEHOLDER — step 4. Only the page header from
	docs/prototypes/owner/dashboard-cc-owner.html, whose job is to show that the
	(app) layout filled `auth.user` from `GET /me`. Step 5 builds the dashboard.
-->
<script lang="ts">
	import { auth } from '$lib/auth.svelte';

	// The (app) layout mounts this page only once `auth.user` is set, and
	// removes it when the user is cleared, so the assertion holds.
	const user = $derived(auth.user!);
</script>

<div class="page-header-with-action">
	<div>
		<h1>Dashboard</h1>
		<p class="page-subtitle">Welcome back, {user.full_name}</p>
	</div>
</div>
