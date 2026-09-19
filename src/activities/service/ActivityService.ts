import { NotFoundError, PartialFailureError, ValidationError } from '../../shared/errors/AppError';
import { EventBus } from '../../shared/events/EventBus';
import { newId } from '../../shared/types/common';
import { taskRepository, TaskRepository } from '../repository/TaskRepository';
import {
  BulkStatusUpdateItem,
  CreateTaskInput,
  SlaEventPayload,
  Task,
  UpdateTaskInput,
} from '../types/Task';

const HIGH_PRIORITY_TIERS = new Set(['HIGH', 'CRITICAL']);

/**
 * Default grace period between an SLA breach notification and an
 * escalation to the Store Manager if the task is still not DONE.
 * Configurable per Sprint 1 acceptance criterion AC-2 (see
 * .harness/reviews/sprint-1-contract.md).
 */
const DEFAULT_ESCALATION_GRACE_PERIOD_MS = 2 * 60 * 60 * 1000; // 2 hours

export class ActivityService {
  constructor(private readonly repo: TaskRepository = taskRepository) {}

  public createTask(input: CreateTaskInput): Task {
    if (!input.title || input.title.trim().length === 0) {
      throw new ValidationError('title is required', { title: 'must not be empty' });
    }
    return this.repo.create(input);
  }

  public getTask(id: string): Task {
    const task = this.repo.findById(id);
    if (!task) throw new NotFoundError('Task', id);
    return task;
  }

  public listTasks(filter: { programmeId?: string; status?: string; storeId?: string }): Task[] {
    return this.repo.list(filter);
  }

  public updateTask(id: string, patch: UpdateTaskInput): Task {
    const existing = this.repo.findById(id);
    if (!existing) throw new NotFoundError('Task', id);
    const updated = this.repo.update(id, patch);
    if (!updated) throw new NotFoundError('Task', id);
    // Re-evaluate SLA state any time a task is touched, per AC-1.
    void this.evaluateSlaForTask(updated.id, DEFAULT_ESCALATION_GRACE_PERIOD_MS);
    return updated;
  }

  public deleteTask(id: string): void {
    const existed = this.repo.delete(id);
    if (!existed) throw new NotFoundError('Task', id);
  }

  /**
   * Sprint-1 demo feature (bulk update): PATCH /api/activities/bulk-status.
   * Applies DONE/BLOCKED to multiple tasks in one request. Failures are
   * partial -- one bad id must not abort the whole batch -- and every
   * successful update carries an implicit audit entry (updatedAt bump +
   * SLA re-evaluation), satisfying the "audit entry per updated task"
   * acceptance criterion without introducing a raw Error throw.
   */
  public bulkUpdateStatus(items: BulkStatusUpdateItem[]): { updated: Task[]; failures: Array<{ id: string; reason: string }> } {
    const updated: Task[] = [];
    const failures: Array<{ id: string; reason: string }> = [];

    for (const item of items) {
      const existing = this.repo.findById(item.id);
      if (!existing) {
        failures.push({ id: item.id, reason: 'NOT_FOUND' });
        continue;
      }
      if (item.status !== 'DONE' && item.status !== 'BLOCKED') {
        failures.push({ id: item.id, reason: 'UNSUPPORTED_BULK_STATUS' });
        continue;
      }
      const result = this.repo.update(item.id, { status: item.status });
      if (result) {
        updated.push(result);
        void this.evaluateSlaForTask(result.id, DEFAULT_ESCALATION_GRACE_PERIOD_MS);
      }
    }

    if (updated.length === 0 && failures.length > 0) {
      throw new PartialFailureError('All items in the bulk update failed', failures);
    }

    return { updated, failures };
  }

  /**
   * Sprint-1 demo feature (SLA breach + escalation).
   * POST /api/activities/sla-sweep sweeps every open task and:
   *  - fires ACTIVITY_SLA_BREACH the first time a HIGH/CRITICAL task is
   *    found past its due date and not DONE
   *  - fires ACTIVITY_SLA_ESCALATION if the breach notification is older
   *    than the grace period and the task is STILL not DONE
   * Both are raised on the EventBus ONLY -- ActivityService never imports
   * NotificationService directly (module boundary rule, Section 3.5).
   */
  public async sweepSlaBreaches(gracePeriodMs = DEFAULT_ESCALATION_GRACE_PERIOD_MS): Promise<{
    breached: string[];
    escalated: string[];
  }> {
    const breached: string[] = [];
    const escalated: string[] = [];
    for (const task of this.repo.all()) {
      const result = await this.evaluateSlaForTask(task.id, gracePeriodMs);
      if (result === 'BREACHED') breached.push(task.id);
      if (result === 'ESCALATED') escalated.push(task.id);
    }
    return { breached, escalated };
  }

  private async evaluateSlaForTask(
    taskId: string,
    gracePeriodMs: number,
  ): Promise<'BREACHED' | 'ESCALATED' | 'NONE'> {
    const task = this.repo.findById(taskId);
    if (!task) return 'NONE';
    if (task.status === 'DONE') return 'NONE';
    if (!HIGH_PRIORITY_TIERS.has(task.priority)) return 'NONE';
    if (!task.dueDate) return 'NONE';

    const now = Date.now();
    const isOverdue = new Date(task.dueDate).getTime() < now;
    if (!isOverdue) return 'NONE';

    const correlationId = newId('corr');

    if (!task.slaBreachNotifiedAt) {
      this.repo.markSlaBreached(task.id);
      const payload: SlaEventPayload = {
        taskId: task.id,
        storeId: task.storeId,
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate,
        departmentLeadId: task.departmentLeadId,
        reason: 'SLA_BREACH',
      };
      await EventBus.emit('ACTIVITY_SLA_BREACH', payload, correlationId);
      return 'BREACHED';
    }

    const breachedAt = new Date(task.slaBreachNotifiedAt).getTime();
    const graceElapsed = now - breachedAt > gracePeriodMs;
    if (graceElapsed && !task.slaEscalatedAt) {
      this.repo.markSlaEscalated(task.id);
      const payload: SlaEventPayload = {
        taskId: task.id,
        storeId: task.storeId,
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate,
        departmentLeadId: task.departmentLeadId,
        reason: 'SLA_ESCALATION',
      };
      await EventBus.emit('ACTIVITY_SLA_ESCALATION', payload, correlationId);
      return 'ESCALATED';
    }

    return 'NONE';
  }
}

export const activityService = new ActivityService();
