/**
 * Configuration API Service
 *
 * Provides centralized access to dynamic configuration data including
 * business types, prompt types, and prompt statuses from the backend API.
 * This eliminates hardcoded enums and establishes database-driven architecture.
 */

import apiClient from './api';

// Configuration item interfaces
export interface ConfigurationItem {
  value: string;
  name: string;
  description: string;
}

export interface BusinessTypeItem extends ConfigurationItem {
  category?: string;
}

// API Response interfaces
export interface ConfigurationResponse {
  items: Record<string, ConfigurationItem>;
  total: number;
}

export interface AllConfigurationResponse {
  business_types: Record<string, BusinessTypeItem>;
  prompt_types: Record<string, ConfigurationItem>;
  prompt_statuses: Record<string, ConfigurationItem>;
}

export interface ValidationResult {
  valid: boolean;
  value: string;
}

class ConfigurationService {
  private cache: {
    businessTypes?: Record<string, BusinessTypeItem>;
    promptTypes?: Record<string, ConfigurationItem>;
    promptStatuses?: Record<string, ConfigurationItem>;
    allConfig?: AllConfigurationResponse;
    lastFetch?: number;
  } = {};

  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return !!(this.cache.lastFetch &&
             Date.now() - this.cache.lastFetch < this.CACHE_DURATION);
  }

  /**
   * Clear all cached configuration data
   */
  clearCache(): void {
    this.cache = {};
  }

  /**
   * Get all business types with their metadata
   */
  async getBusinessTypes(refresh = false): Promise<Record<string, BusinessTypeItem>> {
    if (!refresh && this.cache.businessTypes && this.isCacheValid()) {
      return this.cache.businessTypes;
    }

    try {
      const response = await apiClient.get<Record<string, BusinessTypeItem>>(
        '/api/v1/config/business-types',
        { params: { refresh: refresh || false } }
      );

      this.cache.businessTypes = response.data;
      this.cache.lastFetch = Date.now();
      return response.data;
    } catch (error) {
      console.error('Failed to fetch business types:', error);
      throw error;
    }
  }

  /**
   * Get a specific business type by value
   */
  async getBusinessType(businessType: string): Promise<BusinessTypeItem> {
    try {
      const response = await apiClient.get<BusinessTypeItem>(
        `/api/v1/config/business-types/${businessType}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch business type ${businessType}:`, error);
      throw error;
    }
  }

  /**
   * Get all prompt types with their metadata
   */
  async getPromptTypes(refresh = false): Promise<Record<string, ConfigurationItem>> {
    if (!refresh && this.cache.promptTypes && this.isCacheValid()) {
      return this.cache.promptTypes;
    }

    try {
      const response = await apiClient.get<Record<string, ConfigurationItem>>(
        '/api/v1/config/prompt-types',
        { params: { refresh: refresh || false } }
      );

      this.cache.promptTypes = response.data;
      this.cache.lastFetch = Date.now();
      return response.data;
    } catch (error) {
      console.error('Failed to fetch prompt types:', error);
      throw error;
    }
  }

  /**
   * Get a specific prompt type by value
   */
  async getPromptType(promptType: string): Promise<ConfigurationItem> {
    try {
      const response = await apiClient.get<ConfigurationItem>(
        `/api/v1/config/prompt-types/${promptType}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch prompt type ${promptType}:`, error);
      throw error;
    }
  }

  /**
   * Get all prompt statuses with their metadata
   */
  async getPromptStatuses(refresh = false): Promise<Record<string, ConfigurationItem>> {
    if (!refresh && this.cache.promptStatuses && this.isCacheValid()) {
      return this.cache.promptStatuses;
    }

    try {
      const response = await apiClient.get<Record<string, ConfigurationItem>>(
        '/api/v1/config/prompt-statuses',
        { params: { refresh: refresh || false } }
      );

      this.cache.promptStatuses = response.data;
      this.cache.lastFetch = Date.now();
      return response.data;
    } catch (error) {
      console.error('Failed to fetch prompt statuses:', error);
      throw error;
    }
  }

  /**
   * Get a specific prompt status by value
   */
  async getPromptStatus(promptStatus: string): Promise<ConfigurationItem> {
    try {
      const response = await apiClient.get<ConfigurationItem>(
        `/api/v1/config/prompt-statuses/${promptStatus}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch prompt status ${promptStatus}:`, error);
      throw error;
    }
  }

  /**
   * Get all configuration data at once
   */
  async getAllConfiguration(refresh = false): Promise<AllConfigurationResponse> {
    if (!refresh && this.cache.allConfig && this.isCacheValid()) {
      return this.cache.allConfig;
    }

    try {
      const response = await apiClient.get<AllConfigurationResponse>(
        '/api/v1/config/all',
        { params: { refresh: refresh || false } }
      );

      this.cache.allConfig = response.data;
      this.cache.businessTypes = response.data.business_types;
      this.cache.promptTypes = response.data.prompt_types;
      this.cache.promptStatuses = response.data.prompt_statuses;
      this.cache.lastFetch = Date.now();
      return response.data;
    } catch (error) {
      console.error('Failed to fetch all configuration:', error);
      throw error;
    }
  }

  /**
   * Refresh configuration cache
   */
  async refreshCache(): Promise<void> {
    try {
      await apiClient.post('/api/v1/config/refresh-cache');
      this.clearCache();
    } catch (error) {
      console.error('Failed to refresh cache:', error);
      throw error;
    }
  }

  /**
   * Validate business type
   */
  async validateBusinessType(businessType: string): Promise<boolean> {
    try {
      const response = await apiClient.get<ValidationResult>(
        `/api/v1/config/validate/business-type/${businessType}`
      );
      return response.data.valid;
    } catch (error) {
      console.error(`Failed to validate business type ${businessType}:`, error);
      return false;
    }
  }

  /**
   * Validate prompt type
   */
  async validatePromptType(promptType: string): Promise<boolean> {
    try {
      const response = await apiClient.get<ValidationResult>(
        `/api/v1/config/validate/prompt-type/${promptType}`
      );
      return response.data.valid;
    } catch (error) {
      console.error(`Failed to validate prompt type ${promptType}:`, error);
      return false;
    }
  }

  /**
   * Validate prompt status
   */
  async validatePromptStatus(promptStatus: string): Promise<boolean> {
    try {
      const response = await apiClient.get<ValidationResult>(
        `/api/v1/config/validate/prompt-status/${promptStatus}`
      );
      return response.data.valid;
    } catch (error) {
      console.error(`Failed to validate prompt status ${promptStatus}:`, error);
      return false;
    }
  }

  /**
   * Get display name for business type
   */
  getBusinessTypeName(businessType: string, businessTypes?: Record<string, BusinessTypeItem>): string {
    const types = businessTypes || this.cache.businessTypes || {};
    return types[businessType]?.name || businessType;
  }

  /**
   * Get display name for prompt type
   */
  getPromptTypeName(promptType: string, promptTypes?: Record<string, ConfigurationItem>): string {
    const types = promptTypes || this.cache.promptTypes || {};
    return types[promptType]?.name || promptType;
  }

  /**
   * Get display name for prompt status
   */
  getPromptStatusName(promptStatus: string, promptStatuses?: Record<string, ConfigurationItem>): string {
    const statuses = promptStatuses || this.cache.promptStatuses || {};
    return statuses[promptStatus]?.name || promptStatus;
  }

  /**
   * Get description for business type
   */
  getBusinessTypeDescription(businessType: string, businessTypes?: Record<string, BusinessTypeItem>): string {
    const types = businessTypes || this.cache.businessTypes || {};
    return types[businessType]?.description || '';
  }

  /**
   * Get description for prompt type
   */
  getPromptTypeDescription(promptType: string, promptTypes?: Record<string, ConfigurationItem>): string {
    const types = promptTypes || this.cache.promptTypes || {};
    return types[promptType]?.description || '';
  }

  /**
   * Get description for prompt status
   */
  getPromptStatusDescription(promptStatus: string, promptStatuses?: Record<string, ConfigurationItem>): string {
    const statuses = promptStatuses || this.cache.promptStatuses || {};
    return statuses[promptStatus]?.description || '';
  }

  /**
   * Get business type options for dropdown/select components
   */
  async getBusinessTypeOptions(refresh = false): Promise<Array<{value: string; label: string; description?: string}>> {
    const businessTypes = await this.getBusinessTypes(refresh);
    return Object.entries(businessTypes).map(([value, item]) => ({
      value,
      label: item.name,
      description: item.description
    }));
  }

  /**
   * Get prompt type options for dropdown/select components
   */
  async getPromptTypeOptions(refresh = false): Promise<Array<{value: string; label: string; description?: string}>> {
    const promptTypes = await this.getPromptTypes(refresh);
    return Object.entries(promptTypes).map(([value, item]) => ({
      value,
      label: item.name,
      description: item.description
    }));
  }

  /**
   * Get prompt status options for dropdown/select components
   */
  async getPromptStatusOptions(refresh = false): Promise<Array<{value: string; label: string; description?: string}>> {
    const promptStatuses = await this.getPromptStatuses(refresh);
    return Object.entries(promptStatuses).map(([value, item]) => ({
      value,
      label: item.name,
      description: item.description
    }));
  }
}

// Create singleton instance
export const configService = new ConfigurationService();

// Types are already exported above through their interface declarations