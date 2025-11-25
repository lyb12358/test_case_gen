/**
 * Utility functions for two-stage generation status.
 * Since the system now only supports two-stage generation, this provides
 * simplified status display for business type configurations.
 */

import { Tag } from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';

export interface TwoStageConfig {
  has_test_point_combination?: boolean;
  has_test_case_combination?: boolean;
}

/**
 * Check if two-stage generation configuration is complete
 */
export const isTwoStageConfigComplete = (
  hasTestPointCombination?: boolean,
  hasTestCaseCombination?: boolean
): boolean => {
  return !!(hasTestPointCombination && hasTestCaseCombination);
};

/**
 * Get two-stage generation status tag with configuration completeness
 */
export const getTwoStageStatusTag = (config: TwoStageConfig) => {
  const { has_test_point_combination, has_test_case_combination } = config;

  const isComplete = isTwoStageConfigComplete(
    has_test_point_combination,
    has_test_case_combination
  );

  if (isComplete) {
    return (
      <Tag color="green" icon={<CheckCircleOutlined />}>
        两阶段(完整)
      </Tag>
    );
  } else if (has_test_point_combination || has_test_case_combination) {
    const missingParts = [];
    if (!has_test_point_combination) missingParts.push('测试点组合');
    if (!has_test_case_combination) missingParts.push('测试用例组合');

    return (
      <Tag
        color="orange"
        icon={<ExclamationCircleOutlined />}
        title={`两阶段生成配置不完整：缺少${missingParts.join('、')}`}
      >
        两阶段(不完整)
      </Tag>
    );
  } else {
    return (
      <Tag color="red" icon={<CloseCircleOutlined />}>
        两阶段(未配置)
      </Tag>
    );
  }
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