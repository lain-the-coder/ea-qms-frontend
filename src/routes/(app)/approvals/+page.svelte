<!--
	Approvals — the same list with `assigned=me`, one gate at a time (step 11).

	⚠️ No "All" option. `?state=` takes one value, and with none the handler
	returns EVERY state the caller is assigned in (Initiated, In Implementation
	and Closed too), not "both gates". So the select switches between the two
	gates, and the page lands on the first. Each view is one real request with
	a correct `total` and pagination.

	Known cost: the dashboard's Pending Approvals count spans both gates, so it
	can read higher than what this page shows on landing.

	No Create: the sidebar gives every role this page, and a CC Owner is never
	assigned a record (decision 36), so Create has no place here.
-->
<script lang="ts">
	import ChangeControlList from '$lib/components/ChangeControlList.svelte';
	import type { State } from '$lib/types';

	const GATES: readonly State[] = ['Pending Implementation Approval', 'Pending Final Approval'];
</script>

<ChangeControlList
	title="Approvals"
	preset="assigned"
	stateOptions={GATES}
	defaultState="Pending Implementation Approval"
	allowCreate={false}
/>
