import { ISODateString } from '../../shared/types/common';

export type NotificationChannel = 'IN_APP' | 'EMAIL';
export type NotificationStatus = 'PENDING' | 'SENT' | 'READ';
export type AlertType = 'INVENTORY' | 'SLA_BREACH' | 'SHIFT_HANDOVER' | 'ESCALATION';

export interface Notification {
  id: string;
  userId: string;
  storeId: string;
  type: AlertType;
  channel: NotificationChannel;
  status: NotificationStatus;
  message: string;
  relatedTaskId?: string;
  createdAt: ISODateString;
}
