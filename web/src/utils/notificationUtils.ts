/**
 * 统一的通知和错误提示工具
 * 提供优雅的用户反馈机制
 */

import { message, notification, Modal, Button } from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  ContactSupportOutlined
} from '@ant-design/icons';
import React from 'react';
import { UnifiedErrorResponse } from '../types';

// 通知类型定义
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationConfig {
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  showProgress?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ErrorDisplayConfig {
  title?: string;
  error: Error | string | UnifiedErrorResponse;
  context?: string;
  showDetails?: boolean;
  showRetry?: boolean;
  retryAction?: () => void;
  showContact?: boolean;
}

/**
 * 成功通知
 */
export const showSuccess = (content: string, duration = 3) => {
  return message.success({
    content,
    duration,
    icon: React.createElement(CheckCircleOutlined, { style: { color: '#52c41a' } })
  });
};

/**
 * 错误通知
 */
export const showError = (content: string, duration = 5) => {
  return message.error({
    content,
    duration,
    icon: React.createElement(CloseCircleOutlined, { style: { color: '#ff4d4f' } })
  });
};

/**
 * 警告通知
 */
export const showWarning = (content: string, duration = 4) => {
  return message.warning({
    content,
    duration,
    icon: React.createElement(WarningOutlined, { style: { color: '#faad14' } })
  });
};

/**
 * 信息通知
 */
export const showInfo = (content: string, duration = 3) => {
  return message.info({
    content,
    duration,
    icon: React.createElement(InfoCircleOutlined, { style: { color: '#1890ff' } })
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
        duration: 6,
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      });
    } else {
      showError(errorMessage);
    }
  }
};

/**
 * 显示详细错误信息
 */
export const showDetailedError = (config: ErrorDisplayConfig) => {
  const {
    title = '操作失败',
    error,
    context = '',
    showDetails = true,
    showRetry = false,
    retryAction,
    showContact = true
  } = config;

  let errorMessage = '';
  let errorDetails = '';

  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorDetails = error.stack || '';
  } else if ('error' in error) {
    errorMessage = error.error;
    errorDetails = error.details || '';
    if (error.field) {
      errorDetails = `字段: ${error.field}\n${errorDetails}`;
    }
    if (error.trace_id) {
      errorDetails = `追踪ID: ${error.trace_id}\n${errorDetails}`;
    }
  }

  const fullDescription = (
    <div>
      {context && <p><strong>上下文:</strong> {context}</p>}
      {showDetails && errorMessage && (
        <div style={{ marginBottom: 12 }}>
          <strong>错误信息:</strong>
          <div style={{
            background: '#fff2f0',
            border: '1px solid #ffccc7',
            borderRadius: 4,
            padding: 8,
            marginTop: 4,
            fontSize: '12px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            maxHeight: 200,
            overflow: 'auto'
          }}>
            {errorMessage}
          </div>
        </div>
      )}
      {showDetails && errorDetails && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', color: '#1890ff' }}>
            查看详细错误信息
          </summary>
          <pre style={{
            background: '#f5f5f5',
            border: '1px solid #d9d9d9',
            borderRadius: 4,
            padding: 8,
            marginTop: 4,
            fontSize: '11px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            maxHeight: 300,
            overflow: 'auto'
          }}>
            {errorDetails}
          </pre>
        </details>
      )}
    </div>
  );

  const actions = [];
  if (showRetry && retryAction) {
    actions.push(
      <Button
        key="retry"
        type="primary"
        size="small"
        icon={<ReloadOutlined />}
        onClick={retryAction}
      >
        重试
      </Button>
    );
  }
  if (showContact) {
    actions.push(
      <Button
        key="contact"
        size="small"
        icon={<ContactSupportOutlined />}
        onClick={() => {
          Modal.info({
            title: '联系技术支持',
            content: (
              <div>
                <p>如果问题持续存在，请联系技术支持:</p>
                <ul>
                  <li>邮箱: support@example.com</li>
                  <li>电话: 400-123-4567</li>
                  <li>或通过系统反馈功能提交问题</li>
                </ul>
                {error && 'trace_id' in error && error.trace_id && (
                  <p><strong>请提供追踪ID:</strong> {error.trace_id}</p>
                )}
              </div>
            )
          });
        }}
      >
        联系支持
      </Button>
    );
  }

  notification.error({
    message: title,
    description: fullDescription,
    duration: 0, // 不自动关闭
    icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
    btn: actions.length > 0 ? (
      <div style={{ marginTop: 8 }}>
        {actions}
      </div>
    ) : undefined
  });
};

/**
 * 显示网络错误
 */
export const showNetworkError = (error: any, retryAction?: () => void) => {
  showDetailedError({
    title: '网络连接错误',
    error: error.message || '网络连接失败',
    context: '请检查网络连接是否正常，或稍后重试',
    showRetry: !!retryAction,
    retryAction
  });
};

/**
 * 显示API错误
 */
export const showApiError = (response: any, context?: string) => {
  const error = response.data || response;

  showDetailedError({
    title: 'API调用失败',
    error: error.error || error.message || '服务器返回错误',
    context: context || `请求: ${response.config?.method?.toUpperCase()} ${response.config?.url}`,
    showDetails: true,
    showContact: true
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

  notification.error({
    message: '表单验证失败',
    description: (
      <div>
        <p>请修正以下错误:</p>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {errorList.map(({ field, messages }) => (
            messages.map((message, index) => (
              <li key={`${field}-${index}`}>
                <strong>{field}:</strong> {message}
              </li>
            ))
          ))}
        </ul>
      </div>
    ),
    duration: 6,
    icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />
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
  const iconMap = {
    danger: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
    warning: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
    info: <InfoCircleOutlined style={{ color: '#1890ff' }} />
  };

  const okTypeMap = {
    danger: 'danger' as const,
    warning: 'primary' as const,
    info: 'primary' as const
  };

  return Modal.confirm({
    title,
    content,
    icon: iconMap[type],
    okText: '确认',
    cancelText: '取消',
    okType: okTypeMap[type],
    onOk: onConfirm,
    onCancel
  });
};

/**
 * 显示操作进度通知
 */
export const showProgressNotification = (
  title: string,
  progress: number,
  total: number,
  message?: string
) => {
  const percentage = Math.round((progress / total) * 100);

  notification.open({
    key: 'progress',
    message: title,
    description: (
      <div>
        <div style={{ marginBottom: 8 }}>
          {message || `进度: ${progress}/${total}`}
        </div>
        <div
          style={{
            width: '100%',
            height: 6,
            backgroundColor: '#f0f0f0',
            borderRadius: 3,
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              backgroundColor: '#1890ff',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
        <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
          {percentage}% 完成
        </div>
      </div>
    ),
    duration: 0,
    icon: <InfoCircleOutlined style={{ color: '#1890ff' }} />
  });
};

/**
 * 关闭进度通知
 */
export const closeProgressNotification = () => {
  notification.destroy('progress');
};

/**
 * 显示批量操作结果
 */
export const showBatchOperationResult = (
  total: number,
  success: number,
  failed: number,
  failedItems?: Array<{ item: any; error: string }>
) => {
  const title = `批量操作完成`;

  if (failed === 0) {
    showSuccess(`成功处理 ${success} 项`);
    return;
  }

  let content = (
    <div>
      <p>总共处理 {total} 项</p>
      <p style={{ color: '#52c41a' }}>成功: {success} 项</p>
      <p style={{ color: '#ff4d4f' }}>失败: {failed} 项</p>
      {failedItems && failedItems.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', color: '#1890ff' }}>
            查看失败项
          </summary>
          <div style={{
            background: '#fff2f0',
            border: '1px solid #ffccc7',
            borderRadius: 4,
            padding: 8,
            marginTop: 4,
            maxHeight: 200,
            overflow: 'auto'
          }}>
            {failedItems.map((item, index) => (
              <div key={index} style={{ marginBottom: 4 }}>
                <strong>项 {index + 1}:</strong> {item.error}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );

  notification.warning({
    message: title,
    description: content,
    duration: 0,
    icon: <WarningOutlined style={{ color: '#faad14' }} />
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

  showDetailedError({
    title,
    error: error?.message || message,
    showDetails: !!error,
    showRetry: status >= 500,
    showContact: status >= 500
  });
};