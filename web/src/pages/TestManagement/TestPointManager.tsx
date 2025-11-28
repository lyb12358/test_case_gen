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
  Alert
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  BulbOutlined,
  SearchOutlined,
  FilterOutlined,
  ExportOutlined,
  ImportOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProject } from '../../contexts/ProjectContext';
import { unifiedGenerationService } from '../../services';
import type { BusinessType } from '../../types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface TestPoint {
  id: number;
  test_point_id: string;
  title: string;
  description: string;
  business_type: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  updated_at: string;
  project_id: number;
}

interface CreateTestPointData {
  title: string;
  description: string;
  business_type: string;
  priority: 'high' | 'medium' | 'low';
}

interface GenerateTestPointsData {
  business_type: string;
  count: number;
  complexity_level: string;
  additional_context?: string;
}

const TestPointManager: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { currentProject } = useProject();

  // 如果没有选择项目，显示提示
  if (!currentProject) {
    return (
      <div style={{ padding: '24px' }}>
        <Title level={2}>测试点管理</Title>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Text type="secondary">请先选择一个项目来管理测试点</Text>
          </div>
        </Card>
      </div>
    );
  }

  // 状态管理
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [generateModalVisible, setGenerateModalVisible] = useState(false);
  const [editingTestPoint, setEditingTestPoint] = useState<TestPoint | null>(null);
  const [form] = Form.useForm();
  const [generateForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('list');
  const [searchText, setSearchText] = useState('');

  // 获取业务类型数据
  const { data: businessTypesData } = useQuery({
    queryKey: ['businessTypes', { project_id: currentProject?.id }],
    queryFn: () => unifiedGenerationService.getBusinessTypes(currentProject?.id),
    enabled: !!currentProject?.id
  });

  // 获取测试点数据
  const { data: testPoints, isLoading, error, refetch } = useQuery({
    queryKey: ['testPoints', { project_id: currentProject?.id }],
    queryFn: () => unifiedGenerationService.getTestPoints({
      project_id: currentProject?.id,
      page: 1,
      size: 100
    }),
    staleTime: 5 * 60 * 1000,
    enabled: !!currentProject?.id
  });

  // 创建测试点
  const createMutation = useMutation({
    mutationFn: async (data: CreateTestPointData) => {
      const testData = {
        title: data.title,
        description: data.description,
        business_type: data.business_type,
        priority: data.priority,
        project_id: currentProject?.id
      };
      return await unifiedGenerationService.createTestPoint(testData);
    },
    onSuccess: () => {
      message.success('测试点创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['testPoints'] });
    },
    onError: (error: any) => {
      message.error(`创建测试点失败: ${error.message || '未知错误'}`);
    }
  });

  // 更新测试点
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; testData: Partial<TestPoint> }) => {
      return await unifiedGenerationService.updateTestPoint(data.id, data.testData);
    },
    onSuccess: () => {
      message.success('测试点更新成功');
      setEditingTestPoint(null);
      setCreateModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['testPoints'] });
    },
    onError: (error: any) => {
      message.error(`更新测试点失败: ${error.message || '未知错误'}`);
    }
  });

  // 删除测试点
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await unifiedGenerationService.deleteTestPoint(id);
      return id;
    },
    onSuccess: () => {
      message.success('测试点删除成功');
      setSelectedRowKeys([]);
      queryClient.invalidateQueries({ queryKey: ['testPoints'] });
    },
    onError: (error: any) => {
      message.error(`删除测试点失败: ${error.message || '未知错误'}`);
    }
  });

  // AI生成测试点
  const generateMutation = useMutation({
    mutationFn: async (data: GenerateTestPointsData) => {
      // 这里需要调用AI生成API，目前使用模拟逻辑
      console.log('Generating test points:', data);
      // 实际应该调用API生成测试点
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { generated: data.count };
    },
    onSuccess: (data) => {
      message.success(`成功生成 ${data.generated} 个测试点`);
      setGenerateModalVisible(false);
      generateForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['testPoints'] });
    },
    onError: (error: any) => {
      message.error(`AI生成测试点失败: ${error.message || '未知错误'}`);
    }
  });

  const handleCreate = () => {
    setEditingTestPoint(null);
    form.resetFields();
    setCreateModalVisible(true);
  };

  const handleEdit = (record: TestPoint) => {
    setEditingTestPoint(record);
    form.setFieldsValue(record);
    setCreateModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync(id);
  };

  const handleCreateOrUpdate = async () => {
    try {
      const values = await form.validateFields();
      if (editingTestPoint) {
        await updateMutation.mutateAsync({ id: editingTestPoint.id, testData: values });
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const handleGenerate = () => {
    generateForm.resetFields();
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
      title: '测试点ID',
      dataIndex: 'test_point_id',
      key: 'test_point_id',
      width: 120,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      ellipsis: true,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 300,
      ellipsis: true,
    },
    {
      title: '业务类型',
      dataIndex: 'business_type',
      key: 'business_type',
      width: 120,
      render: (type: string) => <Tag color="blue">{type}</Tag>
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>
          {getPriorityText(priority)}
        </Tag>
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
      render: (_: any, record: TestPoint) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确定要删除这个测试点吗？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
          <Tooltip title="生成测试用例">
            <Button
              type="text"
              icon={<PlayCircleOutlined />}
              onClick={() => navigate(`/test-management/cases?test_point_id=${record.id}`)}
            />
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

  // 使用真实API数据，如果没有数据则显示空数组
  const filteredTestPoints = testPoints?.items?.filter(item =>
    item.title.toLowerCase().includes(searchText.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchText.toLowerCase()))
  ) || [];

  const tabItems = [
    {
      key: 'list',
      label: '测试点列表',
      children: (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                创建测试点
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
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                刷新
              </Button>
              <Input
                placeholder="搜索测试点..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 200 }}
              />
            </Space>
          </Card>

          {error ? (
            <Alert
              message="加载失败"
              description="无法加载测试点数据，请检查网络连接或稍后重试"
              type="error"
              showIcon
              action={
                <Button size="small" onClick={() => refetch()}>
                  重试
                </Button>
              }
              style={{ marginBottom: 16 }}
            />
          ) : (
            <Table
              rowSelection={rowSelection}
              columns={columns}
              dataSource={filteredTestPoints}
              rowKey="id"
              loading={isLoading}
              pagination={{
                total: testPoints?.total || 0,
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true
              }}
            />
          )}
        </div>
      )
    },
    {
      key: 'overview',
      label: '统计概览',
      children: (
        <Card>
          <Alert
            message="测试点统计概览"
            description="这里是测试点的统计数据和图表展示区域，可以展示各业务类型的测试点分布、状态统计等信息。"
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
        <Title level={2}>测试点管理</Title>
        <Paragraph type="secondary">
          管理项目中的测试点，支持手动创建和AI智能生成
        </Paragraph>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      {/* 创建/编辑测试点模态框 */}
      <Modal
        title={editingTestPoint ? '编辑测试点' : '创建测试点'}
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={handleCreateOrUpdate}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="测试点标题"
            rules={[{ required: true, message: '请输入测试点标题' }]}
          >
            <Input placeholder="请输入测试点标题" />
          </Form.Item>
          <Form.Item
            name="description"
            label="测试点描述"
            rules={[{ required: true, message: '请输入测试点描述' }]}
          >
            <TextArea rows={4} placeholder="请输入测试点描述" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
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
            <Col span={12}>
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
        </Form>
      </Modal>

      {/* AI生成测试点模态框 */}
      <Modal
        title="AI生成测试点"
        open={generateModalVisible}
        onCancel={() => setGenerateModalVisible(false)}
        onOk={handleGenerateSubmit}
        confirmLoading={generateMutation.isPending}
        width={600}
      >
        <Alert
          message="AI生成说明"
          description="系统将根据选择的业务类型和参数，使用AI自动生成符合要求的测试点。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={generateForm} layout="vertical">
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
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="count"
                label="生成数量"
                rules={[{ required: true, message: '请输入生成数量' }]}
              >
                <Input type="number" min={1} max={100} placeholder="请输入生成数量" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="complexity_level"
                label="复杂度"
                rules={[{ required: true, message: '请选择复杂度' }]}
              >
                <Select placeholder="请选择复杂度">
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
              placeholder="可以输入额外的业务上下文信息，帮助AI生成更准确的测试点"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TestPointManager;