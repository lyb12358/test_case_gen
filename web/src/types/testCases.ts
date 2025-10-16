/**
 * Type definitions for TSP Test Case Generator API
 */

export interface GenerateTestCaseRequest {
  business_type: string; // RCC, RFD, ZAB, ZBA
}

export interface GenerateResponse {
  task_id: string;
  status: string;
  message: string;
}

export interface TaskStatusResponse {
  task_id: string;
  id?: string;
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

export interface TestCaseItem {
  id: number;
  group_id: number;
  test_case_id: string;
  name: string;
  description?: string;
  module?: string;
  functional_module?: string;
  functional_domain?: string;
  preconditions: string[];
  steps: string[];
  expected_result: string[];
  remarks?: string;
  entity_order?: number;
  created_at: string;
}

export interface TestCase {
  id: number;
  business_type: string;
  created_at: string;
}

export interface TestCaseGroup {
  id: number;
  business_type: string;
  generation_metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
  test_case_items: TestCaseItem[];
}

export interface TestCasesListResponse {
  business_type?: string;
  count: number;
  test_case_groups: TestCaseGroup[];
}

export interface Task extends TaskStatusResponse {
  id: string;
  business_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at?: string;
}

export interface BusinessTypeResponse {
  business_types: string[];
}

export interface BusinessTypeMappingResponse {
  business_types: Record<string, {
    name: string;
    description: string;
  }>;
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


export const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

export type JobStatusType = typeof JOB_STATUS[keyof typeof JOB_STATUS];