/**
 * Business type management service.
 */

import apiClient from './api';

// Types for business management

export interface Prompt {
  id: number;
  name: string;
  content: string;
  type: string;
  business_type?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromptsResponse {
  prompts: Prompt[];
  total: number;
}
export interface BusinessType {
  id: number;
  code: string;
  name: string;
  description?: string;
  project_id: number;
  is_active: boolean;
  prompt_combination_id?: number;
  created_at: string;
  updated_at: string;
  project_name?: string;
  prompt_combination_name?: string;
  has_valid_prompt_combination: boolean;
}

export interface BusinessTypeCreate {
  code: string;
  name: string;
  description?: string;
  project_id: number;
}

export interface BusinessTypeUpdate {
  name?: string;
  description?: string;
  project_id?: number;
  is_active?: boolean;
  prompt_combination_id?: number;
}

export interface BusinessTypeActivationRequest {
  is_active: boolean;
  validation_notes?: string;
}

export interface BusinessTypeListResponse {
  items: BusinessType[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface BusinessTypeStats {
  total_business_types: number;
  active_business_types: number;
  inactive_business_types: number;
  business_types_with_prompt_combinations: number;
  business_types_without_prompt_combinations: number;
  by_project: Array<{
    project_id: number;
    project_name: string;
    count: number;
  }>;
}

// Prompt Combination Types
export interface PromptCombinationItem {
  id: number;
  combination_id: number;
  prompt_id: number;
  order: number;
  variable_name?: string;
  is_required: boolean;
  created_at: string;
  prompt_name?: string;
  prompt_type?: string;
  prompt_content?: string;
}

export interface PromptCombination {
  id: number;
  name: string;
  description?: string;
  business_type?: string;
  is_active: boolean;
  is_valid: boolean;
  validation_errors?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  project_id: number;
  project_name?: string;
  items: PromptCombinationItem[];
}

export interface PromptCombinationCreate {
  name: string;
  description?: string;
  project_id?: number;
  business_type?: string;
  prompt_ids: number[];
}

export interface PromptCombinationUpdate {
  name?: string;
  description?: string;
  business_type?: string;
  is_active?: boolean;
  items?: Array<{
    prompt_id?: number;
    order?: number;
    variable_name?: string;
    is_required?: boolean;
  }>;
}

export interface PromptCombinationListResponse {
  items: PromptCombination[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface PromptCombinationPreviewRequest {
  prompt_ids: number[];
  business_type?: string;
  project_id?: number;
  variables?: Record<string, any>;
}

export interface PromptCombinationPreviewResponse {
  combined_prompt: string;
  is_valid: boolean;
  validation_errors: string[];
  used_prompts: Array<{
    id: number;
    name: string;
    type: string;
    order: number;
    variable_name?: string;
    is_required: boolean;
  }>;
  variables: string[];
  message: string;
}

class BusinessService {
  // Business Type Management

  async getBusinessTypes(params?: {
    project_id?: number;
    is_active?: boolean;
    page?: number;
    size?: number;
    search?: string;
  }): Promise<BusinessTypeListResponse> {
    // Build query parameters
    const queryParams = new URLSearchParams();

    if (params?.project_id !== undefined) {
      queryParams.append('project_id', params.project_id.toString());
    }
    if (params?.is_active !== undefined) {
      queryParams.append('is_active', params.is_active.toString());
    }
    if (params?.page !== undefined) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.size !== undefined) {
      queryParams.append('size', params.size.toString());
    }
    if (params?.search) {
      queryParams.append('search', params.search);
    }

    // Use the real API endpoint
    const url = `/api/v1/business/business-types${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiClient.get(url);

    // The API already returns the correct format with all fields needed
    const apiData = response.data;

    return {
      items: apiData.items || [],
      total: apiData.total || 0,
      page: apiData.page || 1,
      size: apiData.size || 20,
      pages: apiData.pages || 0
    };
  }

  async getBusinessType(id: number): Promise<BusinessType> {
    const response = await apiClient.get(`/api/v1/business/business-types/${id}`);
    return response.data;
  }

  async createBusinessType(data: BusinessTypeCreate): Promise<BusinessType> {
    const response = await apiClient.post('/api/v1/business/business-types', data);
    return response.data;
  }

  async updateBusinessType(id: number, data: BusinessTypeUpdate): Promise<BusinessType> {
    const response = await apiClient.put(`/api/v1/business/business-types/${id}`, data);
    return response.data;
  }

  async deleteBusinessType(id: number): Promise<void> {
    await apiClient.delete(`/api/v1/business/business-types/${id}`);
  }

  async activateBusinessType(id: number, data: BusinessTypeActivationRequest): Promise<BusinessType> {
    const response = await apiClient.put(`/api/v1/business/business-types/${id}/activate`, data);
    return response.data;
  }

  async getBusinessTypeStats(): Promise<BusinessTypeStats> {
    const response = await apiClient.get('/api/v1/business/business-types/stats/overview');
    return response.data;
  }

  // Prompt Combination Management

  async getPromptCombinations(params?: {
    project_id?: number;
    business_type?: string;
    page?: number;
    size?: number;
  }): Promise<PromptCombinationListResponse> {
    const queryParams = new URLSearchParams();

    if (params?.project_id !== undefined) {
      queryParams.append('project_id', params.project_id.toString());
    }
    if (params?.business_type) {
      queryParams.append('business_type', params.business_type);
    }
    if (params?.page !== undefined) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.size !== undefined) {
      queryParams.append('size', params.size.toString());
    }

    const url = `/api/v1/business/prompt-combinations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  }

  async getPromptCombination(id: number): Promise<PromptCombination> {
    const response = await apiClient.get(`/api/v1/business/prompt-combinations/${id}`);
    return response.data;
  }

  async createPromptCombination(data: PromptCombinationCreate): Promise<PromptCombination> {
    const response = await apiClient.post('/api/v1/business/prompt-combinations', data);
    return response.data;
  }

  async updatePromptCombination(id: number, data: PromptCombinationUpdate): Promise<PromptCombination> {
    const response = await apiClient.put(`/api/v1/business/prompt-combinations/${id}`, data);
    return response.data;
  }

  async deletePromptCombination(id: number): Promise<void> {
    await apiClient.delete(`/api/v1/business/prompt-combinations/${id}`);
  }

  async previewPromptCombination(data: PromptCombinationPreviewRequest): Promise<PromptCombinationPreviewResponse> {
    const response = await apiClient.post('/api/v1/business/prompt-combinations/preview', data);
    return response.data;
  }

  async getAvailablePrompts(): Promise<PromptsResponse> {
    const response = await apiClient.get('/api/v1/business/available-prompts');
    return {
      prompts: response.data,
      total: response.data.length
    };
  }
}

export const businessService = new BusinessService();