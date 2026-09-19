import { newId } from '../../shared/types/common';
import { Notification } from '../types/Notification';

export class NotificationRepository {
  private notifications = new Map<string, Notification>();

  public create(input: Omit<Notification, 'id' | 'createdAt'>): Notification {
    const notification: Notification = {
      ...input,
      id: newId('alert'),
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(notification.id, notification);
    return notification;
  }

  public listForUser(userId: string): Notification[] {
    return Array.from(this.notifications.values()).filter((n) => n.userId === userId);
  }

  public all(): Notification[] {
    return Array.from(this.notifications.values());
  }

  public reset(): void {
    this.notifications.clear();
  }
}

export const notificationRepository = new NotificationRepository();
