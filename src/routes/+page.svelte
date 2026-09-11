<!--
	`/` has no content of its own. It sends the user to the dashboard, and the
	(app) layout then decides whether they may see it. Replaces step 1's
	throwaway proof page (decision 2, flag 2).
-->
<script lang="ts">
	import { goto } from '$app/navigation';

	// A mount-only effect that navigates rather than fetches. That stretches
	// B3's "mount-only fetches", and is accepted because the alternative, a
	// `load` redirect, is forbidden by B4. `replaceState` keeps `/` out of the
	// history, so Back does not bounce through it.
	$effect(() => {
		goto('/dashboard', { replaceState: true });
	});
</script>
