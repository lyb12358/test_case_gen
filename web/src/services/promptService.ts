/**
 * API service for prompt management.
 */

import apiClient from './api';
import { API_ENDPOINTS } from '@/config/constants';
import {
  Prompt,
  PromptSummary,
  PromptCreate,
  PromptUpdate,
  PromptCategory,
  PromptCategoryCreate,
  PromptCategoryUpdate,
  PromptTemplate,
  PromptTemplateCreate,
  PromptTemplateUpdate,
  PromptSearchRequest,
  PromptListResponse,
  PromptPreviewRequest,
  PromptPreviewResponse,
  PromptValidationResponse,
  PromptStatistics,
  PromptType,
  PromptStatus,
  GenerationStage,
  BusinessType
} from '../types/prompts';

// Category API
export const categoryService = {
  // Get all categories
  getCategories: async (): Promise<PromptCategory[]> => {
    const response = await apiClient.get(API_ENDPOINTS.PROMPTS.CATEGORIES);
    return response.data;
  },

  // Create category
  createCategory: async (category: PromptCategoryCreate): Promise<PromptCategory> => {
    const response = await apiClient.post(API_ENDPOINTS.PROMPTS.CATEGORIES, category);
    return response.data;
  },

  // Update category
  updateCategory: async (id: number, category: PromptCategoryUpdate): Promise<PromptCategory> => {
    const response = await apiClient.put(`${API_ENDPOINTS.PROMPTS.CATEGORIES}/${id}`, category);
    return response.data;
  },

  // Delete category
  deleteCategory: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.PROMPTS.CATEGORIES}/${id}`);
  },
};

// Prompt API
export const promptService = {
  // Get prompts with pagination and filtering
  getPrompts: async (params?: {
    page?: number;
    size?: number;
    type?: PromptType;
    business_type?: BusinessType;
    status?: PromptStatus;
    generation_stage?: string;
    category_id?: number;
    search?: string;
    project_id?: number;
  }): Promise<PromptListResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.PROMPTS.LIST + '/', { params });
    return response.data;
  },

  // Get specific prompt
  getPrompt: async (id: number): Promise<Prompt> => {
    const response = await apiClient.get(`${API_ENDPOINTS.PROMPTS.LIST}/${id}`);
    return response.data;
  },

  // Create prompt
  createPrompt: async (prompt: PromptCreate): Promise<Prompt> => {
    const response = await apiClient.post(API_ENDPOINTS.PROMPTS.LIST, prompt);
    return response.data;
  },

  // Update prompt
  updatePrompt: async (id: number, prompt: PromptUpdate): Promise<Prompt> => {
    const response = await apiClient.put(`${API_ENDPOINTS.PROMPTS.LIST}/${id}`, prompt);
    return response.data;
  },

  // Get delete preview for single prompt
  getDeletePreview: async (id: number): Promise<any> => {
    const response = await apiClient.get(`${API_ENDPOINTS.PROMPTS.LIST}/${id}/delete-preview`);
    return response.data;
  },

  // Get delete preview for batch prompts
  getBatchDeletePreview: async (ids: number[]): Promise<any> => {
    const response = await apiClient.post(API_ENDPOINTS.PROMPTS.LIST + '/batch-delete-preview', ids);
    return response.data;
  },

  // Delete prompt
  deletePrompt: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.PROMPTS.LIST}/${id}`);
  },

  // Clone prompt
  clonePrompt: async (id: number): Promise<Prompt> => {
    const response = await apiClient.post(`${API_ENDPOINTS.PROMPTS.LIST}/${id}/clone`);
    return response.data;
  },
};

// Search API
export const searchService = {
  // Advanced search
  searchPrompts: async (searchRequest: PromptSearchRequest): Promise<PromptListResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.PROMPTS.SEARCH, searchRequest);
    return response.data;
  },

  // Preview prompt
  previewPrompt: async (request: PromptPreviewRequest): Promise<PromptPreviewResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.PROMPTS.LIST + '/preview', request);
    return response.data;
  },

  // Validate prompt
  validatePrompt: async (id: number): Promise<PromptValidationResponse> => {
    const response = await apiClient.post(`${API_ENDPOINTS.PROMPTS.LIST}/${id}/validate`);
    return response.data;
  },
};

// Build API
export const buildService = {
  // Build prompt for business type
  buildPromptForBusiness: async (businessType: string): Promise<{ content: string; business_type: string }> => {
    const response = await apiClient.get(`${API_ENDPOINTS.PROMPTS.BUILD}/${businessType}`);
    return response.data;
  },
};

// Statistics API
export const statsService = {
  // Get overview statistics
  getOverviewStats: async (projectId?: number): Promise<PromptStatistics> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get(API_ENDPOINTS.PROMPTS.STATS, { params });
    return response.data;
  },
};

// Template API
export const templateService = {
  // Get all templates
  getTemplates: async (): Promise<PromptTemplate[]> => {
    const response = await apiClient.get(API_ENDPOINTS.PROMPTS.TEMPLATES);
    return response.data;
  },

  // Create template
  createTemplate: async (template: PromptTemplateCreate): Promise<PromptTemplate> => {
    const response = await apiClient.post(API_ENDPOINTS.PROMPTS.TEMPLATES, template);
    return response.data;
  },

  // Delete template
  deleteTemplate: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.PROMPTS.TEMPLATES}/${id}`);
  },
};

// Export services
export default {
  category: categoryService,
  prompt: promptService,
  search: searchService,
  build: buildService,
  stats: statsService,
  template: templateService,
};

// Utility functions
export const promptUtils = {
  // Format date
  formatDate: (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  },

  // Get status color
  getStatusColor: (status: PromptStatus): string => {
    switch (status) {
      case 'active':
        return 'green';
      case 'draft':
        return 'orange';
      case 'archived':
        return 'default';
      case 'deprecated':
        return 'red';
      default:
        return 'default';
    }
  },

  // Get type color
  getTypeColor: (type: PromptType): string => {
    switch (type) {
      case 'system':
        return 'blue';
      case 'template':
        return 'purple';
      case 'business_description':
        return 'green';
      case 'shared_content':
        return 'orange';
      default:
        return 'default';
    }
  },

  // Get generation stage color
  getGenerationStageColor: (generationStage: GenerationStage): string => {
    switch (generationStage) {
      case 'test_point':
        return 'blue';
      case 'test_case':
        return 'purple';
      case 'general':
        return 'green';
      default:
        return 'default';
    }
  },

  // Extract variables from content
  extractVariables: (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const variables = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    return variables;
  },

  // Replace variables in content
  replaceVariables: (content: string, variables: Record<string, string>): string => {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
  },

  // Generate unique name
  generateUniqueName: (baseName: string, existingNames: string[]): string => {
    if (!existingNames.includes(baseName)) {
      return baseName;
    }

    let counter = 1;
    let newName = `${baseName} (副本)`;
    while (existingNames.includes(newName)) {
      counter++;
      newName = `${baseName} (副本 ${counter})`;
    }
    return newName;
  },

  // Validate prompt content
  validateContent: (content: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!content.trim()) {
      errors.push('内容不能为空');
    }

    if (content.length < 10) {
      errors.push('内容过短');
    }

    if (content.length > 50000) {
      errors.push('内容过长');
    }

    // Check for unmatched template variables (improved logic)
    const validateTemplateVariables = (text: string): string[] => {
      const validationErrors: string[] = [];

      try {
        // Remove code blocks to avoid false positives
        const codeBlockPattern = /```[\s\S]*?```/g;
        const inlineCodePattern = /`[^`]*`/g;
        const jsonBlockPattern = /\{[^{}]*\}[^{}]*\{[^{}]*\}/g;

        const cleanText = text
          .replace(codeBlockPattern, '')
          .replace(inlineCodePattern, '');

        // Find all template variable patterns
        const templatePattern = /\{\{([^}]+)\}\}/g;
        const incompletePattern = /\{\{([^}]*)$/gm;

        const matches = [...cleanText.matchAll(templatePattern)];
        const incompleteMatches = [...cleanText.matchAll(incompletePattern)];

        // Check for incomplete template variables ({{ without closing }})
        if (incompleteMatches.length > 0) {
          validationErrors.push('发现未闭合的模板变量');
        }

        // Check for variables with only whitespace
        const emptyVariables = matches.filter(match =>
          match[1] && match[1].trim() === ''
        );
        if (emptyVariables.length > 0) {
          validationErrors.push('模板变量不能为空');
        }

        // Additional validation: check for common template variable patterns
        const invalidPatterns = [
          /\{\{\s*\}/,  // {{}}
          /\{\{[^}]*\{\{/, // {{nested {{
        ];

        for (const pattern of invalidPatterns) {
          if (pattern.test(cleanText)) {
            validationErrors.push('模板变量格式不正确');
            break;
          }
        }
      } catch (error) {
        console.warn('Template variable validation error:', error);
        // Don't fail completely if validation has an error
      }

      return validationErrors;
    };

    const templateValidationErrors = validateTemplateVariables(content);
    errors.push(...templateValidationErrors);

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};