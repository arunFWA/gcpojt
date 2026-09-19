STATUS: AWAITING APPROVAL

# Spec: SLA Breach Alerting + Shift-Handover Bulk Update

## Restated intent

The `activities` module needs two additions:

1. A mechanism that detects when a HIGH or CRITICAL task has passed its
   due date without reaching `DONE`, and notifies the assigned
   Department Lead. If the task remains unresolved past a configurable
   grace period after that first notification, escalate to the Store
   Manager.
2. A bulk endpoint so outgoing shift staff can mark several tasks
   `DONE` or `BLOCKED` in one request, with per-item failure handling
   (one bad id must not fail the whole batch) and an audit trail entry
   per successfully updated task.

## Modules touched

- **`activities`** (primary): new service methods `sweepSlaBreaches()`
  and `bulkUpdateStatus()`; new routes `POST /api/activities/sla-sweep`
  and `PATCH /api/activities/bulk-status`; new fields on `Task`
  (`slaBreachNotifiedAt`, `slaEscalatedAt`).
- **`alerts`** (secondary, event-driven only): new subscriptions to two
  new event names, `ACTIVITY_SLA_BREACH` and `ACTIVITY_SLA_ESCALATION`,
  each producing a `Notification` record.

## Module boundary / event-bus implications (foreseen)

This feature is the textbook case the harness exists to govern: it is
extremely easy to implement by having `activities` import
`NotificationService` directly and call it inline when a breach is
detected. That is explicitly forbidden (Rule 2, event-bus-only). The
Generator must instead raise `EventBus.emit('ACTIVITY_SLA_BREACH', ...)`
from `activities` and have `alerts` subscribe independently. The bulk
update endpoint carries no cross-module risk on its own, but each
successful bulk item still re-triggers SLA evaluation, so it must reuse
the same event-emitting code path as `sla-sweep` rather than duplicating
breach-detection logic inline in the bulk handler.

## Sprints

Given the size (one module primary, one module event-driven secondary,
no new modules, under 10 files touched total), this feature fits in a
**single sprint**.

- **Sprint 1**: implement both endpoints, the SLA evaluation logic with
  idempotent breach/escalation bookkeeping, the two new EventBus event
  names, the `alerts` subscription handlers, and full test coverage per
  `how-to-test`. See `sprint-1-contract.md`.
