import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { taskService } from '../services/taskService';
import { unifiedGenerationService } from '../services';
import { useWebSocket } from '../hooks';

export interface GenerationTask {
  id: string;
  business_type: string;
  generation_type: 'test_points' | 'test_cases' | 'both';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  current_step?: string;
  message?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
  // 新增字段支持统一架构
  total_test_points?: number;
  generated_test_points?: number;
  total_test_cases?: number;
  generated_test_cases?: number;
  project_id?: number;
  generation_config?: any;
}

interface TaskState {
  currentTask: GenerationTask | null;
  isConnected: boolean;
  activeTasks: GenerationTask[]; // 支持多个并发任务
  taskHistory: GenerationTask[];
}

type TaskAction =
  | { type: 'CREATE_TASK'; payload: GenerationTask }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<GenerationTask> } }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'ADD_ACTIVE_TASK'; payload: GenerationTask }
  | { type: 'REMOVE_ACTIVE_TASK'; payload: string }
  | { type: 'COMPLETE_TASK'; payload: string }
  | { type: 'FAIL_TASK'; payload: { id: string; error: string } }
  | { type: 'CLEAR_CURRENT_TASK' }
  | { type: 'ADD_TO_HISTORY'; payload: GenerationTask }
  | { type: 'LOAD_FROM_STORAGE'; payload: TaskState }
  | { type: 'UPDATE_FROM_WEBSOCKET'; payload: { taskId: string; message: any } };

const initialState: TaskState = {
  currentTask: null,
  isConnected: false,
  activeTasks: [],
  taskHistory: [],
};

function taskReducer(state: TaskState, action: TaskAction): TaskState {
  switch (action.type) {
    case 'CREATE_TASK':
      return {
        ...state,
        currentTask: action.payload,
        activeTasks: [...state.activeTasks, action.payload],
      };

    case 'UPDATE_TASK':
      const { id, updates } = action.payload;
      return {
        ...state,
        currentTask: state.currentTask?.id === id
          ? { ...state.currentTask, ...updates }
          : state.currentTask,
        activeTasks: state.activeTasks.map(task =>
          task.id === id ? { ...task, ...updates } : task
        ),
      };

    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        isConnected: action.payload,
      };

    case 'ADD_ACTIVE_TASK':
      return {
        ...state,
        activeTasks: [...state.activeTasks, action.payload],
      };

    case 'REMOVE_ACTIVE_TASK':
      return {
        ...state,
        activeTasks: state.activeTasks.filter(task => task.id !== action.payload),
        currentTask: state.currentTask?.id === action.payload ? null : state.currentTask,
      };

    case 'COMPLETE_TASK':
      const taskId = action.payload;
      const taskToComplete = state.activeTasks.find(task => task.id === taskId);
      if (!taskToComplete) return state;

      const completedTask = {
        ...taskToComplete,
        status: 'completed' as const,
        completed_at: new Date().toISOString(),
        progress: 100,
      };

      return {
        ...state,
        activeTasks: state.activeTasks.filter(task => task.id !== taskId),
        currentTask: state.currentTask?.id === taskId ? completedTask : state.currentTask,
        taskHistory: [completedTask, ...state.taskHistory.slice(0, 19)], // 保留最近20个
      };

    case 'FAIL_TASK':
      const { id: failId, error } = action.payload;
      const taskToFail = state.activeTasks.find(task => task.id === failId);
      if (!taskToFail) return state;

      const failedTask = {
        ...taskToFail,
        status: 'failed' as const,
        error_message: error,
        completed_at: new Date().toISOString(),
      };

      return {
        ...state,
        activeTasks: state.activeTasks.filter(task => task.id !== failId),
        currentTask: state.currentTask?.id === failId ? failedTask : state.currentTask,
        taskHistory: [failedTask, ...state.taskHistory.slice(0, 19)],
      };

    case 'CLEAR_CURRENT_TASK':
      return {
        ...state,
        currentTask: null,
      };

    case 'ADD_TO_HISTORY':
      return {
        ...state,
        taskHistory: [action.payload, ...state.taskHistory.slice(0, 19)],
      };

    case 'UPDATE_FROM_WEBSOCKET':
      const { taskId: wsTaskId, message: wsMessage } = action.payload;

      switch (wsMessage.type) {
        case 'progress_update':
          return {
            ...state,
            activeTasks: state.activeTasks.map(task =>
              task.id === wsTaskId
                ? {
                    ...task,
                    progress: wsMessage.data.progress || task.progress,
                    current_step: wsMessage.data.current_step || task.current_step,
                    total_test_points: wsMessage.data.total_test_points || task.total_test_points,
                    generated_test_points: wsMessage.data.generated_test_points || task.generated_test_points,
                    total_test_cases: wsMessage.data.total_test_cases || task.total_test_cases,
                    generated_test_cases: wsMessage.data.generated_test_cases || task.generated_test_cases,
                    status: 'running'
                  }
                : task
            ),
            currentTask: state.currentTask?.id === wsTaskId
              ? {
                  ...state.currentTask,
                  progress: wsMessage.data.progress || state.currentTask.progress,
                  current_step: wsMessage.data.current_step || state.currentTask.current_step,
                  total_test_points: wsMessage.data.total_test_points || state.currentTask.total_test_points,
                  generated_test_points: wsMessage.data.generated_test_points || state.currentTask.generated_test_points,
                  total_test_cases: wsMessage.data.total_test_cases || state.currentTask.total_test_cases,
                  generated_test_cases: wsMessage.data.generated_test_cases || state.currentTask.generated_test_cases,
                  status: 'running'
                }
              : state.currentTask
          };

        case 'task_completed':
          const completedWsTask = state.activeTasks.find(task => task.id === wsTaskId);
          if (!completedWsTask) return state;

          const finalCompletedTask = {
            ...completedWsTask,
            status: 'completed' as const,
            progress: 100,
            current_step: '已完成',
            completed_at: new Date().toISOString()
          };

          return {
            ...state,
            activeTasks: state.activeTasks.filter(task => task.id !== wsTaskId),
            currentTask: state.currentTask?.id === wsTaskId ? finalCompletedTask : state.currentTask,
            taskHistory: [finalCompletedTask, ...state.taskHistory.slice(0, 19)]
          };

        case 'task_failed':
          const failedWsTask = state.activeTasks.find(task => task.id === wsTaskId);
          if (!failedWsTask) return state;

          const finalFailedTask = {
            ...failedWsTask,
            status: 'failed' as const,
            error_message: wsMessage.data.error_message || '未知错误',
            current_step: '生成失败',
            completed_at: new Date().toISOString()
          };

          return {
            ...state,
            activeTasks: state.activeTasks.filter(task => task.id !== wsTaskId),
            currentTask: state.currentTask?.id === wsTaskId ? finalFailedTask : state.currentTask,
            taskHistory: [finalFailedTask, ...state.taskHistory.slice(0, 19)]
          };

        default:
          return state;
      }

    case 'LOAD_FROM_STORAGE':
      return action.payload;

    default:
      return state;
  }
}

interface TaskContextType {
  state: TaskState;
  // 统一API - 使用新的生成架构
  createGenerationTask: (request: {
    business_type: string;
    project_id: number;
    generation_config: any;
    generation_type?: 'test_points' | 'test_cases' | 'both';
  }) => Promise<string>;

  // 任务管理
  updateTask: (taskId: string, updates: Partial<GenerationTask>) => void;
  completeTask: (taskId: string) => void;
  failTask: (taskId: string, error: string) => void;
  clearCurrentTask: () => void;
  removeActiveTask: (taskId: string) => void;

  // 查询功能
  getTaskById: (id: string) => GenerationTask | null;
  getActiveTasks: () => GenerationTask[];
  getRunningTasksCount: () => number;

  // WebSocket连接管理
  connectWebSocket: (taskId: string) => void;
  disconnectWebSocket: () => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

const STORAGE_KEY = 'tsp_task_state';

export function TaskProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(taskReducer, initialState);

  // 从localStorage恢复状态（只恢复历史记录，不恢复实时状态）
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedState = JSON.parse(stored);
        // 只恢复任务历史，不恢复当前任务和连接状态
        dispatch({
          type: 'LOAD_FROM_STORAGE',
          payload: {
            ...initialState,
            taskHistory: parsedState.taskHistory || [],
            currentTask: null, // 不恢复当前任务，避免重连问题
          },
        });
      }
    } catch (error) {
      console.warn('Failed to load task state from storage:', error);
    }
  }, []);

  // 保存状态到localStorage（只保存历史和当前任务，不保存实时状态）
  useEffect(() => {
    try {
      const toStore = {
        currentTask: state.currentTask,
        taskHistory: state.taskHistory,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.warn('Failed to save task state to storage:', error);
    }
  }, [state.currentTask, state.taskHistory]);

  // 增强版WebSocket集成 - 替代轮询，提供更稳定的连接
  const {
    lastMessage,
    isConnected,
    connectionState,
    error: wsError,
    connect,
    disconnect,
    subscribeToTask,
    getConnectionHealth
  } = useWebSocket({
    autoConnect: true,
    showNotifications: true,
    reconnectNotifications: true,
    connectionMonitoring: true
  });

  // 为所有活动任务建立订阅
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    state.activeTasks.forEach(task => {
      const unsubscribe = subscribeToTask(task.id, (taskData) => {
        dispatch({
          type: 'UPDATE_FROM_WEBSOCKET',
          payload: {
            taskId: task.id,
            message: {
              type: 'progress_update',
              data: taskData
            }
          }
        });
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [state.activeTasks.map(t => t.id).join(','), subscribeToTask]);

  // 处理全局WebSocket消息
  useEffect(() => {
    if (lastMessage && state.activeTasks.length > 0) {
      // 找到对应的任务ID
      const taskId = lastMessage.data?.task_id || state.activeTasks[0]?.id;

      if (taskId) {
        dispatch({
          type: 'UPDATE_FROM_WEBSOCKET',
          payload: {
            taskId,
            message: lastMessage
          }
        });

        // 处理完成和失败的通知
        if (lastMessage.type === 'task_completed') {
          const completedTask = state.activeTasks.find(t => t.id === taskId);
          if (completedTask) {
            showNotification(
              '任务完成',
              `${completedTask.business_type} - ${completedTask.generation_type} 生成已完成`,
              'success'
            );
          }
        } else if (lastMessage.type === 'task_failed') {
          const failedTask = state.activeTasks.find(t => t.id === taskId);
          if (failedTask) {
            showNotification(
              '任务失败',
              `${failedTask.business_type} - ${failedTask.generation_type} 生成失败: ${lastMessage.data.error_message || '未知错误'}`,
              'error'
            );
          }
        }
      }
    }
  }, [lastMessage, state.activeTasks]);

  // 更新连接状态和错误信息
  useEffect(() => {
    dispatch({
      type: 'SET_CONNECTION_STATUS',
      payload: isConnected
    });

    // 如果连接状态错误，记录错误信息
    if (wsError && connectionState === 'error') {
      console.error('WebSocket连接错误:', wsError);
    }
  }, [isConnected, connectionState, wsError]);

  // 新的统一生成任务创建函数
  const createGenerationTask = async (request: {
    business_type: string;
    project_id: number;
    generation_config: any;
    generation_type?: 'test_points' | 'test_cases' | 'both';
  }): Promise<string> => {
    try {
      // 调用统一生成API
      const response = await unifiedGenerationService.generate({
        business_type: request.business_type,
        project_id: request.project_id,
        generation_config: request.generation_config
      });

      // 创建新任务记录
      const newTask: GenerationTask = {
        id: response.task_id,
        business_type: request.business_type,
        generation_type: request.generation_type || 'both',
        status: 'pending',
        progress: 0,
        current_step: '任务已创建',
        created_at: new Date().toISOString(),
        project_id: request.project_id,
        generation_config: request.generation_config,
      };

      // 添加到状态管理
      dispatch({ type: 'CREATE_TASK', payload: newTask });

      // 自动建立WebSocket连接
      if (response.task_id) {
        connect(response.task_id);
      }

      // 显示开始通知
      showNotification(
        '任务已启动',
        `正在处理 ${request.business_type} - ${newTask.generation_type} 生成任务`,
        'info'
      );

      return response.task_id;
    } catch (error) {
      console.error('Failed to create generation task:', error);
      showNotification(
        '任务创建失败',
        `无法创建生成任务: ${error.message || '未知错误'}`,
        'error'
      );
      throw error;
    }
  };

  // 任务管理函数
  const updateTask = (taskId: string, updates: Partial<GenerationTask>) => {
    dispatch({
      type: 'UPDATE_TASK',
      payload: { id: taskId, updates }
    });
  };

  const completeTask = (taskId: string) => {
    dispatch({ type: 'COMPLETE_TASK', payload: taskId });
  };

  const failTask = (taskId: string, error: string) => {
    dispatch({
      type: 'FAIL_TASK',
      payload: { id: taskId, error }
    });
  };

  const clearCurrentTask = () => {
    dispatch({ type: 'CLEAR_CURRENT_TASK' });
  };

  const removeActiveTask = (taskId: string) => {
    dispatch({ type: 'REMOVE_ACTIVE_TASK', payload: taskId });
  };

  // 查询功能
  const getTaskById = (id: string): GenerationTask | null => {
    if (state.currentTask?.id === id) {
      return state.currentTask;
    }
    return state.activeTasks.find(task => task.id === id) ||
           state.taskHistory.find(task => task.id === id) || null;
  };

  const getActiveTasks = (): GenerationTask[] => {
    return state.activeTasks;
  };

  const getRunningTasksCount = (): number => {
    return state.activeTasks.filter(task =>
      task.status === 'pending' || task.status === 'running'
    ).length;
  };

  // WebSocket连接管理
  const connectWebSocket = (taskId: string) => {
    connect(taskId);
  };

  const disconnectWebSocket = () => {
    disconnect();
  };

  return (
    <TaskContext.Provider
      value={{
        state,
        createGenerationTask,
        updateTask,
        completeTask,
        failTask,
        clearCurrentTask,
        removeActiveTask,
        getTaskById,
        getActiveTasks,
        getRunningTasksCount,
        connectWebSocket,
        disconnectWebSocket,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTask() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
}

// 浏览器通知功能
function showNotification(title: string, body: string, type: 'success' | 'error' | 'info' = 'info') {
  // 浏览器通知
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: type === 'success' ? '/success-icon.png' : type === 'error' ? '/error-icon.png' : '/info-icon.png',
    });
  }

  // 控制台通知
  console.log(`🔔 ${title}: ${body}`);
}

// 请求通知权限
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}