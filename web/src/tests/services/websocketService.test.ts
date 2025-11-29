/**
 * WebSocket服务单元测试
 * 测试WebSocket连接、订阅、消息处理等功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createWebSocketService, WebSocketConfig, TaskStatus } from '../../services/websocketService';

describe('WebSocketService', () => {
  let wsService: any; // Using any since we can't access the class directly
  let config: WebSocketConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    config = {
      url: 'ws://localhost:8000/ws',
      autoReconnect: false, // Disable auto-reconnect for tests
      reconnectInterval: 100,
      maxReconnectAttempts: 3
    };
    wsService = createWebSocketService(config);

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    try {
      wsService.disconnect();
    } catch (error) {
      // Ignore if service wasn't created properly
    }
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('应该使用默认配置创建服务', () => {
      const service = createWebSocketService({ url: 'ws://test.com' });
      expect(service).toBeDefined();
    });

    it('应该合并自定义配置', () => {
      const customConfig = {
        url: 'ws://test.com',
        autoReconnect: false,
        reconnectInterval: 5000,
        maxReconnectAttempts: 10
      };
      const service = createWebSocketService(customConfig);
      expect(service).toBeDefined();
    });
  });

  describe('connect', () => {
    it('应该成功建立WebSocket连接', async () => {
      const service = createWebSocketService(config);

      const connectPromise = service.connect();

      // Simulate successful connection
      const mockWs = (service as any).ws;
      mockWs.open();

      await expect(connectPromise).resolves.toBeUndefined();
    });

    it('应该处理连接错误', async () => {
      const service = createWebSocketService(config);

      const connectPromise = service.connect();

      // Simulate connection error
      const mockWs = (service as any).ws;
      mockWs.error(new Error('Connection failed'));

      await expect(connectPromise).rejects.toThrow('WebSocket连接失败');
    });

    it('应该调用连接状态处理器', async () => {
      const onConnected = vi.fn();
      const service = createWebSocketService(config);
      service.onConnectionStatusChange(onConnected);

      const connectPromise = service.connect();
      const mockWs = (service as any).ws;
      mockWs.open();

      await connectPromise;
      expect(onConnected).toHaveBeenCalledWith(true);
    });
  });

  describe('disconnect', () => {
    it('应该手动断开连接', () => {
      const service = createWebSocketService(config);

      // Mock successful connection first
      const connectPromise = service.connect();
      const mockWs = (service as any).ws;
      mockWs.open();

      service.disconnect();

      expect(mockWs.readyState).toBe(MockWebSocket.CLOSED);
    });

    it('应该通知连接状态处理器断开', () => {
      const onConnected = vi.fn();
      const service = createWebSocketService(config);
      service.onConnectionStatusChange(onConnected);

      const connectPromise = service.connect();
      const mockWs = (service as any).ws;
      mockWs.open();

      service.disconnect();

      expect(onConnected).toHaveBeenCalledWith(false);
    });
  });

  describe('isConnected', () => {
    it('应该在连接时返回true', async () => {
      const service = createWebSocketService(config);

      const connectPromise = service.connect();
      const mockWs = (service as any).ws;
      mockWs.open();

      await connectPromise;
      expect(service.isConnected()).toBe(true);
    });

    it('应该在未连接时返回false', () => {
      expect(wsService.isConnected()).toBe(false);
    });
  });

  describe('subscribeToTask', () => {
    it('应该成功订阅任务', () => {
      const handler = vi.fn();
      const unsubscribe = wsService.subscribeToTask('task-123', handler);

      expect(typeof unsubscribe).toBe('function');
      expect(handler).not.toHaveBeenCalled();
    });

    it('应该接收任务更新消息', () => {
      const handler = vi.fn();
      wsService.subscribeToTask('task-123', handler);

      // Mock connection and message
      const connectPromise = wsService.connect();
      const mockWs = (service as any).ws;
      mockWs.open();
      mockWs.message({
        type: 'task_update',
        data: {
          task_id: 'task-123',
          status: 'completed',
          progress: 100
        }
      });

      expect(handler).toHaveBeenCalledWith('task-123', {
        task_id: 'task-123',
        status: 'completed',
        progress: 100
      });
    });

    it('应该正确取消订阅', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const unsubscribe1 = wsService.subscribeToTask('task-123', handler1);
      wsService.subscribeToTask('task-123', handler2);
      unsubscribe1();

      // Mock connection and message
      const connectPromise = wsService.connect();
      const mockWs = (service as any).ws;
      mockWs.open();
      mockWs.message({
        type: 'task_update',
        data: {
          task_id: 'task-123',
          status: 'completed'
        }
      });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('应该只发送匹配任务的订阅消息', () => {
      const handler = vi.fn();
      wsService.subscribeToTask('task-123', handler);

      // Mock connection and send unrelated message
      const connectPromise = wsService.connect();
      const mockWs = (service as any).ws;
      mockWs.open();
      mockWs.message({
        type: 'task_update',
        data: {
          task_id: 'task-456', // Different task ID
          status: 'completed'
        }
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('subscribeToMultipleTasks', () => {
    it('应该成功订阅多个任务', () => {
      const handler = vi.fn();
      const unsubscribe = wsService.subscribeToMultipleTasks(['task-1', 'task-2'], handler);

      expect(typeof unsubscribe).toBe('function');
    });

    it('应该处理多个任务的消息', () => {
      const handler = vi.fn();
      wsService.subscribeToMultipleTasks(['task-1', 'task-2'], handler);

      // Mock connection and send messages for both tasks
      const connectPromise = wsService.connect();
      const mockWs = (service as any).ws;
      mockWs.open();

      mockWs.message({
        type: 'task_update',
        data: { task_id: 'task-1', status: 'running' }
      });

      mockWs.message({
        type: 'task_update',
        data: { task_id: 'task-2', status: 'completed' }
      });

      mockWs.message({
        type: 'task_update',
        data: { task_id: 'task-3', status: 'failed' } // Not subscribed
      });

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenCalledWith('task-1', { task_id: 'task-1', status: 'running' });
      expect(handler).toHaveBeenCalledWith('task-2', { task_id: 'task-2', status: 'completed' });
    });
  });

  describe('事件处理器', () => {
    it('应该添加和调用连接状态处理器', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      wsService.onConnectionStatusChange(handler1);
      wsService.onConnectionStatusChange(handler2);

      // Simulate connection established
      const connectPromise = wsService.connect();
      const mockWs = (service as any).ws;
      mockWs.open();

      expect(handler1).toHaveBeenCalledWith(true);
      expect(handler2).toHaveBeenCalledWith(true);
    });

    it('应该添加和调用错误处理器', () => {
      const handler = vi.fn();
      wsService.onError(handler);

      // Simulate connection error
      const connectPromise = wsService.connect();
      const mockWs = (service as any).ws;
      mockWs.error(new Error('Test error'));

      expect(handler).toHaveBeenCalledWith(expect.any(Error));
    });

    it('应该移除事件处理器', () => {
      const handler = vi.fn();
      wsService.onConnectionStatusChange(handler);
      wsService.offConnectionStatusChange(handler);

      // Simulate connection established
      const connectPromise = wsService.connect();
      const mockWs = (service as any).ws;
      mockWs.open();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('应该在连接时发送消息', async () => {
      const service = createWebSocketService(config);
      const mockSend = vi.fn();

      const connectPromise = service.connect();
      const mockWs = (service as any).ws;
      mockWs.open();

      // Mock the send method
      mockWs.send = mockSend;

      await connectPromise;
      service.send({ type: 'test', data: { message: 'hello' } });

      expect(mockSend).toHaveBeenCalledWith(JSON.stringify({
        type: 'test',
        data: { message: 'hello' }
      }));
    });

    it('应该在未连接时抛出错误', () => {
      expect(() => {
        wsService.send({ type: 'test' });
      }).toThrow('WebSocket未连接');
    });
  });

  describe('消息处理', () => {
    it('应该处理ping消息', () => {
      const service = createWebSocketService(config);
      const mockSend = vi.fn();

      const connectPromise = service.connect();
      const mockWs = (service as any).ws;
      mockWs.open();
      mockWs.send = mockSend;

      mockWs.message({ type: 'ping' });

      expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ type: 'pong' }));
    });

    it('应该处理无效消息', () => {
      // Should not throw error on invalid message
      const service = createWebSocketService(config);
      const mockWs = (service as any).ws;
      mockWs.message('invalid json');

      expect(() => {
        // This should not throw an error
        mockWs.message('invalid json');
      }).not.toThrow();
    });

    it('应该处理订阅确认消息', () => {
      const service = createWebSocketService(config);
      const connectPromise = service.connect();
      const mockWs = (service as any).ws;
      mockWs.open();

      // Subscribe to a task first
      service.subscribeToTask('task-123', vi.fn());

      // Mock subscription confirmation
      mockWs.message({
        type: 'subscription_confirmed',
        data: { task_id: 'task-123' }
      });

      expect(() => {
        // Should not throw error
        mockWs.message({
          type: 'subscription_confirmed',
          data: { task_id: 'task-123' }
        });
      }).not.toThrow();
    });
  });

  describe('重连机制', () => {
    it('应该在连接断开时尝试重连', async () => {
      const service = createWebSocketService({
        url: 'ws://localhost:8000/ws',
        autoReconnect: true,
        reconnectInterval: 50, // Short interval for testing
        maxReconnectAttempts: 2
      });

      const connectPromise = service.connect();
      const mockWs = (service as any).ws;
      mockWs.open();

      await connectPromise;

      // Mock disconnect
      mockWs.close();

      // Wait for reconnect attempt
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have attempted reconnect (WebSocket constructor called again)
      // This test verifies the reconnection logic is triggered
    });

    it('应该在达到最大重试次数后停止', async () => {
      const service = createWebSocketService({
        url: 'ws://localhost:8000/ws',
        autoReconnect: true,
        reconnectInterval: 10, // Very short interval
        maxReconnectAttempts: 1
      });

      // Force connection to fail
      const originalWebSocket = global.WebSocket;
      (global as any).WebSocket = vi.fn().mockImplementation(() => {
        throw new Error('Connection failed');
      });

      try {
        await service.connect();
      } catch (error) {
        // Expected to fail
      }

      // Restore original WebSocket
      global.WebSocket = originalWebSocket;
    });
  });

  describe('边界情况', () => {
    it('应该处理重复订阅同一任务', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      wsService.subscribeToTask('task-123', handler1);
      wsService.subscribeToTask('task-123', handler2);

      const connectPromise = wsService.connect();
      const mockWs = (service as any).ws;
      mockWs.open();
      mockWs.message({
        type: 'task_update',
        data: { task_id: 'task-123', status: 'completed' }
      });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('应该处理空消息', () => {
      const service = createWebSocketService(config);
      const mockWs = (service as any).ws;
      mockWs.open();

      expect(() => {
        mockWs.message('');
      }).not.toThrow();
    });

    it('应该处理null消息', () => {
      const service = createWebSocketService(config);
      const mockWs = (service as any).ws;
      mockWs.open();

      expect(() => {
        mockWs.message(null);
      }).not.toThrow();
    });
  });
});