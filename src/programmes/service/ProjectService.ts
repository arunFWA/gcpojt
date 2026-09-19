import { NotFoundError, ValidationError } from '../../shared/errors/AppError';
import { CreateProjectInput, Project, ProjectRole } from '../types/Project';
import { ProjectRepository, projectRepository } from '../repository/ProjectRepository';

export class ProjectService {
  constructor(private readonly repo: ProjectRepository = projectRepository) {}

  public createProject(input: CreateProjectInput): Project {
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError('name is required', { name: 'must not be empty' });
    }
    return this.repo.create(input);
  }

  public listForStore(storeId: string): Project[] {
    return this.repo.listForStore(storeId);
  }

  public addMember(projectId: string, userId: string, role: ProjectRole): Project {
    const project = this.repo.findById(projectId);
    if (!project) throw new NotFoundError('Project', projectId);
    if (project.members.some((m) => m.userId === userId)) {
      throw new ValidationError('user is already a member of this programme', { userId });
    }
    const updated = this.repo.addMember(projectId, { userId, role, addedAt: new Date().toISOString() });
    if (!updated) throw new NotFoundError('Project', projectId);
    return updated;
  }
}

export const projectService = new ProjectService();
