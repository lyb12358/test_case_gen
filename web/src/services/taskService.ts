import apiClient from './api';
import {
  TaskStatusResponse,
  TaskListResponse,
} from '@/types/testCases';

export const taskService = {
  // 获取任务状态
  getTaskStatus: async (taskId: string): Promise<TaskStatusResponse> => {
    const response = await apiClient.get<TaskStatusResponse>(`/status/${taskId}`);
    return response.data;
  },

  // 获取所有任务
  getAllTasks: async (): Promise<TaskListResponse> => {
    const response = await apiClient.get<TaskListResponse>('/tasks');
    return response.data;
  },

  // 删除任务
  deleteTask: async (taskId: string): Promise<void> => {
    await apiClient.delete(`/tasks/${taskId}`);
  },
};

export default taskService;