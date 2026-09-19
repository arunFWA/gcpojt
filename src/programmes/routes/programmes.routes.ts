import { Router } from 'express';
import { ValidationError } from '../../shared/errors/AppError';
import { projectService } from '../service/ProjectService';

export const programmesRouter = Router();

programmesRouter.get('/', (req, res, next) => {
  try {
    const storeId = (req.query.storeId as string | undefined) ?? 'demo-store';
    res.status(200).json({ data: projectService.listForStore(storeId) });
  } catch (err) {
    next(err);
  }
});

programmesRouter.post('/', (req, res, next) => {
  try {
    const project = projectService.createProject(req.body);
    res.status(201).json({ data: project });
  } catch (err) {
    next(err);
  }
});

programmesRouter.post('/:id/members', (req, res, next) => {
  try {
    const { userId, role } = req.body ?? {};
    if (!userId || !role) {
      throw new ValidationError('userId and role are required', {
        userId: userId ? '' : 'required',
        role: role ? '' : 'required',
      });
    }
    const project = projectService.addMember(req.params.id, userId, role);
    res.status(201).json({ data: project });
  } catch (err) {
    next(err);
  }
});
