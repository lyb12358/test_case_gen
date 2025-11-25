/**
 * 任务生成WebSocket Hook。
 * 专门用于处理测试用例生成任务的实时状态更新。
 */

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useNotifications } from './useNotifications';

export interface TaskGenerationStatus {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  currentStep?: string;
  totalSteps?: number;
  result?: any;
  error?: string;
}

export interface UseTaskGenerationOptions {
  onProgress?: (progress: number, message: string) => void;
  onCompleted?: (result: any) => void;
  onError?: (error: string) => void;
  onStepChange?: (currentStep: string, totalSteps: number) => void;
}

export function useTaskGeneration(taskId: string | null, options: UseTaskGenerationOptions = {}) {
  const [taskStatus, setTaskStatus] = useState<TaskGenerationStatus | null>(null);
  const { showSuccess, showError, showInfo } = useNotifications();

  const { isConnected, subscribe, error: wsError } = useWebSocket();

  // 订阅任务状态更新
  useEffect(() => {
    if (!taskId || !isConnected) {
      return;
    }

    const unsubscribe = subscribe(taskId, (data) => {
      const newStatus: TaskGenerationStatus = {
        taskId,
        status: data.status || 'pending',
        progress: data.progress || 0,
        message: data.message || '',
        currentStep: data.current_step,
        totalSteps: data.total_steps,
        result: data.result,
        error: data.error
      };

      setTaskStatus(newStatus);

      // 调用回调函数
      if (options.onProgress && newStatus.progress !== undefined) {
        options.onProgress(newStatus.progress, newStatus.message);
      }

      if (options.onStepChange && newStatus.currentStep && newStatus.totalSteps) {
        options.onStepChange(newStatus.currentStep, newStatus.totalSteps);
      }

      if (newStatus.status === 'completed') {
        showSuccess('任务完成', `任务 ${taskId} 已成功完成`);
        options.onCompleted?.(newStatus.result);
      }

      if (newStatus.status === 'failed' && newStatus.error) {
        showError('任务失败', newStatus.error);
        options.onError?.(newStatus.error);
      }
    });

    return unsubscribe;
  }, [taskId, isConnected, subscribe, options, showSuccess, showError]);

  // 取消任务
  const cancelTask = useCallback(async () => {
    if (!taskId) {
      return false;
    }

    try {
      // 这里应该调用API取消任务
      // await unifiedGenerationService.cancelGenerationTask(taskId);
      showInfo('取消任务', `任务 ${taskId} 已取消`);
      return true;
    } catch (error) {
      showError('取消失败', `无法取消任务 ${taskId}`);
      return false;
    }
  }, [taskId, showInfo, showError]);

  // 重置状态
  const resetStatus = useCallback(() => {
    setTaskStatus(null);
  }, []);

  return {
    taskStatus,
    isConnected,
    websocketError: wsError,
    cancelTask,
    resetStatus,
    isRunning: taskStatus?.status === 'running',
    isCompleted: taskStatus?.status === 'completed',
    isFailed: taskStatus?.status === 'failed',
    isPending: taskStatus?.status === 'pending',
    progress: taskStatus?.progress || 0,
    message: taskStatus?.message || '',
  };
}