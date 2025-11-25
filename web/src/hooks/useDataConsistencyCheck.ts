/**
 * Hook for validating data consistency across different API responses.
 * Detects logical inconsistencies and provides warnings.
 */

import { useEffect, useState } from 'react';
import { message } from 'antd';

interface PromptStats {
  total_prompts?: number;
  active_prompts?: number;
  draft_prompts?: number;
  archived_prompts?: number;
}

interface PromptListData {
  total?: number;
  items?: any[];
}

interface ConsistencyIssue {
  type: 'logical_error' | 'data_warning';
  message: string;
  details: string;
}

export const useDataConsistencyCheck = (
  listData: PromptListData | undefined,
  statsData: PromptStats | undefined
) => {
  const [issues, setIssues] = useState<ConsistencyIssue[]>([]);

  useEffect(() => {
    if (!listData || !statsData) {
      setIssues([]);
      return;
    }

    const newIssues: ConsistencyIssue[] = [];

    // Basic logical checks
    const total = listData.total || 0;
    const active = statsData.active_prompts || 0;
    const draft = statsData.draft_prompts || 0;
    const archived = statsData.archived_prompts || 0;
    const statusSum = active + draft + archived;

    // Check 1: Total should be >= active
    if (total < active) {
      newIssues.push({
        type: 'logical_error',
        message: '数据逻辑错误：总提示词数小于活跃提示词数',
        details: `总提示词数: ${total}, 活跃提示词数: ${active}. 这违反了基本的数据逻辑关系。`
      });
    }

    // Check 2: Total should be >= status sum
    if (total < statusSum) {
      newIssues.push({
        type: 'logical_error',
        message: '数据逻辑错误：总提示词数小于各状态提示词数之和',
        details: `总提示词数: ${total}, 状态总和: ${statusSum} (活跃:${active} + 草稿:${draft} + 已归档:${archived}).`
      });
    }

    // Check 3: Warning for large discrepancies
    if (total > statusSum && total - statusSum > 10) {
      newIssues.push({
        type: 'data_warning',
        message: '数据差异警告：总提示词数与状态总和差异较大',
        details: `差异: ${total - statusSum}. 可能有未统计状态的提示词或数据缓存延迟。`
      });
    }

    // Check 4: Negative numbers (shouldn't happen but good to catch)
    if (total < 0 || active < 0 || draft < 0 || archived < 0) {
      newIssues.push({
        type: 'logical_error',
        message: '数据错误：检测到负数值',
        details: `总数: ${total}, 活跃: ${active}, 草稿: ${draft}, 已归档: ${archived}`
      });
    }

    // Check 5: Empty data but project is selected
    if (total === 0 && active === 0 && draft === 0 && archived === 0) {
      newIssues.push({
        type: 'data_warning',
        message: '数据为空：当前项目没有提示词数据',
        details: '这可能是正常的（新项目），也可能是数据获取问题。'
      });
    }

    // Update issues state
    setIssues(newIssues);

    // Show message for critical errors only
    const criticalErrors = newIssues.filter(issue => issue.type === 'logical_error');
    if (criticalErrors.length > 0) {
      // Only show the first critical error to avoid overwhelming the user
      const error = criticalErrors[0];
      message.error(error.message, 5); // Auto dismiss after 5 seconds
    }

  }, [listData, statsData]);

  const isConsistent = issues.length === 0;
  const hasErrors = issues.some(issue => issue.type === 'logical_error');
  const hasWarnings = issues.some(issue => issue.type === 'data_warning');

  return {
    issues,
    isConsistent,
    hasErrors,
    hasWarnings,
    errorCount: issues.filter(issue => issue.type === 'logical_error').length,
    warningCount: issues.filter(issue => issue.type === 'data_warning').length
  };
};

export default useDataConsistencyCheck;