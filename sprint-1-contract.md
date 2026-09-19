# Sprint 1 Contract: SLA Breach Alerting + Bulk Status Update

**Sprint goal:** Ship SLA breach/escalation alerting and a bulk
activity-status endpoint entirely within `activities` (primary) and
`alerts` (event-driven secondary), with zero direct cross-module service
imports for the write path.

## Files expected to change

| Layer | Module | File |
|---|---|---|
| types | activities | `types/Task.ts` (add SLA fields + `SlaEventPayload`) |
| service | activities | `service/ActivityService.ts` (add `sweepSlaBreaches`, `bulkUpdateStatus`) |
| repository | activities | `repository/TaskRepository.ts` (add `markSlaBreached`, `markSlaEscalated`) |
| routes | activities | `routes/activities.routes.ts` (add `POST /sla-sweep`, `PATCH /bulk-status`) |
| shared | shared | `events/EventBus.ts` (register `ACTIVITY_SLA_BREACH`, `ACTIVITY_SLA_ESCALATION`) |
| service | alerts | `service/NotificationService.ts` (add subscription handlers) |
| tests | activities, alerts | new test files per `how-to-test` |

## Highest-risk architecture-principles rules for this sprint

- **Rule 2 (event bus only)** -- highest risk. The natural first draft
  of "notify the department lead" is a direct call; must be caught if
  present.
- **Rule 3 (error contract)** -- the bulk endpoint's partial-failure
  path must not throw a raw `Error` for per-item failures; those are
  data in the response body, not exceptions, except in the
  all-items-failed case (`PartialFailureError`).

## Acceptance criteria

```
AC-1: GIVEN a task with priority HIGH or CRITICAL, status not DONE,
      and a dueDate in the past
      WHEN the SLA sweep runs
      THEN exactly one ACTIVITY_SLA_BREACH event is emitted for that
      task, and a second sweep run does not emit a duplicate event
      for the same task

AC-2: GIVEN a task that has already received an ACTIVITY_SLA_BREACH
      notification and is still not DONE
      WHEN the SLA sweep runs again after the configured grace period
      has elapsed since that notification
      THEN exactly one ACTIVITY_SLA_ESCALATION event is emitted, and
      it is not emitted again on subsequent sweeps

AC-3: GIVEN a task with priority LOW or MEDIUM that is overdue
      WHEN the SLA sweep runs
      THEN no ACTIVITY_SLA_BREACH event is emitted for that task

AC-4: GIVEN a task that has already reached status DONE
      WHEN the SLA sweep runs, regardless of priority or due date
      THEN no ACTIVITY_SLA_BREACH or ACTIVITY_SLA_ESCALATION event is
      emitted for that task

AC-5: GIVEN a batch of activity ids submitted to
      PATCH /api/activities/bulk-status with target status DONE or
      BLOCKED, where one id does not exist
      WHEN the request is processed
      THEN the valid ids are updated successfully (HTTP 207), the
      invalid id is reported in a `failures` array with reason
      NOT_FOUND, and no exception is thrown that would abort the
      valid updates

AC-6: GIVEN the alerts module has registered its event subscriptions
      WHEN an ACTIVITY_SLA_BREACH event is emitted by activities
      THEN a Notification record is created for the task's assigned
      Department Lead, and activities' source code contains no import
      of alerts/service anywhere
```

## Definition of done

All 6 ACs pass via automated test, `npm run verify` exits 0, and the
Evaluator's hard gates HG-1 through HG-7 (see `grading-criteria` skill)
all pass.
