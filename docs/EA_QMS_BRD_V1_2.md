# EA QMS — Change Control Module
## Business Requirements Document · Version 1.2

> Converted from the Word original for use as a working reference. Content is
> unchanged; only Word formatting artifacts were cleaned up. The `.docx` remains
> the document of record.

---

EA QMS — Change Control Module — BRD v1.0

**EA QMS**

Quality Management System

**Change Control Module**

Business Requirements Document

**Version 1.2**

# 1. EXECUTIVE SUMMARY

## 1.1 Project Overview

EA QMS (Quality Management System) is a web-based platform being developed to support structured quality and compliance management across the organisation. The platform is designed as a modular system, with each module addressing a specific quality management function.

This Business Requirements Document (BRD) defines the requirements for the **Change Control module** — the first module to be developed within the EAMI QMS platform. The Change Control module provides a formal, auditable process for requesting, evaluating, approving, implementing, and closing changes that affect systems, processes, infrastructure, or operations.

The module enforces a structured six-state workflow with two approval gates, role-based access control across four user roles, and field-level permissions governing who can edit which fields at each stage of the lifecycle. The system manages 50 fields across 11 form sections, with a comprehensive security matrix defining permissions by role and state.

## 1.2 Business Objectives

The Change Control module addresses the following business objectives:

**BO-1: Formalise the Change Management Process**

Replace informal or ad-hoc change management practices with a standardised, structured workflow that ensures every change follows a consistent evaluation and approval process before implementation.

**BO-2: Enforce Segregation of Duties**

Ensure that the person requesting and implementing a change is never the same person approving it. The system enforces that the CC Owner and Approver must be different individuals, maintaining independence in the approval process.

**BO-3: Maintain a Complete Audit Trail**

Capture and permanently retain a record of all significant actions, state transitions, approvals, rejections, and critical field changes. This supports regulatory compliance, internal audits, and dispute resolution.

**BO-4: Provide Structured Risk Assessment**

Require risk evaluation at the approval gate, where the Approver independently assesses and assigns a risk level to each change. This ensures that risk is evaluated by a reviewer rather than the change requestor.

**BO-5: Ensure Implementation Accountability**

Require the CC Owner to document implementation details, validation evidence, and any deviations from the original plan before the change can be closed. A second approval gate validates that implementation was completed satisfactorily.

**BO-6: Support Regulatory and Compliance Requirements**

Provide the documentation structure, approval controls, and audit capabilities needed to demonstrate compliance with quality management standards and regulatory expectations applicable to the organisation.

**BO-7: Establish the Foundation for the QMS Platform**

Deliver the first functional module of the EAMI QMS, establishing the user management framework, authentication model, navigation structure, and design patterns that subsequent modules (CAPA, Deviation, Risk Register) will build upon.

**BO-8: Enforce Attested Decision-Making**

Require every workflow decision — submission, cancellation, approval, and rejection — to be authenticated by the acting user through an electronic signature. Each signature captures the signer's identity, the date and time, and the meaning of the signature, creating a non-repudiable record of who authorised each action. This ensures decisions cannot be attributed to a user without their explicit, credential-verified consent.

## 1.3 Scope

### 1.3.1 In Scope

The following capabilities are within the scope of this Change Control module (Phase 1):

**Workflow Management**

- Six-state lifecycle: Initiated, Pending Implementation Approval, In Implementation, Pending Final Approval, Closed, and Cancelled

- Two approval gates with approval/rejection decision logic

- Rejection workflow that returns the record to the previous state for revision and resubmission

- Cancellation workflow available only from the Initiated state, requiring a mandatory cancellation reason

**Form and Field Management**

- 50 fields organised across 11 form sections: Change Details — Identification (6 fields), Change Details — Change Definition (6 fields), Change Details — Planning (4 fields), Impact & Risk Assessment (8 fields), Implementation Plan & Validation (4 fields), Implementation Details (6 fields), Approvals — Initiation (2 fields), Approvals — Implementation Approval (5 fields), Approvals — Final Approval (4 fields), Approvals — Status (3 fields), and Additional Information (2 fields)

- Field-level permissions governed by the Security Matrix, defining editable, read-only, and not-applicable states for each field by role and workflow state

- 13 system-generated fields that are always read-only for all users

- Mandatory field validation enforced at submission points

**Role-Based Access Control**

- Four user roles: CC Owner, Approver, Viewer, and Admin

- Field-level and action-level permissions enforced per the Security Matrix

- Segregation of duties: CC Owner and Approver must be different individuals on any given record

**User Management**

- Standalone user database managed within the application (no external directory integration)

- Admin-managed user creation, role assignment, and user deactivation via the Settings interface

**Notifications**

- Email notifications triggered at each state transition

- Task due dates communicated via email notifications (Approval task: Submission Date + 5 business days; Implementation task: Target Closure Date − 3 business days; Final Approval task: Target Closure Date)

**Audit Trail**

- Comprehensive audit logging of state transitions, critical field changes, approval and rejection decisions, cancellation reasons, and user management actions

- Audit data stored in a database table, retained indefinitely, never deleted

- Old field values preserved in the audit log when overwritten during re-review cycles

**Electronic Signatures**

- Native electronic signature required on all seven workflow decision transitions: Submit for Approval, Cancel, Submit Decision (both approval gates), and Submit for Final Approval

- Signature captured by re-authentication: the acting user re-enters their username and password to confirm the action

- Credentials must match the currently logged-in user; a user cannot sign on behalf of another user

- Every signature permanently recorded with signer identity, date and time, the action signed, and the meaning of the signature

- Signature History panel on the Change Control form displaying all signature events for that record, read-only for all roles

- Failed signature attempts recorded in the audit trail

**Navigation and Views**

- Dashboard with action-required items and system-wide statistics

- All Change Controls list view (accessible to all roles)

- My Change Controls list view (filtered to the logged-in user's records)

- Approvals queue (filtered to items pending the logged-in Approver's review)

- Settings pages for profile management and user administration

**Authentication**

- Login with email and password

- Password reset via email

- Session timeout after 30 minutes of inactivity

### 1.3.2 Out of Scope

The following items are explicitly **not included** in Phase 1 and are documented as future enhancements in Section 13:

- Emergency or fast-track change workflow (no "Emergency" category)

- CC Owner delegation or ownership transfer for in-progress records

- Cross-module traceability (linking to CAPA, Deviation, or Risk Register)

- Stale record detection, auto-escalation, or automated reminder emails for overdue tasks

- Audit trail viewer in the user interface (audit data is captured in the database only)

- External directory integration (Azure AD, LDAP, or similar)

- Direct clickable links to CC records within email notifications

- Reporting or analytics dashboards beyond the basic dashboard statistics

- Mobile-specific or native application interfaces

- Multi-language support

- Third-party electronic signature provider integration (e.g., DocuSign, Adobe Sign) — Phase 1 uses a native electronic signature implemented within the application

- Cryptographic or PKI-based digital signatures (certificate-based signing)

- Bulk operations (creating, approving, or closing multiple CCs simultaneously)

## 1.4 Success Criteria

The Change Control module will be considered successfully delivered when all of the following criteria are met:

**SC-1: Complete Field Implementation**

All 50 fields are functional, correctly validated, and display the appropriate permission state (editable, read-only, not applicable, or system-managed) based on the current workflow state and the logged-in user's role, as defined in the Security Matrix.

**SC-2: Workflow State Machine**

All six workflow states operate correctly with proper state transitions. The "Submit for Approval," "Submit Decision," "Submit for Final Approval," and "Cancel CC" actions trigger the correct transitions. Rejection at either approval gate returns the record to the appropriate previous state.

**SC-3: Role-Based Access Enforcement**

The four roles (CC Owner, Approver, Viewer, Admin) have the correct permissions enforced at both the field level and the action level. Segregation of duties prevents a user from being both the CC Owner and Approver on the same record.

**SC-4: Notification Delivery**

Email notifications are sent at every state transition with the correct task due dates. Notifications include the CC-ID and a summary of the required action.

**SC-5: Audit Trail Completeness**

All state transitions, critical field changes (Decision, Risk Level, Decision Comments, Final Decision, Final Comments, Cancellation Reason, Target Closure Date, Proposed Implementation Date, Assign Approver), approval/rejection events, and user management actions are captured in the audit log with correct timestamps and user attribution. Old values are preserved when fields are overwritten during re-review cycles.

**SC-6: Validation Enforcement**

All mandatory field validations are enforced at submission. Date validations enforce minimum lead times (Proposed Implementation Date ≥ 2 business days; Target Closure Date ≥ 10 business days). 

**SC-7: Cancellation Integrity**

Cancellation is available only from the Initiated state, only to the CC Owner of that specific record, and requires a mandatory cancellation reason entered via a popup modal. Cancelled records are permanent, read-only, and retained indefinitely.

**SC-8: UI Consistency with Prototypes**

The implemented user interface matches the approved HTML prototypes in terms of layout structure, field organisation, section grouping, navigation elements, and field display patterns across all workflow states and role-based views.

**SC-9: Data Retention**

Change Control records, audit log entries, and user records are retained indefinitely with no automatic deletion. Cancelled records remain in the system with all fields in a read-only state.

**SC-10: Platform Foundation**

The user management framework, authentication model, and navigation structure are delivered in a manner that supports the future addition of QMS modules (CAPA, Deviation, Risk Register) without requiring structural rework.

# 2. USER ROLES & PERSONAS

## 2.1 Role Definitions

The Change Control module defines four distinct user roles. Every user in the system is assigned exactly one role by an Admin. A user's role determines what actions they can perform, which fields they can edit, and at which workflow states they have write access.

### 2.1.1 CC Owner

**Role Purpose:** The CC Owner is the person who creates, prepares, and drives a Change Control through its full lifecycle. They are responsible for documenting the change request, completing the implementation, and providing evidence of completion.

**Typical Persona:** A process owner, team lead, project engineer, IT specialist, or operations manager who identifies the need for a change and takes responsibility for executing it.

**System Behaviour:**

- When a user with the CC Owner role creates a new Change Control, the system automatically populates the "Change Owner" field with that user's name. This field is system-generated and cannot be changed.

- The CC Owner is the owner of that specific record only. Other users who also hold the CC Owner role in the system are not owners of that record and cannot perform owner-specific actions (such as cancelling) on it.

- A user with the CC Owner role can create multiple Change Controls. Each record is independently owned by the user who created it.

**Key Capabilities:**

- Create new Change Control records

- Edit 25 fields during the Initiated state (change details, planning, impact assessment, implementation plan, approver assignment, and comments)

- Submit the record for implementation approval

- Cancel the record (only from the Initiated state, only for records they own)

- Edit 6 implementation detail fields during the In Implementation state

- Submit the record for final approval after implementation is complete

- View all Change Controls in the system (regardless of ownership)

### 2.1.2 Approver

**Role Purpose:** The Approver is the independent reviewer responsible for evaluating the change request at two approval gates. They assess the change for completeness, risk, and readiness — first before implementation begins, and again after implementation is completed.

**Typical Persona:** A quality manager, department head, compliance officer, or senior technical authority who has the knowledge and authority to evaluate proposed changes and their associated risks.

**System Behaviour:**

- An Approver does not self-assign to a record. The CC Owner selects the Approver from a dropdown during the Initiated state. The dropdown only displays users who hold the Approver role.

- Once assigned, the same Approver reviews the record at both approval gates (Implementation Approval and Final Approval).

- The Approver receives email notifications when a record is submitted for their review, including a task due date.

**Key Capabilities:**

- Edit 3 fields during the Pending Implementation Approval state (Decision, Risk Level, Decision Comments)

- Edit 2 fields during the Pending Final Approval state (Final Decision, Final Comments)

- Submit their decision at each approval gate using the "Submit Decision" button

- Approve or reject at each gate by setting the Decision field value before submitting

- View all Change Controls in the system

- Access the Approvals queue showing records pending their review

**Key Restrictions:**

- Cannot create Change Controls

- Cannot cancel Change Controls

- Cannot edit any fields outside of their designated approval states

- Cannot approve a record or even be assigned as an Approver where they are also the CC Owner (segregation of duties)

### 2.1.3 Viewer

**Role Purpose:** The Viewer has read-only access to all Change Controls in the system. This role exists for stakeholders, auditors, or team members who need visibility into the change management process but do not participate in creating, approving, or implementing changes.

**Typical Persona:** A compliance auditor, executive sponsor, project stakeholder, or team member who needs to monitor change activity without directly participating in the workflow.

**System Behaviour:**

- Viewers can access and read all Change Control records across all workflow states.

- All fields appear as read-only or system-managed to the Viewer at every state.

- Viewers do not receive workflow-related email notifications (they are not participants in the approval or implementation process).

**Key Capabilities:**

- View all Change Controls in the system

- View all fields and sections of any Change Control record

- Access the Dashboard overview statistics

- Access the All Change Controls list view

**Key Restrictions:**

- Cannot create, edit, submit, approve, reject, or cancel any Change Control

- Zero editable fields in any state

- No workflow action buttons are displayed to this role

### 2.1.4 Admin

**Role Purpose:** The Admin manages system configuration and user accounts. The Admin role is focused on platform administration rather than Change Control workflow participation.

**Typical Persona:** A system administrator, IT administrator, or QMS platform manager responsible for maintaining user accounts and system settings.

**System Behaviour:**

- Admins have view-only access to all Change Control records, identical to the Viewer role from a CC perspective.

- Admins have exclusive access to the user management functions within the Settings area.

- Admins can create users, assign roles, edit user profiles, and deactivate users.

**Key Capabilities:**

- View all Change Controls in the system (read-only, same as Viewer)

- Create new user accounts (Full Name, Email, Password, Role)

- Edit existing user profiles: Full Name and Role only (Email is set at creation and cannot be changed; password resets are handled through the Forgot Password flow or at the database level)

- Deactivate user accounts

- Access the full Settings interface (Profile and User Management tabs)

**Key Restrictions:**

- Cannot create, edit, submit, approve, reject, or cancel any Change Control

- Zero editable fields on CC records in any state

- No workflow action buttons are displayed to this role on CC records

- Cannot change a user's role if that user has any active CC records (records in any state other than Closed or Cancelled) — see Section 2.4 for details

- Admin user management actions are captured in the audit log

## 2.2 Role Responsibilities

The following table summarizes each role's responsibilities across the Change Control lifecycle:

| **Lifecycle Phase** | **CC Owner** | **Approver** | **Viewer** | **Admin** |
| --- | --- | --- | --- | --- |
| **Record Creation** | Creates the CC record; system auto-populates Change Owner | No involvement | No involvement | No involvement |
| **Change Documentation (Initiated)** | Fills all 25 editable fields: change details, planning dates, impact and risk assessment, implementation plan, approver assignment, and comments | No involvement | Can view the record | Can view the record |
| **Submission for Approval** | Clicks "Submit for Approval" after all mandatory fields pass validation | No involvement | No involvement | No involvement |
| **Implementation Approval Review** | Waits; can view the record in read-only mode | Reviews the change; sets Decision (Approve/Reject), Risk Level, and Decision Comments; clicks "Submit Decision" | Can view the record | Can view the record |
| **Rejection at Implementation Approval** | Receives rejection notification; revises and resubmits | Provides rejection rationale in Decision Comments | Can view the record | Can view the record |
| **Implementation (In Implementation)** | Completes the 6 implementation detail fields: Actual Implementation Date, Post-Implementation Issues, Implementation Summary, Deviations from Plan, Validation Performed, Implementation Evidence | No involvement | Can view the record | Can view the record |
| **Submission for Final Approval** | Clicks "Submit for Final Approval" | No involvement | No involvement | No involvement |
| **Final Approval Review** | Waits; can view the record in read-only mode | Reviews implementation evidence; sets Final Decision (Approve/Reject) and Final Comments; clicks "Submit Decision" | Can view the record | Can view the record |
| **Rejection at Final Approval** | Receives rejection notification; improves implementation documentation and resubmits | Provides rejection rationale in Final Comments | Can view the record | Can view the record |
| **Closure** | Receives success notification; record becomes read-only | No further action; record becomes read-only | Can view the record | Can view the record |
| **Cancellation** | Can cancel only from Initiated state; must provide mandatory Cancellation Reason via popup modal | Receives notification if previously assigned; cannot cancel | Can view the record | Can view the record |
| **User Management** | No access | No access | No access | Creates users (Full Name, Email, Password, Role); edits existing users (Full Name and Role only); deactivates users; cannot change role for users with active CC records |

## 2.3 Role-Based Access Summary

### 2.3.1 Editable Field Counts by State and Role

The Security Matrix defines exactly which fields each role can edit at each workflow state. The following table summarises the editable field counts:

| **Workflow State** | **CC Owner** | **Approver** | **Viewer** | **Admin** |
| --- | --- | --- | --- | --- |
| **Initiated** | 25 editable fields | 0 (read-only) | 0 (read-only) | 0 (read-only) |
| **Pending Implementation Approval** | 0 (read-only) | 3 editable fields | 0 (read-only) | 0 (read-only) |
| **In Implementation** | 6 editable fields | 0 (read-only) | 0 (read-only) | 0 (read-only) |
| **Pending Final Approval** | 0 (read-only) | 2 editable fields | 0 (read-only) | 0 (read-only) |
| **Closed** | 0 (read-only) | 0 (read-only) | 0 (read-only) | 0 (read-only) |
| **Cancelled** | 0 (read-only) | 0 (read-only) | 0 (read-only) | 0 (read-only) |

**Key Principle:** At any given state, only ONE role has edit access to specific fields. No two roles can edit the same record simultaneously. This enforces the shared document model where users take turns editing their designated fields during their designated stages.

### 2.3.2 Editable Fields by State — Detailed Breakdown

**Initiated State — CC Owner (25 fields):**

Change Title, Change Description, Change Type, Change Category, Department/Function, Affected Systems/Modules, Proposed Implementation Date, Target Closure Date, Implementation Window Start, Implementation Window End, Reason for Change, Business Impact, Expected Downtime, Requires Testing, Requires Training, Risk Rationale, Key Risks & Mitigations, Supporting Documents, High-Level Implementation Plan, Validation Approach, Success Criteria, Rollback/Backout Plan, Assign Approver, Comments for Approver, Comments.

**Pending Implementation Approval State — Approver (3 fields):**

Decision, Risk Level, Decision Comments.

**In Implementation State — CC Owner (6 fields):**

Actual Implementation Date, Post-Implementation Issues, Implementation Summary, Deviations from Plan, Validation Performed, Implementation Evidence.

**Pending Final Approval State — Approver (2 fields):**

Final Decision, Final Comments.

### 2.3.3 Action Permissions by Role

| **Action** | **CC Owner** | **Approver** | **Viewer** | **Admin** |
| --- | --- | --- | --- | --- |
| **Create CC** | Yes (always) | No | No | No |
| **Submit for Approval** | Yes (from Initiated, own record only) | No | No | No |
| **Cancel CC** | Yes (from Initiated, own record only) | No | No | No |
| **Submit Decision (Implementation)** | No | Yes (from Pending Implementation Approval, assigned record only) | No | No |
| **Submit for Final Approval** | Yes (from In Implementation, own record only) | No | No | No |
| **Submit Decision (Final)** | No | Yes (from Pending Final Approval, assigned record only) | No | No |
| **View Any CC** | Yes | Yes | Yes | Yes |
| **Manage Users** | No | No | No | Yes |

### 2.3.4 Navigation Visibility by Role

| **Navigation Item** | **CC Owner** | **Approver** | **Viewer** | **Admin** |
| --- | --- | --- | --- | --- |
| **Dashboard** | Visible (shows Pending Approvals card, My Drafts card, and Overview stats) | Visible (shows Pending Approvals card, My Drafts card, and Overview stats) | Visible (shows Pending Approvals card, My Drafts card, and Overview stats) | Visible (shows Pending Approvals card, My Drafts card, and Overview stats) |
| **All Change Controls** | Visible | Visible | Visible | Visible |
| **My Change Controls** | Visible (filtered to own records) | Visible (filtered to own records, if any) | Visible (typically empty) | Visible (typically empty) |
| **Approvals** | Visible (typically empty) | Visible (shows assigned pending items) | Visible (typically empty) | Visible (typically empty) |
| **Settings** | Visible (Profile tab only) | Visible (Profile tab only) | Visible (Profile tab only) | Visible (Profile + User Management tabs) |
| **"+ Create Change Control" Button** | Visible | Hidden | Hidden | Hidden |

**Note:** The Pending Approvals and My Drafts cards are displayed to all roles. They show relevant records when the user has items requiring action, or an empty state message ("No pending approvals" / "No drafts yet") when they do not.

## 2.4 Segregation of Duties

Segregation of duties is a mandatory compliance principle enforced by the Change Control module. It ensures that the person requesting and implementing a change is not the same person who approves it.

### 2.4.1 Core Rule

**The CC Owner and the Approver on any given Change Control record must be different individuals.** This rule is enforced by the system backend — it is not merely a procedural guideline.

### 2.4.2 Enforcement Mechanisms

**Single Role Per User:**

Every user in the system is assigned exactly one role at any time. A user cannot hold multiple roles simultaneously. Therefore, a user who has the CC Owner role cannot appear in the Approver dropdown (which only shows users with the Approver role), and vice versa.

**Approver Dropdown Filtering:**

The "Assign Approver" dropdown only displays users who currently hold the Approver role. Since a CC Owner can only hold the CC Owner role, they will never appear in this dropdown.

**Role Change Restriction for Active Records:**

To prevent a scenario where a user creates a CC as a CC Owner and then has their role changed to Approver (which could allow them to appear in Approver dropdowns for their own record), the system enforces the following rule:

An Admin cannot change a user's role if that user is associated with any active Change Control records. A record is considered "active" if it is in any state other than Closed or Cancelled. The association applies when the user is either the CC Owner of the record or the assigned Approver on the record.

When the Admin attempts to change a user's role and active records exist, the system shall block the role change and display an error message identifying the active CC-IDs that must be resolved (closed or cancelled) before the role change can proceed.

**Rationale:** This approach prevents segregation of duties violations at the source — the role-assignment level — rather than requiring complex per-record validation at submission time. The edge case of "CC Owner becomes Approver on their own record" is structurally impossible under this rule.

### 2.4.3 What Segregation of Duties Prevents

- A user creating a CC and then approving their own CC

- A user bypassing independent review by assigning themselves as the Approver

- A single individual having unchecked authority over the full change lifecycle

### 2.4.4 Record-Level Ownership Distinction

It is important to note that ownership and permissions are **record-specific**, not role-wide:

- If User A and User B both hold the CC Owner role, and User A creates CC-001, only User A is the owner of CC-001. User B cannot cancel CC-001 or perform owner-specific actions on it, even though User B also has the CC Owner role.

- The "Cancel CC" action is restricted to the CC Owner **of that specific record**, not to any user with the CC Owner role.

- The "Submit for Approval," "Submit for Final Approval" actions follow the same record-ownership principle.

This ensures that record ownership is tied to the individual who created the record, not to the role in general.

# 3. WORKFLOW & STATES

## 3.1 State Machine Diagram

The following diagram illustrates the complete Change Control lifecycle, showing all six states, transition paths, rejection loops, and the actions that trigger each transition:

## 3.2 Sequence Diagram

The following diagram illustrates the interaction between the CC Owner, the System, and the Approver across the full Change Control lifecycle, including both rejection scenarios:

**Note:** Each decision action in this sequence (Submit for Approval, Cancel, Submit Decision, Submit for Final Approval) is preceded by an electronic signature exchange — the system prompts the acting user for their credentials and validates them before the state transition proceeds. See Section 8.8.

## 3.3 State Descriptions

The Change Control module operates on a six-state lifecycle. Each state represents a distinct phase in the change management process with defined responsibilities, editable fields, and available actions.

### 3.3.1 Initiated

**Purpose:** The Initiated state is the creation and preparation phase. The CC Owner documents the change request by filling out all required fields before submitting for approval.

**Who Has Edit Access:** CC Owner (25 editable fields)

**Entry Conditions:**

- A user with the CC Owner role clicks the "+ Create Change Control" button, OR

- A previously submitted record is rejected at the Implementation Approval gate and returned to this state

**Editable Fields (25):**

Change Title, Change Description, Change Type, Change Category, Department/Function, Affected Systems/Modules, Proposed Implementation Date, Target Closure Date, Implementation Window Start, Implementation Window End, Reason for Change, Business Impact, Expected Downtime, Requires Testing, Requires Training, Risk Rationale, Key Risks & Mitigations, Supporting Documents, High-Level Implementation Plan, Validation Approach, Success Criteria, Rollback/Backout Plan, Assign Approver, Comments for Approver, Comments.

**Available Actions:**

- **Save Draft:** CC Owner can save the record without submitting. The record remains in Initiated state with all fields still editable.

- **Submit for Approval:** CC Owner submits the record for implementation approval. All mandatory fields must pass validation. Both date fields must be in the future at the time of submission. On success, the state transitions to Pending Implementation Approval.

- **Cancel CC:** CC Owner can cancel the record. A popup modal requires a mandatory Cancellation Reason (max 500 characters). On confirmation, the state transitions to Cancelled. This action is permanent and cannot be undone.

**Field Display Behaviour:**

- The 25 editable fields are shown as active input controls (text inputs, dropdowns, textareas, date pickers, file upload).

- The 6 Identification fields (CC-ID, Current State, Change Owner, Last Updated By, Created On, Last Updated On) are displayed as system-managed read-only values.

- Implementation Details fields (6 fields) are displayed as "Not applicable — Available after approval."

- Implementation Approval fields (Decision, Risk Level, Decision Comments) are displayed as "Not applicable — Pending submission" or "Not applicable — Will be set by approver during review."

- Final Approval fields are displayed as "Not applicable — Pending implementation."	

- System timestamp and approval-tracking fields show "—" (dash) indicating no value yet.

- Implementation Approval Status: "Not Submitted"

- Final Approval Status: "Not Submitted"

**Rejection Re-Entry Behaviour:**

When a record returns to Initiated after rejection at the Implementation Approval gate, the following applies:

- All 25 fields become editable again for the CC Owner to revise.

- Previously entered values are preserved (the CC Owner revises, not re-creates).

- *The Target Closure Date is editable because the record is in the Initiated state, and the Security Matrix grants the CC Owner edit access to all 25 fields in this state.*

- The previous Decision, Risk Level, and Decision Comments values from the rejected review are overwritten when the Approver re-reviews. The old values are preserved in the audit log.

### 3.3.2 Pending Implementation Approval

**Purpose:** The record is awaiting the assigned Approver's review. The Approver evaluates the change request for completeness, risk, and readiness, then makes an Approve or Reject decision.

**Who Has Edit Access:** Approver (3 editable fields)

**Entry Conditions:**

- The CC Owner clicks "Submit for Approval" from the Initiated state and all validations pass

**Editable Fields (3):**

Decision (dropdown: Approve / Reject), Risk Level (dropdown: Low / Medium / High), Decision Comments (textarea).

**Available Actions:**

- **Submit Decision:** The Approver sets the Decision field, sets Risk Level and enters Decision Comments, then clicks "Submit Decision." The system reads the Decision field value to determine the next state:

- Decision = Approve → State transitions to In Implementation

- Decision = Reject → State transitions to Initiated (loop back)

**Field Display Behaviour:**

- All 25 fields previously filled by the CC Owner are now displayed as read-only (disabled inputs showing the submitted values).

- The 3 Approver fields (Decision, Risk Level, Decision Comments) are displayed as active editable controls.

- Implementation Details fields remain "Not applicable — Available after approval."

- Final Approval fields remain "Not applicable — Pending implementation."

- Implementation Approval Status: "Pending"

- Final Approval Status: "Not Submitted"

**CC Owner's View in This State:**

The CC Owner can view the record but all fields are read-only. The CC Owner does not see the "Submit Decision" button. The CC Owner waits for the Approver's decision.

**Notification Sent on Entry:**

An email notification is sent to the assigned Approver with a task due date of Submission Date + 5 business days.

### 3.3.3 In Implementation

**Purpose:** The change has been approved for implementation. The CC Owner carries out the change and documents the implementation details, evidence, and any issues or deviations encountered.

**Who Has Edit Access:** CC Owner (6 editable fields)

**Entry Conditions:**

- The Approver submits a decision of "Approve" from the Pending Implementation Approval state, OR

- A previously submitted record is rejected at the Final Approval gate and returned to this state

**Editable Fields (6):**

Actual Implementation Date, Post-Implementation Issues, Implementation Summary, Deviations from Plan, Validation Performed, Implementation Evidence (file upload).

**Available Actions:**

- **Submit for Final Approval:** The CC Owner clicks "Submit for Final Approval" after completing the implementation detail fields. On success, the state transitions to Pending Final Approval.

**Field Display Behaviour:**

- All original change detail fields (from Initiated state) are displayed as read-only.

- The Approver's decision fields (Decision, Risk Level, Decision Comments) are displayed as read-only showing the approved values.

- The 6 Implementation Details fields are displayed as active editable controls.

- Implementation Approval By and Implementation Approval On are populated with the Approver's name and the approval timestamp (system-generated, read-only).

- Final Approval fields remain "Not applicable — Pending implementation."

- Implementation Approval Status: "Approved"

- Final Approval Status: "Not Submitted"

**Rejection Re-Entry Behaviour:**

When a record returns to In Implementation after rejection at the Final Approval gate, the following applies:

- The 6 Implementation Details fields become editable again for the CC Owner to revise.

- Previously entered implementation values are preserved for revision.

- The previous Final Decision and Final Comments values from the rejected review are overwritten when the Approver re-reviews. The old values are preserved in the audit log.

**Notification Sent on Entry:**

An email notification is sent to the CC Owner with a task due date of Target Closure Date − 3 business days.

### 3.3.4 Pending Final Approval

**Purpose:** The CC Owner has completed implementation and submitted evidence. The Approver now reviews the implementation details to confirm the change was executed satisfactorily and the documentation is complete.

**Who Has Edit Access:** Approver (2 editable fields)

**Entry Conditions:**

- The CC Owner clicks "Submit for Final Approval" from the In Implementation state

**Editable Fields (2):**

Final Decision (dropdown: Approve / Reject), Final Comments (textarea).

**Available Actions:**

- **Submit Decision:** The Approver sets the Final Decision field, enters Final Comments, then clicks "Submit Decision." The system reads the Final Decision field value to determine the next state:

- Final Decision = Approve → State transitions to Closed

- Final Decision = Reject → State transitions to In Implementation (loop back)

**Field Display Behaviour:**

- All original change detail fields are displayed as read-only.

- The Implementation Approval fields (Decision, Risk Level, Decision Comments) are displayed as read-only showing the previously approved values.

- The 6 Implementation Details fields are displayed as read-only showing the CC Owner's submitted values.

- The 2 Final Approval fields (Final Decision, Final Comments) are displayed as active editable controls.

- Implementation Approval Status: "Approved"

- Final Approval Status: "Pending"

**CC Owner's View in This State:**

The CC Owner can view the record but all fields are read-only. The CC Owner does not see the "Submit Decision" button. The CC Owner waits for the Approver's final decision.

**Notification Sent on Entry:**

An email notification is sent to the assigned Approver with a task due date of Target Closure Date.

### 3.3.5 Closed

**Purpose:** The change has been fully approved, implemented, and validated. The record is now a permanent, read-only historical record.

**Who Has Edit Access:** No one (0 editable fields for all roles)

**Entry Conditions:**

- The Approver submits a Final Decision of "Approve" from the Pending Final Approval state

**Editable Fields:** None. All 50 fields are read-only for all roles.

**Available Actions:** None. No workflow action buttons are displayed. Only the "Back to List" navigation link is available.

**Field Display Behaviour:**

- All fields display their final values as read-only.

- All system-generated timestamp and approval-tracking fields are fully populated.

- Final Approval By and Final Approval On are populated with the Approver's name and the approval timestamp.

- Actual Closure Date is system-generated at the moment of closure (the date and time when the Approver's final approval was submitted).

- Implementation Approval Status: "Approved"

- Final Approval Status: "Approved"

**Notification Sent on Entry:**

An email notification is sent to the CC Owner confirming the Change Control has been successfully closed.

**Data Retention:**

Closed records are retained in the system indefinitely. They are never deleted or archived out of the system. They remain accessible to all users through the All Change Controls list and via direct record view.

### 3.3.6 Cancelled

**Purpose:** The change request was terminated by the CC Owner before it entered the approval process. The record is preserved as a permanent, read-only record for audit purposes.

**Who Has Edit Access:** No one (0 editable fields for all roles)

**Entry Conditions:**

- The CC Owner clicks "Cancel CC" from the Initiated state and confirms with a mandatory Cancellation Reason via the popup modal

**Editable Fields:** None. All fields are read-only for all roles.

**Available Actions:** None. No workflow action buttons are displayed.

**Field Display Behaviour:**

- All previously entered fields display their values at the time of cancellation as read-only.

- Fields that were "Not applicable" at the Initiated state continue to display as "Not applicable" or "—".

- The Cancellation Reason field, which is hidden in all other states, becomes visible in the Additional Information section below the Comments field. It displays the reason entered during cancellation as a read-only text area.

- Implementation Approval Status: "N/A"

- Final Approval Status: "N/A"

**Cancellation Restrictions:**

- Cancellation is only possible from the Initiated state. Once a record has been submitted for approval (or is in any subsequent state), it cannot be cancelled.

- Only the CC Owner of that specific record can cancel it. Other users with the CC Owner role cannot cancel someone else's record.

- Cancellation is permanent and cannot be undone. There is no "reopen" or "reactivate" action.

**Notification Sent on Entry:**

If an Approver was previously assigned to the record, an email notification is sent to inform them that the Change Control has been cancelled.

**Data Retention:**

Cancelled records are retained in the system indefinitely with all fields in a read-only state. The Cancellation Reason is permanently visible on the record for audit purposes.

## 3.4 State Transition Rules

The following table defines every valid state transition in the system, the triggering action, and who can perform it:

| **#** | **From State** | **To State** | **Triggering Action** | **Performed By** | **Conditions** | **E-Signature** |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | *(New)* | Initiated | Create CC | CC Owner | User must have CC Owner role | Not Required |
| T2 | Initiated | Pending Implementation Approval | Submit for Approval | CC Owner (record owner) | All mandatory fields validated; both dates must be in the future; Proposed Implementation Date ≥ 2 business days; Target Closure Date ≥ 10 business days | Required |
| T3 | Initiated | Cancelled | Cancel CC | CC Owner (record owner) | Mandatory Cancellation Reason provided via popup modal | Required |
| T4 | Pending Implementation Approval | In Implementation | Submit Decision | Approver (assigned to record) | Decision field = "Approve" | Required |
| T5 | Pending Implementation Approval | Initiated | Submit Decision | Approver (assigned to record) | Decision field = "Reject" | Required |
| T6 | In Implementation | Pending Final Approval | Submit for Final Approval | CC Owner (record owner) | Implementation detail fields completed | Required |
| T7 | Pending Final Approval | Closed | Submit Decision | Approver (assigned to record) | Final Decision field = "Approve"; system sets Actual Closure Date | Required |
| T8 | Pending Final Approval | In Implementation | Submit Decision | Approver (assigned to record) | Final Decision field = "Reject" | Required |

**Important Notes on Transitions:**

**No Direct State Skipping:** There is no path that skips a state. Every record must pass through the full sequence (or be cancelled from Initiated). A record cannot jump from Initiated directly to In Implementation or from Pending Implementation Approval directly to Closed.

**Decision Field Drives Transition, Not the Button:** At both approval gates, there is a single "Submit Decision" button. The system reads the value of the Decision field (or Final Decision field) to determine whether the transition is an approval or rejection. There are no separate "Approve" and "Reject" buttons.

**Terminal States:** Closed and Cancelled are terminal states. No transitions exit from these states. Once a record reaches either state, it remains there permanently.

**Rejection Loops Are Not Unlimited:** While there is no system-enforced limit on how many times a record can be rejected and resubmitted, each rejection cycle is fully tracked in the audit log. Repeated rejections would be visible in the audit history for management review.

**Electronic Signature Required on All Decision Transitions:** Every transition except T1 (record creation) requires a valid electronic signature from the acting user before the transition is committed. If the signature fails, the transition does not occur and the record remains in its current state. Creating a draft record (T1) does not require a signature, as it represents no decision or commitment.

## 3.5 Rejection Workflow

Rejection is a critical part of the Change Control lifecycle. It provides a mechanism for the Approver to send a record back for improvement rather than creating a separate "rejected" state. The goal of rejection is to improve the quality of the change documentation, not to terminate the process.

### 3.5.1 Rejection at Implementation Approval Gate (Transition T5)

**Trigger:** The Approver sets the Decision field to "Reject" and clicks "Submit Decision" during the Pending Implementation Approval state.

**What Happens:**

- The system transitions the record from Pending Implementation Approval back to Initiated.

- The audit log captures the rejection event, including the Decision value ("Reject"), the Risk Level (if set), and the Decision Comments provided by the Approver.

- An email notification is sent to the CC Owner informing them that the record has been rejected and needs revision. The notification includes the CC-ID and a summary.

- The record returns to the Initiated state where the CC Owner has full edit access to all 25 fields.

- The CC Owner reviews the Approver's feedback (visible in the Decision Comments field, which is now read-only from the CC Owner's perspective in the Initiated state upon return — note: the Approver's previous comments remain visible until the CC Owner resubmits and the Approver overwrites them).

- The CC Owner revises the necessary fields and resubmits for approval.

- The record transitions back to Pending Implementation Approval for re-review.

- The Approver reviews again and sets a new Decision. The new Decision, Risk Level, and Decision Comments overwrite the previous rejection values. The old rejection values are preserved in the audit log.

### 3.5.2 Rejection at Final Approval Gate (Transition T8)

**Trigger:** The Approver sets the Final Decision field to "Reject" and clicks "Submit Decision" during the Pending Final Approval state.

**What Happens:**

- The system transitions the record from Pending Final Approval back to In Implementation.

- The audit log captures the rejection event, including the Final Decision value ("Reject") and the Final Comments provided by the Approver.

- An email notification is sent to the CC Owner informing them that the final review has been rejected and the implementation documentation needs improvement.

- The record returns to the In Implementation state where the CC Owner has edit access to the 6 implementation detail fields.

- The CC Owner reviews the Approver's feedback (visible in the Final Comments field).

- The CC Owner revises the implementation details and resubmits for final approval.

- The record transitions back to Pending Final Approval for re-review.

- The Approver reviews again and sets a new Final Decision. The new Final Decision and Final Comments overwrite the previous rejection values. The old rejection values are preserved in the audit log.

### 3.5.3 Rejection Audit Trail Preservation

A critical aspect of the rejection workflow is that **old values are always preserved in the audit log before they are overwritten**. This ensures a complete rejection history is maintained even though the record itself only shows the latest values.

**Example Scenario — Rejection and Re-Approval at Implementation Gate:**

*First Review (Rejection):*

- Audit Entry: Decision changed from [empty] to "Reject"

- Audit Entry: Risk Level changed from [empty] to "Medium"

- Audit Entry: Decision Comments changed from [empty] to "Risk mitigation plan is insufficient. Please provide specific rollback steps for each deployment stage."

- Audit Entry: State changed from "Pending Implementation Approval" to "Initiated"

*Second Review (Approval after revision):*

- Audit Entry: Decision changed from "Reject" to "Approve" — old value "Reject" preserved

- Audit Entry: Risk Level changed from "Medium" to "Low" — old value "Medium" preserved

- Audit Entry: Decision Comments changed from "Risk mitigation plan is insufficient..." to "Revised risk mitigation plan is thorough. Approved for implementation." — old rejection comment preserved

The Change Control record itself now shows Decision = "Approve", Risk Level = "Low", and Decision Comments = "Revised risk mitigation plan is thorough. Approved for implementation." But the audit log retains the full history showing the initial rejection, its rationale, and the subsequent approval.

### 3.5.4 Key Principles of the Rejection Workflow

- **Rejection is not a terminal state.** Rejection sends the record back for improvement. It does not end the process.

- **There is no separate "Rejected" state.** The record returns to its previous state (Initiated or In Implementation) where the CC Owner can make revisions.

- **The same Approver re-reviews.** The assigned Approver does not change after a rejection. The same individual reviews the revised submission.

- **No system-enforced rejection limit.** The system does not cap the number of rejection cycles. However, each cycle is audited and visible for management oversight.

- **Comments are reused, not appended.** The Decision Comments and Final Comments fields are single fields that get overwritten on each review cycle. They are not append-only logs. The audit table serves as the historical record.

# 4. SECURITY MATRIX

## 4.1 Overview

The Security Matrix is the definitive reference for field-level permissions in the Change Control module. It defines, for every combination of workflow state and user role, whether each of the 50 fields is **Editable** (the user can modify the value), **Read-Only** (the user can see the value but cannot modify it), or **Not Applicable** (the field is not relevant at this stage and displays a placeholder message instead of a value).

The Security Matrix is maintained as a separate Excel workbook ([Security Matrix](https://docs.google.com/spreadsheets/d/15is5F4rkpNn3Vbtpp-n9XNxFDokzMsec/edit?usp=drive_link&ouid=100894799912997246089&rtpof=true&sd=true)) using colour-coded cells:

- **Green cells** indicate the field is editable for that role in that state.

- **Red cells** indicate the field is read-only for that role in that state.

The matrix is structured with the 50 field names across the columns, grouped by their form section, and the state/role combinations down the rows. Each of the six workflow states contains four rows — one for each role (CC Owner, Approver, Viewer, Admin) — resulting in 24 permission rows across 50 field columns.

The Security Matrix governs **field-level permissions only**. Action-level permissions (who can create, submit, cancel, etc.) are documented separately in Section 8.4 of this BRD.

## 4.2 Field-Level Permissions by State & Role

**The complete colour-coded Security Matrix is maintained in the linked workbook:** [Security Matrix](https://docs.google.com/spreadsheets/d/15is5F4rkpNn3Vbtpp-n9XNxFDokzMsec/edit?usp=drive_link&ouid=100894799912997246089&rtpof=true&sd=true)**. **

The following is a summary of the permission distribution across all states and roles:

**Initiated State:**

- CC Owner: 25 fields editable, remaining fields are system-generated (read-only) or not applicable

- Approver: All fields read-only or not applicable

- Viewer: All fields read-only or not applicable

- Admin: All fields read-only or not applicable

**Pending Implementation Approval State:**

- CC Owner: All fields read-only (previously submitted values displayed as disabled inputs)

- Approver: 3 fields editable (Decision, Risk Level, Decision Comments), all others read-only or not applicable

- Viewer: All fields read-only or not applicable

- Admin: All fields read-only or not applicable

**In Implementation State:**

- CC Owner: 6 fields editable (Actual Implementation Date, Post-Implementation Issues, Implementation Summary, Deviations from Plan, Validation Performed, Implementation Evidence), all others read-only

- Approver: All fields read-only

- Viewer: All fields read-only

- Admin: All fields read-only

**Pending Final Approval State:**

- CC Owner: All fields read-only

- Approver: 2 fields editable (Final Decision, Final Comments), all others read-only

- Viewer: All fields read-only

- Admin: All fields read-only

**Closed State:**

- All roles: All 50 fields read-only. No editable fields for any role.

**Cancelled State:**

- All roles: All fields read-only. No editable fields for any role. Cancellation Reason field becomes visible (read-only).

## 4.3 System-Generated vs User-Editable Fields

The 50 fields in the Change Control form fall into two fundamental categories based on how their values are populated.

### 4.3.1 System-Generated Fields (13 fields)

System-generated fields are populated and managed entirely by the system. They are **always read-only** for all users in all states. No user, regardless of role, can directly edit these fields.

| **#** | **Field Name** | **How It Is Populated** |
| --- | --- | --- |
| 1 | CC-ID | Auto-generated unique identifier when a new CC is created (format: CC-XXX) |
| 2 | Current State | Automatically updated when a state transition occurs |
| 3 | Change Owner | Auto-populated with the name of the user who creates the CC record |
| 4 | Last Updated By | Auto-populated with the name of the user who last saved or submitted a change |
| 5 | Created On | Auto-populated with the date and time when the CC record was first created |
| 6 | Last Updated On | Auto-populated with the date and time of the most recent save or submission |
| 7 | Implementation Approval By | Auto-populated with the Approver's name when they submit an Approve decision at the Implementation Approval gate |
| 8 | Implementation Approval On | Auto-populated with the date and time when the Implementation Approval decision was submitted |
| 9 | Final Approval By | Auto-populated with the Approver's name when they submit an Approve decision at the Final Approval gate |
| 10 | Final Approval On | Auto-populated with the date and time when the Final Approval decision was submitted |
| 11 | Implementation Approval Status | System-managed status label that updates based on the workflow state (see Section 4.3.3) |
| 12 | Final Approval Status | System-managed status label that updates based on the workflow state (see Section 4.3.3) |
| 13 | Actual Closure Date | Auto-populated with the date and time when the state transitions to Closed |

### 4.3.2 User-Editable Fields (37 fields)

User-editable fields are populated by users during their designated workflow stages. Which user can edit which field at which state is governed by the Security Matrix. A user-editable field may be editable in one state and read-only in all other states. The 37 user-editable fields are distributed as follows:

- **25 fields** editable by the CC Owner in the Initiated state (Change Details, Planning, Impact & Risk Assessment, Implementation Plan & Validation, Assign Approver, Comments for Approver, Comments)

- **3 fields** editable by the Approver in the Pending Implementation Approval state (Decision, Risk Level, Decision Comments)

- **6 fields** editable by the CC Owner in the In Implementation state (Implementation Details)

- **2 fields** editable by the Approver in the Pending Final Approval state (Final Decision, Final Comments)

- **1 field** editable by the CC Owner during the cancellation action only (Cancellation Reason — entered via popup modal, not directly on the form)

- = **37 user-editable fields**

- **13 system-generated fields**

- = **50 total**

Total user-editable + system-generated = 37 + 13 = 50 fields.

### 4.3.3 System-Managed Status Labels

The Implementation Approval Status and Final Approval Status fields are system-managed labels that reflect the current position in the workflow. They are not directly editable by any user. The system sets these values automatically based on the current state:

| **Workflow State** | **Implementation Approval Status** | **Final Approval Status** |
| --- | --- | --- |
| Initiated | Not Submitted | Not Submitted |
| Pending Implementation Approval | Pending | Not Submitted |
| In Implementation | Approved | Not Submitted |
| Pending Final Approval | Approved | Pending |
| Closed | Approved | Approved |
| Cancelled | N/A | N/A |

**Important:** The status label value is "Not Submitted" (not "Not Yet Submitted"). Use the exact values from the table above throughout the system.

## 4.4 Permission Rules

The following rules govern how field-level permissions are applied across the system:

### 4.4.1 Core Permission Principles

**Rule P1 — Single Editor Per State:**

At any given state, at most one role has edit access to any fields. No two roles can edit the same record at the same time. This enforces the shared document model where users take turns.

**Rule P2 — Edit Access Is State-Bound:**

A field that is editable in one state becomes read-only in all subsequent states (with the exception of rejection loops, where the field returns to editable when the record loops back to the previous state).

**Rule P3 — System Fields Are Always Read-Only:**

The 13 system-generated fields (CC-ID, Current State, Change Owner, Last Updated By, Created On, Last Updated On, Implementation Approval By/On, Final Approval By/On, Implementation Approval Status, Final Approval Status, Actual Closure Date) are never editable by any user in any state.

**Rule P4 — Not Applicable Fields Show Placeholder:**

Fields that are not yet relevant to the current workflow stage display a "Not applicable" message with a contextual hint (e.g., "Not applicable — Available after approval"). These fields are not hidden; they are visible but clearly marked as not yet active.

**Rule P5 — Terminal States Lock Everything:**

In the Closed and Cancelled states, all 50 fields are read-only for all roles. No edits are possible.

**Rule P6 — Cancellation Reason Conditional Visibility:**

The Cancellation Reason field (field #50) is hidden in all states except Cancelled. It is only visible in the Cancelled state, displayed as read-only in the Additional Information section below Comments. The value is captured via a popup modal during the cancellation action, not through an inline form field.

**Rule P7 — Electronic Signature Identity Binding:**

A user may only sign as themselves. The credentials entered in the electronic signature prompt must match the currently authenticated session user. If the username entered does not match the logged-in user, the signature is rejected regardless of whether the credentials are otherwise valid. No user may sign on behalf of another user under any circumstances. 

Signature records are system-generated and permanently read-only. No role, including Admin, may create, edit, or delete a signature record.

**4.4.2 Target Closure Date Permission Rule**

The Target Closure Date field follows the same state-based permission model as all other fields, but its behaviour is worth highlighting:

- **Initiated state:** Editable by CC Owner (part of the 25 editable fields). This applies both on initial creation and when the record returns to Initiated after a rejection at the Implementation Approval gate.

- **All other states (Pending Implementation Approval, In Implementation, Pending Final Approval, Closed, Cancelled):** Read-only. Once the CC Owner submits for approval and the record leaves the Initiated state, the Target Closure Date cannot be modified unless the record is rejected back to Initiated.

### 4.4.3 Rejection and Permission Reset

When a record is rejected and loops back to a previous state, the field permissions reset to match the destination state:

- **Rejection at Implementation Approval (returns to Initiated):** All 25 CC Owner fields become editable again. The Approver's fields (Decision, Risk Level, Decision Comments) retain their values from the rejection but will be overwritten during the next review cycle.

- **Rejection at Final Approval (returns to In Implementation):** The 6 Implementation Details fields become editable for the CC Owner again. The Approver's Final Decision and Final Comments fields retain their values from the rejection but will be overwritten during the next review cycle.

## 4.5 Reference to Security Matrix Excel

The authoritative and complete Security Matrix is maintained in the accompanying Excel workbook:

**File:** [Security Matrix](https://docs.google.com/spreadsheets/d/15is5F4rkpNn3Vbtpp-n9XNxFDokzMsec/edit?usp=drive_link&ouid=100894799912997246089&rtpof=true&sd=true)

**Sheet:** Change Control

**Version:** 2.0

**Total Fields:** 50

**Total Permission Rows:** 24 (6 states × 4 roles)

This workbook should be treated as a controlled document. Any changes to field permissions must be reflected in both the Security Matrix Excel and this BRD. In the event of a discrepancy between this BRD narrative and the Security Matrix Excel, the **Security Matrix Excel takes precedence** for field-level permission questions.

For action-level permissions (Create CC, Submit for Approval, Cancel CC, etc.), refer to Section 8.4 of this BRD, which is the authoritative source for action permissions.

# 5. USER STORIES & USE CASES

This section defines the user stories for each role, describing what each user needs to accomplish within the Change Control module. Each story follows the format: "As a [role], I want to [action], so that [business value]." Acceptance criteria are provided for each story to define the conditions that must be met for the story to be considered complete.

## 5.1 CC Owner Stories

## US-CC-01: Create a New Change Control

**As a** CC Owner, **I want to** create a new Change Control record, **so that** I can formally document a proposed change and initiate the approval process.

**Acceptance Criteria:**

- The "+ Create Change Control" button is visible on the Dashboard and accessible from the navigation only to users with the CC Owner role.

- Clicking the button opens a new CC form in the Initiated state with a system-generated CC-ID.

- The Change Owner field is automatically populated with my name and is read-only.

- Created On and Last Updated On are automatically populated with the current date and time.

- Last Updated By is automatically populated with who modified the record last.

- All 25 user-editable fields are displayed as active input controls.

- Implementation Details fields display as "Not applicable — Available after approval."

- Approval fields display as "Not applicable — Pending submission" or similar contextual placeholders.

- Implementation Approval Status displays "Not Submitted" and Final Approval Status displays "Not Submitted."

- The "Save Draft," "Submit for Approval," and "Cancel CC" buttons are available.

## US-CC-02: Save a Draft Change Control

**As a** CC Owner, **I want to** save my Change Control as a draft without submitting it, **so that** I can return to it later and continue filling in the details.

**Acceptance Criteria:**

- Clicking "Save Draft" saves all currently entered field values without triggering mandatory field validation.

- The record remains in the Initiated state with all 25 fields still editable.

- The Last Updated On and Last Updated By fields are updated to reflect the save action.

- The saved record appears in the My Change Controls list and the All Change Controls list with the status "Initiated."

- I can reopen the saved draft and continue editing at any time.

## US-CC-03: Submit a Change Control for Approval

**As a** CC Owner, **I want to** submit my completed Change Control for implementation approval, **so that** the assigned Approver can review and evaluate the proposed change.

**Acceptance Criteria:**

- Clicking "Submit for Approval" triggers validation of all mandatory fields. If any mandatory field is empty, the submission is blocked and a validation error is displayed identifying the missing fields.

- The Proposed Implementation Date is validated to be ≥ 2 business days from the current date at the time of submission. If it is in the past or less than 2 business days away, the submission is blocked with a validation error.

- The Target Closure Date is validated to be ≥ 10 business days from the current date at the time of submission. If it is in the past or less than 10 business days away, the submission is blocked with a validation error.

- On successful validation, the state transitions from Initiated to Pending Implementation Approval.

- An email notification is sent to the assigned Approver with a task due date of Submission Date + 5 business days.

- All 25 previously editable fields become read-only for me.

- Implementation Approval Status changes from "Not Submitted" to "Pending."

- I can still view the record but cannot edit any fields.

## US-CC-04: Cancel a Change Control

**As a** CC Owner, **I want to** cancel a Change Control that I created while it is still in the Initiated state, **so that** I can formally terminate a change request that is no longer needed.

**Acceptance Criteria:**

- The "Cancel CC" button is visible only when the record is in the Initiated state and only to me as the owner of that specific record.

- Clicking "Cancel CC" displays a popup modal with the title "Cancel Change Control," a confirmation message including the CC-ID, a mandatory Cancellation Reason text area (max 500 characters), a "Confirm Cancellation" button (red), and a "Go Back" button (grey).

- I cannot confirm the cancellation without entering a Cancellation Reason. Empty or whitespace-only values are rejected.

- On confirmation, the state transitions from Initiated to Cancelled permanently.

- The Cancellation Reason is saved as field #50 on the record.

- All fields become read-only.

- The Cancellation Reason is displayed in the Additional Information section below the Comments field, visible as read-only.

- Implementation Approval Status and Final Approval Status both display "N/A."

- An email notification is sent to the assigned Approver (if one was selected).

- The audit log captures the state transition and the Cancellation Reason.

- The cancellation cannot be undone. There is no "reopen" or "reactivate" action.

## US-CC-05: Revise and Resubmit After Rejection at Implementation Approval

**As a** CC Owner, **I want to** revise my Change Control after it has been rejected at the Implementation Approval gate and resubmit it, **so that** I can address the Approver's feedback and continue the approval process.

**Acceptance Criteria:**

- When the record is rejected, I receive an email notification informing me that the record needs revision.

- The record returns to the Initiated state and all 25 fields become editable again.

- Previously entered values are preserved — I revise what needs to change, not re-create from scratch.

- The Approver's rejection comments (Decision Comments) are visible to me so I can understand what needs to be addressed.

- I can update any of the 25 editable fields as needed.

- Date validations are re-applied at the time of resubmission (both dates must still be in the future and meet the minimum lead-time requirements based on the new current date).

- On resubmission, the state transitions back to Pending Implementation Approval and a new notification is sent to the Approver.

## US-CC-06: Complete Implementation Details

**As a** CC Owner, **I want to** document the implementation details after my change has been approved, **so that** I can provide evidence that the change was executed as planned and is ready for final review.

**Acceptance Criteria:**

- When the record is in the In Implementation state, I have edit access to 6 fields: Actual Implementation Date, Post-Implementation Issues, Implementation Summary, Deviations from Plan, Validation Performed, and Implementation Evidence (file upload).

- All original change detail fields are displayed as read-only showing the values I submitted.

- The Approver's decision fields (Decision, Risk Level, Decision Comments) are displayed as read-only showing the approved values.

- Implementation Approval By and Implementation Approval On display the Approver's name and the timestamp of approval.

- The "Submit for Final Approval" button is available.

## US-CC-07: Submit for Final Approval

**As a** CC Owner, **I want to** submit my completed implementation for final approval, **so that** the Approver can verify the implementation was successful and close the Change Control.

**Acceptance Criteria:**

- Clicking "Submit for Final Approval" transitions the state from In Implementation to Pending Final Approval.

- An email notification is sent to the assigned Approver with a task due date of Target Closure Date.

- All fields, including the 6 implementation detail fields, become read-only for me.

- Final Approval Status changes from "Not Submitted" to "Pending."

## US-CC-08: Revise and Resubmit After Rejection at Final Approval

**As a** CC Owner, **I want to** revise my implementation details after the final approval has been rejected, **so that** I can improve the implementation documentation and resubmit for final review.

**Acceptance Criteria:**

- When the final approval is rejected, I receive an email notification informing me that the implementation documentation needs improvement.

- The record returns to the In Implementation state and the 6 implementation detail fields become editable again.

- Previously entered implementation values are preserved for revision.

- The Approver's rejection feedback (Final Comments) is visible to me.

- On resubmission, the state transitions back to Pending Final Approval and a new notification is sent to the Approver.

## US-CC-09: View All Change Controls

**As a** CC Owner, **I want to** view all Change Controls in the system (not just my own), **so that** I can see the overall change activity and find records relevant to my work.

**Acceptance Criteria:**

- The All Change Controls list view is accessible from the navigation.

- The list displays all CC records in the system regardless of ownership.

- I can view any record by clicking on it, though my edit access depends on whether I am the owner and what state the record is in.

## US-CC-10: View My Change Controls

**As a** CC Owner, **I want to** see a filtered list of only the Change Controls I own, **so that** I can quickly find and manage my own records.

**Acceptance Criteria:**

- The My Change Controls list view is accessible from the navigation.

- The list displays only CC records where I am the Change Owner.

- Each record shows the CC-ID, Change Title, Current State, and last updated date.

## 5.2 Approver Stories

## US-AP-01: View Pending Approvals Queue

**As an** Approver, **I want to** see a queue of Change Controls that are pending my review, **so that** I can prioritise and manage my approval workload.

**Acceptance Criteria:**

- The Approvals view is accessible from the navigation.

- The list displays only CC records where I am the assigned Approver and the record is in a state requiring my action (Pending Implementation Approval or Pending Final Approval).

- Each record shows the CC-ID, Change Title, CC Owner, Current State, and date submitted.

- The Dashboard also displays a "Pending Approvals" card showing the count and list of items awaiting my decision.

## US-AP-02: Review and Approve at Implementation Approval Gate

**As an** Approver, **I want to** review a submitted Change Control, assess the risk, and approve it for implementation, **so that** the CC Owner can proceed with implementing the change.

**Acceptance Criteria:**

- When I open a record in the Pending Implementation Approval state, all CC Owner-submitted fields are displayed as read-only so I can review the full change request.

- I have edit access to exactly 3 fields: Decision (dropdown: Approve/Reject), Risk Level (dropdown: Low/Medium/High), and Decision Comments (text area).

- I set the Decision field to "Approve," set the Risk Level, and enter Decision Comments.

- Clicking "Submit Decision" transitions the state to In Implementation.

- Implementation Approval By is populated with my name and Implementation Approval On is populated with the current timestamp.

- An email notification is sent to the CC Owner with a task due date of Target Closure Date − 3 business days.

- Implementation Approval Status changes from "Pending" to "Approved."

## US-AP-03: Review and Reject at Implementation Approval Gate

**As an** Approver, **I want to** reject a submitted Change Control that does not meet the required standard, **so that** the CC Owner can revise and improve it before implementation begins.

**Acceptance Criteria:**

- I set the Decision field to "Reject" and enter Decision Comments explaining the reason for rejection.

- Clicking "Submit Decision" transitions the state from Pending Implementation Approval back to Initiated.

- The audit log captures my Decision ("Reject"), Risk Level (if set), and Decision Comments.

- An email notification is sent to the CC Owner informing them of the rejection and the need to revise and resubmit.

- Implementation Approval Status returns to "Not Submitted" (the record is back in Initiated).

## US-AP-04: Review and Approve at Final Approval Gate

**As an** Approver, **I want to** review the implementation evidence and approve the final closure of the Change Control, **so that** the change is formally completed and the record is closed.

**Acceptance Criteria:**

- When I open a record in the Pending Final Approval state, all fields including the 6 implementation details are displayed as read-only for my review.

- I have edit access to exactly 2 fields: Final Decision (dropdown: Approve/Reject) and Final Comments (text area).

- I set the Final Decision to "Approve" and enter Final Comments.

- Clicking "Submit Decision" transitions the state to Closed.

- Final Approval By is populated with my name and Final Approval On is populated with the current timestamp.

- Actual Closure Date is system-generated with the current date and time.

- An email notification is sent to the CC Owner confirming the Change Control has been closed successfully.

- Implementation Approval Status displays "Approved" and Final Approval Status displays "Approved."

## US-AP-05: Review and Reject at Final Approval Gate

**As an** Approver, **I want to** reject the implementation if the evidence or documentation is insufficient, **so that** the CC Owner can improve the implementation details before the record is closed.

**Acceptance Criteria:**

- I set the Final Decision field to "Reject" and enter Final Comments explaining what needs improvement.

- Clicking "Submit Decision" transitions the state from Pending Final Approval back to In Implementation.

- The audit log captures my Final Decision ("Reject") and Final Comments.

- An email notification is sent to the CC Owner informing them that the implementation documentation needs improvement.

- Final Approval Status returns to "Not Submitted" (the record is back in In Implementation).

## US-AP-06: Re-Review After CC Owner Revision

**As an** Approver, **I want to** re-review a Change Control that I previously rejected after the CC Owner has revised it, **so that** I can evaluate whether the issues have been addressed.

**Acceptance Criteria:**

- When a previously rejected record is resubmitted, I receive an email notification.

- I can see the revised content in the record.

- The same editable fields are available to me as during the original review (3 fields at Implementation Approval gate, 2 fields at Final Approval gate).

- My new Decision, Risk Level, and Comments overwrite the previous rejection values on the record.

- The audit log preserves the old rejection values before they are overwritten, maintaining a complete review history.

## 5.3 Viewer Stories

## US-VI-01: View All Change Controls

**As a** Viewer, **I want to** view all Change Controls in the system, **so that** I can monitor change activity and stay informed about ongoing and completed changes.

**Acceptance Criteria:**

- I can access the All Change Controls list view from the navigation.

- The list displays all CC records in the system across all states.

- I can open any record and see all fields and sections in read-only mode.

- No edit controls, workflow action buttons, or submission buttons are displayed to me.

- Zero fields are editable for me in any state.

## US-VI-02: View Dashboard Overview

**As a** Viewer, **I want to** see the Dashboard with system-wide statistics, **so that** I can get a quick overview of Change Control activity across the organisation.

**Acceptance Criteria:**

- The Dashboard displays Overview statistics showing the count of records in each state (Initiated, Pending Implementation Approval, In Implementation, Pending Final Approval, Closed).

- The "Pending Approvals" and "My Drafts" cards show empty states (since I do not participate in the workflow).

- The "+ Create Change Control" button is not visible to me.

## US-VI-03: View Individual Change Control Detail

**As a** Viewer, **I want to** open and read a specific Change Control record in full detail, **so that** I can review the change documentation, decisions, and implementation evidence for audit or stakeholder purposes.

**Acceptance Criteria:**

- I can open any CC record from the All Change Controls list.

- All form sections and fields are displayed with their current values.

- Fields that are "Not applicable" at the record's current state display the same placeholder messages as other roles see.

- All fields are read-only. No input controls are active.

- No action buttons (Submit, Cancel, Submit Decision) are displayed.

## 5.4 Admin Stories

## US-AD-01: Create a New User

**As an** Admin, **I want to** create new user accounts in the system, **so that** team members can access the Change Control module with the appropriate role.

**Acceptance Criteria:**

- The Settings page includes a "Create New User" section visible only to Admins.

- I can enter the user's full name, email address, password, and select a role from the four available roles (CC Owner, Approver, Viewer, Admin).

- On creation, the new user can immediately sign in with the credentials I set.

- The audit log captures the user creation event including the assigned role.

- The new user appears in the All Users table.

## US-AD-02: Manage User Roles

**As an** Admin, **I want to** change a user's role, **so that** I can adjust permissions when team members' responsibilities change.

**Acceptance Criteria:**

- The All Users table in Settings displays each user's name, email, current role, and action buttons.

- I can edit a user's Full Name.

- I can change a user's role by selecting a new role from the available options.

- The system shall block the role change if the user has any active CC records (records in any state other than Closed or Cancelled) where they are either the CC Owner or the assigned Approver. The system shall display an error message identifying the active CC-IDs that must be resolved before the role change can proceed.

- If no active records exist, the role change takes effect immediately for the user's future actions.

- The audit log captures the role change event including the old role and new role.

- Existing Closed or Cancelled CC records owned by or assigned to the user continue to display their name as the Change Owner or Approver — these historical references are not affected by the role change.

- I cannot edit a user's email address (set at creation only).

- I cannot reset a user's password through the application (password resets are handled through the Forgot Password flow or at the database level).

## US-AD-03: Deactivate a User

**As an** Admin, **I want to** deactivate a user account, **so that** I can revoke access for users who no longer need it while preserving their historical data.

**Acceptance Criteria:**

- I can deactivate a user from the All Users table.

- A deactivated user can no longer sign in to the system.

- The user's historical data is preserved — CC records they created or approved still reference their name.

- The user record is retained in the system (not deleted) for audit purposes.

- The audit log captures the deactivation event.

- A user cannot be deactivated while they are the CC Owner or assigned Approver on any active Change Control record. The system lists the blocking CC-IDs. This mirrors the role-change restriction in BR-8.4.11.

## US-AD-04: View All Change Controls (Read-Only)

**As an** Admin, **I want to** view all Change Controls in the system, **so that** I can monitor the overall change management activity.

**Acceptance Criteria:**

- I can access the All Change Controls list view and open any record.

- All fields are displayed as read-only, identical to the Viewer experience.

- No workflow action buttons are displayed to me on CC records.

- Zero fields are editable for me on CC records in any state.

- The "+ Create Change Control" button is not visible to me.

## US-AD-05: Edit User Profile

**As an** Admin, **I want to** edit a user's full name, **so that** I can keep user records accurate when names change (e.g., legal name change, name correction).

**Acceptance Criteria:**

- I can edit the Full Name field for any user in the All Users table.

- The updated name is reflected across the system wherever the user's name is displayed (e.g., Change Owner field on new records, Approver dropdown, user lists).

- Historical references in existing CC records (Change Owner, Approver names in closed/cancelled records) may or may not be updated — this is an implementation decision. The BRD does not prescribe retroactive name updates on historical records.

- The audit log captures the name change with old and new values.

# 6. FUNCTIONAL REQUIREMENTS

This section defines the functional requirements of the Change Control module, describing what the system must do across each major capability area. Requirements are identified with a prefix (FR-) for traceability. Each requirement is written from a business perspective without reference to specific technology stack or implementation approach.

## 6.1 Change Control Creation	

### 6.1.1 Record Initiation

**FR-6.1.1:** The system shall allow users with the CC Owner role to create new Change Control records by clicking the "+ Create Change Control" button.

**FR-6.1.2:** The "+ Create Change Control" button shall be visible only to users with the CC Owner role. Users with Approver, Viewer, or Admin roles shall not see this button.

**FR-6.1.3:** On creation of a new Change Control, the system shall automatically generate and assign a unique CC-ID to the record. The CC-ID format shall follow the pattern CC-XXX (e.g., CC-001, CC-002, CC-003), with a sequential numeric portion. The CC-ID is permanent and cannot be changed.

**FR-6.1.4:** On creation, the system shall automatically populate the following fields:

- **CC-ID:** System-generated unique identifier

- **Current State:** Set to "Initiated"

- **Change Owner:** Set to the full name of the user who created the record

- **Last Updated By:** Set to the full name of the creating user

- **Created On:** Set to the current date and time

- **Last Updated On:** Set to the current date and time

- **Implementation Approval Status:** Set to "Not Submitted"

- **Final Approval Status:** Set to "Not Submitted"

**FR-6.1.5:** All system-generated fields populated at creation shall be read-only and cannot be modified by any user.

### 6.1.2 Form Structure at Creation

**FR-6.1.6:** The new CC form shall display all 50 fields organised into the following sections: Change Details (Identification, Change Definition, Planning), Impact & Risk Assessment, Implementation Plan & Validation, Implementation Details, Approvals (Initiation, Implementation Approval, Final Approval, Status), and Additional Information.

**FR-6.1.7:** In the Initiated state, the CC Owner shall have edit access to 25 fields as defined in the Security Matrix. All other fields shall be displayed as system-managed (read-only), not applicable (with contextual placeholder messages), or not yet populated (displayed as "—").

**FR-6.1.8:** Implementation Details fields (Actual Implementation Date, Post-Implementation Issues, Implementation Summary, Deviations from Plan, Validation Performed, Implementation Evidence) shall display as "Not applicable — Available after approval" in the Initiated state.

**FR-6.1.9:** Implementation Approval fields (Decision, Risk Level, Decision Comments) shall display as "Not applicable — Pending submission" or "Not applicable — Will be set by approver during review" in the Initiated state.

**FR-6.1.10:** Final Approval fields (Final Decision, Final Comments) shall display as "Not applicable — Pending implementation" in the Initiated state.

**FR-6.1.11:** The Cancellation Reason field shall be hidden in the Initiated state (and all states except Cancelled). It shall not appear on the form.

### 6.1.3 Save Draft

**FR-6.1.12:** The system shall provide a "Save Draft" function that saves all currently entered field values without triggering mandatory field validation.

**FR-6.1.13:** Saving a draft shall not change the record's state. The record shall remain in the Initiated state with all 25 fields still editable.

**FR-6.1.14:** On save, the system shall update the Last Updated By and Last Updated On fields to reflect the save action.

### 6.1.4 Submission for Approval

**FR-6.1.15:** The system shall provide a "Submit for Approval" button visible to the CC Owner in the Initiated state.

**FR-6.1.16:** On clicking "Submit for Approval," the system shall validate all mandatory fields. If any mandatory field is empty or contains only whitespace, the submission shall be blocked and the system shall display a validation error identifying each field that requires attention.

**FR-6.1.17:** On clicking "Submit for Approval," the system shall validate date fields as follows:

- The Proposed Implementation Date must be in the future (greater than the current date at the time of submission).

- The Proposed Implementation Date must be ≥ 2 business days from the current date.

- The Target Closure Date must be in the future (greater than the current date at the time of submission).

- The Target Closure Date must be ≥ 10 business days from the current date.

- If either date fails validation, the submission shall be blocked and the system shall display a specific validation error (e.g., "Proposed Implementation Date cannot be in the past. Please update.").

**FR-6.1.18:** If the user updates the dates after a validation failure, the system shall re-validate the dates against the new current date at the time of the subsequent submission attempt.

**FR-6.1.19:** On successful validation, the system shall transition the record from Initiated to Pending Implementation Approval. See Section 6.2 for the approval workflow requirements.

## 6.2 Approval Workflow

### 6.2.1 Approver Assignment

**FR-6.2.1:** The CC Owner shall assign an Approver during the Initiated state using the "Assign Approver" dropdown field.

**FR-6.2.2:** The "Assign Approver" dropdown shall only display users who hold the Approver role in the system. Users with CC Owner, Viewer, or Admin roles shall not appear in this dropdown.

**FR-6.2.3:** The system shall enforce segregation of duties. Since each user can hold only one role at a time, a CC Owner will never appear in the Approver dropdown (which only displays users with the Approver role). To prevent edge cases where a role change could create a conflict, the system shall block Admin from changing a user's role if that user has any active CC records (records in any state other than Closed or Cancelled) where they are either the CC Owner or the assigned Approver. See Section 8.4 (BR-8.4.11) for the detailed business rule.

**FR-6.2.4:** Once assigned, the same Approver shall be responsible for both approval gates (Implementation Approval and Final Approval) on that record.

### 6.2.2 Implementation Approval Gate (First Approval)

**FR-6.2.5:** When a record enters the Pending Implementation Approval state, the assigned Approver shall have edit access to exactly 3 fields: Decision (dropdown: Approve / Reject), Risk Level (dropdown: Low / Medium / High), and Decision Comments (text area).

**FR-6.2.5a:** When submitting a decision at the Implementation Approval gate, the Approver must populate all three fields: Decision (mandatory), Risk Level (mandatory), and Decision Comments (mandatory). The submission shall be blocked if any of these three fields is empty.

**FR-6.2.6:** All other fields shall be displayed as read-only to the Approver, showing the values submitted by the CC Owner.

**FR-6.2.7:** The system shall provide a single "Submit Decision" button to the assigned Approver. There shall be no separate "Approve" and "Reject" buttons.

**FR-6.2.8:** On clicking "Submit Decision," the system shall read the value of the Decision field to determine the state transition:

- If Decision = "Approve": the state transitions to In Implementation.

- If Decision = "Reject": the state transitions to Initiated (loop back).

**FR-6.2.9:** On approval (Decision = "Approve"), the system shall:

- Transition the state to In Implementation.

- Populate Implementation Approval By with the Approver's name (system-generated, read-only).

- Populate Implementation Approval On with the current date and time (system-generated, read-only).

- Update Implementation Approval Status to "Approved."

- Save the Decision, Risk Level, and Decision Comments values to the record.

- Send an email notification to the CC Owner with a task due date of Target Closure Date − 3 business days.

- Log the approval in the audit trail.

**FR-6.2.10:** On rejection (Decision = "Reject"), the system shall:

- Transition the state back to Initiated.

- Save the Decision ("Reject"), Risk Level (if set), and Decision Comments values to the record.

- Capture the Decision, Risk Level, and Decision Comments in the audit log before they can be overwritten during re-review.

- Send an email notification to the CC Owner informing them of the rejection and the need to revise and resubmit.

- Reset Implementation Approval Status to "Not Submitted."

- Log the rejection in the audit trail.

**FR-6.2.11:** The CC Owner's view of a record in Pending Implementation Approval shall show all fields as read-only. The "Submit Decision" button shall not be displayed to the CC Owner. The CC Owner waits for the Approver's decision.

### 6.2.3 Rejection and Resubmission at Implementation Approval

**FR-6.2.12:** When a record is rejected at the Implementation Approval gate and returns to the Initiated state, all 25 CC Owner-editable fields shall become editable again, including Target Closure Date.

**FR-6.2.13:** Previously entered field values shall be preserved when the record returns to Initiated. The CC Owner revises existing values rather than re-entering them from scratch.

**FR-6.2.14:** Date validations shall be re-applied at the time of resubmission. Both dates must be in the future and meet the minimum lead-time requirements based on the current date at the time of the new submission attempt.

**FR-6.2.15:** On resubmission, the standard "Submit for Approval" validation and transition process applies (see FR-6.1.15 through FR-6.1.19).

### 6.2.4 Final Approval Gate (Second Approval)

**FR-6.2.16:** When a record enters the Pending Final Approval state, the assigned Approver shall have edit access to exactly 2 fields: Final Decision (dropdown: Approve / Reject) and Final Comments (text area).

**FR-6.2.16a:** When submitting a decision at the Final Approval gate, the Approver must populate both fields: Final Decision (mandatory) and Final Comments (mandatory). The submission shall be blocked if either field is empty.

**FR-6.2.17:** All other fields, including the 6 Implementation Details fields and the 3 Implementation Approval fields, shall be displayed as read-only to the Approver.

**FR-6.2.18:** The system shall provide a single "Submit Decision" button to the assigned Approver, identical in behaviour to the Implementation Approval gate.

**FR-6.2.19:** On clicking "Submit Decision," the system shall read the value of the Final Decision field to determine the state transition:

- If Final Decision = "Approve": the state transitions to Closed.

- If Final Decision = "Reject": the state transitions to In Implementation (loop back).

**FR-6.2.20:** On final approval (Final Decision = "Approve"), the system shall:

- Transition the state to Closed.

- Populate Final Approval By with the Approver's name (system-generated, read-only).

- Populate Final Approval On with the current date and time (system-generated, read-only).

- Populate Actual Closure Date with the current date and time (system-generated, read-only).

- Update Final Approval Status to "Approved."

- Save the Final Decision and Final Comments values to the record.

- Send an email notification to the CC Owner confirming the Change Control has been closed successfully.

- Log the final approval in the audit trail.

**FR-6.2.21:** On final rejection (Final Decision = "Reject"), the system shall:

- Transition the state back to In Implementation.

- Save the Final Decision ("Reject") and Final Comments values to the record.

- Capture the Final Decision and Final Comments in the audit log before they can be overwritten during re-review.

- Send an email notification to the CC Owner informing them that the implementation documentation needs improvement.

- Reset Final Approval Status to "Not Submitted."

- Log the rejection in the audit trail.

### 6.2.5 Rejection and Resubmission at Final Approval

**FR-6.2.22:** When a record is rejected at the Final Approval gate and returns to the In Implementation state, the 6 Implementation Details fields shall become editable for the CC Owner again.

**FR-6.2.23:** Previously entered implementation detail values shall be preserved for revision.

**FR-6.2.24:** The Approver's rejection feedback (Final Comments) shall remain visible to the CC Owner as a read-only field so they understand what needs improvement.

**FR-6.2.25:** On resubmission via "Submit for Final Approval," the standard transition to Pending Final Approval applies, and a new notification is sent to the Approver.

### 6.2.6 Approval Comments Behaviour

**FR-6.2.26:** Decision Comments (at the Implementation Approval gate) shall be used for both Approve and Reject decisions. There is no separate "Rejection Comments" field. The same field captures the Approver's rationale regardless of the decision.

**FR-6.2.27:** Final Comments (at the Final Approval gate) shall follow the same behaviour: used for both Approve and Reject decisions.

**FR-6.2.28:** When an Approver re-reviews a record after a rejection cycle, the new Decision Comments or Final Comments overwrite the previous values in the record. The old values are preserved in the audit log before overwrite, maintaining a complete comment history across review cycles.

**FR-6.2.29: Role Change Restriction for Active Records**

The system shall prevent an Admin from changing a user's role if that user is associated with any active Change Control records. A record is considered "active" if it is in any state other than Closed or Cancelled.

The restriction applies when the user is:

- The CC Owner (creator) of an active record, OR

- The assigned Approver on an active record

When the Admin attempts to change a user's role and active records exist, the system shall:

- Block the role change.

- Display an error message identifying the active CC-IDs preventing the change (e.g., "Cannot change role: User is associated with active records CC-001, CC-003. These records must be Closed or Cancelled before the role change can proceed.").

This requirement prevents segregation of duties violations that could occur if a CC Owner's role were changed to Approver while they have active records.

**FR-6.2.30: Electronic Signature Prompt on Decision Submission** 

When an Approver clicks "Submit Decision" at either approval gate, the system shall display an electronic signature modal before committing the decision. The modal shall display the action being signed and its meaning and shall require the Approver to enter their username and password.

**FR-6.2.31: Signature Validation** 

The system shall validate that (a) the username entered matches the currently logged-in user, and (b) the password is correct for that user. Both conditions must be satisfied. If either fails, the system shall display an error, record the failed attempt in the audit trail, and leave the record in its current state. The user may retry.

**FR-6.2.32: Transition Commitment on Successful Signature**

Only upon successful signature validation shall the system commit the state transition, populate the approval fields (Decision/Final Decision, Risk Level, Comments, Approval By, Approval On), write the audit entries, create the signature record, and dispatch notifications. All of these shall occur as a single atomic operation — a failed signature results in no change to the record.

**FR-6.2.33: Signature Record Creation**

Upon successful signature, the system shall create a permanent signature record capturing: the signer's user identifier, the signer's full name at time of signing, the date and time of signing, the Change Control record signed, the state transition performed, and the meaning of the signature (see BR-8.8.4).

**FR-6.2.34: Signature Prompt on Submit for Approval**

When a CC Owner clicks "Submit for Approval" (T2), the system shall require an electronic signature following the same validation and commitment rules as FR-6.2.30 through FR-6.2.33, with signature meaning "Submitted for Implementation Approval". The signature prompt shall appear only after all mandatory field and date validations have passed.

**FR-6.2.35: Signature Prompt on Submit for Final Approval**

When a CC Owner clicks "Submit for Final Approval" (T6), the system shall require an electronic signature following the same rules, with signature meaning "Submitted for Final Approval". The signature prompt shall appear only after all implementation detail validations have passed.

## 6.3 Implementation Tracking

### 6.3.1 Implementation State

**FR-6.3.1:** When a record enters the In Implementation state (via approval at the Implementation Approval gate or via rejection at the Final Approval gate), the CC Owner shall have edit access to 6 fields: Actual Implementation Date, Post-Implementation Issues, Implementation Summary, Deviations from Plan, Validation Performed, and Implementation Evidence.

**FR-6.3.2:** All original change detail fields (Change Definition, Planning, Impact & Risk Assessment, Implementation Plan & Validation) shall be displayed as read-only in this state.

**FR-6.3.3:** The Implementation Approval fields (Decision, Risk Level, Decision Comments, Implementation Approval By, Implementation Approval On) shall be displayed as read-only showing the approved values.

**FR-6.3.4:** Implementation Approval Status shall display "Approved" and Final Approval Status shall display "Not Submitted."

**FR-6.3.5:** The system shall provide a "Submit for Final Approval" button to the CC Owner in the In Implementation state.

### 6.3.2 Implementation Evidence Upload

**FR-6.3.6:** The Implementation Evidence field shall support file upload functionality, allowing the CC Owner to attach evidence of the completed implementation.

**FR-6.3.6a:** The Implementation Evidence field is mandatory. The CC Owner must upload an evidence file before submitting for final approval.

**FR-6.3.7:** Supported file types for Implementation Evidence shall be the same as for Supporting Documents: PDF, DOCX, XLSX, and image files (PNG, JPG).

**FR-6.3.8:** Maximum file size shall be 10MB per file.

**FR-6.3.9:** Each file upload field supports a single file upload. Users should combine related documents into one file before uploading.

## 6.4 Notifications & Task Management

### 6.4.1 Notification Delivery

**FR-6.4.1:** The system shall send email notifications to relevant users at each state transition. Notifications shall be the primary mechanism for informing users of required actions.

**FR-6.4.2:** Each email notification shall include the CC-ID and a summary of the required action. Notifications shall not contain direct clickable links to the CC record within the application.

**FR-6.4.3:** Email notifications shall use templates appropriate to each notification type, providing clear and consistent communication.

### 6.4.2 Notification Triggers

The following table defines all notification triggers, recipients, and content:

| **#** | **Trigger Event** | **Recipient** | **Notification Content** | **Task Due Date** |
| --- | --- | --- | --- | --- |
| N1 | CC Owner clicks "Submit for Approval" (Initiated → Pending Implementation Approval) | Assigned Approver | New CC submitted for your review. Review and submit your decision. | Submission Date + 5 business days |
| N2 | Approver Decision = Approve (Pending Implementation Approval → In Implementation) | CC Owner | Your CC has been approved for implementation. Begin implementation and document details. | Target Closure Date − 3 business days |
| N3 | Approver Decision = Reject (Pending Implementation Approval → Initiated) | CC Owner | Your CC has been rejected. Review the Approver's comments, revise, and resubmit. | None |
| N4 | CC Owner clicks "Submit for Final Approval" (In Implementation → Pending Final Approval) | Assigned Approver | Implementation complete. Review implementation evidence and submit your final decision. | Target Closure Date |
| N5 | Approver Final Decision = Approve (Pending Final Approval → Closed) | CC Owner | Your CC has been approved and closed successfully. | None |
| N6 | Approver Final Decision = Reject (Pending Final Approval → In Implementation) | CC Owner | Final approval rejected. Improve implementation documentation and resubmit. | None |
| N7 | CC Owner cancels CC (Initiated → Cancelled) | Assigned Approver (if one was assigned) | CC has been cancelled by the CC Owner. | None |

### 6.4.3 Task Due Dates

**FR-6.4.4:** Task due dates are communicated via email notifications only. There is no task calendar, task list UI, or task management interface in Phase 1.

**FR-6.4.5:** Task due dates are calculated as follows:

**Task 1 — Implementation Approval Review:**

- Assignee: Approver

- Due Date: Submission Date + 5 business days

- Triggered when: Record transitions to Pending Implementation Approval (Notification N1)

**Task 2 — Implementation Completion:**

- Assignee: CC Owner

- Due Date: Target Closure Date − 3 business days

- Triggered when: Record transitions to In Implementation via approval (Notification N2)

**Task 3 — Final Approval Review:**

- Assignee: Approver

- Due Date: Target Closure Date

- Triggered when: Record transitions to Pending Final Approval (Notification N4)

**FR-6.4.6:** Business days calculations shall exclude weekends (Saturday and Sunday). Public holiday handling is not required in Phase 1.

**FR-6.4.7:** There is no auto-escalation, reminder email, or overdue notification mechanism in Phase 1. If a task is overdue, it is tracked through the audit table for manual management review (see Section 13.1 for known limitations).

The frontend shall refresh the access token proactively at approximately 24 minutes (80% of its 30-minute lifetime). The session's inactivity window is 2 hours.

## 6.5 Cancellation

### 6.5.1 Cancellation Eligibility

**FR-6.5.1:** Cancellation is available only when the record is in the Initiated state. Once a record has been submitted for approval or is in any subsequent state (Pending Implementation Approval, In Implementation, Pending Final Approval, Closed), it cannot be cancelled.

**FR-6.5.2:** Only the CC Owner of that specific record can cancel it. Other users with the CC Owner role cannot cancel a record they did not create. Users with Approver, Viewer, or Admin roles cannot cancel any record.

**FR-6.5.3:** The "Cancel CC" button shall be visible only when both conditions are met: the record is in the Initiated state, and the logged-in user is the CC Owner of that record.

### 6.5.2 Cancellation Workflow

**FR-6.5.4:** When the CC Owner clicks "Cancel CC," the system shall display a popup modal with the following elements:

- Title: "Cancel Change Control"

- Confirmation message: "Are you sure you want to cancel CC-[ID]? This action cannot be undone."

- Cancellation Reason field: Text area, mandatory, maximum 500 characters

- "Confirm Cancellation" button (red/danger styling)

- "Go Back" button (grey/secondary styling)

**FR-6.5.5:** The Cancellation Reason field in the popup modal is mandatory. The system shall not allow confirmation if the field is empty or contains only whitespace.

**FR-6.5.6:** Clicking "Go Back" shall close the popup modal and return the user to the CC form with no changes made.

**FR-6.5.7:** On clicking "Confirm Cancellation" with a valid Cancellation Reason:

- The state transitions from Initiated to Cancelled.

- The Cancellation Reason is saved to the CC record as field #50.

- All fields become read-only for all roles.

- The Cancellation Reason field becomes visible in the Additional Information section, below the Comments field, displayed as a read-only text area.

- Implementation Approval Status is set to "N/A."

- Final Approval Status is set to "N/A."

- If an Approver was previously assigned to the record, an email notification is sent to inform them of the cancellation.

- The audit log captures the state transition (Initiated → Cancelled) and the Cancellation Reason value.

### 6.5.3 Cancellation Permanence

**FR-6.5.8:** Cancellation is a permanent, irreversible action. There is no "reopen," "reactivate," or "undo cancellation" function. Once cancelled, the record remains in the Cancelled state indefinitely.

**FR-6.5.9:** Cancelled records are retained in the system permanently. They are not deleted, archived, or hidden. They remain visible and accessible in the All Change Controls list and can be opened and viewed by any user.

**FR-6.5.10:** No workflow action buttons shall be displayed on a Cancelled record for any role.

**FR-6.5.11:** The cancellation modal shall collect both the mandatory Cancellation Reason and the CC Owner's electronic signature (username and password) in a single dialog. The cancellation shall be committed only upon successful signature validation. The signature meaning shall be recorded as "Cancelled". A failed signature leaves the record in the Initiated state with no changes applied.

## 6.6 Audit Trail & History

### 6.6.1 Overview

**FR-6.6.1:** The system shall maintain a comprehensive audit log to track all significant actions and changes within the Change Control module. The audit trail provides a permanent, tamper-proof record of who did what, when, and what changed.

**FR-6.6.2:** The audit trail shall be stored in a database table. There is no user interface for viewing the audit log in Phase 1. A future enhancement will add an audit history viewer within the CC form (see Section 13.2).

**FR-6.6.3:** Audit records shall never be deleted, modified, or overwritten. The audit log is an append-only record.

### 6.6.2 Auditable Events

The system shall log the following categories of events:

**Change Control Actions:**

- CC creation (new record created)

- All state transitions (who triggered the transition, when, from which state, to which state)

- Critical field updates only — the following fields are tracked individually:

- Decision and Decision Comments

- Risk Level

- Final Decision and Final Comments

- Cancellation Reason

- Target Closure Date (initial value set and any subsequent changes)

- Proposed Implementation Date (if changed)

- Assign Approver (if changed)

**User Management Actions (Admin):**

- User added to the system (including assigned role)

- User role changed (old role and new role)

- User deactivated

- User full name changed (old name and new name)

**Electronic Signature Events: **

- Successful electronic signature (signer, record, action signed, meaning of signature, timestamp)

- Failed electronic signature attempt (user, record, attempted action, timestamp)

- Failed attempts are audited but do not create a signature record — signature records contain only valid, successful signatures.

**Non-critical field changes are not logged.** Edits to fields such as Change Description, Business Impact, Risk Rationale, and other free-text content fields are not individually tracked in the audit log. This keeps the audit table focused on significant, compliance-relevant changes.

### 6.6.3 Audit Log Structure

Each audit entry shall capture the following information:

| **Field** | **Description** |
| --- | --- |
| **Audit ID** | Unique identifier for the audit entry (auto-generated) |
| **Entity Type** | The type of entity being audited (e.g., "ChangeControl", "User") |
| **Entity ID** | The identifier of the specific entity (e.g., "CC-001", "User-123") |
| **Action Type** | The category of action performed (e.g., "Created", "StateChanged", "FieldUpdated", "UserAdded", "UserRoleChanged") |
| **Action Description** | A human-readable summary of the action, generated by the system at runtime (e.g., "State changed from Initiated to Pending Implementation Approval") |
| **Field Name** | The name of the field that was changed (null for non-field actions such as record creation) |
| **Old Value** | The previous value of the field before the change (null for creation events) |
| **New Value** | The new value of the field after the change |
| **Performed By** | The user ID of the person who performed the action |
| **Performed By Name** | The display name of the person who performed the action |
| **Timestamp** | The date and time when the action occurred |

### 6.6.4 Audit Log Examples

The following examples illustrate how audit entries are captured for different scenarios:

**Example 1 — CC Created:**

Entity Type: ChangeControl | Entity ID: CC-001 | Action Type: Created | Action Description: "Change Control CC-001 created" | Field Name: — | Old Value: — | New Value: CC-001 | Performed By Name: John Doe | Timestamp: 2026-04-14 10:00:00

**Example 2 — State Changed (Submission):**

Entity Type: ChangeControl | Entity ID: CC-001 | Action Type: StateChanged | Action Description: "State changed from Initiated to Pending Implementation Approval" | Field Name: Current State | Old Value: Initiated | New Value: Pending Implementation Approval | Performed By Name: John Doe (CC Owner) | Timestamp: 2026-04-14 11:00:00

**Example 3 — Field Updated (Decision Set):**

Entity Type: ChangeControl | Entity ID: CC-001 | Action Type: FieldUpdated | Action Description: "Decision set to Approve" | Field Name: Decision | Old Value: — | New Value: Approve | Performed By Name: Jane Smith (Approver) | Timestamp: 2026-04-15 14:00:00

**Example 4 — Field Updated (Decision Comments):**

Entity Type: ChangeControl | Entity ID: CC-001 | Action Type: FieldUpdated | Action Description: "Decision Comments added" | Field Name: Decision Comments | Old Value: — | New Value: "All requirements met. Approved for implementation." | Performed By Name: Jane Smith (Approver) | Timestamp: 2026-04-15 14:00:00

**Example 5 — Cancellation Reason Captured:**

Entity Type: ChangeControl | Entity ID: CC-002 | Action Type: FieldUpdated | Action Description: "Cancellation Reason provided" | Field Name: Cancellation Reason | Old Value: — | New Value: "Business requirements changed, no longer needed" | Performed By Name: John Doe (CC Owner) | Timestamp: 2026-04-16 10:00:00

**Example 6 — User Added (Admin Action):**

Entity Type: User | Entity ID: User-789 | Action Type: UserAdded | Action Description: "User Bob Johnson added with role CC Owner" | Field Name: — | Old Value: — | New Value: "Bob Johnson - CC Owner" | Performed By Name: Admin User | Timestamp: 2026-04-14 08:00:00

**Example 7 — User Role Changed:**

Entity Type: User | Entity ID: User-789 | Action Type: UserRoleChanged | Action Description: "User Bob Johnson role changed" | Field Name: Role | Old Value: CC Owner | New Value: Approver | Performed By Name: Admin User | Timestamp: 2026-04-20 09:00:00

### 6.6.5 Rejection History Preservation

**FR-6.6.4:** When approval or rejection fields are overwritten during a re-review cycle (after a previous rejection), the system shall capture the old values in the audit log before the overwrite occurs. This ensures a complete rejection history is maintained even though the CC record itself only displays the latest values.

**Rejection and Re-Approval Scenario:**

*First Review — Rejection:*

- Audit Entry: Decision changed from [empty] to "Reject"

- Audit Entry: Risk Level changed from [empty] to "Medium"

- Audit Entry: Decision Comments changed from [empty] to "Need more details on risk mitigation"

- Audit Entry: State changed from "Pending Implementation Approval" to "Initiated"

*After CC Owner revises and resubmits — Second Review — Approval:*

- Audit Entry: Decision changed from "Reject" to "Approve" — **old value "Reject" preserved**

- Audit Entry: Risk Level changed from "Medium" to "Low" — **old value "Medium" preserved**

- Audit Entry: Decision Comments changed from "Need more details on risk mitigation" to "Risk mitigation plan now adequate. Approved." — **old rejection comment preserved**

- Audit Entry: State changed from "Pending Implementation Approval" to "In Implementation"

The CC record now shows Decision = "Approve", Risk Level = "Low", and the latest Decision Comments. But the audit log retains the complete history showing the initial rejection, its rationale, and the subsequent approval.

### 6.6.6 Logging Granularity

**FR-6.6.5:** Each critical field change shall be logged as a separate audit entry, even when multiple fields are updated in a single save or submission operation. Multiple entries from the same action shall share the same timestamp.

**Example:** When an Approver submits a decision with Decision = "Approve", Risk Level = "Low", and Decision Comments = "Looks good", the system creates 3 separate audit entries (one for each field) plus 1 state transition entry, all with the same timestamp.

**FR-6.6.6:** Non-critical field changes (e.g., editing Change Description text, updating Business Impact narrative) shall not generate audit entries. The audit table captures only significant, compliance-relevant changes as defined in Section 6.6.2.

### 6.6.7 Audit Data Retention

**FR-6.6.7:** All audit records shall be retained indefinitely. There is no expiry, archival, or automatic purging of audit data.

**FR-6.6.8:** Change Control records shall be retained indefinitely. There is no automatic deletion of CC records, including cancelled records.

**FR-6.6.9:** User records shall be retained even after deactivation. Deactivated users remain in the database for audit trail referencing.

**FR-6.6.10:** The audit table captures business-significant actions (what users did in the application). Technical API request/response logging for debugging and system monitoring is a separate concern and is not covered by this audit trail requirement.

**FR-6.6.11:** The system shall record in the audit trail: (a) every successful electronic signature, capturing the signer, the record, the action signed, the meaning of the signature, and the timestamp; and (b) every failed electronic signature attempt, capturing the user, the record, the attempted action, and the timestamp. Failed attempts shall not create a signature record — signature records contain only valid, successful signatures.

# 7. FIELD DEFINITIONS & VALIDATIONS

The complete field definitions and validation rules have been relocated to **Appendix D** to keep the main body concise.

# 8. BUSINESS RULES

This section consolidates all business rules that govern the behaviour of the Change Control module. While many of these rules are also referenced in their respective functional requirement sections, this section serves as a centralised index that developers and testers can use to verify that every rule is implemented and validated.

Each rule is identified with a prefix (BR-) for traceability.

## 8.1 State Transition Rules

These rules define when and how a Change Control record moves between states.

**BR-8.1.1 — Valid State Transitions:**

The system shall only permit the following state transitions. Any transition not listed here is invalid and must be prevented:

| **#** | **From State** | **To State** | **Trigger** | **Performed By** |
| --- | --- | --- | --- | --- |
| T1 | *(New)* | Initiated | Create CC | CC Owner |
| T2 | Initiated | Pending Implementation Approval | Submit for Approval | CC Owner (record owner) |
| T3 | Initiated | Cancelled | Cancel CC | CC Owner (record owner) |
| T4 | Pending Implementation Approval | In Implementation | Submit Decision (Decision = Approve) | Approver (assigned) |
| T5 | Pending Implementation Approval | Initiated | Submit Decision (Decision = Reject) | Approver (assigned) |
| T6 | In Implementation | Pending Final Approval | Submit for Final Approval | CC Owner (record owner) |
| T7 | Pending Final Approval | Closed | Submit Decision (Final Decision = Approve) | Approver (assigned) |
| T8 | Pending Final Approval | In Implementation | Submit Decision (Final Decision = Reject) | Approver (assigned) |

**BR-8.1.2 — No State Skipping:**

A record cannot skip states. There is no direct path from Initiated to In Implementation, from Initiated to Closed, or from Pending Implementation Approval to Closed. Every record must pass through the full sequential workflow or be cancelled from Initiated.

**BR-8.1.3 — Terminal States:**

Closed and Cancelled are terminal states. No transitions exit from these states. Once a record reaches either state, it remains there permanently. There is no "reopen," "reactivate," or "undo" action for either terminal state.

**BR-8.1.4 — Decision Field Drives Transition:**

At both approval gates, a single "Submit Decision" button is used. The system reads the value of the Decision field (at Implementation Approval) or Final Decision field (at Final Approval) to determine the transition. There are no separate "Approve" and "Reject" buttons.

**BR-8.1.5 — Rejection Returns to Previous State:**

Rejection does not create a new state. Rejection at the Implementation Approval gate returns the record to Initiated. Rejection at the Final Approval gate returns the record to In Implementation. The record re-enters the previous state with full edit permissions for the CC Owner.

**BR-8.1.6 — System Fields Updated on Transition:**

On every state transition, the system shall automatically update:

- Current State (to the new state value)

- Last Updated By (to the user who triggered the transition)

- Last Updated On (to the current date and time)

Additionally, on specific transitions:

- T4 (Approval at Implementation gate): Implementation Approval By, Implementation Approval On, and Implementation Approval Status are populated/updated.

- T7 (Approval at Final gate): Final Approval By, Final Approval On, Final Approval Status, and Actual Closure Date are populated/updated.

- T3 (Cancellation): Implementation Approval Status and Final Approval Status are set to "N/A."

**BR-8.1.7 — Audit Log on Every Transition:**

Every state transition shall be captured in the audit log with the from-state, to-state, performing user, and timestamp. See Section 6.6 for audit trail requirements.

## 8.2 Field Validation Rules

These rules define the validation constraints applied to field values.

### 8.2.1 Mandatory Field Validation

**BR-8.2.1 — Mandatory Fields at Submission (Initiated → Pending Implementation Approval):**

The following fields must be populated (non-empty, non-whitespace) before the CC Owner can submit for approval: Change Title, Change Description, Change Type, Change Category, Department/Function, Affected Systems/Modules, Proposed Implementation Date, Target Closure Date, Reason for Change, Business Impact, Expected Downtime, Requires Testing, Requires Training, Risk Rationale, Key Risks & Mitigations, High-Level Implementation Plan, Validation Approach, Success Criteria, Rollback/Backout Plan, and Assign Approver.

**BR-8.2.2 — Mandatory Fields at Submission (In Implementation → Pending Final Approval):**

The following fields must be populated before the CC Owner can submit for final approval: Actual Implementation Date, Post-Implementation Issues (dropdown selection required), Implementation Summary, Validation Performed, and Implementation Evidence (file upload required).

**BR-8.2.3 — Mandatory Field at Decision (Pending Implementation Approval):**

The following fields must be populated before the Approver can submit their decision: Decision, Risk Level, and Decision Comments.

**BR-8.2.4 — Mandatory Field at Decision (Pending Final Approval):**

The following fields must be populated before the Approver can submit their final decision: Final Decision and Final Comments.

**BR-8.2.5 — Mandatory Field at Cancellation:**

The Cancellation Reason field must be populated (non-empty, non-whitespace) before the CC Owner can confirm cancellation.

**BR-8.2.6 — Validation Error Handling:**

When a mandatory field validation fails, the system shall block the action (submission, decision, or cancellation), display a clear validation error identifying the specific field(s) that need attention, and keep the user on the current form without losing any entered data.

### 8.2.2 Date Validation Rules

**BR-8.2.7 — Proposed Implementation Date Minimum Lead Time:**

The Proposed Implementation Date must be ≥ 2 business days from the current date at the time of validation. Business days exclude Saturdays and Sundays. Public holiday handling is not required in Phase 1.

**BR-8.2.8 — Target Closure Date Minimum Lead Time:**

The Target Closure Date must be ≥ 10 business days from the current date at the time of validation.

**BR-8.2.9 — Future Date Validation at Submission:**

At the time of clicking "Submit for Approval," both the Proposed Implementation Date and Target Closure Date must be in the future (greater than the current date). If either date has become past since it was originally entered (e.g., the CC Owner saved a draft days ago and is now submitting), the submission shall be blocked with a specific error message (e.g., "Proposed Implementation Date cannot be in the past. Please update.").

**BR-8.2.10 — Re-Validation After Update:**

If the CC Owner updates a date field after a validation failure, the system shall re-validate the updated date against the current date at the time of the new submission attempt. The minimum lead-time rules (≥ 2 business days for Proposed Implementation Date, ≥ 10 business days for Target Closure Date) are recalculated from the new current date.

**BR-8.2.11 — Date Validation on Resubmission After Rejection:**

When a record returns to Initiated after rejection and the CC Owner resubmits, all date validations apply fresh based on the current date at the time of resubmission. Dates that were valid at the original submission may no longer be valid if time has passed.

### 8.2.3 Character Length Validation

**BR-8.2.12 — Character Limits:**

The following maximum character limits shall be enforced:

| **Field** | **Max Length** |
| --- | --- |
| Change Title | 200 characters |
| CC-ID | 10 characters |
| Cancellation Reason | 500 characters |
| All other textarea fields (Change Description, Reason for Change, Business Impact, Risk Rationale, Key Risks & Mitigations, High-Level Implementation Plan, Validation Approach, Success Criteria, Rollback/Backout Plan, Implementation Summary, Deviations from Plan, Validation Performed, Comments for Approver, Decision Comments, Final Comments, Comments) | 2000 characters each |

### 8.2.4 File Upload Validation

**BR-8.2.13 — Supported File Types:**

The Implementation Evidence upload field shall accept **PDF files only**. File type is verified by inspecting the file's contents, not its extension or the client-declared content type. Supporting Documents (field 24) is not implemented in Phase 1 — see §13.1 L11 and L12.

**BR-8.2.14 — Maximum File Size:**

Each uploaded file shall not exceed 10MB in size. If a file exceeds this limit, the upload shall be rejected with an appropriate error message.

**BR-8.2.15 — Single File Upload:**

Each file upload field (Supporting Documents and Implementation Evidence) supports a single file upload per field. Users should combine related documents into one file before uploading.

**BR-8.2.16 — Password Complexity:**

Passwords shall be a minimum of 8 characters and contain at least one lowercase letter, one uppercase letter, one digit and one special character. All unmet requirements are reported together rather than one at a time. Passwords are never trimmed — leading and trailing whitespace are significant.

## 8.3 Approval Rules

These rules govern the approval process and the behaviour of approval-related fields.

**BR-8.3.1 — Segregation of Duties:**

The CC Owner of a record and the assigned Approver must be different individuals. Since each user can hold only one role at a time, a CC Owner will never appear in the Approver dropdown (which only displays users with the Approver role). The edge case of a role change creating a conflict is prevented by BR-8.4.11 (role change restriction for active records).

**BR-8.3.2 — Approver Role Restriction:**

Only users who hold the Approver role shall appear in the "Assign Approver" dropdown. Users with CC Owner, Viewer, or Admin roles shall not be selectable as Approvers.

**BR-8.3.3 — Single Approver Per Record:**

Each Change Control record has exactly one assigned Approver. The same Approver reviews the record at both the Implementation Approval gate and the Final Approval gate.

**BR-8.3.4 — Assigned Approver Only:**

Only the Approver who is assigned to a specific record can submit a decision on that record. Other users with the Approver role cannot submit decisions on records they are not assigned to.

**BR-8.3.5 — Risk Level Is Approver-Only and Mandatory:**

The Risk Level field is set exclusively by the Approver during the Pending Implementation Approval state and is mandatory. The CC Owner does not set Risk Level. The CC Owner provides their own risk assessment in the Risk Rationale and Key Risks & Mitigations fields, but the formal Risk Level classification is an independent, mandatory Approver evaluation.

**BR-8.3.6 — Single Decision Field, Not Separate Buttons:**

The approval/rejection mechanism uses a Decision dropdown field (Approve/Reject) combined with a single "Submit Decision" button. The system reads the field value to determine the transition. There are no separate "Approve" and "Reject" buttons anywhere in the interface.

**BR-8.3.7 — Comments Reused Across Review Cycles:**

Decision Comments and Final Comments are single fields that are overwritten on each review cycle. They are not append-only logs. When an Approver re-reviews a record after a rejection, the new comments replace the previous comments in the record. The old comments are preserved in the audit log before overwrite.

**BR-8.3.8 — No Separate Rejection Comments Field:**

There is no dedicated "Rejection Comments" field. The Decision Comments field (at the Implementation Approval gate) and the Final Comments field (at the Final Approval gate) are used for both approval and rejection rationale.

**BR-8.3.9 — Approval Timestamp Fields Populated on Approve Only:**

Implementation Approval By / On and Final Approval By / On are populated only when the decision is "Approve." They are not populated on rejection. If a record is rejected and later approved, these fields are populated at the time of the approval, not the rejection.

## 8.4 Action Permissions

These rules define who can perform each action and under what conditions.

**BR-8.4.1 — Create CC:**

- Who: Any user with the CC Owner role

- When: Always (the "+ Create Change Control" button is always available to CC Owners)

- Result: A new CC record is created in the Initiated state

**BR-8.4.2 — Submit for Approval:**

- Who: The CC Owner of the specific record (not any CC Owner)

- When: Record is in the Initiated state and all mandatory field validations pass

- Result: State transitions from Initiated to Pending Implementation Approval

**BR-8.4.3 — Cancel CC:**

- Who: The CC Owner of the specific record (not any CC Owner)

- When: Record is in the Initiated state ONLY. Cancellation is not available from any other state.

- Condition: Mandatory Cancellation Reason provided via popup modal

- Result: State transitions from Initiated to Cancelled (permanent)

**BR-8.4.4 — Submit Decision (Implementation Approval):**

- Who: The Approver assigned to the specific record (not any Approver)

- When: Record is in the Pending Implementation Approval state

- Condition: Decision field must be populated

- Result: State transitions to In Implementation (if Approve) or Initiated (if Reject)

**BR-8.4.5 — Submit for Final Approval:**

- Who: The CC Owner of the specific record

- When: Record is in the In Implementation state

- Result: State transitions from In Implementation to Pending Final Approval

**BR-8.4.6 — Submit Decision (Final Approval):**

- Who: The Approver assigned to the specific record (not any Approver)

- When: Record is in the Pending Final Approval state

- Condition: Final Decision field must be populated

- Result: State transitions to Closed (if Approve) or In Implementation (if Reject)

**BR-8.4.7 — View CC:**

- Who: All users with any of the four roles (CC Owner, Approver, Viewer, Admin)

- When: Always — all users can view all CC records in the system regardless of ownership or role

- Restriction: Viewing is unrestricted, but editing is governed by the Security Matrix

**BR-8.4.8 — Save Draft:**

- Who: The CC Owner of the specific record

- When: Record is in the Initiated state

- Result: Field values saved without validation; record remains in Initiated state

**BR-8.4.9 — Manage Users:**

- Who: Admin only

- When: Always (via Settings → User Management)

- Create User: Admin sets Full Name, Email, Password, and Role. The new user can sign in immediately.

- Edit User: Admin can edit Full Name and Role only. Email cannot be changed (it is the login identifier, set at creation). Password cannot be reset through the application (users use the Forgot Password flow, or passwords are managed at the database level).

- Deactivate User: Admin can deactivate a user account, preventing future login. User records are retained for audit purposes.

- Result: User changes take effect immediately; all actions logged in audit trail.

- Restriction: See BR-8.4.11 for role change restrictions.

**BR-8.4.10 — Record-Specific Ownership:**

All action permissions that reference "CC Owner of the specific record" mean the individual user who created that particular CC record. Other users who also hold the CC Owner role cannot perform owner-specific actions (Cancel, Submit for Approval, Submit for Final Approval) on records they did not create.

**BR-8.4.11 — Role Change Restriction for Active Records:**

An Admin cannot change a user's role if that user is associated with any active Change Control records. A record is considered "active" if it is in any state other than Closed or Cancelled. The association applies when the user is either the CC Owner (creator) of an active record or the assigned Approver on an active record.

When the Admin attempts a role change and active records exist:

- The role change is blocked and **no part of the request is applied** — a name change submitted alongside a blocked role change is also rejected. 

- The system displays an error message listing the active CC-IDs preventing the change. 

- The Admin must wait until all associated records reach a terminal state (Closed or Cancelled) before the role change can be processed.

An Admin may change their own name but **not their own role** — demoting oneself from Admin is unrecoverable if no other Admin exists

This rule prevents segregation of duties violations that could occur if a CC Owner's role were changed to Approver (or vice versa) while they have active records. It eliminates the need for complex per-record validation at approval submission time.

## 8.5 Task Due Dates & SLA

These rules define how task due dates are calculated and communicated.

**BR-8.5.1 — Task 1: Implementation Approval Review:**

- Assignee: Assigned Approver

- Trigger: Record transitions to Pending Implementation Approval

- Due Date Calculation: Submission Date + 5 business days

- Communication: Email notification (Notification N1 — see Section 6.4)

**BR-8.5.2 — Task 2: Implementation Completion:**

- Assignee: CC Owner

- Trigger: Record transitions to In Implementation (via approval)

- Due Date Calculation: Target Closure Date − 3 business days

- Communication: Email notification (Notification N2 — see Section 6.4)

**BR-8.5.3 — Task 3: Final Approval Review:**

- Assignee: Assigned Approver

- Trigger: Record transitions to Pending Final Approval

- Due Date Calculation: Target Closure Date

- Communication: Email notification (Notification N4 — see Section 6.4)

**BR-8.5.4 — Business Days Definition:**

Business days exclude Saturdays and Sundays. Public holiday handling is not required in Phase 1.

**BR-8.5.5 — No Auto-Escalation:**

There is no automatic escalation mechanism in Phase 1. If a task is overdue (the due date has passed and the required action has not been completed), the system does not send reminder emails, reassign the task, or escalate to a manager. Overdue records can be identified through the audit table for manual management review. See Section 13.1 for this known limitation.

**BR-8.5.6 — Due Dates in Email Only:**

Task due dates are communicated exclusively through email notifications. There is no task calendar, task list interface, or due date indicator in the application UI in Phase 1.

## 8.6 Notification Rules

These rules define when email notifications are sent, to whom, and what they contain.

**BR-8.6.1 — Notification on Submission for Approval:**

When the CC Owner submits for approval (Initiated → Pending Implementation Approval), the system shall send an email to the assigned Approver. The email shall include the CC-ID, the Change Title, and the task due date (Submission Date + 5 business days).

**BR-8.6.2 — Notification on Implementation Approval:**

When the Approver approves at the Implementation gate (Pending Implementation Approval → In Implementation), the system shall send an email to the CC Owner. The email shall include the CC-ID, confirmation of approval, and the task due date for implementation (Target Closure Date − 3 business days).

**BR-8.6.3 — Notification on Implementation Rejection:**

When the Approver rejects at the Implementation gate (Pending Implementation Approval → Initiated), the system shall send an email to the CC Owner. The email shall include the CC-ID, notification of rejection, and instruction to revise and resubmit.

**BR-8.6.4 — Notification on Submission for Final Approval:**

When the CC Owner submits for final approval (In Implementation → Pending Final Approval), the system shall send an email to the assigned Approver. The email shall include the CC-ID, the Change Title, and the task due date (Target Closure Date).

**BR-8.6.5 — Notification on Final Approval (Closure):**

When the Approver approves at the Final gate (Pending Final Approval → Closed), the system shall send an email to the CC Owner. The email shall include the CC-ID and confirmation that the Change Control has been closed successfully.

**BR-8.6.6 — Notification on Final Rejection:**

When the Approver rejects at the Final gate (Pending Final Approval → In Implementation), the system shall send an email to the CC Owner. The email shall include the CC-ID, notification of rejection, and instruction to improve implementation documentation and resubmit.

**BR-8.6.7 — Notification on Cancellation:**

When the CC Owner cancels a CC (Initiated → Cancelled), the system shall send an email to the assigned Approver, if one was previously assigned. The email shall include the CC-ID and notification that the Change Control has been cancelled.

**BR-8.6.8 — No Direct Links in Emails:**

Email notifications shall include the CC-ID and a summary of the action or required task. They shall not contain direct clickable links to the CC record within the application. Users must navigate to the application and locate the record using the CC-ID.

**BR-8.6.9 — Email Templates:**

Each notification type shall use a dedicated email template with consistent branding and formatting. The specific template designs are an implementation detail and are not defined in this BRD.

**BR-8.6.10 — No Notifications to Viewers or Admins:**

Viewers and Admins do not receive workflow-related email notifications. Notifications are sent only to active workflow participants (CC Owner and assigned Approver) for the specific record.

## 8.7 Audit & Data Retention

These rules define how audit data is captured, stored, and retained.

**BR-8.7.1 — Automatic State Transition Logging:**

All state transitions shall be logged automatically in the audit table when a state change occurs. Each entry captures the from-state, to-state, performing user, and timestamp.

**BR-8.7.2 — Critical Field Change Logging:**

The following fields shall be logged in the audit table when their values change: Decision, Decision Comments, Risk Level, Final Decision, Final Comments, Cancellation Reason, Target Closure Date, Proposed Implementation Date, and Assign Approver. Each field change is logged as a separate audit entry with the old value and new value.

**BR-8.7.3 — Non-Critical Fields Not Logged:**

Edits to non-critical fields (e.g., Change Description, Business Impact, Risk Rationale, Implementation Summary, and other free-text content fields) are not individually tracked in the audit table. This keeps the audit log focused on significant, compliance-relevant changes.

**BR-8.7.4 — User Management Action Logging:**

Admin actions related to user management (user added, role changed, user deactivated, user name change) shall be logged in the audit table with the Admin's identity, the affected user, the action performed, and the timestamp.

**BR-8.7.5 — Granular Logging:**

Each critical field change shall be logged as a separate audit entry, even when multiple fields are updated in a single save or submission operation. Multiple entries from the same action shall share the same timestamp. For example, when an Approver submits a decision with values for Decision, Risk Level, and Decision Comments, the system creates 3 separate field-change audit entries plus 1 state transition entry, all with the same timestamp.

**BR-8.7.6 — Old Value Preservation on Overwrite:**

When a critical field value is overwritten (e.g., Decision changed from "Reject" to "Approve" during a re-review cycle), the audit entry shall capture both the old value and the new value. This ensures complete history is maintained even though the CC record itself only shows the latest values.

**BR-8.7.7 — Audit Records Immutable:**

Audit records shall never be deleted, modified, or overwritten. The audit log is an append-only, permanent record.

**BR-8.7.8 — CC Record Retention:**

Change Control records shall be retained in the system indefinitely. There is no automatic deletion, archival, or purging of CC records, including cancelled records.

**BR-8.7.9 — User Record Retention:**

User records shall be retained in the system even after deactivation. Deactivated users remain in the database so that audit trail entries and CC records that reference them continue to display the correct user names.

**BR-8.7.10 — Audit vs Application Logging:**

The audit table captures business-significant actions (what users did in the application). Technical API request/response logging for debugging and system monitoring is a separate concern and is independent of the business audit trail defined in this BRD.

## 8.8 E-Signature Rules

**BR-8.8.1 — Signature Required on All Decision Transitions:**

A valid electronic signature is mandatory for transitions T2, T3, T4, T5, T6, T7, and T8. Record creation (T1) does not require a signature. No decision transition may be committed without a successful signature.

**BR-8.8.2 — Two Identification Components:**

The electronic signature shall require two distinct identification components: the user's username and the user's password. Both must be entered at every signing event; the system shall not permit signing with a single component.

**BR-8.8.3 — Identity Binding (Sign as Self Only):**

The username entered at the signature prompt must match the username of the currently authenticated session user. If it does not, the signature is rejected even if the credentials supplied are valid for some other account. A user may never sign on behalf of another user.

**BR-8.8.4 — Meaning of Signature:**

Every signature shall record an explicit meaning, drawn from the following closed set:

| **Transition** | **Meaning of Signature** |
| --- | --- |
| T2 | Submitted for Implementation Approval |
| T3 | Cancelled |
| T4 | Approved – Implementation Approval |
| T5 | Rejected – Implementation Approval |
| T6 | Submitted for Final Approval |
| T7 | Approved – Final Approval |
| T8 | Rejected – Final Approval |

**BR-8.8.5 — Signature Record Contents: **

Every signature record shall permanently capture, at minimum: the signer's user identifier; the signer's full name as it stood at the time of signing; the date and time of signing; the Change Control record to which the signature applies; the state transition performed; and the meaning of the signature.

**BR-8.8.6 — Atomic Commitment**

Signature validation, state transition, field updates, signature record creation, audit entries, and notification dispatch shall occur as a single atomic operation. If the signature fails, no part of the transition is applied and the record remains unchanged in its current state.

**BR-8.8.7 — Signature Immutability:**

Signature records are permanent and immutable. They shall never be edited, overwritten, or deleted by any user or process, including Admin. Signature records accumulate — a record that passes through a rejection loop will hold multiple signatures for the same gate, all of which are retained. This is distinct from the approval fields on the Change Control record (Decision, Approval By, Approval On), which reflect only the most recent decision and are overwritten on re-review.

**BR-8.8.8 — Failed Signature Attempts:**

Failed signature attempts shall be recorded in the audit trail with the user, the record, the attempted action, and the timestamp. Failed attempts do not create signature records. Phase 1 does not lock out a user after repeated failed signature attempts (see Limitation L9).

**BR-8.8.9 — Signature Manifestation:**

Every Change Control record shall display a Signature History panel listing all signature events for that record, showing for each: the signer's name, the date and time, and the meaning of the signature. The panel is read-only for all roles in all states.

**BR-8.8.10 — Deactivated Users Cannot Sign:**

A deactivated user cannot produce a valid signature. Signature validation shall verify that the signing user's account is active. Signatures previously made by a user who is subsequently deactivated remain valid and are retained permanently.

# 9. UI/UX GUIDELINES

This section defines the user interface and user experience principles, patterns, and standards that the Change Control module must follow. The 25+ HTML prototypes in the project files serve as the authoritative visual reference for layout, structure, and component behaviour. This section documents the design principles and patterns demonstrated in those prototypes so that the implemented application matches them consistently.

## 9.1 Design Principles

The Change Control module follows a flat, enterprise design aesthetic inspired by professional project management tools. The design prioritises clarity, efficiency, and information density over decorative elements.

**DP-1 — Clean and Professional:**

The interface uses a clean, minimal design with flat styling. There are no rounded cards with heavy shadows, no gradient backgrounds, and no Material Design aesthetics. The visual language is understated and professional, appropriate for a regulated quality management environment.

**DP-2 — Information Density:**

Forms and list views display information efficiently without excessive whitespace. Fields are grouped logically using section cards, and multi-column grid layouts are used where appropriate to reduce vertical scrolling and keep related fields visible together.

**DP-3 — Clarity of State:**

The current workflow state of a record must always be immediately visible to the user. The state is displayed as a status badge in the page header alongside the CC-ID, and is also shown in the Change Details — Identification meta-grid as the Current State field. The user should never need to guess which state a record is in.

**DP-4 — Role-Aware Interface:**

The interface adapts based on the logged-in user's role and their relationship to the specific record. Buttons, editable fields, and navigation items are shown or hidden based on role permissions. Users only see actions they are allowed to perform — they are not shown disabled buttons for actions they cannot take.

**DP-5 — Progressive Disclosure:**

Fields that are not yet relevant to the current workflow stage are displayed with "Not applicable" placeholder messages rather than being hidden entirely. This allows all users to understand the full scope of the form while making it clear which sections are currently active. The user can see what comes next without being overwhelmed by editable fields that don't apply yet.

**DP-6 — Consistent Patterns:**

The same field display patterns, button styles, layout grids, and interaction behaviours are used consistently across all states and role views. A user who learns the interface in one state should find it familiar in every other state.

## 9.2 Field Display Patterns

The Change Control form uses five distinct field display patterns to communicate the permission state of each field to the user. These patterns are applied consistently across all workflow states and role-based views.

### 9.2.1 Editable Field (Active Input)

Used when the field is editable by the current user in the current state. The field is rendered as an active form control that accepts input.

**Visual Characteristics:**

- Standard form control (text input, textarea, dropdown, date picker, or file upload)

- White background, standard border

- Active cursor and keyboard focus

- Mandatory fields marked with an asterisk (*) after the label

- Placeholder text providing guidance on expected input

**When Used:** Only for fields that the current user is permitted to edit in the current workflow state, as defined by the Security Matrix (green cells).

**Example Fields:** Change Title (CC Owner, Initiated state), Decision (Approver, Pending Implementation Approval state), Implementation Summary (CC Owner, In Implementation state).

### 9.2.2 Read-Only Field (Disabled Input)

Used when the field contains a value but is not editable by the current user in the current state. The field is rendered as a disabled form control displaying the existing value.

**Visual Characteristics:**

- Disabled form control (input, textarea, or dropdown with the disabled attribute)

- Greyed-out or muted background indicating non-editable status

- Cursor changes to indicate the field cannot be interacted with

- The existing value is clearly visible and readable

**When Used:** For fields that have been filled in a previous state but are now locked. Also used when a different role has edit access but the current user does not. Corresponds to red cells in the Security Matrix for fields that have a value.

**Example Fields:** Change Title (any user in any state after Initiated), Decision (CC Owner view in Pending Implementation Approval state), Actual Implementation Date (any user in Closed state).

### 9.2.3 Not Applicable Field (Placeholder Message)

Used when the field is not yet relevant to the current workflow stage. The field label is displayed, but instead of an input control, a contextual placeholder message explains why the field is not available.

**Visual Characteristics:**

- Field label displayed normally

- Instead of an input control, a styled placeholder div with a muted text message

- Message provides context about when the field will become available (e.g., "Not applicable — Available after approval")

- Distinct visual styling from both editable and read-only fields

**When Used:** For fields that belong to a future workflow stage. For example, Implementation Details fields in the Initiated state, or Final Approval fields in the In Implementation state.

**Standard Messages:**

- "Not applicable — Available after approval" (Implementation Details fields before approval)

- "Not applicable — Pending submission" (Approval decision fields before CC is submitted)

- "Not applicable — Will be set by approver during review" (Risk Level in CC Owner's Initiated view)

- "Not applicable — Pending implementation" (Final Approval fields before implementation)

**Example Fields:** Implementation Summary (any user, Initiated state), Decision (any user, Initiated state), Final Decision (any user, In Implementation state).

### 9.2.4 System-Managed Field (Meta Value)

Used for system-generated fields that are always read-only and are populated/managed by the system rather than by any user. These fields are displayed in a compact meta-grid layout distinct from the standard form layout.

**Visual Characteristics:**

- Displayed in a meta-grid layout (3-column grid for Identification fields)

- Label displayed in a smaller, muted style

- Value displayed as plain text (not inside an input control)

- No border, no input styling — clearly distinct from user-editable fields

- "—" (dash) used when the field has no value yet (e.g., approval timestamps before approval occurs)

**When Used:** For the 13 system-generated fields: CC-ID, Current State, Change Owner, Last Updated By, Created On, Last Updated On, Implementation Approval By/On, Final Approval By/On, Implementation Approval Status, Final Approval Status, and Actual Closure Date.

**Example Fields:** CC-ID ("CC-001"), Current State ("Initiated"), Change Owner ("John Doe"), Implementation Approval By ("—" before approval, "Jane Smith" after approval).

### 9.2.5 Conditional Visibility (Shown Only in Specific States)

Used for fields that are completely hidden in most states and only appear under specific conditions. Unlike "Not Applicable" fields (which show a placeholder), conditionally visible fields are not rendered at all until their display condition is met.

**Visual Characteristics:**

- Field is entirely absent from the form in states where it does not apply

- When visible, displayed as a read-only disabled textarea (since the value is already captured and cannot be edited)

**When Used:** Currently applies to one field only — Cancellation Reason (field #50).

**Cancellation Reason Visibility Rules:**

- Hidden in: Initiated, Pending Implementation Approval, In Implementation, Pending Final Approval, Closed

- Visible in: Cancelled state only

- When visible: Displayed in the Additional Information section below the Comments field as a read-only textarea

- Value source: Captured via the cancellation popup modal during the cancellation action, not through an inline form control

### 9.2.6 Electronic Signature Modal

- Triggered by any decision action (Submit for Approval, Cancel, Submit Decision, Submit for Final Approval). 

- The modal displays the action being signed and its meaning, followed by two required inputs: Username and Password. Two buttons: "Sign and Submit" (primary) and "Cancel" (secondary). 

- On failure, an inline error is shown within the modal and the user may retry without losing form data. 

- The modal cannot be bypassed — closing it aborts the action entirely. 

- For cancellation, the signature inputs are combined into the existing cancellation modal alongside the mandatory Cancellation Reason field, so the user completes reason and signature in a single dialog.

## 9.3 Status Indicators & Colour Coding

### 9.3.1 Status Badge

Each Change Control record displays a status badge in the page header next to the CC-ID. The badge indicates the current workflow state using distinct background colours for immediate visual recognition.

**Status Badge Colours by State:**

| **State** | **Background Colour** | **Text Styling** |
| --- | --- | --- |
| Initiated | Light blue | Dark text |
| Pending Implementation Approval | Light amber/yellow | Dark text |
| In Implementation | Light purple | Dark text |
| Pending Final Approval | Light orange | Dark text |
| Closed | Light green | Dark text |
| Cancelled | Light red | Dark text |

**Display Format:** The status badge is rendered as an inline label positioned to the right of the page title (e.g., "Change Control: CC-001 [Initiated]").

### 9.3.2 List View Status Badges

In the All Change Controls, My Change Controls, and Approvals list views, each record row includes a smaller status badge showing the current state. The same colour scheme applies as in the form header, providing consistent visual cues across the application.

### 9.3.3 Role Badges (Admin Settings)

In the Admin Settings — All Users table, each user's role is displayed with a role badge. These badges use a distinct colour scheme from the workflow status badges to avoid confusion:

- Admin: Distinct styling (e.g., darker badge)

- End User roles (CC Owner, Approver, Viewer): Lighter, consistent styling

### 9.3.4 Action Button Styling

Buttons throughout the application follow a consistent colour-coded styling:

| **Button Type** | **Style** | **Usage** |
| --- | --- | --- |
| Primary (blue) | Solid background, white text | Positive workflow actions: "Submit for Approval," "Submit Decision," "Submit for Final Approval," "Create Change Control" |
| Secondary (grey) | Outline or muted background | Navigation and neutral actions: "Back to List," "Save Draft" |
| Danger (red) | Red background, white text | Destructive actions: "Cancel CC," "Confirm Cancellation" |

## 9.4 Form Layout Standards

### 9.4.1 Overall Page Structure

The application uses a two-panel layout:

- **Left panel:** Fixed sidebar containing the application logo ("EAMI QMS"), navigation links, and no collapsible behaviour

- **Right panel:** Scrollable main content area containing the page header, information banners, form sections, and action buttons

### 9.4.2 Form Section Cards

Each logical group of fields is wrapped in a section card with:

- A section title (h2 element, e.g., "Change Details," "Impact & Risk Assessment")

- Optional section subtitles (h3 element, e.g., "Identification," "Change Definition," "Planning") for subsections within a card

- Optional section notes for contextual information (e.g., "These fields will become available once the change is approved for implementation")

- Consistent padding and spacing between fields within the card

### 9.4.3 Grid Layouts

Fields within sections use responsive grid layouts to optimise horizontal space:

- **Meta-grid (3 columns):** Used for the Identification section's system-managed fields (CC-ID, Current State, Change Owner, etc.)

- **Grid-3 (3 columns):** Used for compact dropdown groups (e.g., Change Type, Change Category, Department/Function displayed side by side)

- **Grid-2 (2 columns):** Used for date field pairs (Proposed Implementation Date + Target Closure Date), time field pairs (Implementation Window Start + End), and approval timestamp pairs (Approval By + Approval On)

- **Full width (1 column):** Used for textareas, text inputs, and file upload fields that benefit from the full available width

### 9.4.4 Information Banner

The Initiated state form displays an information banner at the top of the main content area, below the page header:

- Blue/informational styling

- Content: "Before you submit — Fill out the change control details below. Fields marked with * are mandatory. Once submitted, this change will be sent for implementation approval."

- This banner is specific to the Initiated state and is not displayed in other states.

### 9.4.5 Form Actions Bar

Action buttons are positioned at the bottom of the form in a form actions bar with a two-sided layout:

- **Left side:** Navigation and destructive actions ("Back to List" button, "Cancel CC" button)

- **Right side:** Positive workflow actions ("Save Draft" button, "Submit for Approval" button)

The specific buttons displayed depend on the current state and the user's role. Only actions the user is permitted to perform are shown. In terminal states (Closed, Cancelled) and for non-participating roles (Viewer, Admin), only the "Back to List" navigation button is displayed.

### 9.4.6 Cancellation Modal

The cancellation modal is a centred popup overlay with:

- Semi-transparent dark background overlay (dimming the form behind it)

- White modal card with consistent padding

- Modal title: "Cancel Change Control"

- Confirmation message including the CC-ID

- Cancellation Reason textarea (mandatory, 500 character limit)

- Two-button layout: "Go Back" (grey, left-aligned) and "Confirm Cancellation" (red, right-aligned)

### 9.4.7 Signature History Panel

- A read-only panel positioned at the foot of the Change Control form, below the Additional Information section. 

- It renders one row per signature event in chronological order, each showing: signer's name, date and time, and meaning of signature. 

- The panel is visible to all roles in all states and is never editable. It is not a form field group — it is a rendered view of the record's signature history, analogous to the audit history display.

## 9.5 Navigation Structure

### 9.5.1 Sidebar Navigation

The sidebar provides the primary navigation for the application. It contains the following items, visible to all roles unless noted:

| **Navigation Item** | **Description** | **Visibility** |
| --- | --- | --- |
| **Dashboard** | Landing page with action-required items and overview statistics | All roles |
| **All Change Controls** | List of all CC records in the system, filterable and sortable | All roles |
| **My Change Controls** | Filtered list showing only the logged-in user's own CC records | All roles |
| **Approvals** | Queue of CC records pending the logged-in Approver's review | All roles (populated only for Approvers) |
| **Settings** | Profile management and user administration | All roles (User Management tab visible to Admin only) |

### 9.5.2 Dashboard Layout

The Dashboard is the default landing page after login. It is divided into three sections:

**Action Required Section:**

- **Pending Approvals card:** Displayed to all roles. Shows count and list of CC records pending the logged-in user's approval decision. Displays empty state ("No pending approvals") when the user has no items pending or does not hold the Approver role.

- **My Drafts card:** Displayed to all roles. Shows count and list of CC records owned by the logged-in user that are in the Initiated state (not yet submitted). Displays empty state ("No drafts yet") when the user has no draft records.

**Overview Section:**

- Displays system-wide statistics showing the count of CC records in each active state (Initiated, Pending Implementation Approval, In Implementation, Pending Final Approval, Closed).

- Each stat is displayed as a clickable card that navigates to the All Change Controls list.

- Visible to all roles.

**Recent Activity Section:**

- Displays the five most recently updated CC records system-wide, regardless of owner, approver or state.

- Each row shows CC-ID, Change Title, Current State, Last Updated timestamp and the name of the user who last updated the record.

- Cancelled records may appear here although they are excluded from the Overview counts.

The "+ Create Change Control" button is displayed in the page header area of the Dashboard, visible only to users with the CC Owner role.

### 9.5.3 List Views

The All Change Controls, My Change Controls, and Approvals views follow a consistent list layout:

- Table-style layout with columns for CC-ID, Change Title, Change Owner (or relevant actor), Current State (with status badge), and last updated date

- Clickable rows that navigate to the full CC form view

- Pagination for long lists

- Consistent sorting (most recently updated first by default)

### 9.5.4 Settings Pages

The Settings area contains two tabs:

**Profile Tab (all roles):**

- Displays the logged-in user's profile information (name, email, role)

- Allows basic profile management (e.g., password change)

**User Management Tab (Admin only):**

- Create New User section with fields for full name, email, password, and role selection

- All Users table showing all user accounts with name, email, role badge, and action buttons (edit, deactivate)

- Pagination for large user lists

# 10. NON-FUNCTIONAL REQUIREMENTS

This section defines the non-functional requirements that the Change Control module must satisfy. These requirements address how the system performs and operates rather than what it does functionally. They cover performance expectations, security and authentication, browser compatibility, and accessibility considerations.

## 10.1 Performance

**NFR-10.1.1 — Page Load Time:**

Standard pages (Dashboard, list views, CC form) shall load within a reasonable timeframe under normal operating conditions. The system should feel responsive and not introduce noticeable delays during typical use.

**NFR-10.1.2 — Form Submission Response:**

When a user clicks a submission button (Submit for Approval, Submit Decision, Submit for Final Approval, Save Draft, Confirm Cancellation), the system shall process the action and provide visual feedback (success confirmation or validation error) without excessive delay. The user should not be left uncertain about whether their action was processed.

**NFR-10.1.3 — Concurrent Users:**

The system shall support multiple users accessing the application simultaneously. Since the shared document model ensures that only one user has edit access at any given state, write conflicts are not expected. However, multiple users may be viewing different records or different states of the same record at the same time.

**NFR-10.1.4 — File Upload Performance:**

File uploads (Supporting Documents and Implementation Evidence) up to the 10MB maximum shall complete without timeout. The system shall provide visual feedback during upload progress.

**NFR-10.1.5 — List View Performance:**

The All Change Controls list view shall remain performant as the number of records grows. Pagination shall be used to manage large datasets and prevent excessive page load times.

**NFR-10.1.6 — Search and Filtering:**

List views should support filtering and sorting capabilities that execute within a reasonable timeframe, even as the volume of CC records increases over time.

## 10.2 Security & Authentication

### 10.2.1 Authentication

**NFR-10.2.1 — User Authentication Required:**

All pages and functions within the Change Control module shall require user authentication. Unauthenticated users shall not be able to access any application content. Unauthenticated requests shall be redirected to the login page.

**NFR-10.2.2 — Login Mechanism:**

The system shall provide a login page where users authenticate with their email address and password. The login page is the only publicly accessible page in the application.

**NFR-10.2.3 — Password Reset:**

The system shall provide a "Forgot Password" function that sends a password reset link to the user's registered email address. The reset link shall expire after a reasonable timeframe. The password reset page shall allow the user to set a new password.

**NFR-10.2.4 — Secure Password Storage:**

User passwords shall be stored securely using industry-standard hashing algorithms. Passwords shall never be stored in plain text.

**NFR-10.2.5 — Session Timeout:**

User sessions shall expire after 30 minutes of inactivity. When a session expires, the user shall be redirected to the login page and must re-authenticate to continue. Any unsaved form data may be lost on session timeout.

**NFR-10.2.6 — HTTPS Only:**

All communication between the user's browser and the application server shall be encrypted using HTTPS. Unencrypted HTTP connections shall not be permitted.

### 10.2.2 Authorization

**NFR-10.2.7 — Role-Based Access Control (RBAC):**

The system shall enforce role-based access control as defined in the Security Matrix (Section 4) and Action Permissions (Section 8.4). Every request that modifies data shall be validated against the user's role and their relationship to the specific record before the action is processed.

**NFR-10.2.8 — Server-Side Enforcement:**

All permission checks shall be enforced on the server side (backend). Client-side UI restrictions (hiding buttons, disabling fields) are a convenience for the user experience but shall not be the sole enforcement mechanism. A user who bypasses the client-side UI (e.g., using browser developer tools or API calls) shall still be blocked by server-side validation.

**NFR-10.2.9 — Record-Level Ownership Validation:**

For actions that are restricted to the record owner (Submit for Approval, Submit for Final Approval, Cancel CC), the backend shall validate that the authenticated user is the CC Owner of that specific record, not merely a user with the CC Owner role.

**NFR-10.2.10 — Assigned Approver Validation:**

For approval actions (Submit Decision at both gates), the backend shall validate that the authenticated user is the Approver assigned to that specific record, not merely a user with the Approver role.

**NFR-10.2.11 — Segregation of Duties Enforcement:**

Segregation of duties is enforced through the single-role-per-user model and the role change restriction for active records (BR-8.4.11). Since each user holds exactly one role at a time, a CC Owner cannot appear in the Approver dropdown. The system further prevents the edge case of a role change creating a conflict by blocking Admin from changing a user's role while they have active CC records. This structural approach eliminates the need for per-record ownership validation at approval submission time. See Section 2.4.2 and BR-8.4.11 for full details.

### 10.2.3 Data Protection

**NFR-10.2.12 — No Unauthorised Data Exposure:**

The system shall not expose CC record data, user data, or audit data to unauthenticated users or to users who do not have the appropriate role-based access. While all authenticated users can view all CC records (as per the business rules), the underlying APIs shall still validate authentication before returning data.

**NFR-10.2.13 — Audit Log Integrity:**

The audit log shall be protected from tampering. Application users (including Admins) shall not have the ability to modify, delete, or overwrite audit log entries through the application interface or API. The audit log is append-only.

**NFR-10.2.14 — Electronic Signature Authentication:**

Electronic signature validation shall use the same credential store and password verification mechanism as primary login. Passwords entered at the signature prompt shall never be logged, stored, cached, or transmitted in plain text.

**NFR-10.2.15 — Signature Session Independence:**

An active login session does not by itself constitute a signature. Each signing event requires a fresh entry of both credentials, regardless of how recently the user authenticated or how recently they last signed.

**NFR-10.2.16 — Signature Record Integrity:**

Signature records shall be stored such that they cannot be modified or deleted through the application. No user interface, API endpoint, or administrative function shall expose the ability to alter a signature record.

## 10.3 Browser Compatibility

**NFR-10.3.1 — Modern Browser Support:**

The system shall function correctly on the current stable versions of the following browsers:

- Google Chrome

- Microsoft Edge

- Mozilla Firefox

- Apple Safari

**NFR-10.3.2 — No Legacy Browser Requirement:**

There is no requirement to support legacy browsers such as Internet Explorer. The application targets modern, standards-compliant browsers only.

**NFR-10.3.3 — Responsive Layout:**

The application shall be usable on standard desktop and laptop screen resolutions. While mobile-optimised or native mobile applications are out of scope (see Section 1.3.2), the layout should not break on common screen sizes.

**NFR-10.3.4 — JavaScript Required:**

The application may require JavaScript to be enabled for full functionality. This is standard for modern web applications and does not require a no-JavaScript fallback.

## 10.4 Accessibility

**NFR-10.4.1 — Basic Accessibility:**

The application shall follow basic web accessibility practices to ensure usability for a broad range of users. This includes semantic HTML structure, appropriate use of form labels associated with their input controls, sufficient colour contrast between text and background elements, and keyboard navigability for core workflows (form filling, button clicking, dropdown selection).

**NFR-10.4.2 — Form Labels:**

All form fields shall have associated labels that clearly identify the field's purpose. Mandatory fields shall be visually marked with an asterisk (*) and the mandatory status should be conveyed programmatically where feasible.

**NFR-10.4.3 — Error Messages:**

Validation error messages shall be displayed in a location clearly associated with the relevant field or action. Error messages shall use text descriptions (not colour alone) to communicate the nature of the error.

**NFR-10.4.4 — Status Communication:**

Status badges and colour-coded indicators shall include text labels in addition to colour. The workflow state is always communicated via the text label on the badge (e.g., "Initiated," "Closed"), not through colour alone.

**NFR-10.4.5 — No Full WCAG Compliance Requirement:**

Full compliance with WCAG 2.1 AA or any specific accessibility standard is not a Phase 1 requirement. However, the application should avoid introducing unnecessary accessibility barriers and should follow the basic practices described above as a foundation for future accessibility improvements.

# 11. INTEGRATION REQUIREMENTS

## 11.1 Email / Notification System

**IR-11.1.1:** The system shall integrate with an email delivery service to send notifications at each state transition as defined in Section 8.6.

**IR-11.1.2:** Email templates shall be maintained for each of the 7 notification types (see Section 6.4.2, Notifications N1–N7).

**IR-11.1.3:** Each email shall include the CC-ID and a summary of the required action or status update. Emails shall not contain direct clickable links to the CC record within the application.

**IR-11.1.4:** Email delivery failures shall not block the workflow action that triggered the notification. If an email fails to send, the state transition should still complete, and the failure should be logged for technical investigation.

## 11.2 File Storage

**IR-11.2.1:** The system shall provide file storage capabilities for two file upload fields: Supporting Documents (field #24) and Implementation Evidence (field #34).

**IR-11.2.2:** Supported file types: PDF, DOCX, XLSX, PNG, JPG.

**IR-11.2.3:** Maximum file size: 10MB per file.

**IR-11.2.4:** Each file upload field supports a single file upload. Users should combine related documents into one file before uploading.

**IR-11.2.5:** Uploaded files shall be associated with the specific CC record and accessible for viewing/download by any authenticated user who can view the record.

**IR-11.2.6:** Uploaded files shall be retained for the lifetime of the CC record (indefinitely).

## 11.3 User Management

**IR-11.3.1:** The Change Control module shall use a standalone user database managed within the application. There is no integration with external directory services (Azure AD, LDAP, or similar) in Phase 1.

**IR-11.3.2:** Admins manage users via the Settings → User Management interface within the application.

**IR-11.3.3:** The user database supports four role types: CC Owner, Approver, Viewer, Admin.

**IR-11.3.4:** User dropdown fields (e.g., Assign Approver) shall be populated dynamically from the internal user database, filtered by role as appropriate.

## 11.4 Future QMS Module Integrations

The following integrations are out of scope for Phase 1 but are planned for future development as additional QMS modules are built:

- **CAPA Module:** Link Change Controls to Corrective and Preventive Actions.

- **Deviation Module:** Link Change Controls to Deviation records.

- **Risk Register:** Link Change Controls to Risk Register entries.

- **Document Management System:** Integrate with a centralised document management system for controlled documents referenced by Change Controls.

These integrations will require a cross-module traceability framework that is not part of the Phase 1 scope. See Section 13.2 for planned future features.

# 12. ACCEPTANCE CRITERIA

## 12.1 Definition of Done

The Change Control module shall be considered complete and ready for deployment when all of the following conditions are met:

- All 50 fields are functional, correctly validated, and display the appropriate permission state (editable, read-only, not applicable, or system-managed) per the Security Matrix.

- All 6 workflow states operate correctly with the defined state transitions.

- Role-based permissions are enforced at both the field level (per Security Matrix) and the action level (per Section 8.4) for all 4 roles.

- Segregation of duties is enforced — a user cannot be both CC Owner and Approver on the same record.

- Both rejection workflows are functional (Implementation Approval → Initiated, Final Approval → In Implementation) with correct permission reset.

- Email notifications are sent at every state transition with correct recipients and task due dates.

- The audit trail captures all required events (state transitions, critical field changes, user management actions) with correct old/new values and timestamps.

- Cancellation workflow is functional — only from Initiated state, only by record owner, with mandatory reason via popup modal.

- All mandatory field validations are enforced at submission points.

- Date validations enforce minimum lead times (≥ 2 business days for Proposed Implementation Date, ≥ 10 business days for Target Closure Date) and block past dates at submission.

- The implemented UI matches the approved HTML prototypes in layout, field organisation, and field display patterns.

- All navigation views (Dashboard, All Change Controls, My Change Controls, Approvals, Settings) are functional with correct role-based visibility.

## 12.2 Test Scenarios

The following minimum test scenarios shall be executed and passed before sign-off:

| **#** | **Scenario** | **Expected Outcome** |
| --- | --- | --- |
| TS-01 | **Happy path:** Create → Submit → Approve → Implement → Final Approve → Close | Record moves through all 6 states correctly; all system fields populated; notifications sent at each transition |
| TS-02 | **Rejection at Implementation Approval:** Submit → Reject → Revise → Resubmit → Approve | Record loops back to Initiated; CC Owner can edit all 25 fields; resubmission succeeds; old rejection values preserved in audit log |
| TS-03 | **Rejection at Final Approval:** Submit for Final → Reject → Revise implementation → Resubmit → Approve | Record loops back to In Implementation; CC Owner can edit 6 fields; old Final Decision/Comments preserved in audit log |
| TS-04 | **Cancel CC from Initiated state** | Modal appears; Cancellation Reason required; state transitions to Cancelled; record permanently read-only; Cancellation Reason visible |
| TS-05 | **Attempt to assign self as Approver** | CC Owner's name does not appear in Approver dropdown; backend rejects submission if somehow bypassed |
| TS-06 | **Attempt to edit Target Closure Date after submission** | Field is read-only in Pending Implementation Approval and all subsequent states |
| TS-07 | **Attempt to submit with missing mandatory fields** | Submission blocked; validation errors displayed identifying missing fields |
| TS-08 | **Attempt to submit with past dates** | Submission blocked; validation error displayed (e.g., "Proposed Implementation Date cannot be in the past") |
| TS-09 | **Verify status labels update correctly at each state** | Implementation Approval Status and Final Approval Status display correct values per the mapping table in Appendix D (Section 7.10) |
| TS-10 | **Verify email notifications sent with correct due dates** | Each transition triggers the correct notification to the correct recipient with the correct task due date |
| TS-11 | **Verify audit trail captures all events** | State transitions, critical field changes, rejection history, cancellation reason, and user management actions all logged correctly |
| TS-12 | **Viewer attempts to edit or perform actions** | All fields read-only; no action buttons displayed; no workflow actions available |
| TS-13 | **Admin attempts to edit CC or perform CC actions** | All CC fields read-only; no CC action buttons displayed; User Management functions accessible |
| TS-14 | **Non-owner CC Owner attempts to cancel another user's CC** | Cancel CC button not displayed; backend rejects action if bypassed |
| TS-15 | **Non-assigned Approver attempts to submit decision** | Submit Decision button not displayed; backend rejects action if bypassed |
| TS-16 | Attempt to change role for user with active CC records | Admin attempts to change the role of a user who owns or is assigned as Approver on an active CC. System blocks the change and displays error listing active CC-IDs. |
| TS-17 | Valid Electronic Signature at Approval Gate | Approver submits a decision, enters correct username and password, signature validates, transition commits, approval fields populate, signature record is created, and the signature appears in the Signature History panel. |
| TS-18 | Incorrect Password at Signature Prompt | Approver submits a decision, enters correct username but wrong password. Signature is rejected, an error is displayed, the record remains in its current state, no approval fields are populated, no signature record is created, and the failed attempt is written to the audit trail. |
| TS-19 | Signing as Another User (Identity Binding) | Approver A is logged in and attempts to sign using Approver B's username and password. The signature is rejected even though the credentials are valid for Approver B. The record does not transition. The failed attempt is audited. |
| TS-20 | Signature on Cancellation | CC Owner cancels a record, enters the cancellation reason and a valid signature in the combined modal. Record moves to Cancelled, reason is stored, signature record is created with meaning "Cancelled" |
| TS-21 | Signature Accumulation Across a Rejection Loop | A record is rejected at the Implementation Approval gate, revised, resubmitted, and approved. The Signature History panel shows all signatures in sequence (submitted, rejected, submitted, approved), while the Decision and Approval By fields on the record reflect only the most recent (approved) decision |
| TS-22 | Aborted Signature | User initiates a decision, then closes the signature modal without signing. No transition occurs, no fields are changed, no signature record is created, and no audit entry beyond the existing draft state is written |

## 12.3 Sign-off Requirements

Final sign-off shall require:

- **All test scenarios passed** — every scenario in Section 12.2 has been executed and verified.

- **Security Matrix validated** — field permissions verified for all 24 state/role combinations (6 states × 4 roles) against the Security Matrix Excel.

- **Audit trail reviewed** — a sample audit trail from a complete happy-path scenario and a rejection scenario has been reviewed and confirmed to capture all required events with correct data.

- **UI review completed** — the implemented interface has been compared against the HTML prototypes and confirmed to match in layout, structure, and behaviour.

- **Stakeholder approval** — the business stakeholder has reviewed the delivered system and confirmed it meets the requirements defined in this BRD.

# 13. KNOWN LIMITATIONS & FUTURE ENHANCEMENTS

## 13.1 Phase 1 Limitations

The following limitations are known, accepted, and documented for the Phase 1 release. These are not defects — they are intentional scope boundaries.

**L1 — No Emergency Fast-Track Workflow:**

All changes follow the same six-state approval process regardless of urgency. The "Emergency" category has been removed from the Change Category dropdown. A future enhancement may introduce a fast-track approval path for emergency changes with shorter SLAs and streamlined approval.

**L2 — No CC Owner Delegation:**

The CC Owner of a record cannot transfer ownership to another user. If a CC Owner is unavailable (e.g., leave, resignation), there is no mechanism to reassign the record to a different CC Owner. A future enhancement may add a transfer ownership capability accessible by Admin.

**L3 — No Cross-Module Traceability:**

Change Controls cannot be linked to CAPA, Deviation, or Risk Register records. Each module operates independently. A future enhancement will introduce cross-module linking and traceability as additional QMS modules are built.

**L4 — No Stale Record Auto-Escalation:**

There is no automatic detection or escalation when approvers or CC Owners miss their task due dates. The system does not send reminder emails, reassign tasks, or flag overdue records in the UI. Mitigation: Task due dates are communicated via email notifications, and the audit table can be queried to identify overdue records for manual management review. A future enhancement may add auto-escalation, reminder emails, and overdue indicators in the UI.

**L5 — No Audit Trail UI Viewer:**

The audit trail is captured in a database table but there is no user interface to view audit history within the application. Audit data must be accessed through database queries or reporting tools. A future enhancement will add an audit history tab within the CC form showing the chronological history of all changes and actions.

**L6 — No External Directory Integration:**

User management is handled through a standalone internal database. There is no integration with Azure AD, LDAP, or other external directory services. A future enhancement may add single sign-on (SSO) and directory synchronisation.

**L7 — No Direct Links in Emails:**

Email notifications include the CC-ID and action summary but do not contain direct clickable links to the CC record. Users must navigate to the application and locate the record manually. A future enhancement may add deep links.

**L8 — No Public Holiday Calendar:**

Business day calculations (for date validations and task due dates) exclude Saturdays and Sundays only. Public holidays are not accounted for. A future enhancement may introduce a configurable public holiday calendar.

**L9 — No Lockout After Failed Signature Attempts:**

Phase 1 does not lock a user's account or block the signing action after repeated failed electronic signature attempts. All failed attempts are recorded in the audit trail and are visible for review, but no automatic lockout is enforced. This is consistent with the Phase 1 login behaviour, which likewise does not implement account lockout. A future enhancement may introduce lockout thresholds and unauthorised-use alerting for both login and signature events.

**L10 — Narrative Field Revisions Not Individually Audited:**

Non-critical narrative fields (Change Description, Business Impact, Risk Rationale, Key Risks & Mitigations, Implementation Summary, and similar free-text content) are not individually tracked in the audit log. When a record is rejected and returns to a prior state, the CC Owner may revise these fields, and the previous wording is not recoverable from the audit trail. 

This is a deliberate design decision, not an oversight. The compliance-relevant reasoning is preserved through four mechanisms that are audited: (a) the rejection comments recording why the record was rejected, (b) the approval comments recording why it was subsequently accepted, (c) the state transitions recording the full rejection and resubmission history, and (d) the electronic signatures, which bind each signer to the record as it stood at the moment of signing. Together these establish who committed to what content and when, without auditing every revision of every free-text field. 

Auditing every narrative revision would expand the audit table substantially for limited forensic value. A future enhancement may introduce full field-level version history if a regulatory or business need arises.

**L11 — PDF-Only File Uploads:**

Implementation Evidence accepts PDF files only. The DOCX, XLSX, PNG and JPG types described in BR-8.2.13 are not implemented in Phase 1. Evidence should be a fixed, non-editable artefact, and restricting to a single type also makes content-type verification reliable — DOCX and XLSX are both ZIP archives and cannot be distinguished from each other by inspecting the file's contents.

**L12 — Supporting Documents Not Implemented:**

The Supporting Documents upload field (field 24) is not available in Phase 1. Only Implementation Evidence (field 34) can be uploaded. The database schema supports both; the API accepts only the latter.

**L13 — No Timezone Configuration:**

Business-day date validations are computed in UTC. For deployments in UTC+ timezones, dates submitted between midnight and the UTC offset are evaluated against the previous calendar day. A future enhancement will make the business timezone configurable.

**L14 — Read-Only Profile Screen:**

Users can view their name, email and role but cannot edit them. The Change Password function is likewise deferred (see L-existing). Profile changes are made by an Admin via User Management.

**L15 — No Search Beyond Basic Filtering:**

The Change Controls list supports text filtering by CC-ID, title and owner name, plus date-range and state filters. Saved searches, advanced query building and reporting are not implemented.

## 13.2 Planned Future Features

The following features are documented for consideration in future phases:

- Emergency/fast-track change workflow with shorter SLAs

- CC Owner delegation and ownership transfer

- Cross-module traceability (CAPA, Deviation, Risk Register linking)

- Auto-escalation and reminder emails for overdue tasks

- Audit trail viewer UI within the CC form

- External directory integration (Azure AD / SSO)

- Direct deep links to CC records in email notifications

- Configurable public holiday calendar for business day calculations

- Reporting and analytics dashboards

- Bulk operations (batch approval, batch status updates)

- Mobile-optimised interface

- Multi-language support

- Third-party e-signature provider integration (DocuSign, Adobe Sign) and cryptographic/PKI-based digital signatures

- Account lockout and unauthorised-use alerting after repeated failed login or signature attempts

- Time zone configuration

- CC Reassignment when an approver becomes unavailable

- Additional file types

- Supporting Documents

- Self-Service profile editing

# 14. ASSUMPTIONS & DEPENDENCIES

## 14.1 Assumptions

**A1:** Users will access the application through modern web browsers on desktop or laptop devices. Mobile access is not a primary use case for Phase 1.

**A2:** The organisation has an email infrastructure capable of sending transactional emails. The specific email service provider is an implementation decision.

**A3:** The number of concurrent users will be within the range typical for an internal enterprise quality management tool (tens of users, not thousands).

**A4:** Admins will maintain proper role assignments, ensuring users are assigned the single role that reflects their primary function. The system enforces segregation of duties at the record level, but clean role management is an organisational responsibility.

**A5:** All users have a basic level of computer literacy and familiarity with web-based form interfaces. No specialised training beyond standard onboarding is assumed.

**A6:** Business days are defined as Monday through Friday, excluding Saturdays and Sundays. Public holidays are not factored into business day calculations in Phase 1.

**A7:** The application will be deployed in a single-timezone context. Multi-timezone date handling is not required for Phase 1.

## 14.2 Dependencies

**D1 — Email Service:** The notification system depends on a functioning email delivery service being available and configured. Notifications cannot be sent without this dependency.

**D2 — File Storage:** The system requires persistent storage for uploaded files (up to 10MB per file) associated with CC records. Files must be retained for the lifetime of the record. The specific storage mechanism (database, file system, or other) is an implementation decision.

**D3 — Database:** The application depends on a database system capable of supporting the CC record storage, user management, and audit trail with indefinite data retention and no automatic purging.

**D4 — Hosting Environment:** The application depends on a web hosting environment capable of serving a web application over HTTPS with support for user sessions and concurrent access.

## 14.3 Constraints

**C1 — No Tech Stack Prescription:** This BRD intentionally does not prescribe a technology stack. The choice of frontend framework, backend language, database engine, and hosting platform are implementation decisions to be made during the technical design phase.

**C2 — Phase 1 Scope Only:** This BRD covers Phase 1 of the Change Control module only. Features listed in Section 13.2 are explicitly out of scope and must not be implemented unless approved through a separate change request.

**C3 — Security Matrix as Authority:** The Security Matrix Excel (Security_Matrix_V1_0.xlsx) is the authoritative source for field-level permissions. In the event of a discrepancy between the BRD narrative and the Security Matrix Excel, the Security Matrix takes precedence for field permission questions.

**C4 — HTML Prototypes as Visual Reference:** The HTML prototypes serve as the visual reference for UI layout and structure. The implemented interface should match these prototypes. Any deviations from the prototypes require explicit approval.

# 15. Appendices

## Appendix A: Glossary & Acronyms

| **Term** | **Definition** |
| --- | --- |
| CC | Change Control — a formal record documenting a proposed, in-progress, or completed change |
| CC Owner | The user who creates and drives a Change Control through its lifecycle |
| Approver | The user who reviews and approves or rejects a Change Control at the two approval gates |
| Viewer | A user with read-only access to all Change Controls |
| Admin | A user who manages system settings and user accounts |
| QMS | Quality Management System |
| EAMI | Organisation name |
| BRD | Business Requirements Document |
| SLA | Service Level Agreement |
| RBAC | Role-Based Access Control |
| CAPA | Corrective and Preventive Action (future QMS module) |
| Segregation of Duties | The principle that different people must handle different stages of a critical process to prevent conflicts of interest |
| Security Matrix | The Excel-based reference document defining field-level permissions by role and state |
| Electronic Signature (E-Signature) | A computer-generated record of an individual's authorisation of an action, executed by re-entering their credentials. In this system, an electronic signature comprises two identification components (username and password) and produces a permanent record binding the signer's identity, the timestamp, and the meaning of the signature to a specific action. Distinct from a cryptographic digital signature. |
| Identity Binding | The requirement that a user may sign only as themselves; the credentials entered at the signature prompt must match the currently authenticated session user. |
| Meaning of Signature | The explicit declaration of what an individual is attesting to when they sign (e.g., "Approved --- Implementation Approval", "Cancelled"). Recorded with every signature and displayed in the Signature History panel. |
| Signature Manifestation | The human-readable display of a signature on the record, showing the signer's name, the date and time of signing, and the meaning of the signature. Delivered in this system via the Signature History panel. |
| Signature Record | A permanent, immutable entry capturing a single signature event. Signature records are never edited or deleted and accumulate over the life of a Change Control record. |

## Appendix B: HTML Prototypes Reference

The following HTML prototype files are available in the project files and serve as the visual reference for the implemented UI:

| **#** | **File** | **Description** |
| --- | --- | --- |
| 1 | login.html | Login page |
| 2 | forgot-password.html | Forgot password page |
| 3 | reset-password.html | Password reset page |
| 4 | email-reset-password.html | Password reset email template |
| 5 | dashboard-cc-owner.html | Dashboard — CC Owner view |
| 6 | dashboard-approver.html | Dashboard — Approver view |
| 7 | dashboard-empty.html | Dashboard — empty state |
| 8 | all-change-controls.html | All Change Controls list view |
| 9 | my-change-controls.html | My Change Controls list view |
| 10 | my-change-controls-empty.html | My Change Controls — empty state |
| 11 | approvals.html | Approvals queue — with pending items |
| 12 | approvals-empty.html | Approvals queue — empty state |
| 13 | cc-form-initated-state.html | CC form — Initiated state, CC Owner view (25 editable fields) |
| 14 | cc-form-initated-state-approver-view.html | CC form — Initiated state, Approver/Viewer view (read-only) |
| 15 | cc-form-pending-implementation-approval-approver-view.html | CC form — Pending Impl Approval, Approver view (3 editable) |
| 16 | cc-form-pending-implementation-approval-user-view.html | CC form — Pending Impl Approval, CC Owner view (read-only) |
| 17 | cc-form-in-implementation-implementer-view.html | CC form — In Implementation, CC Owner view (6 editable) |
| 18 | cc-form-in-implementation-approver-view.html | CC form — In Implementation, Approver view (read-only) |
| 19 | cc-form-pending-final-approval-approver-view.html | CC form — Pending Final Approval, Approver view (2 editable) |
| 20 | cc-form-pending-final-approval-implementer-view.html | CC form — Pending Final Approval, CC Owner view (read-only) |
| 21 | cc-form-closed.html | CC form — Closed state (all read-only) |
| 22 | cc-form-cancelled.html | CC form — Cancelled state (all read-only, Cancellation Reason visible) |
| 23 | settings-profile.html | Settings — Profile page |
| 24 | settings-profile-enduser.html | Settings — Profile page (end user view) |
| 25 | settings-admin.html | Settings — Admin view (User Management) |
| 26 | global.css | Global stylesheet |

## Appendix C: Revision History

| **Version** | **Date** | **Author** | **Changes** |
| --- | --- | --- | --- |
| 1.2 | 2026-08-16 | Ehab Ahmed | Backend alignment. Nine amendments recording decisions taken during API implementation and verified against the built system; the BRD previously described intentions the backend deliberately departed from. No new CC fields; field count remains 50. No Security Matrix change. No state machine change. One new endpoint outside the original 22 (save implementation details). New: BR-8.2.16 (Password Complexity — minimum 8 characters with at least one lowercase, uppercase, digit and special character; all unmet rules reported together; passwords never trimmed). §9.5.2 Recent Activity Section (five most recently updated records system-wide, showing CC-ID, title, state, timestamp and last-updater name; present in all three HTML prototypes but previously undocumented). Limitations L11 (PDF-only uploads), L12 (Supporting Documents not implemented), L13 (no timezone configuration — date validations compute "today" in UTC), L14 (read-only profile screen), L15 (no search beyond basic filtering). Amended: BR-8.2.13 — file types narrowed from PDF/DOCX/XLSX/PNG/JPG to PDF only, with type verified by inspecting file contents rather than the extension or client-declared content type; DOCX and XLSX are both ZIP archives and cannot be distinguished by inspection. BR-8.4.11 — a blocked role change now applies no part of the request; the previous wording had the name change saving regardless, which required a 409 response whose transaction commits. Self-role-change added to the restriction (an Admin may change their own name but not their own role). SC-6 — "Target Closure Date is locked after initial submission" removed; it contradicted CC_Field_Reference field 14 and would leave an owner unable to submit a coherent record after a rejection requiring rework. §9.5.2 — dashboard described as three sections, not two. US-AD-03 — deactivation blocked while a user is CC Owner or assigned Approver on any active record, mirroring BR-8.4.11; the harm is identical, since a deactivated approver cannot sign in and no reassignment mechanism exists. §6.4 — frontend must refresh the access token proactively at ~24 minutes (80% of its 30-minute life); session inactivity window is 2 hours, decoupled from the token lifetime so a missed refresh has room to recover. §13.2 — timezone configuration, CC reassignment, additional file types, Supporting Documents and self-service profile editing added to Planned Future Features. |
| 1.1 | 2026-07-14 | Ehab Ahmed | **Electronic Signature requirement added.** Native e-signature (username + password re-authentication) is now mandatory on all seven decision transitions (T2–T8); T1 record creation is exempt. No new CC fields; field count remains 50. No Security Matrix change. No state machine change. **New:** BO-8 (Enforce Attested Decision-Making); §8.8 E-Signature Rules (BR-8.8.1–8.8.10); Rule P7 (Identity Binding — sign as self only); FR-6.2.30–35, FR-6.5.11, FR-6.6.11; NFR-10.2.14–16; §9.2.6 Electronic Signature Modal; §9.4.7 Signature History Panel; TS-17–22; Limitation L9 (no lockout after failed signature attempts) and L10 (narrative field revisions not individually audited). **Amended:** §1.3.1 In Scope — Electronic Signatures capability added. §1.3.2 Out of Scope — blanket e-signature exclusion replaced; third-party providers (DocuSign, Adobe Sign) and PKI/cryptographic digital signatures remain out of scope. §3.2 — note added on the credential exchange; sequence diagram regenerated. §3.4 — E-Signature column added to the state transition table. §6.6.2 — Electronic Signature Events added as an auditable category; "User full name changed" added to User Management Actions; "or deleted" removed (contradicted FR-6.6.9, users are never deleted). §13.2 — e-signature removed from Planned Future Features (now delivered); third-party/PKI integration and account lockout added. Appendix A — glossary entries for Electronic Signature, Identity Binding, Meaning of Signature, Signature Manifestation, Signature Record. |
| 1.0 | 2026-04-14 | EAMI Project Team | Initial BRD — All gaps resolved, ready for development |

## Appendix D: Field Definitions & Validations

This appendix contains the complete field-by-field definitions and validation rules for all 50 fields. It was relocated from the main body to keep the narrative concise; the original subsection numbering (7.1–7.12) is retained so existing cross-references remain valid.

This section documents every one of the 50 fields in the Change Control module. For each field, the definition includes the field identifier, data type, validation rules, which role can edit the field and in which state, default values, help text, and examples. These definitions serve as the authoritative reference for development and testing.

Fields are grouped by their form section, matching the layout visible in the HTML prototypes.

### 7.1 Change Details — Identification (6 fields)

The Identification section displays system-generated metadata about the Change Control record. All six fields in this section are system-managed and read-only for all users in all states. They are displayed in a compact meta-grid layout (3 columns × 2 rows).

### Field 1: CC-ID

**Field ID:** cc_id

**Section:** Change Details — Identification

**Type:** System-generated text

**Mandatory:** Automatic (system-managed)

**Max Length:** 10 characters

**Editable By:** No user — system-generated at creation, read-only for all roles in all states

**Validation Rules:**

- Auto-generated by the system when a new CC record is created

- Must be unique across all records in the system

- Format: CC-XXX (e.g., CC-001, CC-002, CC-100)

- Sequential numbering; no gaps required but no duplicates permitted

- Cannot be modified after creation

**Default Value:** System-generated on creation

**Help Text:** None (displayed as a meta-value, not an input field)

**Display Pattern:** System-managed (meta-grid)

**Example:** "CC-001"

### Field 2: Current State

**Field ID:** current_state

**Section:** Change Details — Identification

**Type:** System-managed text

**Mandatory:** Automatic (system-managed)

**Editable By:** No user — system-managed, updated automatically on state transitions

**Validation Rules:**

- Must always contain one of the six valid state values: Initiated, Pending Implementation Approval, In Implementation, Pending Final Approval, Closed, Cancelled

- Updated automatically when a state transition occurs

- Cannot be directly edited by any user

**Default Value:** "Initiated" (set on creation)

**Help Text:** None

**Display Pattern:** System-managed (meta-grid). Also reflected in the status badge displayed in the page header.

**Example:** "Pending Implementation Approval"

### Field 3: Change Owner

**Field ID:** change_owner

**Section:** Change Details — Identification

**Type:** System-generated text

**Mandatory:** Automatic (system-managed)

**Editable By:** No user — auto-populated from the creator's identity, read-only for all roles in all states

**Validation Rules:**

- Auto-populated with the full name of the user who creates the CC record

- Cannot be changed after creation

- This field replaces any manual "Change Owner" dropdown — ownership is determined by who creates the record, not by manual selection

**Default Value:** Full name of the creating user

**Help Text:** None

**Display Pattern:** System-managed (meta-grid)

**Example:** "John Doe"

### Field 4: Last Updated By

**Field ID:** last_updated_by

**Section:** Change Details — Identification

**Type:** System-generated text

**Mandatory:** Automatic (system-managed)

**Editable By:** No user — auto-populated by the system on every save or submission

**Validation Rules:**

- Updated to the full name of the user who most recently saved, submitted, or performed a workflow action on the record

- Reflects the last person to modify the record, regardless of role

**Default Value:** Full name of the creating user (on initial creation)

**Help Text:** None

**Display Pattern:** System-managed (meta-grid)

**Example:** "Jane Smith"

### Field 5: Created On

**Field ID:** created_on

**Section:** Change Details — Identification

**Type:** System-generated datetime

**Mandatory:** Automatic (system-managed)

**Editable By:** No user — set once at creation, never changes

**Validation Rules:**

- Set to the current date and time when the CC record is first created

- Immutable — this value never changes after initial creation

**Default Value:** Current date and time at creation

**Help Text:** None

**Display Pattern:** System-managed (meta-grid). Displayed in a human-readable format (e.g., "25 Jan 2026, 11:33 AM").

**Example:** "25 Jan 2026, 11:33 AM"

### Field 6: Last Updated On

**Field ID:** last_updated_on

**Section:** Change Details — Identification

**Type:** System-generated datetime

**Mandatory:** Automatic (system-managed)

**Editable By:** No user — auto-populated by the system on every save or submission

**Validation Rules:**

- Updated to the current date and time whenever the record is saved, submitted, or a workflow action is performed

- Always ≥ Created On

**Default Value:** Current date and time at creation (same as Created On initially)

**Help Text:** None

**Display Pattern:** System-managed (meta-grid). Same display format as Created On.

**Example:** "29 Jan 2026, 12:00 PM"

### 7.2 Change Details — Change Definition (6 fields)

The Change Definition section captures the core details of the proposed change — what it is, what type, and what it affects. All six fields are editable by the CC Owner in the Initiated state and read-only in all other states for all roles.

### Field 7: Change Title

**Field ID:** change_title

**Section:** Change Details — Change Definition

**Type:** Text input (single line)

**Mandatory:** Yes

**Max Length:** 200 characters

**Editable By:** CC Owner in Initiated state only

**Validation Rules:**

- Required field — cannot be empty or whitespace only

- Maximum 200 characters

- Validated at submission time (Submit for Approval)

**Default Value:** None (empty on creation)

**Help Text:** "Enter a clear, descriptive title for this change"

**Display Pattern:** Editable input in Initiated state (CC Owner); read-only disabled input in all other states

**Example:** "Kiosk payment receipt display update"

### Field 8: Change Description

**Field ID:** change_description

**Section:** Change Details — Change Definition

**Type:** Textarea (multi-line)

**Mandatory:** Yes

**Max Length:** 2000 characters

**Editable By:** CC Owner in Initiated state only

**Validation Rules:**

- Required field — cannot be empty or whitespace only

- Maximum 2000 characters

- Validated at submission time

**Default Value:** None

**Help Text:** "Describe what will change, scope boundaries, and what is not changing"

**Display Pattern:** Editable textarea (4 rows) in Initiated state (CC Owner); read-only disabled textarea in all other states

**Example:** "Update the kiosk receipt layout to display the AED symbol consistently across payment summary screens. Scope includes UI template updates and formatting logic. Excludes any payment calculation or backend changes."

### Field 9: Change Type

**Field ID:** change_type

**Section:** Change Details — Change Definition

**Type:** Dropdown (single select)

**Mandatory:** Yes

**Editable By:** CC Owner in Initiated state only

**Dropdown Options:**

- Application

- Infrastructure

- Database

- Security

- Network

- Hardware

- Process

- Other

**Validation Rules:**

- Required — a value must be selected (not the default "Select type" placeholder)

- Validated at submission time

**Default Value:** None (placeholder: "Select type")

**Help Text:** None

**Display Pattern:** Editable dropdown in Initiated state (CC Owner); read-only disabled dropdown showing selected value in all other states

**Example:** "Application"

### Field 10: Change Category

**Field ID:** change_category

**Section:** Change Details — Change Definition

**Type:** Dropdown (single select)

**Mandatory:** Yes

**Editable By:** CC Owner in Initiated state only

**Dropdown Options:**

- Normal

- Standard

**Note:** The "Emergency" category has been intentionally excluded from Phase 1. There is no fast-track approval workflow. See Section 13.1 (Known Limitations) for details.

**Validation Rules:**

- Required — a value must be selected

- Validated at submission time

**Default Value:** None (placeholder: "Select category")

**Help Text:** None

**Display Pattern:** Editable dropdown in Initiated state (CC Owner); read-only disabled dropdown in all other states

**Example:** "Normal"

### Field 11: Department / Function

**Field ID:** department_function

**Section:** Change Details — Change Definition

**Type:** Dropdown (single select)

**Mandatory:** Yes

**Editable By:** CC Owner in Initiated state only

**Dropdown Options:**

- IT

- Operations

- Security

- QA

- Facilities

- Other

**Validation Rules:**

- Required — a value must be selected

- Validated at submission time

**Default Value:** None (placeholder: "Select department")

**Help Text:** None

**Display Pattern:** Editable dropdown in Initiated state (CC Owner); read-only disabled dropdown in all other states

**Example:** "IT"

### Field 12: Affected Systems / Modules

**Field ID:** affected_systems_modules

**Section:** Change Details — Change Definition

**Type:** Text input (single line)

**Mandatory:** Yes

**Max Length:** 500 characters

**Editable By:** CC Owner in Initiated state only

**Validation Rules:**

- Required — cannot be empty or whitespace only

- Maximum 500 characters

- Validated at submission time

**Default Value:** None

**Help Text:** "e.g. Kiosk App, Payment Service, Production Environment"

**Display Pattern:** Editable input in Initiated state (CC Owner); read-only disabled input in all other states

**Example:** "Kiosk App, Payment Service, Production Environment"

### 7.3 Change Details — Planning (4 fields)

The Planning section captures the timeline for the proposed change. It contains two date fields and two time fields, displayed in a 2×2 grid layout. The date fields have specific validation rules tied to business day calculations.

### Field 13: Proposed Implementation Date

**Field ID:** proposed_implementation_date

**Section:** Change Details — Planning

**Type:** Date picker

**Mandatory:** Yes

**Editable By:** CC Owner in Initiated state only

**Validation Rules:**

- Required — must be selected before submission

- At form fill time: must be ≥ 2 business days from the current date

- At submission time: must be in the future (greater than the current date). If the date has become past since it was originally entered, the submission is blocked with a validation error: "Proposed Implementation Date cannot be in the past. Please update."

- After the user updates the date following a validation failure, the system re-validates that the new date is still ≥ 2 business days from the new current date

- Business days exclude Saturdays and Sundays. Public holiday handling is not required in Phase 1.

**Default Value:** None

**Help Text:** None

**Display Pattern:** Editable date picker in Initiated state (CC Owner); read-only disabled date input showing the selected date in all other states

**Example:** "2026-01-28"

### Field 14: Target Closure Date

**Field ID:** target_closure_date

**Section:** Change Details — Planning

**Type:** Date picker

**Mandatory:** Yes

**Editable By:** CC Owner in Initiated state only (see permission rule below)

**Validation Rules:**

- Required — must be selected before submission

- At form fill time: must be ≥ 10 business days from the current date

- At submission time: must be in the future (greater than the current date). If the date has become past since it was originally entered, the submission is blocked with a validation error

- After the user updates the date following a validation failure, the system re-validates that the new date is still ≥ 10 business days from the new current date

- Business days exclude Saturdays and Sundays. Public holiday handling is not required in Phase 1.

**Permission Rule:** This field is editable whenever the record is in the Initiated state (both on initial creation and when the record returns to Initiated after a rejection). In all other states, it is read-only. See Section 4.4.2 for the detailed permission rule.

**Default Value:** None

**Help Text:** "Date by which this change should be fully closed (minimum 10 business days from now)"

**Display Pattern:** Editable date picker in Initiated state (CC Owner); read-only disabled date input in all other states

**Example:** "2026-02-15"

### Field 15: Implementation Window Start

**Field ID:** implementation_window_start

**Section:** Change Details — Planning

**Type:** Time picker

**Mandatory:** No

**Editable By:** CC Owner in Initiated state only

**Validation Rules:**

- Optional field

- If provided, should represent the planned start time for the implementation activity

- No cross-field validation against Implementation Window End in Phase 1 (recommended but not enforced)

**Default Value:** None

**Help Text:** "Optional (recommended for IT changes)"

**Display Pattern:** Editable time picker in Initiated state (CC Owner); read-only disabled time input in all other states

**Example:** "02:00"

### Field 16: Implementation Window End

**Field ID:** implementation_window_end

**Section:** Change Details — Planning

**Type:** Time picker

**Mandatory:** No

**Editable By:** CC Owner in Initiated state only

**Validation Rules:**

- Optional field

- If provided, should represent the planned end time for the implementation activity

- No cross-field validation against Implementation Window Start in Phase 1 (recommended but not enforced)

**Default Value:** None

**Help Text:** "Optional (recommended for IT changes)"

**Display Pattern:** Editable time picker in Initiated state (CC Owner); read-only disabled time input in all other states

**Example:** "04:00"

### 7.4 Impact & Risk Assessment (8 fields)

The Impact & Risk Assessment section captures the business justification, risk analysis, and supporting documentation for the proposed change. All eight fields are editable by the CC Owner in the Initiated state and read-only in all other states. Note that Risk Level is not in this section — it belongs to the Approvals — Implementation Approval section (Section 7.8) and is set by the Approver, not the CC Owner.

### Field 17: Reason for Change

**Field ID:** reason_for_change

**Section:** Impact & Risk Assessment

**Type:** Textarea (multi-line)

**Mandatory:** Yes

**Max Length:** 2000 characters

**Editable By:** CC Owner in Initiated state only

**Validation Rules:**

- Required — cannot be empty or whitespace only

- Maximum 2000 characters

- Validated at submission time

**Default Value:** None

**Help Text:** "Explain the business driver or justification"

**Display Pattern:** Editable textarea (3 rows) in Initiated state (CC Owner); read-only disabled textarea in all other states

**Example:** "Improve user clarity and reduce payment-related support tickets caused by inconsistent currency display across modules."

### Field 18: Business Impact

**Field ID:** business_impact

**Section:** Impact & Risk Assessment

**Type:** Textarea (multi-line)

**Mandatory:** Yes

**Max Length:** 2000 characters

**Editable By:** CC Owner in Initiated state only

**Validation Rules:**

- Required — cannot be empty or whitespace only

- Maximum 2000 characters

- Validated at submission time

**Default Value:** None

**Help Text:** "Describe impact on users, services, or operations"

**Display Pattern:** Editable textarea (3 rows) in Initiated state (CC Owner); read-only disabled textarea in all other states

**Example:** "User-visible UI change on payment/receipt screens. No service interruption expected. Minor risk of layout regression if not tested on kiosk resolution."

### Field 19: Expected Downtime

**Field ID:** expected_downtime

**Section:** Impact & Risk Assessment

**Type:** Dropdown (single select)

**Mandatory:** Yes

**Editable By:** CC Owner in Initiated state only

**Dropdown Options:**

- Yes

- No

- Unknown

**Validation Rules:**

- Required — a value must be selected

- Validated at submission time

**Default Value:** None (placeholder: "Select")

**Help Text:** None

**Display Pattern:** Editable dropdown in Initiated state (CC Owner); read-only disabled dropdown in all other states

**Example:** "No"

### Field 20: Requires Testing

**Field ID:** requires_testing

**Section:** Impact & Risk Assessment

**Type:** Dropdown (single select)

**Mandatory:** Yes

**Editable By:** CC Owner in Initiated state only

**Dropdown Options:**

- Yes – Full testing

- Yes – Partial testing

- No

**Validation Rules:**

- Required — a value must be selected

- Validated at submission time

**Default Value:** None (placeholder: "Select")

**Help Text:** None

**Display Pattern:** Editable dropdown in Initiated state (CC Owner); read-only disabled dropdown in all other states

**Example:** "Yes – Full testing"

### Field 21: Requires Training

**Field ID:** requires_training

**Section:** Impact & Risk Assessment

**Type:** Dropdown (single select)

**Mandatory:** Yes

**Editable By:** CC Owner in Initiated state only

**Dropdown Options:**

- Yes

- No

- Not applicable

**Validation Rules:**

- Required — a value must be selected

- Validated at submission time

**Default Value:** None (placeholder: "Select")

**Help Text:** None

**Display Pattern:** Editable dropdown in Initiated state (CC Owner); read-only disabled dropdown in all other states

**Example:** "No"

### Field 22: Risk Rationale

**Field ID:** risk_rationale

**Section:** Impact & Risk Assessment

**Type:** Textarea (multi-line)

**Mandatory:** Yes

**Max Length:** 2000 characters

**Editable By:** CC Owner in Initiated state only

**Validation Rules:**

- Required — cannot be empty or whitespace only

- Maximum 2000 characters

- Validated at submission time

**Default Value:** None

**Help Text:** "Explain why this change is considered low, medium, or high risk"

**Display Pattern:** Editable textarea (3 rows) in Initiated state (CC Owner); read-only disabled textarea in all other states

**Example:** "Low risk because the change is limited to UI formatting. Risk mainly relates to display regression on specific kiosk resolutions and printer output formatting."

### Field 23: Key Risks & Mitigations

**Field ID:** key_risks_mitigations

**Section:** Impact & Risk Assessment

**Type:** Textarea (multi-line)

**Mandatory:** Yes

**Max Length:** 2000 characters

**Editable By:** CC Owner in Initiated state only

**Validation Rules:**

- Required — cannot be empty or whitespace only

- Maximum 2000 characters

- Validated at submission time

**Default Value:** None

**Help Text:** "Identify the key risks associated with this change and describe the planned mitigation actions for each risk"

**Display Pattern:** Editable textarea (3 rows) in Initiated state (CC Owner); read-only disabled textarea in all other states

**Example:** "Risk: Receipt layout misalignment on kiosk resolution → Mitigation: Validate on 1080p kiosk screen + print test before go-live. Risk: Incorrect currency symbol rendering in Arabic locale → Mitigation: Test EN/AR language toggle and verify receipt output."

### Field 24: Supporting Documents

**Field ID:** supporting_documents

**Section:** Impact & Risk Assessment

**Type:** File upload

**Mandatory:** No

**Editable By:** CC Owner in Initiated state only

**Validation Rules:**

- Optional field

- Supported file types: PDF, DOCX, XLSX, PNG, JPG

- Maximum file size: 10MB per file

- Single file upload only. Users should combine related documents into one file before uploading.

**Default Value:** None (no files uploaded)

**Help Text:** "Click to upload or drag and drop files — PDF, DOCX, XLSX, PNG, JPG (Max 10MB)"

**Display Pattern:** Editable upload box in Initiated state (CC Owner); read-only display of uploaded file names in all other states (e.g., "Impact_Assessment.pdf (uploaded)")

**Example:** "Impact_Assessment.pdf"

### 7.5 Implementation Plan & Validation (4 fields)

The Implementation Plan & Validation section captures the CC Owner's planned approach to implementing the change, including how it will be validated and what the fallback plan is if something goes wrong. All four fields are editable by the CC Owner in the Initiated state and read-only in all other states for all roles.

### Field 25: High-Level Implementation Plan

**Field ID:** high_level_implementation_plan

**Section:** Implementation Plan & Validation

**Type:** Textarea (multi-line)

**Mandatory:** Yes

**Max Length:** 2000 characters

**Editable By:** CC Owner in Initiated state only

**Validation Rules:**

- Required — cannot be empty or whitespace only

- Maximum 2000 characters

- Validated at submission time

**Default Value:** None

**Help Text:** "Outline the high-level steps required to implement this change, including the sequence of activities and responsible parties where applicable"

**Display Pattern:** Editable textarea (3 rows) in Initiated state (CC Owner); read-only disabled textarea in all other states

**Example:** "1) Update receipt template UI to render AED symbol using the standard receipt component. 2) Test on QA kiosk device. 3) Deploy to staging. 4) Validate receipt printing. 5) Deploy to production during maintenance window."

### Field 26: Validation Approach

**Field ID:** validation_approach

**Section:** Implementation Plan & Validation

**Type:** Textarea (multi-line)

**Mandatory:** Yes

**Max Length:** 2000 characters

**Editable By:** CC Owner in Initiated state only

**Validation Rules:**

- Required — cannot be empty or whitespace only

- Maximum 2000 characters

- Validated at submission time

**Default Value:** None

**Help Text:** "Describe how the change will be verified or tested to confirm it has been implemented successfully"

**Display Pattern:** Editable textarea (3 rows) in Initiated state (CC Owner); read-only disabled textarea in all other states

**Example:** "Perform smoke testing on payment summary screen (cash/card), verify receipt preview, print a sample receipt, and validate EN/AR locale rendering."

### Field 27: Success Criteria

**Field ID:** success_criteria

**Section:** Implementation Plan & Validation

**Type:** Textarea (multi-line)

**Mandatory:** Yes

**Max Length:** 2000 characters

**Editable By:** CC Owner in Initiated state only

**Validation Rules:**

- Required — cannot be empty or whitespace only

- Maximum 2000 characters

- Validated at submission time

**Default Value:** None

**Help Text:** "Define the measurable criteria that will confirm this change was implemented successfully"

**Display Pattern:** Editable textarea (2 rows) in Initiated state (CC Owner); read-only disabled textarea in all other states

**Example:** "AED symbol and amounts display consistently across payment summary and printed receipts in both EN and AR without layout issues."

### Field 28: Rollback / Backout Plan

**Field ID:** rollback_backout_plan

**Section:** Implementation Plan & Validation

**Type:** Textarea (multi-line)

**Mandatory:** Yes

**Max Length:** 2000 characters

**Editable By:** CC Owner in Initiated state only

**Validation Rules:**

- Required — cannot be empty or whitespace only

- Maximum 2000 characters

- Validated at submission time

**Default Value:** None

**Help Text:** "Describe the actions required to restore the system or process to its previous state in the event of failure"

**Display Pattern:** Editable textarea (3 rows) in Initiated state (CC Owner); read-only disabled textarea in all other states

**Example:** "Revert to previous kiosk package build and redeploy. Restore prior receipt template version from release tag. Confirm payment screens render normally post-rollback."

### 7.6 Implementation Details (6 fields)

The Implementation Details section captures the actual outcomes of the implementation — what happened, when, what issues arose, and what evidence was collected. These fields are only editable by the CC Owner in the In Implementation state. In the Initiated and both Pending Approval states, these fields display as "Not applicable — Available after approval." In Closed and Cancelled states, they are read-only.

### Field 29: Actual Implementation Date

**Field ID:** actual_implementation_date

**Section:** Implementation Details

**Type:** Date picker

**Mandatory:** Yes (when submitting for final approval)

**Editable By:** CC Owner in In Implementation state only

**Validation Rules:**

- Required before the CC Owner can submit for final approval

- Should represent the date the change was actually implemented

- No specific minimum lead-time validation (this is a retrospective date, not a future-looking date)

**Default Value:** None

**Help Text:** None

**Display Pattern:**

- Initiated state: "Not applicable — Available after approval"

- Pending Implementation Approval state: "Not applicable — Available after approval"

- In Implementation state: Editable date picker (CC Owner)

- Pending Final Approval state: Read-only disabled date input showing the selected date

- Closed state: Read-only disabled date input

**Example:** "2026-01-28"

### Field 30: Post-Implementation Issues

**Field ID:** post_implementation_issues

**Section:** Implementation Details

**Type:** Dropdown (single select)

**Mandatory:** Yes (when submitting for final approval)

**Editable By:** CC Owner in In Implementation state only

**Dropdown Options:**

- None

- Minor issues resolved

- Issues requiring follow-up

**Validation Rules:**

- Required before the CC Owner can submit for final approval — a value must be selected

- Validated at submission time

**Default Value:** None (placeholder: "Select")

**Help Text:** None

**Display Pattern:**

- Initiated / Pending Implementation Approval: "Not applicable — Available after approval"

- In Implementation: Editable dropdown (CC Owner)

- Pending Final Approval / Closed: Read-only disabled dropdown showing the selected value

**Example:** "Minor issues resolved"

### Field 31: Implementation Summary

**Field ID:** implementation_summary

**Section:** Implementation Details

**Type:** Textarea (multi-line)

**Mandatory:** Yes (when submitting for final approval)

**Max Length:** 2000 characters

**Editable By:** CC Owner in In Implementation state only

**Validation Rules:**

- Required before submitting for final approval — cannot be empty or whitespace only

- Maximum 2000 characters

**Default Value:** None

**Help Text:** None

**Display Pattern:**

- Initiated / Pending Implementation Approval: "Not applicable — Available after approval"

- In Implementation: Editable textarea (CC Owner)

- Pending Final Approval / Closed: Read-only disabled textarea

**Example:** "Receipt template updated to use AED symbol from standard currency component. Deployed to QA, tested on kiosk device, validated print output. Deployed to production on 28 Jan during 02:00–03:30 maintenance window. No service interruption."

### Field 32: Deviations from Plan

**Field ID:** deviations_from_plan

**Section:** Implementation Details

**Type:** Textarea (multi-line)

**Mandatory:** No

**Max Length:** 2000 characters

**Editable By:** CC Owner in In Implementation state only

**Validation Rules:**

- Optional field

- Maximum 2000 characters

**Default Value:** None

**Help Text:** None

**Display Pattern:**

- Initiated / Pending Implementation Approval: "Not applicable — Available after approval"

- In Implementation: Editable textarea (CC Owner)

- Pending Final Approval / Closed: Read-only disabled textarea

**Example:** "Implementation window extended by 30 minutes due to unexpected cache invalidation step. No impact on service availability."

### Field 33: Validation Performed

**Field ID:** validation_performed

**Section:** Implementation Details

**Type:** Textarea (multi-line)

**Mandatory:** Yes (when submitting for final approval)

**Max Length:** 2000 characters

**Editable By:** CC Owner in In Implementation state only

**Validation Rules:**

- Required before submitting for final approval — cannot be empty or whitespace only

- Maximum 2000 characters

**Default Value:** None

**Help Text:** None

**Display Pattern:**

- Initiated / Pending Implementation Approval: "Not applicable — Available after approval"

- In Implementation: Editable textarea (CC Owner)

- Pending Final Approval / Closed: Read-only disabled textarea

**Example:** "Smoke testing completed for cash and card payments. Receipt preview and printed output validated in EN and AR."

### Field 34: Implementation Evidence

**Field ID:** implementation_evidence

**Section:** Implementation Details

**Type:** File upload

**Mandatory:** Yes (when submitting for final approval)

**Editable By:** CC Owner in In Implementation state only

**Validation Rules:**

- Required before the CC Owner can submit for final approval

- Supported file types: PDF, DOCX, XLSX, PNG, JPG

- Maximum file size: 10MB per file

- Single file upload only. Users should combine related evidence into one file before uploading.

**Default Value:** None (no files uploaded)

**Help Text:** "PDF, DOCX, XLSX, PNG, JPG (Max 10MB)"

**Display Pattern:**

- Initiated / Pending Implementation Approval: Upload box displayed as disabled with "Not applicable — Available after approval" message

- In Implementation: Active upload box (CC Owner)

- Pending Final Approval / Closed: Read-only display of uploaded file names (e.g., "UAT_Scripts.pdf (uploaded)")

**Example:** "UAT_Scripts.pdf"

### 7.7 Approvals — Initiation (2 fields)

The Approvals — Initiation section captures the CC Owner's approver selection and any comments they want the Approver to consider during review. Both fields are editable by the CC Owner in the Initiated state and read-only in all other states.

### Field 35: Assign Approver

**Field ID:** assign_approver

**Section:** Approvals — Initiation

**Type:** Dropdown (single select, dynamic — populated from user database)

**Mandatory:** Yes

**Editable By:** CC Owner in Initiated state only

**Validation Rules:**

- Required — an Approver must be selected before submission

- The dropdown shall only display users who currently hold the Approver role in the system. Users with CC Owner, Viewer, or Admin roles shall not appear.

- Since each user holds only one role at a time, the CC Owner (who holds the CC Owner role) will never appear in this dropdown.

- The system prevents the edge case where a CC Owner's role could be changed to Approver while they have active records: Admin cannot change a user's role if they are associated with any active CC records (see FR-6.2.29 and BR-8.4.11). This structurally prevents a CC Owner from ever becoming selectable as Approver on their own record.

- Changes to this field are tracked in the audit log.

**Default Value:** None (placeholder: "Select Approver")

**Help Text:** "Select the person who will approve this change"

**Display Pattern:** Editable dropdown in Initiated state (CC Owner); read-only disabled dropdown showing the selected Approver's name in all other states

**Example:** "Jane Smith"

### Field 36: Comments for Approver

**Field ID:** comments_for_approver

**Section:** Approvals — Initiation

**Type:** Textarea (multi-line)

**Mandatory:** No

**Max Length:** 2000 characters

**Editable By:** CC Owner in Initiated state only

**Validation Rules:**

- Optional field

- Maximum 2000 characters

**Default Value:** None

**Help Text:** "Optional comments for the approver"

**Display Pattern:** Editable textarea (3 rows) in Initiated state (CC Owner); read-only disabled textarea in all other states

**Example:** "Please review for implementation approval. Change is UI-only; testing planned in QA before rollout."

### 7.8 Approvals — Implementation Approval (5 fields)

The Implementation Approval section contains the Approver's decision fields and the system-generated approval tracking fields. Three fields (Decision, Risk Level, Decision Comments) are editable by the Approver in the Pending Implementation Approval state. Two fields (Implementation Approval By, Implementation Approval On) are system-generated and always read-only.

### Field 37: Decision

**Field ID:** decision

**Section:** Approvals — Implementation Approval

**Type:** Dropdown (single select)

**Mandatory:** Yes (when Approver submits decision)

**Editable By:** Approver in Pending Implementation Approval state only

**Dropdown Options:**

- Approve

- Reject

**Validation Rules:**

- Required when the Approver clicks "Submit Decision"

- The value of this field determines the state transition (see Section 3.4, Transitions T4 and T5):

- "Approve" → state transitions to In Implementation

- "Reject" → state transitions to Initiated (loop back)

- This field is overwritten if the record is rejected and later re-reviewed. The old value is preserved in the audit log before overwrite.

- Changes to this field are always tracked in the audit log.

**Default Value:** None (placeholder: "Select" or no selection)

**Help Text:** None

**Display Pattern:**

- Initiated state: "Not applicable — Pending submission"

- Pending Implementation Approval state: Editable dropdown (Approver only)

- In Implementation / Pending Final Approval / Closed: Read-only disabled dropdown showing the decision value (e.g., "Approve")

- Cancelled: "N/A"

**Example:** "Approve"

### Field 38: Risk Level

**Field ID:** risk_level

**Section:** Approvals — Implementation Approval

**Type:** Dropdown (single select)

**Mandatory:** Yes (when Approver submits decision)

**Editable By:** Approver in Pending Implementation Approval state only

**Dropdown Options:**

- Low

- Medium

- High

**Important:** Risk Level is set exclusively by the Approver, not by the CC Owner. The CC Owner provides their own risk rationale in the Impact & Risk Assessment section (field 22: Risk Rationale), but the formal Risk Level classification is an independent Approver assessment.

**Validation Rules:**

- Required when the Approver clicks "Submit Decision" — submission is blocked if Risk Level is not selected

- This field is overwritten if the record is rejected and later re-reviewed. The old value is preserved in the audit log before overwrite.

- Changes to this field are always tracked in the audit log.

**Default Value:** None (placeholder: "Select" or no selection)

**Help Text:** "Not applicable — Will be set by approver during review" (shown to CC Owner in Initiated state)

**Display Pattern:**

- Initiated state: "Not applicable — Will be set by approver during review"

- Pending Implementation Approval state: Editable dropdown (Approver only)

- In Implementation / Pending Final Approval / Closed: Read-only disabled dropdown showing the selected risk level

- Cancelled: "N/A"

**Example:** "Low"

### Field 39: Decision Comments

**Field ID:** decision_comments

**Section:** Approvals — Implementation Approval

**Type:** Textarea (multi-line)

**Mandatory:**  Yes (when Approver submits decision)

**Max Length:** 2000 characters

**Editable By:** Approver in Pending Implementation Approval state only

**Validation Rules:**

- Required when the Approver clicks "Submit Decision" — submission is blocked if Decision Comments is empty or whitespace only

- Maximum 2000 characters

- Used for both Approve and Reject decisions — there is no separate "Rejection Comments" field

- This field is overwritten if the record is rejected and later re-reviewed. The old value (including rejection rationale) is preserved in the audit log before overwrite.

- Changes to this field are always tracked in the audit log.

**Default Value:** None

**Help Text:** "Provide rationale for your decision"

**Display Pattern:**

- Initiated state: "Not applicable — Pending submission"

- Pending Implementation Approval state: Editable textarea (Approver only)

- In Implementation / Pending Final Approval / Closed: Read-only disabled textarea showing the Approver's comments

- Cancelled: "N/A"

**Example (Approval):** "All requirements met. Risk is low — UI-only change with adequate testing plan and rollback procedure."

**Example (Rejection):** "Risk mitigation plan is insufficient. Please provide specific rollback steps for each deployment stage."

### Field 40: Implementation Approval By

**Field ID:** implementation_approval_by

**Section:** Approvals — Implementation Approval

**Type:** System-generated text

**Mandatory:** Automatic (system-managed)

**Editable By:** No user — system-generated when the Approver submits an Approve decision

**Validation Rules:**

- Auto-populated with the Approver's full name when Decision = "Approve" is submitted

- Only populated on approval, not on rejection

- Read-only for all roles in all states

**Default Value:** "—" (dash, indicating not yet populated)

**Help Text:** None

**Display Pattern:** System-managed read-only value. Displays "—" until the Implementation Approval decision is submitted as Approve, then displays the Approver's name.

**Example:** "Jane Smith"

### Field 41: Implementation Approval On

**Field ID:** implementation_approval_on

**Section:** Approvals — Implementation Approval

**Type:** System-generated datetime

**Mandatory:** Automatic (system-managed)

**Editable By:** No user — system-generated when the Approver submits an Approve decision

**Validation Rules:**

- Auto-populated with the current date and time when Decision = "Approve" is submitted

- Only populated on approval, not on rejection

- Read-only for all roles in all states

**Default Value:** "—" (dash, indicating not yet populated)

**Help Text:** None

**Display Pattern:** System-managed read-only value. Displays "—" until approval, then displays the timestamp in the same format as Created On (e.g., "26 Jan 2026, 4:00 PM").

**Example:** "26 Jan 2026, 4:00 PM"

### 7.9 Approvals — Final Approval (4 fields)

The Final Approval section contains the Approver's final decision fields and the system-generated final approval tracking fields. Two fields (Final Decision, Final Comments) are editable by the Approver in the Pending Final Approval state. Two fields (Final Approval By, Final Approval On) are system-generated and always read-only.

### Field 42: Final Decision

**Field ID:** final_decision

**Section:** Approvals — Final Approval

**Type:** Dropdown (single select)

**Mandatory:** Yes (when Approver submits final decision)

**Editable By:** Approver in Pending Final Approval state only

**Dropdown Options:**

- Approve

- Reject

**Validation Rules:**

- Required when the Approver clicks "Submit Decision" at the Final Approval gate

- The value of this field determines the state transition (see Section 3.4, Transitions T7 and T8):

- "Approve" → state transitions to Closed

- "Reject" → state transitions to In Implementation (loop back)

- This field is overwritten if the record is rejected and later re-reviewed. The old value is preserved in the audit log before overwrite.

- Changes to this field are always tracked in the audit log.

**Default Value:** None (placeholder: "Select" or no selection)

**Help Text:** None

**Display Pattern:**

- Initiated / Pending Implementation Approval / In Implementation: "Not applicable — Pending implementation"

- Pending Final Approval: Editable dropdown (Approver only)

- Closed: Read-only disabled dropdown showing the decision value (e.g., "Approve")

- Cancelled: "N/A"

**Example:** "Approve"

### Field 43: Final Comments

**Field ID:** final_comments

**Section:** Approvals — Final Approval

**Type:** Textarea (multi-line)

**Mandatory:** Yes (when Approver submits final decision)

**Max Length:** 2000 characters

**Editable By:** Approver in Pending Final Approval state only

**Validation Rules:**

- Required when the Approver clicks "Submit Decision" at the Final Approval gate — submission is blocked if Final Comments is empty or whitespace only

- Maximum 2000 characters

- Used for both Approve and Reject final decisions — there is no separate "Final Rejection Comments" field

- This field is overwritten if the record is rejected and later re-reviewed. The old value (including rejection rationale) is preserved in the audit log before overwrite.

- Changes to this field are always tracked in the audit log.

**Default Value:** None

**Help Text:** None

**Display Pattern:**

- Initiated / Pending Implementation Approval / In Implementation: "Not applicable — Pending implementation"

- Pending Final Approval: Editable textarea (Approver only)

- Closed: Read-only disabled textarea showing the Approver's final comments

- Cancelled: "N/A"

**Example (Approval):** "Implementation completed as planned. Evidence reviewed and satisfactory. Change approved for closure."

**Example (Rejection):** "Validation evidence is incomplete. Please provide test results for the Arabic locale receipt output."

### Field 44: Final Approval By

**Field ID:** final_approval_by

**Section:** Approvals — Final Approval

**Type:** System-generated text

**Mandatory:** Automatic (system-managed)

**Editable By:** No user — system-generated when the Approver submits a Final Decision of Approve

**Validation Rules:**

- Auto-populated with the Approver's full name when Final Decision = "Approve" is submitted

- Only populated on approval, not on rejection

- Read-only for all roles in all states

**Default Value:** "—" (dash, indicating not yet populated)

**Help Text:** None

**Display Pattern:** System-managed read-only value. Displays "—" until the Final Approval decision is submitted as Approve, then displays the Approver's name.

**Example:** "Jane Smith"

### Field 45: Final Approval On

**Field ID:** final_approval_on

**Section:** Approvals — Final Approval

**Type:** System-generated datetime

**Mandatory:** Automatic (system-managed)

**Editable By:** No user — system-generated when the Approver submits a Final Decision of Approve

**Validation Rules:**

- Auto-populated with the current date and time when Final Decision = "Approve" is submitted

- Only populated on approval, not on rejection

- Read-only for all roles in all states

**Default Value:** "—" (dash, indicating not yet populated)

**Help Text:** None

**Display Pattern:** System-managed read-only value. Displays "—" until final approval, then displays the timestamp in the standard format (e.g., "29 Jan 2026, 12:00 PM").

**Example:** "29 Jan 2026, 12:00 PM"

### 7.10 Approvals — Status (3 fields)

The Status section contains system-managed status labels that indicate the current position in the approval lifecycle, plus the Actual Closure Date which is set when the record reaches the Closed state. All three fields are system-generated and read-only for all users in all states.

### Field 46: Implementation Approval Status

**Field ID:** implementation_approval_status

**Section:** Approvals — Status

**Type:** System-managed text (status label)

**Mandatory:** Automatic (system-managed)

**Editable By:** No user — system-managed, updated automatically based on the current workflow state

**Valid Values:**

- Not Submitted

- Pending

- Approved

- N/A

**Validation Rules:**

- The system sets this value automatically based on the current state. It cannot be directly edited by any user.

- Value mapping by state:

| **Workflow State** | **Implementation Approval Status** |
| --- | --- |
| Initiated | Not Submitted |
| Pending Implementation Approval | Pending |
| In Implementation | Approved |
| Pending Final Approval | Approved |
| Closed | Approved |
| Cancelled | N/A |

**Important:** The value is "Not Submitted" — not "Not Yet Submitted." Use the exact value as specified.

**Default Value:** "Not Submitted" (set on creation)

**Help Text:** None

**Display Pattern:** System-managed read-only value (meta-value style), displayed in the Status subsection of the Approvals card.

**Example:** "Pending"

### Field 47: Final Approval Status

**Field ID:** final_approval_status

**Section:** Approvals — Status

**Type:** System-managed text (status label)

**Mandatory:** Automatic (system-managed)

**Editable By:** No user — system-managed, updated automatically based on the current workflow state

**Valid Values:**

- Not Submitted

- Pending

- Approved

- N/A

**Validation Rules:**

- The system sets this value automatically based on the current state. It cannot be directly edited by any user.

- Value mapping by state:

| **Workflow State** | **Final Approval Status** |
| --- | --- |
| Initiated | Not Submitted |
| Pending Implementation Approval | Not Submitted |
| In Implementation | Not Submitted |
| Pending Final Approval | Pending |
| Closed | Approved |
| Cancelled | N/A |

**Important:** The value is "Not Submitted" — not "Not Yet Submitted." Use the exact value as specified.

**Default Value:** "Not Submitted" (set on creation)

**Help Text:** None

**Display Pattern:** System-managed read-only value (meta-value style), displayed alongside Implementation Approval Status in a 2-column grid.

**Example:** "Approved"

### Field 48: Actual Closure Date

**Field ID:** actual_closure_date

**Section:** Approvals — Status

**Type:** System-generated datetime

**Mandatory:** Automatic (system-managed)

**Editable By:** No user — system-generated when the state transitions to Closed

**Validation Rules:**

- Auto-populated with the current date and time at the moment the Approver submits Final Decision = "Approve" and the state transitions to Closed

- Only populated when the record reaches the Closed state — remains empty ("—") in all other states

- Read-only for all roles in all states

- Never populated for Cancelled records

**Default Value:** "—" (dash, indicating not yet populated)

**Help Text:** "System-captured when CC is closed"

**Display Pattern:** System-managed read-only value. Displays "—" in all states until the record is closed, then displays the closure timestamp in the standard format.

**Example:** "29 Jan 2026, 12:00 PM"

### 7.11 Additional Information (2 fields)

The Additional Information section contains the general Comments field and the Cancellation Reason field. Comments is editable by the CC Owner in the Initiated state. Cancellation Reason is a special field that is hidden in all states except Cancelled, and its value is captured via a popup modal during the cancellation action rather than through an inline form control.

### Field 49: Comments

**Field ID:** comments

**Section:** Additional Information

**Type:** Textarea (multi-line)

**Mandatory:** No

**Max Length:** 2000 characters

**Editable By:** CC Owner in Initiated state only

**Validation Rules:**

- Optional field

- Maximum 2000 characters

**Default Value:** None

**Help Text:** "Add any additional information or context"

**Display Pattern:** Editable textarea (4 rows) in Initiated state (CC Owner); read-only disabled textarea in all other states. Always visible in all states (unlike Cancellation Reason which is conditionally visible).

**Example:** "This change aligns with our Q2 digital transformation initiative. No backend changes. No DB changes. UI-only update with kiosk validation planned."

### Field 50: Cancellation Reason

**Field ID:** cancellation_reason

**Section:** Additional Information

**Type:** Textarea (multi-line)

**Mandatory:** Yes (when cancelling a CC)

**Max Length:** 500 characters

**Editable By:** CC Owner during the cancellation action only (entered via popup modal, not through an inline form field)

**Validation Rules:**

- Required when cancelling — cannot be empty or whitespace only

- Maximum 500 characters

- Validated within the cancellation popup modal before confirmation is allowed

- This field is not editable through the normal form interface. The value is captured exclusively through the cancellation modal and saved to the record on confirmation.

- Once saved, the value is permanently read-only and cannot be modified.

**Default Value:** None (field is hidden until cancellation occurs)

**Help Text:** "Provide reason for cancelling this Change Control (required)" (shown in the cancellation popup modal)

**Visibility Rules:**

- **Initiated state:** Hidden — the field does not appear on the form. The value is entered through the cancellation popup modal.

- **Pending Implementation Approval state:** Hidden

- **In Implementation state:** Hidden

- **Pending Final Approval state:** Hidden

- **Closed state:** Hidden

- **Cancelled state:** Visible — displayed in the Additional Information section below the Comments field as a read-only textarea showing the reason that was entered during cancellation.

**Display Pattern:** Conditional visibility (the 5th field display pattern — see Section 9.2.5). When visible in the Cancelled state, displayed as a read-only disabled textarea.

**Example:** "Business requirements changed after stakeholder review, this change is no longer needed."

### 7.12 Field Summary

The following table provides a complete summary of all 50 fields for quick reference. For detailed definitions, validation rules, and display patterns, refer to the individual field definitions in Sections 7.1 through 7.11.

| **#** | **Field Name** | **Section** | **Type** | **Mandatory** | **Editable By** |
| --- | --- | --- | --- | --- | --- |
| 1 | CC-ID | Identification | System-generated | Auto | System |
| 2 | Current State | Identification | System-managed | Auto | System |
| 3 | Change Owner | Identification | System-generated | Auto | System |
| 4 | Last Updated By | Identification | System-generated | Auto | System |
| 5 | Created On | Identification | System-generated | Auto | System |
| 6 | Last Updated On | Identification | System-generated | Auto | System |
| 7 | Change Title | Change Definition | Text input | Yes | CC Owner — Initiated |
| 8 | Change Description | Change Definition | Textarea | Yes | CC Owner — Initiated |
| 9 | Change Type | Change Definition | Dropdown | Yes | CC Owner — Initiated |
| 10 | Change Category | Change Definition | Dropdown | Yes | CC Owner — Initiated |
| 11 | Department / Function | Change Definition | Dropdown | Yes | CC Owner — Initiated |
| 12 | Affected Systems / Modules | Change Definition | Text input | Yes | CC Owner — Initiated |
| 13 | Proposed Implementation Date | Planning | Date picker | Yes | CC Owner — Initiated |
| 14 | Target Closure Date | Planning | Date picker | Yes | CC Owner — Initiated |
| 15 | Implementation Window Start | Planning | Time picker | No | CC Owner — Initiated |
| 16 | Implementation Window End | Planning | Time picker | No | CC Owner — Initiated |
| 17 | Reason for Change | Impact & Risk | Textarea | Yes | CC Owner — Initiated |
| 18 | Business Impact | Impact & Risk | Textarea | Yes | CC Owner — Initiated |
| 19 | Expected Downtime | Impact & Risk | Dropdown | Yes | CC Owner — Initiated |
| 20 | Requires Testing | Impact & Risk | Dropdown | Yes | CC Owner — Initiated |
| 21 | Requires Training | Impact & Risk | Dropdown | Yes | CC Owner — Initiated |
| 22 | Risk Rationale | Impact & Risk | Textarea | Yes | CC Owner — Initiated |
| 23 | Key Risks & Mitigations | Impact & Risk | Textarea | Yes | CC Owner — Initiated |
| 24 | Supporting Documents | Impact & Risk | File upload (single) | No | CC Owner — Initiated |
| 25 | High-Level Implementation Plan | Impl Plan & Validation | Textarea | Yes | CC Owner — Initiated |
| 26 | Validation Approach | Impl Plan & Validation | Textarea | Yes | CC Owner — Initiated |
| 27 | Success Criteria | Impl Plan & Validation | Textarea | Yes | CC Owner — Initiated |
| 28 | Rollback / Backout Plan | Impl Plan & Validation | Textarea | Yes | CC Owner — Initiated |
| 29 | Actual Implementation Date | Implementation Details | Date picker | Yes* | CC Owner — In Implementation |
| 30 | Post-Implementation Issues | Implementation Details | Textarea | Yes* | CC Owner — In Implementation |
| 31 | Implementation Summary | Implementation Details | Textarea | Yes* | CC Owner — In Implementation |
| 32 | Deviations from Plan | Implementation Details | Textarea | No | CC Owner — In Implementation |
| 33 | Validation Performed | Implementation Details | Textarea | Yes* | CC Owner — In Implementation |
| 34 | Implementation Evidence | Implementation Details | File upload (single) | Yes* | CC Owner — In Implementation |
| 35 | Assign Approver | Approvals — Initiation | Dropdown (dynamic) | Yes | CC Owner — Initiated |
| 36 | Comments for Approver | Approvals — Initiation | Textarea | No | CC Owner — Initiated |
| 37 | Decision | Approvals — Impl Approval | Dropdown | Yes** | Approver — Pending Impl Approval |
| 38 | Risk Level | Approvals — Impl Approval | Dropdown | Yes** | Approver — Pending Impl Approval |
| 39 | Decision Comments | Approvals — Impl Approval | Textarea | Yes** | Approver — Pending Impl Approval |
| 40 | Implementation Approval By | Approvals — Impl Approval | System-generated | Auto | System |
| 41 | Implementation Approval On | Approvals — Impl Approval | System-generated | Auto | System |
| 42 | Final Decision | Approvals — Final Approval | Dropdown | Yes** | Approver — Pending Final Approval |
| 43 | Final Comments | Approvals — Final Approval | Textarea | Yes** | Approver — Pending Final Approval |
| 44 | Final Approval By | Approvals — Final Approval | System-generated | Auto | System |
| 45 | Final Approval On | Approvals — Final Approval | System-generated | Auto | System |
| 46 | Implementation Approval Status | Approvals — Status | System-managed | Auto | System |
| 47 | Final Approval Status | Approvals — Status | System-managed | Auto | System |
| 48 | Actual Closure Date | Approvals — Status | System-generated | Auto | System |
| 49 | Comments | Additional Information | Textarea | No | CC Owner — Initiated |
| 50 | Cancellation Reason | Additional Information | Textarea | Yes*** | CC Owner — Cancellation action only |

**Table Notes:**

- Mandatory when submitting for final approval (from In Implementation state)

- * Mandatory when submitting decision at the respective approval gate

- ** Mandatory only when cancelling a CC (entered via popup modal)

- "System" in the Editable By column means the field is system-generated and read-only for all users in all states

- All fields are read-only for all roles in the Closed and Cancelled states

**Field Count Verification:**

- System-generated fields: 13 (fields 1–6, 40–41, 44–45, 46–48)

- User-editable fields: 37 (fields 7–39, 42–43, 49–50)

- **Total: 50 fields** 

Page 1 of 1