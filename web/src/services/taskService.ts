import apiClient from './api';
import { API_ENDPOINTS } from '@/config/constants';
import {
  TaskStatusResponse,
  TaskListResponse,
} from '@/types/testCases';

export const taskService = {
  // 获取任务状态
  getTaskStatus: async (taskId: string): Promise<TaskStatusResponse> => {
    const response = await apiClient.get<TaskStatusResponse>(`${API_ENDPOINTS.GENERATION.STATUS}/${taskId}`);
    return response.data;
  },

  // 获取所有任务
  getAllTasks: async (projectId?: number): Promise<TaskListResponse> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get<TaskListResponse>(API_ENDPOINTS.TASKS.LIST, { params });
    return response.data;
  },

  // 删除任务
  deleteTask: async (taskId: string): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.TASKS.LIST}/${taskId}`);
  },
};

export default taskService;