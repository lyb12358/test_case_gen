import apiClient from './api';
import {
  TaskStatusResponse,
  TaskListResponse,
} from '@/types/testCases';

export const taskService = {
  // 获取任务状态
  getTaskStatus: async (taskId: string): Promise<TaskStatusResponse> => {
    const response = await apiClient.get<TaskStatusResponse>(`/api/v1/status/${taskId}`);
    return response.data;
  },

  // 获取所有任务
  getAllTasks: async (projectId?: number): Promise<TaskListResponse> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get<TaskListResponse>('/api/v1/tasks', { params });
    return response.data;
  },

  // 删除任务
  deleteTask: async (taskId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/tasks/${taskId}`);
  },
};

export default taskService;