# Reflection

## What the harness did well

The event-bus-only rule (Rule 2) is the one the client's standards team
would care about most, because it's the rule that's easiest to
accidentally violate under time pressure ("just import the notification
service, it's one line"). Encoding it as an explicit hard gate (HG-5) in
`grading-criteria/SKILL.md`, with a worked "compliant vs. violation" code
pair in `architecture-principles/SKILL.md`, produced code in Sprint 1
where `activities` genuinely has zero awareness that `alerts` exists --
verified by `depcruise` and by manual grep, not just by intention. The
Evaluator's feedback in `sprint-1-evaluator-feedback.md` also shows the
framework doing real work rather than rubber-stamping: it caught two
legitimate gaps (the synthetic Store-Manager key, a test-title/AC-number
mismatch) and correctly classified both as CONDITIONAL_PASS rather than
either silently passing them or over-escalating a non-blocking issue to
a full FAIL.

## Where it fell short

The escalation path (Section 5.5 of `CLAUDE.md`, and the 3-iteration
bound) was never actually exercised in this demonstration run --
Sprint 1 passed (conditionally) on the first iteration. That means the
`escalation.md` output format is specified but unproven against real
Generator failure behavior. It's plausible that when a Generator
genuinely fails the same hard gate three times, the escalation notice's
"specific hard gate that never passed" section needs more structure
(e.g. a diff-of-diffs across the three attempts) than the current
free-text format provides, and I won't know that until it happens on a
harder feature.

The `staff` module's read surface is thinner than it should be -- it has
no "resolve the Store Manager for store X" lookup, which is why
`NotificationService`'s escalation path falls back to a synthetic key.
The Generator and Evaluator both caught and disclosed this correctly,
which is the harness working as intended, but it's still a real gap in
the underlying application, not just in the harness's paperwork about
the application.

## One concrete improvement

Add a `staff.service.ts` method `resolveStoreManager(storeId): UserProfile`
and a follow-up sprint contract that swaps the synthetic
`store-manager:${storeId}` key in `NotificationService.handleSlaEscalation`
for a real resolved user id from that lookup -- closing the exact gap the
Evaluator flagged rather than leaving it as a permanent CONDITIONAL_PASS
caveat. This ties directly to the Evaluator's own recommendation in
`sprint-1-evaluator-feedback.md` ("open a follow-up sprint contract for
it") -- the harness already told me what to do next; the improvement is
just actually scheduling that sprint instead of letting the caveat go
stale.
