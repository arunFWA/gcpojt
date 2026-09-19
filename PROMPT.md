@planner Add SLA breach alerting: when a HIGH or CRITICAL task passes its
due date without reaching DONE, automatically fire a SLA_BREACH
notification to the assigned Department Lead, and escalate to the Store
Manager if the task is still unresolved after a configurable grace
period. Also add a shift-handover bulk update endpoint
(PATCH /api/activities/bulk-status) so outgoing shift staff can mark
multiple activities DONE or BLOCKED in a single request, with partial
failure handling and an audit entry per updated task.
