import express, { Express } from 'express';
import { activitiesRouter } from './activities/routes/activities.routes';
import { alertsRouter } from './alerts/routes/alerts.routes';
import { notificationService } from './alerts/service/NotificationService';
import { programmesRouter } from './programmes/routes/programmes.routes';
import { reportsRouter } from './reports/routes/reports.routes';
import { errorHandler } from './shared/middleware/errorHandler';
import { staffRouter } from './staff/routes/staff.routes';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  // Cross-module event wiring happens ONCE, here, at composition time --
  // not inside any individual module. This is the single place allowed
  // to know that "alerts" listens for "activities" events.
  notificationService.registerSubscriptions();

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

  app.use('/api/activities', activitiesRouter);
  app.use('/api/programmes', programmesRouter);
  app.use('/api/staff', staffRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/reports', reportsRouter);

  // Must be registered last.
  app.use(errorHandler);

  return app;
}
