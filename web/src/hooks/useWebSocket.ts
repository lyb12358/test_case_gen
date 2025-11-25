/**
 * WebSocket管理Hook。
 * 提供React组件中使用WebSocket的功能。
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createWebSocketService, createTaskWebSocketService, WebSocketService } from '../services/websocketService';
import { TaskUpdateData, WebSocketMessage } from '../types/testCases';

export interface UseWebSocketOptions {
  url?: string;
  userId?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  connectionState: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribe: (taskId: string, callback: (data: TaskUpdateData) => void) => () => void;
  cancelTask: (taskId: string) => boolean;
  send: (message: WebSocketMessage) => boolean;
}

/**
 * 通用的WebSocket Hook。
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [connectionState, setConnectionState] = useState('DISCONNECTED');

  const wsRef = useRef<WebSocketService | null>(null);
  const subscriptionsRef = useRef(new Map<string, Set<(data: TaskUpdateData) => void>>());

  useEffect(() => {
    return () => {
      // 组件卸载时断开连接
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    };
  }, []);

  const connect = useCallback(async () => {
    if (wsRef.current?.isConnected()) {
      console.log('WebSocket已连接');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const config = {
        url: options.url || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/global`,
        userId: options.userId,
        autoReconnect: options.autoReconnect ?? true,
        reconnectInterval: options.reconnectInterval ?? 3000,
        maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      };

      wsRef.current = createWebSocketService(config);

      // 设置连接状态监听器
      wsRef.current.onConnectionStatusChange((connected) => {
        setIsConnected(connected);
        setIsConnecting(false);
        setConnectionState(wsRef.current?.getReadyState() || 'DISCONNECTED');
      });

      // 设置错误监听器
      wsRef.current.onError((error) => {
        setError(error);
        setIsConnecting(false);
      });

      await wsRef.current.connect();

    } catch (err) {
      setError(err as Error);
      setIsConnecting(false);
      setConnectionState('DISCONNECTED');
    }
  }, [options]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
      subscriptionsRef.current.clear();
    }
  }, []);

  const subscribe = useCallback((taskId: string, callback: (data: TaskUpdateData) => void) => {
    if (!wsRef.current) {
      console.warn('WebSocket未初始化，无法订阅任务');
      return () => {};
    }

    // 存储回调函数
    if (!subscriptionsRef.current.has(taskId)) {
      subscriptionsRef.current.set(taskId, new Set());
    }
    subscriptionsRef.current.get(taskId)!.add(callback);

    // 订阅WebSocket消息
    const unsubscribe = wsRef.current.subscribeToTask(taskId, (taskId, data) => {
      // 调用所有注册的回调函数
      const callbacks = subscriptionsRef.current.get(taskId);
      if (callbacks) {
        callbacks.forEach(cb => {
          try {
            cb(data);
          } catch (error) {
            console.error('执行任务更新回调失败:', error);
          }
        });
      }
    });

    return () => {
      // 从本地存储中移除回调
      const callbacks = subscriptionsRef.current.get(taskId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          subscriptionsRef.current.delete(taskId);
        }
      }

      // 取消WebSocket订阅
      unsubscribe();
    };
  }, []);

  const cancelTask = useCallback((taskId: string) => {
    return wsRef.current?.cancelTask(taskId) ?? false;
  }, []);

  const send = useCallback((message: WebSocketMessage) => {
    return wsRef.current?.send(message) ?? false;
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    connectionState,
    connect,
    disconnect,
    subscribe,
    cancelTask,
    send,
  };
}

/**
 * 任务特定的WebSocket Hook。
 */
export function useTaskWebSocket(taskId: string | null, options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [taskStatus, setTaskStatus] = useState<TaskUpdateData | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const wsRef = useRef<WebSocketService | null>(null);

  useEffect(() => {
    if (!taskId) {
      // 没有任务ID时断开连接
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      setIsConnected(false);
      setTaskStatus(null);
      return;
    }

    // 创建任务特定的WebSocket连接
    const config = {
      url: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/tasks/${taskId}`,
      userId: options.userId,
      autoReconnect: options.autoReconnect ?? true,
      reconnectInterval: options.reconnectInterval ?? 3000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
    };

    wsRef.current = createTaskWebSocketService(taskId, config);

    // 设置连接状态监听器
    const unsubscribeConnection = wsRef.current.onConnectionStatusChange((connected) => {
      setIsConnected(connected);
    });

    // 设置错误监听器
    const unsubscribeError = wsRef.current.onError((error) => {
      setError(error);
    });

    // 设置任务状态监听器
    const unsubscribeTask = wsRef.current.subscribeToTask(taskId, (taskId, data) => {
      setTaskStatus(data);
    });

    // 连接WebSocket
    wsRef.current.connect().catch((error) => {
      setError(error);
      setIsConnected(false);
    });

    return () => {
      unsubscribeConnection();
      unsubscribeError();
      unsubscribeTask();

      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, [taskId, options]);

  const cancelTask = useCallback(() => {
    if (taskId && wsRef.current) {
      return wsRef.current.cancelTask(taskId);
    }
    return false;
  }, [taskId]);

  return {
    isConnected,
    taskStatus,
    error,
    cancelTask,
  };
}

/**
 * 多任务状态管理Hook。
 */
export function useMultiTaskWebSocket() {
  const [taskStatuses, setTaskStatuses] = useState<Map<string, TaskUpdateData>>(new Map());
  const [connectedTasks, setConnectedTasks] = useState<Set<string>>(new Set());

  const wsRef = useRef<WebSocketService | null>(null);
  const callbacksRef = useRef<Map<string, Set<(data: TaskUpdateData) => void>>>(new Map());

  useEffect(() => {
    // 创建全局WebSocket连接
    wsRef.current = createWebSocketService({
      url: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/global`,
      autoReconnect: true,
    });

    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    };
  }, []);

  const subscribeToTask = useCallback((taskId: string, callback: (data: TaskUpdateData) => void) => {
    if (!wsRef.current) {
      console.warn('WebSocket未初始化');
      return () => {};
    }

    // 存储回调函数
    if (!callbacksRef.current.has(taskId)) {
      callbacksRef.current.set(taskId, new Set());
    }
    callbacksRef.current.get(taskId)!.add(callback);

    // 订阅WebSocket消息
    const unsubscribe = wsRef.current.subscribeToTask(taskId, (taskId, data) => {
      // 更新任务状态
      setTaskStatuses(prev => new Map(prev.set(taskId, data)));

      // 更新连接状态
      if (data.status && ['pending', 'running'].includes(data.status)) {
        setConnectedTasks(prev => new Set(prev.add(taskId)));
      } else {
        setConnectedTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
      }

      // 调用回调函数
      const callbacks = callbacksRef.current.get(taskId);
      if (callbacks) {
        callbacks.forEach(cb => {
          try {
            cb(data);
          } catch (error) {
            console.error('执行任务更新回调失败:', error);
          }
        });
      }
    });

    return () => {
      // 移除回调函数
      const callbacks = callbacksRef.current.get(taskId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          callbacksRef.current.delete(taskId);
        }
      }

      unsubscribe();
    };
  }, []);

  const unsubscribeFromTask = useCallback((taskId: string) => {
    callbacksRef.current.delete(taskId);
    setTaskStatuses(prev => {
      const newMap = new Map(prev);
      newMap.delete(taskId);
      return newMap;
    });
    setConnectedTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
  }, []);

  const getTaskStatus = useCallback((taskId: string) => {
    return taskStatuses.get(taskId);
  }, [taskStatuses]);

  const cancelTask = useCallback((taskId: string) => {
    return wsRef.current?.cancelTask(taskId) ?? false;
  }, []);

  return {
    taskStatuses: Object.fromEntries(taskStatuses),
    connectedTasks: Array.from(connectedTasks),
    subscribeToTask,
    unsubscribeFromTask,
    getTaskStatus,
    cancelTask,
    isConnected: wsRef.current?.isConnected() ?? false,
  };
}