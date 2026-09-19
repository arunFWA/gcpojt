import { ISODateString } from '../../shared/types/common';

export type ProjectRole = 'STORE_MANAGER' | 'DEPARTMENT_LEAD' | 'ASSOCIATE';
export type ProjectStatus = 'ACTIVE' | 'CLOSED';

export interface ProjectMember {
  userId: string;
  role: ProjectRole;
  addedAt: ISODateString;
}

export interface Project {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  members: ProjectMember[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateProjectInput {
  storeId: string;
  name: string;
  description?: string;
}
