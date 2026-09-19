# CLAUDE.md -- StoreOps Harness Orchestrator

This file is read automatically by Claude Code whenever it is launched
inside this repository. It is the orchestration brain of the harness: it
does not contain business rules itself -- those live in `.harness/skills/`
-- it contains the **sequence, routing logic, and loop bounds** that turn
a single developer prompt into governed, production-ready code.

The harness governs `StoreOps`, a retail store operations REST API, and
is deployed on **Google Cloud Platform** (Cloud Run + Artifact Registry +
Secret Manager). GCP specifics live in `.harness/skills/app-context/SKILL.md`
and `DEPLOYMENT.md`; this file stays platform-adjacent but tool-focused.

## 1. Entry prompt format

A developer starts a harness run with a single message addressed to the
Planner:

```
@planner <feature description in plain retail-operations language>
```

Example (this repo's demonstration run):

```
@planner Add SLA breach alerting: when a HIGH or CRITICAL task passes its
due date without reaching DONE, fire a SLA_BREACH notification to the
assigned Department Lead, and escalate to the Store Manager if unresolved
after a configurable grace period.
```

The raw prompt text MUST be saved verbatim to `PROMPT.md` at the repo root
before the Planner is invoked -- this is the audit anchor for the whole run.

## 2. Agent references

| Agent | File | Invoked by |
|---|---|---|
| Planner | `.harness/agents/planner.agent.md` | Developer, once per feature |
| Generator | `.harness/agents/generator.agent.md` | Orchestrator, once per sprint iteration |
| Evaluator | `.harness/agents/evaluator.agent.md` | Orchestrator, once per sprint iteration |
| Monitor | `.harness/agents/monitor.agent.md` | Orchestrator, once per sprint verdict |

Each agent file names the exact skill files it must read before acting.
The orchestrator does not pass skill content directly -- it instructs the
agent to read the files, so agent context stays scoped to only what that
role needs (see Section 6, Context Scoping).

## 3. Run sequence

```
 1. Developer:      @planner <feature prompt>            -> PROMPT.md written
 2. Planner:        reads app-context + architecture-principles
                     + sprint-decomposition
                     writes .harness/output/spec.md
                     with header: STATUS: AWAITING APPROVAL
 3. Orchestrator:   halts. Prints spec.md to the developer.
 4. Developer:      reviews spec.md, types exactly: APPROVED
                     (any other reply is treated as edit feedback --
                     Planner revises spec.md and re-halts)
 5. Orchestrator:   for sprint N = 1..last:
        a. Generator:   reads app-context + architecture-principles
                         + coding-conventions + api-integration + how-to-test
                         reads .harness/output/sprint-N-contract.md
                         writes code under src/, tests under tests/
                         writes .harness/output/generator-summary.md
        b. Evaluator:   reads architecture-principles + how-to-review
                         + grading-criteria
                         reads generator-summary.md + runs automated checks
                         writes .harness/output/evaluator-feedback.md
                         with a machine-readable verdict line:
                             VERDICT: PASS | CONDITIONAL_PASS | FAIL
        c. Orchestrator reads the VERDICT line and routes (Section 4)
        d. Monitor:     runs after EVERY verdict (pass, fail, or escalate)
                         reads generator-summary.md + evaluator-feedback.md
                         writes .harness/reviews/sprint-N-run-log.md
 6. Orchestrator:   when all sprints PASS (or CONDITIONAL_PASS with the
                     developer's explicit sign-off), copies the sprint's
                     generator-summary.md and evaluator-feedback.md into
                     .harness/reviews/ as the permanent audit record.
```

## 4. Routing logic

The orchestrator's decision after every Evaluator verdict is a pure
function of the `VERDICT:` line in `evaluator-feedback.md` and the current
iteration count for that sprint. There is no LLM judgment applied at the
routing step itself -- this is deliberate (see Non-Determinism Strategy,
`DESIGN_BRIEF.md` Section C): the *evaluation* is where LLM variability
enters the system; the *routing* on top of that verdict must be
deterministic, or the harness itself becomes unauditable.

```
if VERDICT == PASS:
    advance to sprint N+1 (or finish, if N was the last sprint)
    reset iteration counter for the new sprint
elif VERDICT == CONDITIONAL_PASS:
    surface the Evaluator's caveats to the developer
    developer types ACCEPT (advance) or REVISE (treated as a FAIL retry)
elif VERDICT == FAIL:
    if iteration_count < 3:
        iteration_count += 1
        re-invoke Generator with evaluator-feedback.md appended as
        additional context (see Section 5, context reset)
    else:
        ESCALATE (Section 5)
```

## 5. Maximum iterations and escalation

**Hard bound: 3 Generator attempts per sprint.** This exists because an
LLM Generator that has failed the same hard gate twice is more likely to
be missing context than to succeed on brute-force retry #4 -- escalating
to a human is cheaper and safer than an unbounded loop burning tokens
against a wall it cannot see over.

On the 3rd consecutive FAIL, the orchestrator:

1. Does **not** attempt a 4th Generator call.
2. Writes `.harness/output/escalation.md` containing:
   - the sprint ID and its acceptance criteria
   - all 3 iterations' `evaluator-feedback.md` verdicts side by side
   - the specific hard gate(s) that never passed
   - a one-line recommended human action (e.g. "the module boundary rule
     is being violated by a legitimate need for a new shared utility --
     a human architect should decide whether to add one, not the Generator")
3. Halts and prints the escalation notice to the developer. The harness
   does not resume this sprint until a human edits either the sprint
   contract or the skill files and re-invokes the Generator manually.

## 6. Context scoping strategy

Long harness runs degrade quality if every agent inherits the full
conversation history of every prior agent call. This harness bounds
context deliberately:

- **Per-agent context is a fresh read, not an accumulated transcript.**
  Each agent invocation instructs Claude Code to read only: (a) the skill
  files named in that agent's `.agent.md` file, and (b) the specific
  handoff file(s) produced by the immediately preceding step. It does not
  re-read the full history of prior sprints.
- **Retry context is additive but bounded.** On a FAIL retry, the
  Generator additionally receives that sprint's own prior
  `evaluator-feedback.md` (not the full run history) -- enough to fix the
  specific failure, not enough to re-litigate earlier sprints.
- **Context resets at sprint boundaries.** Sprint N+1's Generator call
  does not carry Sprint N's evaluator-feedback.md forward; it starts clean
  against the new sprint contract. Cross-sprint continuity is carried by
  the *codebase itself* (git history + `.harness/reviews/`), not by
  conversation memory.
- **Cost-awareness.** Skill files are written to the minimum depth that
  makes their rule unambiguous (see each skill file's own front-matter
  note on length). A 4-page coding-conventions file read on every single
  Generator retry is a real token cost multiplied by up to 3 iterations
  per sprint; the shared foundation skills (`app-context`,
  `architecture-principles`) are kept short precisely because every agent
  reads them, every invocation.
- **GCP-analogue note:** this bounded, stateless-per-invocation context
  model is the same principle behind designing idempotent Cloud Run
  request handlers or stateless Cloud Functions -- see `app-context/SKILL.md`
  §"Why the harness's context model mirrors GCP's compute model" for the
  explicit mapping used in `DESIGN_BRIEF.md`.

## 7. CI/CD relationship

The harness's automated checks (`npm run verify` = typecheck + lint +
depcruise + test with coverage thresholds) are the **same commands** run
in `deploy/gcp/cloudbuild.yaml`. The harness's Evaluator runs them
*before* a sprint is accepted into the codebase; Cloud Build runs them
*again* on push to `main` as an independent, non-bypassable second gate.

The harness therefore **precedes** CI, and CI **backstops** the harness --
if a human bypasses the harness and hand-edits code, Cloud Build still
catches an architecture violation before it reaches Cloud Run. Neither
layer replaces the other.
