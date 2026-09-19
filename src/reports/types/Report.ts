export type ReportType = 'STORE_SUMMARY' | 'REGIONAL_ROLLUP' | 'DEPARTMENT_PERFORMANCE';
export type ReportStatus = 'PENDING' | 'READY' | 'FAILED';

export interface StoreSummaryReport {
  type: ReportType;
  status: ReportStatus;
  storeId: string;
  totalTasks: number;
  doneTasks: number;
  overdueTasks: number;
  generatedAt: string;
}
