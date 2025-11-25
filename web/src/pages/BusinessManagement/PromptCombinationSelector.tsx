import React, { useState, useEffect } from 'react';
import { Select, Spin, message } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { businessService, PromptCombination } from '../../services/businessService';
import { useProject } from '../../contexts/ProjectContext';

const { Option } = Select;

interface PromptCombinationSelectorProps {
  value?: number;
  onChange?: (value: number) => void;
  placeholder?: string;
  businessType?: string;
  allowClear?: boolean;
  disabled?: boolean;
}

const PromptCombinationSelector: React.FC<PromptCombinationSelectorProps> = ({
  value,
  onChange,
  placeholder = "请选择提示词组合",
  businessType,
  allowClear = true,
  disabled = false
}) => {
  const { currentProject } = useProject();

  // 获取可用的提示词组合
  const { data: combinations, isLoading, error } = useQuery({
    queryKey: ['promptCombinations', currentProject?.id, businessType],
    queryFn: () => {
      return businessService.getPromptCombinations({
        project_id: currentProject?.id,
        business_type: businessType,
        is_active: true,
        page: 1,
        size: 1000 // 获取所有可用的组合
      });
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!currentProject
  });

  if (error) {
    console.error('Failed to load prompt combinations:', error);
    message.error('加载提示词组合失败');
  }

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabled || isLoading}
      loading={isLoading}
      showSearch
      filterOption={(input, option) =>
        (option?.children as string)?.toLowerCase().includes(input.toLowerCase()) ||
        (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
      }
      notFoundContent={isLoading ? <Spin size="small" /> : "暂无可用提示词组合"}
    >
      {combinations?.items?.map((combination: PromptCombination) => (
        <Option key={combination.id} value={combination.id} label={combination.name}>
          <div>
            <div style={{ fontWeight: 500 }}>{combination.name}</div>
            {combination.description && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                {combination.description}
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#999' }}>
              {combination.items?.length || 0} 个提示词项
            </div>
          </div>
        </Option>
      ))}
    </Select>
  );
};

export default PromptCombinationSelector;