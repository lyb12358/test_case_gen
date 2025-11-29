/**
 * WebSocket连接状态指示器组件
 * 提供实时的连接状态监控和诊断信息
 */

import React, { useState, useEffect } from 'react';
import { Badge, Tooltip, Button, Space, Typography, Card, Collapse, Progress } from 'antd';
import {
  WifiOutlined,
  DisconnectOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  ReloadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useWebSocketConnectionStatus } from '../../hooks/useEnhancedWebSocket';
import styles from './WebSocketStatusIndicator.module.css';

const { Text } = Typography;
const { Panel } = Collapse;

interface WebSocketStatusIndicatorProps {
  showDetails?: boolean;
  showHealthScore?: boolean;
  position?: 'fixed' | 'static';
  minimal?: boolean;
}

const WebSocketStatusIndicator: React.FC<WebSocketStatusIndicatorProps> = ({
  showDetails = false,
  showHealthScore = true,
  position = 'static',
  minimal = false
}) => {
  const {
    isConnected,
    connectionState,
    error,
    health,
    statusText
  } = useWebSocketConnectionStatus({
    showNotifications: true
  });

  const [expanded, setExpanded] = useState(false);
  const [connectionDuration, setConnectionDuration] = useState(0);

  // 连接时长计时器
  useEffect(() => {
    let interval: number | null = null;

    if (isConnected) {
      setConnectionDuration(0);
      interval = window.setInterval(() => {
        setConnectionDuration(prev => prev + 1);
      }, 1000);
    } else {
      setConnectionDuration(0);
      if (interval) {
        clearInterval(interval);
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isConnected]);

  // 获取状态图标
  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connected':
        return <WifiOutlined className={styles.connectedIcon} />;
      case 'connecting':
      case 'reconnecting':
        return <LoadingOutlined className={styles.connectingIcon} spin />;
      case 'error':
        return <ExclamationCircleOutlined className={styles.errorIcon} />;
      default:
        return <DisconnectOutlined className={styles.disconnectedIcon} />;
    }
  };

  // 获取状态颜色
  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'success';
      case 'connecting':
      case 'reconnecting':
        return 'processing';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  // 获取健康评分颜色
  const getHealthColor = () => {
    switch (health) {
      case 'excellent':
        return '#52c41a';
      case 'good':
        return '#1890ff';
      case 'poor':
        return '#fa8c16';
      default:
        return '#f5222d';
    }
  };

  // 格式化连接时长
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // 简化模式
  if (minimal) {
    return (
      <Tooltip title={`WebSocket: ${statusText}`}>
        <Badge
          count={getStatusIcon()}
          status={getStatusColor() as any}
          className={styles.minimalIndicator}
        />
      </Tooltip>
    );
  }

  // 详细模式
  const detailedContent = (
    <div className={styles.detailedContent}>
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {/* 基础状态 */}
        <div className={styles.statusRow}>
          <Space>
            {getStatusIcon()}
            <Text strong>状态:</Text>
            <Text>{statusText}</Text>
            <Badge status={getStatusColor() as any} />
          </Space>
        </div>

        {/* 连接时长 */}
        {isConnected && connectionDuration > 0 && (
          <div className={styles.statusRow}>
            <Space>
              <Text type="secondary">连接时长:</Text>
              <Text>{formatDuration(connectionDuration)}</Text>
            </Space>
          </div>
        )}

        {/* 健康评分 */}
        {showHealthScore && (
          <div className={styles.statusRow}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space>
                <Text type="secondary">连接健康度:</Text>
                <Text strong style={{ color: getHealthColor() }}>
                  {health === 'excellent' ? '极佳' :
                   health === 'good' ? '良好' :
                   health === 'poor' ? '较差' : '断开'}
                </Text>
              </Space>

              {/* 健康评分进度条 */}
              <Progress
                percent={
                  health === 'excellent' ? 100 :
                  health === 'good' ? 75 :
                  health === 'poor' ? 40 : 0
                }
                showInfo={false}
                strokeColor={getHealthColor()}
                size="small"
              />
            </Space>
          </div>
        )}

        {/* 错误信息 */}
        {error && (
          <div className={styles.statusRow}>
            <Space direction="vertical" size="small">
              <Text type="danger" strong>错误信息:</Text>
              <Text type="secondary" className={styles.errorMessage}>
                {error.message}
              </Text>
            </Space>
          </div>
        )}

        {/* 操作按钮 */}
        <div className={styles.actionRow}>
          <Space>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => window.location.reload()}
            >
              刷新页面
            </Button>
            <Button
              size="small"
              type="link"
              icon={<InfoCircleOutlined />}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? '收起详情' : '查看详情'}
            </Button>
          </Space>
        </div>
      </Space>

      {/* 扩展详情 */}
      {expanded && (
        <Card size="small" className={styles.detailsCard}>
          <Collapse ghost size="small">
            <Panel header="连接诊断信息" key="diagnostic">
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div className={styles.diagnosticRow}>
                  <Text type="secondary">连接状态:</Text>
                  <Text code>{connectionState}</Text>
                </div>
                <div className={styles.diagnosticRow}>
                  <Text type="secondary">健康评级:</Text>
                  <Text code>{health}</Text>
                </div>
                {error && (
                  <div className={styles.diagnosticRow}>
                    <Text type="secondary">错误类型:</Text>
                    <Text code>{error.name}</Text>
                  </div>
                )}
                {navigator.onLine && (
                  <div className={styles.diagnosticRow}>
                    <Text type="secondary">网络状态:</Text>
                    <Text type="success">在线</Text>
                  </div>
                )}
              </Space>
            </Panel>

            <Panel header="连接建议" key="suggestions">
              <ul className={styles.suggestionsList}>
                {connectionState === 'disconnected' && (
                  <>
                    <li>检查网络连接是否正常</li>
                    <li>确认服务器服务正在运行</li>
                    <li>尝试刷新页面重新建立连接</li>
                  </>
                )}
                {connectionState === 'error' && (
                  <>
                    <li>可能是网络不稳定导致</li>
                    <li>系统会自动尝试重连</li>
                    <li>如果问题持续，请联系技术支持</li>
                  </>
                )}
                {health === 'poor' && (
                  <>
                    <li>连接延迟较高，可能影响实时性</li>
                    <li>建议检查网络质量</li>
                    <li>系统仍可正常工作，但响应可能较慢</li>
                  </>
                )}
              </ul>
            </Panel>
          </Collapse>
        </Card>
      )}
    </div>
  );

  // 固定定位模式
  if (position === 'fixed') {
    return (
      <div className={styles.fixedContainer}>
        <Tooltip
          title={showDetails ? undefined : `WebSocket: ${statusText}`}
          placement="left"
        >
          <Card
            size="small"
            className={`${styles.fixedCard} ${expanded ? styles.expanded : ''}`}
            bodyStyle={{ padding: '8px 12px' }}
          >
            {!showDetails ? (
              <Space>
                {getStatusIcon()}
                <Badge status={getStatusColor() as any} />
              </Space>
            ) : (
              detailedContent
            )}
          </Card>
        </Tooltip>
      </div>
    );
  }

  // 静态模式
  return (
    <Card
      size="small"
      className={styles.staticCard}
      title={
        <Space>
          {getStatusIcon()}
          <span>WebSocket连接状态</span>
          <Badge status={getStatusColor() as any} />
        </Space>
      }
      bodyStyle={{ padding: '12px' }}
    >
      {detailedContent}
    </Card>
  );
};

export default WebSocketStatusIndicator;