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
import { UnifiedTestCaseStage } from '../../types/unifiedTestCase';

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
  error_details?: string;
}

interface BatchGenerationConfig {
  business_types: string[];
  generation_mode: 'test_points_only' | 'test_cases_only';
  project_id: number;
  additional_context?: string;
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
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  // 统一WebSocket连接用于实时进度监控
  const { isConnected, disconnect } = useWebSocket();

  // WebSocket实时监控暂时禁用，使用polling方式更新状态
  // TODO: 重新实现WebSocket实时监控功能以适配新的统一生成服务

  // 获取动态业务类型
//       setActiveTasks(prev => prev.map(task =>
//         task.id === currentTaskId
//           ? {
//               ...task,
//               status: 'completed',
//               progress: 100,
//               current_step: '已完成',
//               completed_at: new Date().toISOString()
//             }
//           : task
//       ));
//       setIsGenerating(false);
//       setCurrentTaskId(null);
          //       disconnect();
//       message.success('批量生成完成！');
//       break;

        //     case 'task_failed':
//       setActiveTasks(prev => prev.map(task =>
//         task.id === currentTaskId
//           ? {
//               ...task,
//               status: 'failed',
//               current_step: '生成失败',
//               error_message: lastMessage.data.error_message || '未知错误',
//               completed_at: new Date().toISOString()
//             }
//           : task
//       ));
//       setIsGenerating(false);
//       setCurrentTaskId(null);
//       disconnect();
//       message.error(`生成失败: ${lastMessage.data.error_message || '未知错误'}`);
//       break;
//
//     case 'test_point_generated':
//       // 实时更新测试点生成计数
//       setActiveTasks(prev => prev.map(task =>
//         task.id === currentTaskId
//           ? {
//               ...task,
//               generated_test_points: (task.generated_test_points || 0) + 1,
//               current_step: `正在生成测试点... (${task.generated_test_points + 1})`
//             }
//           : task
//       ));
//       break;
//
//     case 'test_case_generated':
//       // 实时更新测试用例生成计数
//       setActiveTasks(prev => prev.map(task =>
//         task.id === currentTaskId
//           ? {
//               ...task,
//               generated_test_cases: (task.generated_test_cases || 0) + 1,
//               current_step: `正在生成测试用例... (${task.generated_test_cases + 1})`
//             }
//           : task
//       ));
//       break;
//       }
//     }
//   }, [currentTaskId]);
    // TODO: 重新实现WebSocket实时监控
  // }, [currentTaskId]);

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

  // 获取历史生成任务数据
  const { data: historyTasks, isLoading } = useQuery({
    queryKey: ['generationTasks', 'history'],
    queryFn: () => {
      // 使用本地状态activeTasks作为历史数据
      // 在真实应用中，这里可以调用API获取历史任务
      return Promise.resolve({
        data: activeTasks.map(task => ({
          id: task.id,
          business_type: task.business_type,
          generation_type: task.generation_type,
          status: task.status,
          progress: task.progress,
          current_step: task.current_step,
          total_test_points: task.total_test_points,
          generated_test_points: task.generated_test_points,
          total_test_cases: task.total_test_cases,
          generated_test_cases: task.generated_test_cases,
          created_at: task.created_at,
          completed_at: task.completed_at,
          error_message: task.error_message
        }))
      });
    },
    staleTime: 30 * 1000, // 30秒刷新
    refetchInterval: 5000 // 每5秒自动刷新
  });

  // 真实批量生成任务
  const generateMutation = useMutation({
    mutationFn: async (config: BatchGenerationConfig) => {
      console.log('Starting real batch generation:', config);

      try {
        // 创建任务ID
        const taskId = `batch_${Date.now()}`;

        // 添加初始任务到本地状态
        const newTask: GenerationTask = {
          id: taskId,
          business_type: config.business_types.join(','),
          generation_type: config.generation_mode === 'test_points_only' ? 'test_points' :
                          config.generation_mode === 'test_cases_only' ? 'test_cases' : 'both',
          status: 'pending',
          progress: 0,
          current_step: '准备中...',
          total_test_points: 0, // 将由后端返回
          generated_test_points: 0,
          total_test_cases: 0, // 将由后端返回
          generated_test_cases: 0,
          created_at: new Date().toISOString()
        };

        setActiveTasks(prev => [...prev, newTask]);
        setIsGenerating(true);

        // 使用简化的统一生成API，逐个处理业务类型
        const responses = [];
        for (const businessType of config.business_types) {
          const response = await unifiedGenerationService.generateUnified({
            business_type: businessType,
            project_id: config.project_id,
            generation_mode: config.generation_mode,
            additional_context: config.additional_context
          });
          responses.push({ businessType, response });
        }

        // 更新任务状态为完成
        setActiveTasks(prev => prev.map(task =>
          task.id === taskId
            ? {
                ...task,
                status: 'completed',
                current_step: '批量生成完成',
                progress: 100,
                completed_at: new Date().toISOString()
              }
            : task
        ));

        setIsGenerating(false);
        message.success('批量生成完成！');

        return {
          taskId,
          business_types: config.business_types,
          generation_mode: config.generation_mode,
          status: 'submitted',
          responses
        };

      } catch (error: any) {
        console.error('Batch generation failed:', error);

        // 解析错误信息
        let errorMessage = '未知错误';
        let errorDetails = '';

        if (error.response) {
          // API响应错误
          const status = error.response.status;
          const data = error.response.data;

          switch (status) {
            case 400:
              errorMessage = '请求参数错误';
              errorDetails = data?.detail || '请检查输入参数';
              break;
            case 401:
              errorMessage = '认证失败';
              errorDetails = '请重新登录';
              break;
            case 429:
              errorMessage = '请求频率过高';
              errorDetails = '请稍后再试';
              break;
            case 500:
              errorMessage = '服务器内部错误';
              errorDetails = data?.detail || '服务器处理请求时发生错误';
              break;
            default:
              errorMessage = `请求失败 (${status})`;
              errorDetails = data?.detail || error.message;
          }
        } else if (error.request) {
          // 网络错误
          errorMessage = '网络连接失败';
          errorDetails = '请检查网络连接或服务器状态';
        } else {
          // 其他错误
          errorMessage = error.message || '未知错误';
          errorDetails = error.stack || '';
        }

        // 更新失败状态
        setActiveTasks(prev => prev.map(task =>
          task.business_type.includes(config.business_types.join(','))
            ? {
                ...task,
                status: 'failed',
                current_step: '生成失败',
                error_message: errorMessage,
                error_details: errorDetails,
                completed_at: new Date().toISOString()
              }
            : task
        ));

        setIsGenerating(false);
        setCurrentTaskId(null);

        // 显示详细错误信息
        Modal.error({
          title: '批量生成失败',
          content: (
            <div>
              <p><strong>错误信息:</strong> {errorMessage}</p>
              {errorDetails && <p><strong>详细信息:</strong> {errorDetails}</p>}
              <p><strong>业务类型:</strong> {config.business_types.join(', ')}</p>
              <p><strong>生成模式:</strong> {config.generation_mode}</p>
            </div>
          ),
          width: 600,
          okText: '确定'
        });

        throw new Error(errorMessage);
      }
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
        project_id: currentProject.id,
        additional_context: values.additional_context
      };

      await generateMutation.mutateAsync(config);
      setCurrentStep(3); // 跳转到结果页
    } catch (error) {
      console.error('Generation config validation failed:', error);
    }
  };

  // 重试失败的任务
  const handleRetryTask = async (task: GenerationTask) => {
    try {
      // 从失败任务中提取配置信息
      const config: BatchGenerationConfig = {
        business_types: task.business_type.split(','),
        generation_mode: task.generation_type === 'test_points' ? 'test_points_only' :
                        task.generation_type === 'test_cases' ? 'test_cases_only' : 'test_points_only', // Legacy both_stages converted to test_points_only
        project_id: currentProject.id,
        additional_context: '' // 重试时使用空的上文
      };

      // 移除失败任务
      setActiveTasks(prev => prev.filter(t => t.id !== task.id));

      // 重新提交生成任务
      await generateMutation.mutateAsync(config);
    } catch (error) {
      console.error('Task retry failed:', error);
      message.error('重试任务失败');
    }
  };

  // 取消正在运行的任务
  const handleCancelTask = async (task: GenerationTask) => {
    try {
      // 这里应该调用取消API
      // await unifiedGenerationService.cancelGenerationTask(task.id);

      // 更新任务状态
      setActiveTasks(prev => prev.map(t =>
        t.id === task.id
          ? {
              ...t,
              status: 'failed',
              current_step: '已取消',
              error_message: '用户取消',
              completed_at: new Date().toISOString()
            }
          : t
      ));

      // 如果是当前监控的任务，断开WebSocket
      if (currentTaskId === task.id) {
        disconnect();
        setCurrentTaskId(null);
      }

      message.info('任务已取消');
    } catch (error) {
      console.error('Cancel task failed:', error);
      message.error('取消任务失败');
    }
  };

  // 清理已完成的任务
  const handleClearCompletedTasks = () => {
    setActiveTasks(prev => prev.filter(task =>
      task.status !== 'completed' && task.status !== 'failed'
    ));
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
          {record.generation_type !== 'test_cases' && (
            <Text style={{ fontSize: '12px' }}>
              测试点: {record.generated_test_points}/{record.total_test_points}
            </Text>
          )}
          {record.generation_type !== 'test_points' && (
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
              </Tabs.TabPane>

              <Tabs.TabPane tab="测试用例配置" key="test_cases">
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
              message="功能施工中"
              description="批量生成中心正在进行系统升级和功能优化，暂时无法使用。请使用统一测试用例管理功能进行测试点生成。"
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
                      {form.getFieldValue('generation_mode') === 'test_points_only' ? '仅生成测试点' : '仅生成测试用例'}
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
                      <div><strong>测试用例数量：</strong>{(form.getFieldValue('business_types')?.length || 0) * (form.getFieldValue('test_points_count') || 50) * (form.getFieldValue('cases_per_point') || 3)}</div>
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
              <Button type="primary" onClick={handleGenerate} disabled loading={isGenerating}>
                开始批量生成 (施工中)
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
        <Title level={2}>
          <Badge.Ribbon text="施工中" color="orange">
            批量生成中心
          </Badge.Ribbon>
        </Title>
        <Paragraph type="secondary">
          智能批量生成测试点和测试用例，支持多业务类型并行处理
        </Paragraph>
      </div>

      {/* 施工中提示 */}
      <Alert
        message="功能施工中"
        description="批量生成中心正在进行系统升级和功能优化，暂时无法使用。请稍后再试或使用统一测试用例管理功能。"
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
        action={
          <Button type="primary" size="small" onClick={() => navigate('/test-management/unified')}>
            使用统一测试用例管理
          </Button>
        }
      />

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
            <Button type="primary" onClick={handleNext} disabled>
              下一步 (施工中)
            </Button>
          )}
          {currentStep === 1 && (
            <Button type="primary" onClick={handleNext} disabled>
              下一步 (施工中)
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