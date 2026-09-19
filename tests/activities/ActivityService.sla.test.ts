import { EventBus } from '../../src/shared/events/EventBus';
import { ActivityService } from '../../src/activities/service/ActivityService';
import { TaskRepository } from '../../src/activities/repository/TaskRepository';

describe('ActivityService - SLA breach alerting (Sprint 1)', () => {
  let repo: TaskRepository;
  let service: ActivityService;

  beforeEach(() => {
    EventBus.reset();
    repo = new TaskRepository();
    service = new ActivityService(repo);
  });

  function overdueTask(priority: 'HIGH' | 'CRITICAL' = 'CRITICAL') {
    return service.createTask({
      storeId: 'store-1',
      title: 'Resolve fridge outage',
      priority,
      category: 'COMPLIANCE',
      departmentLeadId: 'lead-1',
      dueDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1h ago
    });
  }

  it('AC-1: fires ACTIVITY_SLA_BREACH exactly once for an overdue HIGH/CRITICAL task', async () => {
    const task = overdueTask();
    const received: string[] = [];
    EventBus.on('ACTIVITY_SLA_BREACH', (e) => received.push(e.name));

    const first = await service.sweepSlaBreaches();
    const second = await service.sweepSlaBreaches();

    expect(first.breached).toContain(task.id);
    expect(second.breached).not.toContain(task.id); // idempotent -- not re-notified
    expect(received).toHaveLength(1);
  });

  it('does NOT fire a breach for a LOW/MEDIUM priority overdue task', async () => {
    const task = service.createTask({
      storeId: 'store-1',
      title: 'Tidy shelf',
      priority: 'LOW',
      category: 'GENERAL',
      dueDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
    const result = await service.sweepSlaBreaches();
    expect(result.breached).not.toContain(task.id);
  });

  it('does NOT fire a breach for a task that is already DONE', async () => {
    const task = overdueTask();
    repo.update(task.id, { status: 'DONE' });
    const result = await service.sweepSlaBreaches();
    expect(result.breached).not.toContain(task.id);
  });

  it('AC-2: escalates to STORE_MANAGER after the grace period if still unresolved', async () => {
    const task = overdueTask();
    const escalations: string[] = [];
    EventBus.on('ACTIVITY_SLA_ESCALATION', (e) => escalations.push(e.name));

    await service.sweepSlaBreaches(0); // breach fires, grace period = 0
    // second sweep: grace period elapsed instantly since we passed 0
    await service.sweepSlaBreaches(0);

    expect(escalations).toHaveLength(1);
  });

  it('AC-3: bulk-status update applies DONE/BLOCKED across multiple tasks with partial failure handling', () => {
    const t1 = overdueTask();
    const t2 = overdueTask('HIGH');

    const result = service.bulkUpdateStatus([
      { id: t1.id, status: 'DONE' },
      { id: t2.id, status: 'BLOCKED' },
      { id: 'does-not-exist', status: 'DONE' },
    ]);

    expect(result.updated).toHaveLength(2);
    expect(result.failures).toEqual([{ id: 'does-not-exist', reason: 'NOT_FOUND' }]);
  });

  it('bulk-status update rejects unsupported status values without throwing a raw Error', () => {
    const t1 = overdueTask();
    const result = service.bulkUpdateStatus([{ id: t1.id, status: 'TODO' as never }]);
    expect(result.failures).toEqual([{ id: t1.id, reason: 'UNSUPPORTED_BULK_STATUS' }]);
  });
});
