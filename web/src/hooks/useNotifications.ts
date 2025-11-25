/**
 * 统一的通知管理Hook。
 * 提供浏览器通知和Ant Design消息的统一接口。
 */

import { useCallback, useEffect } from 'react';
import { useMessage } from './useMessage';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationOptions {
  duration?: number; // 消息显示时长（毫秒）
  showBrowserNotification?: boolean; // 是否显示浏览器通知
  showMessage?: boolean; // 是否显示Ant Design消息
  onClick?: () => void; // 点击通知时的回调
  icon?: string; // 自定义图标
}

/**
 * 统一的通知管理Hook
 */
export function useNotifications() {
  const message = useMessage();

  // 请求浏览器通知权限
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      console.warn('此浏览器不支持通知功能');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }, []);

  // 初始化时请求通知权限
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // 显示通知
  const showNotification = useCallback((
    title: string,
    body: string,
    type: NotificationType = 'info',
    options: NotificationOptions = {}
  ) => {
    const {
      duration,
      showBrowserNotification = true,
      showMessage = true,
      onClick,
      icon
    } = options;

    // 显示浏览器通知
    if (showBrowserNotification && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body,
          icon: icon || getDefaultIcon(type),
          tag: `${title}-${body}`, // 防止重复通知
          requireInteraction: type === 'error', // 错误消息需要用户手动关闭
        });

        // 点击通知的回调
        if (onClick) {
          notification.onclick = onClick;
        }

        // 自动关闭通知（除了错误消息）
        if (type !== 'error') {
          setTimeout(() => {
            notification.close();
          }, 5000);
        }
      } catch (error) {
        console.warn('创建浏览器通知失败:', error);
      }
    }

    // 显示Ant Design消息
    if (showMessage) {
      const messageContent = `${title}: ${body}`;

      switch (type) {
        case 'success':
          message.success(messageContent, duration);
          break;
        case 'error':
          message.error(messageContent, duration);
          break;
        case 'warning':
          message.warning(messageContent, duration);
          break;
        case 'info':
        default:
          message.info(messageContent, duration);
          break;
      }
    }
  }, [message]);

  // 便捷方法
  const showSuccess = useCallback((title: string, body: string, options?: NotificationOptions) => {
    showNotification(title, body, 'success', options);
  }, [showNotification]);

  const showError = useCallback((title: string, body: string, options?: NotificationOptions) => {
    showNotification(title, body, 'error', options);
  }, [showNotification]);

  const showWarning = useCallback((title: string, body: string, options?: NotificationOptions) => {
    showNotification(title, body, 'warning', options);
  }, [showNotification]);

  const showInfo = useCallback((title: string, body: string, options?: NotificationOptions) => {
    showNotification(title, body, 'info', options);
  }, [showNotification]);

  // 清除所有消息
  const clearMessages = useCallback(() => {
    message.destroy();
  }, [message]);

  return {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearMessages,
    requestPermission
  };
}

/**
 * 获取默认图标
 */
function getDefaultIcon(type: NotificationType): string {
  switch (type) {
    case 'success':
      return '/success-icon.png';
    case 'error':
      return '/error-icon.png';
    case 'warning':
      return '/warning-icon.png';
    case 'info':
    default:
      return '/info-icon.png';
  }
}

/**
 * 检查浏览器通知支持状态
 */
export function checkNotificationSupport(): {
  supported: boolean;
  permission: NotificationPermission;
  canRequest: boolean;
} {
  if (!('Notification' in window)) {
    return {
      supported: false,
      permission: 'denied',
      canRequest: false
    };
  }

  return {
    supported: true,
    permission: Notification.permission,
    canRequest: Notification.permission === 'default'
  };
}

export default useNotifications;