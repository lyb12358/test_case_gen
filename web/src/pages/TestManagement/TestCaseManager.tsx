import React, { useState, useCallback, useMemo } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Tag,
  Input,
  Select,
  Modal,
  Form,
  Row,
  Col,
  Typography,
  message,
  Popconfirm,
  Divider,
  Tabs,
  Badge,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
  ExportOutlined
} from '@ant-design/icons';

import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 导入类型和服务
import { businessService } from '../../services/businessService';
import unifiedGenerationService from '../../services/unifiedGenerationService';
import StepEditor from '../../components/TestGeneration/StepEditor';
import {
  UnifiedTestCaseResponse,
  UnifiedTestCaseStatus,
  UnifiedTestCaseCreate,
  UnifiedTestCaseUpdate
} from '../../types/unifiedTestCase';
import { TestPoint } from '../../types/testPoints';
import { debounce } from '../../utils/debounce';

type BusinessType = import('../../services/businessService').BusinessType;

const { Title, Text } = Typography;
const { Search } = Input;
const { TabPane } = Tabs;

interface UnifiedTestCaseFormData {
  name: string;
  business_type: string;
  priority: string;
  test_point_id?: number;
  preconditions: string;
  steps: Array<{
    id: number;
    step_number: number;
    action: string;
    expected: string;
  }>;
  expected_result: string[];
}

const TestCaseManager: React.FC = () => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 状态管理
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<UnifiedTestCaseResponse | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeTab, setActiveTab] = useState('list');
  const [isGenerating, setIsGenerating] = useState(false);

  // 简化的状态重置函数
  const resetFormAndState = useCallback(() => {
    form.resetFields();
    setSelectedTestCase(null);
  }, [form]);

  // 获取数据
  const { data: testCases, isLoading, error, refetch } = useQuery({
    queryKey: ['testCases', currentPage, pageSize, searchText],
    queryFn: () => unifiedGenerationService.getUnifiedTestCases({
      page: currentPage,
      size: pageSize,
      keyword: searchText,
      sort_by: 'created_at',
      sort_order: 'desc'
    })
  });

  const { data: testPoints } = useQuery({
    queryKey: ['testPoints'],
    queryFn: () => unifiedGenerationService.getTestPoints({ page: 1, size: 100 })
  });

  const { data: businessTypes } = useQuery({
    queryKey: ['businessTypes'],
    queryFn: () => businessService.getBusinessTypes()
  });

  // 创建测试用例
  const createMutation = useMutation({
    mutationFn: unifiedGenerationService.createUnifiedTestCase,
    onSuccess: () => {
      message.success('测试用例创建成功');
      setCreateModalVisible(false);
      resetFormAndState();
      queryClient.invalidateQueries({ queryKey: ['testCases'] });
    },
    onError: (error: any) => {
      console.error('创建测试用例失败:', error);
      message.error('创建测试用例失败');
    }
  });

  // 更新测试用例
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UnifiedTestCaseUpdate }) =>
      unifiedGenerationService.updateUnifiedTestCase(id, data),
    onSuccess: () => {
      message.success('测试用例更新成功');
      setEditModalVisible(false);
      resetFormAndState();
      queryClient.invalidateQueries({ queryKey: ['testCases'] });
    },
    onError: (error: any) => {
      console.error('更新测试用例失败:', error);
      message.error('更新测试用例失败');
    }
  });

  // 删除测试用例
  const deleteMutation = useMutation({
    mutationFn: unifiedGenerationService.deleteUnifiedTestCase,
    onSuccess: () => {
      message.success('测试用例删除成功');
      setSelectedRowKeys([]);
      queryClient.invalidateQueries({ queryKey: ['testCases'] });
    },
    onError: (error: any) => {
      console.error('删除测试用例失败:', error);
      message.error('删除测试用例失败');
    }
  });

  // 防抖搜索
  const debouncedSearch = useMemo(
    () => debounce((value: string) => {
      setSearchText(value);
      setCurrentPage(1);
    }, 300),
    []
  );

  // 数据转换函数
const convertFormDataToCreate = (formData: UnifiedTestCaseFormData, businessType: string, projectId: number): UnifiedTestCaseCreate => ({
  project_id: projectId,
  business_type: businessType,
  case_id: `TC_${formData.business_type}_${Date.now()}`,
  preconditions: formData.preconditions ? [formData.preconditions] : [],
  test_point_id: formData.test_point_id,
  name: formData.name,
  priority: formData.priority as 'high' | 'medium' | 'low',
  steps: formData.steps,
  expected_result: formData.expected_result,
  status: UnifiedTestCaseStatus.DRAFT
});

const convertFormDataToUpdate = (formData: UnifiedTestCaseFormData): UnifiedTestCaseUpdate => ({
  test_point_id: formData.test_point_id,
  name: formData.name,
  priority: formData.priority as 'high' | 'medium' | 'low',
  preconditions: formData.preconditions ? [formData.preconditions] : [],
  steps: formData.steps,
  expected_result: formData.expected_result
});

// 简单的测试点选择处理
  const handleTestPointChange = (testPointId: number) => {
    const testPoint = testPoints?.items?.find(tp => tp.id === testPointId);
    if (testPoint) {
      form.setFieldsValue({
        business_type: testPoint.business_type,
        priority: testPoint.priority,
        name: testPoint.title
      });
    }
  };

  // 提交表单
  const handleSubmit = useCallback((isEdit: boolean) => {
    form.validateFields().then((values) => {
      const formData: UnifiedTestCaseFormData = {
        ...values,
        steps: values.steps || [],
        expected_result: values.expected_result || []
      };

      if (isEdit && selectedTestCase) {
        const updateData = convertFormDataToUpdate(formData);
        updateMutation.mutate({ id: selectedTestCase.id, data: updateData });
      } else {
        // 需要project_id，这里使用默认值或从其他地方获取
        const projectId = 1; // 默认项目ID，实际应该从项目上下文获取
        const createData = convertFormDataToCreate(formData, formData.business_type, projectId);
        createMutation.mutate(createData);
      }
    });
  }, [form, selectedTestCase, createMutation, updateMutation]);

  // 处理函数
  const handleCreate = useCallback(() => {
    setCreateModalVisible(true);
    resetFormAndState();
  }, [resetFormAndState]);

  const handleEdit = useCallback((record: UnifiedTestCaseResponse) => {
    setSelectedTestCase(record);
    setEditModalVisible(true);
    setTimeout(() => {
      form.setFieldsValue({
        name: record.name,
        business_type: record.business_type,
        priority: record.priority,
        test_point_id: record.test_point_id,
        preconditions: record.preconditions,
        steps: record.steps || [],
        expected_result: record.expected_result || []
      });
    }, 100);
  }, [form]);

  const handleView = useCallback((record: UnifiedTestCaseResponse) => {
    setSelectedTestCase(record);
    setViewModalVisible(true);
  }, []);

  const handleDelete = useCallback((id: number) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const columns: ColumnsType<UnifiedTestCaseResponse> = [
    {
      title: '测试用例ID',
      dataIndex: 'case_id',
      key: 'case_id',
      width: 150,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '业务类型',
      dataIndex: 'business_type',
      key: 'business_type',
      width: 120,
      render: (type: string) => (
        <Tag color="blue">{type}</Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => {
        const colorMap = {
          high: 'red',
          medium: 'orange',
          low: 'green'
        };
        const textMap = {
          high: '高',
          medium: '中',
          low: '低'
        };
        return (
          <Tag color={colorMap[priority as keyof typeof colorMap]}>
            {textMap[priority as keyof typeof textMap]}
          </Tag>
        );
      },
    },
    {
      title: '测试点',
      dataIndex: 'test_point_id',
      key: 'test_point_id',
      width: 120,
      render: (testPointId: number) => testPointId ? `TP-${testPointId}` : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这个测试用例吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 渲染表单
  const renderForm = () => (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        priority: 'medium',
        steps: [{ id: 1, step_number: 1, action: '', expected: '' }],
        expected_result: []
      }}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="测试用例名称"
            name="name"
            rules={[{ required: true, message: '请输入测试用例名称' }]}
          >
            <Input placeholder="请输入测试用例名称" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="关联测试点"
            name="test_point_id"
          >
            <Select
              placeholder="选择测试点（可选）"
              allowClear
              onChange={handleTestPointChange}
            >
              {testPoints?.items?.map((tp: TestPoint) => (
                <Select.Option key={tp.id} value={tp.id}>
                  {tp.test_point_id} - {tp.title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="业务类型"
            name="business_type"
            rules={[{ required: true, message: '请选择业务类型' }]}
          >
            <Input readOnly placeholder="选择测试点后自动填充" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="优先级"
            name="priority"
            rules={[{ required: true, message: '请选择优先级' }]}
          >
            <Select placeholder="选择测试点后自动填充" disabled>
              <Select.Option value="high">高</Select.Option>
              <Select.Option value="medium">中</Select.Option>
              <Select.Option value="low">低</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label="前置条件"
        name="preconditions"
      >
        <Input.TextArea
          rows={3}
          placeholder="请输入前置条件"
        />
      </Form.Item>

      <Form.Item
        label="测试步骤"
        name="steps"
      >
        <StepEditor />
      </Form.Item>

      <Form.Item
        label="预期结果"
        name="expected_result"
      >
        <Input.TextArea
          rows={3}
          placeholder="请输入预期结果，每行一个"
        />
      </Form.Item>
    </Form>
  );

  if (error) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Title level={4}>加载失败</Title>
          <Button type="primary" onClick={() => refetch()}>
            重新加载
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                测试用例管理
              </Title>
            </Col>
            <Col>
              <Space>
                <Search
                  placeholder="搜索测试用例..."
                  allowClear
                  style={{ width: 300 }}
                  onSearch={debouncedSearch}
                  onChange={(e) => debouncedSearch(e.target.value)}
                />
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => refetch()}
                >
                  刷新
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreate}
                >
                  新建测试用例
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={testCases?.items || []}
          loading={isLoading}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: testCases?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size || 20);
            },
          }}
        />
      </Card>

      {/* 创建测试用例模态框 */}
      <Modal
        title="新建测试用例"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          resetFormAndState();
        }}
        onOk={() => handleSubmit(false)}
        confirmLoading={createMutation.isPending}
        width={1000}
        destroyOnHidden
      >
        {renderForm()}
      </Modal>

      {/* 编辑测试用例模态框 */}
      <Modal
        title="编辑测试用例"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          resetFormAndState();
        }}
        onOk={() => handleSubmit(true)}
        confirmLoading={updateMutation.isPending}
        width={1000}
        destroyOnHidden
      >
        {renderForm()}
      </Modal>

      {/* 查看测试用例模态框 */}
      <Modal
        title="查看测试用例"
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setSelectedTestCase(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setViewModalVisible(false);
            setSelectedTestCase(null);
          }}>
            关闭
          </Button>
        ]}
        width={1000}
        destroyOnHidden
      >
        {selectedTestCase && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>测试用例ID：</Text>
                  <Tag color="blue">{selectedTestCase.case_id}</Tag>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>名称：</Text>
                  {selectedTestCase.name}
                </div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>业务类型：</Text>
                  <Tag color="purple">{selectedTestCase.business_type}</Tag>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>优先级：</Text>
                  <Tag color={
                    selectedTestCase.priority === 'high' ? 'red' :
                    selectedTestCase.priority === 'medium' ? 'orange' : 'green'
                  }>
                    {selectedTestCase.priority === 'high' ? '高' :
                     selectedTestCase.priority === 'medium' ? '中' : '低'}
                  </Tag>
                </div>
              </Col>
            </Row>

            <div style={{ marginBottom: 16 }}>
              <Text strong>前置条件：</Text>
              <div style={{ marginTop: 8 }}>
                {selectedTestCase.preconditions || '无'}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>测试步骤：</Text>
              <div style={{ marginTop: 8 }}>
                {selectedTestCase.steps?.map((step, index) => (
                  <div key={index} style={{ marginBottom: 8 }}>
                    <div>
                      <strong>步骤 {index + 1}:</strong> {step.action}
                    </div>
                    <div>
                      <strong>预期结果:</strong> {step.expected}
                    </div>
                  </div>
                )) || '无'}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>预期结果：</Text>
              <div style={{ marginTop: 8 }}>
                {selectedTestCase.expected_result?.join('\n') || '无'}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TestCaseManager;