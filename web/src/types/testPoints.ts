/**
 * Type definitions for test point management system.
 */

import type { BusinessType } from './index';

// Basic Test Point interfaces
export interface TestPoint {
  id: number;
  test_point_id: string;
  title: string;
  description?: string;
  business_type: string;
  priority: 'high' | 'medium' | 'low';
  project_id: number;
  created_at: string;
  updated_at: string;
  test_case_count?: number;
  last_test_case_date?: string;
  llm_metadata?: any;
  generation_job_id?: string;
}

export interface BatchTestPointOperation {
  test_point_ids: number[];
  operation: string;
  parameters?: any;
}

export interface BatchTestPointOperationResponse {
  success_count: number;
  failed_count: number;
  errors: string[];
}

// Status fields removed - test points no longer have status

export const PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const;

// Union types for type hints
export type Priority = typeof PRIORITIES[keyof typeof PRIORITIES];
// BusinessType moved to types/index.ts to avoid duplication
// Import BusinessType from types/index.ts instead

// Base interfaces
export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}

// Compatibility interfaces
export interface TestPointCreate {
  title: string;
  description?: string;
  business_type: BusinessType;
  project_id: number;
  priority: Priority;
  test_point_id?: string;
  llm_metadata?: any;
  generation_job_id?: string;
}

export interface TestPointUpdate {
  title?: string;
  description?: string;
  priority?: Priority;
  expected_results?: string[];
}

// Response types
export interface TestPointListResponse {
  items: TestPoint[];
  total: number;
  page: number;
  size: number;
  pages: number;
}


export function getPriorityName(priority: Priority): string {
  const priorityNames = {
    high: '高',
    medium: '中',
    low: '低'
  };
  return priorityNames[priority] || priority;
}

export function getPriorityOptions() {
  return Object.entries(PRIORITIES).map(([value, label]) => ({
    value,
    label: getPriorityName(value as Priority)
  }));
}

// ===== Name Synchronization Types =====

export interface NameSyncRequest {
  testPointId: number;
  sync_mode?: 'auto' | 'manual' | 'preview';
  name_pattern?: string;
  dry_run?: boolean;
  include_existing?: boolean;
}

export interface BatchNameSyncRequest extends NameSyncRequest {
  test_point_ids: number[];
  business_type?: string;
  project_id?: number;
}

export interface NameSyncResult {
  success: boolean;
  message: string;
  synced_count: number;
  failed_count: number;
  changes: NameChange[];
  warnings: string[];
  preview_only?: boolean;
}

export interface NameChange {
  test_point_id: number;
  test_case_id: number;
  old_name: string;
  new_name: string;
  change_type: 'created' | 'updated' | 'deleted' | 'no_change';
  reason?: string;
}

export interface NameSyncPreview {
  test_point_id: number;
  test_point_title: string;
  proposed_changes: NameChange[];
  total_changes: number;
  estimated_time: number;
}

export interface NameValidationRequest {
  title?: string;
  test_point_id?: string;
  business_type?: string;
  project_id?: number;
  exclude_id?: number;
}

export interface NameValidationResponse {
  is_valid: boolean;
  conflicts: NameConflict[];
  suggestions: string[];
  validation_details: {
    title_conflicts: boolean;
    id_conflicts: boolean;
    similar_names: boolean;
  };
}

export interface NameConflict {
  field: 'title' | 'test_point_id';
  existing_id: number;
  existing_value: string;
  conflict_type: 'exact' | 'similar' | 'pattern_match';
  severity: 'error' | 'warning' | 'info';
  message: string;
}

// ===== Missing Test Point Types (Added for completeness) =====

export interface TestPointSummary {
  id: number;
  test_point_id: string;
  title: string;
  description?: string;
  business_type: string;
  priority: Priority;
  project_id: number;
  created_at: string;
  updated_at: string;
  test_case_count?: number;
  last_test_case_date?: string;
  generation_job_id?: string;
}

export interface TestPointSearchRequest {
  query?: string;
  business_type?: BusinessType;
  priority?: Priority;
  project_id?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface TestPointValidationResponse {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  validation_details: {
    title_valid: boolean;
    id_valid: boolean;
    business_type_valid: boolean;
    description_valid: boolean;
  };
}

export interface TestPointStatistics {
  total_test_points: number;
  draft_test_points: number; // Always 0 - status removed
  approved_test_points: number; // Always 0 - status removed
  modified_test_points: number; // Always 0 - status removed
  completed_test_points: number; // Always 0 - status removed
  test_points_by_business_type: Record<string, number>;
  test_points_by_priority: Record<string, number>;
  test_points_by_status: Record<string, number>; // Empty object - status removed
  recent_activity: TestPointSummary[];
  most_recent: TestPointSummary[];
}

// TestPointStatusUpdate removed - status fields no longer supported

export interface TestPointGenerationRequest {
  business_type: BusinessType;
  additional_context?: any;
  save_to_database?: boolean;
  project_id?: number;
}

export interface TestPointGenerationResponse {
  task_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message: string;
  estimated_time?: number;
  progress?: number;
}

export interface TestCaseFromTestPointRequest {
  test_point_id: number;
  generation_options?: {
    include_preconditions?: boolean;
    include_expected_results?: boolean;
    complexity_level?: 'basic' | 'standard' | 'comprehensive';
  };
}

export interface TestCaseFromTestPointResponse {
  success: boolean;
  test_case?: any;
  message: string;
  generation_metadata?: any;
}