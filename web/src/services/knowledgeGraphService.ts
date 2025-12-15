import apiClient from './api';
import { API_ENDPOINTS } from '@/config/constants';
import {
  KnowledgeGraphData,
  GraphStats,
  GraphEntity,
  GraphRelation,
  EntityDetails,
  BusinessDescription,
  EntityTestCases
} from '../types/knowledgeGraph';

export const knowledgeGraphService = {
  // Get graph data for visualization
  async getGraphData(businessType?: string, projectId?: number): Promise<KnowledgeGraphData> {
    const params: Record<string, any> = {};
    if (businessType) params.business_type = businessType;
    if (projectId) params.project_id = projectId;
    console.log('Making API call to knowledge-graph/data with params:', params);
    const response = await apiClient.get(API_ENDPOINTS.KNOWLEDGE_GRAPH.DATA, { params });
    console.log('API response status:', response.status);
    console.log('API response data keys:', Object.keys(response.data || {}));
    return response.data;
  },

  // Get graph statistics
  async getGraphStats(): Promise<GraphStats> {
    const response = await apiClient.get(API_ENDPOINTS.KNOWLEDGE_GRAPH.STATS);
    return response.data;
  },

  // Get all entities
  async getEntities(entityType?: string, businessType?: string): Promise<GraphEntity[]> {
    const params: Record<string, string> = {};
    if (entityType) params.entity_type = entityType;
    if (businessType) params.business_type = businessType;

    const response = await apiClient.get(API_ENDPOINTS.KNOWLEDGE_GRAPH.ENTITIES, { params });
    return response.data;
  },

  // Get all relations
  async getRelations(businessType?: string): Promise<GraphRelation[]> {
    const params = businessType ? { business_type: businessType } : {};
    const response = await apiClient.get(API_ENDPOINTS.KNOWLEDGE_GRAPH.RELATIONS, { params });
    return response.data;
  },

  // Initialize knowledge graph
  async initializeGraph(): Promise<{ message: string; stats: GraphStats }> {
    const response = await apiClient.post(API_ENDPOINTS.KNOWLEDGE_GRAPH.INITIALIZE);
    return response.data;
  },

  // Clear knowledge graph
  async clearGraph(): Promise<{ message: string; deleted_count: number }> {
    const response = await apiClient.delete(API_ENDPOINTS.KNOWLEDGE_GRAPH.CLEAR);
    return response.data;
  },

  // Get entity details
  async getEntityDetails(entityId: number): Promise<EntityDetails> {
    const response = await apiClient.get(`${API_ENDPOINTS.KNOWLEDGE_GRAPH.ENTITY_DETAILS}/${entityId}`);
    return response.data;
  },

  // Get business description for a business entity
  async getBusinessDescription(entityId: number): Promise<BusinessDescription> {
    const response = await apiClient.get(`${API_ENDPOINTS.KNOWLEDGE_GRAPH.BUSINESS_DESCRIPTION}/${entityId}`);
    return response.data;
  },

  // Get test cases for an entity
  async getEntityTestCases(entityId: number): Promise<EntityTestCases> {
    const response = await apiClient.get(`${API_ENDPOINTS.KNOWLEDGE_GRAPH.TEST_CASES}/${entityId}`);
    return response.data;
  }
};