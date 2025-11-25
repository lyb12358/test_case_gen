/**
 * Type definitions for TSP Test Case Generator API
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

export interface TestCase {
  id: number;
  case_id: string;
  title: string;
  description: string;
  business_type: string;
  status: string;
  created_at: string;
  updated_at: string;
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
  task_type?: string;
  error?: string;
  error_details?: string;
  message?: string;
  result_summary?: string;
  test_case_id?: number;
  created_at?: string;
  updated_at?: string;
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

export interface TaskListResponse {
  tasks: Array<{
    task_id: string;
    status: string;
    progress?: number;
    business_type?: string;
    error?: string;
    created_at?: string;
  }>;
}

// Job status constants moved to types/index.ts to avoid duplication
// Import JobStatus and JobStatusType from types/index.ts instead