<!--
	The change-control form (B5): one page for every state and every role.
	Step 7b binds the owner's 24 draft fields, and 7c saves them. Save Draft
	sends only the fields that differ from the record. 7d shows, continuously,
	whether any do: the gate step 9's Submit depends on. Step 9 adds T2 and
	the one e-signature modal every signed transition opens.

	Markup from docs/prototypes/owner/cc-form-closed.html, the one prototype
	with every section populated. The other cc-form-* prototypes differ in which
	controls are enabled, in their info banner and in their action buttons.

	READ-ONLY MEANS `disabled`, NOT TEXT. Every field the Security Matrix can
	make editable is a real control, disabled through `editable()`, so enabling
	one never rewrites the markup. The thirteen system fields are never editable
	by anyone (CC ID, the approval By/On values, the statuses…), so they stay as
	the prototype's `.meta-value` text.

	THE RECORD, AND THREE OBJECTS OVER IT. `cc` is what the server last sent.
	`draftForm` holds the owner's 24 Initiated fields, `implDecision` and
	`finalDecision` hold the approver's 3 and 2 at the two gates. Binding
	straight to `cc` would overwrite the server's version on the first
	keystroke, and then neither the save body (7c) nor the dirty check (7d)
	could tell what changed. Only `setRecord()` sets them to a record, and only
	`load()` clears them — all four together, both ways.

	The five In Implementation fields still take `value=` from `cc`. They save
	through a second endpoint that step 8b adds; until then they are disabled,
	because editable fields with nothing to save them with lose work silently.

	PERMISSION IS BY IDENTITY, NOT ROLE. `mayEdit()` has one arm per state, and
	each asks whether this user is that state's actor — the record's owner, or
	the record's ASSIGNED approver. The API checks it the same way and has no
	role check at all (A7.6).

	NOTHING IS HIDDEN BY STATE. A field with no value yet renders empty, where
	the prototypes draw "Not applicable" boxes (a departure from BRD Rule P5).
	The one exception is Cancellation Reason, shown only on a Cancelled record
	(BRD Rule P6).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { request, type ApiResult } from '$lib/api';
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
		type SignatureMeaning,
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
	 * The two approver gates' editable fields, named once. Each transition's
	 * request type minus the e-signature credentials IS the Security Matrix's
	 * row for that state, so the field names are never typed by hand — the same
	 * trick `DraftForm` plays for the owner's Initiated slice (decision 61).
	 */
	type ImplDecisionField = Exclude<keyof DecisionRequest, keyof ESignatureCredentials>;
	type FinalDecisionField = Exclude<keyof FinalDecisionRequest, keyof ESignatureCredentials>;

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
		| ImplDecisionField
		| FinalDecisionField;

	/**
	 * ⚠️ AUTHORISATION IS BY RECORD, NOT BY ROLE (A7.6).
	 *
	 * None of the five transition routes carries `requireRole` — `main.go`
	 * mounts every one behind `middlewareAuth` alone. T2, T3 and T6 compare the
	 * caller to `change_owner_id`; T4/T5 and T7/T8 compare them to
	 * `assigned_approver_id`. So an Approver who is not *this record's* assignee
	 * gets 403 `Forbidden`, and the Security Matrix's "Approver" column — which
	 * is a role — would enable the gate for all three of them.
	 *
	 * Both predicates mirror the server exactly and add no check it does not
	 * make. Compared on the id, never the name (A11).
	 */
	function isOwner(): boolean {
		return cc !== null && cc.change_owner_id === user.id;
	}

	function isAssignedApprover(): boolean {
		// `assigned_approver_id` is nullable and `user.id` never is, so an
		// unassigned record falls out here without its own branch.
		return cc !== null && cc.assigned_approver_id === user.id;
	}

	/**
	 * Whether the current user may save this record's draft: the owner, in
	 * Initiated, exactly as `HandlerSaveDraft` checks it.
	 */
	function canSaveDraft(): boolean {
		return cc !== null && draftForm !== null && cc.current_state === 'Initiated' && isOwner();
	}

	/**
	 * The same, for the second save: the owner, in `In Implementation`, exactly
	 * as `HandlerSaveImplementationDetails` checks it. Its 403 compares
	 * `change_owner_id` and, like the draft save, has no role check.
	 */
	function canSaveImplementation(): boolean {
		return (
			cc !== null && implForm !== null && cc.current_state === 'In Implementation' && isOwner()
		);
	}

	/**
	 * PERMISSION: whether the Security Matrix lets the current user edit this
	 * field of this record in its current state.
	 *
	 * ⚠️ One arm per state, not one predicate with a branch (flag 27). 7b's
	 * `field in form` worked only because `DraftForm`'s keys ARE the owner's
	 * Initiated slice; the approver's gates and the owner's In Implementation
	 * fields belong to other endpoints and other objects. Each arm asks the same
	 * two questions in the same order — is this the right person, and is this
	 * field in that state's slice — and the slice is always an object whose keys
	 * come from a request type, so there is no hand-written list anywhere.
	 *
	 * No `default`: the switch is exhaustive over `State`, so a seventh state
	 * would fail `bun run check` rather than silently returning false.
	 */
	function mayEdit(field: EditableField): boolean {
		if (cc === null) return false;
		switch (cc.current_state) {
			case 'Initiated':
				return isOwner() && draftForm !== null && field in draftForm;
			case 'Pending Implementation Approval':
				return isAssignedApprover() && implDecision !== null && field in implDecision;
			case 'In Implementation':
				// ⚠️ The one arm whose slice is not a single object. Five fields
				// live in `implForm` and save through PUT …/implementation; the
				// evidence is editable too but belongs to the upload endpoint, so
				// it has no form value and is named explicitly. `mayEdit` being
				// true for it is what puts the asterisk on its label at T6 — the
				// control itself arrives at step 12.
				return (
					isOwner() &&
					implForm !== null &&
					(field in implForm || field === 'implementation_evidence')
				);
			case 'Pending Final Approval':
				return isAssignedApprover() && finalDecision !== null && field in finalDecision;
			case 'Closed':
			case 'Cancelled':
				return false;
		}
	}

	/**
	 * Whether the control is enabled right now: permission, no save in flight,
	 * and no signature modal open. Every control's `disabled` comes from here,
	 * so the Security Matrix lives in one function rather than in 34 attributes
	 * (decision 48).
	 *
	 * The locks are here and not in `mayEdit` because `required()` reads
	 * permission. Locking there too would drop every asterisk for the length of
	 * each save. Two locks, two reasons:
	 * - `saving`: a save response rebuilds `draftForm`, so a keystroke typed
	 *   mid-save would be lost (flag 32).
	 * - `dialog`: a modal's overlay blocks the pointer but not Tab. Without the
	 *   lock a keyboard user could edit the form behind the signature modal,
	 *   making it dirty after the gate passed, or changing a decision it is
	 *   about to sign a snapshot of (decision 88). The requirements dialog
	 *   locks too: it is a modal, so the form waits until it is dismissed.
	 */
	function editable(field: EditableField): boolean {
		return mayEdit(field) && !saving && dialog === null;
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

	/**
	 * The approver's two gates. These are INPUT BUFFERS, not forms.
	 *
	 * ⚠️ Nothing saves them incrementally: no endpoint writes `decision`,
	 * `risk_level`, `decision_comments`, `final_decision` or `final_comments`
	 * except the transition itself. `UpdateChangeControlDraft` and
	 * `UpdateImplementationDetails` do not touch them, and neither save's
	 * whitelist contains them. So there is nothing for them to be unsaved
	 * FROM — no diff, no `dirty` term, and no navigation guard (decision 80).
	 *
	 * They are still seeded from the record, because T2 and T6 clear nothing:
	 * an approver reopening a gate after a rejection finds the previous
	 * Reject and its comments already in the controls (A10).
	 */
	type ImplDecisionForm = Record<ImplDecisionField, string>;
	type FinalDecisionForm = Record<FinalDecisionField, string>;

	/**
	 * The owner's five fields in `In Implementation`, saved through
	 * `PUT /changecontrols/{ccID}/implementation`. A real form, not a buffer:
	 * it saves incrementally, so 7c's diff and 7d's dirty tracking apply to it
	 * unchanged.
	 *
	 * ⚠️ FIVE keys, not the Security Matrix's six. `implementation_evidence` is
	 * editable and mandatory at T6, but it is not in the endpoint's whitelist —
	 * it goes through `POST …/files/implementation_evidence`. Keying this to
	 * `SaveImplementationRequest` is what makes the 400 it would draw
	 * unwritable.
	 */
	type ImplForm = Record<keyof SaveImplementationRequest, string>;

	let loading = $state(true);
	let error = $state<string | null>(null);
	let cc = $state<ChangeControlResponse | null>(null);
	let draftForm = $state<DraftForm | null>(null);
	let implForm = $state<ImplForm | null>(null);
	let implDecision = $state<ImplDecisionForm | null>(null);
	let finalDecision = $state<FinalDecisionForm | null>(null);
	let signatures = $state<SignatureItem[]>([]);
	let signaturesError = $state<string | null>(null);
	let approvers = $state<ApproverRef[]>([]);
	let approversError = $state<string | null>(null);

	/**
	 * The only place `cc` or any of the three form objects is set to a record
	 * (`load()` only clears them). The fetch and the save response both call
	 * it. Each object is rebuilt from `cc` every time, whole: the server trims
	 * text and nulls `''`, so a form that kept its own values would disagree
	 * with the record after every save.
	 */
	function setRecord(next: ChangeControlResponse) {
		cc = next;
		draftForm = toDraftForm(next);
		implForm = toImplForm(next);
		implDecision = toImplDecisionForm(next);
		finalDecision = toFinalDecisionForm(next);
		// No partial date can survive this. `load()` unmounts the form, so its
		// inputs are fresh. A 200 save cannot start while one is partial, and
		// the lock disables the inputs while it runs.
		incomplete = [];
	}

	/**
	 * Every value is a copied string, so the form shares no reference with
	 * `cc`, and typing can never reach the server's copy.
	 *
	 * An object literal, never a spread of `r`. TypeScript's excess-property
	 * check applies to literals only, so a spread would let the other 31
	 * response keys in without an error. That check is why the three builders
	 * below are not generalised into one, where the write direction is
	 * (`toWire`, `changes`): on the read side the literal IS the check.
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

	// A literal for the same reason as above. `dateInput` slices rather than
	// parses (A5.5, decision 57) — `actual_implementation_date` is a DATE
	// column arriving as UTC midnight, so `new Date()` would read a day early
	// anywhere west of UTC.
	function toImplForm(r: ChangeControlResponse): ImplForm {
		return {
			actual_implementation_date: dateInput(r.actual_implementation_date),
			post_implementation_issues: r.post_implementation_issues ?? '',
			implementation_summary: r.implementation_summary ?? '',
			deviations_from_plan: r.deviations_from_plan ?? '',
			validation_performed: r.validation_performed ?? ''
		};
	}

	// Literals for the same reason as above. Both carry the previous
	// rejection's values when there was one, which is what the approver sees
	// on reopening the gate (A10).
	function toImplDecisionForm(r: ChangeControlResponse): ImplDecisionForm {
		return {
			decision: r.decision ?? '',
			risk_level: r.risk_level ?? '',
			decision_comments: r.decision_comments ?? ''
		};
	}

	function toFinalDecisionForm(r: ChangeControlResponse): FinalDecisionForm {
		return {
			final_decision: r.final_decision ?? '',
			final_comments: r.final_comments ?? ''
		};
	}

	// Only the newest request may write the state, should a navigation to a
	// different CC-ID overlap a slow one.
	let latest = 0;

	async function load(id: string) {
		const mine = ++latest;
		loading = true;
		// While loading there is no record. The action bar sits outside
		// `{#if loading}`, so an old `cc` would keep Save Draft live against a
		// record no longer on screen. `saveDraft()`'s `mine` check cannot catch
		// that, because it reads `latest` after this increment. Cleared, `dirty`
		// and `canSaveDraft()` are false until `setRecord()` runs.
		//
		// ⚠️ EVERY form object is cleared, not just the draft. A stale
		// `implDecision` would keep Submit Decision live through a load, which
		// is the shipped 7c defect in a new object (decision 79).
		cc = null;
		draftForm = null;
		implForm = null;
		implDecision = null;
		finalDecision = null;
		// A dialog belongs to the record it was opened on. Back or Forward to
		// another CC-ID closes it, and `mine` drops any response still in
		// flight.
		closeDialog();
		error = null;
		approversError = null;
		const path = `/changecontrols/${encodeURIComponent(id)}`;
		// Three independent reads, in parallel. The signature history and the
		// approver list are their own endpoints, so each can fail on its own and
		// show its error in place.
		//
		// The approver list is fetched on every load, not only when the select
		// is editable. Editability depends on the record, so a conditional fetch
		// would have to wait for it, and its condition would copy `editable()`.
		const [record, historyOk, approverList] = await Promise.all([
			request<ChangeControlResponse>('GET', path),
			loadSignatures(id, mine),
			request<ListApproversResponse>('GET', '/approvers')
		]);
		if (mine !== latest) return;
		if (record.ok) {
			setRecord(record.data);
		} else {
			cc = null;
			draftForm = null;
			implForm = null;
			implDecision = null;
			finalDecision = null;
			error = record.error.error;
		}
		if (approverList.ok) {
			approvers = approverList.data.approvers;
		} else {
			approvers = [];
			approversError = approverList.error.error;
		}
		// A failed load is not "already loaded", so the next navigation to the
		// same CC-ID tries again (step 6's recovery pattern).
		if (!record.ok || !historyOk || !approverList.ok) lastId = null;
		loading = false;
	}

	/**
	 * `GET …/signatures`, written to the history panel only if no newer load
	 * has started since `mine` was taken. Returns whether it succeeded.
	 *
	 * Two callers: `load()`, and `sign()` after a 200. A transition's response
	 * is the record alone, so the new signature row has to be fetched. A7.7's
	 * "never refetch" covers the record, not this separate resource (Lain's
	 * ruling at step 9).
	 *
	 * ⚠️ The guard is its own, after its own `await`. `sign()`'s check runs
	 * when the 200 lands, and this GET is a second wait after that. A
	 * navigation in between runs `load()`, which increments `latest`, so late
	 * signatures are dropped rather than landing on the next record's panel.
	 */
	async function loadSignatures(id: string, mine: number): Promise<boolean> {
		const history = await request<SignatureListResponse>(
			'GET',
			`/changecontrols/${encodeURIComponent(id)}/signatures`
		);
		if (mine !== latest) return history.ok;
		if (history.ok) {
			signatures = history.data.signatures;
			signaturesError = null;
		} else {
			signatures = [];
			signaturesError = history.error.error;
		}
		return history.ok;
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
		// A different record: the last one's message does not apply. This is
		// cleared here and not in `load()`, because a 409 calls `load()` and
		// its message has to survive the reload.
		actionError = null;
		actionNotice = null;
		load(ccId);
	}

	onMount(loadIfChanged);
	afterNavigate(loadIfChanged);

	/**
	 * Holds a navigation away from unsaved edits (flag 43).
	 * - A dead session never prompts. `signOut()` in api.ts clears `auth.user`
	 *   and then calls `goto('/login')`, which runs these callbacks too, unless
	 *   the layout has unmounted this page first. Either way this returns.
	 *   Prompting there would let the user stay on a form that cannot save.
	 *   The BRD accepts losing unsaved data on timeout (NFR-10.2.5).
	 * - `leave` (reload, tab close, a typed URL) runs inside `beforeunload`,
	 *   where `confirm()` is blocked. `cancel()` makes SvelteKit call
	 *   `preventDefault()`, and the browser shows its own dialog.
	 * - Everything else runs synchronously here, so `confirm()` can decide.
	 *   A styled dialog cannot be awaited in time (decision 59 is about
	 *   reporting, which has an in-page home; this is a question).
	 */
	beforeNavigate((navigation) => {
		if (!dirty || auth.user === null) return;
		if (navigation.type === 'leave') {
			navigation.cancel();
			return;
		}
		if (!confirm('Leave this page? Your unsaved changes will be lost.')) navigation.cancel();
	});

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
	 * T2's two business-day rules (A5.3), as `HandlerSubmitForImplApproval`
	 * applies them: the date must not be EARLIER than `businessDaysFrom(today,
	 * n)`. It does not have to be a business day itself — a Saturday after the
	 * boundary is valid.
	 */
	const BUSINESS_DAYS: Partial<Record<EditableField, number>> = {
		proposed_implementation_date: 2,
		target_closure_date: 10
	};

	/**
	 * The earliest date, as `YYYY-MM-DD`, that passes a business-day rule.
	 * Mirrors the Go's `businessDaysFrom` line for line: step one day, then
	 * step over Saturday and Sunday. `getUTCDay` numbers days as Go's
	 * `time.Weekday` does, 0 Sunday and 6 Saturday.
	 *
	 * ⚠️ UTC throughout. The server's `today` is `time.Now().UTC()` truncated
	 * to midnight. Between 00:00 and 04:00 in Dubai the LOCAL date is a day
	 * ahead, so a local-date version would be stricter than the server for
	 * four hours a night. Only UTC getters and setters are used, so this is
	 * not A5.5's `new Date()` trap, which is about reading a DATE locally.
	 *
	 * Computed at every call, never cached, so a page left open overnight
	 * still gates on today's boundary. A device clock that is wrong near
	 * midnight UTC can still make the client briefly stricter or looser than
	 * the server. The server is authoritative, and its clock is not readable
	 * here (`Date` is not a CORS-exposed header).
	 */
	function earliestSubmitDate(businessDays: number): string {
		const now = new Date();
		const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
		for (let i = 0; i < businessDays; i++) {
			d.setUTCDate(d.getUTCDate() + 1);
			while (d.getUTCDay() === 6 || d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
		}
		return d.toISOString().slice(0, 10);
	}

	/**
	 * The `min` attribute on the two date inputs, so the native picker greys
	 * out days that can never pass. An affordance only: the gate compares
	 * strings in `submitGate()` and never reads `validity.rangeUnderflow`.
	 *
	 * It can go stale — Svelte re-evaluates it when the record or the form
	 * changes, never when the clock does — but only in the lenient direction:
	 * the boundary moves forward, so a stale `min` offers too many days, and
	 * the gate then refuses with the server's own sentence. Nothing legitimate
	 * is lost either: a date earlier than the boundary can never become valid.
	 */
	function minDate(field: EditableField): string | undefined {
		const days = BUSINESS_DAYS[field];
		return days !== undefined && mayEdit(field) ? earliestSubmitDate(days) : undefined;
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

	// ── Field labels ────────────────────────────────────────────────────────

	/**
	 * Every editable field's name in prose, for the messages this page writes:
	 * the partial-date refusal, and the submit gate's list of blanks.
	 *
	 * ⚠️ These are the Go's OWN strings. `HandlerSubmitForImplApproval` and
	 * `HandlerSubmitForFinalApproval` build their `problems` slices from exactly
	 * these words, so a refusal written here and an `issues` array returned by
	 * the server read identically. Do not "improve" one without the other. They
	 * differ from a few on-screen labels for that reason — the Go says
	 * "Assigned Approver" where the control says "Assign Approver", and it omits
	 * the question marks on the three Yes/No fields.
	 *
	 * `Record<EditableField, …>` makes TypeScript demand all 35.
	 */
	const FIELD_LABELS: Record<EditableField, string> = {
		change_title: 'Change Title',
		change_description: 'Change Description',
		change_type: 'Change Type',
		change_category: 'Change Category',
		department_function: 'Department / Function',
		affected_systems_modules: 'Affected Systems / Modules',
		proposed_implementation_date: 'Proposed Implementation Date',
		target_closure_date: 'Target Closure Date',
		implementation_window_start: 'Implementation Window Start',
		implementation_window_end: 'Implementation Window End',
		reason_for_change: 'Reason for Change',
		business_impact: 'Business Impact',
		expected_downtime: 'Expected Downtime',
		requires_testing: 'Requires Testing',
		requires_training: 'Requires Training',
		risk_rationale: 'Risk Rationale',
		key_risks_mitigations: 'Key Risks & Mitigations',
		high_level_implementation_plan: 'High-Level Implementation Plan',
		validation_approach: 'Validation Approach',
		success_criteria: 'Success Criteria',
		rollback_backout_plan: 'Rollback / Backout Plan',
		assigned_approver_id: 'Assigned Approver',
		comments_for_approver: 'Comments for Approver',
		comments: 'Comments',
		actual_implementation_date: 'Actual Implementation Date',
		post_implementation_issues: 'Post-Implementation Issues',
		implementation_summary: 'Implementation Summary',
		deviations_from_plan: 'Deviations from Plan',
		validation_performed: 'Validation Performed',
		implementation_evidence: 'Implementation Evidence',
		decision: 'Decision',
		risk_level: 'Risk Level',
		decision_comments: 'Decision Comments',
		final_decision: 'Final Decision',
		final_comments: 'Final Comments'
	};

	/**
	 * Prompt text, verbatim from the prototypes (flag 25). Fields absent from
	 * here get none — the selects, whose first option is already the prompt,
	 * and the two window times, whose `.field-hint` says what they are for.
	 *
	 * ⚠️ Applied through `mayEdit`, not `editable`, so a placeholder survives a
	 * save rather than blinking out for its duration (decision 67's reasoning),
	 * and never renders on a disabled control, where grey prompt text reads as
	 * a value.
	 *
	 * Two prototype defects are deliberately not copied:
	 * - ⚠️ `success_criteria`'s is WRITTEN, not ported — the one string on this
	 *   page that came from nobody's document. `cc-form-initated-state.html`
	 *   repeats Validation Approach's text there verbatim (:279 and :288), a
	 *   copy-paste slip in the mock, so there was nothing to port. B1's
	 *   "invent nothing visual" is **overridden by Lain for this one field**
	 *   (decision 81): a prompt describing the wrong field is worse than one we
	 *   wrote. Do not "restore" the prototype's text here.
	 * - `actual_implementation_date` gets none at 8b. A `placeholder` on
	 *   `<input type="date">` never renders — the browser draws `dd/mm/yyyy`.
	 */
	const PLACEHOLDERS: Partial<Record<EditableField, string>> = {
		change_title: 'Enter a clear, descriptive title for this change',
		change_description: 'Describe what will change, scope boundaries, and what is not changing',
		affected_systems_modules: 'e.g. Kiosk App, Payment Service, Production Environment',
		reason_for_change: 'Explain the business driver or justification',
		business_impact: 'Describe impact on users, services, or operations',
		risk_rationale: 'Explain why this change is considered low, medium, or high risk',
		key_risks_mitigations:
			'Identify the key risks associated with this change and describe the planned mitigation actions for each risk',
		high_level_implementation_plan:
			'Outline the high-level steps required to implement this change, including the sequence of activities and responsible parties where applicable',
		validation_approach:
			'Describe how the change will be verified or tested to confirm it has been implemented successfully',
		success_criteria: 'Describe what must be true for this change to be considered successful',
		rollback_backout_plan:
			'Describe the actions required to restore the system or process to its previous state in the event of failure',
		comments_for_approver: 'Optional comments for the approver',
		comments: 'Add any additional information or context',
		decision_comments: 'Provide rationale for your decision',
		final_comments: 'Provide final approval comments',
		implementation_summary: 'Describe what was implemented, timeline, and key activities performed',
		deviations_from_plan: `Document any deviations from the approved plan. If none, state 'No deviations'`,
		validation_performed: 'Describe validation activities completed and results'
	};

	/** `''` rather than `undefined`, so the attribute is absent when disabled. */
	function placeholder(field: EditableField): string {
		return mayEdit(field) ? (PLACEHOLDERS[field] ?? '') : '';
	}

	/**
	 * The server's own length limits, swept from the Go rather than assumed.
	 *
	 * ⚠️ They are NOT all 2000. `change_title` is 200 and
	 * `affected_systems_modules` is 500 — both `<input type="text">`, both easy
	 * to assume otherwise. Enums, dates and the approver id carry no limit.
	 * `cancellation_reason` is 500 and belongs to T3's modal, at step 10.
	 *
	 * Fields absent from here have no server limit and get no counter.
	 */
	const LIMITS: Partial<Record<EditableField, number>> = {
		change_title: 200,
		change_description: 2000,
		affected_systems_modules: 500,
		reason_for_change: 2000,
		business_impact: 2000,
		risk_rationale: 2000,
		key_risks_mitigations: 2000,
		high_level_implementation_plan: 2000,
		validation_approach: 2000,
		success_criteria: 2000,
		rollback_backout_plan: 2000,
		comments_for_approver: 2000,
		comments: 2000,
		decision_comments: 2000,
		final_comments: 2000,
		implementation_summary: 2000, // 8b
		deviations_from_plan: 2000, // 8b
		validation_performed: 2000 // 8b
	};

	/**
	 * The counter under a length-limited field, or `null` when there is nothing
	 * to say. Flag 36, revised.
	 *
	 * Without it, over-long text is a 400 after a round trip — "must be 2000
	 * characters or fewer" — with no way to see how far over you are.
	 *
	 * ⚠️ `[...value].length`, never `value.length`. Go counts RUNES
	 * (`len([]rune(s))`), which is code points, and spreading a string iterates
	 * by code point too, so the two agree. `.length` counts UTF-16 units and
	 * would read 2 for one emoji. (They diverge only on lone surrogates, which
	 * a text input does not produce.) This is also why there is no `maxlength`
	 * attribute: HTML would enforce the wrong unit, and a hard cap that
	 * silently truncates is worse than a 400 that explains itself.
	 *
	 * The 80% threshold is a judgement call, not a requirement: below it the
	 * counter is noise under thirteen fields at once, and 400 characters of
	 * warning on a 2000-limit field is enough to notice before the wall.
	 *
	 * Client-side only. Nothing is blocked here — the server still decides.
	 */
	function lengthHint(field: EditableField, value: string): string | null {
		const limit = LIMITS[field];
		if (limit === undefined || !mayEdit(field)) return null;
		const used = [...value].length;
		if (used <= limit * 0.8) return null;
		if (used > limit) return `${used} / ${limit} — ${used - limit} over the limit`;
		return `${used} / ${limit}`;
	}

	// ── Save Draft ──────────────────────────────────────────────────────────

	let saving = $state(false);

	/**
	 * A failed save or transition, or an action refused before sending. Kept
	 * apart from the load `error`, which replaces the whole form (decision 59's
	 * precedent). Named for the bar, not for Save, because every action
	 * reports here.
	 *
	 * `screen` is the screen the error was about, as `screenKey()` read it when
	 * the error was set, or `null` for an error pinned regardless of the
	 * screen. Set it only through `fail()`.
	 */
	type ActionError = { body: ErrorBody; screen: string | null };
	let actionError = $state<ActionError | null>(null);

	/**
	 * Everything the user can change on this page, as one string: the four
	 * form objects and the partial-date list. `incomplete` is in it because a
	 * partial date leaves the form value at `''`, so finishing the date changes
	 * nothing else.
	 */
	function screenKey(): string {
		return JSON.stringify([draftForm, implForm, implDecision, finalDecision, incomplete]);
	}

	/**
	 * Reports a failure or a refusal. ⚠️ THE ONE PLACE THAT DECIDES WHERE IT
	 * GOES, from the body's SHAPE — callers never choose (decision 90):
	 *
	 *   has `issues`   → the requirements dialog. The only error whose length
	 *                    is data-driven (1 item or 20). Check 1 at step 9
	 *                    proved the sticky bar cannot hold it: a 20-label
	 *                    refusal squeezed the buttons onto three lines.
	 *   plain `error`  → the bar. One sentence, written by one handler.
	 *
	 * Shape, not length: a threshold would be arbitrary, and would move one
	 * refusal between homes as the user fixed fields. Client refusals
	 * (`submitGate`) and server 400s have the same shape, so they land in the
	 * same place and render identically (A8.1).
	 *
	 * `pinned` applies to the bar only, and is for a 409: its reload changes
	 * the screen by design, and its message is what explains why the form
	 * turned read-only, so it must not hide when the reload lands.
	 */
	function fail(body: ErrorBody, pinned = false) {
		if ('issues' in body) {
			closeDialog();
			dialog = { kind: 'requirements', error: body.error, issues: body.issues };
			return;
		}
		actionError = { body, screen: pinned ? null : screenKey() };
	}
	// The neutral hint beside the button: "Saved …" or "No changes to save".
	let actionNotice = $state<string | null>(null);

	/**
	 * The date and time inputs, whose ids equal their field keys. Typed as
	 * `EditableField[]`, so a misspelt key fails `bun run check` and the labels
	 * come from the one map above rather than a second list.
	 *
	 * ⚠️ `actual_implementation_date` joined at 8b, and its input needs BOTH
	 * `oninput` and `onkeyup` like the other four — 7d's closing note names
	 * this field specifically. Each event covers what the other misses: typing
	 * `25/10/` into an empty picker fires no `input`, and the calendar popup
	 * fires no `keyup`.
	 */
	const DATE_TIME_FIELDS: readonly EditableField[] = [
		'proposed_implementation_date',
		'target_closure_date',
		'implementation_window_start',
		'implementation_window_end',
		'actual_implementation_date'
	];

	/**
	 * The labels of any date or time input holding a partial entry, such as
	 * `25/10/` with no year (flag 31). The input then reports `value === ''`,
	 * the same as a deliberately emptied picker, so the body would send `null`
	 * and clear a stored date. Only `validity.badInput` tells the two apart.
	 *
	 * The DOM is read directly, with `getElementById`, because `bind:this` is
	 * not on B3's list. `saveDraft()` calls it fresh at click time, and so does
	 * `submitGate()`. `incomplete` below is only its reactive copy.
	 */
	function incompleteDateTimes(): string[] {
		const labels: string[] = [];
		for (const field of DATE_TIME_FIELDS) {
			const input = document.getElementById(field) as HTMLInputElement | null;
			if (input?.validity.badInput) labels.push(FIELD_LABELS[field]);
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
	 * The refusal shown when a date or time input holds a partial entry, or
	 * `null` when none does. Always a FRESH read (decision 73), so every caller
	 * gets the backstop flag 41 describes.
	 *
	 * One definition, three callers — both saves ("saving") and `submitGate()`
	 * ("submitting"). Extracted at 8b rather than written a third time: the
	 * three-copies rule governs markup, not functions (decision 46), so the
	 * test was whether one definition beats three, and a sentence that must
	 * read the same under three different buttons is exactly that case. The
	 * verb stays a parameter so the message still names the action it refused.
	 */
	function incompleteMessage(verb: string): string | null {
		const fields = incompleteDateTimes();
		if (fields.length === 0) return null;
		const one = fields.length === 1;
		return `${fields.join(', ')} ${one ? 'is' : 'are'} incomplete. Finish or clear ${one ? 'it' : 'them'} before ${verb}.`;
	}

	/**
	 * The five fields whose wire format is not the input's own string — flag
	 * 5's set, exactly. Anything absent from here sends its value unchanged.
	 *
	 * Keyed on `EditableField` rather than on one form's keys, so ONE table
	 * serves both save bodies and a misspelt key fails `bun run check`. The
	 * `actual_implementation_date` entry has no caller until 8b; an uncalled
	 * truth costs nothing (decision 63's precedent) and keeping the set whole
	 * is what stops a second copy of this rule appearing beside the second
	 * save.
	 */
	const WIRE_FORMAT: Partial<Record<EditableField, 'date' | 'time'>> = {
		proposed_implementation_date: 'date',
		target_closure_date: 'date',
		actual_implementation_date: 'date', // 8b
		implementation_window_start: 'time',
		implementation_window_end: 'time'
	};

	/**
	 * One form value in the shape the API accepts.
	 *
	 * ⚠️ `'' → null` lives here and nowhere else. It is load-bearing on the
	 * four dates and times and on `assigned_approver_id`, where `''` is a 400
	 * (defect 17); on the rest it only tidies. A second copy of this rule
	 * beside the second save body is how the body and the dirty gate would
	 * drift apart, which is the argument decision 72 already made for reusing
	 * the diff. No trim: the server trims, and its whitespace set differs from
	 * JavaScript's.
	 */
	function toWire(field: EditableField, value: string): string | null {
		if (value === '') return null;
		switch (WIRE_FORMAT[field]) {
			case 'date':
				return dateOutput(value);
			case 'time':
				return timeOutput(value);
			default:
				return value;
		}
	}

	/**
	 * The fields where the form differs from the record (decision 65). The
	 * baseline is built by the same function that built the form, so the
	 * comparison is plain string equality with no per-type logic.
	 *
	 * Not the whole form, for two reasons. A whole-form body sends every
	 * untouched value back, so a tab loaded before another tab's save reverts
	 * that save, and on the audited fields it writes `FieldUpdated` rows nobody
	 * made. And a TIME stored with seconds would come back truncated to
	 * `HH:MM:00`.
	 *
	 * Generic over the key set, so "changed" has exactly one definition for
	 * every save body. `K extends EditableField` is what lets the shared
	 * `toWire` be called with a key TypeScript can check.
	 */
	function changes<K extends EditableField>(
		current: Record<K, string>,
		baseline: Record<K, string>
	): Partial<Record<K, string | null>> {
		const body: Partial<Record<K, string | null>> = {};
		for (const key of Object.keys(baseline) as K[]) {
			if (current[key] !== baseline[key]) body[key] = toWire(key, current[key]);
		}
		return body;
	}

	/**
	 * The keys come from the `toDraftForm` literal, which is exactly the 24 of
	 * `SaveDraftRequest`, so an unknown key (a 400) cannot be built. The cast is
	 * for the enum fields: a bound select can only yield `''` or a member of its
	 * `types.ts` array, and `''` is already `null` by here.
	 */
	function draftChanges(current: DraftForm, record: ChangeControlResponse): SaveDraftRequest {
		return changes(current, toDraftForm(record)) as SaveDraftRequest;
	}

	/**
	 * The same for the five implementation fields. The shared `toWire` already
	 * routes `actual_implementation_date` through `dateOutput` via
	 * `WIRE_FORMAT`, so nothing here knows anything about dates.
	 *
	 * The cast covers `post_implementation_issues`, whose select can only yield
	 * `''` or a member of its `types.ts` array; `''` is already `null` by here.
	 */
	function implChanges(
		current: ImplForm,
		record: ChangeControlResponse
	): SaveImplementationRequest {
		return changes(current, toImplForm(record)) as SaveImplementationRequest;
	}

	/**
	 * Whether a gate's fields hold values from a review that did not approve.
	 *
	 * T2 and T6 clear nothing — they set the state, the status and the updater
	 * and no more — so after a rejection the record keeps the old Decision and
	 * comments (A10). `Reject` then sits beside a status of `Not Submitted`,
	 * which reads as a contradiction, and after a resubmission beside
	 * `Pending`, which reads as a decision already taken. Hence `!== 'Approved'`
	 * rather than a test on one status: it covers both, and Cancelled too.
	 *
	 * The controls themselves are right to show the values — the approver
	 * reopening the gate must see what they wrote last time. It is the screen
	 * that has to say what they are.
	 */
	const leftoverImplDecision = $derived(
		cc !== null && cc.decision !== null && cc.implementation_approval_status !== 'Approved'
	);
	const leftoverFinalDecision = $derived(
		cc !== null && cc.final_decision !== null && cc.final_approval_status !== 'Approved'
	);

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
	 * ⚠️ T2 and T6 ignore field values, so this is the only guard against
	 * submitting unsaved edits (A2). Submit is not `disabled`, because
	 * `global.css` has no `.btn:disabled` and a disabled button looks enabled.
	 * `submitGate()` below is where that refusal lives.
	 *
	 * One term per savable slice, each gated on the predicate that owns it, so
	 * exactly one diff runs per recompute and 8b adds a term rather than
	 * rewriting the expression. The approver's two gates contribute nothing:
	 * they have no save, so there is nothing for them to be unsaved from.
	 */
	const dirty = $derived(
		cc !== null &&
			(incomplete.length > 0 ||
				(canSaveDraft() &&
					draftForm !== null &&
					Object.keys(draftChanges(draftForm, cc)).length > 0) ||
				(canSaveImplementation() &&
					implForm !== null &&
					Object.keys(implChanges(implForm, cc)).length > 0))
	);

	/**
	 * The error the bar shows (flag 42, decision 89): the recorded one, while
	 * the screen still matches the one it was about. Once the user changes
	 * anything it hides, and "Unsaved changes" shows instead. Undo back to that
	 * screen and it shows again — still true — which is decision 75's "hidden,
	 * not cleared", applied to errors.
	 *
	 * ⚠️ KNOWN COST: it also hides errors that are STILL true (flag 50). A 400
	 * for an over-long Comments hides as soon as Change Title is edited, while
	 * Comments is still too long. Accepted as the better trade over a stale
	 * error outranking the hint: the next Save or Submit returns the same 400,
	 * so the error comes back when the user acts.
	 *
	 * Only plain `{ error }` bodies reach it: `fail()` sends anything with
	 * `issues` to the requirements dialog instead (decision 90).
	 *
	 * Lazy like `dirty`: one stringify of about 35 strings when the bar reads it.
	 */
	const shownError = $derived(
		actionError !== null && (actionError.screen === null || actionError.screen === screenKey())
			? actionError.body
			: null
	);

	/**
	 * `PUT /changecontrols/{ccID}`. What each outcome does to `cc` and `draftForm` is
	 * recorded in PROGRESS.md for 7d:
	 * - 200: `setRecord`, which rebuilds `draftForm` from the server's copy.
	 * - 409: refetch, per A8.2, because the record has left Initiated.
	 * - Anything else: both untouched, so the edits stay on screen.
	 *
	 * A 401 never reaches here as its own case, because `request()` refreshes
	 * and retries.
	 */
	async function saveDraft() {
		if (saving || cc === null || draftForm === null) return;
		actionError = null;
		actionNotice = null;

		const refusal = incompleteMessage('saving');
		if (refusal !== null) {
			fail({ error: refusal });
			return;
		}

		// An empty body is a 400, `No fields to update`, so nothing is sent.
		const body = draftChanges(draftForm, cc);
		if (Object.keys(body).length === 0) {
			actionNotice = 'No changes to save';
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
			actionNotice = `Saved ${formatDateTime(new Date().toISOString())}`;
		} else {
			// Only a 409 is pinned: its reload changes the screen (decision 89).
			fail(result.error, result.status === 409);
			if (result.status === 409) load(ccId);
		}
	}

	/**
	 * `PUT /changecontrols/{ccID}/implementation`. Decision 68's outcome table,
	 * unchanged: 200 → `setRecord`; 409 → refetch, because the record has left
	 * `In Implementation`; anything else leaves `cc` and every form object
	 * alone, so the edits stay on screen to be fixed or resent.
	 *
	 * ⚠️ It shares `saving` with `saveDraft()`. The two states are mutually
	 * exclusive, so only one can ever be in flight — and a second flag could
	 * only fall out of step with `editable()`'s lock, which reads this one
	 * (flag 32).
	 */
	async function saveImplementation() {
		if (saving || cc === null || implForm === null) return;
		actionError = null;
		actionNotice = null;

		const refusal = incompleteMessage('saving');
		if (refusal !== null) {
			fail({ error: refusal });
			return;
		}

		// An empty body is a 400, `No fields to update`, so nothing is sent.
		const body = implChanges(implForm, cc);
		if (Object.keys(body).length === 0) {
			actionNotice = 'No changes to save';
			return;
		}

		saving = true;
		const mine = latest;
		const result = await request<ChangeControlResponse>(
			'PUT',
			`/changecontrols/${encodeURIComponent(cc.cc_id)}/implementation`,
			body
		);
		saving = false;
		if (mine !== latest) return;

		if (result.ok) {
			setRecord(result.data);
			actionNotice = `Saved ${formatDateTime(new Date().toISOString())}`;
		} else {
			fail(result.error, result.status === 409);
			if (result.status === 409) load(ccId);
		}
	}

	/**
	 * Save Draft's click handler. One button in the bar, because the two saves
	 * are mutually exclusive by state and rendering both would need the same
	 * two predicates twice.
	 *
	 * Nothing saves while the signature modal is open: the overlay blocks the
	 * pointer but not Tab, and a save then would change the stored row between
	 * the gate and the signature.
	 */
	function save() {
		if (dialog !== null) return;
		if (canSaveDraft()) return saveDraft();
		if (canSaveImplementation()) return saveImplementation();
	}

	// ── Submitting a signed transition ──────────────────────────────────────

	/**
	 * ⚠️ SCAFFOLDING — THE E-SIGNATURE MODAL'S INSERTION POINT.
	 *
	 * Every caller reaches this line only once `submitGate()` has passed, which
	 * is exactly the moment `openEsig(meaning, send)` should open. Replace the
	 * `fail(…)` call; do not add beside it. `submitForImplApproval()` below is
	 * the worked example.
	 *
	 * This comment sits on the constant rather than at a call site so that
	 * deleting one caller cannot strand it. `tsconfig` has no `noUnusedLocals`,
	 * so nothing in the build will notice a leftover: **flag 45 tracks the
	 * number of USES**.
	 *
	 * ⚠️ **The counting command lives in flag 45, deliberately NOT here.** It
	 * matches on the nullish coalescing that precedes each use, so writing it
	 * into this file would make the comment match its own pattern and inflate
	 * the count by one. That has now happened twice — first with a bare search
	 * for the name, which matches these comments, and then with the command
	 * itself. **A self-counting check is wrong every time.** Keep the pattern
	 * out of this file and read it from PROGRESS.md.
	 *
	 *   after 8a  2 uses   the two Submit Decisions
	 *   after 8b  3 uses   + Submit for Final Approval
	 *   step 11   2 uses   the implementation gate's goes
	 *   step 13   0 uses   the final gate's and Submit for Final Approval's go,
	 *                      and this declaration and both comments go with them
	 *
	 * Step 9 added none: T2's Submit arrived already wired to the modal.
	 *
	 * An `ErrorBody`, not a string, since `submitGate()` returns one. That
	 * keeps the call sites' text matching flag 45's pattern.
	 */
	const SIGNATURE_NOT_BUILT: ErrorBody = { error: 'Electronic signature is not built yet.' };

	/**
	 * The client-side half of a signed transition (A7.4).
	 *
	 * The API validates presence and business rules BEFORE it checks the
	 * signature, so a modal opened while a check would fail asks the user to
	 * sign something the server is about to reject. This runs those checks
	 * first, and returns a message when the transition must not be offered.
	 *
	 * ⚠️ `incompleteMessage()` reads the DOM FRESH, not through `incomplete`
	 * (decision 73). The reactive copy is refreshed by two events, and flag 41
	 * records that another browser's date picker could produce a partial entry
	 * without either one.
	 *
	 * `values` is the buffer holding what the user has typed for this state's
	 * mandatory fields. `implementation_evidence` is in `MANDATORY` but has no
	 * form value — 8b checks it against the record instead.
	 *
	 * Returns an `ErrorBody`. The early refusals are a plain `{ error }`. The
	 * requirements refusal has the SAME shape as T2's and T6's 400 — the Go's
	 * own header, labels first, then rule sentences — so a client refusal and
	 * a server rejection render through the same markup and read identically.
	 */
	function submitGate(values: Record<string, string>): ErrorBody | null {
		// Unreachable — every caller is inside `{#if cc && …}` — but it is what
		// narrows the record for the lookups below. Captured into a `const`
		// because `cc` is reassignable, so TypeScript drops the narrowing
		// inside the filter callback.
		if (cc === null) return { error: 'The record is still loading.' };
		const record = cc;
		if (saving) return { error: 'A save is in progress. Try again in a moment.' };
		if (dirty) return { error: 'Save your changes before submitting.' };

		const refusal = incompleteMessage('submitting');
		if (refusal !== null) return { error: refusal };

		// ⚠️ `implementation_evidence` is in MANDATORY and in EditableField, but
		// it is in no form object — it has no control and no value, only an
		// uploaded file. T6 checks it with `FileAttachmentExists`, so the
		// client checks the record, not the buffer. Without this branch it
		// would read as blank and be reported missing on every submit.
		const missing = MANDATORY[record.current_state]
			.filter((field) =>
				field === 'implementation_evidence'
					? record.implementation_evidence === null
					: (values[field] ?? '') === ''
			)
			.map((field) => FIELD_LABELS[field]);

		// ⚠️ T2's business-day rules, which the server checks in the SAME pass
		// as presence (A5.3). Without them a present-but-early date passes this
		// gate, opens the modal, collects a password, and draws a 400 the
		// server was always going to return (A7.4).
		//
		// Only for a present date, as in the Go, so a date is never reported
		// twice. `dirty` was refused above, so these strings ARE the stored row
		// the server validates. `YYYY-MM-DD` compares lexically in date order,
		// so `<` is Go's `Before`. The boundary is computed now, not at render,
		// so a page left open overnight gates on today. The sentence is the
		// Go's, word for word.
		//
		// T6's rule ("cannot be in the future") joins here at step 13 (flag 48).
		const rules: string[] = [];
		if (record.current_state === 'Initiated') {
			for (const field of Object.keys(BUSINESS_DAYS) as EditableField[]) {
				const days = BUSINESS_DAYS[field]!;
				const value = values[field] ?? '';
				if (value !== '' && value < earliestSubmitDate(days)) {
					rules.push(`${FIELD_LABELS[field]} must be at least ${days} business days from today`);
				}
			}
		}

		if (missing.length > 0 || rules.length > 0) {
			return { error: 'Cannot submit: some requirements are not met', issues: [...missing, ...rules] };
		}
		return null;
	}

	/**
	 * Submit Decision, once per gate.
	 *
	 * ⚠️ NOT one shared handler. The gate CHECKS are shared, in `submitGate()`
	 * above, because they are the same checks. What follows them is not: the
	 * implementation gate posts T4/T5 at step 11 and the final gate posts T7/T8
	 * at step 13, with different endpoints, different meanings and different
	 * bodies. One handler would have to be split by whichever step came first,
	 * and it would hold a single `SIGNATURE_NOT_BUILT` reference that neither
	 * step could remove on its own — which is exactly what flag 45's count
	 * exists to prevent.
	 *
	 * Both are synchronous throughout: no request, no `await`, so no in-flight
	 * window. Steps 11 and 13 replace the `fail(…)` with `openEsig()`, choosing
	 * the meaning from the decision and building `send` from a SNAPSHOT of the
	 * buffer, so what the modal shows is exactly what is signed (A7.5).
	 */
	function submitImplDecision() {
		if (implDecision === null || dialog !== null) return;
		actionError = null;
		actionNotice = null;
		fail(submitGate(implDecision) ?? SIGNATURE_NOT_BUILT);
	}

	function submitFinalDecision() {
		if (finalDecision === null || dialog !== null) return;
		actionError = null;
		actionNotice = null;
		fail(submitGate(finalDecision) ?? SIGNATURE_NOT_BUILT);
	}

	/**
	 * T6, the owner's submit out of `In Implementation`. Its own handler for
	 * the same reason as the two above: step 13 wires this one and step 11 does
	 * not, so a shared handler would hold a `SIGNATURE_NOT_BUILT` reference
	 * neither step could remove alone (flag 45).
	 *
	 * ⚠️ This is the gate that matters most. T6 carries no field values and
	 * silently ignores any it is sent, so `dirty` — checked inside
	 * `submitGate()` — is the only thing standing between an owner and
	 * submitting a form whose edits were never saved (A2).
	 */
	function submitForFinalApproval() {
		if (implForm === null || dialog !== null) return;
		actionError = null;
		actionNotice = null;
		fail(submitGate(implForm) ?? SIGNATURE_NOT_BUILT);
	}

	/**
	 * T2, the owner's submit out of `Initiated`. The gate, then the modal.
	 *
	 * ⚠️ T2 carries no field values and silently ignores any it is sent, so
	 * `dirty` — refused inside `submitGate()` — is the only thing standing
	 * between an owner and submitting edits that were never saved (A2).
	 */
	function submitForImplApproval() {
		if (cc === null || draftForm === null || dialog !== null) return;
		actionError = null;
		actionNotice = null;
		const refusal = submitGate(draftForm);
		if (refusal !== null) {
			fail(refusal);
			return;
		}
		const path = `/changecontrols/${encodeURIComponent(cc.cc_id)}/submit`;
		openEsig('Submitted for Implementation Approval', (credentials) =>
			request<ChangeControlResponse>('POST', path, credentials)
		);
	}

	// ── The dialogs ─────────────────────────────────────────────────────────

	/**
	 * TWO DIALOGS, ONE STATE. The markup has two blocks; this variable says
	 * which is open, so both can never be open at once, the lock in
	 * `editable()` reads one thing, and a server 400 swaps the signature
	 * dialog for the requirements dialog in one assignment.
	 *
	 * `sign` — the e-signature modal (decision 88). One for every signed
	 * transition.
	 * - `meaning` is shown to the signer (A7.5). Typed as `SignatureMeaning`,
	 *   so a mistyped meaning fails `bun run check` and the ASCII hyphens
	 *   exist only in types.ts. Steps 11 and 13 pick it from the decision.
	 * - `send` posts the transition with the credentials. The caller builds it,
	 *   so the endpoint and any fields travel with the meaning they belong to.
	 *
	 * `requirements` — why a transition cannot go ahead (decision 90). Opened
	 * only by `fail()`, for any body with `issues`, client or server. Not a
	 * pre-flight state of the signature modal: its fixed text ("Electronic
	 * Signature Required", "You are signing as") would be untrue above a list
	 * of reasons you cannot sign, and A7.4 says the signature modal opens only
	 * once the checks pass.
	 *
	 * ⚠️ KNOWN COST (flag 51): once the requirements dialog is dismissed,
	 * nothing on the form marks a date that is PRESENT BUT TOO EARLY. An empty
	 * mandatory field keeps its asterisk and its empty box; an early date looks
	 * exactly like a valid one. Clicking Submit again is the only way back to
	 * the reason. Rare — `min` stops the picker offering one — but reachable
	 * by typing, or by a date saved before the boundary moved. Errors beside
	 * the field (flag 35) are what would fix it.
	 */
	type Dialog =
		| {
				kind: 'sign';
				meaning: SignatureMeaning;
				send: (credentials: ESignatureCredentials) => Promise<ApiResult<ChangeControlResponse>>;
		  }
		| { kind: 'requirements'; error: string; issues: string[] };

	let dialog = $state<Dialog | null>(null);
	// ⚠️ A7.3: the password lives only here, only while the signature dialog
	// is open. `closeDialog()` clears both fields on every way out, and
	// neither is written anywhere else.
	let esigEmail = $state('');
	let esigPassword = $state('');
	let esigError = $state<string | null>(null);
	let signing = $state(false);

	// Narrowed copies for the markup, so the template needs no discriminant
	// checks of its own (an `{#each}` does not carry a template narrowing).
	const signDialog = $derived(dialog?.kind === 'sign' ? dialog : null);
	const requirementsDialog = $derived(dialog?.kind === 'requirements' ? dialog : null);

	function openEsig(
		meaning: SignatureMeaning,
		send: (credentials: ESignatureCredentials) => Promise<ApiResult<ChangeControlResponse>>
	) {
		if (dialog !== null) return;
		// A7.2: pre-filled with the signed-in user's email. Still editable —
		// the server compares it, case-insensitively, against that user.
		esigEmail = user.email;
		esigPassword = '';
		esigError = null;
		dialog = { kind: 'sign', meaning, send };
	}

	function closeDialog() {
		dialog = null;
		esigEmail = '';
		esigPassword = '';
		esigError = null;
	}

	// Back, in either dialog. Ignored while a signature is in flight, so the
	// outcome still has a dialog to land in.
	function backFromDialog() {
		if (signing) return;
		closeDialog();
	}

	const INVALID_CREDENTIALS = 'Invalid credentials';

	/**
	 * Sign and Submit. Credential and transport failures stay in the modal,
	 * where the user can act on them. Failures about the record close it and
	 * go through `fail()`, which picks the home by shape.
	 *
	 *   200               setRecord, close, refetch signatures, notice
	 *   401 Invalid cred. stay open, clear the password
	 *   0 / 500           stay open, the message verbatim — a retry is safe:
	 *                     if the first attempt committed, the retry gets a 409
	 *   409               close, pinned error in the bar, reload (A8.2, decision 68)
	 *   400 with issues   swap to the requirements dialog, credentials cleared
	 *   400 · 403 · 404   close, error in the bar
	 *
	 * A 401 `Unauthorized` never lands here: `request()` refreshes and retries,
	 * or ends the session, which unmounts this page (decision 13).
	 */
	async function sign() {
		if (signDialog === null || signing) return;
		esigError = null;

		// The Go's own messages. Both checks run before its transaction opens,
		// so a blank field would be a plain 400 even on a record that has
		// moved on. ⚠️ The password is NEVER trimmed — the Go does not trim
		// it, so trimming here would turn a correct password with a leading or
		// trailing space into a 401 and a `SignatureFailed` row. (The
		// prototype trims it.) The email is sent as typed: the server trims.
		if (esigEmail.trim() === '') {
			esigError = 'Email cannot be blank';
			return;
		}
		if (esigPassword === '') {
			esigError = 'Password cannot be blank';
			return;
		}
		// Decision 74's second read. The `dialog` lock in `editable()` should
		// make this unreachable; it stays as a one-line backstop.
		if (dirty) {
			closeDialog();
			fail({ error: 'Save your changes before submitting.' });
			return;
		}

		const { meaning, send } = signDialog;
		signing = true;
		const mine = latest;
		const result = await send({ email: esigEmail, password: esigPassword });
		signing = false;
		if (mine !== latest) return;

		if (result.ok) {
			closeDialog();
			// A7.7: the response IS the record, re-read inside the transaction.
			// Set it; never refetch it.
			setRecord(result.data);
			actionError = null;
			// The meaning verbatim, because it is what was attested to. The
			// banner confirming the new state is usually scrolled off-screen
			// when the user is at the bar.
			actionNotice = `Signed: ${meaning} · ${formatDateTime(new Date().toISOString())}`;
			// The history is not in the response. Guarded by the same `mine`,
			// and keyed on the response's CC-ID, not the URL's.
			loadSignatures(result.data.cc_id, mine);
			return;
		}
		if (result.status === 401 && result.error.error === INVALID_CREDENTIALS) {
			esigPassword = '';
			esigError = 'Invalid credentials. Signature not applied and no changes were made.';
			return;
		}
		if (result.status === 0 || result.status === 500) {
			// No claim about data state: status 0 can hide a commit (trap 6).
			esigError = result.error.error;
			return;
		}
		// With `issues`, `fail()` opens the requirements dialog in place of
		// this one; otherwise the error goes to the bar.
		closeDialog();
		fail(result.error, result.status === 409);
		if (result.status === 409) load(ccId);
	}
</script>

{#if loading}
	<p>Loading…</p>
{:else if cc && draftForm && implForm && implDecision && finalDecision}
	<!-- Every cc-form prototype uses `.page-header`, which has no bottom margin.
	     The prototypes get their gap from the info banner that always follows
	     it (`.info-banner` has `margin: var(--spacing-xl) 0`). This page renders
	     no banner at all for one combination — an Initiated record seen by
	     anyone but its owner — so without the wrapper the header sat flush
	     against the first card.

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

	<!-- Decision 54 deferred four banners to "its state's role step"; this is
	     that step for three of them. Two variants per state: the person who can
	     act, and everyone else. Text is the prototypes', with one exception.

	     ⚠️ "You will be notified" IS DROPPED from all three non-actor banners.
	     Phase 1 has no SMTP (FR-6.4.1) — the Go logs `notification pending` and
	     sends nothing — so it is a promise the system cannot keep, for every
	     role. Decision 34 set the precedent by dropping the Admin dashboard's
	     "change controls you're involved with" *because it was false*, and
	     decision 43 did the same again; the precedent covers factual claims,
	     not just wording. Each banner keeps its heading and a complete, true
	     first sentence, so nothing is invented to fill the gap. Flag 46 records
	     the three sentences for restoration with FR-6.4.1. -->
	{#if cc.current_state === 'Initiated'}
		{#if isOwner()}
			<div class="info-banner">
				<strong>Before you submit</strong><br />
				Fill out the change control details below. Fields marked with <strong>*</strong> are
				mandatory. Once submitted, this change will be sent for implementation approval.
			</div>
		{/if}
	{:else if cc.current_state === 'Pending Implementation Approval'}
		{#if isAssignedApprover()}
			<div class="info-banner">
				<strong>Review required</strong><br />
				Please review this change request and provide your approval decision below.
			</div>
		{:else}
			<div class="info-banner">
				<strong>Awaiting approval</strong><br />
				This change has been submitted and is pending implementation approval.
			</div>
		{/if}
	{:else if cc.current_state === 'In Implementation'}
		{#if isOwner()}
			<div class="info-banner">
				<strong>Implementation in progress</strong><br />
				This change has been approved for implementation. Complete the implementation details
				below and attach supporting evidence (e.g., logs, screenshots, test results). When ready,
				submit for Final Approval.
			</div>
		{:else}
			<div class="info-banner">
				<strong>Implementation in progress</strong><br />
				The change owner is completing implementation details.
			</div>
		{/if}
	{:else if cc.current_state === 'Pending Final Approval'}
		{#if isAssignedApprover()}
			<div class="info-banner">
				<strong>Review required</strong><br />
				Please review this change request and provide your final approval decision below.
			</div>
		{:else}
			<div class="info-banner">
				<strong>Awaiting final approval</strong><br />
				This change has been submitted for final approval and is awaiting review.
			</div>
		{/if}
	{:else if cc.current_state === 'Closed'}
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
				placeholder={placeholder('change_title')}
				bind:value={draftForm.change_title}
			/>
			<!-- Flag 36, revised: the server's limit made visible before the
			     round trip, not after it. `lengthHint` returns null below 80%,
			     so this is silent in the ordinary case. Called twice rather than
			     held in an `{@const}`, which is not on B3's list; it is a pure
			     function over two values. ⚠️ This field's limit is 200, not the
			     2000 most of the others carry. -->
			{#if lengthHint('change_title', draftForm.change_title)}
				<div class="field-hint">{lengthHint('change_title', draftForm.change_title)}</div>
			{/if}
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
				placeholder={placeholder('change_description')}
				bind:value={draftForm.change_description}
			></textarea>
			{#if lengthHint('change_description', draftForm.change_description)}
				<div class="field-hint">{lengthHint('change_description', draftForm.change_description)}</div>
			{/if}
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
					bind:value={draftForm.change_type}
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
					bind:value={draftForm.change_category}
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
					bind:value={draftForm.department_function}
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
				placeholder={placeholder('affected_systems_modules')}
				bind:value={draftForm.affected_systems_modules}
			/>
			<!-- ⚠️ 500 here, not 2000. -->
			{#if lengthHint('affected_systems_modules', draftForm.affected_systems_modules)}
				<div class="field-hint">
					{lengthHint('affected_systems_modules', draftForm.affected_systems_modules)}
				</div>
			{/if}
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
					min={minDate('proposed_implementation_date')}
					oninput={recheckDateTimes}
					onkeyup={recheckDateTimes}
					bind:value={draftForm.proposed_implementation_date}
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
					min={minDate('target_closure_date')}
					oninput={recheckDateTimes}
					onkeyup={recheckDateTimes}
					bind:value={draftForm.target_closure_date}
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
					bind:value={draftForm.implementation_window_start}
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
					bind:value={draftForm.implementation_window_end}
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
				placeholder={placeholder('reason_for_change')}
				bind:value={draftForm.reason_for_change}
			></textarea>
			{#if lengthHint('reason_for_change', draftForm.reason_for_change)}
				<div class="field-hint">{lengthHint('reason_for_change', draftForm.reason_for_change)}</div>
			{/if}
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
				placeholder={placeholder('business_impact')}
				bind:value={draftForm.business_impact}
			></textarea>
			{#if lengthHint('business_impact', draftForm.business_impact)}
				<div class="field-hint">{lengthHint('business_impact', draftForm.business_impact)}</div>
			{/if}
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
					bind:value={draftForm.expected_downtime}
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
					bind:value={draftForm.requires_testing}
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
					bind:value={draftForm.requires_training}
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
				placeholder={placeholder('risk_rationale')}
				bind:value={draftForm.risk_rationale}
			></textarea>
			{#if lengthHint('risk_rationale', draftForm.risk_rationale)}
				<div class="field-hint">{lengthHint('risk_rationale', draftForm.risk_rationale)}</div>
			{/if}
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
				placeholder={placeholder('key_risks_mitigations')}
				bind:value={draftForm.key_risks_mitigations}
			></textarea>
			{#if lengthHint('key_risks_mitigations', draftForm.key_risks_mitigations)}
				<div class="field-hint">
					{lengthHint('key_risks_mitigations', draftForm.key_risks_mitigations)}
				</div>
			{/if}
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
				placeholder={placeholder('high_level_implementation_plan')}
				bind:value={draftForm.high_level_implementation_plan}
			></textarea>
			{#if lengthHint('high_level_implementation_plan', draftForm.high_level_implementation_plan)}
				<div class="field-hint">
					{lengthHint('high_level_implementation_plan', draftForm.high_level_implementation_plan)}
				</div>
			{/if}
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
				placeholder={placeholder('validation_approach')}
				bind:value={draftForm.validation_approach}
			></textarea>
			{#if lengthHint('validation_approach', draftForm.validation_approach)}
				<div class="field-hint">{lengthHint('validation_approach', draftForm.validation_approach)}</div>
			{/if}
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
				placeholder={placeholder('success_criteria')}
				bind:value={draftForm.success_criteria}
			></textarea>
			{#if lengthHint('success_criteria', draftForm.success_criteria)}
				<div class="field-hint">{lengthHint('success_criteria', draftForm.success_criteria)}</div>
			{/if}
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
				placeholder={placeholder('rollback_backout_plan')}
				bind:value={draftForm.rollback_backout_plan}
			></textarea>
			{#if lengthHint('rollback_backout_plan', draftForm.rollback_backout_plan)}
				<div class="field-hint">
					{lengthHint('rollback_backout_plan', draftForm.rollback_backout_plan)}
				</div>
			{/if}
		</div>
	</section>

	<!-- ================== Implementation Details ================== -->
	<section class="card">
		<h2>Implementation Details</h2>

		<!-- Flag 25's section level: why these controls are disabled, said once
		     per card rather than once per field. Text verbatim from the
		     prototypes. Only this card needs one — everywhere else the state's
		     info banner already answers it. After the gate has passed there is
		     nothing left to explain, so Pending Final Approval, Closed and
		     Cancelled get none. The control is never replaced by the
		     explanation (decision 52). -->
		{#if cc.current_state === 'Initiated' || cc.current_state === 'Pending Implementation Approval'}
			<div class="section-note">
				These fields will become available once the change is approved for implementation.
			</div>
		{:else if cc.current_state === 'In Implementation'}
			{#if isOwner()}
				<div class="section-note">
					Complete the implementation details below and attach supporting evidence before
					submitting for final approval.
				</div>
			{:else}
				<div class="section-note">The change owner is currently completing these fields.</div>
			{/if}
		{/if}

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
					oninput={recheckDateTimes}
					onkeyup={recheckDateTimes}
					bind:value={implForm.actual_implementation_date}
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
					bind:value={implForm.post_implementation_issues}
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
				placeholder={placeholder('implementation_summary')}
				bind:value={implForm.implementation_summary}
			></textarea>
			{#if lengthHint('implementation_summary', implForm.implementation_summary)}
				<div class="field-hint">
					{lengthHint('implementation_summary', implForm.implementation_summary)}
				</div>
			{/if}
		</div>

		<div class="form-group">
			<label for="deviations_from_plan">Deviations from Plan</label>
			<textarea
				id="deviations_from_plan"
				class="form-control"
				rows="3"
				disabled={!editable('deviations_from_plan')}
				placeholder={placeholder('deviations_from_plan')}
				bind:value={implForm.deviations_from_plan}
			></textarea>
			{#if lengthHint('deviations_from_plan', implForm.deviations_from_plan)}
				<div class="field-hint">
					{lengthHint('deviations_from_plan', implForm.deviations_from_plan)}
				</div>
			{/if}
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
				placeholder={placeholder('validation_performed')}
				bind:value={implForm.validation_performed}
			></textarea>
			{#if lengthHint('validation_performed', implForm.validation_performed)}
				<div class="field-hint">
					{lengthHint('validation_performed', implForm.validation_performed)}
				</div>
			{/if}
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
			<!-- ⚠️ The label carries an asterisk from here on, because `mayEdit`
			     is genuinely true for the owner in this state — `HandlerUploadFile`
			     checks owner + In Implementation — and MANDATORY lists it for T6.
			     `required()` stays computed, with no carve-out for step 12 to
			     remember to remove. The box below it stays DISABLED until then, so
			     the hint is what says the evidence is expected; without it the
			     asterisk would point at something with no control. -->
			{#if mayEdit('implementation_evidence')}
				<div class="field-hint">
					Upload logs, screenshots, test results, or other supporting evidence
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
				bind:value={draftForm.assigned_approver_id}
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
				placeholder={placeholder('comments_for_approver')}
				bind:value={draftForm.comments_for_approver}
			></textarea>
			{#if lengthHint('comments_for_approver', draftForm.comments_for_approver)}
				<div class="field-hint">
					{lengthHint('comments_for_approver', draftForm.comments_for_approver)}
				</div>
			{/if}
		</div>

		<h3 class="section-subtitle">Implementation Approval</h3>

		<!-- Flag 25 / decision 56, the half owed to this card. Decision 52
		     replaced the prototypes' `.field-na` boxes with empty disabled
		     controls, which was right for the architecture — but those boxes
		     carried an EXPLANATION ("Not applicable – Pending submission"), and
		     without it five empty controls sit here with nothing saying why.

		     ⚠️ The leftover case is worse than unexplained. T2 does not clear
		     these three, so after a T5 rejection Decision still reads Reject
		     beside a status of Not Submitted — a contradiction on its face —
		     and after a resubmission beside Pending, which reads as a decision
		     already taken. The note is what makes it legible, and the approver
		     reopening the gate is exactly who needs it. -->
		{#if leftoverImplDecision}
			<div class="section-note">
				These are the previous review's values. This change was rejected and returned for revision;
				a new decision replaces them.
			</div>
		{:else if cc.current_state === 'Initiated'}
			<div class="section-note">
				Completed by the assigned approver once this change has been submitted for implementation
				approval.
			</div>
		{:else if cc.current_state === 'Pending Implementation Approval' && !isAssignedApprover()}
			<div class="section-note">Awaiting the assigned approver's decision.</div>
		{/if}

		<div class="grid-2">
			<div class="form-group">
				<label for="decision">Decision{#if required('decision')} *{/if}</label>
				<select
					id="decision"
					class="form-control"
					disabled={!editable('decision')}
					bind:value={implDecision.decision}
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
					bind:value={implDecision.risk_level}
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
				placeholder={placeholder('decision_comments')}
				bind:value={implDecision.decision_comments}
			></textarea>
			{#if lengthHint('decision_comments', implDecision.decision_comments)}
				<div class="field-hint">
					{lengthHint('decision_comments', implDecision.decision_comments)}
				</div>
			{/if}
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

		<!-- The same, for the second gate. T6 does not clear these two either,
		     so a T8 rejection leaves Final Decision reading Reject (A10). The
		     "not yet" note covers three states here, not one: these fields stay
		     empty until the record reaches Pending Final Approval. -->
		{#if leftoverFinalDecision}
			<div class="section-note">
				These are the previous review's values. This change was rejected and returned to
				implementation; a new decision replaces them.
			</div>
		{:else if cc.current_state === 'Initiated' || cc.current_state === 'Pending Implementation Approval' || cc.current_state === 'In Implementation'}
			<div class="section-note">
				Completed by the assigned approver once implementation is finished and submitted for final
				approval.
			</div>
		{:else if cc.current_state === 'Pending Final Approval' && !isAssignedApprover()}
			<div class="section-note">Awaiting the assigned approver's final decision.</div>
		{/if}

		<div class="form-group">
			<label for="final_decision"
				>Final Decision{#if required('final_decision')} *{/if}</label
			>
			<select
				id="final_decision"
				class="form-control"
				disabled={!editable('final_decision')}
				bind:value={finalDecision.final_decision}
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
				placeholder={placeholder('final_comments')}
				bind:value={finalDecision.final_comments}
			></textarea>
			{#if lengthHint('final_comments', finalDecision.final_comments)}
				<div class="field-hint">{lengthHint('final_comments', finalDecision.final_comments)}</div>
			{/if}
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
				placeholder={placeholder('comments')}
				bind:value={draftForm.comments}
			></textarea>
			{#if lengthHint('comments', draftForm.comments)}
				<div class="field-hint">{lengthHint('comments', draftForm.comments)}</div>
			{/if}
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
<!-- Back to List, Save Draft, the two submits and Submit Decision. Cancel
     arrives at step 10. Every button is gated
     by the same predicates the controls are, so a role that can edit nothing
     here sees nothing but Back to List.

     The save message sits in the bar, beside the button. `.form-actions` is
     sticky, so the message is visible wherever the user clicked Save; a block
     above the bar would sit below Signature History. The message is outside
     the button's `{#if}`, so a 409's error survives the reload that turns
     the record read-only.

     Save Draft stays on the form (BRD US-CC-02). The prototype's
     `<a href="my-change-controls.html">` is a static mock, and saving is an
     action, so it is a `<button>`. `global.css` has no `.btn:disabled`, so
     the label carries the in-flight state (decision 59).

     ⚠️ EVERY BUTTON LABEL IN THIS BAR USES NON-BREAKING SPACES (flag 39,
     option B). `.actions-left` and `.actions-right` are flex rows, and a flex
     item shrinks to its narrowest possible width: for a `.btn`, its longest
     single word. So any text long enough to overflow the row squeezed the
     buttons word by word ("Back / to / List"), even one plain sentence in a
     half-screen window. `&nbsp;` makes the whole label that narrowest width,
     so the message wraps instead. Chosen over `white-space: nowrap` in
     global.css (canonical, five copies) and a per-button `style:`
     (decision 71's one-cancellation precedent). A button added here without
     it brings the defect back silently, and only at narrow widths — which
     is the cost of this option. Labels in JS strings use ` `. -->
<div class="form-actions">
	<div class="actions-left">
		<a href="/change-controls" class="btn secondary">
			<i class="bi bi-arrow-left"></i> Back&nbsp;to&nbsp;List
		</a>
	</div>

	<div class="actions-right">
		{#if shownError}
			<!-- `shownError`, not `actionError`: an error hides once the screen
			     no longer matches the one it was about (decision 89, flag 50).
			     One plain sentence only, by construction: `fail()` sends every
			     body with `issues` to the requirements dialog (decision 90). -->
			<!-- The class carries a modal-stacking margin that a flex row centres against, lifting the box half of --spacing-lg above the button. -->
			<div class="esig-error show" style:margin-bottom="0">{shownError.error}</div>
		{:else if dirty}
			<!-- Outranks "Saved …" without clearing it (decision 75). Undo back
			     to the saved values and that message returns, still true. -->
			<span class="field-hint">Unsaved changes</span>
		{:else if actionNotice}
			<span class="field-hint">{actionNotice}</span>
		{/if}
		<!-- One button for both saves. They are mutually exclusive by state, so
		     `save()` dispatches and neither predicate is written twice. -->
		{#if canSaveDraft() || canSaveImplementation()}
			<button type="button" class="btn secondary" onclick={save} disabled={saving}>
				<i class="bi bi-save"></i>
				{saving ? 'Saving…' : 'Save Draft'}
			</button>
		{/if}
		<!-- T2, owner only. Same predicate as the save, because the API checks
		     the same two things. The prototype's label and icon. -->
		{#if canSaveDraft()}
			<button type="button" class="btn primary" onclick={submitForImplApproval}>
				<i class="bi bi-send"></i> Submit&nbsp;for&nbsp;Approval
			</button>
		{/if}
		<!-- T6, owner only. Same predicate as the save, because the API checks
		     the same two things. -->
		{#if canSaveImplementation()}
			<button type="button" class="btn primary" onclick={submitForFinalApproval}>
				<i class="bi bi-send"></i> Submit&nbsp;for&nbsp;Final&nbsp;Approval
			</button>
		{/if}
		<!-- Submit Decision, for the ASSIGNED approver only — the API authorises
		     by `assigned_approver_id`, not by role (A7.6). Both read the record
		     through `cc`, which `load()` clears, so neither can survive into a
		     load against a record no longer on screen. Not `disabled` while the
		     gate would refuse: `global.css` has no `.btn:disabled`, so a
		     disabled button looks live and a click on it says nothing
		     (decision 74). The handlers refuse out loud instead. -->
		{#if cc && isAssignedApprover() && cc.current_state === 'Pending Implementation Approval'}
			<button type="button" class="btn primary" onclick={submitImplDecision}>
				<i class="bi bi-check-circle"></i> Submit&nbsp;Decision
			</button>
		{:else if cc && isAssignedApprover() && cc.current_state === 'Pending Final Approval'}
			<button type="button" class="btn primary" onclick={submitFinalDecision}>
				<i class="bi bi-check-circle"></i> Submit&nbsp;Decision
			</button>
		{/if}
	</div>
</div>

<!-- ================== E-Signature Modal ================== -->
<!-- One modal for every signed transition (decision 88), opened by
     `openEsig(meaning, send)`. Markup from owner/cc-form-initated-state.html.
     Inline rather than a component: this is the first copy, and B5 says
     `EsigModal` has to earn extraction.

     `.modal` is `display: none` until `.open`, so it renders only while open,
     always with both classes. Departures from the prototype:
     - "Email", not "Username", with an `id` the label points at (A7.1).
     - The error shows the actual outcome, not a fixed sentence.
     - `button` elements carry `type` and in-flight labels (decision 59).
     While it is open, `editable()` locks every control behind it.

     ⚠️ No Escape-to-close and no focus management (flag 52): no prototype has
     either, so adding them is invention. Deliberately not inherited silently. -->
{#if signDialog}
	<div class="modal open">
		<div class="modal-content">
			<h3><i class="bi bi-pen"></i> Electronic Signature Required</h3>
			<p class="modal-subtitle">
				Enter your credentials to sign this action. Your signature will be permanently recorded
				and cannot be removed.
			</p>

			<div class="esig-meaning">
				<div class="esig-meaning-label">You are signing as</div>
				<div class="esig-meaning-value">{signDialog.meaning}</div>
			</div>

			{#if esigError}
				<div class="esig-error show">
					<i class="bi bi-exclamation-triangle"></i>
					{esigError}
				</div>
			{/if}

			<div class="form-group">
				<label for="esig-email">Email *</label>
				<input
					type="text"
					class="form-control"
					id="esig-email"
					placeholder="Enter your email"
					autocomplete="off"
					disabled={signing}
					bind:value={esigEmail}
				/>
			</div>

			<div class="form-group">
				<label for="esig-password">Password *</label>
				<input
					type="password"
					class="form-control"
					id="esig-password"
					placeholder="Enter your password"
					autocomplete="off"
					disabled={signing}
					bind:value={esigPassword}
				/>
			</div>

			<div class="field-hint">
				You may only sign as yourself. Signing on behalf of another user is prohibited.
			</div>

			<div class="modal-actions">
				<button type="button" class="btn secondary" onclick={backFromDialog}>
					<i class="bi bi-arrow-left"></i> Back
				</button>
				<button type="button" class="btn primary" onclick={sign} disabled={signing}>
					<i class="bi bi-pen"></i>
					{signing ? 'Signing…' : 'Sign and Submit'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ================== Requirements Dialog ================== -->
<!-- Why a transition cannot go ahead (decision 90). Opened only by `fail()`,
     for a body with `issues`: `submitGate()`'s refusal, or a server 400. The
     same dialog for both, so they render identically (A8.1). A list of things
     to go and fix is not a status line: check 1 at step 9 showed twenty
     labels in the sticky bar squeezing its buttons onto three lines.

     ⚠️ NO PROTOTYPE DRAWS THIS. What is invented, and what is not:
     - Invented: using `.modal` for something other than a signature; its
       structure (heading, list, one button); and the `<ul>`, left to the
       browser's default styling — the one new visual. It sits inside
       `.esig-error`, whose margin was designed for exactly this modal
       context, so no CSS is added and flag 39's flex-row fight does not
       apply here.
     - Not invented: the heading is `error` verbatim — the Go's "Cannot
       submit: some requirements are not met", or the client's identical
       copy. Every item is verbatim: bare labels stay bare, and nothing
       rewrites them. The Back button and the triangle icon are the
       prototype's own.
     - Deliberately absent: a subtitle such as "Save your changes, then
       submit again". It would be UNTRUE at the approver gates, where there is
       nothing to save. Writing no copy of our own is how the incomplete-vs-
       untrue test is met here.

     Dismissing it leaves nothing in the bar. The asterisks and the date
     inputs' `min` stay as cues, and Submit reopens the list. That leaves no
     cue for a present-but-early date (flag 51). No Escape, no focus
     management (flag 52). -->
{#if requirementsDialog}
	<div class="modal open">
		<div class="modal-content">
			<h3><i class="bi bi-exclamation-triangle"></i> {requirementsDialog.error}</h3>
			<div class="esig-error show">
				<ul>
					{#each requirementsDialog.issues as issue}
						<li>{issue}</li>
					{/each}
				</ul>
			</div>
			<div class="modal-actions">
				<button type="button" class="btn secondary" onclick={backFromDialog}>
					<i class="bi bi-arrow-left"></i> Back
				</button>
			</div>
		</div>
	</div>
{/if}
