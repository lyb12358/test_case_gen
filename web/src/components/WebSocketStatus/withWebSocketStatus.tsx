/**
 * WebSocket状态监控高阶组件
 * 为任何组件提供WebSocket连接状态监控和错误处理能力
 */

import React, { useEffect } from 'react';
import { message, notification } from 'antd';
import { useEnhancedWebSocket } from '../../hooks/useEnhancedWebSocket';
import { WebSocketStatusIndicator } from './WebSocketStatusIndicator';

export interface WithWebSocketStatusOptions {
  showIndicator?: boolean;
  showNotifications?: boolean;
  indicatorPosition?: 'fixed' | 'static';
  minimalIndicator?: boolean;
  onConnectionLost?: () => void;
  onConnectionRestored?: () => void;
  onError?: (error: Error) => void;
  autoReconnect?: boolean;
  connectionTimeout?: number;
}

/**
 * WebSocket状态监控HOC
 *
 * @param Component 要包装的组件
 * @param options 配置选项
 * @returns 增强后的组件
 */
export function withWebSocketStatus<P extends object>(
  Component: React.ComponentType<P>,
  options: WithWebSocketStatusOptions = {}
) {
  const {
    showIndicator = true,
    showNotifications = true,
    indicatorPosition = 'fixed',
    minimalIndicator = false,
    onConnectionLost,
    onConnectionRestored,
    onError,
    autoReconnect = true,
    connectionTimeout = 15000
  } = options;

  return function WebSocketStatusWrapper(props: P) {
    const {
      isConnected,
      connectionState,
      error,
      connectionStats,
      getConnectionHealth
    } = useEnhancedWebSocket({
      autoConnect: autoReconnect,
      showNotifications,
      reconnectNotifications: showNotifications,
      connectionMonitoring: true
    });

    // 连接状态变化处理
    useEffect(() => {
      const wasConnected = isConnected;

      // 连接丢失
      if (!wasConnected && connectionState === 'disconnected') {
        if (showNotifications) {
          message.warning({
            content: 'WebSocket连接已断开，正在尝试重连...',
            key: 'websocket-status',
            duration: 3
          });
        }

        if (onConnectionLost) {
          onConnectionLost();
        }
      }

      // 连接恢复
      if (wasConnected && connectionState === 'connected') {
        if (showNotifications) {
          message.success({
            content: 'WebSocket连接已恢复',
            key: 'websocket-status',
            duration: 2
          });
        }

        if (onConnectionRestored) {
          onConnectionRestored();
        }
      }
    }, [isConnected, connectionState]);

    // 错误处理
    useEffect(() => {
      if (error) {
        console.error('WebSocket连接错误:', error);

        if (showNotifications) {
          notification.error({
            message: 'WebSocket连接错误',
            description: error.message,
            duration: 5,
            key: 'websocket-error'
          });
        }

        if (onError) {
          onError(error);
        }
      }
    }, [error]);

    // 长时间连接失败处理
    useEffect(() => {
      if (connectionState === 'error' || connectionState === 'disconnected') {
        const timeout = setTimeout(() => {
          const health = getConnectionHealth();
          if (health === 'disconnected' && showNotifications) {
            notification.error({
              message: '连接超时',
              description: 'WebSocket连接长时间未建立，请检查网络连接或刷新页面',
              duration: 0, // 不自动关闭
              key: 'websocket-timeout',
              btn: (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  style={{
                    backgroundColor: '#1890ff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 12px',
                    cursor: 'pointer'
                  }}
                >
                  刷新页面
                </button>
              )
            });
          }
        }, connectionTimeout);

        return () => clearTimeout(timeout);
      }
    }, [connectionState, getConnectionHealth, showNotifications, connectionTimeout]);

    return (
      <>
        {/* 原组件 */}
        <Component {...props} />

        {/* WebSocket状态指示器 */}
        {showIndicator && (
          <WebSocketStatusIndicator
            position={indicatorPosition}
            minimal={minimalIndicator}
            showDetails={!minimalIndicator}
            showHealthScore={true}
          />
        )}
      </>
    );
  };
}

/**
 * 使用WebSocket状态监控的自定义Hook
 *
 * @param options 配置选项
 * @returns WebSocket状态和相关功能
 */
export function useWebSocketStatusMonitor(options: WithWebSocketStatusOptions = {}) {
  const {
    showNotifications = true,
    onConnectionLost,
    onConnectionRestored,
    onError
  } = options;

  const {
    isConnected,
    connectionState,
    error,
    connectionStats,
    getConnectionHealth,
    reconnect,
    disconnect
  } = useEnhancedWebSocket({
    autoConnect: true,
    showNotifications,
    reconnectNotifications: showNotifications,
    connectionMonitoring: true
  });

  // 连接状态变化处理
  useEffect(() => {
    switch (connectionState) {
      case 'connected':
        if (onConnectionRestored) {
          onConnectionRestored();
        }
        break;

      case 'disconnected':
      case 'error':
        if (onConnectionLost) {
          onConnectionLost();
        }
        break;
    }
  }, [connectionState, onConnectionLost, onConnectionRestored]);

  // 错误处理
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const forceReconnect = () => {
    disconnect();
    setTimeout(() => {
      reconnect();
    }, 1000);
  };

  const isHealthy = getConnectionHealth() !== 'disconnected' && getConnectionHealth() !== 'poor';

  return {
    isConnected,
    connectionState,
    error,
    connectionStats,
    health: getConnectionHealth(),
    isHealthy,
    forceReconnect,
    reconnect,
    disconnect
  };
}

/**
 * WebSocket连接状态类型守卫
 */
export function isWebSocketError(error: unknown): error is Error & {
  type?: string;
  code?: string;
  context?: any;
} {
  return error instanceof Error;
}

/**
 * 获取WebSocket错误信息
 */
export function getWebSocketErrorMessage(error: unknown): string {
  if (isWebSocketError(error)) {
    return error.message || '未知WebSocket错误';
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'WebSocket连接出现问题';
}

export default withWebSocketStatus;