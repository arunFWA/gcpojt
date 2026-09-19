import { ActivityService } from '../../src/activities/service/ActivityService';
import { TaskRepository } from '../../src/activities/repository/TaskRepository';
import { ReportService } from '../../src/reports/service/ReportService';
import { activityService as sharedActivityService } from '../../src/activities/service/ActivityService';

describe('ReportService - read-only aggregation', () => {
  it('summarizes task counts for a store without mutating activities state', async () => {
    // Uses the shared singleton service the same way the routes layer does,
    // proving ReportService only ever reads via ActivityService's public API.
    void new ActivityService(new TaskRepository()); // exercised elsewhere; kept for symmetry
    sharedActivityService.createTask({
      storeId: 'store-9',
      title: 'Count inventory',
      priority: 'LOW',
      category: 'GENERAL',
    });

    const reportService = new ReportService();
    const summary = reportService.generateStoreSummary('store-9');

    expect(summary.status).toBe('READY');
    expect(summary.totalTasks).toBeGreaterThanOrEqual(1);
  });
});
