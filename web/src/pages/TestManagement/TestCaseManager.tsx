import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Tabs,
  Divider,
  Alert,
  Steps,
  List
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  SearchOutlined,
  FilterOutlined,
  ExportOutlined,
  ImportOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProject } from '../../contexts/ProjectContext';
import { unifiedGenerationService } from '../../services';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;

interface TestCase {
  id: number;
  test_case_id: string;
  name: string;
  description: string;
  business_type: string;
  module: string;
  preconditions: string;
  steps: string;
  expected_result: string;
  priority: 'high' | 'medium' | 'low';
  status: 'draft' | 'approved' | 'completed';
  test_point_id?: number;
  created_at: string;
  updated_at: string;
  project_id: number;
  testPoint?: {
    id: number;
    test_point_id: string;
    title: string;
  };
}

interface CreateTestCaseData {
  name: string;
  description: string;
  business_type: string;
  module: string;
  preconditions: string;
  steps: string;
  expected_result: string;
  priority: 'high' | 'medium' | 'low';
  test_point_id?: number;
}

interface GenerateTestCaseData {
  test_point_ids: number[];
  include_negative_cases: boolean;
  complexity_level: string;
  additional_context?: string;
}

const TestCaseManager: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { currentProject } = useProject();

  // 如果没有选择项目，显示提示
  if (!currentProject) {
    return (
      <div style={{ padding: '24px' }}>
        <Title level={2}>测试用例管理</Title>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Text type="secondary">请先选择一个项目来管理测试用例</Text>
          </div>
        </Card>
      </div>
    );
  }

  // 状态管理
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [generateModalVisible, setGenerateModalVisible] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [form] = Form.useForm();
  const [generateForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('list');
  const [searchText, setSearchText] = useState('');
  const [selectedTestPointId, setSelectedTestPointId] = useState<number | undefined>(searchParams.get('test_point_id') ? parseInt(searchParams.get('test_point_id')!) : undefined);

  // 获取业务类型数据
  const { data: businessTypesData } = useQuery({
    queryKey: ['businessTypes', { project_id: currentProject?.id, is_active: true }],
    queryFn: () => unifiedGenerationService.getBusinessTypes(currentProject?.id),
    enabled: !!currentProject?.id
  });

  // 获取测试点数据（用于生成测试用例）
  const { data: testPointsData } = useQuery({
    queryKey: ['testPoints', { project_id: currentProject?.id }],
    queryFn: () => unifiedGenerationService.getTestPoints({ project_id: currentProject?.id }),
    enabled: !!currentProject?.id
  });

  // 获取测试用例数据
  const { data: testCases, isLoading, error: testCasesError, refetch: refetchTestCases } = useQuery({
    queryKey: ['testCases', {
      project_id: currentProject?.id,
      test_point_id: selectedTestPointId
    }],
    queryFn: () => unifiedGenerationService.getUnifiedTestCases({
      project_id: currentProject?.id,
      test_point_id: selectedTestPointId,
      page: 1,
      size: 100
    }),
    staleTime: 5 * 60 * 1000,
    enabled: !!currentProject?.id
  });

  // 模拟获取测试点数据
  const { data: testPoints } = useQuery({
    queryKey: ['testPoints', { project_id: currentProject?.id }],
    queryFn: () => Promise.resolve({ data: mockTestPoints }),
    staleTime: 5 * 60 * 1000
  });

  // 模拟创建测试用例
  const createMutation = useMutation({
    mutationFn: async (data: CreateTestCaseData) => {
      console.log('Creating test case:', data);
      return { id: Date.now(), ...data, test_case_id: `TC${Date.now()}` };
    },
    onSuccess: () => {
      message.success('测试用例创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['testCases'] });
    },
    onError: () => {
      message.error('创建测试用例失败');
    }
  });

  // 模拟更新测试用例
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; caseData: Partial<TestCase> }) => {
      console.log('Updating test case:', data);
      return data.caseData;
    },
    onSuccess: () => {
      message.success('测试用例更新成功');
      setEditingTestCase(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['testCases'] });
    },
    onError: () => {
      message.error('更新测试用例失败');
    }
  });

  // 模拟删除测试用例
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log('Deleting test case:', id);
      return id;
    },
    onSuccess: () => {
      message.success('测试用例删除成功');
      setSelectedRowKeys([]);
      queryClient.invalidateQueries({ queryKey: ['testCases'] });
    },
    onError: () => {
      message.error('删除测试用例失败');
    }
  });

  // 模拟AI生成测试用例
  const generateMutation = useMutation({
    mutationFn: async (data: GenerateTestCaseData) => {
      console.log('Generating test cases:', data);
      // 模拟生成延迟
      await new Promise(resolve => setTimeout(resolve, 3000));
      return { generated: data.test_point_ids.length * 2 }; // 每个测试点生成2个测试用例
    },
    onSuccess: (data) => {
      message.success(`成功生成 ${data.generated} 个测试用例`);
      setGenerateModalVisible(false);
      generateForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['testCases'] });
    },
    onError: () => {
      message.error('AI生成测试用例失败');
    }
  });

  const handleCreate = () => {
    setEditingTestCase(null);
    form.resetFields();
    // 如果有选中的测试点ID，自动填充
    if (selectedTestPointId) {
      form.setFieldValue('test_point_id', selectedTestPointId);
    }
    setCreateModalVisible(true);
  };

  const handleEdit = (record: TestCase) => {
    setEditingTestCase(record);
    form.setFieldsValue(record);
    setCreateModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync(id);
  };

  const handleCreateOrUpdate = async () => {
    try {
      const values = await form.validateFields();
      if (editingTestCase) {
        await updateMutation.mutateAsync({ id: editingTestCase.id, caseData: values });
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const handleGenerate = () => {
    generateForm.resetFields();
    // 如果有选中的测试点ID，自动填充
    if (selectedTestPointId) {
      generateForm.setFieldValue('test_point_ids', [selectedTestPointId]);
    }
    setGenerateModalVisible(true);
  };

  const handleGenerateSubmit = async () => {
    try {
      const values = await generateForm.validateFields();
      await generateMutation.mutateAsync(values);
    } catch (error) {
      console.error('Generate form validation failed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'default',
      approved: 'success',
      completed: 'processing',
      modified: 'warning'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const getStatusText = (status: string) => {
    const texts = {
      draft: '草稿',
      approved: '已批准',
      completed: '已完成',
      modified: '已修改'
    };
    return texts[status as keyof typeof texts] || status;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'red',
      medium: 'orange',
      low: 'green'
    };
    return colors[priority as keyof typeof colors] || 'default';
  };

  const getPriorityText = (priority: string) => {
    const texts = {
      high: '高',
      medium: '中',
      low: '低'
    };
    return texts[priority as keyof typeof texts] || priority;
  };

  const columns = [
    {
      title: '测试用例ID',
      dataIndex: 'test_case_id',
      key: 'test_case_id',
      width: 120,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 250,
      ellipsis: true,
    },
    {
      title: '关联测试点',
      dataIndex: 'testPoint',
      key: 'testPoint',
      width: 150,
      render: (testPoint: TestCase['testPoint']) => (
        testPoint ? (
          <Tag color="blue">
            {testPoint.test_point_id} - {testPoint.title}
          </Tag>
        ) : (
          <Tag color="default">无关联</Tag>
        )
      )
    },
    {
      title: '业务类型',
      dataIndex: 'business_type',
      key: 'business_type',
      width: 100,
      render: (type: string) => <Tag color="blue">{type}</Tag>
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (module: string) => <Tag color="green">{module}</Tag>
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
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: TestCase) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/test-management/cases/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确定要删除这个测试用例吗？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  // 使用真实API数据
  const filteredTestCases = testCases?.items?.filter(item =>
    item.name.toLowerCase().includes(searchText.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchText.toLowerCase()))
  ) || [];

  const tabItems = [
    {
      key: 'list',
      label: '测试用例列表',
      children: (
        <div>
          {selectedTestPointId && (
            <Alert
              message={`当前显示测试点 "${mockTestPoints.find(tp => tp.id === selectedTestPointId)?.title}" 的测试用例`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              action={
                <Button size="small" onClick={() => navigate('/test-management/points')}>
                  切换到测试点管理
                </Button>
              }
            />
          )}
          <Card style={{ marginBottom: 16 }}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                创建测试用例
              </Button>
              <Button icon={<ThunderboltOutlined />} onClick={handleGenerate}>
                AI生成
              </Button>
              <Button icon={<ExportOutlined />}>
                导出
              </Button>
              <Button icon={<ImportOutlined />}>
                导入
              </Button>
              <Input
                placeholder="搜索测试用例..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 200 }}
              />
            </Space>
          </Card>

          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={filteredTestCases}
            rowKey="id"
            loading={isLoading}
            pagination={{
              total: testCases?.total || 0,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true
            }}
          />
        </div>
      )
    },
    {
      key: 'overview',
      label: '统计概览',
      children: (
        <Card>
          <Alert
            message="测试用例统计概览"
            description="这里是测试用例的统计数据和图表展示区域，可以展示各模块的测试用例分布、状态统计、执行结果等信息。"
            type="info"
            showIcon
          />
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Text type="secondary">统计功能开发中...</Text>
          </div>
        </Card>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>测试用例管理</Title>
        <Paragraph type="secondary">
          管理项目中的测试用例，支持基于测试点创建或AI智能生成
        </Paragraph>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      {/* 创建/编辑测试用例模态框 */}
      <Modal
        title={editingTestCase ? '编辑测试用例' : '创建测试用例'}
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={handleCreateOrUpdate}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="测试用例名称"
                rules={[{ required: true, message: '请输入测试用例名称' }]}
              >
                <Input placeholder="请输入测试用例名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="test_point_id"
                label="关联测试点"
              >
                <Select placeholder="请选择关联的测试点（可选）" allowClear>
                  {testPoints?.data?.map(tp => (
                    <Option key={tp.id} value={tp.id}>
                      {tp.test_point_id} - {tp.title}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="description"
            label="测试用例描述"
            rules={[{ required: true, message: '请输入测试用例描述' }]}
          >
            <TextArea rows={3} placeholder="请输入测试用例描述" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="business_type"
                label="业务类型"
                rules={[{ required: true, message: '请选择业务类型' }]}
              >
                <Select
                  placeholder="请选择业务类型"
                  optionLabelProp="label"
                  showSearch
                  filterOption={(input, option) => {
                    const searchText = input.toLowerCase();
                    const businessCode = String(option?.key || '').toLowerCase();
                    const businessName = String(option?.children || '').toLowerCase();
                    const businessLabel = String(option?.label || '').toLowerCase();

                    return (
                      businessCode.includes(searchText) ||
                      businessName.includes(searchText) ||
                      businessLabel.includes(searchText)
                    );
                  }}
                >
                  {businessTypesData?.items?.map?.((type: any) => (
                    <Option
                      key={type.code || type.value}
                      value={type.code || type.value}
                      label={`[${type.code || type.value}] ${type.name || type.label}`}
                    >
                      [{type.code || type.value}] {type.name || type.label}
                    </Option>
                  )) || []}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="priority"
                label="优先级"
                rules={[{ required: true, message: '请选择优先级' }]}
              >
                <Select placeholder="请选择优先级">
                  <Option value="high">高</Option>
                  <Option value="medium">中</Option>
                  <Option value="low">低</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="preconditions"
            label="前置条件"
            rules={[{ required: true, message: '请输入前置条件' }]}
          >
            <TextArea rows={3} placeholder="请输入测试执行前的准备条件" />
          </Form.Item>
          <Form.Item
            name="steps"
            label="执行步骤"
            rules={[{ required: true, message: '请输入执行步骤' }]}
          >
            <TextArea rows={4} placeholder="请按步骤格式输入执行过程，每步一行" />
          </Form.Item>
          <Form.Item
            name="expected_result"
            label="预期结果"
            rules={[{ required: true, message: '请输入预期结果' }]}
          >
            <TextArea rows={3} placeholder="请输入预期的测试结果" />
          </Form.Item>
        </Form>
      </Modal>

      {/* AI生成测试用例模态框 */}
      <Modal
        title="AI生成测试用例"
        open={generateModalVisible}
        onCancel={() => setGenerateModalVisible(false)}
        onOk={handleGenerateSubmit}
        confirmLoading={generateMutation.isPending}
        width={700}
      >
        <Alert
          message="AI生成说明"
          description="系统将基于选择的测试点，使用AI自动生成详细的测试用例，包含前置条件、执行步骤和预期结果。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={generateForm} layout="vertical">
          <Form.Item
            name="test_point_ids"
            label="选择测试点"
            rules={[{ required: true, message: '请选择要生成测试用例的测试点' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择测试点（可多选）"
              style={{ width: '100%' }}
            >
              {testPointsData?.items?.map(tp => (
                <Option key={tp.id} value={tp.id}>
                  {tp.test_point_id} - {tp.title}
                </Option>
              )) || []}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="include_negative_cases"
                label="包含负向用例"
                valuePropName="checked"
              >
                <Select defaultValue={true}>
                  <Option value={true}>是</Option>
                  <Option value={false}>否</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="complexity_level"
                label="生成复杂度"
                rules={[{ required: true, message: '请选择生成复杂度' }]}
              >
                <Select placeholder="请选择生成复杂度">
                  <Option value="simple">简单</Option>
                  <Option value="standard">标准</Option>
                  <Option value="complex">复杂</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="additional_context"
            label="额外上下文（可选）"
          >
            <TextArea
              rows={3}
              placeholder="可以输入额外的业务上下文信息，帮助AI生成更准确的测试用例"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TestCaseManager;