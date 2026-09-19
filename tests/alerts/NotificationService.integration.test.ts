import { EventBus } from '../../src/shared/events/EventBus';
import { ActivityService } from '../../src/activities/service/ActivityService';
import { TaskRepository } from '../../src/activities/repository/TaskRepository';
import { NotificationService } from '../../src/alerts/service/NotificationService';
import { NotificationRepository } from '../../src/alerts/repository/NotificationRepository';

describe('Cross-module wiring: activities SLA breach -> alerts notification (event bus only)', () => {
  beforeEach(() => {
    EventBus.reset();
  });

  it('creates an IN_APP notification for the department lead when a task breaches SLA', async () => {
    const taskRepo = new TaskRepository();
    const activityService = new ActivityService(taskRepo);
    const notificationRepo = new NotificationRepository();
    const notificationService = new NotificationService(notificationRepo);
    notificationService.registerSubscriptions();

    const task = activityService.createTask({
      storeId: 'store-1',
      title: 'Restock freezer aisle',
      priority: 'CRITICAL',
      category: 'RESTOCKING',
      departmentLeadId: 'lead-42',
      dueDate: new Date(Date.now() - 1000).toISOString(),
    });

    await activityService.sweepSlaBreaches();

    const notifications = notificationService.listForUser('lead-42');
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('SLA_BREACH');
    expect(notifications[0].relatedTaskId).toBe(task.id);
  });
});
