import { activityService } from '../../activities/service/ActivityService';
import { StoreSummaryReport } from '../types/Report';

/**
 * ReportService is READ-ONLY (Section 3.5, "Read-only reports" rule). It is
 * permitted to call ActivityService's public read methods for cross-module
 * lookups, but it must never write to activities/programmes/staff, and it
 * must never import their repositories directly.
 */
export class ReportService {
  public generateStoreSummary(storeId: string): StoreSummaryReport {
    const tasks = activityService.listTasks({ storeId });
    const now = Date.now();
    const doneTasks = tasks.filter((t) => t.status === 'DONE').length;
    const overdueTasks = tasks.filter(
      (t) => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate).getTime() < now,
    ).length;

    return {
      type: 'STORE_SUMMARY',
      status: 'READY',
      storeId,
      totalTasks: tasks.length,
      doneTasks,
      overdueTasks,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const reportService = new ReportService();
