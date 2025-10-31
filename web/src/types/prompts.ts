/**
 * Type definitions for prompt management system.
 *
 * This module uses dynamic configuration from the backend instead of
 * hardcoded enums, establishing database-driven architecture.
 */

// Import configuration service for dynamic types
import { configService, type BusinessTypeItem, type ConfigurationItem } from '../services/configService';

// Union types for type hints (these are dynamically validated)
export type PromptType = 'system' | 'template' | 'business_description' | 'shared_content' | 'requirements';
export type PromptStatus = 'draft' | 'active' | 'archived' | 'deprecated';
export type BusinessType = string; // Business types are dynamic, validated at runtime

// Legacy constants for backward compatibility (deprecated)
export const PROMPT_TYPES = {
  SYSTEM: 'system',
  TEMPLATE: 'template',
  BUSINESS_DESCRIPTION: 'business_description',
  SHARED_CONTENT: 'shared_content',
  REQUIREMENTS: 'requirements'
} as const;

export const PROMPT_STATUSES = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DEPRECATED: 'deprecated'
} as const;

// Base interfaces
export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}

// Category interfaces
export interface PromptCategory extends BaseEntity {
  name: string;
  description?: string;
  parent_id?: number;
  order: number;
}

export interface PromptCategoryCreate {
  name: string;
  description?: string;
  parent_id?: number;
  order?: number;
}

export interface PromptCategoryUpdate {
  name?: string;
  description?: string;
  parent_id?: number;
  order?: number;
}

// Prompt interfaces
export interface Prompt extends BaseEntity {
  name: string;
  content: string;
  type: PromptType;
  business_type?: BusinessType;
  status: PromptStatus;
  author?: string;
  version: string;
  tags?: string[];
  variables?: string[];
  extra_metadata?: Record<string, any>;
  category_id?: number;
  file_path?: string;
  category?: PromptCategory;
}

export interface PromptSummary {
  id: number;
  name: string;
  type: PromptType;
  business_type?: BusinessType;
  status: PromptStatus;
  author?: string;
  version: string;
  created_at: string;
  updated_at: string;
  category?: PromptCategory;
}

export interface PromptCreate {
  name: string;
  content: string;
  type: PromptType;
  business_type?: BusinessType;
  status?: PromptStatus;
  author?: string;
  version?: string;
  tags?: string[];
  variables?: string[];
  extra_metadata?: Record<string, any>;
  category_id?: number;
  file_path?: string;
}

export interface PromptUpdate {
  name?: string;
  content?: string;
  type?: PromptType;
  business_type?: BusinessType;
  status?: PromptStatus;
  author?: string;
  version?: string;
  tags?: string[];
  variables?: string[];
  extra_metadata?: Record<string, any>;
  category_id?: number;
}

// Template interfaces
export interface PromptTemplate extends BaseEntity {
  name: string;
  template_content: string;
  description?: string;
  variables?: string[];
}

export interface PromptTemplateCreate {
  name: string;
  template_content: string;
  description?: string;
  variables?: string[];
}

export interface PromptTemplateUpdate {
  name?: string;
  template_content?: string;
  description?: string;
  variables?: string[];
}

// Search and filtering interfaces
export interface PromptSearchRequest {
  query?: string;
  type?: PromptType;
  business_type?: BusinessType;
  status?: PromptStatus;
  category_id?: number;
  tags?: string[];
  author?: string;
  page?: number;
  size?: number;
}

export interface PromptPreviewRequest {
  content: string;
  variables?: Record<string, string>;
}

export interface PromptPreviewResponse {
  rendered_content: string;
  detected_variables: string[];
}

export interface PromptValidationResponse {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Pagination interfaces
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface PromptListResponse extends PaginatedResponse<PromptSummary> {}

// Statistics interfaces
export interface PromptStatistics {
  total_prompts: number;
  active_prompts: number;
  draft_prompts: number;
  archived_prompts: number;
  prompts_by_type: Record<string, number>;
  prompts_by_business_type: Record<string, number>;
  recent_activity: PromptSummary[];
}

// UI State interfaces
export interface PromptListState {
  prompts: PromptSummary[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    size: number;
    total: number;
    pages: number;
  };
  filters: {
    search?: string;
    type?: PromptType;
    business_type?: BusinessType;
    status?: PromptStatus;
    category_id?: number;
  };
}

export interface PromptEditorState {
  prompt: Prompt | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  content: string;
  preview: string;
  variables: string[];
  isPreviewMode: boolean;
}

// Dynamic configuration functions
// These functions provide access to database-driven configuration

/**
 * Get display name for a business type
 * @param businessType - The business type value
 * @returns Display name for the business type
 */
export function getBusinessTypeName(businessType: BusinessType): string {
  return configService.getBusinessTypeName(businessType);
}

/**
 * Get display name for a prompt type
 * @param promptType - The prompt type value
 * @returns Display name for the prompt type
 */
export function getPromptTypeName(promptType: PromptType): string {
  return configService.getPromptTypeName(promptType);
}

/**
 * Get display name for a prompt status
 * @param promptStatus - The prompt status value
 * @returns Display name for the prompt status
 */
export function getPromptStatusName(promptStatus: PromptStatus): string {
  return configService.getPromptStatusName(promptStatus);
}

/**
 * Get description for a business type
 * @param businessType - The business type value
 * @returns Description for the business type
 */
export function getBusinessTypeDescription(businessType: BusinessType): string {
  return configService.getBusinessTypeDescription(businessType);
}

/**
 * Get description for a prompt type
 * @param promptType - The prompt type value
 * @returns Description for the prompt type
 */
export function getPromptTypeDescription(promptType: PromptType): string {
  return configService.getPromptTypeDescription(promptType);
}

/**
 * Get description for a prompt status
 * @param promptStatus - The prompt status value
 * @returns Description for the prompt status
 */
export function getPromptStatusDescription(promptStatus: PromptStatus): string {
  return configService.getPromptStatusDescription(promptStatus);
}

/**
 * Get business type options for UI components
 * @returns Promise resolving to array of business type options
 */
export async function getBusinessTypeOptions(): Promise<Array<{value: string; label: string; description?: string}>> {
  return configService.getBusinessTypeOptions();
}

/**
 * Get prompt type options for UI components
 * @returns Promise resolving to array of prompt type options
 */
export async function getPromptTypeOptions(): Promise<Array<{value: string; label: string; description?: string}>> {
  return configService.getPromptTypeOptions();
}

/**
 * Get prompt status options for UI components
 * @returns Promise resolving to array of prompt status options
 */
export async function getPromptStatusOptions(): Promise<Array<{value: string; label: string; description?: string}>> {
  return configService.getPromptStatusOptions();
}

// Legacy mapping objects for backward compatibility (deprecated)
// Use the dynamic functions above instead
export const BUSINESS_TYPE_NAMES: Record<string, string> = {};
export const PROMPT_TYPE_NAMES: Record<string, string> = {};
export const PROMPT_STATUS_NAMES: Record<string, string> = {};