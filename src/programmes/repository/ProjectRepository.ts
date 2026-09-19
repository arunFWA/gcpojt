import { newId } from '../../shared/types/common';
import { CreateProjectInput, Project, ProjectMember } from '../types/Project';

export class ProjectRepository {
  private projects = new Map<string, Project>();

  public create(input: CreateProjectInput): Project {
    const now = new Date().toISOString();
    const project: Project = {
      id: newId('prog'),
      status: 'ACTIVE',
      members: [],
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    this.projects.set(project.id, project);
    return project;
  }

  public findById(id: string): Project | undefined {
    return this.projects.get(id);
  }

  public listForStore(storeId: string): Project[] {
    return Array.from(this.projects.values()).filter((p) => p.storeId === storeId);
  }

  public addMember(id: string, member: ProjectMember): Project | undefined {
    const project = this.projects.get(id);
    if (!project) return undefined;
    const updated: Project = {
      ...project,
      members: [...project.members, member],
      updatedAt: new Date().toISOString(),
    };
    this.projects.set(id, updated);
    return updated;
  }

  public all(): Project[] {
    return Array.from(this.projects.values());
  }

  public reset(): void {
    this.projects.clear();
  }
}

export const projectRepository = new ProjectRepository();
