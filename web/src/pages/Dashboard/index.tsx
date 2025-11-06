import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Button,
  Space,
  Table,
  Tag,
  Alert,
  Progress,
} from 'antd';
import {
  FileTextOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  EyeOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { testCaseService } from '@/services/testCaseService';
import { taskService } from '@/services/taskService';
import { projectService } from '@/services/projectService';
import { useProject } from '@/contexts/ProjectContext';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentProject, projects } = useProject();

  // 获取测试用例数据
  const { data: testCasesData, isLoading: testCasesLoading } = useQuery({
    queryKey: ['testCases'],
    queryFn: testCaseService.getAllTestCases,
    refetchInterval: 30000, // 30秒自动刷新
  });

  // 获取任务数据
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskService.getAllTasks(),
    refetchInterval: 5000, // 5秒自动刷新
  });

  // 获取项目数据
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.getProjects(),
    refetchInterval: 30000, // 30秒自动刷新
  });

  
  // 计算统计数据
  const stats = React.useMemo(() => {
    const testCaseGroups = testCasesData?.test_case_groups || [];
    const tasks = tasksData?.tasks || [];

    // 按业务类型分组测试用例，计算实际测试用例数量
    const businessTypeStats = new Map<string, { count: number; latestUpdate?: string }>();
    testCaseGroups.forEach((group) => {
      const type = group.business_type;
      const actualCount = group.test_case_items?.length || 0; // 获取实际的测试用例数量

      if (!businessTypeStats.has(type)) {
        businessTypeStats.set(type, { count: actualCount, latestUpdate: group.updated_at });
      } else {
        const existing = businessTypeStats.get(type)!;
        existing.count += actualCount; // 累加实际数量
        if (existing.latestUpdate && group.updated_at && group.updated_at > existing.latestUpdate) {
          existing.latestUpdate = group.updated_at;
        }
      }
    });

    const completedTasks = tasks.filter((task) => task.status === 'completed').length;
    const failedTasks = tasks.filter((task) => task.status === 'failed').length;
    const runningTasks = tasks.filter((task) => task.status === 'running').length;

    // 计算总测试用例数量
    const totalTestCases = testCaseGroups.reduce((sum, group) => sum + (group.test_case_items?.length || 0), 0);

    // 项目统计
    const projectStats = projectsData?.projects || [];
    const activeProjects = projectStats.filter(p => p.is_active).length;

    return {
      totalTestCases,
      totalTasks: tasks.length,
      completedTasks,
      failedTasks,
      runningTasks,
      totalProjects: projectStats.length,
      activeProjects,
      businessTypeStats: Array.from(businessTypeStats.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        latestUpdate: data.latestUpdate,
      })),
      recentTasks: tasks.slice(0, 5),
      projects: projectStats,
    };
  }, [testCasesData, tasksData, projectsData]);

  const getTaskSuccessRate = () => {
    if (stats.totalTasks === 0) return 0;
    return Math.round((stats.completedTasks / stats.totalTasks) * 100);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <RocketOutlined />;
      case 'running':
        return <PlayCircleOutlined spin />;
      case 'completed':
        return <CheckCircleOutlined />;
      case 'failed':
        return <ExclamationCircleOutlined />;
      default:
        return <RocketOutlined />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'orange';
      case 'running':
        return 'blue';
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      default:
        return 'gray';
    }
  };

  const formatTaskId = (taskId: string) => {
    return taskId.substring(0, 8) + '...';
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '从未';
    return new Date(dateString).toLocaleString();
  };

  const businessTypeColumns = [
    {
      title: '业务类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: '测试用例数量',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => <Text strong>{count}</Text>,
    },
    {
      title: '最后更新',
      dataIndex: 'latestUpdate',
      key: 'latestUpdate',
      render: (time?: string) => <Text type="secondary">{formatTime(time)}</Text>,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/test-cases?business_type=${record.type}`)}
          >
            查看
          </Button>
          <Button
            type="primary"
            size="small"
            onClick={() => navigate(`/test-cases/generate?business_type=${record.type}`)}
          >
            生成
          </Button>
        </Space>
      ),
    },
  ];

  const recentTasksColumns = [
    {
      title: '任务ID',
      dataIndex: 'task_id',
      key: 'task_id',
      render: (taskId: string) => <Text code>{formatTaskId(taskId)}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: any) => (
        <Space>
          <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
            {status.toUpperCase()}
          </Tag>
          {record.business_type && (
            <Tag color="blue">{record.business_type}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number | undefined, record: any) => (
        progress !== undefined && progress !== null ? (
          <Progress
            percent={progress}
            size="small"
            status={record.status === 'failed' ? 'exception' : 'active'}
          />
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/tasks/${record.task_id}`)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>仪表板</Title>
        <Text type="secondary">TSP 测试用例生成器概览</Text>
      </div>

      {/* 关键指标 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="测试用例总数"
              value={stats.totalTestCases}
              prefix={<FileTextOutlined />}
              loading={testCasesLoading}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="任务总数"
              value={stats.totalTasks}
              prefix={<RocketOutlined />}
              loading={tasksLoading}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="成功率"
              value={getTaskSuccessRate()}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              loading={tasksLoading}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="失败任务"
              value={stats.failedTasks}
              prefix={<ExclamationCircleOutlined />}
              loading={tasksLoading}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 项目统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="项目总数"
              value={stats.totalProjects}
              prefix={<SettingOutlined />}
              loading={projectsLoading}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃项目"
              value={stats.activeProjects}
              prefix={<CheckCircleOutlined />}
              loading={projectsLoading}
              valueStyle={{ color: '#52c41a' }}
              suffix={`/ ${stats.totalProjects}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="当前项目"
              value={currentProject?.name || '未选择'}
              prefix={<SettingOutlined />}
              valueStyle={{
                color: '#722ed1',
                fontSize: '16px'
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Button
                type="primary"
                icon={<SettingOutlined />}
                onClick={() => navigate('/projects')}
                size="large"
              >
                项目管理
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 快速操作 */}
      <Card title="快速操作" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => navigate('/test-cases/generate')}
              style={{ width: '100%' }}
            >
              生成测试用例
            </Button>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Button
              size="large"
              icon={<EyeOutlined />}
              onClick={() => navigate('/test-cases')}
              style={{ width: '100%' }}
            >
              查看测试用例
            </Button>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Button
              size="large"
              icon={<RocketOutlined />}
              onClick={() => navigate('/tasks')}
              style={{ width: '100%' }}
            >
              监控任务
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {/* 业务类型统计 */}
        <Col xs={24} lg={12}>
          <Card
            title="业务类型统计"
            extra={
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => window.location.reload()}
              >
                刷新
              </Button>
            }
          >
            {stats.businessTypeStats.length === 0 ? (
              <Alert
                message="暂无数据"
                description="开始生成测试用例以查看统计信息"
                type="info"
                showIcon
                action={
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => navigate('/test-cases/generate')}
                  >
                    生成测试用例
                  </Button>
                }
              />
            ) : (
              <Table
                dataSource={stats.businessTypeStats}
                columns={businessTypeColumns}
                rowKey="type"
                pagination={false}
                size="small"
              />
            )}
          </Card>
        </Col>

        {/* 最近任务 */}
        <Col xs={24} lg={12}>
          <Card
            title="最近任务"
            extra={
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => navigate('/tasks')}
              >
                查看全部
              </Button>
            }
          >
            {stats.recentTasks.length === 0 ? (
              <Alert
                message="暂无任务"
                description="生成测试用例时将创建任务"
                type="info"
                showIcon
              />
            ) : (
              <Table
                dataSource={stats.recentTasks}
                columns={recentTasksColumns}
                rowKey="task_id"
                pagination={false}
                size="small"
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;