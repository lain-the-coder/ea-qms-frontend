# Frontend — Progress

Read this at the start of every session. Update it at the end of every build step,
once the step has been verified.

---

## Status

**Current step:** 1 — Scaffold
**Last verified:** —

| Step | | Verified by |
|---|---|---|
| 1 · Scaffold + `global.css` | ⬜ | |
| 2 · `types.ts` | ⬜ | |
| 3 · Login + auth store + `api.ts` | ⬜ | |
| 4 · Authenticated layout | ⬜ | |
| 5 · Dashboard | ⬜ | |
| 6 · All Change Controls | ⬜ | |
| 7a · CC form, read-only | ⬜ | |
| 7b · Bind the fields | ⬜ | |
| 7c · Save Draft | ⬜ | |
| 7d · Dirty tracking | ⬜ | |
| 8 · Create + `Initiated` role views | ⬜ | |
| 9 · T2 submit + e-signature modal | ⬜ | |
| 10 · T3 cancel | ⬜ | |
| 11 · Approver flow (T4/T5) | ⬜ | |
| 12 · `In Implementation` + file upload | ⬜ | |
| 13 · T6 + final decision + signature history | ⬜ | |
| 14 · File download | ⬜ | |
| 15 · Admin user management | ⬜ | |
| 16 · Activity-gated refresh | ⬜ | |
| 17 · Inactivity popup | ⬜ | |

---

## Checkpoints

*One entry per completed step. What was built, and — more importantly — what was
verified. "Confirmed in psql that untouched fields were unchanged" is worth more
than "Save Draft works."*

<!--
### ✅ Step N — <name>

**Built:** …

**Verified:**
- …
- …

**Notes:** anything the next session needs and cannot read from the code.
-->

---

## Decisions

*Numbered, with reasoning and the rejected alternative. Reversals are recorded as
new rows that say what changed and why — the original stays.*

| # | Decision | Reasoning |
|---|---|---|
| | | |

---

## Flags

*Known, deliberately deferred, with the reason. **A flag is not a defect** — keep
the two apart, or the real problems get lost among the accepted trade-offs.*

| # | Flag | Status |
|---|---|---|
| | | |

---

## Document corrections needed

*Where the code and a guardrail document disagreed, and which was wrong. If a
document was wrong, it needs amending — otherwise the next reader "corrects" the
code back.*

| Document | What is wrong | |
|---|---|---|
| | | |

---

## Carried over from the backend phase

Things already known that the frontend has to respect. Do not re-derive these.

| | |
|---|---|
| **API** | Complete. 23 endpoints, unchanged during this build |
| **Enum values** | ASCII hyphens, not en-dashes. Take them from `docs/openapi.yaml` |
| **Save then submit** | Transitions carry no field values; Submit is disabled while dirty |
| **`openapi.yaml`** | Hand-written from the handler code — a transcription, so **not infallible**. If a response disagrees, check the Go handler and fix the spec |
| **Untested** | `global.css` inside a Svelte component (step 1 proves it) · the activity-gated refresh (step 16) |
