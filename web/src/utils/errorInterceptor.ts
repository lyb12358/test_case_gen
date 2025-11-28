/**
 * API 错误拦截器
 * 统一处理 API 请求和响应错误
 */

import { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { showNetworkError, showApiError, showHttpError } from './notificationUtils';

export interface RequestConfig extends AxiosRequestConfig {
  showLoading?: boolean;
  showError?: boolean;
  customErrorHandler?: (error: any) => void;
}

// 存储当前加载中的请求
const loadingRequests = new Map<string, any>();

/**
 * 获取请求的唯一标识
 */
const getRequestId = (config: AxiosRequestConfig): string => {
  return `${config.method || 'GET'}-${config.url}-${JSON.stringify(config.params || {})}-${JSON.stringify(config.data || {})}`;
};

/**
 * 请求拦截器
 */
export const requestInterceptor = (config: RequestConfig) => {
  const requestId = getRequestId(config);

  // 如果需要显示加载状态
  if (config.showLoading) {
    import('antd').then(({ message }) => {
      const loadingMessage = message.loading({
        content: config.showLoading === true ? '加载中...' : config.showLoading as string,
        duration: 0
      });
      loadingRequests.set(requestId, loadingMessage);
    });
  }

  // 添加请求开始时间
  config.metadata = { startTime: Date.now() };

  return config;
};

/**
 * 响应拦截器
 */
export const responseInterceptor = (response: AxiosResponse) => {
  const requestId = getRequestId(response.config);
  const config = response.config as RequestConfig;

  // 清除加载状态
  if (loadingRequests.has(requestId)) {
    const loadingMessage = loadingRequests.get(requestId);
    loadingMessage?.();
    loadingRequests.delete(requestId);
  }

  // 计算请求耗时
  const endTime = Date.now();
  const duration = endTime - (config.metadata?.startTime || endTime);

  // 记录请求日志（开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url} - ${duration}ms`);
    if (duration > 5000) {
      console.warn(`Slow API Request: ${config.url} took ${duration}ms`);
    }
  }

  // 检查响应状态码
  if (response.data && typeof response.data === 'object') {
    // 处理统一的API响应格式
    if ('success' in response.data && !response.data.success) {
      const error = {
        code: response.data.code || 'UNKNOWN_ERROR',
        message: response.data.message || '操作失败',
        details: response.data.details,
        timestamp: response.data.timestamp,
        trace_id: response.data.trace_id
      };

      if (config.showError !== false) {
        if (config.customErrorHandler) {
          config.customErrorHandler(error);
        } else {
          showApiError({ data: error }, `${config.method?.toUpperCase()} ${config.url}`);
        }
      }

      return Promise.reject(error);
    }
  }

  return response;
};

/**
 * 错误拦截器
 */
export const errorInterceptor = (error: AxiosError) => {
  const config = error.config as RequestConfig;

  // 清除加载状态
  if (config) {
    const requestId = getRequestId(config);
    if (loadingRequests.has(requestId)) {
      const loadingMessage = loadingRequests.get(requestId);
      loadingMessage?.();
      loadingRequests.delete(requestId);
    }
  }

  // 网络错误
  if (!error.response) {
    if (config?.showError !== false) {
      if (config?.customErrorHandler) {
        config.customErrorHandler(error);
      } else {
        showNetworkError(error, () => {
          // 重试逻辑
          if (config) {
            return Promise.resolve(config);
          }
        });
      }
    }
    return Promise.reject(error);
  }

  // HTTP 状态码错误
  const { status, data } = error.response;

  if (config?.showError !== false) {
    if (config?.customErrorHandler) {
      config.customErrorHandler(error);
    } else {
      // 使用统一错误处理
      showHttpError(status, data);
    }
  }

  return Promise.reject(error);
};

/**
 * 创建带有默认配置的请求函数
 */
export const createApiRequest = (defaultConfig: Partial<RequestConfig> = {}) => {
  const {
    showLoading = false,
    showError = true,
    timeout = 10000,
    customErrorHandler,
    ...axiosConfig
  } = defaultConfig;

  return async (requestConfig: RequestConfig) => {
    const config: RequestConfig = {
      ...axiosConfig,
      ...requestConfig,
      showLoading: requestConfig.showLoading ?? showLoading,
      showError: requestConfig.showError ?? showError,
      customErrorHandler: requestConfig.customErrorHandler ?? customErrorHandler,
      timeout: requestConfig.timeout ?? timeout
    };

    try {
      const axios = (await import('axios')).default;
      const response = await axios(config);
      return response;
    } catch (error) {
      // 错误已经被拦截器处理了，这里直接抛出
      throw error;
    }
  };
};

/**
 * 批量请求处理器
 */
export class BatchRequestHandler {
  private requests: Array<{
    config: RequestConfig;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  private pending = false;

  add(config: RequestConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      this.requests.push({ config, resolve, reject });
    });
  }

  async executeAll(): Promise<any[]> {
    if (this.pending) {
      throw new Error('Batch request is already in progress');
    }

    if (this.requests.length === 0) {
      return [];
    }

    this.pending = true;

    try {
      const axios = (await import('axios')).default;
      const promises = this.requests.map(({ config }) => axios(config));
      const results = await Promise.allSettled(promises);

      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          this.requests[index].resolve(result.value);
          return result.value;
        } else {
          this.requests[index].reject(result.reason);
          throw result.reason;
        }
      });
    } finally {
      this.requests = [];
      this.pending = false;
    }
  }

  clear(): void {
    this.requests.forEach(({ reject }) => {
      reject(new Error('Batch request cancelled'));
    });
    this.requests = [];
    this.pending = false;
  }
}

/**
 * 请求重试机制
 */
export const createRetryRequest = (
  maxRetries = 3,
  retryDelay = 1000,
  retryCondition?: (error: AxiosError) => boolean
) => {
  return async (requestConfig: RequestConfig): Promise<AxiosResponse> => {
    let lastError: AxiosError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const axios = (await import('axios')).default;
        const response = await axios(requestConfig);
        return response;
      } catch (error) {
        lastError = error as AxiosError;

        // 检查是否应该重试
        if (attempt === maxRetries) {
          break;
        }

        if (retryCondition && !retryCondition(lastError)) {
          break;
        }

        // 某些错误不应该重试
        if (lastError.response?.status && [400, 401, 403, 404].includes(lastError.response.status)) {
          break;
        }

        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }

    throw lastError!;
  };
};

/**
 * 请求缓存机制
 */
export class RequestCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl = 300000) { // 默认5分钟
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // 清理过期的缓存
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// 定期清理缓存
setInterval(() => {
  const cache = new RequestCache();
  cache.cleanup();
}, 60000); // 每分钟清理一次

export const requestCache = new RequestCache();