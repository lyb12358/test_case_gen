// 统一测试用例相关类型定义

import {
  PriorityLevel,
  TaskStatus,
  PaginationConfig,
  PaginationResponse,
  BaseApiResponse,
  SortDirection,
  SortField
} from './common';

// 直接定义统一的枚举以避免导入冲突
export const UnifiedTestCaseStatus = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed'  // 添加后端COMPLETED状态
} as const;

export const UnifiedTestCaseStage = {
  TEST_POINT: 'test_point',  // 改为小写单数，与后端一致
  TEST_CASE: 'test_case'       // 改为小写单数，与后端一致
} as const;

// 类型定义
export type UnifiedTestCaseStatus = 'draft' | 'approved' | 'rejected' | 'completed';
export type UnifiedTestCaseStage = 'test_point' | 'test_case';

// 类型别名
export type TestCaseStatus = UnifiedTestCaseStatus; // 向后兼容别名

export interface UnifiedTestCaseBase {
  name: string;
  description?: string;
  priority: PriorityLevel;
  status?: UnifiedTestCaseStatus; // 改为可选，支持默认值
}

export interface UnifiedTestCaseCreate extends UnifiedTestCaseBase {
  project_id: number;
  business_type: string;
  test_case_id: string; // 与后端 Pydantic alias 匹配
  module?: string;
  functional_module?: string;
  functional_domain?: string;
  preconditions?: string;  // 发送给后端时需要JSON字符串格式
  steps?: Array<{
    step_number: number;
    action: string;
    expected?: string;
  }>;
  expected_result?: string;
  remarks?: string;
  entity_order?: number;
}

export interface UnifiedTestCaseUpdate {
  name?: string;
  description?: string;
  business_type?: string;
  priority?: string;
  status?: UnifiedTestCaseStatus;
  stage?: UnifiedTestCaseStage;
  test_case_id?: string;
  module?: string;
  functional_module?: string;
  functional_domain?: string;
  preconditions?: string;  // 发送给后端时需要JSON字符串格式
  steps?: Array<{
    step_number: number;
    action: string;
    expected?: string;
  }>;
  expected_result?: string;
  remarks?: string;
  entity_order?: number;
}

export interface UnifiedTestCaseResponse extends UnifiedTestCaseBase {
  id: number;
  project_id: number;
  business_type: string;
  case_id: string;
  test_case_id: string; // 后端alias字段，与case_id相同
  stage: UnifiedTestCaseStage;
  module?: string;
  functional_module?: string;
  functional_domain?: string;
  preconditions: string | null;  // 后端返回JSON字符串格式
  steps: Array<{
    step_number: number;
    action: string;
    expected?: string;
  }> | null;
  expected_result: string | null;
  remarks?: string;
  generation_job_id?: string;
  entity_order?: number;
  created_at: string;
  updated_at: string;
}

export interface UnifiedTestCaseFilter extends PaginationConfig {
  project_id?: number;
  business_type?: string;
  status?: UnifiedTestCaseStatus;
  stage?: UnifiedTestCaseStage;
  priority?: PriorityLevel;
  keyword?: string;
  sort_by?: SortField;
  sort_order?: SortDirection;
  test_point_ids?: number[];
}

export interface UnifiedTestCaseListResponse extends PaginationResponse<UnifiedTestCaseResponse> {}

export interface UnifiedTestCaseStatistics {
  total_count: number;
  test_point_count: number;
  test_case_count: number;
  status_distribution: Record<string, number>;
  business_type_distribution: Record<string, number>;
  priority_distribution: Record<string, number>;
  recent_activity?: any[];
}

export interface UnifiedTestCaseBatchOperation {
  test_case_ids: number[];
  operation: 'delete' | 'update_status' | 'update_priority';
  status?: UnifiedTestCaseStatus;
  priority?: string;
}

export interface UnifiedTestCaseBatchResponse {
  success_count: number;
  failed_count: number;
  failed_items: Array<{
    case_id: number;
    error: string;
  }>;
}

export interface UnifiedTestCaseGenerationRequest {
  project_id: number;
  business_type: string;
  count?: number;
  complexity_level?: 'basic' | 'standard' | 'comprehensive';
  include_negative_cases?: boolean;
  additional_context?: Record<string, any>;
}

export interface UnifiedTestCaseGenerationResponse {
  generation_job_id: string;
  status: string;
  test_points_generated: number;
  test_cases_generated: number;
  test_cases?: UnifiedTestCaseResponse[]; // 修复：改为与当前数据库一致
  generation_time?: number;
  message: string;
}

// 表单相关类型
export interface UnifiedTestCaseFormData extends Omit<UnifiedTestCaseCreate, 'project_id'> {
  // 基础信息
  name: string;
  description: string;
  case_id: string;
  priority: 'low' | 'medium' | 'high';
  status: UnifiedTestCaseStatus;

  // 测试用例特有字段
  module?: string;
  functional_module?: string;
  functional_domain?: string;

  // 执行步骤
  preconditions?: string;  // 发送给后端时需要JSON字符串格式
  steps: Array<{
    step_number: number;
    action: string;
    expected: string;
  }>;
  expected_result?: string;
  remarks?: string;
}

// 视图模式
export enum ViewMode {
  TEST_POINTS = 'test_points',
  TEST_CASES = 'test_cases',
  UNIFIED = 'unified',
  HIERARCHY = 'hierarchy'
}

// 列表项扩展
export interface UnifiedTestCaseListItem extends UnifiedTestCaseResponse {
  selected?: boolean;
  loading?: boolean;
}

// 搜索和过滤
export interface SearchFilter {
  keyword?: string;
  business_type?: string;
  status?: UnifiedTestCaseStatus;
  priority?: string;
  stage?: UnifiedTestCaseStage;
  date_range?: [string, string];
}


// 表格列配置
export interface TableColumnConfig {
  key: string;
  title: string;
  dataIndex: string;
  width?: number;
  fixed?: 'left' | 'right';
  sorter?: boolean;
  filterable?: boolean;
  render?: (value: any, record: UnifiedTestCaseResponse) => React.ReactNode;
}

// 批量操作配置
export interface BatchAction {
  key: string;
  label: string;
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: (selectedIds: number[]) => Promise<void>;
}

// 导出配置
export interface ExportConfig {
  format: 'excel' | 'json' | 'csv';
  fields: string[];
  filename?: string;
}

// 统计图表数据
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

// 时间范围
export interface DateRange {
  start: string;
  end: string;
}

// 生成进度
export interface GenerationProgress {
  stage: 'test_point' | 'test_case' | 'completed';
  progress: number;
  message: string;
  estimated_time?: number;
}

// WebSocket消息
export interface UnifiedTestCaseWebSocketMessage {
  type: 'progress' | 'completed' | 'error' | 'status_update';
  data: any;
  timestamp: string;
}

// 表单验证规则
export interface FormRule {
  required?: boolean;
  message?: string;
  min?: number;
  max?: number;
  pattern?: RegExp;
  validator?: (rule: any, value: any) => Promise<void>;
}

// 统一错误响应格式
export interface UnifiedErrorResponse {
  error: string;
  code: string;
  details?: any;
  field?: string;
  timestamp?: string;
  trace_id?: string;
}

// API响应包装器
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: UnifiedErrorResponse;
  message?: string;
  timestamp: string;
}

// 字段级错误
export interface FieldError {
  field: string;
  message: string;
  code?: string;
  value?: any;
}

// 验证错误响应
export interface ValidationErrorResponse extends UnifiedErrorResponse {
  field_errors: FieldError[];
}