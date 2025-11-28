/**
 * 简化的通知和错误提示工具
 * 避免JSX语法，适合TypeScript文件
 */

import { message, notification, Modal } from 'antd';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * 成功通知
 */
export const showSuccess = (content: string, duration = 3) => {
  return message.success({
    content,
    duration
  });
};

/**
 * 错误通知
 */
export const showError = (content: string, duration = 5) => {
  return message.error({
    content,
    duration
  });
};

/**
 * 警告通知
 */
export const showWarning = (content: string, duration = 4) => {
  return message.warning({
    content,
    duration
  });
};

/**
 * 信息通知
 */
export const showInfo = (content: string, duration = 3) => {
  return message.info({
    content,
    duration
  });
};

/**
 * 加载中通知
 */
export const showLoading = (content: string) => {
  return message.loading({
    content,
    duration: 0 // 不自动关闭
  });
};

/**
 * 显示操作结果通知
 */
export const showOperationResult = (
  success: boolean,
  successMessage: string,
  errorMessage: string,
  details?: string
) => {
  if (success) {
    showSuccess(successMessage);
  } else {
    if (details) {
      notification.error({
        message: errorMessage,
        description: details,
        duration: 6
      });
    } else {
      showError(errorMessage);
    }
  }
};

/**
 * 显示网络错误
 */
export const showNetworkError = (error: any, retryAction?: () => void) => {
  const errorMessage = error?.message || '网络连接失败';
  const errorDescription = '请检查网络连接是否正常，或稍后重试';

  notification.error({
    message: '网络连接错误',
    description: errorDescription,
    duration: 0,
    btn: retryAction ? [
      {
        label: '重试',
        onClick: retryAction
      }
    ] : undefined
  });
};

/**
 * 显示API错误
 */
export const showApiError = (response: any, context?: string) => {
  const error = response.data || response;
  const errorMessage = error.error || error.message || '服务器返回错误';
  const errorDescription = context || `请求: ${response.config?.method?.toUpperCase()} ${response.config?.url}`;

  notification.error({
    message: 'API调用失败',
    description: `${errorDescription}\n${errorMessage}`,
    duration: 6
  });
};

/**
 * 显示表单验证错误
 */
export const showValidationErrors = (errors: Record<string, string[]>) => {
  const errorList = Object.entries(errors).map(([field, messages]) => ({
    field,
    messages
  }));

  if (errorList.length === 0) {
    showError('表单验证失败，请检查输入');
    return;
  }

  let description = '请修正以下错误:\n';
  errorList.forEach(({ field, messages }) => {
    messages.forEach((msg) => {
      description += `\n• ${field}: ${msg}`;
    });
  });

  notification.error({
    message: '表单验证失败',
    description,
    duration: 6
  });
};

/**
 * 显示确认对话框
 */
export const showConfirmDialog = (
  title: string,
  content: string,
  onConfirm: () => void,
  onCancel?: () => void,
  type: 'danger' | 'warning' | 'info' = 'warning'
) => {
  const okTypeMap = {
    danger: 'danger' as const,
    warning: 'primary' as const,
    info: 'primary' as const
  };

  return Modal.confirm({
    title,
    content,
    okText: '确认',
    cancelText: '取消',
    okType: okTypeMap[type],
    onOk: onConfirm,
    onCancel
  });
};

/**
 * 根据HTTP状态码显示错误
 */
export const showHttpError = (status: number, error?: any) => {
  let title = '请求失败';
  let message = '';

  switch (status) {
    case 400:
      title = '请求参数错误';
      message = '请检查输入参数是否正确';
      break;
    case 401:
      title = '未授权访问';
      message = '请重新登录';
      break;
    case 403:
      title = '权限不足';
      message = '您没有执行此操作的权限';
      break;
    case 404:
      title = '资源不存在';
      message = '请求的资源未找到';
      break;
    case 500:
      title = '服务器内部错误';
      message = '服务器遇到错误，请稍后重试';
      break;
    case 502:
      title = '网关错误';
      message = '服务器网关错误，请稍后重试';
      break;
    case 503:
      title = '服务不可用';
      message = '服务器暂时不可用，请稍后重试';
      break;
    default:
      title = `请求失败 (${status})`;
      message = '网络请求失败，请检查网络连接';
  }

  notification.error({
    message: title,
    description: message,
    duration: 6
  });
};