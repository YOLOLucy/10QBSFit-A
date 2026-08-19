// Local Notification & Daily Reminder Utility for Health Balance Sheet

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionState;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermissionState;
  } catch (error) {
    console.warn('Error requesting notification permission:', error);
    return Notification.permission as NotificationPermissionState;
  }
}

export interface ReminderNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

export function sendLocalNotification({
  title,
  body,
  tag = 'daily-health-checkin-reminder',
}: ReminderNotificationOptions): boolean {
  // Always dispatch custom event for in-app floating banner / toast
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('health-reminder-trigger', {
        detail: { title, body, timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) },
      })
    );
  }

  // Attempt browser native notification if permitted
  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body,
        icon: '/icon.png',
        tag,
        badge: '/icon.png',
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      return true;
    } catch (e) {
      console.warn('Native notification failed, in-app banner active instead:', e);
    }
  }

  return false;
}

export async function sendTestReminder(reminderTime: string = '20:30'): Promise<{ success: boolean; message: string }> {
  const currentPerm = getNotificationPermission();

  if (currentPerm === 'default') {
    const newPerm = await requestNotificationPermission();
    if (newPerm !== 'granted') {
      sendLocalNotification({
        title: '📊 今日健康資產負債表提醒 (應用內通知)',
        body: `每日 ${reminderTime} 定時提醒您完成 10 題健康問卷！記錄飲食、運動、飲水與體重，立即結算今日健康淨值。`,
      });
      return {
        success: true,
        message: '瀏覽器未授權彈跳通知，已透過應用內橫幅提醒發送成功！',
      };
    }
  }

  const sent = sendLocalNotification({
    title: '📊 今日健康資產負債表定時提醒',
    body: `現在是設定的提醒時間 (${reminderTime})！快來花 1 分鐘回答 10 題健康問卷，為今日存入豐厚健康資產！`,
  });

  return {
    success: true,
    message: sent ? '已成功發送瀏覽器本機通知與應用內提醒！' : '已成功觸發定時提醒！',
  };
}
