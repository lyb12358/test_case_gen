/**
 * 系统状态面板组件
 * 提供实时系统状态监控和用户友好的反馈
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Badge,
  Space,
  Typography,
  Alert,
  Button,
  Tooltip,
  List,
  Tag,
  Divider
} from 'antd';
import {
  CloudOutlined,
  DatabaseOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useWebSocketConnectionStatus } from '../../hooks/useEnhancedWebSocket';
import { unifiedGenerationService } from '../../services';
import styles from './SystemStatusPanel.module.css';

const { Text, Title } = Typography;

interface SystemStatus {
  api: {
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
    lastCheck: number;
  };
  database: {
    status: 'connected' | 'disconnected';
    connectionCount: number;
  };
  websocket: {
    status: 'connected' | 'disconnected' | 'reconnecting';
    health: string;
  };
  generation: {
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageDuration: number;
  };
}

export const SystemStatusPanel: React.FC<{
  compact?: boolean;
  showDetails?: boolean;
  refreshInterval?: number;
}> = ({ compact = false, showDetails = true, refreshInterval = 30000 }) => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    api: { status: 'warning', responseTime: 0, lastCheck: Date.now() },
    database: { status: 'disconnected', connectionCount: 0 },
    websocket: { status: 'disconnected', health: 'unknown' },
    generation: { activeTasks: 0, completedTasks: 0, failedTasks: 0, averageDuration: 0 }
  });

  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
  }>>([]);

  const {
    isConnected,
    connectionState,
    health,
    statusText
  } = useWebSocketConnectionStatus({
    showNotifications: false
  });

  // 检查API健康状态
  const checkApiHealth = async () => {
    try {
      const startTime = Date.now();
      await unifiedGenerationService.healthCheck();
      const responseTime = Date.now() - startTime;

      setSystemStatus(prev => ({
        ...prev,
        api: {
          status: responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'warning' : 'error',
          responseTime,
          lastCheck: Date.now()
        }
      }));

      return { success: true, responseTime };
    } catch (error) {
      setSystemStatus(prev => ({
        ...prev,
        api: {
          status: 'error',
          responseTime: 0,
          lastCheck: Date.now()
        }
      }));

      addAlert('error', `API连接失败: ${(error as Error).message}`);
      return { success: false, error };
    }
  };

  // 获取生成任务统计
  const fetchGenerationStats = async () => {
    try {
      const stats = await unifiedGenerationService.getGenerationStatistics();
      setSystemStatus(prev => ({
        ...prev,
        generation: {
          activeTasks: stats.active_tasks || 0,
          completedTasks: stats.completed_tasks || 0,
          failedTasks: stats.failed_tasks || 0,
          averageDuration: stats.average_duration || 0
        }
      }));
    } catch (error) {
      console.error('获取生成统计失败:', error);
    }
  };

  // 添加告警
  const addAlert = (type: 'error' | 'warning' | 'info', message: string) => {
    const newAlert = {
      type,
      message,
      timestamp: Date.now()
    };

    setAlerts(prev => {
      const updated = [newAlert, ...prev];
      // 只保留最近10条告警
      return updated.slice(0, 10);
    });

    // 5秒后自动移除info类型的告警
    if (type === 'info') {
      setTimeout(() => {
        setAlerts(prev => prev.filter(alert => alert.timestamp !== newAlert.timestamp));
      }, 5000);
    }
  };

  // 刷新所有状态
  const refreshStatus = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        checkApiHealth(),
        fetchGenerationStats()
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // 定期刷新
  useEffect(() => {
    refreshStatus();

    const interval = setInterval(refreshStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // 更新WebSocket状态
  useEffect(() => {
    setSystemStatus(prev => ({
      ...prev,
      websocket: {
        status: isConnected ? 'connected' : connectionState === 'reconnecting' ? 'reconnecting' : 'disconnected',
        health
      }
    }));

    // WebSocket状态变化告警
    if (!isConnected && connectionState === 'disconnected') {
      addAlert('warning', 'WebSocket连接已断开，正在尝试重连...');
    } else if (isConnected && connectionState === 'connected') {
      addAlert('info', 'WebSocket连接已恢复');
    }
  }, [isConnected, connectionState, health]);

  // 获取状态图标和颜色
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning':
      case 'reconnecting':
        return <WarningOutlined style={{ color: '#fa8c16' }} />;
      case 'error':
      case 'disconnected':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return '#52c41a';
      case 'warning':
      case 'reconnecting':
        return '#fa8c16';
      case 'error':
      case 'disconnected':
        return '#ff4d4f';
      default:
        return '#1890ff';
    }
  };

  // 紧凑模式
  if (compact) {
    return (
      <Card size="small" className={styles.compactPanel}>
        <Row gutter={[16, 8]} align="middle">
          <Col span={6}>
            <Space>
              {getStatusIcon(systemStatus.api.status)}
              <Tooltip title="API状态">
                <Text style={{ color: getStatusColor(systemStatus.api.status) }}>
                  API
                </Text>
              </Tooltip>
            </Space>
          </Col>
          <Col span={6}>
            <Space>
              <DatabaseOutlined />
              <Text>DB</Text>
            </Space>
          </Col>
          <Col span={6}>
            <Space>
              <ApiOutlined />
              <Text style={{ color: getStatusColor(systemStatus.websocket.status) }}>
                WS
              </Text>
            </Space>
          </Col>
          <Col span={6}>
            <Space>
              <ThunderboltOutlined />
              <Text>{systemStatus.generation.activeTasks}</Text>
            </Space>
          </Col>
        </Row>
      </Card>
    );
  }

  // 详细模式
  return (
    <div className={styles.systemStatusPanel}>
      {/* 告警区域 */}
      {alerts.length > 0 && (
        <div className={styles.alertsSection}>
          {alerts.map((alert, index) => (
            <Alert
              key={alert.timestamp}
              message={alert.message}
              type={alert.type}
              showIcon
              closable
              style={{ marginBottom: '8px' }}
              onClose={() => {
                setAlerts(prev => prev.filter(a => a.timestamp !== alert.timestamp));
              }}
            />
          ))}
        </div>
      )}

      {/* 系统状态概览 */}
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="API状态"
              value={systemStatus.api.status === 'healthy' ? '正常' :
                     systemStatus.api.status === 'warning' ? '警告' : '异常'}
              prefix={getStatusIcon(systemStatus.api.status)}
              valueStyle={{
                color: getStatusColor(systemStatus.api.status)
              }}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                响应时间: {systemStatus.api.responseTime}ms
              </Text>
            </div>
          </Card>
        </Col>

        <Col span={6}>
          <Card>
            <Statistic
              title="数据库"
              value={systemStatus.database.status === 'connected' ? '已连接' : '断开'}
              prefix={<DatabaseOutlined />}
              valueStyle={{
                color: systemStatus.database.status === 'connected' ? '#52c41a' : '#ff4d4f'
              }}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                连接数: {systemStatus.database.connectionCount}
              </Text>
            </div>
          </Card>
        </Col>

        <Col span={6}>
          <Card>
            <Statistic
              title="WebSocket"
              value={statusText}
              prefix={<ApiOutlined />}
              valueStyle={{
                color: getStatusColor(systemStatus.websocket.status)
              }}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                健康度: {health}
              </Text>
            </div>
          </Card>
        </Col>

        <Col span={6}>
          <Card>
            <Statistic
              title="生成任务"
              value={systemStatus.generation.activeTasks}
              prefix={<ThunderboltOutlined />}
              suffix="/ 活跃"
              valueStyle={{
                color: systemStatus.generation.activeTasks > 0 ? '#1890ff' : '#52c41a'
              }}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                完成: {systemStatus.generation.completedTasks} | 失败: {systemStatus.generation.failedTasks}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {showDetails && (
        <>
          <Divider />

          {/* 详细统计 */}
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card title="系统性能" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text>API响应时间趋势</Text>
                    <Progress
                      percent={Math.min(100, (3000 - systemStatus.api.responseTime) / 30)}
                      showInfo={false}
                      strokeColor={
                        systemStatus.api.responseTime < 1000 ? '#52c41a' :
                        systemStatus.api.responseTime < 3000 ? '#fa8c16' : '#ff4d4f'
                      }
                      size="small"
                    />
                  </div>

                  <div>
                    <Text>任务完成率</Text>
                    <Progress
                      percent={systemStatus.generation.completedTasks + systemStatus.generation.failedTasks > 0 ?
                        (systemStatus.generation.completedTasks / (systemStatus.generation.completedTasks + systemStatus.generation.failedTasks)) * 100 : 0}
                      showInfo={true}
                      format={(percent) => `${percent?.toFixed(1)}%`}
                      size="small"
                    />
                  </div>

                  <div>
                    <Text>平均任务时长</Text>
                    <Text strong style={{ float: 'right' }}>
                      {(systemStatus.generation.averageDuration / 1000).toFixed(2)}s
                    </Text>
                  </div>
                </Space>
              </Card>
            </Col>

            <Col span={12}>
              <Card
                title={
                  <Space>
                    <ClockCircleOutlined />
                    最近活动
                  </Space>
                }
                size="small"
                extra={
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    loading={refreshing}
                    onClick={refreshStatus}
                  >
                    刷新
                  </Button>
                }
              >
                <List
                  size="small"
                  dataSource={[
                    { text: `API健康检查`, time: new Date(systemStatus.api.lastCheck).toLocaleTimeString() },
                    { text: `WebSocket状态: ${statusText}`, time: '刚刚' },
                    { text: `活跃任务: ${systemStatus.generation.activeTasks}`, time: '刚刚' },
                    { text: '系统状态已更新', time: '刚刚' }
                  ]}
                  renderItem={(item, index) => (
                    <List.Item key={index}>
                      <Space>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: index === 0 ? '#52c41a' : '#1890ff'
                        }} />
                        <Text style={{ fontSize: '12px' }}>{item.text}</Text>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {item.time}
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* 系统状态标签 */}
      <div className={styles.statusTags}>
        <Space wrap>
          <Tag color={getStatusColor(systemStatus.api.status)}>
            API: {systemStatus.api.status}
          </Tag>
          <Tag color={getStatusColor(systemStatus.database.status)}>
            数据库: {systemStatus.database.status}
          </Tag>
          <Tag color={getStatusColor(systemStatus.websocket.status)}>
            WebSocket: {systemStatus.websocket.status}
          </Tag>
          <Tag color={systemStatus.generation.activeTasks > 0 ? 'blue' : 'green'}>
            任务: {systemStatus.generation.activeTasks} 活跃
          </Tag>
        </Space>
      </div>
    </div>
  );
};

export default SystemStatusPanel;