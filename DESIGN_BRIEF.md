# Harness Design Brief

**Project:** StoreOps Development Harness
**Feature demonstrated:** SLA breach alerting + shift-handover bulk status update
**Stack:** Node.js 20 / TypeScript (strict) / Express, Jest + supertest
**Deployment target:** Google Cloud Platform -- Cloud Run + Artifact Registry + Cloud Build

---

## Section A -- Intent Decomposition

### How the feature was broken into sprint contracts

The feature prompt in `PROMPT.md` bundles two capabilities: SLA breach
alerting/escalation, and a bulk activity-status endpoint. Both were
scoped into a **single sprint** rather than two, for a specific reason:
they share the same idempotent state-transition logic
(`evaluateSlaForTask`), and splitting them into separate sprints would
have forced either (a) the bulk endpoint sprint to duplicate
breach-detection logic that Sprint 2 would then have to refactor into
the shared form, or (b) an artificial ordering dependency where the bulk
endpoint sprint blocks on the SLA sprint for no architectural reason. The
sizing guidance in `sprint-decomposition/SKILL.md` -- "at most 2-3 files
per layer in at most 2 modules" -- was checked against the actual diff
(7 files across `activities` and `alerts`, 3 layers) and confirmed to fit
within a single sprint's bound rather than requiring a split.

The sprint boundary that *would* apply on a harder version of this
feature is module count, not line count: if the escalation target had
required a genuine `staff` module change (e.g. adding a "resolve store
manager" lookup), that would have been Sprint 2, because it touches a
third module's public service surface and deserves its own Evaluator
pass focused specifically on whether the new `staff` read method
respects Rule 1 (module boundary) independently of whether the
`activities`/`alerts` wiring does.

### How acceptance criteria were structured, and what made them testable

Every AC in `sprint-1-contract.md` follows GIVEN/WHEN/THEN with an
outcome stated as an *observable system behavior* (an event was emitted
exactly once; a specific `failures` array shape appeared in a response
body) rather than an internal implementation detail (a private method
was called). This distinction is what `sprint-decomposition/SKILL.md`'s
"could two engineers independently write a passing/failing test from
this sentence" test is actually checking for: an AC phrased as "the
service should handle overdue tasks" fails that test because "handle"
is undefined; an AC phrased as "exactly one ACTIVITY_SLA_BREACH event is
emitted... and a second sweep run does not emit a duplicate" passes it,
because the pass/fail condition is mechanically checkable by counting
events across two calls.

### Example sprint contract entry, in full

```
AC-1: GIVEN a task with priority HIGH or CRITICAL, status not DONE,
      and a dueDate in the past
      WHEN the SLA sweep runs
      THEN exactly one ACTIVITY_SLA_BREACH event is emitted for that
      task, and a second sweep run does not emit a duplicate event
      for the same task
```

This single AC encodes three separable, independently testable claims
(the trigger condition, the emission, and idempotency on repeat) rather
than one vague claim -- which is exactly why `tests/activities/ActivityService.sla.test.ts`
can assert all three in one focused test without ambiguity about what
"done" means for this AC.

---

## Section B -- Governance Framework

### Skill file strategy

Eight skill files exist, split by audience exactly the way agent context
should be scoped (CLAUDE.md Section 6):

| File | Read by | Encodes |
|---|---|---|
| `app-context` | all 4 agents | what StoreOps and its GCP topology are (shared, kept short) |
| `architecture-principles` | Planner, Generator, Evaluator | the 5 non-negotiable rules, each traced to a named client failure mode |
| `sprint-decomposition` | Planner only | how to size a sprint and write a testable AC |
| `coding-conventions` | Generator only | StoreOps-specific file naming, TS strictness, error-contract usage |
| `api-integration` | Generator only | the concrete cross-module read/write wiring patterns |
| `how-to-test` | Generator only | what "tests business rules, not status codes" means, with a worked bad/good pair |
| `how-to-review` | Evaluator only | what automated tools can't see, with 4 concrete smell patterns |
| `grading-criteria` | Evaluator only | the full weighted evaluation framework (Section C below) |

No file is generic. Every rule statement in `architecture-principles`
includes both a compliant and a violating code snippet lifted from this
actual codebase's shape, and every rule is explicitly mapped to one of
the four failure modes named in the case study's client context -- a
reviewer can trace any hard gate back to "why does this exist" in one
hop.

### How `.harness/reviews/` functions as a governance audit trail

Each sprint's `generator-summary.md`, `evaluator-feedback.md`, and
`run-log.md` are committed together, forming a chain of evidence:
contract -> what the Generator claims it did -> what the Evaluator
independently verified -> what the Monitor recorded as the outcome. This
is readable by anyone with repository access (the client's standards
team, a new architect joining the engagement, an auditor) without
needing to re-run anything -- the `sprint-1-*` triad in this repository
is that evidence for the one sprint executed so far.

A recurring quality issue would surface exactly the way it's described
in `monitor.agent.md`: if three consecutive `run-log.md` files all note
a Rule 2 (event bus) violation in their "Quality trend notes," that's a
signal the `coding-conventions` or `api-integration` skill file needs a
sharper example, not that the Generator needs a fourth retry attempt --
the fix targets the skill file, because the skill file is what's shared
across every future sprint, while any single Generator attempt is
disposable.

### One skill file rule, examined

**The event-bus-only rule (Rule 2):** "side effects that cross a module
boundary must be raised via `EventBus.emit()`, never a direct import of
the target module's service." Without it, `ActivityService` would import
`NotificationService` and call it inline the moment a breach is
detected -- which is exactly failure mode #4 from the client engagement
("state changes written directly to sibling module repositories") in a
slightly different shape (a service call instead of a repository write,
but the same coupling). The practical cost of that coupling, concretely:
`activities` would need to know `alerts`' `Notification` shape, `alerts`'
constructor signature, and would break at compile time the day `alerts`
refactors its internal API -- five modules' worth of that coupling is
exactly the "requires heavy human review" cost the case study opens with.
The EventBus removes that coupling by construction: `activities` only
needs to know an event *name* exists, never who (if anyone) is listening.

---

## Section C -- Non-Determinism Strategy

### Evaluation dimensions, weights, and why

**Correctness & Architecture Compliance (60%) / Test Quality & Coverage
(40%).** The asymmetry is deliberate: an architecturally non-compliant
sprint is not fixable by "write more tests" -- a Rule 1 violation means
the code itself must change, so compliance is weighted as the harder
constraint. Test quality is still weighted meaningfully (40%, not 10%)
because the case study's third failure mode (tests that check status
codes, not business rules) is exactly as real a governance failure as an
architecture violation, just a cheaper one to fix on the next iteration.

### Hard gate conditions, and why each cannot be a soft check

`grading-criteria/SKILL.md` defines 7 hard gates (HG-1 through HG-7).
Four (HG-1 to HG-4) are fully automated tool checks (depcruise,
typecheck, lint, coverage) and are hard gates simply because automated
tool output is already deterministic -- there's no reason to let an LLM
re-interpret a `tsc` exit code. The other three (HG-5 to HG-7) are
LLM-assessed but are *still* hard gates, not soft/weighted checks,
because each protects a rule the client's standards team named as
**blocking the entire Claude Code rollout** (Section 2 of the case
study) -- a "70% compliant with the module boundary rule" score would
imply partial credit for a rule the client explicitly said has zero
tolerance. A soft check implies "good code has less of this"; these
rules are binary by the client's own framing, so the gate has to be
binary too.

### Worked example: variable Generator output to a definitive verdict

See `grading-criteria/SKILL.md`'s "Converting variable LLM output into a
deterministic verdict" section for the full worked example (two
functionally-identical-but-stylistically-different Generator outputs for
the same sprint, both correctly reaching the identical `PASS` verdict
because the verdict rule only inspects gate/checklist pass-fail state,
never code's surface form). The Sprint 1 run in this repository is a
live instance of the same principle in the other direction: two
*non-blocking* observations (the synthetic Store-Manager key, a
test-title mismatch) were surfaced as `CONDITIONAL_PASS` feedback rather
than either being silently absorbed into a PASS or incorrectly escalated
to a FAIL -- see `sprint-1-evaluator-feedback.md`.

### Escalation path

Triggers after 3 consecutive `FAIL` verdicts for the same sprint
(`CLAUDE.md` Section 5). The escalation output
(`.harness/output/escalation.md`) contains the sprint's ACs, all three
iterations' verdicts side by side, the specific hard gate(s) that never
passed, and a one-line recommended human action. It is received by the
developer who invoked the Planner -- the harness halts and does not
resume that sprint until a human edits the sprint contract or a skill
file and manually re-invokes the Generator. This sprint did not trigger
escalation (see `REFLECTION.md` for the corresponding limitation: the
escalation path is specified but unproven against a real 3-strike
failure in this repository).

---

## Section D -- Architectural Decisions

### Decision 1: Pull-based `sla-sweep` endpoint instead of a background scheduler

- **Alternatives considered:** (a) a Cloud Scheduler job calling an
  internal-only endpoint on a cron; (b) an in-process `setInterval`
  timer inside the Express app.
- **Rationale:** the case study's demonstration requirement needs a
  curl-able endpoint with a visible response; a scheduler-only trigger
  can't satisfy that without extra plumbing built solely for the demo.
  An in-process timer was rejected because it doesn't survive Cloud
  Run's scale-to-zero behavior -- a request-triggered stateless
  container is the correct GCP-native shape, and a timer inside it
  would silently stop running the moment the instance scales down.
- **Assumption this depends on:** that a production rollout would add a
  Cloud Scheduler job calling this same endpoint on a cron, rather than
  the endpoint remaining purely a manual/demo trigger forever. If SLA
  sweeps must run even with zero API traffic, this assumption needs
  revisiting (e.g. a dedicated Cloud Run job instead of a service).

### Decision 2: EventBus as an in-memory implementation, with an explicit Pub/Sub-shaped contract

- **Alternatives considered:** (a) wire real GCP Pub/Sub now, even for
  the demo; (b) skip the event-bus abstraction entirely and just call
  functions directly, documenting the boundary rule as a code-review
  convention only.
- **Rationale:** real Pub/Sub was rejected for the demo specifically
  because it would require provisioning topics/subscriptions and IAM
  bindings before any code could be tested, which is disproportionate
  for a stub-level reference implementation and would fail the
  "generate stub implementations... use in-memory storage" instruction
  in Section 2.3. Skipping the abstraction was rejected because it's
  exactly how failure mode #4 originally happened -- an unenforced
  convention is not a boundary. The middle path (typed, in-memory
  `EventBus` with a documented Pub/Sub-equivalence contract in
  `app-context` and `api-integration`) gets the architectural benefit
  now and makes the future swap a transport change, not a rewrite.
- **Assumption this depends on:** that at-least-once, idempotent-consumer
  semantics (the actual Pub/Sub delivery guarantee) are an acceptable
  design target even before Pub/Sub is wired in -- which is why
  `evaluateSlaForTask`'s idempotency bookkeeping was written as a hard
  requirement in `api-integration/SKILL.md`, not an optimization.

### Decision 3: CONDITIONAL_PASS as a first-class verdict, not just PASS/FAIL

- **Alternatives considered:** (a) binary PASS/FAIL only, forcing every
  ambiguous case to round one way or the other; (b) a numeric score with
  a pass threshold, no distinct third state.
- **Rationale:** a binary verdict forces the Evaluator to silently
  resolve genuine ambiguity in one direction, which is precisely the
  kind of unaudited judgment call this harness exists to eliminate. A
  numeric-threshold-only model was rejected because a single blended
  score can't distinguish "borderline architecture call, needs a human"
  from "solid overall score, ship it" -- two situations that should
  route differently. `CONDITIONAL_PASS` makes the ambiguity a visible,
  named state that the developer explicitly resolves (`ACCEPT`/`REVISE`),
  which is what actually happened in this repository's one real sprint.
- **Assumption this depends on:** that developers reviewing a
  `CONDITIONAL_PASS` will actually read the file+line feedback before
  typing `ACCEPT`, rather than rubber-stamping it the same way a binary
  PASS would be. If that assumption fails in practice, `CONDITIONAL_PASS`
  degrades into a slower PASS with no governance benefit.

---

## Appendix -- GCP AI Services Mapping

This capstone is specified around Claude Code as the harness engine
(per the case study's tooling requirement), deployed on GCP. The table
below maps each harness role to its nearest GCP-native AI/agent-platform
equivalent, for engagements where the client's standards constrain the
harness to GCP-only tooling rather than Claude Code:

| Harness role | This implementation | GCP-native equivalent |
|---|---|---|
| Generator / Evaluator LLM | Claude Code (Claude models) | Vertex AI (Gemini models) via the Vertex AI SDK, with function calling standing in for the Generator/Evaluator's structured handoff files |
| Agent orchestration | CLAUDE.md read by Claude Code CLI | Vertex AI Agent Builder / Agent Engine for multi-step agent orchestration, or a Cloud Workflows definition driving the same Planner->Generator->Evaluator->Monitor sequence as explicit workflow steps |
| Skill files (feedforward context) | Markdown files under `.harness/skills/` | Grounded prompts / system instructions stored as Vertex AI prompt templates, or retrieved at call time via Vertex AI Search / a RAG corpus if skill files grow beyond what fits inline |
| Event bus | In-memory `EventBus` | Pub/Sub topics/subscriptions (1:1 mapping already documented in `app-context/SKILL.md` and `api-integration/SKILL.md`) |
| Sprint review archive | `.harness/reviews/*.md` committed to git | Cloud Logging (structured entries) + a BigQuery sink for queryable trend analysis across many sprints/projects, with Cloud Monitoring alerting policies replacing manual "grep for repeated notes" |
| Deployment target | Cloud Run (this repo) | unchanged -- Cloud Run is already the GCP-native choice for a stateless containerized API |
| Secrets (future, once a real datastore is added) | none yet (in-memory) | Secret Manager, referenced via Cloud Run's native secret-mounting, never baked into the image |

This mapping is intentionally not implemented in code for this capstone
-- swapping Claude Code for Vertex AI Agent Builder is an engine change
behind the same CLAUDE.md-described contract (roles, handoff files,
verdict rules), which is exactly the kind of platform portability the
harness's explicit, file-based handoff design (rather than anything
tool-specific baked into agent logic) is meant to support.
