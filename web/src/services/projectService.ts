import apiClient from './api';
import { API_ENDPOINTS } from '@/config/constants';

export interface BusinessTypeConfig {
  id: number;
  code: string;
  name: string;
  description?: string;
  project_id: number;
  is_active: boolean;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  business_types?: BusinessTypeConfig[];
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface ProjectStats {
  project_id: number;
  project_name: string;
  test_points_count: number;
  test_cases_count: number;
  generation_jobs_count: number;
  knowledge_entities_count: number;
  prompts_count: number;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
}

export interface ProjectStatsResponse {
  projects: ProjectStats[];
  total_projects: number;
}

class ProjectService {
  private baseUrl = API_ENDPOINTS.PROJECTS.LIST;

  // Get all projects
  async getProjects(activeOnly: boolean = true): Promise<ProjectListResponse> {
    const response = await apiClient.get<ProjectListResponse>(this.baseUrl, {
      params: { active_only: activeOnly }
    });
    return response.data;
  }

  // Get project by ID
  async getProject(projectId: number): Promise<Project> {
    const response = await apiClient.get<Project>(`${this.baseUrl}/${projectId}`);
    return response.data;
  }

  // Create new project
  async createProject(projectData: ProjectCreate): Promise<Project> {
    const response = await apiClient.post<Project>(this.baseUrl, projectData);
    return response.data;
  }

  // Update project
  async updateProject(projectId: number, projectData: ProjectUpdate): Promise<Project> {
    const response = await apiClient.put<Project>(`${this.baseUrl}/${projectId}`, projectData);
    return response.data;
  }

  // Delete project
  async deleteProject(projectId: number, softDelete: boolean = true): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${projectId}`, {
      params: { soft_delete: softDelete }
    });
  }

  // Get project statistics
  async getProjectStats(projectId: number): Promise<ProjectStatsResponse> {
    const response = await apiClient.get<ProjectStatsResponse>(`${this.baseUrl}/${projectId}/stats`);
    return response.data;
  }

  // Get business type configs for a project
  async getProjectBusinessTypes(projectId: number): Promise<BusinessTypeConfig[]> {
    const response = await apiClient.get<{items: BusinessTypeConfig[]}>(API_ENDPOINTS.BUSINESS_TYPES.LIST, {
      params: {
        project_id: projectId,
        is_active: true,
        size: 100 // Get all business types for the project
      }
    });
    return response.data.items;
  }

  // Get or create default project (远控场景)
  async getOrCreateDefaultProject(): Promise<Project> {
    try {
      // Try to get the default project first
      const projects = await this.getProjects();
      const defaultProject = projects.projects.find(p => p.name === '远控场景');

      if (defaultProject) {
        return defaultProject;
      }

      // Create default project if not found
      return await this.createProject({
        name: '远控场景',
        description: 'TSP远程控制业务场景，包含29个远控业务类型',
        is_active: true
      });
    } catch (error) {
      console.error('Failed to get or create default project:', error);
      throw error;
    }
  }
}

export const projectService = new ProjectService();