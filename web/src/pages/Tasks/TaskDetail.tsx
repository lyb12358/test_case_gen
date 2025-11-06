import React, { useEffect, useState } from 'react';
import {
  Card,
  Typography,
  Tag,
  Button,
  Space,
  Descriptions,
  Progress,
  Alert,
  Spin,
  Empty,
  Timeline,
  Divider
} from 'antd';
import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { taskService } from '../../services/taskService';

const { Title, Text } = Typography;

interface TaskLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}

const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: task, isLoading, error, refetch } = useQuery({
    queryKey: ['taskStatus', id],
    queryFn: () => id ? taskService.getTaskStatus(id) : null,
    enabled: !!id,
    refetchInterval: autoRefresh ? 2000 : false,
  });

  useEffect(() => {
    if (task && (task.status === 'completed' || task.status === 'failed')) {
      setAutoRefresh(false);
    }
  }, [task]);

  const handleBack = () => {
    navigate('/tasks');
  };

  const getTaskTypeText = (taskType: string) => {
    const types = {
      'test_case_generation': '测试用例生成',
      'interface_test_generation': '接口测试生成',
      'data_processing': '数据处理',
      'system_maintenance': '系统维护'
    };
    return types[taskType as keyof typeof types] || taskType;
  };

  const getBusinessTypeFullName = (type?: string) => {
    if (!type) return '-';
    const names: Record<string, string> = {
      'RCC': '远程净化',
      'RFD': '香氛控制',
      'ZAB': '远程恒温座舱设置',
      'ZBA': '水淹报警'
    };
    return names[type] || type;
  };

  const getStatusTag = (status: string) => {
    const statusConfig = {
      'pending': { color: 'orange', text: '等待中', icon: <ClockCircleOutlined /> },
      'running': { color: 'blue', text: '进行中', icon: <LoadingOutlined /> },
      'completed': { color: 'green', text: '已完成', icon: <CheckCircleOutlined /> },
      'failed': { color: 'red', text: '失败', icon: <ExclamationCircleOutlined /> }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  const getTaskLogs = (): TaskLog[] => {
    const logs: TaskLog[] = [];

    if (!task) return logs;

    // Create log based on actual task data
    const createdAt = dayjs(task.created_at);
    const now = dayjs();

    // Initial task creation log
    logs.push({
      timestamp: task.created_at,
      level: 'info',
      message: `任务已创建 - ${getTaskTypeText(task.task_type || '')} (${task.business_type || '未指定业务类型'})`
    });

    // If task is still pending after creation
    if (task.status === 'pending') {
      const elapsedMinutes = now.diff(createdAt, 'minute');
      if (elapsedMinutes > 1) {
        logs.push({
          timestamp: createdAt.add(1, 'minute').toISOString(),
          level: 'info',
          message: '任务在队列中等待执行...'
        });
      }
    }

    // If task is running or completed/failed, it was started
    if (task.status !== 'pending') {
      // Estimate start time (we don't have exact start time, so estimate)
      const estimatedStartTime = createdAt.add(30, 'second');
      logs.push({
        timestamp: estimatedStartTime.toISOString(),
        level: 'info',
        message: '开始执行任务...'
      });

      // Progress logs based on progress percentage
      if (task.progress && task.progress > 0) {
        if (task.progress >= 25) {
          logs.push({
            timestamp: estimatedStartTime.add(1, 'minute').toISOString(),
            level: 'info',
            message: '正在分析业务类型和提示词配置...'
          });
        }
        if (task.progress >= 50) {
          logs.push({
            timestamp: estimatedStartTime.add(2, 'minute').toISOString(),
            level: 'info',
            message: '正在生成测试用例...'
          });
        }
        if (task.progress >= 75) {
          logs.push({
            timestamp: estimatedStartTime.add(3, 'minute').toISOString(),
            level: 'info',
            message: '正在验证和格式化测试用例...'
          });
        }
      }
    }

    // Completion or failure logs
    if (task.status === 'completed') {
      const completedAt = task.updated_at ? dayjs(task.updated_at) : now;
      logs.push({
        timestamp: completedAt.toISOString(),
        level: 'info',
        message: '任务执行完成'
      });

      if (task.test_case_id) {
        logs.push({
          timestamp: completedAt.add(1, 'second').toISOString(),
          level: 'info',
          message: `已生成测试用例组 ID: ${task.test_case_id}`
        });
      }
    }

    if (task.status === 'failed') {
      const failedAt = task.updated_at ? dayjs(task.updated_at) : now;
      logs.push({
        timestamp: failedAt.toISOString(),
        level: 'warning',
        message: '任务执行失败'
      });

      if (task.error || task.message) {
        logs.push({
          timestamp: failedAt.add(1, 'second').toISOString(),
          level: 'error',
          message: task.error || task.message || '未知错误'
        });
      }
    }

    // If task is still running, add current progress
    if (task.status === 'running') {
      logs.push({
        timestamp: now.toISOString(),
        level: 'info',
        message: task.message || `正在执行任务... (${task.progress || 0}%)`
      });
    }

    return logs;
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>加载任务详情中...</div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div>
        <Title level={2}>任务详情</Title>
        <Card>
          <Empty
            description="未找到该任务"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
          <Button type="primary" onClick={handleBack} style={{ marginTop: 16 }}>
            返回列表
          </Button>
        </Card>
      </div>
    );
  }

  const taskLogs = getTaskLogs();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
          >
            返回
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            任务详情
          </Title>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isLoading}
          >
            刷新
          </Button>
          {task.status === 'running' && (
            <Button
              type="primary"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? '停止自动刷新' : '开启自动刷新'}
            </Button>
          )}
        </Space>
      </div>

      <Card>
        <Descriptions
          title="基本信息"
          bordered
          column={2}
          size="small"
        >
          <Descriptions.Item label="任务ID">
            <Text code>#{task.id}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="任务类型">
            {getTaskTypeText(task.task_type || '')}
          </Descriptions.Item>
          <Descriptions.Item label="业务类型">
            {task.business_type ? getBusinessTypeFullName(task.business_type) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            {getStatusTag(task.status)}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dayjs(task.created_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="最后更新">
            {task.updated_at ? dayjs(task.updated_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="进度" span={2}>
            <Progress
              percent={task.progress || 0}
              status={
                task.status === 'completed' ? 'success' :
                task.status === 'failed' ? 'exception' : 'active'
              }
              format={percent => `${percent}%`}
            />
          </Descriptions.Item>
          {task.message && (
            <Descriptions.Item label="状态消息" span={2}>
              <Text>{task.message}</Text>
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider />

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <Text strong>执行日志</Text>
          {autoRefresh && task.status === 'running' && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              <LoadingOutlined /> 实时更新中
            </Tag>
          )}
        </div>

        <Timeline>
          {taskLogs.map((log, index) => (
            <Timeline.Item
              key={index}
              color={
                log.level === 'error' ? 'red' :
                log.level === 'warning' ? 'orange' : 'blue'
              }
            >
              <div>
                <Text style={{ fontSize: '12px', color: '#666' }}>
                  {dayjs(log.timestamp).format('HH:mm:ss')}
                </Text>
                <div style={{ marginTop: 4 }}>
                  <Text>{log.message}</Text>
                </div>
              </div>
            </Timeline.Item>
          ))}
        </Timeline>

        {task.status === 'running' && (
          <Alert
            message="任务执行中"
            description="该任务正在执行中，系统会自动刷新状态。请耐心等待完成。"
            type="info"
            showIcon
            style={{ marginTop: 24 }}
          />
        )}

        {task.status === 'completed' && (
          <Alert
            message="任务完成"
            description={task.result_summary || '任务已成功完成，所有操作都已正常执行。'}
            type="success"
            showIcon
            style={{ marginTop: 24 }}
          />
        )}

        {task.status === 'failed' && (
          <Alert
            message="任务失败"
            description={
              <div>
                <div>{task.error_details || task.message || '任务执行过程中遇到错误'}</div>
                {task.status === 'failed' && (
                  <Button
                    type="link"
                    onClick={() => navigate('/test-cases/generate')}
                    style={{ padding: 0, marginTop: 8 }}
                  >
                    重新创建任务
                  </Button>
                )}
              </div>
            }
            type="error"
            showIcon
            style={{ marginTop: 24 }}
          />
        )}
      </Card>
    </div>
  );
};

export default TaskDetail;