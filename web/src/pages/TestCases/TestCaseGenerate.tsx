import React, { useState } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { testCaseService } from '../../services/testCaseService';
import { useTask, requestNotificationPermission } from '../../contexts/TaskContext';

// 浏览器通知功能
function showNotification(title: string, body: string, type: 'success' | 'error' | 'info' = 'info') {
  // 浏览器通知
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: type === 'success' ? '/success-icon.png' : type === 'error' ? '/error-icon.png' : '/info-icon.png',
    });
  }

  // 控制台通知
  console.log(`🔔 ${title}: ${body}`);
}

const { Title } = Typography;
const { Option } = Select;

const TestCaseGenerate: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { state: taskState, createTask, clearTask } = useTask();
  const [submitted, setSubmitted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [minDisplayTimer, setMinDisplayTimer] = useState<NodeJS.Timeout | null>(null);

  // 请求通知权限
  React.useEffect(() => {
    requestNotificationPermission();
  }, []);

  // 处理任务完成后的状态管理
  React.useEffect(() => {
    if (taskState.currentTask && (taskState.currentTask.status === 'completed' || taskState.currentTask.status === 'failed')) {
      // 等待最小显示时间结束后再设置 isGenerating
      if (!minDisplayTimer) {
        setIsGenerating(false);
      }
    }
  }, [taskState.currentTask?.status, minDisplayTimer]);

  // 获取业务类型列表
  const { data: businessTypesData, isLoading: typesLoading } = useQuery({
    queryKey: ['businessTypes'],
    queryFn: testCaseService.getBusinessTypes,
  });

  // 获取业务类型映射（包含中文名称和描述）
  const { data: businessTypesMapping } = useQuery({
    queryKey: ['businessTypesMapping'],
    queryFn: testCaseService.getBusinessTypesMapping,
  });

  const businessTypes = businessTypesData?.business_types || [];

  const handleGenerate = async (values: { business_type: string }) => {
    setSubmitted(true);
    setIsGenerating(true); // 立即设置为生成中状态

    // 设置最小显示时间（2秒）
    const timer = setTimeout(() => {
      setMinDisplayTimer(null);
    }, 2000);
    setMinDisplayTimer(timer);

    try {
      await createTask(values.business_type);
      form.resetFields();
    } catch (error) {
      console.error('生成测试用例失败:', error);
      setSubmitted(false);
      setIsGenerating(false);
      // 清除最小显示时间定时器
      if (minDisplayTimer) {
        clearTimeout(minDisplayTimer);
        setMinDisplayTimer(null);
      }
      // 显示错误通知
      showNotification('生成失败', '无法创建测试用例生成任务，请重试', 'error');
    }
  };

  const handleViewResults = () => {
    navigate('/test-cases/list');
  };

  const handleReset = () => {
    clearTask();
    setSubmitted(false);
    setIsGenerating(false);
    // 清除最小显示时间定时器
    if (minDisplayTimer) {
      clearTimeout(minDisplayTimer);
      setMinDisplayTimer(null);
    }
    form.resetFields();
  };

  const getBusinessTypeFullName = (type: string) => {
    if (!businessTypesMapping?.business_types) return type;
    return businessTypesMapping.business_types[type]?.name || type;
  };

  const getBusinessTypeDescription = (type: string) => {
    if (!businessTypesMapping?.business_types) return '';
    return businessTypesMapping.business_types[type]?.description || '';
  };

  const getStepStatus = (step: number) => {
    // 如果正在生成中（立即响应状态），显示进行中状态
    if (isGenerating) {
      return step === 1 ? 'process' : 'wait';
    }

    if (!taskState.currentTask) {
      return 'wait';
    }

    const { status } = taskState.currentTask;

    if (status === 'failed') {
      return step <= 2 ? 'error' : 'wait';
    }

    if (status === 'completed') {
      return 'finish';
    }

    // 只要任务存在且未失败或完成，就显示进行中状态
    if (status === 'pending' || status === 'running') {
      // 根据currentStep动态返回状态
      if (currentStep === 1) {
        // 如果当前步骤是1，那么步骤1显示process，步骤2和3显示wait
        return step === 1 ? 'process' : 'wait';
      } else if (currentStep === 2) {
        // 如果当前步骤是2，那么步骤1显示finish，步骤2显示process，步骤3显示wait
        if (step === 1) return 'finish';
        if (step === 2) return 'process';
        return 'wait';
      }
      return 'process';
    }

    return step <= 1 ? 'process' : 'wait';
  };

  const currentStep = (() => {
    // 如果正在生成中（立即响应状态），显示步骤1
    if (isGenerating) {
      return 1;
    }

    if (!taskState.currentTask) {
      return 0;
    }

    const { status } = taskState.currentTask;
    let step;

    if (status === 'completed') {
      step = 3;
    } else if (status === 'failed') {
      step = 2;
    } else if (status === 'pending' || status === 'running') {
      step = 1;
    } else {
      step = 1;
    }

    return step;
  })();

  return (
    <div>
      <Title level={2}>生成测试用例</Title>

      {!taskState.currentTask && !submitted && !isGenerating ? (
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
                loading={typesLoading || !businessTypesMapping}
                size="large"
                optionLabelProp="label"
                dropdownStyle={{ maxWidth: 500 }}
              >
                {businessTypes.map(type => (
                  <Option key={type} value={type} label={`[${type}] ${getBusinessTypeFullName(type)}`}>
                    <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      <div style={{ fontWeight: 'bold', lineHeight: '1.4' }}>
                        [{type}] {getBusinessTypeFullName(type)}
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
                loading={submitted}
                disabled={submitted}
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
                status={taskState.currentTask?.status === 'failed' ? 'error' :
                        taskState.currentTask?.status === 'completed' ? 'finish' :
                        (isGenerating || (taskState.currentTask?.status === 'pending' || taskState.currentTask?.status === 'running')) ? 'process' : 'wait'}
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
                    icon: (isGenerating || (taskState.currentTask?.status === 'pending' || taskState.currentTask?.status === 'running')) ? <Spin size="small" /> : undefined
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

              {(() => {
                const shouldShow = isGenerating || (taskState.currentTask &&
                                  (taskState.currentTask.status === 'pending' || taskState.currentTask.status === 'running'));

                return shouldShow ? (
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 16 }}>
                      <Progress
                        percent={taskState.currentTask?.progress || (isGenerating ? 10 : 0)}
                        status="active"
                        strokeColor={{
                          '0%': '#108ee9',
                          '100%': '#87d068',
                        }}
                      />
                    </div>
                    <p style={{ marginTop: 8, color: '#666' }}>
                      {isGenerating ? '正在初始化生成任务...' :
                       (taskState.currentTask?.status === 'pending' ? '正在初始化生成任务...' : '正在调用AI模型生成测试用例，请稍候...')}
                    </p>
                  </div>
                ) : null;
              })()}

              {taskState.currentTask?.status === 'completed' && (
                <Result
                  status="success"
                  title="测试用例生成完成！"
                  subTitle={`已成功生成 ${taskState.currentTask.business_type} 类型的测试用例`}
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

              {taskState.currentTask?.status === 'failed' && (
                <Result
                  status="error"
                  title="测试用例生成失败"
                  subTitle={taskState.currentTask.message || '生成过程中遇到错误，请重试'}
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
                  <span style={{ fontFamily: 'monospace' }}>#{taskState.currentTask?.id}</span>
                </Descriptions.Item>
                <Descriptions.Item label="业务类型">
                  <Tag color="blue">
                    {getBusinessTypeFullName(taskState.currentTask?.business_type || '')}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {taskState.currentTask?.created_at ?
                    new Date(taskState.currentTask.created_at).toLocaleString() :
                    '-'
                  }
                </Descriptions.Item>
                <Descriptions.Item label="当前状态">
                  <Tag
                    color={
                      taskState.currentTask?.status === 'completed' ? 'green' :
                      taskState.currentTask?.status === 'running' ? 'blue' :
                      taskState.currentTask?.status === 'failed' ? 'red' : 'orange'
                    }
                  >
                    {
                      taskState.currentTask?.status === 'completed' ? '已完成' :
                      taskState.currentTask?.status === 'running' ? '进行中' :
                      taskState.currentTask?.status === 'failed' ? '失败' : '等待中'
                    }
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="提示信息" size="small" style={{ marginTop: 16 }}>
              <Alert
                message="异步任务说明"
                description={
                  <div>
                    <p>• 生成任务在后台异步执行</p>
                    <p>• 您可以离开此页面，任务将继续执行</p>
                    <p>• 任务完成时会收到通知提醒</p>
                    <p>• 在导航栏可查看任务进度</p>
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