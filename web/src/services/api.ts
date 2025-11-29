import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { vi } from 'vitest';
import { errorHandlerService } from './errorHandlerService';

// API 基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';


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

// 响应拦截器 - 统一错误处理，与errorHandlerService协同工作
  apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error) => {
      // 记录原始错误（开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.error('API Error:', error);
      }

      // 对于422验证错误，提供更详细的字段级错误信息
      if (error.response?.status === 422) {
        const errorData = error.response.data;
        if (errorData?.detail && typeof errorData.detail === 'object') {
          const fieldErrors = Object.entries(errorData.detail)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ');
          error.fieldErrors = fieldErrors; // 附加字段错误信息
        }
      }

      // 不在这里显示用户通知，让errorHandlerService统一处理
      // 这样可以避免重复的错误提示
      return Promise.reject(error);
    }
  );
}

export default apiClient;
export { apiClient };