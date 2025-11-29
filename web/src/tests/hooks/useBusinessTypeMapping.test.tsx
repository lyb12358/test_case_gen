/**
 * useBusinessTypeMapping Hook 单元测试
 * 测试动态业务类型映射功能，确保业务类型管理正确性
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBusinessTypeMapping } from '../../hooks/useBusinessTypeMapping';

// Mock API service
vi.mock('../../services/configService', () => ({
  configService: {
    getBusinessTypes: vi.fn()
  }
}));

import { configService } from '../../services/configService';

describe('useBusinessTypeMapping', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0
        }
      }
    });

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  describe('基础功能', () => {
    it('应该返回所有必需的方法和状态', () => {
      const { result } = renderHook(() => useBusinessTypeMapping(), { wrapper });

      expect(result.current).toHaveProperty('getBusinessTypeFullName');
      expect(result.current).toHaveProperty('getAllBusinessTypes');
      expect(result.current).toHaveProperty('getBusinessTypeDescription');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(typeof result.current.getBusinessTypeFullName).toBe('function');
      expect(typeof result.current.getAllBusinessTypes).toBe('function');
      expect(typeof result.current.getBusinessTypeDescription).toBe('function');
    });

    it('应该在初始化时显示加载状态', () => {
      const { result } = renderHook(() => useBusinessTypeMapping(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe(null);
    });
  });

  describe('业务类型映射功能', () => {
    it('应该正确处理空数据情况', () => {
      const { result } = renderHook(() => useBusinessTypeMapping(), { wrapper });

      // 没有数据时应该返回默认值
      expect(result.current.getBusinessTypeFullName('RCC')).toBe('RCC');
      expect(result.current.getBusinessTypeFullName('')).toBe('-');
      expect(result.current.getBusinessTypeDescription('RCC')).toBe('');
      expect(result.current.getAllBusinessTypes()).toHaveLength(0);
    });
  });

  describe('动态数据加载', () => {
    it('应该成功加载动态业务类型数据', async () => {
      const mockDynamicTypes = {
        business_types: {
          'RCC': { name: '动态RCC名称', description: '动态RCC描述', category: 'deposit' },
          'RFD': { name: '动态RFD名称', description: '动态RFD描述', category: 'transaction' },
          'NEW_TYPE': { name: '新业务类型', description: '新类型描述', category: 'other' }
        }
      };

      vi.mocked(configService.getBusinessTypes).mockResolvedValue(mockDynamicTypes);

      const { result, waitFor } = renderHook(() => useBusinessTypeMapping(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(configService.getBusinessTypes).toHaveBeenCalledTimes(1);

      // 应该使用动态数据
      expect(result.current.getBusinessTypeFullName('RCC')).toBe('动态RCC名称');
      expect(result.current.getBusinessTypeFullName('NEW_TYPE')).toBe('新业务类型');
      expect(result.current.getAllBusinessTypes()).toContain('NEW_TYPE');
      expect(result.current.hasData).toBe(true);
      expect(result.current.count).toBe(3);
    });

    it('应该在API调用失败时使用空数据', async () => {
      vi.mocked(configService.getBusinessTypes).mockRejectedValue(new Error('API Error'));

      const { result, waitFor } = renderHook(() => useBusinessTypeMapping(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();

      // 应该返回空数据
      expect(result.current.getBusinessTypeFullName('RCC')).toBe('RCC');
      expect(result.current.getAllBusinessTypes()).toHaveLength(0);
      expect(result.current.hasData).toBe(false);
    });

    it('应该处理空的动态数据响应', async () => {
      vi.mocked(configService.getBusinessTypes).mockResolvedValue({ business_types: {} });

      const { result, waitFor } = renderHook(() => useBusinessTypeMapping(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 应该返回空数据
      expect(result.current.getBusinessTypeFullName('RCC')).toBe('RCC');
      expect(result.current.getAllBusinessTypes()).toHaveLength(0);
    });
  });

  describe('边界情况', () => {
    it('应该处理null/undefined输入', () => {
      const { result } = renderHook(() => useBusinessTypeMapping(), { wrapper });

      expect(result.current.getBusinessTypeFullName(null as any)).toBe('-');
      expect(result.current.getBusinessTypeFullName(undefined as any)).toBe('-');
      expect(result.current.getBusinessTypeFullName('')).toBe('-');
    });

    it('应该处理不存在的业务类型', () => {
      const { result } = renderHook(() => useBusinessTypeMapping(), { wrapper });

      expect(result.current.getBusinessTypeFullName('NONEXISTENT')).toBe('NONEXISTENT');
      expect(result.current.getBusinessTypeDescription('NONEXISTENT')).toBe('');
    });
  });

  describe('其他方法测试', () => {
    it('应该正确返回图标和颜色', () => {
      const { result } = renderHook(() => useBusinessTypeMapping(), { wrapper });

      expect(result.current.getBusinessTypeIcon('RCC')).toBe('setting');
      expect(result.current.getBusinessTypeColor('RCC')).toBe('#666666');
    });

    it('应该正确生成选项', async () => {
      const mockTypes = {
        business_types: {
          'RCC': { name: 'RCC名称', description: '描述', category: 'test' }
        }
      };

      vi.mocked(configService.getBusinessTypes).mockResolvedValue(mockTypes);

      const { result, waitFor } = renderHook(() => useBusinessTypeMapping(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const options = result.current.generateBusinessTypeOptions();
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveProperty('value', 'RCC');
      expect(options[0]).toHaveProperty('label');
    });
  });
});