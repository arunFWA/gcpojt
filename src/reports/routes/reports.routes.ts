import { Router } from 'express';
import { reportService } from '../service/ReportService';

export const reportsRouter = Router();

/** GET /api/reports/store/:id -- read-only aggregation, not part of the base 9-endpoint surface. */
reportsRouter.get('/store/:id', (req, res, next) => {
  try {
    res.status(200).json({ data: reportService.generateStoreSummary(req.params.id) });
  } catch (err) {
    next(err);
  }
});
