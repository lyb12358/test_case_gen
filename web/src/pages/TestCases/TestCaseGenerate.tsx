import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Form,
  Select,
  Button,
  Steps,
  Row,
  Col,
  Alert,
  Spin,
  Progress,
  Divider,
  Tag,
  Descriptions,
  Result
} from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { testCaseService } from '../../services/testCaseService';
import { taskService } from '../../services/taskService';

const { Title } = Typography;
const { Option } = Select;

interface GenerationTask {
  id: string;
  business_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  created_at: string;
}

const TestCaseGenerate: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [currentTask, setCurrentTask] = useState<GenerationTask | null>(null);
  const [polling, setPolling] = useState(false);

  // 获取业务类型列表
  const { data: businessTypesData, isLoading: typesLoading } = useQuery({
    queryKey: ['businessTypes'],
    queryFn: testCaseService.getBusinessTypes,
  });

  // 提取业务类型数组
  const businessTypes = businessTypesData?.business_types || [];

  // 生成测试用例
  const generateMutation = useMutation({
    mutationFn: testCaseService.generateTestCases,
    onSuccess: (data) => {
      if (currentTask) {
        setCurrentTask({
          ...currentTask,
          id: data.task_id
        });
      }
      setPolling(true);
      form.resetFields();
    },
    onError: (error: any) => {
      console.error('生成测试用例失败:', error);
    },
  });

  // 轮询任务状态
  const { data: taskStatus } = useQuery({
    queryKey: ['taskStatus', currentTask?.id],
    queryFn: () => currentTask ? taskService.getTaskStatus(currentTask.id) : null,
    enabled: polling && !!currentTask?.id,
    refetchInterval: polling ? 2000 : false,
  });

  // 监听任务状态变化
  useEffect(() => {
    if (taskStatus && currentTask && taskStatus.status !== currentTask.status) {
      const updatedTask: GenerationTask = {
        id: currentTask.id,
        business_type: currentTask.business_type,
        status: taskStatus.status as 'pending' | 'running' | 'completed' | 'failed',
        progress: taskStatus.progress,
        created_at: currentTask.created_at
      };

      setCurrentTask(updatedTask);

      if (taskStatus.status === 'completed') {
        setPolling(false);
        queryClient.invalidateQueries({ queryKey: ['testCases'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      } else if (taskStatus.status === 'failed') {
        setPolling(false);
      }
    }
  }, [taskStatus?.status, taskStatus?.progress, currentTask?.status, queryClient]);

  const handleGenerate = (values: { business_type: string }) => {
    setCurrentTask({
      id: '', // Will be set from response
      business_type: values.business_type,
      status: 'pending',
      created_at: new Date().toISOString()
    });
    generateMutation.mutate({ business_type: values.business_type });
  };

  const handleViewResults = () => {
    if (currentTask) {
      navigate('/test-cases/list');
    }
  };

  const handleReset = () => {
    setCurrentTask(null);
    setPolling(false);
    form.resetFields();
  };

  const getBusinessTypeFullName = (type: string) => {
    const names: Record<string, string> = {
      'RCC': '远程净化',
      'RFD': '香氛控制',
      'ZAB': '远程恒温座舱设置',
      'ZBA': '水淹报警'
    };
    return names[type] || type;
  };

  const getBusinessTypeDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      'RCC': '远程空调净化系统，包括自动净化、手动控制等场景',
      'RFD': '车载香氛系统，支持多种香型选择和浓度控制',
      'ZAB': '智能座舱温度调节，提供舒适的驾乘环境',
      'ZBA': '安全防护系统，检测水浸风险并及时报警'
    };
    return descriptions[type] || '';
  };

  const getStepStatus = (step: number) => {
    if (!currentTask) return 'wait';

    if (currentTask.status === 'failed') {
      return step <= 2 ? 'error' : 'wait';
    }

    if (currentTask.status === 'completed') return 'finish';
    if (currentTask.status === 'running') {
      return step <= 2 ? 'process' : 'wait';
    }
    return step <= 1 ? 'process' : 'wait';
  };

  const currentStep = currentTask ?
    (currentTask.status === 'completed' ? 3 :
     currentTask.status === 'running' ? 2 :
     currentTask.status === 'failed' ? 2 : 1) : 0;

  return (
    <div>
      <Title level={2}>生成测试用例</Title>

      {!currentTask ? (
        <Card title="选择业务类型">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleGenerate}
          >
            <Form.Item
              name="business_type"
              label="业务类型"
              rules={[{ required: true, message: '请选择业务类型' }]}
            >
              <Select
                placeholder="请选择要生成测试用例的业务类型"
                loading={typesLoading}
                size="large"
                optionLabelProp="label"
                dropdownStyle={{ maxWidth: 400 }}
              >
                {businessTypes.map(type => (
                  <Option key={type} value={type} label={getBusinessTypeFullName(type)}>
                    <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      <div style={{ fontWeight: 'bold', lineHeight: '1.4' }}>
                        {getBusinessTypeFullName(type)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: 2, lineHeight: '1.3' }}>
                        {getBusinessTypeDescription(type)}
                      </div>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                icon={<PlayCircleOutlined />}
                loading={generateMutation.isPending}
                disabled={generateMutation.isPending}
              >
                开始生成测试用例
              </Button>
            </Form.Item>
          </Form>

          <Divider />

          <Alert
            message="生成说明"
            description={
              <div>
                <p>测试用例生成过程包括以下步骤：</p>
                <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>
                  <li style={{ marginBottom: '4px' }}>分析业务需求和场景</li>
                  <li style={{ marginBottom: '4px' }}>调用AI模型生成测试用例</li>
                  <li style={{ marginBottom: '4px' }}>格式化和保存测试用例到数据库</li>
                </ol>
                <p style={{ marginBottom: 0 }}>整个过程通常需要1-3分钟，请耐心等待。</p>
              </div>
            }
            type="info"
            showIcon
          />
        </Card>
      ) : (
        <Row gutter={[24, 24]}>
          <Col span={16}>
            <Card title="生成进度">
              <Steps
                current={currentStep}
                items={[
                  {
                    title: '开始生成',
                    description: '初始化任务',
                    status: getStepStatus(1),
                    icon: <ClockCircleOutlined />
                  },
                  {
                    title: 'AI生成中',
                    description: '正在调用AI模型生成测试用例',
                    status: getStepStatus(2),
                    icon: polling ? <Spin size="small" /> : undefined
                  },
                  {
                    title: '生成完成',
                    description: '测试用例已保存到数据库',
                    status: getStepStatus(3),
                    icon: <CheckCircleOutlined />
                  }
                ]}
              />

              <Divider />

              {polling && (
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <Spin size="large" />
                  <div style={{ marginTop: 16 }}>
                    <Progress
                      percent={taskStatus?.progress || 0}
                      status="active"
                      strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#87d068',
                      }}
                    />
                  </div>
                  <p style={{ marginTop: 8, color: '#666' }}>
                    {taskStatus?.error || '正在生成测试用例，请稍候...'}
                  </p>
                </div>
              )}

              {currentTask.status === 'completed' && (
                <Result
                  status="success"
                  title="测试用例生成完成！"
                  subTitle={`已成功生成 ${currentTask.business_type} 类型的测试用例`}
                  extra={[
                    <Button key="view" type="primary" onClick={handleViewResults}>
                      查看测试用例
                    </Button>,
                    <Button key="new" onClick={handleReset}>
                      生成新的测试用例
                    </Button>
                  ]}
                />
              )}

              {currentTask.status === 'failed' && (
                <Result
                  status="error"
                  title="测试用例生成失败"
                  subTitle={currentTask.message || '生成过程中遇到错误，请重试'}
                  extra={[
                    <Button key="retry" type="primary" icon={<ReloadOutlined />} onClick={handleReset}>
                      重新生成
                    </Button>
                  ]}
                />
              )}
            </Card>
          </Col>

          <Col span={8}>
            <Card title="任务信息" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="任务ID">
                  <span style={{ fontFamily: 'monospace' }}>#{currentTask.id}</span>
                </Descriptions.Item>
                <Descriptions.Item label="业务类型">
                  <Tag color="blue">
                    {getBusinessTypeFullName(currentTask.business_type)}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {new Date(currentTask.created_at).toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="当前状态">
                  <Tag
                    color={
                      currentTask.status === 'completed' ? 'green' :
                      currentTask.status === 'running' ? 'blue' :
                      currentTask.status === 'failed' ? 'red' : 'orange'
                    }
                  >
                    {
                      currentTask.status === 'completed' ? '已完成' :
                      currentTask.status === 'running' ? '进行中' :
                      currentTask.status === 'failed' ? '失败' : '等待中'
                    }
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="帮助信息" size="small" style={{ marginTop: 16 }}>
              <Alert
                message="提示"
                description={
                  <div>
                    <p>• 生成过程中请勿关闭页面</p>
                    <p>• 如遇网络问题可稍后重试</p>
                    <p>• 生成的测试用例将自动保存</p>
                  </div>
                }
                type="info"
                showIcon
              />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default TestCaseGenerate;