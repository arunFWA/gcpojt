import { EventBus, StoreOpsEvent } from '../../shared/events/EventBus';
import { SlaEventPayload } from '../../activities/types/Task';
import { NotificationRepository, notificationRepository } from '../repository/NotificationRepository';
import { Notification } from '../types/Notification';

/**
 * NotificationService NEVER imports ActivityService, TaskRepository, or any
 * other module's internals. It learns about SLA breaches and escalations
 * exclusively by subscribing to EventBus topics -- this is the module
 * boundary rule from Section 3.5 made concrete: "Side effects that cross
 * module boundaries must be raised via the event bus -- never by direct
 * service-to-service import."
 */
export class NotificationService {
  constructor(private readonly repo: NotificationRepository = notificationRepository) {}

  public listForUser(userId: string): Notification[] {
    return this.repo.listForUser(userId);
  }

  /** Called once at bootstrap (see src/app.ts) to wire event subscriptions. */
  public registerSubscriptions(): void {
    EventBus.on<SlaEventPayload>('ACTIVITY_SLA_BREACH', (event) => this.handleSlaBreach(event));
    EventBus.on<SlaEventPayload>('ACTIVITY_SLA_ESCALATION', (event) => this.handleSlaEscalation(event));
  }

  private handleSlaBreach(event: StoreOpsEvent<SlaEventPayload>): void {
    const { taskId, storeId, title, priority, departmentLeadId } = event.payload;
    this.repo.create({
      userId: departmentLeadId ?? 'unassigned-department-lead',
      storeId,
      type: 'SLA_BREACH',
      channel: 'IN_APP',
      status: 'PENDING',
      relatedTaskId: taskId,
      message: `SLA breach: "${title}" (${priority}) is past its due date and not yet DONE.`,
    });
  }

  private handleSlaEscalation(event: StoreOpsEvent<SlaEventPayload>): void {
    const { taskId, storeId, title, priority } = event.payload;
    // Escalation target is the Store Manager role for this store, resolved
    // via the staff module's read-only lookup at the route/composition
    // layer in a full implementation; the stub records the escalation
    // against a role-scoped inbox key so the routing decision stays out
    // of NotificationService's own logic.
    this.repo.create({
      userId: `store-manager:${storeId}`,
      storeId,
      type: 'ESCALATION',
      channel: 'IN_APP',
      status: 'PENDING',
      relatedTaskId: taskId,
      message: `Escalation: "${title}" (${priority}) breached SLA and is still unresolved after the grace period.`,
    });
  }
}

export const notificationService = new NotificationService();
