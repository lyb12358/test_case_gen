import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Steps,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Radio,
  Alert,
  Progress,
  Table,
  Tag,
  Tabs,
  Divider,
  Badge,
  Tooltip,
  message,
  Modal,
  Result
} from 'antd';
import {
  RocketOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SettingOutlined,
  ExportOutlined,
  ImportOutlined,
  EyeOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProject } from '../../contexts/ProjectContext';
import { unifiedGenerationService } from '../../services';
import { useWebSocket } from '../../hooks';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;

interface GenerationTask {
  id: string;
  business_type: string;
  generation_type: 'test_points' | 'test_cases' | 'both';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  current_step: string;
  total_test_points: number;
  generated_test_points: number;
  total_test_cases: number;
  generated_test_cases: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

interface BatchGenerationConfig {
  business_types: string[];
  generation_mode: 'test_points_only' | 'test_cases_only' | 'both_stages';
  test_points_config: {
    count_per_type: number;
    complexity_level: 'simple' | 'standard' | 'complex';
    include_negative_cases: boolean;
  };
  test_cases_config: {
    complexity_level: 'basic' | 'comprehensive' | 'detailed';
    include_preconditions: boolean;
    include_expected_results: boolean;
    cases_per_point: number;
  };
  advanced_settings: {
    enable_parallel: boolean;
    max_concurrent_tasks: number;
    retry_on_failure: boolean;
    export_format: 'json' | 'excel' | 'both';
  };
}

const BatchGenerator: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentProject } = useProject();

  // 如果没有选择项目，显示提示
  if (!currentProject) {
    return (
      <div style={{ padding: '24px' }}>
        <Title level={2}>批量生成中心</Title>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Text type="secondary">请先选择一个项目来使用批量生成功能</Text>
          </div>
        </Card>
      </div>
    );
  }

  // 状态管理
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTasks, setActiveTasks] = useState<GenerationTask[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // 获取动态业务类型
  const { data: businessTypesData } = useQuery({
    queryKey: ['businessTypes', { project_id: currentProject?.id, is_active: true }],
    queryFn: () => unifiedGenerationService.getBusinessTypes(currentProject?.id),
    enabled: !!currentProject?.id
  });

  // 生成业务类型选项
  const businessTypes = businessTypesData?.items?.map((type: any) => ({
    value: type.code || type.value,
    label: `[${type.code || type.value}] ${type.name || type.label}`
  })) || [];

  // 模拟历史任务数据
  const { data: historyTasks, isLoading } = useQuery({
    queryKey: ['generationTasks', 'history'],
    queryFn: () => Promise.resolve({
      data: [
        {
          id: 'task_1',
          business_type: 'RCC,RPP',
          generation_type: 'both',
          status: 'completed',
          progress: 100,
          current_step: '已完成',
          total_test_points: 100,
          generated_test_points: 95,
          total_test_cases: 380,
          generated_test_cases: 361,
          created_at: '2024-01-20T10:30:00Z',
          completed_at: '2024-01-20T11:45:00Z'
        },
        {
          id: 'task_2',
          business_type: 'RSM',
          generation_type: 'test_points',
          status: 'failed',
          progress: 45,
          current_step: '测试点生成失败',
          total_test_points: 50,
          generated_test_points: 22,
          total_test_cases: 0,
          generated_test_cases: 0,
          created_at: '2024-01-20T14:15:00Z',
          error_message: 'API调用次数超限'
        }
      ]
    }),
    staleTime: 5 * 60 * 1000
  });

  // 模拟生成任务
  const generateMutation = useMutation({
    mutationFn: async (config: BatchGenerationConfig) => {
      console.log('Starting batch generation:', config);

      // 模拟任务创建
      const taskId = `task_${Date.now()}`;
      const newTask: GenerationTask = {
        id: taskId,
        business_type: config.business_types.join(','),
        generation_type: config.generation_mode === 'test_points_only' ? 'test_points' :
                        config.generation_mode === 'test_cases_only' ? 'test_cases' : 'both',
        status: 'pending',
        progress: 0,
        current_step: '准备中...',
        total_test_points: config.business_types.length * config.test_points_config.count_per_type,
        generated_test_points: 0,
        total_test_cases: 0,
        generated_test_cases: 0,
        created_at: new Date().toISOString()
      };

      setActiveTasks(prev => [...prev, newTask]);

      // 模拟生成过程
      setIsGenerating(true);
      for (let i = 0; i <= 100; i += 5) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setActiveTasks(prev => prev.map(task =>
          task.id === taskId
            ? {
                ...task,
                progress: i,
                current_step: i < 30 ? '生成测试点中...' : i < 70 ? '生成测试用例中...' : '完成处理...',
                generated_test_points: Math.floor((i / 100) * task.total_test_points),
                generated_test_cases: Math.floor((i / 100) * task.total_test_cases * 3.8),
                status: 'running'
              }
            : task
        ));
      }

      setActiveTasks(prev => prev.map(task =>
        task.id === taskId
          ? {
              ...task,
              status: 'completed',
              current_step: '已完成',
              progress: 100,
              completed_at: new Date().toISOString()
            }
          : task
      ));

      setIsGenerating(false);
      return { taskId, success: true };
    },
    onSuccess: (data) => {
      message.success(`批量生成任务已启动：${data.taskId}`);
      queryClient.invalidateQueries({ queryKey: ['generationTasks'] });
    },
    onError: (error) => {
      message.error(`批量生成失败：${error.message}`);
      setIsGenerating(false);
    }
  });

  const handleNext = async () => {
    try {
      await form.validateFields();
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      const config: BatchGenerationConfig = {
        business_types: values.business_types,
        generation_mode: values.generation_mode,
        test_points_config: {
          count_per_type: values.test_points_count,
          complexity_level: values.test_points_complexity,
          include_negative_cases: values.include_negative_cases
        },
        test_cases_config: {
          complexity_level: values.test_cases_complexity,
          include_preconditions: values.include_preconditions,
          include_expected_results: values.include_expected_results,
          cases_per_point: values.cases_per_point
        },
        advanced_settings: {
          enable_parallel: values.enable_parallel,
          max_concurrent_tasks: values.max_concurrent_tasks,
          retry_on_failure: values.retry_on_failure,
          export_format: values.export_format
        }
      };

      await generateMutation.mutateAsync(config);
      setCurrentStep(3); // 跳转到结果页
    } catch (error) {
      console.error('Generation config validation failed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'default',
      running: 'processing',
      completed: 'success',
      failed: 'error',
      paused: 'warning'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts = {
      pending: '等待中',
      running: '运行中',
      completed: '已完成',
      failed: '失败',
      paused: '已暂停'
    };
    return texts[status as keyof typeof texts] || status;
  };

  const taskColumns = [
    {
      title: '任务ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
    },
    {
      title: '业务类型',
      dataIndex: 'business_type',
      key: 'business_type',
      width: 150,
      render: (types: string) => (
        <Space wrap>
          {types.split(',').map(type => (
            <Tag key={type} color="blue">{type}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: '生成类型',
      dataIndex: 'generation_type',
      key: 'generation_type',
      width: 120,
      render: (type: string) => (
        <Tag color={type === 'both' ? 'purple' : type === 'test_points' ? 'cyan' : 'green'}>
          {type === 'both' ? '完整流程' : type === 'test_points' ? '仅测试点' : '仅测试用例'}
        </Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Badge status={getStatusColor(status) as any} text={getStatusText(status)} />
      )
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 120,
      render: (progress: number, record: GenerationTask) => (
        <div>
          <Progress percent={progress} size="small" />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.current_step}
          </Text>
        </div>
      )
    },
    {
      title: '生成结果',
      key: 'results',
      width: 150,
      render: (_: any, record: GenerationTask) => (
        <Space direction="vertical" size="small">
          {record.generation_type !== 'test_cases_only' && (
            <Text style={{ fontSize: '12px' }}>
              测试点: {record.generated_test_points}/{record.total_test_points}
            </Text>
          )}
          {record.generation_type !== 'test_points_only' && (
            <Text style={{ fontSize: '12px' }}>
              测试用例: {record.generated_test_cases}/{record.total_test_cases}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: any, record: GenerationTask) => (
        <Space size="small">
          {record.status === 'completed' && (
            <Tooltip title="查看结果">
              <Button type="text" icon={<EyeOutlined />} size="small" />
            </Tooltip>
          )}
          {record.status === 'running' && (
            <Tooltip title="暂停任务">
              <Button type="text" icon={<PauseCircleOutlined />} size="small" />
            </Tooltip>
          )}
          {record.status === 'failed' && (
            <Tooltip title="重试任务">
              <Button type="text" icon={<ReloadOutlined />} size="small" />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const steps = [
    {
      title: '基础配置',
      description: '选择业务类型和生成模式',
      icon: <SettingOutlined />
    },
    {
      title: '详细设置',
      description: '配置生成参数和高级选项',
      icon: <BulbOutlined />
    },
    {
      title: '预览确认',
      description: '预览配置并确认生成',
      icon: <EyeOutlined />
    },
    {
      title: '生成结果',
      description: '查看生成进度和结果',
      icon: <RocketOutlined />
    }
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card title="基础配置" style={{ marginTop: 16 }}>
            <Form.Item
              name="business_types"
              label="选择业务类型"
              rules={[{ required: true, message: '请至少选择一个业务类型' }]}
            >
              <Select
                mode="multiple"
                placeholder="请选择要生成测试内容的业务类型"
                optionLabelProp="label"
                showSearch
                filterOption={(input, option) => {
                  const searchText = input.toLowerCase();
                  const businessCode = String(option?.value || '').toLowerCase();
                  const businessLabel = String(option?.label || '').toLowerCase();

                  return (
                    businessCode.includes(searchText) ||
                    businessLabel.includes(searchText)
                  );
                }}
                options={businessTypes}
              />
            </Form.Item>

            <Form.Item
              name="generation_mode"
              label="生成模式"
              rules={[{ required: true, message: '请选择生成模式' }]}
            >
              <Radio.Group>
                <Radio value="both_stages">
                  <div>
                    <div style={{ fontWeight: 'bold' }}>完整两阶段生成</div>
                    <div style={{ color: '#666', fontSize: '12px' }}>
                      先生成测试点，再基于测试点生成测试用例
                    </div>
                  </div>
                </Radio>
                <Radio value="test_points_only">
                  <div>
                    <div style={{ fontWeight: 'bold' }}>仅生成测试点</div>
                    <div style={{ color: '#666', fontSize: '12px' }}>
                      只生成测试点，不生成测试用例
                    </div>
                  </div>
                </Radio>
                <Radio value="test_cases_only">
                  <div>
                    <div style={{ fontWeight: 'bold' }}>仅生成测试用例</div>
                    <div style={{ color: '#666', fontSize: '12px' }}>
                      基于现有测试点生成测试用例
                    </div>
                  </div>
                </Radio>
              </Radio.Group>
            </Form.Item>
          </Card>
        );

      case 1:
        return (
          <Card title="详细设置" style={{ marginTop: 16 }}>
            <Tabs defaultActiveKey="test_points">
              <Tabs.TabPane tab="测试点配置" key="test_points">
                <Form.Item
                  name="test_points_count"
                  label="每种业务类型生成数量"
                  rules={[{ required: true, message: '请输入生成数量' }]}
                  initialValue={50}
                >
                  <InputNumber min={1} max={500} style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                  name="test_points_complexity"
                  label="复杂度级别"
                  rules={[{ required: true, message: '请选择复杂度级别' }]}
                  initialValue="standard"
                >
                  <Select>
                    <Option value="simple">简单 - 基础功能测试点</Option>
                    <Option value="standard">标准 - 常规业务测试点</Option>
                    <Option value="complex">复杂 - 综合场景测试点</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="include_negative_cases"
                  label="包含反向测试用例"
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Switch /> <Text style={{ marginLeft: 8 }}>生成异常和边界条件测试点</Text>
                </Form.Item>
              </Tabs.TabPane>

              <Tabs.TabPane tab="测试用例配置" key="test_cases">
                <Form.Item
                  name="test_cases_complexity"
                  label="详细程度"
                  rules={[{ required: true, message: '请选择详细程度' }]}
                  initialValue="comprehensive"
                >
                  <Select>
                    <Option value="basic">基础 - 核心测试步骤</Option>
                    <Option value="comprehensive">全面 - 详细测试步骤</Option>
                    <Option value="detailed">详细 - 完整测试文档</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="cases_per_point"
                  label="每个测试点生成用例数"
                  rules={[{ required: true, message: '请输入生成数量' }]}
                  initialValue={4}
                >
                  <InputNumber min={1} max={20} style={{ width: '100%' }} />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="include_preconditions"
                      label="包含前置条件"
                      valuePropName="checked"
                      initialValue={true}
                    >
                      <Switch /> <Text style={{ marginLeft: 8 }}>生成测试前置条件</Text>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="include_expected_results"
                      label="包含预期结果"
                      valuePropName="checked"
                      initialValue={true}
                    >
                      <Switch /> <Text style={{ marginLeft: 8 }}>生成预期结果</Text>
                    </Form.Item>
                  </Col>
                </Row>
              </Tabs.TabPane>

              <Tabs.TabPane tab="高级设置" key="advanced">
                <Form.Item
                  name="enable_parallel"
                  label="启用并行处理"
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Switch /> <Text style={{ marginLeft: 8 }}>同时处理多个业务类型</Text>
                </Form.Item>

                <Form.Item
                  name="max_concurrent_tasks"
                  label="最大并发任务数"
                  initialValue={3}
                >
                  <InputNumber min={1} max={10} style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                  name="retry_on_failure"
                  label="失败重试"
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Switch /> <Text style={{ marginLeft: 8 }}>生成失败时自动重试</Text>
                </Form.Item>

                <Form.Item
                  name="export_format"
                  label="导出格式"
                  initialValue="json"
                >
                  <Select>
                    <Option value="json">JSON 格式</Option>
                    <Option value="excel">Excel 格式</Option>
                    <Option value="both">同时导出两种格式</Option>
                  </Select>
                </Form.Item>
              </Tabs.TabPane>
            </Tabs>
          </Card>
        );

      case 2:
        return (
          <Card title="预览确认" style={{ marginTop: 16 }}>
            <Alert
              message="请仔细确认以下配置信息"
              description="配置确认后将开始批量生成，请确保所有参数设置正确"
              type="warning"
              showIcon
              style={{ marginBottom: 24 }}
            />

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card size="small" title="基础信息">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div><strong>业务类型：</strong>{form.getFieldValue('business_types')?.join(', ') || '未选择'}</div>
                    <div><strong>生成模式：</strong>
                      {form.getFieldValue('generation_mode') === 'both_stages' ? '完整两阶段生成' :
                       form.getFieldValue('generation_mode') === 'test_points_only' ? '仅生成测试点' : '仅生成测试用例'}
                    </div>
                  </Space>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="预计生成量">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {form.getFieldValue('generation_mode') !== 'test_cases_only' && (
                      <div><strong>测试点数量：</strong>{(form.getFieldValue('business_types')?.length || 0) * (form.getFieldValue('test_points_count') || 0)}</div>
                    )}
                    {form.getFieldValue('generation_mode') !== 'test_points_only' && (
                      <div><strong>测试用例数量：</strong>{(form.getFieldValue('business_types')?.length || 0) * (form.getFieldValue('test_points_count') || 0) * (form.getFieldValue('cases_per_point') || 0)}</div>
                    )}
                  </Space>
                </Card>
              </Col>
            </Row>

            <Divider />

            <Space>
              <Button onClick={() => setShowPreviewModal(true)}>
                查看详细配置
              </Button>
              <Button type="primary" onClick={handleGenerate} loading={isGenerating}>
                开始批量生成
              </Button>
            </Space>
          </Card>
        );

      case 3:
        return (
          <Card title="生成结果" style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 24 }}>
              <Title level={4}>
                {isGenerating ? '正在生成中...' : '生成完成'}
              </Title>
              <Paragraph type="secondary">
                {isGenerating ? '请耐心等待，系统正在为您生成测试内容' : '所有任务已完成，您可以查看生成的结果'}
              </Paragraph>
            </div>

            {/* 当前活动任务 */}
            {activeTasks.length > 0 && (
              <Card title="当前任务" style={{ marginBottom: 16 }}>
                <Table
                  columns={taskColumns}
                  dataSource={activeTasks}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </Card>
            )}

            {/* 历史任务 */}
            <Card title="历史任务">
              <Table
                columns={taskColumns}
                dataSource={historyTasks?.data || []}
                rowKey="id"
                loading={isLoading}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true
                }}
                size="small"
              />
            </Card>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>批量生成中心</Title>
        <Paragraph type="secondary">
          智能批量生成测试点和测试用例，支持多业务类型并行处理
        </Paragraph>
      </div>

      <Steps current={currentStep} items={steps} style={{ marginBottom: 24 }} />

      <Form form={form} layout="vertical">
        {renderStepContent()}
      </Form>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Space>
          {currentStep > 0 && currentStep < 3 && (
            <Button onClick={handlePrev}>
              上一步
            </Button>
          )}
          {currentStep === 0 && (
            <Button type="primary" onClick={handleNext}>
              下一步
            </Button>
          )}
          {currentStep === 1 && (
            <Button type="primary" onClick={handleNext}>
              下一步
            </Button>
          )}
          {currentStep === 2 && (
            <>
              <Button onClick={() => setCurrentStep(1)}>
                返回修改
              </Button>
              <Button onClick={() => navigate('/test-management')}>
                返回测试管理
              </Button>
            </>
          )}
          {currentStep === 3 && (
            <Button type="primary" onClick={() => navigate('/test-management')}>
              返回测试管理
            </Button>
          )}
        </Space>
      </div>

      {/* 详细配置预览模态框 */}
      <Modal
        title="详细配置预览"
        open={showPreviewModal}
        onCancel={() => setShowPreviewModal(false)}
        footer={null}
        width={800}
      >
        <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
          {JSON.stringify(form.getFieldsValue(), null, 2)}
        </pre>
      </Modal>
    </div>
  );
};

export default BatchGenerator;