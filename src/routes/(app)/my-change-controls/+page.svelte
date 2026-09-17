<!--
	My Change Controls — the same list with `owner=me` (decision 29).

	The preset is a prop, not a query parameter: the component sets `owner=me`
	itself and never reads `owner` from the URL, because the handler ignores any
	value other than the literal `me` without saying so.
-->
<script lang="ts">
	import ChangeControlList from '$lib/components/ChangeControlList.svelte';
</script>

<ChangeControlList title="My Change Controls" preset="owner" />
