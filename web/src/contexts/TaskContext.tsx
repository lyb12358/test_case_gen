import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { taskService } from '../services/taskService';
import { unifiedGenerationService } from '../services';

export interface GenerationTask {
  id: string;
  business_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  created_at: string;
  completed_at?: string;
}

interface TaskState {
  currentTask: GenerationTask | null;
  isPolling: boolean;
  taskHistory: GenerationTask[];
}

type TaskAction =
  | { type: 'CREATE_TASK'; payload: GenerationTask }
  | { type: 'UPDATE_TASK'; payload: Partial<GenerationTask> }
  | { type: 'SET_POLLING'; payload: boolean }
  | { type: 'COMPLETE_TASK' }
  | { type: 'FAIL_TASK'; payload: string }
  | { type: 'CLEAR_TASK' }
  | { type: 'ADD_TO_HISTORY'; payload: GenerationTask }
  | { type: 'LOAD_FROM_STORAGE'; payload: TaskState };

const initialState: TaskState = {
  currentTask: null,
  isPolling: false,
  taskHistory: [],
};

function taskReducer(state: TaskState, action: TaskAction): TaskState {
  switch (action.type) {
    case 'CREATE_TASK':
      return {
        ...state,
        currentTask: action.payload,
        isPolling: true,
      };

    case 'UPDATE_TASK':
      if (!state.currentTask) return state;
      return {
        ...state,
        currentTask: {
          ...state.currentTask,
          ...action.payload,
        },
      };

    case 'SET_POLLING':
      return {
        ...state,
        isPolling: action.payload,
      };

    case 'COMPLETE_TASK':
      if (!state.currentTask) return state;
      const completedTask = {
        ...state.currentTask,
        status: 'completed' as const,
        completed_at: new Date().toISOString(),
        progress: 100,
      };
      return {
        ...state,
        currentTask: completedTask,
        isPolling: false,
        taskHistory: [completedTask, ...state.taskHistory.slice(0, 9)], // 保留最近10个
      };

    case 'FAIL_TASK':
      if (!state.currentTask) return state;
      const failedTask = {
        ...state.currentTask,
        status: 'failed' as const,
        message: action.payload,
        completed_at: new Date().toISOString(),
      };
      return {
        ...state,
        currentTask: failedTask,
        isPolling: false,
        taskHistory: [failedTask, ...state.taskHistory.slice(0, 9)],
      };

    case 'CLEAR_TASK':
      return {
        ...state,
        currentTask: null,
        isPolling: false,
      };

    case 'ADD_TO_HISTORY':
      return {
        ...state,
        taskHistory: [action.payload, ...state.taskHistory.slice(0, 9)],
      };

    case 'LOAD_FROM_STORAGE':
      return action.payload;

    default:
      return state;
  }
}

interface TaskContextType {
  state: TaskState;
  createTask: (businessType: string) => Promise<void>;
  updateTask: (updates: Partial<GenerationTask>) => void;
  completeTask: () => void;
  failTask: (message: string) => void;
  clearTask: () => void;
  getTaskById: (id: string) => GenerationTask | null;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

const STORAGE_KEY = 'tsp_task_state';

export function TaskProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(taskReducer, initialState);

  // 从localStorage恢复状态
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedState = JSON.parse(stored);
        // 只恢复任务历史，不恢复当前任务和轮询状态
        dispatch({
          type: 'LOAD_FROM_STORAGE',
          payload: {
            ...initialState,
            taskHistory: parsedState.taskHistory || [],
          },
        });
      }
    } catch (error) {
      console.warn('Failed to load task state from storage:', error);
    }
  }, []);

  // 保存状态到localStorage
  useEffect(() => {
    try {
      const toStore = {
        currentTask: state.currentTask,
        isPolling: state.isPolling,
        taskHistory: state.taskHistory,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.warn('Failed to save task state to storage:', error);
    }
  }, [state]);

  // 轮询任务状态
  useEffect(() => {
    if (!state.isPolling || !state.currentTask?.id) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const status = await taskService.getTaskStatus(state.currentTask!.id);

        // 更新任务状态
        dispatch({
          type: 'UPDATE_TASK',
          payload: {
            status: status.status as GenerationTask['status'],
            progress: status.progress,
            message: status.error,
          },
        });

        // 根据状态处理完成或失败
        if (status.status === 'completed') {
          dispatch({ type: 'COMPLETE_TASK' });
          // 显示浏览器通知
          showNotification('测试用例生成完成', `${state.currentTask.business_type} 类型的测试用例已成功生成`, 'success');
        } else if (status.status === 'failed') {
          dispatch({ type: 'FAIL_TASK', payload: status.error || '生成失败' });
          showNotification('测试用例生成失败', status.error || '生成过程中遇到错误', 'error');
        }
      } catch (error) {
        console.error('Failed to poll task status:', error);
        dispatch({ type: 'FAIL_TASK', payload: '状态查询失败' });
      }
    }, 2000); // 恢复到2秒轮询间隔

    return () => clearInterval(pollInterval);
  }, [state.isPolling, state.currentTask?.id]);

  const createTask = async (businessType: string) => {
    try {
      const response = await unifiedGenerationService.generateTestCases({ business_type: businessType });

      // 使用后端返回的状态，让前端UI根据实际状态显示
      const newTask: GenerationTask = {
        id: response.task_id,
        business_type: businessType,
        status: response.status as GenerationTask['status'],
        created_at: new Date().toISOString(),
      };

      dispatch({ type: 'CREATE_TASK', payload: newTask });

      // 显示开始通知
      showNotification('开始生成测试用例', `正在生成 ${businessType} 类型的测试用例`, 'info');
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  };

  const updateTask = (updates: Partial<GenerationTask>) => {
    dispatch({ type: 'UPDATE_TASK', payload: updates });
  };

  const completeTask = () => {
    dispatch({ type: 'COMPLETE_TASK' });
  };

  const failTask = (message: string) => {
    dispatch({ type: 'FAIL_TASK', payload: message });
  };

  const clearTask = () => {
    dispatch({ type: 'CLEAR_TASK' });
  };

  const getTaskById = (id: string): GenerationTask | null => {
    if (state.currentTask?.id === id) {
      return state.currentTask;
    }
    return state.taskHistory.find(task => task.id === id) || null;
  };

  return (
    <TaskContext.Provider
      value={{
        state,
        createTask,
        updateTask,
        completeTask,
        failTask,
        clearTask,
        getTaskById,
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