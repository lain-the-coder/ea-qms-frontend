<!--
	The change-control form (B5): one page for every state and every role.
	Step 7b binds the owner's 24 draft fields, and 7c saves them. Save Draft
	sends only the fields that differ from the record. 7d shows, continuously,
	whether any do: the gate step 9's Submit depends on.

	Markup from docs/prototypes/owner/cc-form-closed.html, the one prototype
	with every section populated. The other cc-form-* prototypes differ in which
	controls are enabled, in their info banner and in their action buttons.

	READ-ONLY MEANS `disabled`, NOT TEXT. Every field the Security Matrix can
	make editable is a real control, disabled through `editable()`, so enabling
	one never rewrites the markup. The 24 draft fields are `bind:value` on
	`form`. The other ten still take `value=` from `cc`: they belong to other
	endpoints and bind when their own state's step lands. The thirteen system
	fields are never editable by anyone (CC ID, the approval By/On values, the
	statuses…), so they stay as the prototype's `.meta-value` text.

	TWO OBJECTS. `cc` is what the server last sent; `form` is what is on
	screen. Binding straight to `cc` would overwrite the server's version on
	the first keystroke, and then neither the save body (7c) nor the dirty
	check (7d) could tell what changed. Only `setRecord()` assigns either.

	NOTHING IS HIDDEN BY STATE. A field with no value yet renders empty, where
	the prototypes draw "Not applicable" boxes (a departure from BRD Rule P5).
	The one exception is Cancellation Reason, shown only on a Cancelled record
	(BRD Rule P6).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { request } from '$lib/api';
	import { auth } from '$lib/auth.svelte';
	import { formatDateTime } from '$lib/format';
	import {
		CHANGE_CATEGORIES,
		CHANGE_TYPES,
		DECISIONS,
		DEPARTMENT_FUNCTIONS,
		EXPECTED_DOWNTIME,
		POST_IMPLEMENTATION_ISSUES,
		REQUIRES_TESTING,
		REQUIRES_TRAINING,
		RISK_LEVELS,
		type ApproverRef,
		type ChangeControlResponse,
		type ListApproversResponse,
		type DecisionRequest,
		type ESignatureCredentials,
		type ErrorBody,
		type FinalDecisionRequest,
		type SaveDraftRequest,
		type SaveImplementationRequest,
		type SignatureItem,
		type SignatureListResponse,
		type State,
		type Transition
	} from '$lib/types';

	// A route parameter, so `$derived` (B3). SvelteKit reuses this component
	// when only the parameter changes, and a plain `let` would keep the first
	// CC-ID.
	const ccId = $derived(page.params.ccId ?? '');

	// ── Permissions ─────────────────────────────────────────────────────────

	/**
	 * The Security Matrix's editable cells, as field keys. Derived from the
	 * write types in types.ts, so no field name here is typed by hand, and a
	 * misspelt key at a call site fails `bun run check`.
	 *
	 * 35 members: the owner's 24 in Initiated and 5 in In Implementation, the
	 * evidence file, and the approver's 3 and 2 at the two gates.
	 */
	type EditableField =
		| keyof SaveDraftRequest
		| keyof SaveImplementationRequest
		| 'implementation_evidence'
		| Exclude<keyof DecisionRequest, keyof ESignatureCredentials>
		| Exclude<keyof FinalDecisionRequest, keyof ESignatureCredentials>;

	/**
	 * Whether the current user may save this record's draft: the owner, in
	 * Initiated. Ownership, not role, exactly as `HandlerSaveDraft` checks it.
	 * Its 403 compares `change_owner_id` to the caller and has no role check.
	 * Only a CC Owner can own a record, so a role check would add nothing.
	 * Compared on the id, never the name (A11).
	 */
	function canSaveDraft(): boolean {
		return (
			cc !== null &&
			form !== null &&
			cc.current_state === 'Initiated' &&
			cc.change_owner_id === user.id
		);
	}

	/**
	 * PERMISSION: whether the Security Matrix lets the current user edit this
	 * field of this record in its current state. 7b enables one slice, the
	 * owner's 24 draft fields in Initiated.
	 *
	 * `field in form` is the slice. `DraftForm`'s keys are pinned by the type to
	 * the 24 of `SaveDraftRequest`, so there is no third list of names.
	 *
	 * ⚠️ This does not extend. It works only because `DraftForm`'s keys ARE the
	 * owner's Initiated slice. The approver's gate fields and the owner's five
	 * In Implementation fields go to other endpoints and need their own form
	 * objects, so step 8 restructures this per state rather than adding a branch.
	 */
	function mayEdit(field: EditableField): boolean {
		return canSaveDraft() && form !== null && field in form;
	}

	/**
	 * Whether the control is enabled right now: permission, and no save in
	 * flight. Every control's `disabled` comes from here, so the Security
	 * Matrix lives in one function rather than in 34 attributes (decision 48).
	 *
	 * The lock is here and not in `mayEdit` because `required()` reads
	 * permission. Locking there too would drop every asterisk for the length of
	 * each save. The lock exists because a save response rebuilds `form`, so a
	 * keystroke typed mid-save would be lost (flag 32).
	 */
	function editable(field: EditableField): boolean {
		return mayEdit(field) && !saving;
	}

	/**
	 * The fields that the transition out of each state requires. Confirmed
	 * against the Go rather than the prototypes:
	 *
	 *   Initiated                        T2     HandlerSubmitForImplApproval's presence checks
	 *   Pending Implementation Approval  T4/T5  HandlerImplementationDecision's body, all three blank-checked
	 *   In Implementation                T6     HandlerSubmitForFinalApproval's presence checks
	 *   Pending Final Approval           T7/T8  HandlerFinalDecision's body
	 *
	 * Editable and mandatory are different sets. The owner can edit 24 fields
	 * in Initiated, but T2 requires only 20: not the two window times,
	 * `comments_for_approver` or `comments`. T6 does not require
	 * `deviations_from_plan`. `Record<State, …>` makes TypeScript demand all six
	 * states.
	 */
	const MANDATORY: Record<State, readonly EditableField[]> = {
		Initiated: [
			'change_title',
			'change_description',
			'change_type',
			'change_category',
			'department_function',
			'affected_systems_modules',
			'proposed_implementation_date',
			'target_closure_date',
			'reason_for_change',
			'business_impact',
			'expected_downtime',
			'requires_testing',
			'requires_training',
			'risk_rationale',
			'key_risks_mitigations',
			'high_level_implementation_plan',
			'validation_approach',
			'success_criteria',
			'rollback_backout_plan',
			'assigned_approver_id'
		],
		'Pending Implementation Approval': ['decision', 'risk_level', 'decision_comments'],
		'In Implementation': [
			'actual_implementation_date',
			'post_implementation_issues',
			'implementation_summary',
			'validation_performed',
			'implementation_evidence'
		],
		'Pending Final Approval': ['final_decision', 'final_comments'],
		Closed: [],
		Cancelled: []
	};

	/**
	 * Whether a label carries an asterisk (decision 58). The asterisk is an
	 * instruction to the person who has to act, so it needs both conditions:
	 * the viewer can edit the field now, and the transition they are working
	 * toward requires it. A disabled field never carries one. So a Viewer, an
	 * Admin, and anyone on a Closed or Cancelled record never see one.
	 *
	 * The prototypes star disabled fields, and this departs from them
	 * deliberately. It reads `mayEdit`, not `editable`, so the save lock does
	 * not remove the asterisks.
	 */
	function required(field: EditableField): boolean {
		return cc !== null && mayEdit(field) && MANDATORY[cc.current_state].includes(field);
	}

	// ── The fetch ───────────────────────────────────────────────────────────

	// Pages under `(app)` mount only once the restore has set the user (step 4).
	const user = $derived(auth.user!);

	/**
	 * What is on screen for the owner's 24 draft fields: every value a string,
	 * `''` for null, because an input bound to `null` renders "null" (B6).
	 * `Record<keyof SaveDraftRequest, …>` holds it to exactly those 24 keys, so
	 * a save body built from it can never carry a key the API rejects.
	 */
	type DraftForm = Record<keyof SaveDraftRequest, string>;

	let loading = $state(true);
	let error = $state<string | null>(null);
	let cc = $state<ChangeControlResponse | null>(null);
	let form = $state<DraftForm | null>(null);
	let signatures = $state<SignatureItem[]>([]);
	let signaturesError = $state<string | null>(null);
	let approvers = $state<ApproverRef[]>([]);
	let approversError = $state<string | null>(null);

	/**
	 * The only place `cc` or `form` is assigned. The fetch and the save
	 * response both call it. `form` is rebuilt from `cc` every time, whole:
	 * the server trims text and nulls `''`, so a form that kept its own values
	 * would disagree with the record after every save.
	 */
	function setRecord(next: ChangeControlResponse) {
		cc = next;
		form = toDraftForm(next);
		// No partial date can survive this. `load()` unmounts the form, so its
		// inputs are fresh. A 200 save cannot start while one is partial, and
		// the lock disables the inputs while it runs.
		incomplete = [];
	}

	/**
	 * Every value is a copied string, so `form` shares no reference with `cc`,
	 * and typing can never reach the server's copy.
	 *
	 * An object literal, never a spread of `r`. TypeScript's excess-property
	 * check applies to literals only, so a spread would let the other 31
	 * response keys in without an error.
	 */
	function toDraftForm(r: ChangeControlResponse): DraftForm {
		return {
			change_title: r.change_title ?? '',
			change_description: r.change_description ?? '',
			change_type: r.change_type ?? '',
			change_category: r.change_category ?? '',
			department_function: r.department_function ?? '',
			affected_systems_modules: r.affected_systems_modules ?? '',
			proposed_implementation_date: dateInput(r.proposed_implementation_date),
			target_closure_date: dateInput(r.target_closure_date),
			implementation_window_start: timeInput(r.implementation_window_start),
			implementation_window_end: timeInput(r.implementation_window_end),
			reason_for_change: r.reason_for_change ?? '',
			business_impact: r.business_impact ?? '',
			expected_downtime: r.expected_downtime ?? '',
			requires_testing: r.requires_testing ?? '',
			requires_training: r.requires_training ?? '',
			risk_rationale: r.risk_rationale ?? '',
			key_risks_mitigations: r.key_risks_mitigations ?? '',
			high_level_implementation_plan: r.high_level_implementation_plan ?? '',
			validation_approach: r.validation_approach ?? '',
			success_criteria: r.success_criteria ?? '',
			rollback_backout_plan: r.rollback_backout_plan ?? '',
			assigned_approver_id: r.assigned_approver_id ?? '',
			comments_for_approver: r.comments_for_approver ?? '',
			comments: r.comments ?? ''
		};
	}

	// Only the newest request may write the state, should a navigation to a
	// different CC-ID overlap a slow one.
	let latest = 0;

	async function load(id: string) {
		const mine = ++latest;
		loading = true;
		error = null;
		signaturesError = null;
		approversError = null;
		const path = `/changecontrols/${encodeURIComponent(id)}`;
		// Three independent reads, in parallel. The signature history and the
		// approver list are their own endpoints, so each can fail on its own and
		// show its error in place.
		//
		// The approver list is fetched on every load, not only when the select
		// is editable. Editability depends on the record, so a conditional fetch
		// would have to wait for it, and its condition would copy `editable()`.
		const [record, history, approverList] = await Promise.all([
			request<ChangeControlResponse>('GET', path),
			request<SignatureListResponse>('GET', `${path}/signatures`),
			request<ListApproversResponse>('GET', '/approvers')
		]);
		if (mine !== latest) return;
		if (record.ok) {
			setRecord(record.data);
		} else {
			cc = null;
			form = null;
			error = record.error.error;
		}
		if (history.ok) {
			signatures = history.data.signatures;
		} else {
			signatures = [];
			signaturesError = history.error.error;
		}
		if (approverList.ok) {
			approvers = approverList.data.approvers;
		} else {
			approvers = [];
			approversError = approverList.error.error;
		}
		// A failed load is not "already loaded", so the next navigation to the
		// same CC-ID tries again (step 6's recovery pattern).
		if (!record.ok || !history.ok || !approverList.ok) lastId = null;
		loading = false;
	}

	/**
	 * `onMount` AND `afterNavigate`, deduplicated on the CC-ID. The rule and its
	 * reasons are in `.claude/rules/svelte.md`, with `ChangeControlList.svelte`
	 * as the worked example. In short, `afterNavigate` alone never fires on a
	 * hard reload here, because the `(app)` layout mounts this page only after
	 * the session restore. `onMount` alone would miss a change of CC-ID without
	 * a remount. Whichever fires first loads, and the other is a no-op.
	 */
	let lastId: string | null = null;

	function loadIfChanged() {
		if (ccId === lastId) return;
		lastId = ccId;
		// A different record: the last one's save message does not apply. This
		// is cleared here and not in `load()`, because a 409 calls `load()` and
		// its message has to survive the reload.
		saveError = null;
		saveNotice = null;
		load(ccId);
	}

	onMount(loadIfChanged);
	afterNavigate(loadIfChanged);

	// ── Display helpers ─────────────────────────────────────────────────────
	// Inline, with one caller each (decision 46). Blueprint A5.5.

	// A DATE column arrives as UTC midnight, "2026-10-25T00:00:00Z" (A5.1), and
	// `<input type="date">` wants the first ten characters. ⚠️ It must NOT go
	// through `new Date()`, which renders in the browser's zone. West of UTC,
	// midnight UTC is still the previous day, so every date would read a day
	// early. The bug cannot be seen from +04:00.
	function dateInput(iso: string | null): string {
		return iso === null ? '' : iso.slice(0, 10);
	}

	// A TIME column arrives with a placeholder date, "0000-01-01T09:00:00Z"
	// (A5.2). `<input type="time">` wants "09:00". Sliced for the same reason.
	function timeInput(iso: string | null): string {
		return iso === null ? '' : iso.slice(11, 16);
	}

	// The write direction (flag 5), called by `toWire` below. Plain string
	// building, never `Date`, for the same reason as above. `''` becomes
	// `null`, because `''` is a 400 on these fields (A5.1).

	// "2026-10-25" → "2026-10-25T00:00:00Z", the midnight UTC a DATE arrives as.
	function dateOutput(value: string): string | null {
		return value === '' ? null : `${value}T00:00:00Z`;
	}

	// "09:30" → "0000-01-01T09:30:00Z", the placeholder shape a TIME arrives in
	// (A5.2). This relies on the input having no `step`, which keeps it `HH:MM`.
	function timeOutput(value: string): string | null {
		return value === '' ? null : `0000-01-01T${value}:00Z`;
	}

	/**
	 * The approver select's options: `GET /approvers`, plus the current
	 * assignee when the list lacks them (flag 26). The list holds active
	 * approvers only, and an approver can be deactivated once no active record
	 * names them. So this happens on Closed and Cancelled records, whose select
	 * is disabled. Never on an Initiated one, where the deactivation is a 409.
	 * Without it, that select would render blank. Compared on the id (A11).
	 */
	function approverOptions(list: ApproverRef[], r: ChangeControlResponse): ApproverRef[] {
		const id = r.assigned_approver_id;
		if (id === null || list.some((a) => a.id === id)) return list;
		// The name is a LEFT JOIN on the id, so it is non-null exactly when the id is.
		return [...list, { id, full_name: r.assigned_approver_name! }];
	}

	// A TIMESTAMPTZ is an instant, so it is formatted in the browser's zone
	// (decision 35). Null shows "—", as the prototypes do.
	function dateTimeOrDash(iso: string | null): string {
		return iso === null ? '—' : formatDateTime(iso);
	}

	// 1024-based, because the server's limit is `10 << 20` and the UI calls
	// that "10MB".
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	/**
	 * Transition → the `global.css` pill class. Keyed on the transition rather
	 * than the meaning string, and `Record<Transition, …>` makes TypeScript
	 * demand all seven (the `BADGE` precedent).
	 */
	const SIGNATURE_CLASS: Record<Transition, string> = {
		T2: 'submitted',
		T3: 'cancelled',
		T4: 'approved',
		T5: 'rejected',
		T6: 'submitted',
		T7: 'approved',
		T8: 'rejected'
	};

	// ── Save Draft ──────────────────────────────────────────────────────────

	let saving = $state(false);
	// A failed save, or one blocked before sending. It is kept apart from the
	// load `error`, which replaces the whole form (decision 59's precedent).
	let saveError = $state<ErrorBody | null>(null);
	// The neutral hint beside the button: "Saved …" or "No changes to save".
	let saveNotice = $state<string | null>(null);

	/**
	 * The four date and time inputs, keyed by field, which is also each
	 * input's id. `satisfies` rejects a misspelt key while keeping the values
	 * typed as `string`.
	 */
	const DATE_TIME_LABELS = {
		proposed_implementation_date: 'Proposed Implementation Date',
		target_closure_date: 'Target Closure Date',
		implementation_window_start: 'Implementation Window Start',
		implementation_window_end: 'Implementation Window End'
	} satisfies Partial<Record<keyof DraftForm, string>>;

	/**
	 * The labels of any date or time input holding a partial entry, such as
	 * `25/10/` with no year (flag 31). The input then reports `value === ''`,
	 * the same as a deliberately emptied picker, so the body would send `null`
	 * and clear a stored date. Only `validity.badInput` tells the two apart.
	 *
	 * The DOM is read directly, with `getElementById`, because `bind:this` is
	 * not on B3's list. `saveDraft()` calls it fresh at click time, and so must
	 * step 9's Submit. `incomplete` below is only its reactive copy.
	 */
	function incompleteDateTimes(): string[] {
		const labels: string[] = [];
		for (const [id, label] of Object.entries(DATE_TIME_LABELS)) {
			const input = document.getElementById(id) as HTMLInputElement | null;
			if (input?.validity.badInput) labels.push(label);
		}
		return labels;
	}

	/**
	 * `validity.badInput` is DOM state, not a signal, so `dirty` cannot see it
	 * by itself. This copy is refreshed from two events on the four inputs
	 * (decision 73), and each event covers a case the other misses:
	 * - `keyup`: typing `25/10/` into an empty picker. The value stays `''`,
	 *   so no `input` event fires.
	 * - `input`: the calendar popup and its clear button, where no key is
	 *   pressed.
	 */
	let incomplete = $state<string[]>([]);

	function recheckDateTimes() {
		incomplete = incompleteDateTimes();
	}

	/**
	 * One form value in the shape the API accepts. `''` becomes `null` for all
	 * 24 alike. That is load-bearing on the four dates and times and on
	 * `assigned_approver_id`, where `''` is a 400 (defect 17). On the rest it
	 * only tidies. No trim: the server trims, and its whitespace set differs
	 * from JavaScript's.
	 */
	function toWire(key: keyof DraftForm, value: string): string | null {
		if (value === '') return null;
		switch (key) {
			case 'proposed_implementation_date':
			case 'target_closure_date':
				return dateOutput(value);
			case 'implementation_window_start':
			case 'implementation_window_end':
				return timeOutput(value);
			default:
				return value;
		}
	}

	/**
	 * The save body: only the fields where the form differs from the record
	 * (decision 65). The baseline is built by the same `toDraftForm` that built
	 * `form`, so the comparison is plain string equality.
	 *
	 * Not all 24, for two reasons. A whole-form body sends every untouched
	 * value back, so a tab loaded before another tab's save reverts that save,
	 * and on the audited fields it writes `FieldUpdated` rows nobody made. And
	 * a TIME stored with seconds would come back truncated to `HH:MM:00`.
	 *
	 * The keys come from the `toDraftForm` literal, which is exactly the 24 of
	 * `SaveDraftRequest`, so an unknown key (a 400) cannot be built. The cast is
	 * for the enum fields: a bound select can only yield `''` or a member of its
	 * `types.ts` array, and `''` is already `null` here.
	 */
	function draftChanges(current: DraftForm, record: ChangeControlResponse): SaveDraftRequest {
		const baseline = toDraftForm(record);
		const body: Partial<Record<keyof DraftForm, string | null>> = {};
		for (const key of Object.keys(baseline) as (keyof DraftForm)[]) {
			if (current[key] !== baseline[key]) body[key] = toWire(key, current[key]);
		}
		return body as SaveDraftRequest;
	}

	/**
	 * Whether the screen differs from the record, or might (decision 72). It
	 * uses the save body's own comparison rather than a second definition of
	 * "changed", plus a partial date or time, which the comparison cannot see
	 * because the input reports `''`. Every known error here is false-dirty,
	 * which is the safe direction for a gate.
	 *
	 * Lazy: a keystroke only marks it stale, and it recomputes when the action
	 * bar reads it, once per flush. The hint re-renders only when the boolean
	 * flips.
	 *
	 * ⚠️ STEP 9. T2 ignores field values, so this is the only guard against
	 * submitting unsaved edits (A2). Submit is not `disabled`, because
	 * `global.css` has no `.btn:disabled` and a disabled button looks enabled.
	 * Its click handler must refuse, with a message in the action bar, before
	 * the modal opens, if `saving`, `dirty`, or `incompleteDateTimes()` is
	 * non-empty (a fresh read, not `incomplete`). It must check `dirty` again
	 * just before the POST, unless the open modal locks the form.
	 */
	const dirty = $derived(
		cc !== null &&
			form !== null &&
			(incomplete.length > 0 || Object.keys(draftChanges(form, cc)).length > 0)
	);

	/**
	 * `PUT /changecontrols/{ccID}`. What each outcome does to `cc` and `form` is
	 * recorded in PROGRESS.md for 7d:
	 * - 200: `setRecord`, which rebuilds `form` from the server's copy.
	 * - 409: refetch, per A8.2, because the record has left Initiated.
	 * - Anything else: both untouched, so the edits stay on screen.
	 *
	 * A 401 never reaches here as its own case, because `request()` refreshes
	 * and retries.
	 */
	async function saveDraft() {
		if (saving || cc === null || form === null) return;
		saveError = null;
		saveNotice = null;

		const incomplete = incompleteDateTimes();
		if (incomplete.length > 0) {
			const one = incomplete.length === 1;
			saveError = {
				error: `${incomplete.join(', ')} ${one ? 'is' : 'are'} incomplete. Finish or clear ${one ? 'it' : 'them'} before saving.`
			};
			return;
		}

		// An empty body is a 400, `No fields to update`, so nothing is sent.
		const body = draftChanges(form, cc);
		if (Object.keys(body).length === 0) {
			saveNotice = 'No changes to save';
			return;
		}

		// Set before the first `await`, so a second click returns above
		// (decision 59).
		saving = true;
		// The lock does not stop navigation. If `load()` runs for another CC-ID
		// while this is in flight, the response must not land on that record.
		const mine = latest;
		const result = await request<ChangeControlResponse>(
			'PUT',
			`/changecontrols/${encodeURIComponent(cc.cc_id)}`,
			body
		);
		saving = false;
		if (mine !== latest) return;

		if (result.ok) {
			setRecord(result.data);
			// The client's clock, because a no-op save does not move
			// `last_updated_on`. The timestamp keeps the hint true after later
			// typing.
			saveNotice = `Saved ${formatDateTime(new Date().toISOString())}`;
		} else {
			saveError = result.error;
			if (result.status === 409) load(ccId);
		}
	}
</script>

{#if loading}
	<p>Loading…</p>
{:else if cc && form}
	<!-- Every cc-form prototype uses `.page-header`, which has no bottom margin.
	     The prototypes get their gap from the info banner that always follows
	     it (`.info-banner` has `margin: var(--spacing-xl) 0`). This page renders
	     a banner only for Closed and Cancelled (decision 54), so without the
	     wrapper the header sat flush against the first card.

	     The wrapper is the list screens' `.page-header-with-action`, used for
	     its `margin-bottom: var(--spacing-xl)`. It has a single child, so its
	     `space-between` moves nothing. `.content` is a block container, so this
	     margin and a banner's top margin collapse into one gap, and the Closed
	     and Cancelled layouts match the prototype. No new CSS. -->
	<div class="page-header-with-action">
		<header class="page-header">
			<h1>Change Control: {cc.cc_id}</h1>
			<!-- `global.css` styles only two variants, `initiated` and `cancelled`,
			     and every non-cancelled prototype uses `initiated`. The `BADGE` map
			     gives `table-badge` classes, which do not style this element. -->
			<span class="status-badge {cc.current_state === 'Cancelled' ? 'cancelled' : 'initiated'}">
				{cc.current_state}
			</span>
		</header>
	</div>

	<!-- Only the two banners that read the same for every role. The other four
	     states' banners address someone who can act ("Before you submit",
	     "Review required"), so each arrives with its state's role step. -->
	{#if cc.current_state === 'Closed'}
		<div class="info-banner">
			<strong>Change Closed</strong><br />
			This change has been fully reviewed, approved, and closed. No further action is required.
		</div>
	{:else if cc.current_state === 'Cancelled'}
		<div class="info-banner cancelled">
			<strong>Change Cancelled</strong><br />
			This change was cancelled and will not be implemented.
		</div>
	{/if}

	<!-- ================== Change Details ================== -->
	<section class="card">
		<h2>Change Details</h2>

		<h3 class="section-subtitle">Identification</h3>
		<!-- System fields: read-only for every role in every state, so text
		     rather than disabled controls. Their labels have no control to
		     point at, so each carries a `svelte-ignore` (decision 55). A
		     `<span>` would lose `.meta-item label` and `.form-group label`
		     styling, and B4 forbids new CSS. -->
		<div class="meta-grid">
			<div class="meta-item">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label>CC ID</label>
				<div class="meta-value">{cc.cc_id}</div>
			</div>
			<div class="meta-item">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label>Current State</label>
				<div class="meta-value">{cc.current_state}</div>
			</div>
			<div class="meta-item">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label>Change Owner</label>
				<div class="meta-value">{cc.change_owner_name}</div>
			</div>
			<div class="meta-item">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label>Last Updated By</label>
				<div class="meta-value">{cc.last_updated_by_name}</div>
			</div>
			<div class="meta-item">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label>Created On</label>
				<div class="meta-value">{formatDateTime(cc.created_on)}</div>
			</div>
			<div class="meta-item">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label>Last Updated On</label>
				<div class="meta-value">{formatDateTime(cc.last_updated_on)}</div>
			</div>
		</div>

		<h3 class="section-subtitle">Change Definition</h3>

		<div class="form-group">
			<label for="change_title">Change Title{#if required('change_title')} *{/if}</label>
			<input
				type="text"
				id="change_title"
				class="form-control"
				disabled={!editable('change_title')}
				bind:value={form.change_title}
			/>
		</div>

		<div class="form-group">
			<label for="change_description"
				>Change Description{#if required('change_description')} *{/if}</label
			>
			<textarea
				id="change_description"
				class="form-control"
				rows="4"
				disabled={!editable('change_description')}
				bind:value={form.change_description}
			></textarea>
		</div>

		<!-- Every select iterates its array from types.ts, so the option values
		     can never pick up the prototypes' en-dashes (trap 1, decision 4). -->
		<div class="grid-3">
			<div class="form-group">
				<label for="change_type">Change Type{#if required('change_type')} *{/if}</label>
				<select
					id="change_type"
					class="form-control"
					disabled={!editable('change_type')}
					bind:value={form.change_type}
				>
					<option value="">Select type</option>
					{#each CHANGE_TYPES as option}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</div>

			<div class="form-group">
				<label for="change_category"
					>Change Category{#if required('change_category')} *{/if}</label
				>
				<select
					id="change_category"
					class="form-control"
					disabled={!editable('change_category')}
					bind:value={form.change_category}
				>
					<option value="">Select category</option>
					{#each CHANGE_CATEGORIES as option}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</div>

			<div class="form-group">
				<label for="department_function"
					>Department / Function{#if required('department_function')} *{/if}</label
				>
				<select
					id="department_function"
					class="form-control"
					disabled={!editable('department_function')}
					bind:value={form.department_function}
				>
					<option value="">Select department</option>
					{#each DEPARTMENT_FUNCTIONS as option}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="form-group">
			<label for="affected_systems_modules"
				>Affected Systems / Modules{#if required('affected_systems_modules')} *{/if}</label
			>
			<input
				type="text"
				id="affected_systems_modules"
				class="form-control"
				disabled={!editable('affected_systems_modules')}
				bind:value={form.affected_systems_modules}
			/>
		</div>

		<h3 class="section-subtitle">Planning</h3>

		<div class="grid-2">
			<div class="form-group">
				<label for="proposed_implementation_date"
					>Proposed Implementation Date{#if required('proposed_implementation_date')} *{/if}</label
				>
				<input
					type="date"
					id="proposed_implementation_date"
					class="form-control"
					disabled={!editable('proposed_implementation_date')}
					oninput={recheckDateTimes}
					onkeyup={recheckDateTimes}
					bind:value={form.proposed_implementation_date}
				/>
			</div>

			<div class="form-group">
				<label for="target_closure_date"
					>Target Closure Date{#if required('target_closure_date')} *{/if}</label
				>
				<input
					type="date"
					id="target_closure_date"
					class="form-control"
					disabled={!editable('target_closure_date')}
					oninput={recheckDateTimes}
					onkeyup={recheckDateTimes}
					bind:value={form.target_closure_date}
				/>
			</div>
		</div>

		<div class="grid-2">
			<div class="form-group">
				<label for="implementation_window_start">Implementation Window Start</label>
				<input
					type="time"
					id="implementation_window_start"
					class="form-control"
					disabled={!editable('implementation_window_start')}
					oninput={recheckDateTimes}
					onkeyup={recheckDateTimes}
					bind:value={form.implementation_window_start}
				/>
				<div class="field-hint">Optional (recommended for IT changes)</div>
			</div>

			<div class="form-group">
				<label for="implementation_window_end">Implementation Window End</label>
				<input
					type="time"
					id="implementation_window_end"
					class="form-control"
					disabled={!editable('implementation_window_end')}
					oninput={recheckDateTimes}
					onkeyup={recheckDateTimes}
					bind:value={form.implementation_window_end}
				/>
				<div class="field-hint">Optional (recommended for IT changes)</div>
			</div>
		</div>
	</section>

	<!-- ================== Impact & Risk ================== -->
	<section class="card">
		<h2>Impact & Risk Assessment</h2>

		<div class="form-group">
			<label for="reason_for_change"
				>Reason for Change{#if required('reason_for_change')} *{/if}</label
			>
			<textarea
				id="reason_for_change"
				class="form-control"
				rows="3"
				disabled={!editable('reason_for_change')}
				bind:value={form.reason_for_change}
			></textarea>
		</div>

		<div class="form-group">
			<label for="business_impact"
				>Business Impact{#if required('business_impact')} *{/if}</label
			>
			<textarea
				id="business_impact"
				class="form-control"
				rows="3"
				disabled={!editable('business_impact')}
				bind:value={form.business_impact}
			></textarea>
		</div>

		<div class="grid-3">
			<div class="form-group">
				<label for="expected_downtime"
					>Expected Downtime?{#if required('expected_downtime')} *{/if}</label
				>
				<select
					id="expected_downtime"
					class="form-control"
					disabled={!editable('expected_downtime')}
					bind:value={form.expected_downtime}
				>
					<option value="">Select</option>
					{#each EXPECTED_DOWNTIME as option}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</div>

			<div class="form-group">
				<label for="requires_testing"
					>Requires Testing?{#if required('requires_testing')} *{/if}</label
				>
				<select
					id="requires_testing"
					class="form-control"
					disabled={!editable('requires_testing')}
					bind:value={form.requires_testing}
				>
					<option value="">Select</option>
					{#each REQUIRES_TESTING as option}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</div>

			<div class="form-group">
				<label for="requires_training"
					>Requires Training?{#if required('requires_training')} *{/if}</label
				>
				<select
					id="requires_training"
					class="form-control"
					disabled={!editable('requires_training')}
					bind:value={form.requires_training}
				>
					<option value="">Select</option>
					{#each REQUIRES_TRAINING as option}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="form-group">
			<label for="risk_rationale"
				>Risk Rationale{#if required('risk_rationale')} *{/if}</label
			>
			<textarea
				id="risk_rationale"
				class="form-control"
				rows="3"
				disabled={!editable('risk_rationale')}
				bind:value={form.risk_rationale}
			></textarea>
		</div>

		<div class="form-group">
			<label for="key_risks_mitigations"
				>Key Risks & Mitigations{#if required('key_risks_mitigations')} *{/if}</label
			>
			<textarea
				id="key_risks_mitigations"
				class="form-control"
				rows="3"
				disabled={!editable('key_risks_mitigations')}
				bind:value={form.key_risks_mitigations}
			></textarea>
		</div>
	</section>

	<!-- ================== Implementation Plan & Validation ================== -->
	<section class="card">
		<h2>Implementation Plan & Validation</h2>

		<div class="form-group">
			<label for="high_level_implementation_plan"
				>High-Level Implementation Plan{#if required('high_level_implementation_plan')} *{/if}</label
			>
			<textarea
				id="high_level_implementation_plan"
				class="form-control"
				rows="5"
				disabled={!editable('high_level_implementation_plan')}
				bind:value={form.high_level_implementation_plan}
			></textarea>
		</div>

		<div class="form-group">
			<label for="validation_approach"
				>Validation Approach{#if required('validation_approach')} *{/if}</label
			>
			<textarea
				id="validation_approach"
				class="form-control"
				rows="3"
				disabled={!editable('validation_approach')}
				bind:value={form.validation_approach}
			></textarea>
		</div>

		<div class="form-group">
			<label for="success_criteria"
				>Success Criteria{#if required('success_criteria')} *{/if}</label
			>
			<textarea
				id="success_criteria"
				class="form-control"
				rows="2"
				disabled={!editable('success_criteria')}
				bind:value={form.success_criteria}
			></textarea>
		</div>

		<div class="form-group">
			<label for="rollback_backout_plan"
				>Rollback / Backout Plan{#if required('rollback_backout_plan')} *{/if}</label
			>
			<textarea
				id="rollback_backout_plan"
				class="form-control"
				rows="3"
				disabled={!editable('rollback_backout_plan')}
				bind:value={form.rollback_backout_plan}
			></textarea>
		</div>
	</section>

	<!-- ================== Implementation Details ================== -->
	<section class="card">
		<h2>Implementation Details</h2>

		<div class="grid-2">
			<div class="form-group">
				<label for="actual_implementation_date"
					>Actual Implementation Date{#if required('actual_implementation_date')} *{/if}</label
				>
				<input
					type="date"
					id="actual_implementation_date"
					class="form-control"
					disabled={!editable('actual_implementation_date')}
					value={dateInput(cc.actual_implementation_date)}
				/>
			</div>

			<div class="form-group">
				<label for="post_implementation_issues"
					>Post-Implementation Issues{#if required('post_implementation_issues')} *{/if}</label
				>
				<select
					id="post_implementation_issues"
					class="form-control"
					disabled={!editable('post_implementation_issues')}
					value={cc.post_implementation_issues ?? ''}
				>
					<option value="">Select</option>
					{#each POST_IMPLEMENTATION_ISSUES as option}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="form-group">
			<label for="implementation_summary"
				>Implementation Summary{#if required('implementation_summary')} *{/if}</label
			>
			<textarea
				id="implementation_summary"
				class="form-control"
				rows="4"
				disabled={!editable('implementation_summary')}
				value={cc.implementation_summary ?? ''}
			></textarea>
		</div>

		<div class="form-group">
			<label for="deviations_from_plan">Deviations from Plan</label>
			<textarea
				id="deviations_from_plan"
				class="form-control"
				rows="3"
				disabled={!editable('deviations_from_plan')}
				value={cc.deviations_from_plan ?? ''}
			></textarea>
		</div>

		<div class="form-group">
			<label for="validation_performed"
				>Validation Performed{#if required('validation_performed')} *{/if}</label
			>
			<textarea
				id="validation_performed"
				class="form-control"
				rows="3"
				disabled={!editable('validation_performed')}
				value={cc.validation_performed ?? ''}
			></textarea>
		</div>

		<!-- Metadata only (decision 50). Step 12 swaps the empty box for the
		     upload control when `editable('implementation_evidence')`. Step 14
		     turns the file name into a download `<button>`, never an `<a href>`
		     because a link cannot send the bearer (trap 4). The size and date
		     text stay. `content_type` is not shown: the upload stores it as a
		     constant, after checking that the bytes are a PDF. -->
		<div class="form-group">
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<label
				>Implementation Evidence{#if required('implementation_evidence')} *{/if}</label
			>
			{#if cc.implementation_evidence}
				<div class="meta-value">
					{cc.implementation_evidence.file_name} · {formatFileSize(
						cc.implementation_evidence.file_size
					)} · Uploaded {formatDateTime(cc.implementation_evidence.uploaded_on)}
				</div>
			{:else}
				<div class="upload-box disabled">
					No file uploaded<br />
					PDF (Max 10MB)
				</div>
			{/if}
		</div>
	</section>

	<!-- ================== Approvals ================== -->
	<section class="card">
		<h2>Approvals</h2>

		<h3 class="section-subtitle">Initiation</h3>
		<div class="form-group">
			<label for="assigned_approver_id"
				>Assign Approver{#if required('assigned_approver_id')} *{/if}</label
			>
			<!-- The value is the id and the label is the name (A11). The options
			     are `GET /approvers`, plus the current assignee if the list lacks
			     them (`approverOptions`, flag 26). ⚠️ "Select Approver" is `""`,
			     which the API rejects for this field, so `toWire` sends `null`. -->
			<select
				id="assigned_approver_id"
				class="form-control"
				disabled={!editable('assigned_approver_id')}
				bind:value={form.assigned_approver_id}
			>
				<option value="">Select Approver</option>
				{#each approverOptions(approvers, cc) as approver}
					<option value={approver.id}>{approver.full_name}</option>
				{/each}
			</select>
			{#if approversError}
				<div class="esig-error show">{approversError}</div>
			{/if}
		</div>

		<div class="form-group">
			<label for="comments_for_approver">Comments for Approver</label>
			<textarea
				id="comments_for_approver"
				class="form-control"
				rows="3"
				disabled={!editable('comments_for_approver')}
				bind:value={form.comments_for_approver}
			></textarea>
		</div>

		<h3 class="section-subtitle">Implementation Approval</h3>

		<!-- ⚠️ T2 does not clear these three. After a T5 rejection they still
		     read Reject while the status reads Not Submitted (A10). -->
		<div class="grid-2">
			<div class="form-group">
				<label for="decision">Decision{#if required('decision')} *{/if}</label>
				<select
					id="decision"
					class="form-control"
					disabled={!editable('decision')}
					value={cc.decision ?? ''}
				>
					<option value="">Select decision</option>
					{#each DECISIONS as option}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</div>

			<div class="form-group">
				<label for="risk_level">Risk Level{#if required('risk_level')} *{/if}</label>
				<select
					id="risk_level"
					class="form-control"
					disabled={!editable('risk_level')}
					value={cc.risk_level ?? ''}
				>
					<option value="">Select risk level</option>
					{#each RISK_LEVELS as option}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="form-group">
			<label for="decision_comments"
				>Decision Comments{#if required('decision_comments')} *{/if}</label
			>
			<textarea
				id="decision_comments"
				class="form-control"
				rows="3"
				disabled={!editable('decision_comments')}
				value={cc.decision_comments ?? ''}
			></textarea>
		</div>

		<div class="grid-2">
			<div class="form-group">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label>Implementation Approval By</label>
				<div class="meta-value">{cc.implementation_approval_by_name ?? '—'}</div>
			</div>

			<div class="form-group">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label>Implementation Approval On</label>
				<div class="meta-value">{dateTimeOrDash(cc.implementation_approval_on)}</div>
			</div>
		</div>

		<h3 class="section-subtitle">Final Approval</h3>

		<!-- ⚠️ T6 does not clear these two either (A10). -->
		<div class="form-group">
			<label for="final_decision"
				>Final Decision{#if required('final_decision')} *{/if}</label
			>
			<select
				id="final_decision"
				class="form-control"
				disabled={!editable('final_decision')}
				value={cc.final_decision ?? ''}
			>
				<option value="">Select decision</option>
				{#each DECISIONS as option}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</div>

		<div class="form-group">
			<label for="final_comments"
				>Final Comments{#if required('final_comments')} *{/if}</label
			>
			<textarea
				id="final_comments"
				class="form-control"
				rows="3"
				disabled={!editable('final_comments')}
				value={cc.final_comments ?? ''}
			></textarea>
		</div>

		<div class="grid-2">
			<div class="form-group">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label>Final Approval By</label>
				<div class="meta-value">{cc.final_approval_by_name ?? '—'}</div>
			</div>

			<div class="form-group">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label>Final Approval On</label>
				<div class="meta-value">{dateTimeOrDash(cc.final_approval_on)}</div>
			</div>
		</div>

		<h3 class="section-subtitle">Status</h3>
		<div class="grid-2">
			<div class="form-group">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label>Implementation Approval Status</label>
				<div class="meta-value">{cc.implementation_approval_status}</div>
			</div>
			<div class="form-group">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label>Final Approval Status</label>
				<div class="meta-value">{cc.final_approval_status}</div>
			</div>
		</div>
		<div class="form-group">
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<label>Actual Closure Date</label>
			<!-- A TIMESTAMPTZ despite its name: the same instant as Final
			     Approval On. -->
			<div class="meta-value">{dateTimeOrDash(cc.actual_closure_date)}</div>
			{#if cc.actual_closure_date === null}
				<div class="field-hint">System-captured when CC is closed</div>
			{/if}
		</div>
	</section>

	<!-- ================== Additional Information ================== -->
	<section class="card">
		<h2>Additional Information</h2>

		<div class="form-group">
			<label for="comments">Comments</label>
			<textarea
				id="comments"
				class="form-control"
				rows="4"
				disabled={!editable('comments')}
				bind:value={form.comments}
			></textarea>
		</div>

		<!-- The one field hidden by state (BRD Rule P6, decision 51). T3's modal
		     writes it and no save endpoint accepts it, so it is always
		     disabled and does not go through `editable()`. -->
		{#if cc.current_state === 'Cancelled'}
			<div class="form-group">
				<!-- No asterisk: a disabled field never carries one (decision 58). -->
				<label for="cancellation_reason">Cancellation Reason</label>
				<textarea
					id="cancellation_reason"
					class="form-control"
					rows="3"
					disabled
					value={cc.cancellation_reason ?? ''}
				></textarea>
			</div>
		{/if}
	</section>

	<!-- ================== Signature History ================== -->
	<!-- Oldest first, as the API sorts it. Never reversed (A9.0). Names are
	     snapshots taken at signing, so after a user is renamed they can differ
	     from the live names above (A11). -->
	<section class="card">
		<h2>Signature History</h2>
		{#if signaturesError}
			<div class="esig-error show">{signaturesError}</div>
		{:else if signatures.length === 0}
			<!-- The prototype adds "A signature will be captured when you submit
			     or cancel this Change Control." That sentence addresses an owner,
			     and every role sees this card, so it is dropped (decision 34's
			     precedent). -->
			<div class="signature-empty">
				<i class="bi bi-pen"></i><br />
				No signatures yet.
			</div>
		{:else}
			<div class="section-note">
				Electronic signatures applied to this Change Control. Read-only — signature records cannot
				be modified or deleted.
			</div>

			<table class="signature-table">
				<thead>
					<tr>
						<th>Signer</th>
						<th>Date &amp; Time</th>
						<th>Meaning of Signature</th>
					</tr>
				</thead>
				<tbody>
					{#each signatures as signature}
						<tr>
							<td class="signature-signer">{signature.signer_name}</td>
							<td>{formatDateTime(signature.signed_on)}</td>
							<td>
								<span class="signature-meaning {SIGNATURE_CLASS[signature.transition]}">
									{signature.meaning}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>
{:else}
	<!-- No prototype has this state. `.esig-error` follows decision 10. A
	     missing record reads "Change Control not found". -->
	<div class="esig-error show">{error}</div>
{/if}

<!-- ================== Actions ================== -->
<!-- Back to List and Save Draft. Submit, Cancel and the decisions arrive at
     steps 9, 10, 11 and 13.

     The save message sits in the bar, beside the button. `.form-actions` is
     sticky, so the message is visible wherever the user clicked Save; a block
     above the bar would sit below Signature History. The message is outside
     the button's `{#if}`, so a 409's error survives the reload that turns
     the record read-only.

     Save Draft stays on the form (BRD US-CC-02). The prototype's
     `<a href="my-change-controls.html">` is a static mock, and saving is an
     action, so it is a `<button>`. `global.css` has no `.btn:disabled`, so
     the label carries the in-flight state (decision 59). -->
<div class="form-actions">
	<div class="actions-left">
		<a href="/change-controls" class="btn secondary">
			<i class="bi bi-arrow-left"></i> Back to List
		</a>
	</div>

	<div class="actions-right">
		{#if saveError}
			<!-- A save's `issues` can only list unknown keys, which the body
			     cannot contain. They are rendered anyway, raw, as A8.1 asks. -->
			<!-- The class carries a modal-stacking margin that a flex row centres against, lifting the box half of --spacing-lg above the button. -->
			<div class="esig-error show" style:margin-bottom="0">
				{saveError.error}{#if 'issues' in saveError}: {saveError.issues.join(', ')}{/if}
			</div>
		{:else if dirty}
			<!-- Outranks "Saved …" without clearing it (decision 75). Undo back
			     to the saved values and that message returns, still true. -->
			<span class="field-hint">Unsaved changes</span>
		{:else if saveNotice}
			<span class="field-hint">{saveNotice}</span>
		{/if}
		{#if canSaveDraft()}
			<button type="button" class="btn secondary" onclick={saveDraft} disabled={saving}>
				<i class="bi bi-save"></i>
				{saving ? 'Saving…' : 'Save Draft'}
			</button>
		{/if}
	</div>
</div>
