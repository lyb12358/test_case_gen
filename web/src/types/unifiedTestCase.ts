// 统一测试用例相关类型定义

export enum UnifiedTestCaseStatus {
  DRAFT = "draft",
  APPROVED = "approved",
  COMPLETED = "completed"
}

export enum UnifiedTestCaseStage {
  TEST_POINT = "test_point",
  TEST_CASE = "test_case"
}

export interface UnifiedTestCaseBase {
  name: string;
  description?: string;
  priority: string;
  status: UnifiedTestCaseStatus;
}

export interface UnifiedTestCaseCreate extends UnifiedTestCaseBase {
  project_id: number;
  business_type: string;
  case_id: string;
  module?: string;
  functional_module?: string;
  functional_domain?: string;
  preconditions?: string[];
  steps?: Array<{
    step_number: number;
    action: string;
    expected?: string;
  }>;
  expected_result?: string[];
  remarks?: string;
  entity_order?: number;
  test_point_id?: number;
}

export interface UnifiedTestCaseUpdate {
  name?: string;
  description?: string;
  priority?: string;
  status?: UnifiedTestCaseStatus;
  module?: string;
  functional_module?: string;
  functional_domain?: string;
  test_point_id?: number;
  preconditions?: string[];
  steps?: Array<{
    step_number: number;
    action: string;
    expected?: string;
  }>;
  expected_result?: string[];
  remarks?: string;
  entity_order?: number;
}

export interface UnifiedTestCaseResponse extends UnifiedTestCaseBase {
  id: number;
  project_id: number;
  business_type: string;
  case_id: string;
  test_case_id: string;
  stage: UnifiedTestCaseStage;
  module?: string;
  functional_module?: string;
  functional_domain?: string;
  preconditions: string[] | null;
  steps: Array<{
    step_number: number;
    action: string;
    expected?: string;
  }> | null;
  expected_result: string[] | null;
  remarks?: string;
  generation_job_id?: string;
  entity_order?: number;
  test_point_id?: number;
  testPoint?: {
    id: number;
    test_point_id: string;
    title: string;
  };
  created_at: string;
  updated_at: string;
}

export interface UnifiedTestCaseFilter {
  project_id?: number;
  business_type?: string;
  status?: UnifiedTestCaseStatus;
  stage?: UnifiedTestCaseStage;
  priority?: string;
  keyword?: string;
  test_point_ids?: number[];
  test_point_id?: number;
  page: number;
  size: number;
  sort_by: string;
  sort_order: 'asc' | 'desc';
}

export interface UnifiedTestCaseListResponse {
  items: UnifiedTestCaseResponse[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

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
    test_case_id: number;
    error: string;
  }>;
}

export interface UnifiedTestCaseGenerationRequest {
  project_id: number;
  business_type: string;
  count?: number;
  complexity_level?: 'basic' | 'standard' | 'comprehensive';
  include_negative_cases?: boolean;
  test_point_ids?: number[];
  additional_context?: Record<string, any>;
}

export interface UnifiedTestCaseGenerationResponse {
  generation_job_id: string;
  status: string;
  test_points_generated: number;
  test_cases_generated: number;
  test_case_items?: UnifiedTestCaseResponse[];
  generation_time?: number;
  message: string;
}

// 表单相关类型
export interface UnifiedTestCaseFormData extends Omit<UnifiedTestCaseCreate, 'project_id' | 'business_type'> {
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
  test_point_id?: number;

  // 执行步骤
  preconditions?: string[];
  steps: Array<{
    step_number: number;
    action: string;
    expected: string;
  }>;
  expected_result?: string[];
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

// 分页配置
export interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
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