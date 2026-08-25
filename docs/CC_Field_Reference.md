# EAMI QMS Change Control — Field Reference (Condensed)

**Source:** BRD V1.2, Appendix D (all 50 fields read in full).
**Purpose:** Single working reference for the Postgres schema and the Go validators. Replaces the need to re-read Appendix D.
**Revision:** V1.2 — aligned with the built backend. Changes are marked ⬥ below.

**Legend for "Mandatory":**
- `SYS` = system-generated, no user input, never validated
- `T2` = required at **Submit for Approval** (Initiated → Pending Impl Approval)
- `T3` = required at **Cancel**
- `T4/T5` = required at **Submit Decision** (Implementation Approval gate)
- `T6` = required at **Submit for Final Approval**
- `T7/T8` = required at **Submit Decision** (Final Approval gate)
- `—` = optional, never blocks a transition

---

## Group 1 — Identification (Fields 1–6) · ALL SYSTEM-GENERATED

| # | field_id | Type | Mandatory | Max | Valid Values / Rules |
|---|----------|------|-----------|-----|----------------------|
| 1 | `cc_id` | text | SYS | 10 | Format `CC-XXX`. **Unique.** Sequential. Immutable after creation. |
| 2 | `current_state` | text | SYS | 50 | One of 6: `Initiated`, `Pending Implementation Approval`, `In Implementation`, `Pending Final Approval`, `Closed`, `Cancelled`. Default `Initiated`. |
| 3 | `change_owner` | FK → user | SYS | — | Set from creator's identity. **Immutable.** No manual dropdown. |
| 4 | `last_updated_by` | FK → user | SYS | — | Updated on every save / submit / workflow action. |
| 5 | `created_on` | timestamp | SYS | — | Set once at creation. **Immutable.** |
| 6 | `last_updated_on` | timestamp | SYS | — | Updated on every save / submit / action. Always ≥ `created_on`. |

---

## Group 2 — Change Definition (Fields 7–12) · CC Owner, Initiated only

| # | field_id | Type | Mandatory | Max | Valid Values / Rules |
|---|----------|------|-----------|-----|----------------------|
| 7 | `change_title` | text | **T2** | 200 | Not empty/whitespace. |
| 8 | `change_description` | textarea | **T2** | 2000 | Not empty/whitespace. |
| 9 | `change_type` | dropdown | **T2** | 50 | `Application` · `Infrastructure` · `Database` · `Security` · `Network` · `Hardware` · `Process` · `Other` |
| 10 | `change_category` | dropdown | **T2** | 20 | `Normal` · `Standard` — ⚠️ **"Emergency" deliberately excluded** (Phase 1, L1) |
| 11 | `department_function` | dropdown | **T2** | 50 | `IT` · `Operations` · `Security` · `QA` · `Facilities` · `Other` |
| 12 | `affected_systems_modules` | text | **T2** | 500 | Not empty/whitespace. |

---

## Group 3 — Planning (Fields 13–16) · CC Owner, Initiated only

| # | field_id | Type | Mandatory | Max | Valid Values / Rules |
|---|----------|------|-----------|-----|----------------------|
| 13 | `proposed_implementation_date` | date | **T2** | — | ≥ **2 business days** from today AND **must be in the future at submission**. Re-validated if user corrects a stale date. Business days = weekdays only (no public holidays in Phase 1). ⬥ Computed in **UTC** (BRD §13.1 L13). 🔒 **Audit-tracked** (BRD §6.6.2). |
| 14 | `target_closure_date` | date | **T2** | — | ≥ **10 business days** from today AND **must be in the future at submission**. Same re-validation rule. Editable whenever state = Initiated (incl. after rejection) — ⬥ BRD SC-6's "locked after initial submission" clause was removed in V1.2 as it contradicted this. ⬥ Computed in **UTC**. 🔒 **Audit-tracked** (BRD §6.6.2). |
| 15 | `implementation_window_start` | time | — | — | Optional. **No cross-field validation vs. End in Phase 1.** |
| 16 | `implementation_window_end` | time | — | — | Optional. Same. |

---

## Group 4 — Impact & Risk Assessment (Fields 17–24) · CC Owner, Initiated only

| # | field_id | Type | Mandatory | Max | Valid Values / Rules |
|---|----------|------|-----------|-----|----------------------|
| 17 | `reason_for_change` | textarea | **T2** | 2000 | Not empty/whitespace. |
| 18 | `business_impact` | textarea | **T2** | 2000 | Not empty/whitespace. |
| 19 | `expected_downtime` | dropdown | **T2** | 20 | `Yes` · `No` · `Unknown` |
| 20 | `requires_testing` | dropdown | **T2** | 50 | `Yes - Full testing` · `Yes - Partial testing` · `No` ⚠️ **ASCII HYPHEN — the BRD/HTML show an en-dash. See "Canonical String Values" below.** |
| 21 | `requires_training` | dropdown | **T2** | 30 | `Yes` · `No` · `Not applicable` |
| 22 | `risk_rationale` | textarea | **T2** | 2000 | Not empty/whitespace. ⚠️ This is the **Owner's** rationale — *not* the Risk Level (field 38, Approver-set). |
| 23 | `key_risks_mitigations` | textarea | **T2** | 2000 | Not empty/whitespace. |
| 24 | `supporting_documents` | file | — | 10 MB | ⬥ **NOT IMPLEMENTED IN PHASE 1** (BRD §13.1 L12). The schema and the `ck_file_attachments_field_name` CHECK permit it; the API whitelist does not. Optional when implemented. **Single file only** (replace on re-upload). |

---

## Group 5 — Implementation Plan & Validation (Fields 25–28) · CC Owner, Initiated only

| # | field_id | Type | Mandatory | Max | Valid Values / Rules |
|---|----------|------|-----------|-----|----------------------|
| 25 | `high_level_implementation_plan` | textarea | **T2** | 2000 | Not empty/whitespace. |
| 26 | `validation_approach` | textarea | **T2** | 2000 | Not empty/whitespace. |
| 27 | `success_criteria` | textarea | **T2** | 2000 | Not empty/whitespace. |
| 28 | `rollback_backout_plan` | textarea | **T2** | 2000 | Not empty/whitespace. |

---

## Group 6 — Implementation Details (Fields 29–34) · CC Owner, **In Implementation** only

⬥ Fields 29–33 are written by `PUT /api/changecontrols/{ccID}/implementation` — a save endpoint
added during implementation so the owner can save progress in this state, exactly as `Initiated`
allows. **T6 carries no field values**; it validates what is already stored. Field 34 is written
by the file upload endpoint.

| # | field_id | Type | Mandatory | Max | Valid Values / Rules |
|---|----------|------|-----------|-----|----------------------|
| 29 | `actual_implementation_date` | date | **T6** | — | Retrospective date — **no minimum lead-time rule.** ⬥ **Must not be in the future**, validated at **T6 only**: the save endpoint accepts any date, so an owner can draft on Monday for work scheduled Wednesday. Computed in **UTC**. |
| 30 | `post_implementation_issues` | dropdown | **T6** | 50 | `None` · `Minor issues resolved` · `Issues requiring follow-up` ⚠️ **DROPDOWN, not textarea** |
| 31 | `implementation_summary` | textarea | **T6** | 2000 | Not empty/whitespace. |
| 32 | `deviations_from_plan` | textarea | — | 2000 | **Optional.** |
| 33 | `validation_performed` | textarea | **T6** | 2000 | Not empty/whitespace. |
| 34 | `implementation_evidence` | file | **T6** | 10 MB | **Mandatory at T6** — file must exist or submission is blocked. ⬥ **PDF only** (BRD BR-8.2.13 as amended in V1.2); type verified by inspecting file contents, not the extension or the declared content type. Single file only (replace on re-upload). |

---

## Group 7 — Approvals: Initiation (Fields 35–36) · CC Owner, Initiated only

| # | field_id | Type | Mandatory | Max | Valid Values / Rules |
|---|----------|------|-----------|-----|----------------------|
| 35 | `assign_approver` | FK → user | **T2** | — | Dropdown populated **only with users holding the `Approver` role**. Owner can never appear (single-role model). 🔒 **Audit-tracked.** |
| 36 | `comments_for_approver` | textarea | — | 2000 | **Optional.** |

---

## Group 8 — Approvals: Implementation Approval (Fields 37–41) · Approver, Pending Impl Approval

| # | field_id | Type | Mandatory | Max | Valid Values / Rules |
|---|----------|------|-----------|-----|----------------------|
| 37 | `decision` | dropdown | **T4/T5** | 10 | `Approve` · `Reject` — **drives the transition.** Overwritten on re-review (old value → audit). 🔒 **Audit-tracked.** |
| 38 | `risk_level` | dropdown | **T4/T5** | 10 | `Low` · `Medium` · `High` — **Approver-set only, never the Owner.** 🔒 **Audit-tracked.** |
| 39 | `decision_comments` | textarea | **T4/T5** | 2000 | Not empty/whitespace. Used for **both** Approve and Reject (no separate rejection field). 🔒 **Audit-tracked.** |
| 40 | `implementation_approval_by` | FK → user | SYS | — | ⚠️ Populated **on Approve ONLY** — never on Reject. |
| 41 | `implementation_approval_on` | timestamp | SYS | — | ⚠️ Populated **on Approve ONLY** — never on Reject. |

---

## Group 9 — Approvals: Final Approval (Fields 42–45) · Approver, Pending Final Approval

| # | field_id | Type | Mandatory | Max | Valid Values / Rules |
|---|----------|------|-----------|-----|----------------------|
| 42 | `final_decision` | dropdown | **T7/T8** | 10 | `Approve` · `Reject` — **drives the transition.** Overwritten on re-review. 🔒 **Audit-tracked.** |
| 43 | `final_comments` | textarea | **T7/T8** | 2000 | Not empty/whitespace. Used for **both** Approve and Reject. 🔒 **Audit-tracked.** |
| 44 | `final_approval_by` | FK → user | SYS | — | ⚠️ Populated **on Approve ONLY** — never on Reject. |
| 45 | `final_approval_on` | timestamp | SYS | — | ⚠️ Populated **on Approve ONLY** — never on Reject. |

---

## Group 10 — Approvals: Status (Fields 46–48) · ALL SYSTEM-GENERATED

| # | field_id | Type | Mandatory | Max | Valid Values / Rules |
|---|----------|------|-----------|-----|----------------------|
| 46 | `implementation_approval_status` | text | SYS | 20 | `Not Submitted` · `Pending` · `Approved` · `N/A` — **derived from state, see mapping below.** Default `Not Submitted`. |
| 47 | `final_approval_status` | text | SYS | 20 | Same 4 values — **derived from state, see mapping below.** Default `Not Submitted`. |
| 48 | `actual_closure_date` | timestamp | SYS | — | Set **only** on T7 (Final Approve → Closed). **Never** set for Cancelled. |

### Status derivation by state (exact — do not improvise)

| State | `implementation_approval_status` | `final_approval_status` |
|---|---|---|
| Initiated | `Not Submitted` | `Not Submitted` |
| Pending Implementation Approval | `Pending` | `Not Submitted` |
| In Implementation | `Approved` | `Not Submitted` |
| Pending Final Approval | `Approved` | `Pending` |
| Closed | `Approved` | `Approved` |
| Cancelled | `N/A` | `N/A` |

⚠️ Exact string is **`Not Submitted`** — not "Not Yet Submitted".

---

## Group 11 — Additional Information (Fields 49–50)

| # | field_id | Type | Mandatory | Max | Valid Values / Rules |
|---|----------|------|-----------|-----|----------------------|
| 49 | `comments` | textarea | — | 2000 | **Optional.** CC Owner, Initiated. Always visible. |
| 50 | `cancellation_reason` | textarea | **T3** | **500** | Not empty/whitespace. ⚠️ **Captured via cancellation modal only — never an inline form field.** Permanently read-only once saved. Hidden in all states except Cancelled. 🔒 **Audit-tracked.** |

---

# ⚠️ CANONICAL STRING VALUES — READ BEFORE WRITING ANY CODE

**The BRD (V1.1 and V1.2) and the HTML prototypes contain EN-DASHES (–, U+2013) in six enum values.**
**The implementation uses ASCII HYPHENS (-, U+002D). This document is the authority.**

### Root cause
Microsoft Word's AutoCorrect silently converts `word - word` → `word – word`. The en-dashes were never intentional.

### The six affected values

| Where | BRD / HTML says (WRONG for code) | Implementation MUST use |
|---|---|---|
| Field 20 `requires_testing` | `Yes – Full testing` | **`Yes - Full testing`** |
| Field 20 `requires_testing` | `Yes – Partial testing` | **`Yes - Partial testing`** |
| Signature meaning (BR-8.8.4) | `Approved – Implementation Approval` | **`Approved - Implementation Approval`** |
| Signature meaning (BR-8.8.4) | `Rejected – Implementation Approval` | **`Rejected - Implementation Approval`** |
| Signature meaning (BR-8.8.4) | `Approved – Final Approval` | **`Approved - Final Approval`** |
| Signature meaning (BR-8.8.4) | `Rejected – Final Approval` | **`Rejected - Final Approval`** |

### This applies to
- Postgres `CHECK` constraints
- Go typed constants (`type RequiresTesting string`, `type SignatureMeaning string`)
- API request/response payloads
- **The frontend, whenever it is built** — the form must POST the hyphen version, or the API will reject it

### 🚩 OPEN RISK — still open as of V1.2
The HTML prototypes still carry `<option value="Yes – Full testing">` with an en-dash. **If the frontend is built by copying those option values verbatim, every submission will fail the CHECK constraint with a confusing 400.** Either correct the prototypes before frontend work begins, or normalise en-dash → hyphen at the API boundary.

### Everything else in the BRD is fine
The BRD contains ~180 other en/em-dashes — in headings (`7.1 Change Details — Identification`), rule labels (`BR-8.1.1 — Valid State Transitions:`), descriptions, and numeric ranges (`fields 7–39`). **Those are prose and are correct.** Do **not** run a global find/replace — only the six values above are stored strings.

---

# Related enums (not CC fields, but needed in code)

## Signature meanings — `ESignatures.meaning` (BR-8.8.4)

| Transition | Stored value |
|---|---|
| T2 | `Submitted for Implementation Approval` |
| T3 | `Cancelled` |
| T4 | `Approved - Implementation Approval` |
| T5 | `Rejected - Implementation Approval` |
| T6 | `Submitted for Final Approval` |
| T7 | `Approved - Final Approval` |
| T8 | `Rejected - Final Approval` |

Closed set of 7. Hyphens, not en-dashes.

## Roles — `Users.role`
`CC Owner` · `Approver` · `Viewer` · `Admin` — one role per user.


# Validation Cheat Sheets

## Mandatory field sets per transition

**T2 — Submit for Approval → exactly 20 fields**
```
7  change_title                      18 business_impact
8  change_description                19 expected_downtime
9  change_type                       20 requires_testing
10 change_category                   21 requires_training
11 department_function               22 risk_rationale
12 affected_systems_modules          23 key_risks_mitigations
13 proposed_implementation_date      25 high_level_implementation_plan
14 target_closure_date               26 validation_approach
17 reason_for_change                 27 success_criteria
                                     28 rollback_backout_plan
                                     35 assign_approver
```
❌ **NOT validated at T2:** 15, 16 (time pickers), 24 (supporting docs), 36 (comments for approver), 49 (comments) — all optional.
➕ Plus the two date rules (2 / 10 business days, both must be future).

**T3 — Cancel → 1 field**
`50 cancellation_reason` (max 500)

**T4/T5 — Implementation Decision → 3 fields**
`37 decision` · `38 risk_level` · `39 decision_comments`

**T6 — Submit for Final Approval → 5 fields**
`29 actual_implementation_date` · `30 post_implementation_issues` · `31 implementation_summary` · `33 validation_performed` · `34 implementation_evidence` *(file must exist)*
❌ **NOT validated:** `32 deviations_from_plan` (optional)

**T7/T8 — Final Decision → 2 fields**
`42 final_decision` · `43 final_comments`

---

## The 9 audit-tracked fields (BR-8.7.2)

Every change to these writes a **separate** audit entry with old + new value:

```
35 assign_approver               39 decision_comments
13 proposed_implementation_date  42 final_decision
14 target_closure_date           43 final_comments
37 decision                      50 cancellation_reason
38 risk_level
```

All other fields (descriptions, impacts, plans, summaries) are **NOT** individually audited (BR-8.7.3).

---

## Field census (integrity check — sums to 50)

| Category | Count | Fields |
|---|---|---|
| System-generated | **13** | 1–6, 40, 41, 44, 45, 46, 47, 48 |
| Mandatory @ T2 | **20** | see above |
| Mandatory @ T6 | **5** | 29, 30, 31, 33, 34 |
| Mandatory @ T4/T5 | **3** | 37, 38, 39 |
| Mandatory @ T7/T8 | **2** | 42, 43 |
| Mandatory @ T3 | **1** | 50 |
| Optional | **6** | 15, 16, 24, 32, 36, 49 |
| | **50** ✅ | |

---

# 🔒 Audit scope — the nine tracked fields (BRD §6.6.2)

⬥ **Only these nine field changes are audited.** FR-6.6.6 is explicit that non-critical field
changes — it names Change Description and Business Impact — generate **no** audit entry. The
trail records compliance-relevant decisions, not typing.

| # | Field | Written at | Note |
|---|-------|-----------|------|
| 13 | `proposed_implementation_date` | Save Draft | |
| 14 | `target_closure_date` | Save Draft | |
| 35 | `assign_approver` | Save Draft | ⬥ recorded as **names**, not UUIDs, so the trail reads without a join |
| 37 | `decision` | T4/T5 | overwritten on re-review |
| 38 | `risk_level` | T4/T5 | overwritten on re-review |
| 39 | `decision_comments` | T4/T5 | overwritten on re-review |
| 42 | `final_decision` | T7/T8 | overwritten on re-review |
| 43 | `final_comments` | T7/T8 | overwritten on re-review |
| 50 | `cancellation_reason` | T3 | permanently read-only once written |

**Everything else is unaudited**, including all five implementation-detail fields (29–33) and
all 21 non-tracked Save Draft fields. Record-level events (`Created`, `StateChanged`,
`SignatureCaptured`, `SignatureFailed`) and the four user-management events are audited
separately and are not field changes.

⬥ **File uploads write no audit row.** An audit row could not preserve the *replaced file* — the
upsert overwrites the bytes — so a row reading `evidence-v1.pdf → evidence-v2.pdf` would
advertise a gap rather than close one, claiming a document existed while being unable to
produce it.

**FR-6.6.5:** each critical field change is a **separate** audit entry, and **multiple entries
from one action share one timestamp.**

---

# ⚠️ Gotchas — the things that will bite you

1. **The BRD and HTML contain EN-DASHES (–) in six enum values. The implementation uses ASCII HYPHENS (-).**
   This is a **known, deliberate deviation** — see the "Canonical String Values" section above. The BRD is not the authority on these six strings; this document is. Anyone building the frontend must send the hyphen version.

2. **`post_implementation_issues` is a DROPDOWN**, not a free-text area. Three fixed values only.

3. **Approval By/On fields (40, 41, 44, 45) populate on APPROVE ONLY.**
   On a rejection, they stay empty. Easy to get wrong when you write the transition handler.

4. **Status resets on rejection** (FR-6.2.10 / FR-6.2.21):
   - T5 (Gate 1 reject) → `implementation_approval_status` back to **`Not Submitted`** (not left as `Pending`)
   - T8 (Gate 2 reject) → `final_approval_status` back to **`Not Submitted`**

5. **`cancellation_reason` max is 500**, not 2000 like every other textarea.

6. **Decision fields are overwritten on re-review** — the old value must be captured in the audit log *before* the overwrite. The CC row holds only the latest; the audit log (and now the signature table) holds the history.

7. **Both dates re-validate at submission.** A date that was valid when typed can go stale. On failure, the user corrects it and the ≥2 / ≥10 business-day rule is re-applied from the *new* current date.

8. **`risk_rationale` (22, Owner) ≠ `risk_level` (38, Approver).** Two different fields, two different people. Don't conflate.

9. **Business days = Mon–Fri only.** No public holiday calendar in Phase 1 (deferred — see §13.2).

10. **Single file per upload field.** Re-uploading replaces; it does not append.

11. ⬥ **Only nine field changes are audited** — see the Audit Scope section above. Assuming every
    field is tracked would put roughly forty spurious rows on a single record and make the trail
    harder to read, not more complete.

12. ⬥ **`implementation_evidence` is PDF only**, verified by inspecting the file's contents. The
    extension is checked first only for a clearer error message; a renamed PNG passes that check
    and fails on the magic bytes.

13. ⬥ **Date and time fields accept only RFC 3339**, and only `null` clears them — an empty string
    is a parse error, unlike text fields where `""` normalises to NULL. The two `TIME` columns
    (15, 16) return as `0000-01-01T09:00:00Z`, since Go's `time.Time` always carries a date and a
    `TIME` column has none. The date part is an artifact; strip it for display.

14. ⬥ **`actual_implementation_date` (29) must not be in the future** — but only at T6. The save
    endpoint accepts any date, so an owner can draft on Monday for work scheduled Wednesday.

15. ⬥ **All date rules are computed in UTC.** In a UTC+ deployment, a submission between midnight
    and the offset is evaluated against the previous calendar day (BRD §13.1 L13).
