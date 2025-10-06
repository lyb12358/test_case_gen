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

export interface TestCase {
  id: number;
  business_type: string;
  test_cases: Array<{
    id?: string;
    name?: string;
    module?: string;
    preconditions?: string | string[];
    remarks?: string;
    steps?: string[];
    expected_result?: string | string[];
    functional_module?: string;
    functional_domain?: string;
  }>;
  created_at: string;
  updated_at?: string;
}

export interface TestCaseResponse {
  id: number;
  business_type: string;
  test_cases?: Array<{
    id?: string;
    name?: string;
    module?: string;
    preconditions?: string | string[];
    remarks?: string;
    steps?: string[];
    expected_result?: string | string[];
    functional_module?: string;
    functional_domain?: string;
  }>;
  created_at: string;
  updated_at?: string;
}

export interface TestCasesListResponse {
  business_type?: string;
  count: number;
  test_cases: TestCaseResponse[];
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

export interface BusinessType {
  value: string;
  label: string;
  description?: string;
}

export const BUSINESS_TYPES: BusinessType[] = [
  { value: 'RCC', label: 'RCC - 远程净化', description: 'Remote Climate Control' },
  { value: 'RFD', label: 'RFD - 香氛控制', description: 'Remote Fragrance Control' },
  { value: 'ZAB', label: 'ZAB - 远程恒温座舱设置', description: 'Remote Cabin Temperature Setting' },
  { value: 'ZBA', label: 'ZBA - 水淹报警', description: 'Water Flooding Alarm' }
];

export const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

export type JobStatusType = typeof JOB_STATUS[keyof typeof JOB_STATUS];