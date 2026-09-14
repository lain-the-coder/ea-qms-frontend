<!--
	The change-control form (B5): one page for every state and every role.
	Step 7a renders it read-only.

	Markup from docs/prototypes/owner/cc-form-closed.html, the one prototype
	with every section populated. The other cc-form-* prototypes differ in which
	controls are enabled, in their info banner and in their action buttons.

	READ-ONLY MEANS `disabled`, NOT TEXT. Every field the Security Matrix can
	make editable is a real control, disabled through `editable()`. Step 7b
	turns `value=` into `bind:value=` and step 8 fills in `editable()`, so
	neither has to rewrite the markup. The thirteen system fields are never
	editable by anyone (CC ID, the approval By/On values, the statuses…), so
	they stay as the prototype's `.meta-value` text.

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
		type ChangeControlResponse,
		type DecisionRequest,
		type ESignatureCredentials,
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
	 * Whether the current user may edit this field of this record in its
	 * current state. Every control's `disabled` comes from here, so the
	 * Security Matrix lives in one function rather than in 34 attributes
	 * (decision 48).
	 *
	 * Always false at 7a. It takes only the field. The role, the state and the
	 * ownership comparison (`change_owner_id` against `auth.user.id`, never the
	 * name, A11) are read from component scope when it is implemented, so no
	 * call site changes.
	 */
	function editable(_field: EditableField): boolean {
		return false;
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
	 * With `editable()` false, no label has one at 7a. The prototypes star
	 * disabled fields, and this departs from them deliberately.
	 */
	function required(field: EditableField): boolean {
		return cc !== null && editable(field) && MANDATORY[cc.current_state].includes(field);
	}

	// ── The fetch ───────────────────────────────────────────────────────────

	let loading = $state(true);
	let error = $state<string | null>(null);
	let cc = $state<ChangeControlResponse | null>(null);
	let signatures = $state<SignatureItem[]>([]);
	let signaturesError = $state<string | null>(null);

	// Only the newest request may write the state, should a navigation to a
	// different CC-ID overlap a slow one.
	let latest = 0;

	async function load(id: string) {
		const mine = ++latest;
		loading = true;
		error = null;
		signaturesError = null;
		const path = `/changecontrols/${encodeURIComponent(id)}`;
		// Two independent reads, in parallel. The signature history is its own
		// endpoint, so it can fail on its own, and then only its card shows the
		// error.
		const [record, history] = await Promise.all([
			request<ChangeControlResponse>('GET', path),
			request<SignatureListResponse>('GET', `${path}/signatures`)
		]);
		if (mine !== latest) return;
		if (record.ok) {
			cc = record.data;
		} else {
			cc = null;
			error = record.error.error;
		}
		if (history.ok) {
			signatures = history.data.signatures;
		} else {
			signatures = [];
			signaturesError = history.error.error;
		}
		// A failed load is not "already loaded", so the next navigation to the
		// same CC-ID tries again (step 6's recovery pattern).
		if (!record.ok || !history.ok) lastId = null;
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
</script>

{#if loading}
	<p>Loading…</p>
{:else if cc}
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
				value={cc.change_title ?? ''}
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
				value={cc.change_description ?? ''}
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
					value={cc.change_type ?? ''}
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
					value={cc.change_category ?? ''}
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
					value={cc.department_function ?? ''}
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
				value={cc.affected_systems_modules ?? ''}
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
					value={dateInput(cc.proposed_implementation_date)}
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
					value={dateInput(cc.target_closure_date)}
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
					value={timeInput(cc.implementation_window_start)}
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
					value={timeInput(cc.implementation_window_end)}
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
				value={cc.reason_for_change ?? ''}
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
				value={cc.business_impact ?? ''}
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
					value={cc.expected_downtime ?? ''}
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
					value={cc.requires_testing ?? ''}
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
					value={cc.requires_training ?? ''}
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
				value={cc.risk_rationale ?? ''}
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
				value={cc.key_risks_mitigations ?? ''}
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
				value={cc.high_level_implementation_plan ?? ''}
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
				value={cc.validation_approach ?? ''}
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
				value={cc.success_criteria ?? ''}
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
				value={cc.rollback_backout_plan ?? ''}
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
			<!-- The value is the id and the label is the name (A11). At 7a the
			     only option is the current assignee. When the list comes from
			     `GET /approvers`, it must still include the current assignee,
			     who may since have been deactivated. -->
			<select
				id="assigned_approver_id"
				class="form-control"
				disabled={!editable('assigned_approver_id')}
				value={cc.assigned_approver_id ?? ''}
			>
				<option value="">Select Approver</option>
				{#if cc.assigned_approver_id !== null}
					<option value={cc.assigned_approver_id}>{cc.assigned_approver_name}</option>
				{/if}
			</select>
		</div>

		<div class="form-group">
			<label for="comments_for_approver">Comments for Approver</label>
			<textarea
				id="comments_for_approver"
				class="form-control"
				rows="3"
				disabled={!editable('comments_for_approver')}
				value={cc.comments_for_approver ?? ''}
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
				value={cc.comments ?? ''}
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
<!-- Back to List only. Save Draft, Submit, Cancel and the decisions arrive at
     steps 7c, 9, 10, 11 and 13. -->
<div class="form-actions">
	<div class="actions-left">
		<a href="/change-controls" class="btn secondary">
			<i class="bi bi-arrow-left"></i> Back to List
		</a>
	</div>

	<div class="actions-right"></div>
</div>
