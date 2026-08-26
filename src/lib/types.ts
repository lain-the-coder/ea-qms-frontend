/**
 * The API contract, transcribed from `docs/openapi.yaml` (`components/schemas`).
 *
 * Written from the specification, not from observed responses — the spec records
 * which fields are nullable and a sample response does not. Names match the spec's
 * schema names exactly, so any type here can be looked up in `openapi.yaml`
 * without a translation table.
 *
 * Two rules govern the whole file:
 *
 * 1. READ types have every field present; `null` means empty.
 *    WRITE types have every field optional; an absent key means "leave it alone".
 *    The `?` IS the absent case — see `SaveDraftRequest`.
 *
 * 2. Enum members are ASCII hyphens (`-`, U+002D), never en-dashes (`–`, U+2013).
 *    The BRD and the HTML prototypes render six values with an en-dash and the
 *    database CHECK constraint rejects it. Blueprint A4.
 *
 * Free text is capped at 2000 characters unless noted; the exceptions are
 * `change_title` (200), `affected_systems_modules` (500), `cancellation_reason`
 * (500) and `full_name` (100).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Enums
//
// Each is an `as const` array with its union derived from it. The array is what
// the `<select>` blocks iterate, so every enum string exists in exactly one place
// in the codebase — which is the defence against the en-dash trap above.
// ─────────────────────────────────────────────────────────────────────────────

export const STATES = [
	'Initiated',
	'Pending Implementation Approval',
	'In Implementation',
	'Pending Final Approval',
	'Closed',
	'Cancelled'
] as const;
export type State = (typeof STATES)[number];

/** A user holds exactly one role. */
export const ROLES = ['Admin', 'CC Owner', 'Approver', 'Viewer'] as const;
export type Role = (typeof ROLES)[number];

export const APPROVAL_STATUSES = ['Not Submitted', 'Pending', 'Approved', 'N/A'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

/** Imperative, not past tense — `Approve`, not `Approved`. */
export const DECISIONS = ['Approve', 'Reject'] as const;
export type Decision = (typeof DECISIONS)[number];

export const RISK_LEVELS = ['Low', 'Medium', 'High'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const CHANGE_TYPES = [
	'Application',
	'Infrastructure',
	'Database',
	'Security',
	'Network',
	'Hardware',
	'Process',
	'Other'
] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

export const CHANGE_CATEGORIES = ['Normal', 'Standard'] as const;
export type ChangeCategory = (typeof CHANGE_CATEGORIES)[number];

export const DEPARTMENT_FUNCTIONS = [
	'IT',
	'Operations',
	'Security',
	'QA',
	'Facilities',
	'Other'
] as const;
export type DepartmentFunction = (typeof DEPARTMENT_FUNCTIONS)[number];

export const EXPECTED_DOWNTIME = ['Yes', 'No', 'Unknown'] as const;
export type ExpectedDowntime = (typeof EXPECTED_DOWNTIME)[number];

/** ⚠️ ASCII hyphen in the first two members, not an en-dash. */
export const REQUIRES_TESTING = ['Yes - Full testing', 'Yes - Partial testing', 'No'] as const;
export type RequiresTesting = (typeof REQUIRES_TESTING)[number];

export const REQUIRES_TRAINING = ['Yes', 'No', 'Not applicable'] as const;
export type RequiresTraining = (typeof REQUIRES_TRAINING)[number];

/** A dropdown, not free text. ⚠️ ASCII hyphen in `follow-up`. */
export const POST_IMPLEMENTATION_ISSUES = [
	'None',
	'Minor issues resolved',
	'Issues requiring follow-up'
] as const;
export type PostImplementationIssues = (typeof POST_IMPLEMENTATION_ISSUES)[number];

/** T1 is record creation — it needs no signature and never appears in the table. */
export const TRANSITIONS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'] as const;
export type Transition = (typeof TRANSITIONS)[number];

/** ⚠️ ASCII hyphen in the four gate meanings. */
export const SIGNATURE_MEANINGS = [
	'Submitted for Implementation Approval',
	'Cancelled',
	'Approved - Implementation Approval',
	'Rejected - Implementation Approval',
	'Submitted for Final Approval',
	'Approved - Final Approval',
	'Rejected - Final Approval'
] as const;
export type SignatureMeaning = (typeof SIGNATURE_MEANINGS)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export interface ErrorResponse {
	error: string;
}

/**
 * Returned when several things are wrong at once — all failures are collected,
 * rather than stopping at the first.
 *
 * ⚠️ FOUR endpoints return this, not "the transitions":
 *
 *   - the two save endpoints — keys not editable in the current state
 *   - **T2 and T6 only** — the two *submit* transitions: missing mandatory
 *     fields, failed date rules
 *
 * Cancel, decision and final-decision fail on the **first** problem with a plain
 * `ErrorResponse`. That is deliberate, not an oversight: they validate a small
 * request body the user just typed, where one message points at one field. T2
 * and T6 validate stored state across twenty-odd fields, where stopping at the
 * first would mean twenty round trips.
 *
 * Confirmed in the handlers — only `HandlerSubmitForImplApproval` and
 * `HandlerSubmitForFinalApproval` declare an issues array
 * (`handlers_workflow.go:22, 862`).
 */
export interface ValidationErrorResponse {
	error: string;
	issues: string[];
}

/**
 * 409 from `PUT /users/{userID}` and `PUT /users/{userID}/active` when the user
 * is CC Owner or assigned Approver on active records. The request is
 * all-or-nothing: a name change submitted alongside a blocked role change is
 * rejected too.
 */
export interface BlockedRoleChangeResponse {
	error: string;
	blocked_cc_ids: string[];
}

/**
 * Every error body the API can produce. All three members must be here or the
 * third is unreachable without a cast — which is what `blocked_cc_ids` was.
 *
 * Narrow with two independent `in` checks, not a chain:
 *
 * ```ts
 * if ('issues' in err) …             // ValidationErrorResponse
 * else if ('blocked_cc_ids' in err) … // BlockedRoleChangeResponse
 * else …                              // ErrorResponse — `error` alone
 * ```
 *
 * The two discriminating keys are disjoint, so order does not matter and
 * `ErrorResponse` is simply what is left. No cast needed.
 */
export type ErrorBody = ErrorResponse | ValidationErrorResponse | BlockedRoleChangeResponse;

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export interface LoginRequest {
	email: string;
	/** Never trimmed — leading and trailing whitespace are significant. */
	password: string;
}

export interface LoginResponse {
	id: string;
	full_name: string;
	email: string;
	role: Role;
	/** JWT access token, valid 30 minutes. Memory only — never localStorage. */
	token: string;
	/**
	 * Opaque 256-bit token: 24 hours absolute, with a 2-hour sliding inactivity
	 * window. It is NOT rotated on refresh, so the stored value stays valid.
	 */
	refresh_token: string;
}

/**
 * The body of **both** `POST /refresh` and `POST /revoke` — the spec points the
 * revoke endpoint at this same schema (`openapi.yaml:1054`), so there is no
 * `RevokeRequest` to transcribe.
 *
 * Revoke is idempotent: 204 whether the token was valid, already revoked or
 * never existed, and it carries no `Authorization` header (`security: []`).
 * Clear local state on any outcome, including a network failure.
 */
export interface RefreshRequest {
	refresh_token: string;
}

export interface RefreshResponse {
	/** A new access token. The refresh token is unchanged. */
	token: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────────────────

/*
 * ⚠️ THREE shapes, not one. The Go handlers build a separate struct per
 * endpoint, and no endpoint returns both timestamps:
 *
 *   MeResponse          GET /me                     4 fields, no timestamp
 *   UserResponse        POST /users, GET /users     + is_active, created_on
 *   UserStatusResponse  the two PUT /users/{id}     + is_active, updated_on
 *
 * Merging them would make `created_on` typed-but-undefined after a status
 * change, and `is_active` typed-but-undefined on `/me`.
 */

/** `GET /me`. No `is_active`, no timestamp. This is what the auth store holds. */
export interface MeResponse {
	id: string;
	full_name: string;
	email: string;
	role: Role;
}

/** `POST /users` and the rows of `GET /users`. No `updated_on`. */
export interface UserResponse {
	id: string;
	full_name: string;
	email: string;
	role: Role;
	is_active: boolean;
	created_on: string;
}

/**
 * Both `PUT /users/{userID}` and `PUT /users/{userID}/active`. No `created_on` —
 * so a table row refreshed from this response must be **merged** into the
 * existing row, not replaced, or the created date is lost from the UI.
 */
export interface UserStatusResponse {
	id: string;
	full_name: string;
	email: string;
	role: Role;
	is_active: boolean;
	updated_on: string;
}

/** Minimal shape for the approver dropdown — active Approvers only. */
export interface ApproverRef {
	id: string;
	full_name: string;
}

/**
 * `GET /approvers`. The array is wrapped in an object, not returned bare.
 *
 * ⚠️ **Not paginated** — `users.sql:29-32` has no `LIMIT`, so this returns every
 * active approver in one response. There is no `total`, no `limit`, no `offset`;
 * sending them is ignored rather than an error. Render the whole array.
 *
 * Sorted **`full_name` ascending** — alphabetical, the opposite direction from
 * the change-control list's `last_updated_on DESC`. No sort parameter exists.
 */
export interface ListApproversResponse {
	approvers: ApproverRef[];
}

export interface CreateUserRequest {
	full_name: string;
	email: string;
	/**
	 * Minimum 8 characters with at least one lowercase letter, one uppercase
	 * letter, one digit and one special character.
	 *
	 * ⚠️ Every unmet requirement is reported, but **joined into the single
	 * `error` string** — `"Password must contain at least 1 uppercase letter, at
	 * least 1 digit"`. There is **no `issues` array**: this is a plain
	 * `ErrorResponse`, so render `error` as it arrives and do not try to
	 * iterate. `handlers_users.go:78-82`, joining `validatePassword`'s slice
	 * with `strings.Join(problems, ", ")`.
	 */
	password: string;
	role: Role;
}

/**
 * Both fields optional, but at least one must be present. All-or-nothing: if the
 * role change is blocked, the name change is not saved either.
 */
export interface UpdateUserRequest {
	full_name?: string;
	role?: Role;
}

export interface SetUserActiveRequest {
	is_active: boolean;
}

export interface UserListResponse {
	users: UserResponse[];
	/** Total matching the filter, ignoring pagination. */
	total: number;
	limit: number;
	offset: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Change controls
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attachment metadata. The bytes are never included — fetch them from
 * `GET /changecontrols/{ccID}/files/{fieldName}`.
 */
export interface FileRef {
	file_name: string;
	/** Bytes. Format for display client-side. */
	file_size: number;
	content_type: string;
	uploaded_on: string;
}

/** The 10-field row shape used by the list endpoint. */
export interface ChangeControlSummary {
	id: string;
	cc_id: string;
	/** Null on a draft created but not yet named. */
	change_title: string | null;
	current_state: State;
	change_owner_id: string;
	change_owner_name: string;
	assigned_approver_id: string | null;
	assigned_approver_name: string | null;
	created_on: string;
	last_updated_on: string;
}

/**
 * READ — the full record. Returned by `GET /changecontrols/{ccID}`, both save
 * endpoints and every transition, all with an identical shape, so one parser
 * covers all four.
 *
 * IDs are paired with display names: compare on the **id**
 * (`change_owner_id === auth.user.id` decides whether a button renders) and
 * render the **name**.
 */
export interface ChangeControlResponse {
	// Identification — BRD 1–6
	id: string;
	/** The business key, `CC-001`. This is what goes in the URL, not `id`. */
	cc_id: string;
	current_state: State;
	change_owner_id: string;
	change_owner_name: string;
	/** Whoever last touched the record — not necessarily the owner. After a
	 *  rejection this is the approver. */
	last_updated_by_id: string;
	last_updated_by_name: string;
	created_on: string;
	last_updated_on: string;

	// Change definition — BRD 7–12
	change_title: string | null;
	change_description: string | null;
	change_type: ChangeType | null;
	change_category: ChangeCategory | null;
	department_function: DepartmentFunction | null;
	affected_systems_modules: string | null;

	// Planning — BRD 13–16
	/** DATE column — midnight UTC. Must be ≥ 2 business days out at T2. */
	proposed_implementation_date: string | null;
	/** DATE column. Must be ≥ 10 business days out at T2. */
	target_closure_date: string | null;
	/**
	 * TIME column — comes back as `0000-01-01T09:00:00Z`. The date portion is a
	 * placeholder: strip it for display and send the same format back.
	 */
	implementation_window_start: string | null;
	implementation_window_end: string | null;

	// Impact & risk — BRD 17–23
	reason_for_change: string | null;
	business_impact: string | null;
	expected_downtime: ExpectedDowntime | null;
	requires_testing: RequiresTesting | null;
	requires_training: RequiresTraining | null;
	/** The owner's rationale — distinct from `risk_level`, which the approver sets. */
	risk_rationale: string | null;
	key_risks_mitigations: string | null;

	// Implementation plan — BRD 25–28
	high_level_implementation_plan: string | null;
	validation_approach: string | null;
	success_criteria: string | null;
	rollback_backout_plan: string | null;

	// Implementation details — BRD 29–34
	/** Retrospective. Any value is accepted at save; T6 rejects a future date. */
	actual_implementation_date: string | null;
	post_implementation_issues: PostImplementationIssues | null;
	implementation_summary: string | null;
	/** The only optional field in this group. */
	deviations_from_plan: string | null;
	validation_performed: string | null;
	/** Metadata only, `null` until a file is uploaded. Mandatory at T6. */
	implementation_evidence: FileRef | null;

	// Approvals — initiation — BRD 35–36
	assigned_approver_id: string | null;
	assigned_approver_name: string | null;
	comments_for_approver: string | null;

	// Implementation approval — BRD 37–41
	decision: Decision | null;
	risk_level: RiskLevel | null;
	decision_comments: string | null;
	/** Populated on approve only — stays null after a rejection. */
	implementation_approval_by_id: string | null;
	implementation_approval_by_name: string | null;
	implementation_approval_on: string | null;

	// Final approval — BRD 42–45
	final_decision: Decision | null;
	final_comments: string | null;
	/** Populated on approve only. */
	final_approval_by_id: string | null;
	final_approval_by_name: string | null;
	final_approval_on: string | null;

	// Status — BRD 46–48
	implementation_approval_status: ApprovalStatus;
	final_approval_status: ApprovalStatus;
	/** System-set on T7 only. Identical to `final_approval_on`. */
	actual_closure_date: string | null;

	// Additional — BRD 49–50
	comments: string | null;
	/**
	 * Written only by `POST /{ccID}/cancel`. Never editable through a save
	 * endpoint, and permanently read-only once set.
	 */
	cancellation_reason: string | null;
}

/**
 * Deliberately minimal — the eleven fields needed to render a fresh empty form.
 * This is NOT a truncated `ChangeControlResponse`; do not treat it as one.
 */
export interface CreateChangeControlResponse {
	id: string;
	cc_id: string;
	current_state: State;
	change_owner_id: string;
	change_owner_name: string;
	/** The creating owner — nobody else has touched the record yet. */
	last_updated_by_id: string;
	last_updated_by_name: string;
	implementation_approval_status: ApprovalStatus;
	final_approval_status: ApprovalStatus;
	created_on: string;
	last_updated_on: string;
}

export interface ChangeControlListResponse {
	change_controls: ChangeControlSummary[];
	total: number;
	limit: number;
	offset: number;
}

/**
 * WRITE — partial update, RFC 7386 semantics. Every key is optional, and that
 * `?` is the whole point:
 *
 * | You send            | Result                                        |
 * |---------------------|-----------------------------------------------|
 * | key absent          | unchanged                                     |
 * | `"field": null`     | cleared                                       |
 * | `"field": "value"`  | set                                           |
 * | `"field": ""`       | cleared — TEXT ONLY, a parse error on dates    |
 *
 * Only these 24 fields are accepted. Any other key returns 400 listing every
 * offending key, and nothing is written — which is what would happen if a body
 * were built from a `ChangeControlResponse` instead of this type.
 *
 * No presence validation: a draft may be saved empty. Format is validated —
 * length, enum membership, JSON type.
 */
export interface SaveDraftRequest {
	change_title?: string | null;
	change_description?: string | null;
	change_type?: ChangeType | null;
	change_category?: ChangeCategory | null;
	department_function?: DepartmentFunction | null;
	affected_systems_modules?: string | null;

	// ⚠️⚠️ The next four are the DATE and TIME fields, and they take **RFC 3339
	//    only** — NOT `YYYY-MM-DD`, which is exactly what `<input type="date">`
	//    produces. The handler unmarshals each into a Go `*time.Time`
	//    (`handlers_cc.go:764-768`), so `"2026-09-01"` is rejected with the same
	//    400 as `''`. Send `"2026-09-01T00:00:00Z"`; a TIME field goes back in
	//    the placeholder form it arrived in, `"0000-01-01T09:00:00Z"`.
	//
	//    To clear one, send `null`. `''` clears a text field but is a PARSE
	//    ERROR here — blueprint A5.1.
	//
	//    ⚠️ The list filters take the OTHER format: `created_after` and
	//    `created_before` in `ChangeControlListParams` are `YYYY-MM-DD` and
	//    reject a full timestamp. Two date formats in one API — the direction of
	//    travel is what decides which.
	proposed_implementation_date?: string | null;
	target_closure_date?: string | null;
	implementation_window_start?: string | null;
	implementation_window_end?: string | null;

	reason_for_change?: string | null;
	business_impact?: string | null;
	expected_downtime?: ExpectedDowntime | null;
	requires_testing?: RequiresTesting | null;
	requires_training?: RequiresTraining | null;
	risk_rationale?: string | null;
	key_risks_mitigations?: string | null;
	high_level_implementation_plan?: string | null;
	validation_approach?: string | null;
	success_criteria?: string | null;
	rollback_backout_plan?: string | null;
	/** Must be an active user holding the Approver role — source `GET /approvers`. */
	assigned_approver_id?: string | null;
	comments_for_approver?: string | null;
	comments?: string | null;
}

/**
 * WRITE — the five fields editable in `In Implementation`. Same partial-update
 * semantics as `SaveDraftRequest`; any other key returns 400.
 *
 * The evidence file is uploaded separately, as multipart.
 */
export interface SaveImplementationRequest {
	/**
	 * ⚠️⚠️ A DATE field taking **RFC 3339**, not `YYYY-MM-DD` — the same trap as
	 * the four in `SaveDraftRequest`, in the one field a user reaches through a
	 * date picker in `In Implementation`. `handlers_cc.go:1428-1435` unmarshals
	 * into `*time.Time`, so `"2026-09-01"` is a 400. Send
	 * `"2026-09-01T00:00:00Z"`.
	 *
	 * Clear it with `null`, never `''` — an empty string is a parse error here
	 * as it is there.
	 *
	 * Any date is accepted at save; T6 is what rejects a future one.
	 */
	actual_implementation_date?: string | null;
	post_implementation_issues?: PostImplementationIssues | null;
	implementation_summary?: string | null;
	deviations_from_plan?: string | null;
	validation_performed?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Signatures
//
// Transitions carry NO field values — they validate what is already stored, so
// the form must be saved first. Blueprint A2.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Required by every transition. The email must match the logged-in user
 * (BR-8.8.3) — signing on behalf of someone else is rejected even with valid
 * credentials. The comparison is case-insensitive.
 *
 * A failed signature returns 401, writes a `SignatureFailed` audit row and
 * leaves the record untouched, so it is safe to retry.
 */
export interface ESignatureCredentials {
	email: string;
	password: string;
}

/** T2 and T6. Credentials only — no field values. */
export type SubmitRequest = ESignatureCredentials;

/** T3. The one transition that collects a reason and credentials together. */
export interface CancelRequest extends ESignatureCredentials {
	/** Mandatory, not whitespace-only, ≤500. Permanently read-only once saved. */
	cancellation_reason: string;
}

/** T4 / T5 — the implementation gate. All three fields are mandatory. */
export interface DecisionRequest extends ESignatureCredentials {
	decision: Decision;
	risk_level: RiskLevel;
	/** Mandatory on both paths — there is no separate rejection field. */
	decision_comments: string;
}

/** T7 / T8 — the final gate. No `risk_level`: that belongs to the first gate. */
export interface FinalDecisionRequest extends ESignatureCredentials {
	final_decision: Decision;
	final_comments: string;
}

export interface SignatureItem {
	transition: Transition;
	meaning: SignatureMeaning;
	/** Snapshot captured at signing (BR-8.8.5), not a live join — renaming a user
	 *  does not rewrite their past signatures. */
	signer_name: string;
	signed_on: string;
}

/**
 * `GET /changecontrols/{ccID}/signatures`.
 *
 * ⚠️ **Not paginated** — `esignatures.sql:6-10` has no `LIMIT`: a complete
 * history is never truncated. Sorted **`signed_on` ascending**, oldest first, so
 * the panel reads top-to-bottom in the order things happened. Do not reverse it.
 *
 * An empty array is a legitimate answer — a record in `Initiated` has none,
 * since T1 requires no signature.
 */
export interface SignatureListResponse {
	signatures: SignatureItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Files
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The spec defines this as its own schema with properties identical to
 * `FileRef`. Aliased rather than duplicated; if the two ever diverge, this
 * becomes its own interface.
 *
 * Upload is PDF only, 10 MB max, in a part named `file`, and returns 200 rather
 * than 201 because the endpoint cannot tell a create from a replace.
 */
export type FileUploadResponse = FileRef;

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * System-wide counts. All five keys are always present, reporting `0` where no
 * records exist — so a card never has to handle a missing key. `Cancelled` is
 * deliberately excluded (BRD §9.5.2 lists five active states) even though
 * cancelled records do appear in recent activity.
 */
export interface DashboardOverview {
	initiated: number;
	pending_implementation_approval: number;
	in_implementation: number;
	pending_final_approval: number;
	closed: number;
}

export interface DashboardCCItem {
	cc_id: string;
	change_title: string | null;
	current_state: State;
}

export interface DashboardActivityItem {
	cc_id: string;
	change_title: string | null;
	current_state: State;
	last_updated_on: string;
	last_updated_by_name: string;
}

/**
 * The whole landing page in one call.
 *
 * The lists are capped and the totals are not — three drafts returns
 * `my_drafts_total: 3` alongside two items. That gap is what lets a card show
 * "3" above two rows; do not render the count from `my_drafts.length`.
 */
export interface DashboardResponse {
	overview: DashboardOverview;
	/**
	 * Assigned to the caller, in either pending state — so the list mixes gates
	 * and each row needs its own badge from `current_state`. Max 2 items.
	 */
	pending_approvals: DashboardCCItem[];
	pending_approvals_total: number;
	/** Owned by the caller, in `Initiated`. Max 2 items. */
	my_drafts: DashboardCCItem[];
	my_drafts_total: number;
	/** System-wide, most recent first, includes cancelled records. Max 5 items. */
	recent_activity: DashboardActivityItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Query parameters
//
// Inline `parameters` in the spec rather than named schemas, but part of the
// contract all the same. `limit` defaults to 50 and `offset` to 0; reset
// `offset` to 0 whenever a filter changes or the page may come back empty.
//
// ⚠️ `limit`'s ceiling is **200, not 100** (`maxPageLimit`, `helpers.go:23`),
//    and the server **CLAMPS silently rather than rejecting**
//    (`helpers.go:98-99`): ask for 500 and you get 200 rows back, 200 OK, with
//    nothing saying you were capped. Only `limit < 1` or a non-integer is a 400.
//
//    So the page size a request asked for cannot be assumed to be the page size
//    it got — read `limit` back off the response (both list responses carry it)
//    before computing "page N of M", or the arithmetic silently goes wrong for
//    anyone who hand-edits the URL.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `GET /changecontrols`. All filters are optional and combine with AND.
 *
 * Sorted **`last_updated_on` DESC** in SQL, with no sort parameter — column
 * headers are not sortable. Note `GET /users` sorts the *other* way,
 * `full_name` ASC.
 */
export interface ChangeControlListParams {
	limit?: number;
	offset?: number;
	/** A flag, not a UUID — the server resolves `me` from the token, so no user
	 *  ID ever appears in a URL. */
	owner?: 'me';
	/** `me` for records where the caller is the assigned approver. */
	assigned?: 'me';
	/** Exact match on ONE state. For "either pending state", use the dashboard's
	 *  `pending_approvals` block, which is purpose-built for it. */
	state?: State;
	/**
	 * ⚠️ `YYYY-MM-DD` — the **opposite** of every date *write* field, which take
	 * RFC 3339. `handlers_cc.go:373` parses this with the layout `2006-01-02`,
	 * so a full timestamp is a 400 here just as a bare date is a 400 in
	 * `SaveDraftRequest`. One file, two formats, in opposite directions.
	 *
	 * Inclusive.
	 */
	created_after?: string;
	/** `YYYY-MM-DD` as `created_after` (`handlers_cc.go:383`). Inclusive of the
	 *  whole day. */
	created_before?: string;
	/** Case-insensitive substring across CC-ID, change title and owner name —
	 *  not the description or any other field. */
	search?: string;
}

/**
 * `GET /users`. Admin only. Omit `active` for all users.
 *
 * Sorted **`full_name` ASC** (`users.sql:22` — bare `ORDER BY full_name`, so
 * ascending), not `last_updated_on DESC` like the change-control list. No sort
 * parameter either way.
 */
export interface UserListParams {
	limit?: number;
	offset?: number;
	/**
	 * ⚠️ `active`, NOT `is_active` — the response field is `is_active` but the
	 * query parameter is not. An unrecognised parameter is ignored silently, so
	 * `?is_active=true` returns every user with no error at all.
	 */
	active?: boolean;
}
