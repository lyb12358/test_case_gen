/**
 * Legacy type definitions for TSP Test Case Generator API
 * @deprecated Use UnifiedTestCase types from unifiedTestCase.ts instead
 */

// Basic interfaces
export interface GenerateTestCaseRequest {
  business_type: string;
  additional_context?: any;
}

export interface GenerateResponse {
  task_id: string;
  status: string;
  message: string;
}

export interface TestCaseItem {
  id: number;
  case_id: string;
  title: string;
  description: string;
  business_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}


export interface TaskStatusResponse {
  task_id: string;
  status: string;
  progress?: number;
  current_step?: string;
  total_steps?: number;
  message?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  result?: any;
  error?: any;
}

// WebSocket消息类型定义
export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
  task_id?: string;
}

export interface TaskUpdateData {
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  current_step?: string;
  total_steps?: number;
  current_step_index?: number;
  message?: string;
  stage?: string;
  generated_count?: number;
  result?: any;
  error?: any;
  created_at?: string;
  updated_at?: string;
  llm_info?: {
    model?: string;
    estimated_tokens?: number;
    tokens_used?: number;
    response_time?: number;
    response_length?: number;
    status?: string;
    attempt?: number;
    max_attempts?: number;
    error?: string;
  };
  validation_errors?: any[];

  // 测试点和测试用例统计字段
  total_test_points?: number;
  generated_test_points?: number;
  total_test_cases?: number;
  generated_test_cases?: number;
}

// BusinessType moved to types/index.ts to avoid duplication
// Import BusinessType from types/index.ts instead

// Additional compatibility types that may not be in the API yet
export interface Task {
  id: string;
  task_id: string;
  status: string;
  progress?: number;
  business_type?: string;
  generation_mode?: string;      // 生成模式：test_points_only/test_cases_only
  task_type_display?: string;      // 任务类型显示文本
  task_type?: string;
  error?: string;
  error_details?: string;
  message?: string;
  result_summary?: string;
  test_case_id?: number;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;           // 任务完成时间
}

export interface TestCasesListResponse {
  test_points: any[];
  total: number;
  page: number;
  size: number;
}

export interface BusinessTypeResponse {
  business_types: string[];
  total: number;
}

export interface BusinessTypeMappingResponse {
  business_types: {
    [key: string]: {
      name: string;
      description: string;
    };
  };
}

export interface CreateTestCaseData {
  name: string;
  description: string;
  business_type: string;
  project_id: number;
  case_id?: string;
  module?: string;
  functional_module?: string;
  functional_domain?: string;
  priority: 'high' | 'medium' | 'low';
  test_point_id?: number;
  preconditions?: string[];
  steps?: Array<{step: number, action: string, expected: string}>;
  expected_result?: string[];
}

export interface UpdateTestCaseData {
  name?: string;
  description?: string;
  business_type?: string;
  module?: string;
  functional_module?: string;
  functional_domain?: string;
  priority?: 'high' | 'medium' | 'low';
  test_point_id?: number;
  preconditions?: string[];
  steps?: Array<{step: number, action: string, expected: string}>;
  expected_result?: string[];
}

export interface TaskListResponse {
  tasks: Array<{
    task_id: string;
    status: string;
    progress?: number;
    business_type?: string;
    generation_mode?: string;      // 生成模式：test_points_only/test_cases_only
    task_type_display?: string;      // 任务类型显示文本
    error?: string;
    created_at?: string;
    completed_at?: string;           // 任务完成时间
  }>;
}

// Job status constants moved to types/index.ts to avoid duplication
// Import JobStatus and JobStatusType from types/index.ts instead