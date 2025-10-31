/**
 * API service for prompt management.
 */

import axios from 'axios';
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
  BusinessType
} from '../types/prompts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Category API
export const categoryService = {
  // Get all categories
  getCategories: async (): Promise<PromptCategory[]> => {
    const response = await api.get('/prompts/categories');
    return response.data;
  },

  // Create category
  createCategory: async (category: PromptCategoryCreate): Promise<PromptCategory> => {
    const response = await api.post('/prompts/categories', category);
    return response.data;
  },

  // Update category
  updateCategory: async (id: number, category: PromptCategoryUpdate): Promise<PromptCategory> => {
    const response = await api.put(`/prompts/categories/${id}`, category);
    return response.data;
  },

  // Delete category
  deleteCategory: async (id: number): Promise<void> => {
    await api.delete(`/prompts/categories/${id}`);
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
    category_id?: number;
    search?: string;
  }): Promise<PromptListResponse> => {
    const response = await api.get('/prompts/', { params });
    return response.data;
  },

  // Get specific prompt
  getPrompt: async (id: number): Promise<Prompt> => {
    const response = await api.get(`/prompts/${id}`);
    return response.data;
  },

  // Create prompt
  createPrompt: async (prompt: PromptCreate): Promise<Prompt> => {
    const response = await api.post('/prompts/', prompt);
    return response.data;
  },

  // Update prompt
  updatePrompt: async (id: number, prompt: PromptUpdate): Promise<Prompt> => {
    const response = await api.put(`/prompts/${id}`, prompt);
    return response.data;
  },

  // Delete prompt
  deletePrompt: async (id: number): Promise<void> => {
    await api.delete(`/prompts/${id}`);
  },

  // Clone prompt
  clonePrompt: async (id: number): Promise<Prompt> => {
    const response = await api.post(`/prompts/${id}/clone`);
    return response.data;
  },
};

// Search API
export const searchService = {
  // Advanced search
  searchPrompts: async (searchRequest: PromptSearchRequest): Promise<PromptListResponse> => {
    const response = await api.post('/prompts/search', searchRequest);
    return response.data;
  },

  // Preview prompt
  previewPrompt: async (request: PromptPreviewRequest): Promise<PromptPreviewResponse> => {
    const response = await api.post('/prompts/preview', request);
    return response.data;
  },

  // Validate prompt
  validatePrompt: async (id: number): Promise<PromptValidationResponse> => {
    const response = await api.post(`/prompts/${id}/validate`);
    return response.data;
  },
};

// Build API
export const buildService = {
  // Build prompt for business type
  buildPromptForBusiness: async (businessType: string): Promise<{ content: string; business_type: string }> => {
    const response = await api.get(`/prompts/build/${businessType}`);
    return response.data;
  },
};

// Statistics API
export const statsService = {
  // Get overview statistics
  getOverviewStats: async (): Promise<PromptStatistics> => {
    const response = await api.get('/prompts/stats/overview');
    return response.data;
  },
};

// Template API
export const templateService = {
  // Get all templates
  getTemplates: async (): Promise<PromptTemplate[]> => {
    const response = await api.get('/prompts/templates');
    return response.data;
  },

  // Create template
  createTemplate: async (template: PromptTemplateCreate): Promise<PromptTemplate> => {
    const response = await api.post('/prompts/templates', template);
    return response.data;
  },

  // Delete template
  deleteTemplate: async (id: number): Promise<void> => {
    await api.delete(`/prompts/templates/${id}`);
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
      case 'requirements':
        return 'cyan';
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

    // Check for unmatched template variables
    const openBraces = (content.match(/\{\{/g) || []).length;
    const closeBraces = (content.match(/\}\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('模板变量括号不匹配');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};