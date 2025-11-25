/**
 * WebSocket服务。
 * 提供实时任务状态更新和通知功能。
 */

import { WebSocketMessage } from '../types/testCases';

// Define TaskStatus locally since it's not exported from testCases
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface WebSocketConfig {
  url: string;
  userId?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface TaskUpdateHandler {
  (taskId: string, data: any): void;
}

export interface ConnectionStatusHandler {
  (connected: boolean): void;
}

export interface ErrorHandler {
  (error: Error): void;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private isManualClose = false;
  private subscriptions = new Map<string, Set<TaskUpdateHandler>>();
  private connectionHandlers: Set<ConnectionStatusHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private pingInterval: number | null = null;

  constructor(config: WebSocketConfig) {
    this.config = {
      autoReconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      ...config,
    };
  }

  /**
   * 连接到WebSocket服务器。
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.buildWebSocketUrl();
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket连接已建立');
          this.reconnectAttempts = 0;
          this.isManualClose = false;
          this.startPingInterval();
          this.notifyConnectionHandlers(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket连接已关闭', event.code, event.reason);
          this.stopPingInterval();
          this.notifyConnectionHandlers(false);

          if (!this.isManualClose && this.config.autoReconnect) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error);
          this.notifyErrorHandlers(new Error('WebSocket连接错误'));
          reject(new Error('WebSocket连接失败'));
        };

      } catch (error) {
        console.error('创建WebSocket连接失败:', error);
        reject(error);
      }
    });
  }

  /**
   * 断开WebSocket连接。
   */
  disconnect(): void {
    this.isManualClose = true;
    this.stopPingInterval();

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'Manual disconnect');
    }

    this.ws = null;
    console.log('WebSocket连接已手动断开');
  }

  /**
   * 订阅任务状态更新。
   */
  subscribeToTask(taskId: string, handler: TaskUpdateHandler): () => void {
    if (!this.subscriptions.has(taskId)) {
      this.subscriptions.set(taskId, new Set());
    }

    this.subscriptions.get(taskId)!.add(handler);

    // 如果已连接，发送订阅消息
    if (this.isConnected()) {
      this.send({
        type: 'subscribe',
        data: { task_id: taskId }
      });
    }

    // 返回取消订阅函数
    return () => {
      const handlers = this.subscriptions.get(taskId);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscriptions.delete(taskId);
          // 发送取消订阅消息
          if (this.isConnected()) {
            this.send({
              type: 'unsubscribe',
              data: { task_id: taskId }
            });
          }
        }
      }
    };
  }

  /**
   * 订阅多个任务的状态更新。
   */
  subscribeToTasks(taskIds: string[], handler: TaskUpdateHandler): () => void {
    const unsubscribes = taskIds.map(taskId =>
      this.subscribeToTask(taskId, handler)
    );

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }

  /**
   * 添加连接状态监听器。
   */
  onConnectionStatusChange(handler: ConnectionStatusHandler): () => void {
    this.connectionHandlers.add(handler);

    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  /**
   * 添加错误监听器。
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);

    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  /**
   * 发送消息。
   */
  send(message: WebSocketMessage): boolean {
    if (!this.isConnected()) {
      console.warn('WebSocket未连接，无法发送消息');
      return false;
    }

    try {
      const messageWithTimestamp = {
        ...message,
        timestamp: new Date().toISOString()
      };

      this.ws!.send(JSON.stringify(messageWithTimestamp));
      return true;
    } catch (error) {
      console.error('发送WebSocket消息失败:', error);
      this.notifyErrorHandlers(error as Error);
      return false;
    }
  }

  /**
   * 取消任务。
   */
  cancelTask(taskId: string): boolean {
    return this.send({
      type: 'cancel_task',
      data: { task_id: taskId }
    });
  }

  /**
   * 发送心跳包。
   */
  ping(): boolean {
    return this.send({
      type: 'ping',
      data: {}
    });
  }

  /**
   * 获取连接状态。
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 获取连接状态字符串。
   */
  getReadyState(): string {
    if (!this.ws) return 'DISCONNECTED';

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  private buildWebSocketUrl(): string {
    const baseUrl = this.config.url;
    const userId = this.config.userId ? `?user_id=${encodeURIComponent(this.config.userId)}` : '';
    return `${baseUrl}${userId}`;
  }

  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      console.log('收到WebSocket消息:', message);

      switch (message.type) {
        case 'task_update':
          this.handleTaskUpdate(message);
          break;

        case 'initial_status':
          this.handleInitialStatus(message);
          break;

        case 'pong':
          // 心跳响应，无需特殊处理
          break;

        case 'connection_established':
          console.log('WebSocket连接已确认');
          break;

        case 'task_subscribed':
          console.log('任务订阅成功:', message.task_id);
          break;

        case 'error':
          this.notifyErrorHandlers(new Error(message.data?.message || '未知错误'));
          break;

        default:
          console.warn('未知的WebSocket消息类型:', message.type);
      }
    } catch (error) {
      console.error('解析WebSocket消息失败:', error);
    }
  }

  private handleTaskUpdate(message: any): void {
    const taskId = message.task_id;
    if (!taskId) return;

    const handlers = this.subscriptions.get(taskId);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(taskId, message.data);
        } catch (error) {
          console.error('执行任务更新处理器失败:', error);
        }
      });
    }
  }

  private handleInitialStatus(message: any): void {
    const taskId = message.task_id;
    const status = message.status;

    if (taskId && status) {
      const handlers = this.subscriptions.get(taskId);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(taskId, status);
          } catch (error) {
            console.error('执行初始状态处理器失败:', error);
          }
        });
      }
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 5)) {
      console.error('达到最大重连次数，停止重连');
      this.notifyErrorHandlers(new Error('WebSocket重连失败'));
      return;
    }

    this.reconnectAttempts++;
    console.log(`尝试重连 (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('重连失败:', error);
      });
    }, this.config.reconnectInterval);
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.ping();
    }, 30000); // 每30秒发送一次心跳
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        console.error('执行连接状态处理器失败:', error);
      }
    });
  }

  private notifyErrorHandlers(error: Error): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (e) {
        console.error('执行错误处理器失败:', e);
      }
    });
  }
}

// 创建WebSocket服务实例
export function createWebSocketService(config: WebSocketConfig): WebSocketService {
  return new WebSocketService(config);
}

// 默认WebSocket配置
export const defaultWebSocketConfig: Partial<WebSocketConfig> = {
  url: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/global`,
  autoReconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
};

// 用于任务特定的WebSocket连接
export function createTaskWebSocketService(taskId: string, config?: Partial<WebSocketConfig>): WebSocketService {
  const finalConfig = {
    url: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/tasks/${taskId}`,
    autoReconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    ...config,
  };

  return new WebSocketService(finalConfig);
}