import { ISODateString } from '../../shared/types/common';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskCategory = 'RESTOCKING' | 'PLANOGRAM' | 'AUDIT' | 'COMPLIANCE' | 'GENERAL';

export interface Task {
  id: string;
  storeId: string;
  programmeId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  assigneeId?: string;
  departmentLeadId?: string;
  dueDate?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  /** Sprint-1 demo feature: SLA breach + escalation bookkeeping. */
  slaBreachNotifiedAt?: ISODateString;
  slaEscalatedAt?: ISODateString;
}

export interface CreateTaskInput {
  storeId: string;
  programmeId?: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  category: TaskCategory;
  assigneeId?: string;
  departmentLeadId?: string;
  dueDate?: ISODateString;
}

export interface UpdateTaskInput {
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: TaskCategory;
  assigneeId?: string;
  dueDate?: ISODateString;
}

export interface BulkStatusUpdateItem {
  id: string;
  status: TaskStatus;
}

/** Payload shape for ACTIVITY_SLA_BREACH / ACTIVITY_SLA_ESCALATION events. */
export interface SlaEventPayload {
  taskId: string;
  storeId: string;
  title: string;
  priority: TaskPriority;
  dueDate?: ISODateString;
  departmentLeadId?: string;
  reason: 'SLA_BREACH' | 'SLA_ESCALATION';
}
