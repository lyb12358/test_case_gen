import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Progress,
  Steps,
  Timeline,
  Typography,
  Space,
  Tag,
  Button,
  Modal,
  Descriptions,
  Alert,
  Spin,
  Row,
  Col,
  Statistic,
  Tooltip,
  Badge,
  List,
  message
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  WarningOutlined,
  LoadingOutlined,
  InfoCircleOutlined,
  EyeOutlined,
  CloseOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

export interface GenerationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: string;
  endTime?: string;
  duration?: number;
  progress?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface GenerationTask {
  id: string;
  title: string;
  type: 'test_point_generation' | 'test_case_generation' | 'batch_generation';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  startTime: string;
  endTime?: string;
  totalSteps: number;
  currentStep: number;
  steps: GenerationStep[];
  statistics?: {
    total: number;
    successful: number;
    failed: number;
    processed: number;
    estimated_total?: number;
  };
  config?: Record<string, any>;
  logs?: Array<{
    timestamp: string;
    level: 'info' | 'warning' | 'error' | 'success';
    message: string;
  }>;
}

interface GenerationProgressProps {
  task: GenerationTask;
  visible?: boolean;
  closable?: boolean;
  onCancel?: () => void;
  onViewDetails?: (task: GenerationTask) => void;
  onRetry?: (taskId: string) => void;
  onPause?: (taskId: string) => void;
  onResume?: (taskId: string) => void;
  onCancelTask?: (taskId: string) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showLogs?: boolean;
  showStatistics?: boolean;
  compact?: boolean;
}

const GenerationProgress: React.FC<GenerationProgressProps> = ({
  task,
  visible = true,
  closable = true,
  onCancel,
  onViewDetails,
  onRetry,
  onPause,
  onResume,
  onCancelTask,
  autoRefresh = true,
  refreshInterval = 2000,
  showLogs = true,
  showStatistics = true,
  compact = false
}) => {
  const [expandedLogs, setExpandedLogs] = useState(false);
  const [taskState, setTaskState] = useState(task);

  // Update local state when prop changes
  useEffect(() => {
    setTaskState(task);
  }, [task]);

  // Auto refresh functionality
  useEffect(() => {
    if (!autoRefresh || taskState.status !== 'running') return;

    const interval = setInterval(() => {
      // In a real implementation, this would fetch updated task status from API
      // For now, we'll just simulate progress updates
      setTaskState(prev => {
        if (prev.status !== 'running') return prev;

        // Simulate progress advancement
        const currentStepIndex = prev.steps.findIndex(step => step.status === 'running');
        if (currentStepIndex === -1) return prev;

        const updatedSteps = [...prev.steps];
        const currentStep = updatedSteps[currentStepIndex];

        // Simulate progress increase
        const newProgress = Math.min((currentStep.progress || 0) + Math.random() * 15, 95);
        currentStep.progress = newProgress;

        // Check if step should be completed
        if (newProgress >= 95) {
          currentStep.status = 'completed';
          currentStep.progress = 100;
          currentStep.endTime = new Date().toISOString();

          // Start next step if available
          if (currentStepIndex < updatedSteps.length - 1) {
            updatedSteps[currentStepIndex + 1].status = 'running';
            updatedSteps[currentStepIndex + 1].startTime = new Date().toISOString();
          }
        }

        return {
          ...prev,
          steps: updatedSteps,
          currentStep: updatedSteps.findIndex(step => step.status === 'running') + 1 || prev.totalSteps
        };
      });
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, taskState.status]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'processing';
      case 'failed': return 'error';
      case 'cancelled': return 'default';
      case 'paused': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleOutlined />;
      case 'running': return <SyncOutlined spin />;
      case 'failed': return <WarningOutlined />;
      case 'cancelled': return <StopOutlined />;
      case 'paused': return <PauseCircleOutlined />;
      default: return <ClockCircleOutlined />;
    }
  };

  const formatDuration = (startTime?: string, endTime?: string) => {
    if (!startTime) return '-';

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

    if (duration < 60) return `${duration}秒`;
    if (duration < 3600) return `${Math.floor(duration / 60)}分${duration % 60}秒`;
    return `${Math.floor(duration / 3600)}时${Math.floor((duration % 3600) / 60)}分`;
  };

  const getOverallProgress = useCallback(() => {
    const totalSteps = taskState.steps.length;
    const completedSteps = taskState.steps.filter(step => step.status === 'completed').length;
    const runningSteps = taskState.steps.filter(step => step.status === 'running');

    let progress = (completedSteps / totalSteps) * 100;

    // Add partial progress for running step
    if (runningSteps.length > 0) {
      const runningProgress = runningSteps[0].progress || 0;
      progress += (runningProgress / totalSteps);
    }

    return Math.round(progress);
  }, [taskState.steps]);

  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry(taskState.id);
    }
  }, [onRetry, taskState.id]);

  const handlePause = useCallback(() => {
    if (onPause) {
      onPause(taskState.id);
    }
  }, [onPause, taskState.id]);

  const handleResume = useCallback(() => {
    if (onResume) {
      onResume(taskState.id);
    }
  }, [onResume, taskState.id]);

  const handleCancelTask = useCallback(() => {
    if (onCancelTask) {
      onCancelTask(taskState.id);
    }
  }, [onCancelTask, taskState.id]);

  const handleViewDetails = useCallback(() => {
    if (onViewDetails) {
      onViewDetails(taskState);
    }
  }, [onViewDetails, taskState]);

  const renderCompactProgress = () => (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Row gutter={16} align="middle">
        <Col flex="auto">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>{taskState.title}</Text>
              <Tag color={getStatusColor(taskState.status)} style={{ marginLeft: 8 }}>
                {taskState.status}
              </Tag>
            </div>
            <Progress
              percent={getOverallProgress()}
              status={taskState.status === 'failed' ? 'exception' :
                     taskState.status === 'completed' ? 'success' :
                     taskState.status === 'running' ? 'active' : 'normal'}
              size="small"
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              步骤 {taskState.currentStep}/{taskState.totalSteps}
            </Text>
          </Space>
        </Col>
        <Col>
          <Space>
            {taskState.status === 'running' && onPause && (
              <Tooltip title="暂停">
                <Button icon={<PauseCircleOutlined />} size="small" onClick={handlePause} />
              </Tooltip>
            )}
            {taskState.status === 'paused' && onResume && (
              <Tooltip title="继续">
                <Button icon={<PlayCircleOutlined />} size="small" onClick={handleResume} />
              </Tooltip>
            )}
            {taskState.status === 'failed' && onRetry && (
              <Tooltip title="重试">
                <Button icon={<ReloadOutlined />} size="small" onClick={handleRetry} />
              </Tooltip>
            )}
            {onViewDetails && (
              <Tooltip title="查看详情">
                <Button icon={<EyeOutlined />} size="small" onClick={handleViewDetails} />
              </Tooltip>
            )}
            {closable && onCancel && (
              <Button icon={<CloseOutlined />} size="small" onClick={onCancel} />
            )}
          </Space>
        </Col>
      </Row>
    </Card>
  );

  const renderDetailedProgress = () => (
    <Modal
      title={
        <Space>
          <LoadingOutlined spin={taskState.status === 'running'} />
          <span>{taskState.title}</span>
          <Tag color={getStatusColor(taskState.status)}>
            {taskState.status}
          </Tag>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Space key="actions">
          {taskState.status === 'running' && onPause && (
            <Button icon={<PauseCircleOutlined />} onClick={handlePause}>
              暂停
            </Button>
          )}
          {taskState.status === 'paused' && onResume && (
            <Button icon={<PlayCircleOutlined />} onClick={handleResume}>
              继续
            </Button>
          )}
          {taskState.status === 'failed' && onRetry && (
            <Button icon={<ReloadOutlined />} onClick={handleRetry}>
              重试
            </Button>
          )}
          {['running', 'paused'].includes(taskState.status) && onCancelTask && (
            <Button icon={<StopOutlined />} onClick={handleCancelTask}>
              取消任务
            </Button>
          )}
          {onViewDetails && (
            <Button icon={<EyeOutlined />} onClick={handleViewDetails}>
              查看详情
            </Button>
          )}
          {closable && onCancel && (
            <Button onClick={onCancel}>
              关闭
            </Button>
          )}
        </Space>
      ]}
    >
      {/* Overall Progress */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={16}>
            <Progress
              percent={getOverallProgress()}
              status={taskState.status === 'failed' ? 'exception' :
                     taskState.status === 'completed' ? 'success' :
                     taskState.status === 'running' ? 'active' : 'normal'}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#52c41a',
              }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">
                整体进度: {taskState.currentStep}/{taskState.totalSteps} 步骤
              </Text>
              {taskState.startTime && (
                <Text type="secondary" style={{ marginLeft: 16 }}>
                  运行时间: {formatDuration(taskState.startTime, taskState.endTime)}
                </Text>
              )}
            </div>
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            {showStatistics && taskState.statistics && (
              <Space direction="vertical" size="small">
                <Statistic
                  title="处理数量"
                  value={taskState.statistics.processed}
                  suffix={`/ ${taskState.statistics.total}`}
                  valueStyle={{ fontSize: 16 }}
                />
                <div>
                  <Badge count={taskState.statistics.successful} style={{ backgroundColor: '#52c41a' }} />
                  <Text style={{ marginLeft: 8 }}>成功</Text>
                  {taskState.statistics.failed > 0 && (
                    <>
                      <Badge count={taskState.statistics.failed} style={{ backgroundColor: '#ff4d4f', marginLeft: 16 }} />
                      <Text style={{ marginLeft: 8 }}>失败</Text>
                    </>
                  )}
                </div>
              </Space>
            )}
          </Col>
        </Row>
      </Card>

      {/* Steps Progress */}
      <Card title="执行步骤" size="small" style={{ marginBottom: 16 }}>
        <Timeline>
          {taskState.steps.map((step, index) => (
            <Timeline.Item
              key={step.id}
              color={step.status === 'completed' ? 'green' :
                     step.status === 'running' ? 'blue' :
                     step.status === 'failed' ? 'red' :
                     step.status === 'skipped' ? 'gray' : 'gray'}
              dot={getStatusIcon(step.status)}
            >
              <div>
                <Text strong>{step.title}</Text>
                {step.error && (
                  <Tooltip title={step.error}>
                    <WarningOutlined style={{ color: '#ff4d4f', marginLeft: 8 }} />
                  </Tooltip>
                )}
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary">{step.description}</Text>
                </div>

                {step.status === 'running' && step.progress !== undefined && (
                  <div style={{ marginTop: 8 }}>
                    <Progress
                      percent={step.progress}
                      size="small"
                      status="active"
                      style={{ width: '80%' }}
                    />
                  </div>
                )}

                <div style={{ marginTop: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {step.startTime && `开始: ${new Date(step.startTime).toLocaleTimeString()}`}
                    {step.endTime && ` • 完成: ${new Date(step.endTime).toLocaleTimeString()}`}
                    {step.duration && ` • 耗时: ${formatDuration(step.startTime, step.endTime)}`}
                  </Text>
                </div>
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      </Card>

      {/* Logs Section */}
      {showLogs && taskState.logs && taskState.logs.length > 0 && (
        <Card
          title={
            <Space>
              <span>执行日志</span>
              <Button
                type="link"
                size="small"
                onClick={() => setExpandedLogs(!expandedLogs)}
              >
                {expandedLogs ? '收起' : '展开'}
              </Button>
            </Space>
          }
          size="small"
        >
          <List
            size="small"
            dataSource={expandedLogs ? taskState.logs : taskState.logs.slice(-5)}
            renderItem={(log) => (
              <List.Item>
                <Space>
                  <Tag color={
                    log.level === 'error' ? 'red' :
                    log.level === 'warning' ? 'orange' :
                    log.level === 'success' ? 'green' : 'blue'
                  }>
                    {log.level.toUpperCase()}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </Text>
                  <Text>{log.message}</Text>
                </Space>
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Configuration Info */}
      {taskState.config && (
        <Card title="配置信息" size="small">
          <Descriptions column={2} size="small">
            {Object.entries(taskState.config).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>
      )}
    </Modal>
  );

  if (compact) {
    return renderCompactProgress();
  }

  return renderDetailedProgress();
};

export default GenerationProgress;