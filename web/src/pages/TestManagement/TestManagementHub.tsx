import React, { useEffect } from 'react';
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
import { useWebSocket } from '../../hooks';

const { Title, Paragraph, Text } = Typography;

interface TestManagementHubProps {}

const TestManagementHub: React.FC<TestManagementHubProps> = () => {
  const navigate = useNavigate();
  const { currentProject } = useProject();

  // WebSocket连接状态
  const { isConnected, isConnecting, error, connect } = useWebSocket();

  // 自动连接WebSocket
  useEffect(() => {
    if (!isConnected && !isConnecting && !error) {
      connect().catch(console.error);
    }
  }, [isConnected, isConnecting, error, connect]);

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

  const stats = {
    testPointsCount: testPointsStats?.total_test_points || 0,
    testCasesCount: testCasesStats?.total_count || 0,
    generationJobsRunning: 0, // TODO: 从任务管理API获取
    completionRate: testCasesStats?.test_case_count && testCasesStats?.total_count
      ? Math.round((testCasesStats.test_case_count / testCasesStats.total_count) * 100)
      : 0
  };

  const features = [
    {
      title: '测试点管理',
      description: '手动创建或AI生成测试点，支持批量操作和模板管理',
      icon: <BulbOutlined style={{ fontSize: '32px', color: '#1890ff' }} />,
      path: '/test-management/points',
      stats: `${stats.testPointsCount} 个测试点`,
      color: '#1890ff'
    },
    {
      title: '测试用例管理',
      description: '基于测试点创建详细测试用例，支持手动编写和AI生成',
      icon: <FileTextOutlined style={{ fontSize: '32px', color: '#52c41a' }} />,
      path: '/test-management/cases',
      stats: `${stats.testCasesCount} 个测试用例`,
      color: '#52c41a'
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

  const recentActivities = [
    {
      id: 1,
      action: '生成了测试点',
      target: '登录功能测试点',
      type: 'test_point',
      time: '5分钟前',
      businessType: 'RCC'
    },
    {
      id: 2,
      action: '更新了测试用例',
      target: '支付流程测试用例',
      type: 'test_case',
      time: '15分钟前',
      businessType: 'RPP'
    },
    {
      id: 3,
      action: '批量生成完成',
      target: '用户管理模块测试',
      type: 'batch',
      time: '1小时前',
      businessType: 'RSM'
    }
  ];

  const quickActions = [
    {
      title: '快速创建测试点',
      description: '立即创建新的测试点',
      icon: <PlusOutlined />,
      action: () => navigate('/test-management/points?action=create')
    },
    {
      title: 'AI生成测试用例',
      description: '基于现有测试点生成测试用例',
      icon: <PlayCircleOutlined />,
      action: () => navigate('/test-management/generate')
    },
    {
      title: '批量操作',
      description: '批量生成或导入测试数据',
      icon: <ExperimentOutlined />,
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
        <Card size="small" style={{ width: '200px' }}>
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
              <span style={{ marginLeft: '8px', fontSize: '14px' }}>
                {isConnected ? '实时连接' : isConnecting ? '连接中...' : error ? '连接失败' : '未连接'}
              </span>
            </div>
            {isConnected ? (
              <WifiOutlined style={{ color: '#52c41a' }} />
            ) : (
              <DisconnectOutlined style={{ color: '#8c8c8c' }} />
            )}
          </div>
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
                      <strong>1. 创建测试点</strong>：手动编写或使用AI生成基础测试点
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>2. 生成测试用例</strong>：基于测试点创建详细测试用例
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>3. 批量操作</strong>：支持批量生成和导入导出
                    </div>
                    <div>
                      <strong>4. 持续优化</strong>：根据测试反馈迭代改进
                    </div>
                  </div>
                }
                type="info"
                showIcon
              />

              <div style={{ padding: '12px', backgroundColor: '#f6ffed', borderRadius: '6px' }}>
                <Text strong>💡 小贴士</Text>
                <div style={{ marginTop: '8px', fontSize: '14px' }}>
                  测试点是测试用例的基础，建议先完善测试点再生成对应的测试用例，这样能获得更好的测试覆盖率。
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