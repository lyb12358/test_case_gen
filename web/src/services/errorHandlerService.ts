/**
 * 统一错误处理服务
 * 提供统一的错误处理、用户友好的错误提示和错误恢复机制
 */

import { message } from 'antd';

export interface ApiError {
  status: number;
  message: string;
  detail?: string;
  code?: string;
  field?: string;
}

export interface ErrorHandlingOptions {
  showNotification?: boolean;
  logToConsole?: boolean;
  customMessage?: string;
  fallbackMessage?: string;
}

class ErrorHandlerService {
  private static instance: ErrorHandlerService;

  private constructor() {}

  public static getInstance(): ErrorHandlerService {
    if (!ErrorHandlerService.instance) {
      ErrorHandlerService.instance = new ErrorHandlerService();
    }
    return ErrorHandlerService.instance;
  }

  /**
   * 处理API错误
   */
  public handleApiError(
    error: any,
    options: ErrorHandlingOptions = {}
  ): string {
    const {
      showNotification = true,
      logToConsole = true,
      customMessage,
      fallbackMessage = '操作失败，请稍后重试'
    } = options;

    let userMessage = customMessage || fallbackMessage;
    let apiError: ApiError | null = null;

    // 解析错误对象
    if (error.response) {
      // HTTP错误响应
      apiError = {
        status: error.response.status,
        message: error.response.data?.message || error.response.statusText,
        detail: error.response.data?.detail,
        code: error.response.data?.code,
        field: error.response.data?.field
      };
      userMessage = this.getUserFriendlyErrorMessage(apiError, fallbackMessage);
    } else if (error.request) {
      // 网络错误
      apiError = {
        status: 0,
        message: '网络连接失败'
      };
      userMessage = '网络连接失败，请检查网络设置';
    } else if (error.message) {
      // 其他错误
      apiError = {
        status: -1,
        message: error.message
      };
      userMessage = this.getUserFriendlyErrorMessage(apiError, fallbackMessage);
    }

    // 记录错误日志
    if (logToConsole) {
      this.logError(error, apiError);
    }

    // 显示用户通知
    if (showNotification) {
      this.showErrorNotification(userMessage, apiError);
    }

    return userMessage;
  }

  /**
   * 获取用户友好的错误消息
   */
  private getUserFriendlyErrorMessage(error: ApiError, fallback: string): string {
    // 根据HTTP状态码返回友好消息
    switch (error.status) {
      case 400:
        if (error.field) {
          return `${this.getFieldDisplayName(error.field)}: ${error.detail || error.message}`;
        }
        return error.detail || error.message || '请求参数错误';

      case 401:
        return '身份验证失败，请重新登录';

      case 403:
        return '没有权限执行此操作';

      case 404:
        return '请求的资源不存在';

      case 409:
        return error.detail || error.message || '数据冲突，请刷新页面后重试';

      case 422:
        return '数据验证失败，请检查输入内容';

      case 429:
        return '操作太频繁，请稍后再试';

      case 500:
        return '服务器内部错误，请稍后重试';

      case 502:
      case 503:
      case 504:
        return '服务暂时不可用，请稍后重试';

      default:
        if (error.code) {
          return this.getSpecificErrorMessage(error.code, error.detail || error.message);
        }
        return error.detail || error.message || fallback;
    }
  }

  /**
   * 获取字段显示名称
   */
  private getFieldDisplayName(field: string): string {
    const fieldNames: Record<string, string> = {
      title: '标题',
      description: '描述',
      business_type: '业务类型',
      priority: '优先级',
      status: '状态',
      test_point_id: '测试点ID',
      project_id: '项目ID',
      name: '名称',
      case_id: '用例ID'
    };
    return fieldNames[field] || field;
  }

  /**
   * 根据错误代码获取特定错误消息
   */
  private getSpecificErrorMessage(code: string, defaultMessage: string): string {
    const errorMessages: Record<string, string> = {
      'name_duplicate': '名称已存在，请使用不同的名称',
      'test_point_not_found': '测试点不存在',
      'test_case_not_found': '测试用例不存在',
      'project_not_found': '项目不存在',
      'business_type_invalid': '业务类型无效',
      'generation_failed': '生成失败，请稍后重试',
      'validation_failed': '数据验证失败',
      'permission_denied': '权限不足',
      'database_error': '数据库操作失败',
      'network_timeout': '请求超时，请检查网络连接'
    };
    return errorMessages[code] || defaultMessage;
  }

  /**
   * 记录错误日志
   */
  private logError(error: any, apiError: ApiError | null): void {
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 API Error');
      console.error('Original Error:', error);
      if (apiError) {
        console.error('Parsed Error:', apiError);
      }
      console.groupEnd();
    }

    // 生产环境可以将错误发送到日志服务
    if (process.env.NODE_ENV === 'production' && apiError) {
      this.sendErrorToLoggingService(error, apiError);
    }
  }

  /**
   * 发送错误到日志服务
   */
  private sendErrorToLoggingService(error: any, apiError: ApiError): void {
    // 这里可以实现将错误发送到外部日志服务
    try {
      // 示例：发送到错误追踪服务
      // errorTracking.captureException(error, { extra: { apiError } });
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  }

  /**
   * 显示错误通知
   */
  private showErrorNotification(message: string, error: ApiError | null): void {
    if (error?.status >= 500) {
      message.error(message, 5); // 服务器错误显示更长时间
    } else if (error?.status === 0) {
      message.warning(message, 3); // 网络错误使用警告样式
    } else {
      message.error(message, 3);
    }
  }

  /**
   * 创建错误重试函数
   */
  public createRetryFunction<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      shouldRetry?: (error: any) => boolean;
    } = {}
  ): (...args: T) => Promise<R> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      shouldRetry = (error) => {
        // 默认对网络错误和5xx错误进行重试
        return !error.response || error.response.status >= 500 || error.response.status === 0;
      }
    } = options;

    return async (...args: T): Promise<R> => {
      let lastError: any;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn(...args);
        } catch (error) {
          lastError = error;

          if (attempt === maxRetries || !shouldRetry(error)) {
            this.handleApiError(error);
            throw error;
          }

          // 显示重试提示
          if (attempt === 0) {
            message.loading('操作失败，正在重试...', 0);
          }

          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }

      // 清除loading消息
      message.destroy();
      this.handleApiError(lastError);
      throw lastError;
    };
  }

  /**
   * 包装API调用以提供自动错误处理
   */
  public wrapApiCall<T>(
    apiCall: Promise<T>,
    options: ErrorHandlingOptions = {}
  ): Promise<T> {
    return apiCall.catch(error => {
      this.handleApiError(error, options);
      throw error; // 重新抛出错误，让调用者可以进一步处理
    });
  }

  /**
   * 批量错误处理
   */
  public handleBatchErrors(
    errors: Array<{ item?: any; error: any }>,
    options: {
      successMessage?: string;
      errorMessage?: string;
      showDetails?: boolean;
    } = {}
  ): void {
    const { successMessage, errorMessage, showDetails = false } = options;

    if (errors.length === 0) {
      if (successMessage) {
        message.success(successMessage);
      }
      return;
    }

    const errorSummary = `操作完成，${errors.length} 项失败`;
    const errorDetails = errors.slice(0, 3).map(({ error }) => {
      const errorMsg = this.handleApiError(error, { showNotification: false, logToConsole: false });
      return errorMsg;
    }).join('; ');

    if (showDetails && errors.length <= 3) {
      message.error(`${errorSummary}: ${errorDetails}`, 5);
    } else {
      message.error(`${errorSummary}${errorMessage ? ': ' + errorMessage : ''}`, 5);
    }
  }
}

// 导出单例实例
export const errorHandlerService = ErrorHandlerService.getInstance();

// 导出默认实例
export default errorHandlerService;