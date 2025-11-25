import React from 'react';
import {
  Card,
  Typography,
  Tag,
  Button,
  Space,
  Descriptions,
  Divider,
  Alert,
  Spin,
  Empty,
  Tabs,
  Timeline,
  Badge,
  Modal
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  FileTextOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useProject } from '../../contexts/ProjectContext';
import unifiedGenerationService from '../../services/unifiedGenerationService';
import {
  UnifiedTestCaseResponse,
  UnifiedTestCaseStage,
  UnifiedTestCaseStatus,
  UnifiedTestCasePriority
} from '../../types/unifiedTestCase';
import { message } from 'antd';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const UnifiedTestCaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentProject } = useProject();

  const { data: testCase, isLoading, error } = useQuery({
    queryKey: ['unifiedTestCase', id, currentProject?.id],
    queryFn: () => unifiedGenerationService.getUnifiedTestCase(Number(id), currentProject?.id),
    enabled: !!id && !!currentProject,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number, preserveTestPoint: boolean) =>
      unifiedGenerationService.deleteUnifiedTestCase(id, preserveTestPoint),
    onSuccess: (data) => {
      message.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['unifiedTestCase'] });
      navigate('/test-cases');
    },
    onError: (error) => {
      message.error('删除失败');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (id: number, status: UnifiedTestCaseStatus) =>
      unifiedGenerationService.updateUnifiedTestCase(id, { status }),
    onSuccess: () => {
      message.success('状态更新成功');
      queryClient.invalidateQueries({ queryKey: ['unifiedTestCase', id] });
    },
    onError: (error) => {
      message.error('状态更新失败');
    },
  });

  const handleBack = () => {
    navigate('/test-cases');
  };

  const handleEdit = () => {
    // TODO: 实现编辑功能
    message.info('编辑功能开发中...');
  };

  const handleDelete = (preserveTestPoint: boolean = false) => {
    if (!testCase) return;

    const deleteText = testCase.stage === UnifiedTestCaseStage.TEST_POINT
      ? '删除这个测试点将同时删除其对应的测试用例（如果已生成）。确定要删除吗？'
      : preserveTestPoint
        ? '这将把测试用例转换为测试点（保留基础信息，移除执行细节）。确定要继续吗？'
        : '删除测试用例将同时删除对应的测试点。确定要删除吗？';

    Modal.confirm({
      title: '确认删除',
      content: deleteText,
      okText: '确认',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => deleteMutation.mutate(testCase.id, preserveTestPoint),
    });
  };

  const handleStatusUpdate = (status: UnifiedTestCaseStatus) => {
    if (!testCase) return;
    updateStatusMutation.mutate(testCase.id, status);
  };

  const handleExport = () => {
    if (!testCase) return;

    // TODO: 实现导出功能
    message.info('导出功能开发中...');
  };

  const renderSteps = (steps: any[]) => {
    if (!steps || steps.length === 0) {
      return <Empty description="无执行步骤" />;
    }

    return (
      <Timeline>
        {steps.map((step, index) => (
          <Timeline.Item
            key={index}
            color="blue"
            dot={<span style={{ fontSize: '12px' }}>{index + 1}</span>}
          >
            <div>
              <Text strong>步骤 {step.step_number}</Text>
              <Paragraph>{step.action}</Paragraph>
              {step.expected && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">预期结果：</Text>
                  <Paragraph copyable>{step.expected}</Paragraph>
                </div>
              )}
            </div>
          </Timeline.Item>
        ))}
      </Timeline>
    );
  };

  const renderPreconditions = (preconditions: string[]) => {
    if (!preconditions || preconditions.length === 0) {
      return <Empty description="无前置条件" />;
    }

    return (
      <ul>
        {preconditions.map((condition, index) => (
          <li key={index} style={{ marginBottom: 8 }}>
            {index + 1}. {condition}
          </li>
        ))}
      </ul>
    );
  };

  const renderExpectedResults = (results: string[]) => {
    if (!results || results.length === 0) {
      return <Empty description="无预期结果" />;
    }

    return (
      <ul>
        {results.map((result, index) => (
          <li key={index} style={{ marginBottom: 8 }}>
            {index + 1}. {result}
          </li>
        ))}
      </ul>
    );
  };

  // 项目检查
  if (!currentProject) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Card style={{ textAlign: 'center', maxWidth: '400px' }}>
          <Empty
            description={
              <div>
                <h3>请先选择一个项目</h3>
                <p>请在顶部导航栏选择一个项目后，即可查看该项目的测试用例详情。</p>
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

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !testCase) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Empty
          description="测试用例不存在或加载失败"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={handleBack}>
            返回列表
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* 页面头部 */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space align="center">
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            返回
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            {testCase.name}
          </Title>
          <Tag color={testCase.stage === UnifiedTestCaseStage.TEST_POINT ? 'blue' : 'green'}>
            {testCase.stage === UnifiedTestCaseStage.TEST_POINT ? '测试点' : '测试用例'}
          </Tag>
        </Space>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出
          </Button>
          <Button icon={<EditOutlined />} onClick={handleEdit}>
            编辑
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(false)}
          >
            删除
          </Button>
        </Space>
      </div>

      {/* 主要内容 */}
      <Card>
        <Tabs defaultActiveKey="info">
          {/* 基本信息 */}
          <TabPane tab="基本信息" key="info">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="测试ID">{testCase.case_id}</Descriptions.Item>
              <Descriptions.Item label="业务类型">
                <Tag>{testCase.business_type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={unifiedGenerationService.getStatusColor(testCase.status)}>
                  {unifiedGenerationService.getStatusLabel(testCase.status)}
                </Tag>
                <Space size="small" style={{ marginLeft: 8 }}>
                  {testCase.status === UnifiedTestCaseStatus.DRAFT && (
                    <Button
                      size="small"
                      icon={<CheckCircleOutlined />}
                      onClick={() => handleStatusUpdate(UnifiedTestCaseStatus.APPROVED)}
                    >
                      批准
                    </Button>
                  )}
                  {testCase.status === UnifiedTestCaseStatus.APPROVED && (
                    <Button
                      size="small"
                      icon={<PlayCircleOutlined />}
                      onClick={() => handleStatusUpdate(UnifiedTestCaseStatus.COMPLETED)}
                    >
                      完成
                    </Button>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={unifiedGenerationService.getPriorityColor(testCase.priority)}>
                  {unifiedGenerationService.getPriorityLabel(testCase.priority)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(testCase.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {dayjs(testCase.updated_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="功能模块" span={2}>
                {testCase.module || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="功能子模块" span={2}>
                {testCase.functional_module || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="功能域" span={2}>
                {testCase.functional_domain || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                <Paragraph>{testCase.description || '暂无描述'}</Paragraph>
              </Descriptions.Item>
            </Descriptions>
          </TabPane>

          {/* 执行详情 - 仅测试用例显示 */}
          {testCase.stage === UnifiedTestCaseStage.TEST_CASE && (
            <>
              <TabPane tab="执行详情" key="execution">
                <div style={{ marginBottom: '24px' }}>
                  <Title level={4}>前置条件</Title>
                  {renderPreconditions(testCase.preconditions)}
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <Title level={4}>执行步骤</Title>
                  {renderSteps(testCase.steps)}
                </div>

                <div>
                  <Title level={4}>预期结果</Title>
                  {renderExpectedResults(testCase.expected_result)}
                </div>
              </TabPane>
            </>
          )}

          {/* 备注 */}
          <TabPane tab="备注" key="remarks">
            {testCase.remarks ? (
              <Paragraph>{testCase.remarks}</Paragraph>
            ) : (
              <Empty description="暂无备注" />
            )}
          </TabPane>

          {/* 生成信息 - 如果有生成任务ID */}
          {testCase.generation_job_id && (
            <TabPane tab="生成信息" key="generation">
              <Descriptions bordered>
                <Descriptions.Item label="生成任务ID">
                  <Badge count="AI" style={{ backgroundColor: '#52c41a' }}>
                    {testCase.generation_job_id}
                  </Badge>
                </Descriptions.Item>
                <Descriptions.Item label="实体顺序">
                  {testCase.entity_order || '-'}
                </Descriptions.Item>
              </Descriptions>

              <Alert
                message="生成信息"
                description="此测试用例由AI自动生成，可通过生成任务查看详细的生成过程。"
                type="info"
                showIcon
                style={{ marginTop: '16px' }}
              />
            </TabPane>
          )}
        </Tabs>
      </Card>
    </div>
  );
};

export default UnifiedTestCaseDetail;