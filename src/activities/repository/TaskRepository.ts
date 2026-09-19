import { newId } from '../../shared/types/common';
import { CreateTaskInput, Task, UpdateTaskInput } from '../types/Task';

/**
 * Repository layer -- data access ONLY. No HTTP concerns, no business
 * rules, no calls to other modules' services. Swapping this for a real
 * datastore (e.g. Firestore / Cloud SQL on GCP) must not require any
 * change to ActivityService.
 */
export class TaskRepository {
  private tasks = new Map<string, Task>();

  public create(input: CreateTaskInput): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: newId('task'),
      status: 'TODO',
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  public findById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  public list(filter: { programmeId?: string; status?: string; storeId?: string }): Task[] {
    return Array.from(this.tasks.values()).filter((t) => {
      if (filter.storeId && t.storeId !== filter.storeId) return false;
      if (filter.programmeId && t.programmeId !== filter.programmeId) return false;
      if (filter.status && t.status !== filter.status) return false;
      return true;
    });
  }

  public update(id: string, patch: UpdateTaskInput): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    const updated: Task = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.tasks.set(id, updated);
    return updated;
  }

  public markSlaBreached(id: string): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    const updated: Task = { ...existing, slaBreachNotifiedAt: new Date().toISOString() };
    this.tasks.set(id, updated);
    return updated;
  }

  public markSlaEscalated(id: string): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    const updated: Task = { ...existing, slaEscalatedAt: new Date().toISOString() };
    this.tasks.set(id, updated);
    return updated;
  }

  public delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  public all(): Task[] {
    return Array.from(this.tasks.values());
  }

  /** Test-only helper. */
  public reset(): void {
    this.tasks.clear();
  }
}

export const taskRepository = new TaskRepository();
