import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { vi } from 'vitest';

// API 基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// 创建 axios 实例 - 添加环境兼容性检查
const apiClient: AxiosInstance =
  (typeof window !== 'undefined' && typeof window.document !== 'undefined')
    ? axios.create({
        baseURL: API_BASE_URL,
        timeout: 240000,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    : {
        // Node环境下的mock配置（用于vitest测试）
        baseURL: API_BASE_URL,
        timeout: 240000,
        headers: {
          'Content-Type': 'application/json',
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      } as any;

// 请求拦截器 - 只在真实axios环境中使用
if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
  apiClient.interceptors.request.use(
    (config) => {
      // 可以在这里添加认证 token 等
      return config;
    },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
  apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error) => {
      console.error('API Error:', error);

      if (error.response) {
        // 服务器响应错误
        const status = error.response.status;
        const message = error.response.data?.detail || error.response.data?.message || '请求失败';

        switch (status) {
        case 401:
          // 处理未授权
          break;
        case 403:
          // 处理禁止访问
          break;
        case 404:
          // 处理资源未找到
          break;
        case 422:
          // 处理验证错误 - 提供更详细的错误信息
          const errorData = error.response.data;
          if (errorData?.detail && typeof errorData.detail === 'object') {
            // 如果detail是对象，提取字段验证错误
            const fieldErrors = Object.entries(errorData.detail)
              .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
              .join('; ');
            return Promise.reject(new Error(`数据验证失败: ${fieldErrors}`));
          }
          break;
        case 500:
          // 处理服务器错误
          break;
        default:
          // 处理其他错误
          break;
      }

      return Promise.reject(new Error(message));
    } else if (error.request) {
      // 网络错误
      return Promise.reject(new Error('网络连接失败，请检查网络设置'));
    } else {
      // 其他错误
      return Promise.reject(new Error('请求配置错误'));
    }
  }
);
}

export default apiClient;
export { apiClient };