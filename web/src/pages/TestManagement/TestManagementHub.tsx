import React from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Statistic,
  Alert,
  Divider,
  List,
  Tag,
  Progress,
  Badge
} from 'antd';
import {
  BulbOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  RocketOutlined,
  RightOutlined,
  PlusOutlined,
  EditOutlined,
  PlayCircleOutlined,
  WifiOutlined,
  DisconnectOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProject } from '../../contexts/ProjectContext';
import { unifiedGenerationService } from '../../services';
import { taskService } from '../../services/taskService';
import { useWebSocket } from '../../hooks';

const { Title, Paragraph, Text } = Typography;

interface TestManagementHubProps {}

// 时间格式化函数
const formatTimeAgo = (dateString?: string): string => {
  if (!dateString) return '未知时间';

  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return '刚刚';
  if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
  if (diffInHours < 24) return `${diffInHours}小时前`;
  if (diffInDays < 7) return `${diffInDays}天前`;

  return date.toLocaleDateString('zh-CN');
};

const TestManagementHub: React.FC<TestManagementHubProps> = () => {
  const navigate = useNavigate();
  const { currentProject } = useProject();

  // 如果没有选择项目，显示提示
  if (!currentProject) {
    return (
      <div style={{ padding: '24px' }}>
        <Title level={2}>测试管理中心</Title>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Text type="secondary">请先选择一个项目来查看测试管理概览</Text>
          </div>
        </Card>
      </div>
    );
  }

  // WebSocket连接状态 - 仅监控状态，不主动连接
  const { isConnected, isConnecting, error } = useWebSocket();

  // 获取统计数据
  const { data: testPointsStats } = useQuery({
    queryKey: ['testPointStatistics', { project_id: currentProject?.id }],
    queryFn: () => unifiedGenerationService.getTestPointStatistics(currentProject?.id),
    enabled: !!currentProject?.id
  });

  const { data: testCasesStats } = useQuery({
    queryKey: ['testCaseStatistics', { project_id: currentProject?.id }],
    queryFn: () => unifiedGenerationService.getUnifiedTestCaseStatistics(currentProject?.id),
    enabled: !!currentProject?.id
  });

  // 获取运行中的任务
  const { data: tasksData } = useQuery({
    queryKey: ['tasks', { project_id: currentProject?.id }],
    queryFn: () => taskService.getAllTasks(currentProject?.id),
    enabled: !!currentProject?.id,
    refetchInterval: 10000 // 每10秒刷新任务状态
  });

  // 获取最近活动（从任务历史中获取）
  const { data: recentActivitiesData } = useQuery({
    queryKey: ['recentActivities', { project_id: currentProject?.id }],
    queryFn: async () => {
      if (!currentProject?.id) return [];

      // 从任务数据中提取最近活动
      const tasks = tasksData?.tasks || [];

      // 过滤有效的任务并按创建时间降序排序
      const validTasks = tasks
        .filter(task => task.task_id && (task.status === 'completed' || task.status === 'failed' || task.status === 'running'))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      return validTasks.map(task => {
        // 根据任务状态和业务类型确定活动类型
        let activityType = 'task';
        let actionText = '执行了测试任务';

        if (task.status === 'completed') {
          activityType = 'test_case';
          actionText = '完成了测试任务';
        } else if (task.status === 'failed') {
          activityType = 'task';
          actionText = '任务执行失败';
        } else if (task.status === 'running') {
          activityType = 'batch';
          actionText = '正在执行测试任务';
        }

        return {
          id: task.task_id,
          action: actionText,
          target: task.business_type ? `${task.business_type}相关测试` : '测试任务',
          type: activityType,
          time: formatTimeAgo(task.created_at),
          businessType: task.business_type || 'GEN'
        };
      });
    },
    enabled: !!currentProject?.id && !!tasksData?.tasks,
    refetchInterval: 30000 // 每30秒刷新最近活动
  });

  const stats = {
    testPointsCount: testPointsStats?.total_test_points || 0,
    testCasesCount: testCasesStats?.total_count || 0,
    generationJobsRunning: tasksData?.tasks?.filter(task => task.status === 'running' || task.status === 'pending').length || 0,
    completionRate: testCasesStats?.test_case_count && testCasesStats?.total_count
      ? Math.round((testCasesStats.test_case_count / testCasesStats.total_count) * 100)
      : 0
  };

  const features = [
    {
      title: '统一测试用例管理',
      description: '统一的测试点和测试用例管理界面，支持一对一转换和灵活创建',
      icon: <ExperimentOutlined style={{ fontSize: '32px', color: '#722ed1' }} />,
      path: '/test-management/unified',
      stats: `${stats.testPointsCount + stats.testCasesCount} 条记录`,
      color: '#722ed1'
    },
    {
      title: '批量生成',
      description: '智能批量生成测试点和测试用例，支持自定义业务类型',
      icon: <RocketOutlined style={{ fontSize: '32px', color: '#fa8c16' }} />,
      path: '/test-management/generate',
      stats: `${stats.completionRate}% 完成率`,
      color: '#fa8c16'
    }
  ];

  const recentActivities = recentActivitiesData || [];

  const quickActions = [
    {
      title: '统一测试管理',
      description: '打开统一的测试用例管理界面',
      icon: <ExperimentOutlined />,
      action: () => navigate('/test-management/unified')
    },
    {
      title: 'AI生成测试用例',
      description: '基于现有测试点生成测试用例',
      icon: <PlayCircleOutlined />,
      action: () => navigate('/test-management/generate')
    }
  ];

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'test_point':
        return <BulbOutlined style={{ color: '#1890ff' }} />;
      case 'test_case':
        return <FileTextOutlined style={{ color: '#52c41a' }} />;
      case 'batch':
        return <RocketOutlined style={{ color: '#fa8c16' }} />;
      default:
        return <EditOutlined />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'test_point':
        return 'blue';
      case 'test_case':
        return 'green';
      case 'batch':
        return 'orange';
      default:
        return 'default';
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>测试管理中心</Title>
          <Paragraph type="secondary" style={{ margin: 0, marginTop: '8px' }}>
            统一的测试点与测试用例管理平台，支持手动编写和AI智能生成
          </Paragraph>
        </div>

        {/* WebSocket连接状态指示器 */}
        <Card size="small" style={{ width: '220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {isConnected ? (
                <Badge status="success" />
              ) : isConnecting ? (
                <Badge status="processing" />
              ) : error ? (
                <Badge status="error" />
              ) : (
                <Badge status="default" />
              )}
              <span style={{ marginLeft: '8px', fontSize: '12px' }}>
                {isConnected ? '实时监控' : isConnecting ? '连接中...' : error ? '连接异常' : '待连接'}
              </span>
            </div>
            {isConnected ? (
              <WifiOutlined style={{ color: '#52c41a', fontSize: '14px' }} />
            ) : (
              <DisconnectOutlined style={{ color: '#8c8c8c', fontSize: '14px' }} />
            )}
          </div>
          {stats.generationJobsRunning > 0 && (
            <div style={{ marginTop: '4px', fontSize: '11px', color: '#666' }}>
              {stats.generationJobsRunning} 个任务运行中
            </div>
          )}
        </Card>
      </div>

      {/* 统计数据概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="测试点总数"
              value={stats.testPointsCount}
              prefix={<BulbOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="测试用例总数"
              value={stats.testCasesCount}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="运行中任务"
              value={stats.generationJobsRunning}
              prefix={<RocketOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                完成率
              </div>
              <Progress
                percent={stats.completionRate}
                status="active"
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068'
                }}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 快速操作 */}
      <Card title="快速操作" style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          {quickActions.map((action, index) => (
            <Col span={8} key={index}>
              <Card
                hoverable
                style={{ textAlign: 'center', cursor: 'pointer' }}
                bodyStyle={{ padding: '24px' }}
                onClick={action.action}
              >
                <div style={{ fontSize: '32px', marginBottom: '12px', color: '#1890ff' }}>
                  {action.icon}
                </div>
                <Title level={5}>{action.title}</Title>
                <Text type="secondary">{action.description}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 核心功能入口 */}
      <Card title="核心功能" style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          {features.map((feature, index) => (
            <Col span={8} key={index}>
              <Card
                hoverable
                style={{ height: '200px', cursor: 'pointer' }}
                bodyStyle={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                onClick={() => navigate(feature.path)}
              >
                <div>
                  <div style={{ marginBottom: '16px' }}>{feature.icon}</div>
                  <Title level={4}>{feature.title}</Title>
                  <Paragraph style={{ margin: 0, fontSize: '14px', lineHeight: '1.4' }}>
                    {feature.description}
                  </Paragraph>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Tag color={feature.color}>{feature.stats}</Tag>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 最近活动 */}
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="最近活动" style={{ height: '300px' }}>
            <List
              dataSource={recentActivities}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button type="link" size="small">
                      查看详情
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={getActionIcon(item.type)}
                    title={item.action}
                    description={
                      <Space split>
                        <Text strong>{item.target}</Text>
                        <Tag color={getActionColor(item.type)}>
                          {item.businessType}
                        </Tag>
                        <Text type="secondary">{item.time}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="使用指南" style={{ height: '300px' }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Alert
                message="开始使用"
                description={
                  <div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>1. 统一管理（推荐）</strong>：使用统一界面管理测试点和测试用例，支持一对一转换
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>2. 创建测试点</strong>：手动编写或使用AI生成基础测试点
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>3. 转换为测试用例</strong>：将测试点一对一转换为完整的测试用例
                    </div>
                    <div>
                      <strong>4. 批量操作</strong>：支持批量生成和导入导出
                    </div>
                  </div>
                }
                type="info"
                showIcon
              />

              <div style={{ padding: '12px', backgroundColor: '#f9f0ff', borderRadius: '6px' }}>
                <Text strong>✨ 新功能</Text>
                <div style={{ marginTop: '8px', fontSize: '14px' }}>
                  <strong>统一测试用例管理</strong>：测试点和测试用例是同一数据的不同阶段，支持无缝转换，使用专业图标界面。
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TestManagementHub;