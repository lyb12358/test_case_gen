/**
 * Configuration status utilities for business types.
 * Provides unified status display for prompt combination configuration.
 */

import { Tag } from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';

export type ConfigurationStatus = 'none' | 'partial' | 'complete';

export interface ConfigurationConfig {
  configuration_status: ConfigurationStatus;
  has_valid_test_point_combination?: boolean;
  has_valid_test_case_combination?: boolean;
}

/**
 * Get unified configuration status tag with intuitive design
 */
export const getConfigurationStatusTag = (config: ConfigurationConfig) => {
  const { configuration_status, has_valid_test_point_combination, has_valid_test_case_combination } = config;

  switch (configuration_status) {
    case 'complete':
      return (
        <Tag color="green" icon={<CheckCircleOutlined />}>
          完整配置
        </Tag>
      );

    case 'partial':
      const missingParts = [];
      if (!has_valid_test_point_combination) missingParts.push('测试点组合');
      if (!has_valid_test_case_combination) missingParts.push('测试用例组合');

      return (
        <Tag
          color="orange"
          icon={<ExclamationCircleOutlined />}
          title={`配置不完整：缺少${missingParts.join('、')}`}
        >
          部分配置
        </Tag>
      );

    case 'none':
    default:
      return (
        <Tag
          color="red"
          icon={<CloseCircleOutlined />}
          title="需要配置提示词组合"
        >
          未配置
        </Tag>
      );
  }
};

/**
 * Legacy compatibility - deprecated, use getConfigurationStatusTag instead
 */
export const getTwoStageStatusTag = getConfigurationStatusTag;

/**
 * Legacy compatibility interfaces
 */
export interface TwoStageConfig {
  has_test_point_combination?: boolean;
  has_test_case_combination?: boolean;
}

export const isTwoStageConfigComplete = (
  hasTestPointCombination?: boolean,
  hasTestCaseCombination?: boolean
): boolean => {
  return !!(hasTestPointCombination && hasTestCaseCombination);
};

/**
 * Get configuration status text for two-stage generation
 */
export const getTwoStageConfigStatus = (
  hasTestPointCombination?: boolean,
  hasTestCaseCombination?: boolean
): { text: string; type: 'success' | 'warning' | 'error' } => {
  const isComplete = isTwoStageConfigComplete(hasTestPointCombination, hasTestCaseCombination);

  if (isComplete) {
    return { text: '配置完整', type: 'success' };
  } else if (hasTestPointCombination || hasTestCaseCombination) {
    return { text: '配置不完整', type: 'warning' };
  } else {
    return { text: '未配置', type: 'error' };
  }
};

/**
 * Get progress step description for two-stage generation task logs
 */
export const getProgressStepDescription = (step: number): string => {
  switch (step) {
    case 1:
      return '阶段 1: 正在生成测试点...';
    case 2:
      return '阶段 2: 正在基于测试点生成测试用例...';
    case 3:
      return '正在整合测试结果并保存...';
    default:
      return '正在处理...';
  }
};