import { Router } from 'express';
import { ValidationError } from '../../shared/errors/AppError';
import { activityService } from '../service/ActivityService';
import { BulkStatusUpdateItem } from '../types/Task';

/**
 * Routes layer -- HTTP + request validation ONLY. No business logic here
 * (module boundary rule, Section 3.5: "Routes must not contain business
 * logic"). Every handler is a thin adapter onto ActivityService and
 * forwards thrown AppErrors to the terminal error handler via `next`.
 */
export const activitiesRouter = Router();

activitiesRouter.get('/', (req, res, next) => {
  try {
    const { programmeId, status, storeId } = req.query as Record<string, string | undefined>;
    const tasks = activityService.listTasks({ programmeId, status, storeId });
    res.status(200).json({ data: tasks });
  } catch (err) {
    next(err);
  }
});

activitiesRouter.post('/', (req, res, next) => {
  try {
    const task = activityService.createTask(req.body);
    res.status(201).json({ data: task });
  } catch (err) {
    next(err);
  }
});

activitiesRouter.get('/:id', (req, res, next) => {
  try {
    const task = activityService.getTask(req.params.id);
    res.status(200).json({ data: task });
  } catch (err) {
    next(err);
  }
});

/**
 * Sprint-1 demo feature endpoint (bulk update).
 * PATCH /api/activities/bulk-status
 * Body: { items: [{ id, status }] }
 */
activitiesRouter.patch('/bulk-status', (req, res, next) => {
  try {
    const items = req.body?.items as BulkStatusUpdateItem[] | undefined;
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('items must be a non-empty array', { items: 'required' });
    }
    const result = activityService.bulkUpdateStatus(items);
    const statusCode = result.failures.length > 0 ? 207 : 200;
    res.status(statusCode).json({ data: result.updated, failures: result.failures });
  } catch (err) {
    next(err);
  }
});

/**
 * Sprint-1 demo feature endpoint (SLA breach alerting).
 * POST /api/activities/sla-sweep
 * Optional body: { gracePeriodMs }
 */
activitiesRouter.post('/sla-sweep', async (req, res, next) => {
  try {
    const gracePeriodMs = req.body?.gracePeriodMs as number | undefined;
    const result = await activityService.sweepSlaBreaches(gracePeriodMs);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
});

activitiesRouter.patch('/:id', (req, res, next) => {
  try {
    const task = activityService.updateTask(req.params.id, req.body);
    res.status(200).json({ data: task });
  } catch (err) {
    next(err);
  }
});

activitiesRouter.delete('/:id', (req, res, next) => {
  try {
    activityService.deleteTask(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
