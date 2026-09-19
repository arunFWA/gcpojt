# Architecture Journal

Informal, chronological notes on decisions and trade-offs made while
building this harness -- kept separate from `DESIGN_BRIEF.md` (which is
the polished, structured deliverable) so the reasoning-in-progress isn't
lost to editing.

## On choosing the demonstration feature

Of the four suggested features in Section 3.4, SLA breach alerting was
chosen over the regional rollup report or the planogram template because
it's the only one that meaningfully exercises **all** of Rules 1, 2, and
3 simultaneously (module boundary, event bus, error contract) while
still fitting in a single sprint. The regional rollup would have
exercised Rule 5 (read-only reports) well but barely touched the event
bus at all. Bundling in the bulk-status-update sub-feature from the same
prompt was a late addition specifically to get a Rule 3 (typed
partial-failure error) and an "audit entry per item" requirement into
the same sprint contract, since that's the other under-exercised rule in
a pure SLA-alerting sprint.

## On why sla-sweep is a pull-based endpoint, not a scheduled job

A production version of this feature would almost certainly be a Cloud
Scheduler job hitting the sweep logic on a cron (e.g. every 5 minutes),
not something a human calls via curl. I kept it as an explicit
`POST /api/activities/sla-sweep` endpoint anyway, for two reasons: (1)
the case study's demonstration requirement explicitly wants "call the
new endpoint via curl or Postman and show a successful response," which
a scheduled job can't satisfy without additional plumbing just for the
demo; (2) keeping sweep logic behind an idempotent, externally-callable
endpoint means the *eventual* Cloud Scheduler job is just "call this
endpoint on a timer" -- the interesting logic doesn't need to be
rewritten when the trigger mechanism changes, which is the same
transport-independence argument made in `api-integration/SKILL.md` for
the EventBus-to-Pub/Sub swap.

## On the CONDITIONAL_PASS decision for Sprint 1

I deliberately did not force Sprint 1 to a clean PASS by quietly
resolving the Store-Manager-lookup gap myself before "handing it to the
Evaluator." The point of building this harness was to see the
Evaluator's grading-criteria framework actually distinguish "blocking"
from "advisory" -- a sprint that's hard-gate clean but has a disclosed,
non-blocking design gap is exactly the case CONDITIONAL_PASS exists for,
and I wanted the demonstration artifacts to show that distinction being
made for real rather than only existing as an unused code path in
`evaluator.agent.md`.

## On GCP vs. "just use Claude Code and ignore the cloud entirely"

It would have been faster to skip the GCP deployment story and just ship
the harness + local Docker. I kept Cloud Run in scope because the
brief's explicit ask was to apply GCP AI services and enterprise
architecture principles, not just build the harness in isolation -- and
because the harness's own design (stateless per-invocation agent
context, an explicit audit-trail archive, deterministic hard gates
layered under LLM judgment) turned out to map onto GCP's compute and
observability model closely enough that writing that mapping down
(`app-context/SKILL.md`'s "why the harness's context model mirrors GCP's
compute model," and `monitor.agent.md`'s Cloud Logging/Monitoring
analogue) was worth the extra pages -- it's the same argument in two
different registers, and stating it explicitly is cheap once the
insight exists.
