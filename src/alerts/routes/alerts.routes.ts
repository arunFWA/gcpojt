import { Router } from 'express';
import { notificationService } from '../service/NotificationService';

export const alertsRouter = Router();

/** GET /api/alerts -- alerts for the authenticated user (demo: ?userId=) */
alertsRouter.get('/', (req, res, next) => {
  try {
    const userId = (req.query.userId as string | undefined) ?? 'demo-user';
    const notifications = notificationService.listForUser(userId);
    res.status(200).json({ data: notifications });
  } catch (err) {
    next(err);
  }
});
