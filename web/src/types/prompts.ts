/**
 * Type definitions for prompt management system.
 */

import type { BusinessType } from './index';

// Basic interfaces
export interface Prompt {
  id: number;
  name: string;
  content: string;
  type: string;
  business_type?: string;
  status: string;
  project_id: number;
  created_at: string;
  updated_at: string;
}

export interface PromptCategory {
  id: number;
  name: string;
  description?: string;
  parent_id?: number;
  created_at: string;
  updated_at: string;
}

export interface PromptVersion {
  id: number;
  prompt_id: number;
  version: string;
  content: string;
  change_summary?: string;
  created_at: string;
}

export interface PromptTemplate {
  id: number;
  name: string;
  template: string;
  variables?: string;
  created_at: string;
  updated_at: string;
}

// Import config service for dynamic business type names
import { configService } from '../services/configService';

// Compatibility types
export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}

// Legacy constants for backward compatibility
export const PROMPT_TYPES = {
  SYSTEM: 'system',
  TEMPLATE: 'template',
  BUSINESS_DESCRIPTION: 'business_description',
  SHARED_CONTENT: 'shared_content'
} as const;

export const PROMPT_STATUSES = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DEPRECATED: 'deprecated'
} as const;

export const GENERATION_STAGES = {
  TEST_POINT: 'test_point',
  TEST_CASE: 'test_case',
  GENERAL: 'general'
} as const;

// Union types for type hints
export type PromptType = typeof PROMPT_TYPES[keyof typeof PROMPT_TYPES];
export type PromptStatus = typeof PROMPT_STATUSES[keyof typeof PROMPT_STATUSES];
export type GenerationStage = typeof GENERATION_STAGES[keyof typeof GENERATION_STAGES];
// BusinessType moved to types/index.ts to avoid duplication
// Import BusinessType from types/index.ts instead

// Additional compatibility interfaces
export interface PromptCategoryCreate {
  name: string;
  description?: string;
  parent_id?: number;
  order?: number;
}

export interface PromptCreate {
  name: string;
  content: string;
  type: PromptType;
  business_type?: BusinessType;
  category_id?: number;
  status?: PromptStatus;
  generation_stage?: GenerationStage;
  description?: string;
}

export interface PromptUpdate {
  name?: string;
  content?: string;
  type?: PromptType;
  business_type?: BusinessType;
  category_id?: number;
  status?: PromptStatus;
  generation_stage?: GenerationStage;
  description?: string;
}

// Response types
export interface PromptListResponse {
  prompts: Prompt[];
  total: number;
  page: number;
  size: number;
}

export interface PromptCategoryListResponse {
  categories: PromptCategory[];
  total: number;
}

// 兼容性函数（用于向后兼容）
export function getPromptTypeName(type: PromptType): string {
  const typeNames = {
    system: '系统提示词',
    template: '模板提示词',
    business_description: '业务描述',
    shared_content: '共享内容'
  };
  return typeNames[type] || type;
}

export function getPromptStatusName(status: PromptStatus): string {
  const statusNames = {
    draft: '草稿',
    active: '活跃',
    archived: '已归档',
    deprecated: '已废弃'
  };
  return statusNames[status] || status;
}

export function getGenerationStageName(stage: GenerationStage): string {
  const stageNames = {
    test_point: '测试点',
    test_case: '测试用例',
    general: '通用'
  };
  return stageNames[stage] || stage;
}

export async function getBusinessTypeName(businessType: BusinessType): Promise<string> {
  try {
    // Use dynamic configuration service
    return await configService.getBusinessTypeName(businessType);
  } catch (error) {
    console.warn('Failed to get business type name from API, falling back to basic mapping:', error);
    // Fallback to basic mapping for offline/error scenarios
    const fallbackMap: Record<string, string> = {
      'RCC': '远程净化',
      'RFD': '香氛控制',
      'ZAB': '远程恒温座舱设置'
    };
    return fallbackMap[businessType] || businessType;
  }
}

// Synchronous version for backward compatibility (uses cached data)
export function getBusinessTypeNameSync(businessType: BusinessType): string {
  return configService.getBusinessTypeName(businessType);
}

export async function getPromptTypeOptions() {
  try {
    return await configService.getPromptTypeOptions();
  } catch (error) {
    console.warn('Failed to get prompt type options from API, falling back to constants:', error);
    return Object.entries(PROMPT_TYPES).map(([value, label]) => ({
      value,
      label
    }));
  }
}

export async function getPromptStatusOptions() {
  try {
    return await configService.getPromptStatusOptions();
  } catch (error) {
    console.warn('Failed to get prompt status options from API, falling back to constants:', error);
    return Object.entries(PROMPT_STATUSES).map(([value, label]) => ({
      value,
      label
    }));
  }
}

export async function getGenerationStageOptions() {
  try {
    return await configService.getGenerationStageOptions();
  } catch (error) {
    console.warn('Failed to get generation stage options from API, falling back to constants:', error);
    return Object.entries(GENERATION_STAGES).map(([value, label]) => ({
      value,
      label
    }));
  }
}

// Synchronous versions for backward compatibility
export function getPromptTypeOptionsSync() {
  return Object.entries(PROMPT_TYPES).map(([value, label]) => ({
    value,
    label
  }));
}

export function getPromptStatusOptionsSync() {
  return Object.entries(PROMPT_STATUSES).map(([value, label]) => ({
    value,
    label
  }));
}

export function getGenerationStageOptionsSync() {
  return Object.entries(GENERATION_STAGES).map(([value, label]) => ({
    value,
    label
  }));
}

export function getBusinessTypeOptions(): Array<{ value: BusinessType; label: string }> {
  // 这里应该从API获取动态的业务类型列表
  // 现在使用生成的枚举中的类型
  const types: BusinessType[] = [
    'RCC', 'RFD', 'ZAB', 'ZBA', 'PAB', 'PAE', 'PAI', 'RCE', 'RES', 'RHL', 'RPP', 'RSM', 'RWS',
    'ZAD', 'ZAE', 'ZAF', 'ZAG', 'ZAH', 'ZAJ', 'ZAM', 'ZAN', 'ZAS', 'ZAV', 'ZAY', 'ZBB',
    'WEIXIU_RSM', 'VIVO_WATCH', 'RDL_RDU', 'RDO_RDC'
  ];

  return types.map(type => ({
    value: type,
    label: getBusinessTypeNameSync(type)
  }));
}

// Additional missing types for promptService.ts
export interface PromptSummary {
  id: number;
  name: string;
  type: PromptType;
  business_type?: BusinessType;
  status: PromptStatus;
  project_id: number;
  created_at: string;
  updated_at: string;
}

export interface PromptCategoryUpdate {
  name?: string;
  description?: string;
  parent_id?: number;
}

export interface PromptTemplateCreate {
  name: string;
  template: string;
  variables?: string;
}

export interface PromptTemplateUpdate {
  name?: string;
  template?: string;
  variables?: string;
}

export interface PromptSearchRequest {
  keyword?: string;
  type?: PromptType;
  business_type?: BusinessType;
  status?: PromptStatus;
  project_id?: number;
  page?: number;
  size?: number;
}

export interface PromptPreviewRequest {
  template: string;
  variables?: Record<string, any>;
  business_type?: BusinessType;
}

export interface PromptPreviewResponse {
  success: boolean;
  rendered_content?: string;
  error?: string;
  missing_variables?: string[];
}

export interface PromptValidationResponse {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
}

export interface PromptStatistics {
  total_prompts: number;
  prompts_by_type: Record<PromptType, number>;
  prompts_by_status: Record<PromptStatus, number>;
  prompts_by_business_type: Record<BusinessType, number>;
  recent_activity?: Array<{
    id: number;
    action: string;
    timestamp: string;
  }>;
}
