/**
 * 业务类型映射Hook。
 * 提供统一的业务类型名称、描述和图标映射功能，完全基于后端API动态获取。
 */

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { configService } from '../services/configService';

// 业务类型配置接口
export interface BusinessTypeConfig {
  code: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  category?: string;
}

/**
 * 业务类型映射Hook - 完全基于API动态获取
 */
export function useBusinessTypeMapping() {
  // 获取动态业务类型配置，增强错误处理和回退机制
  const { data: businessTypesData, isLoading, error, isError } = useQuery({
    queryKey: ['businessTypes'],
    queryFn: async () => {
      try {
        const result = await configService.getBusinessTypes();

        // 验证返回数据的格式
        if (!result || typeof result !== 'object') {
          console.warn('业务类型API返回了无效的数据格式');
          return { business_types: {} };
        }

        return result;
      } catch (apiError) {
        console.warn('无法获取业务类型配置:', apiError);

        // 返回空对象，触发错误处理
        return { business_types: {} };
      }
    },
    staleTime: 10 * 60 * 1000, // 10分钟缓存
    retry: (failureCount, error: any) => {
      // 网络错误或5xx错误时重试，其他错误不重试
      if (error?.category === 'server_error' || error?.category === 'network_error') {
        return failureCount < 3; // 最多重试3次
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // 指数退避，最大5秒
  });

  // 处理业务类型映射，完全基于API数据
  const businessTypesMapping = useMemo(() => {
    try {
      const dynamicTypes = businessTypesData?.business_types || {};

      // 如果有错误，记录但继续使用空配置
      if (isError) {
        console.warn('业务类型数据加载错误:', error);
      }

      // 将API数据转换为统一的配置格式
      const convertedMapping: Record<string, BusinessTypeConfig> = {};

      Object.entries(dynamicTypes).forEach(([code, config]) => {
        try {
          if (code && config && typeof config === 'object') {
            // API返回格式: { value, name, description, category }
            convertedMapping[code] = {
              code,
              name: config.name || code,
              description: config.description || '',
              icon: config.icon || 'setting', // 默认图标
              color: config.color || '#1890ff', // 默认蓝色
              category: config.category || 'default'
            };
          }
        } catch (conversionError) {
          console.warn(`转换业务类型配置时出错 (${code}):`, conversionError);
        }
      });

      return convertedMapping;
    } catch (processingError) {
      console.error('处理业务类型映射时出错:', processingError);
      return {};
    }
  }, [businessTypesData, isError, error]);

  // 获取业务类型全名
  const getBusinessTypeFullName = useCallback((type?: string): string => {
    if (!type) return '-';
    return businessTypesMapping[type]?.name || type;
  }, [businessTypesMapping]);

  // 获取业务类型描述
  const getBusinessTypeDescription = useCallback((type?: string): string => {
    if (!type) return '';
    return businessTypesMapping[type]?.description || '';
  }, [businessTypesMapping]);

  // 获取业务类型图标
  const getBusinessTypeIcon = useCallback((type?: string): string => {
    if (!type) return '';
    return businessTypesMapping[type]?.icon || 'setting';
  }, [businessTypesMapping]);

  // 获取业务类型颜色
  const getBusinessTypeColor = useCallback((type?: string): string => {
    if (!type) return '#666666';
    return businessTypesMapping[type]?.color || '#666666';
  }, [businessTypesMapping]);

  // 获取业务类型分类
  const getBusinessTypeCategory = useCallback((type?: string): string => {
    if (!type) return '';
    return businessTypesMapping[type]?.category || '';
  }, [businessTypesMapping]);

  // 获取所有业务类型列表
  const getAllBusinessTypes = useCallback((): string[] => {
    return Object.keys(businessTypesMapping);
  }, [businessTypesMapping]);

  // 获取业务类型配置
  const getBusinessTypeConfig = useCallback((type?: string): BusinessTypeConfig | undefined => {
    if (!type) return undefined;
    return businessTypesMapping[type];
  }, [businessTypesMapping]);

  // 按分类获取业务类型
  const getBusinessTypesByCategory = useCallback((category?: string): BusinessTypeConfig[] => {
    const types = Object.values(businessTypesMapping);
    if (!category) return types;
    return types.filter(type => type.category === category);
  }, [businessTypesMapping]);

  // 生成业务类型选项（用于Select组件）
  const generateBusinessTypeOptions = useCallback((
    includeCode = true,
    includeDescription = false,
    filterCategories?: string[]
  ) => {
    return Object.entries(businessTypesMapping)
      .filter(([_, config]) => {
        if (!filterCategories || filterCategories.length === 0) return true;
        return filterCategories.includes(config.category || '');
      })
      .map(([code, config]) => ({
        value: code,
        label: includeCode
          ? `[${code}] ${config.name}`
          : config.name,
        description: includeDescription ? config.description : undefined,
        config
      }));
  }, [businessTypesMapping]);

  // 生成业务类型标签颜色映射
  const getBusinessTypeTagColor = useCallback((type?: string): string => {
    const color = getBusinessTypeColor(type);
    // 将十六进制颜色转换为Ant Design标签颜色
    const colorMap: Record<string, string> = {
      '#1890ff': 'blue',
      '#52c41a': 'green',
      '#fa8c16': 'orange',
      '#f5222d': 'red',
      '#722ed1': 'purple',
      '#13c2c2': 'cyan',
      '#eb2f96': 'magenta',
      '#fa541c': 'volcano',
      '#a0d911': 'lime',
      '#fadb14': 'gold'
    };
    return colorMap[color] || 'default';
  }, [getBusinessTypeColor]);

  return {
    // 数据状态
    businessTypesMapping,
    isLoading,
    error,

    // 基础方法
    getBusinessTypeFullName,
    getBusinessTypeDescription,
    getBusinessTypeIcon,
    getBusinessTypeColor,
    getBusinessTypeCategory,
    getBusinessTypeConfig,

    // 列表和选项方法
    getAllBusinessTypes,
    getBusinessTypesByCategory,
    generateBusinessTypeOptions,
    getBusinessTypeTagColor,

    // 状态信息
    hasData: Object.keys(businessTypesMapping).length > 0,
    count: Object.keys(businessTypesMapping).length
  };
}

/**
 * 简化版本的业务类型映射Hook（用于基础场景）
 */
export function useStaticBusinessTypeMapping() {
  const {
    getBusinessTypeFullName,
    getBusinessTypeDescription,
    getBusinessTypeColor
  } = useBusinessTypeMapping();

  return {
    getBusinessTypeFullName,
    getBusinessTypeDescription,
    getBusinessTypeColor
  };
}

export default useBusinessTypeMapping;