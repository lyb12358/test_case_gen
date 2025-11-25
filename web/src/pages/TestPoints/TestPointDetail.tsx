/**
 * Test Point Detail Page
 * Provides comprehensive view of test point details and related test cases
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Row,
  Col,
  Typography,
  Divider,
  Table,
  message,
  Spin,
  Alert,
  Timeline,
  Badge,
  Modal,
  Collapse
} from 'antd';
import {
  EditOutlined,
  ArrowLeftOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useProject } from '../../contexts/ProjectContext';
import { unifiedGenerationService } from '../../services';
import { businessService } from '../../services/businessService';
import {
  TestPoint,
  TestPointStatus,
  Priority,
  TestCaseItem,
  TestPointGenerationRequest
} from '../../types/testPoints';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const TestPointDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProject } = useProject();

  const [loading, setLoading] = useState(false);
  const [testPoint, setTestPoint] = useState<TestPoint | null>(null);
  const [relatedTestCases, setRelatedTestCases] = useState<TestCaseItem[]>([]);
  const [businessTypeConfig, setBusinessTypeConfig] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (id && currentProject) {
      const testPointId = parseInt(id);
      if (!isNaN(testPointId) && testPointId > 0) {
        loadTestPoint(testPointId);
        loadRelatedTestCases(testPointId);
      } else {
        message.error('无效的测试点ID');
        navigate('/test-points/list');
      }
    }
  }, [id, navigate, currentProject]);

  const loadTestPoint = async (testPointId: number) => {
    setLoading(true);
    try {
      const data = await unifiedGenerationService.getTestPoint(testPointId, currentProject?.id);
      setTestPoint(data);

      // Load business type configuration
      if (data.business_type) {
        const businessConfig = await businessService.getBusinessType(data.business_type);
        setBusinessTypeConfig(businessConfig.data);
      }
    } catch (error) {
      message.error('加载测试点详情失败');
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedTestCases = async (testPointId: number) => {
    try {
      const testCases = await unifiedGenerationService.getUnifiedTestCases({
        test_point_ids: [testPointId],
        page: 1,
        size: 100,
        sort_by: 'created_at',
        sort_order: 'desc'
      });
      setRelatedTestCases(testCases.items || []);
    } catch (error) {
      console.error('Failed to load related test cases:', error);
    }
  };

  const handleEdit = () => {
    navigate(`/test-points/edit/${id}`);
  };

  const handleGenerateTestCases = async () => {
    if (!testPoint) return;

    Modal.confirm({
      title: '生成测试用例',
      content: `确定要基于测试点 "${testPoint.title}" 生成测试用例吗？`,
      icon: <ExclamationCircleOutlined />,
      onOk: async () => {
        setGenerating(true);
        try {
          const request: TestPointGenerationRequest = {
            test_point_ids: [testPoint.id],
            generation_config: {},
            regenerate_existing: false
          };

          const response = await unifiedGenerationService.generateTestCases(request);
          message.success('测试用例生成任务已启动');

          // Navigate to task detail page
          if (response.data.task_id) {
            navigate(`/tasks/${response.data.task_id}`);
          }
        } catch (error) {
          message.error('生成测试用例失败');
        } finally {
          setGenerating(false);
        }
      }
    });
  };

  const getStatusColor = (status: TestPointStatus) => {
    const colors = {
      draft: 'default',
      approved: 'success',
      modified: 'warning',
      completed: 'processing'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status: TestPointStatus) => {
    const texts = {
      draft: '草稿',
      approved: '已批准',
      modified: '已修改',
      completed: '已完成'
    };
    return texts[status] || status;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'red',
      medium: 'orange',
      low: 'green'
    };
    return colors[priority] || 'default';
  };

  const getPriorityText = (priority: string) => {
    const texts = {
      high: '高',
      medium: '中',
      low: '低'
    };
    return texts[priority] || priority;
  };

  const parseStructuredData = (data: string | null) => {
    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
    } catch {
      return data;
    }
  };

  const testCaseColumns = [
    {
      title: '用例ID',
      dataIndex: 'test_case_id',
      key: 'test_case_id',
      width: 100,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>
          {getPriorityText(priority)}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Badge
          status={status === 'active' ? 'success' : 'default'}
          text={status === 'active' ? '活跃' : '非活跃'}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text>加载中...</Text>
        </div>
      </div>
    );
  }

  // 项目检查
  if (!currentProject) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Card style={{ textAlign: 'center', maxWidth: '400px' }}>
          <Empty
            description={
              <div>
                <h3>请先选择一个项目</h3>
                <p>请在顶部导航栏选择一个项目后，即可查看该项目的测试点详情。</p>
              </div>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => navigate('/projects')}>
              去选择项目
            </Button>
          </Empty>
        </Card>
      </div>
    );
  }

  if (!testPoint) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="测试点未找到"
          description="请检查URL是否正确，或者该测试点可能已被删除。"
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        {/* Header */}
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3}>{testPoint.title}</Title>
            <Space>
              <Tag color={getStatusColor(testPoint.status)}>
                {getStatusText(testPoint.status)}
              </Tag>
              <Tag color={getPriorityColor(testPoint.priority)}>
                优先级: {getPriorityText(testPoint.priority)}
              </Tag>
              <Text type="secondary">
                ID: {testPoint.test_point_id}
              </Text>
            </Space>
          </div>
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/test-points')}
            >
              返回列表
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={handleEdit}
            >
              编辑
            </Button>
            <Button
              type="default"
              icon={<PlayCircleOutlined />}
              onClick={handleGenerateTestCases}
              loading={generating}
              disabled={testPoint.status === 'completed'}
            >
              生成测试用例
            </Button>
          </Space>
        </div>

        {/* Basic Information */}
        <Descriptions title="基本信息" bordered column={2}>
          <Descriptions.Item label="业务类型">
            {businessTypeConfig?.name || testPoint.business_type}
          </Descriptions.Item>
          <Descriptions.Item label="测试点ID">
            {testPoint.test_point_id}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={getStatusColor(testPoint.status)}>
              {getStatusText(testPoint.status)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="优先级">
            <Tag color={getPriorityColor(testPoint.priority)}>
              {getPriorityText(testPoint.priority)}
            </Tag>
          </Descriptions.Item>
            <Descriptions.Item label="生成任务">
            {testPoint.generation_job_id || '无'}
          </Descriptions.Item>
        </Descriptions>

        {/* Description */}
        {testPoint.description && (
          <>
            <Divider>描述</Divider>
            <Paragraph>{testPoint.description}</Paragraph>
          </>
        )}

        
        {/* Timeline */}
        <Divider>时间线</Divider>
        <Timeline>
          <Timeline.Item dot={<ClockCircleOutlined />} color="blue">
            <Text>创建时间: {new Date(testPoint.created_at).toLocaleString('zh-CN')}</Text>
          </Timeline.Item>
          <Timeline.Item dot={<CheckCircleOutlined />} color="green">
            <Text>更新时间: {new Date(testPoint.updated_at).toLocaleString('zh-CN')}</Text>
          </Timeline.Item>
          {testPoint.status === 'completed' && (
            <Timeline.Item dot={<CheckCircleOutlined />} color="green">
              <Text>测试用例生成完成</Text>
            </Timeline.Item>
          )}
        </Timeline>

        {/* Related Test Cases */}
        <Divider>相关测试用例</Divider>
        <Row gutter={16}>
          <Col span={24}>
            {relatedTestCases.length > 0 ? (
              <Table
                columns={testCaseColumns}
                dataSource={relatedTestCases}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `共 ${total} 个测试用例`,
                }}
                size="small"
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '32px' }}>
                <Text type="secondary">暂无相关测试用例</Text>
                <div style={{ marginTop: '16px' }}>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={handleGenerateTestCases}
                    loading={generating}
                  >
                    生成测试用例
                  </Button>
                </div>
              </div>
            )}
          </Col>
        </Row>

        {/* Metadata */}
        <Divider>元数据</Divider>
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="项目ID">{testPoint.project_id}</Descriptions.Item>
          <Descriptions.Item label="生成任务ID">{testPoint.generation_job_id || '无'}</Descriptions.Item>
          <Descriptions.Item label="LLM元数据">
            {testPoint.llm_metadata ? '有' : '无'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default TestPointDetail;