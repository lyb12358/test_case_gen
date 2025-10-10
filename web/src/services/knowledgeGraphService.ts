import axios from 'axios';
import {
  KnowledgeGraphData,
  GraphStats,
  GraphEntity,
  GraphRelation,
  EntityDetails,
  BusinessDescription,
  EntityTestCases
} from '../types/knowledgeGraph';

const API_BASE_URL = 'http://localhost:8000';

export const knowledgeGraphService = {
  // Get graph data for visualization
  async getGraphData(businessType?: string): Promise<KnowledgeGraphData> {
    const params = businessType ? { business_type: businessType } : {};
    console.log('Making API call to /knowledge-graph/data with params:', params);
    const response = await axios.get(`${API_BASE_URL}/knowledge-graph/data`, { params });
    console.log('API response status:', response.status);
    console.log('API response data keys:', Object.keys(response.data || {}));
    return response.data;
  },

  // Get graph statistics
  async getGraphStats(): Promise<GraphStats> {
    const response = await axios.get(`${API_BASE_URL}/knowledge-graph/stats`);
    return response.data;
  },

  // Get all entities
  async getEntities(entityType?: string, businessType?: string): Promise<GraphEntity[]> {
    const params: Record<string, string> = {};
    if (entityType) params.entity_type = entityType;
    if (businessType) params.business_type = businessType;

    const response = await axios.get(`${API_BASE_URL}/knowledge-graph/entities`, { params });
    return response.data;
  },

  // Get all relations
  async getRelations(businessType?: string): Promise<GraphRelation[]> {
    const params = businessType ? { business_type: businessType } : {};
    const response = await axios.get(`${API_BASE_URL}/knowledge-graph/relations`, { params });
    return response.data;
  },

  // Initialize knowledge graph
  async initializeGraph(): Promise<{ message: string; stats: GraphStats }> {
    const response = await axios.post(`${API_BASE_URL}/knowledge-graph/initialize`);
    return response.data;
  },

  // Clear knowledge graph
  async clearGraph(): Promise<{ message: string; deleted_count: number }> {
    const response = await axios.delete(`${API_BASE_URL}/knowledge-graph/clear`);
    return response.data;
  },

  // Get entity details
  async getEntityDetails(entityId: number): Promise<EntityDetails> {
    const response = await axios.get(`${API_BASE_URL}/knowledge-graph/entities/${entityId}/details`);
    return response.data;
  },

  // Get business description for a business entity
  async getBusinessDescription(entityId: number): Promise<BusinessDescription> {
    const response = await axios.get(`${API_BASE_URL}/knowledge-graph/entities/${entityId}/business-description`);
    return response.data;
  },

  // Get test cases for an entity
  async getEntityTestCases(entityId: number): Promise<EntityTestCases> {
    const response = await axios.get(`${API_BASE_URL}/knowledge-graph/entities/${entityId}/test-cases`);
    return response.data;
  }
};