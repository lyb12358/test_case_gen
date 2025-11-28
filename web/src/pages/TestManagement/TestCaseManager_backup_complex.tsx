import React, { useState, useCallback, useMemo, useRef } from 'react';
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
import InheritanceIndicator from '../../components/TestGeneration/InheritanceIndicator';
import StepEditor from '../../components/TestGeneration/StepEditor';
import { UnifiedTestCaseResponse, UnifiedTestCaseStatus } from '../../types/unifiedTestCase';
import { TestPoint } from '../../types/testPoints';
import { debounce } from '../../utils/debounce';

type BusinessType = import('../../services/businessService').BusinessType;

const { Title, Text } = Typography;
const { Search } = Input;
const { TabPane } = Tabs;

// 接口定义
interface UnifiedTestCaseFormData {
  case_id: string;
  name: string;
  description: string;
  business_type: string;
  priority: 'high' | 'medium' | 'low';
  test_point_id?: number;
  preconditions: string[] | null;
  steps: Array<{ step_number: number; action: string; expected?: string }>;
  expected_result?: string[];
  tags?: string[];
  test_data?: any;
  // 添加缺失的必需属性
  project_id: number;
  status: UnifiedTestCaseStatus;
}

const TestCaseManager: React.FC = () => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 生成测试用例ID的工具函数
  const generateTestCaseId = useCallback(() => {
    const now = new Date();
    const timestamp = now.getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `TC${timestamp}${random}`;
  }, []);

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
  const [selectedTestPoint, setSelectedTestPoint] = useState<TestPoint | null>(null);
  const [isInheriting, setIsInheriting] = useState(false);

  // 统一状态重置函数
  const resetFormAndState = useCallback(() => {
    form.resetFields();
    setSelectedTestPoint(null);
    setIsInheriting(false);
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
    mutationFn: ({ id, data }: { id: number; data: UnifiedTestCaseFormData }) =>
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

  // 字段继承逻辑
  const handleTestPointChange = useCallback((testPointId: number) => {
    if (!testPoints?.items) return;

    const testPoint = testPoints.items.find(tp => tp.id === testPointId);
    if (!testPoint) return;

    setSelectedTestPoint(testPoint);
    setIsInheriting(true);

    // 更新表单字段
    form.setFieldsValue({
      business_type: testPoint.business_type,
      priority: testPoint.priority,
      name: testPoint.title
    });
  }, [testPoints?.items]);

  // Memoized filter option
  const filterOption = useCallback((input: string, option: any) => {
    if (!option) return false;

    const searchText = input.toLowerCase();
    const businessCode = String(option.key || '').toLowerCase();
    const businessName = String(option.children || '').toLowerCase();
    const businessLabel = String(option.label || '').toLowerCase();

    return (
      businessCode.includes(searchText) ||
      businessName.includes(searchText) ||
      businessLabel.includes(searchText)
    );
  }, []);

  // 创建表格列定义
  const columns: ColumnsType<UnifiedTestCaseResponse> = useMemo(() => [
    {
      title: '测试用例ID',
      dataIndex: 'case_id',
      key: 'case_id',
      width: 150,
      render: (text: string) => (
        <Tag color="blue">{text}</Tag>
      )
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text ellipsis style={{ maxWidth: 200 }}>{text}</Text>
        </Tooltip>
      )
    },
    {
      title: '业务类型',
      dataIndex: 'business_type',
      key: 'business_type',
      width: 120,
      render: (text: string) => (
        <Tag color="purple">{text}</Tag>
      )
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => {
        const color = {
          high: 'red',
          medium: 'orange',
          low: 'green'
        }[priority] || 'default';

        const text = {
          high: '高',
          medium: '中',
          low: '低'
        }[priority] || priority;

        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '测试点',
      dataIndex: 'testPoint',
      key: 'testPoint',
      width: 150,
      render: (testPoint: UnifiedTestCaseResponse['testPoint']) => (
        testPoint ? (
          <Tooltip title={`${testPoint.test_point_id} - ${testPoint.title}`}>
            <Tag color="cyan">{testPoint.test_point_id}</Tag>
          </Tooltip>
        ) : '-'
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (text: string) => text ? new Date(text).toLocaleDateString() : '-'
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除这个测试用例吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ], []);

  // 处理表单提交
  const handleSubmit = useCallback(async (isEdit = false) => {
    try {
      const values = await form.validateFields();

      // 处理preconditions类型转换：string -> string[]
      // 处理steps数据结构：添加step_number
      const processedValues: UnifiedTestCaseFormData = {
        ...values,
        // 确保case_id有值
        case_id: values.case_id || generateTestCaseId(),
        preconditions: values.preconditions
          ? values.preconditions.split('\n').filter(line => line.trim()).length > 0
            ? values.preconditions.split('\n').filter(line => line.trim())
            : null
          : null,
        // 处理expected_result类型转换：string -> string[]
        expected_result: values.expected_result
          ? values.expected_result.split('\n').filter(line => line.trim())
          : undefined,
        // 处理steps数据结构：添加step_number
        steps: values.steps?.map((step, index) => ({
          step_number: index + 1,
          action: step.action,
          expected: step.expected
        })) || [],
        // 添加缺失的必需属性
        project_id: 1, // 默认项目ID，实际应该从上下文获取
        status: UnifiedTestCaseStatus.DRAFT // 使用正确的枚举值
      };

      if (isEdit && selectedTestCase) {
        updateMutation.mutate({
          id: selectedTestCase.id,
          data: processedValues
        });
      } else {
        createMutation.mutate(processedValues);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  }, [selectedTestCase, createMutation, updateMutation]);

  // 渲染表单
  const renderForm = useCallback(() => (
    <Form
      form={form}
      layout="vertical"
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="测试用例ID"
            name="case_id"
            rules={[{ required: true, message: '请输入测试用例ID' }]}
          >
            <Input placeholder="请输入测试用例ID" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="测试点"
            name="test_point_id"
          >
            <Select
              placeholder="选择测试点（可选）"
              allowClear
              showSearch
              filterOption={filterOption}
              onChange={handleTestPointChange}
              options={testPoints?.items?.map(tp => ({
                key: tp.test_point_id,
                value: tp.id,
                label: `${tp.test_point_id} - ${tp.title}`,
                children: `${tp.test_point_id} - ${tp.title}`
              })) || []}
            />
          </Form.Item>
        </Col>
      </Row>

      {isInheriting && selectedTestPoint && (
        <InheritanceIndicator
          isInheriting={isInheriting}
          selectedTestPoint={selectedTestPoint}
        />
      )}

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入测试用例名称' }]}
          >
            <Input placeholder="请输入测试用例名称" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="业务类型"
            name="business_type"
            rules={[{ required: true, message: '请选择业务类型' }]}
          >
            <Select
              placeholder="选择业务类型"
              showSearch
              filterOption={filterOption}
              options={businessTypes?.items?.map(bt => ({
                key: bt.code,
                value: bt.code,
                label: bt.code,
                children: bt.code
              })) || []}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="优先级"
            name="priority"
            rules={[{ required: true, message: '请选择优先级' }]}
          >
            <Select placeholder="选择优先级">
              <Select.Option value="high">高</Select.Option>
              <Select.Option value="medium">中</Select.Option>
              <Select.Option value="low">低</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label="描述"
        name="description"
        rules={[{ required: true, message: '请输入测试用例描述' }]}
      >
        <Input.TextArea rows={3} placeholder="请输入测试用例描述" />
      </Form.Item>

      <Form.Item
        label="前置条件"
        name="preconditions"
      >
        <Input.TextArea rows={2} placeholder="请输入前置条件" />
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
        <Input.TextArea rows={2} placeholder="请输入预期结果" />
      </Form.Item>
    </Form>
  ), [testPoints, businessTypes, filterOption, handleTestPointChange, isInheriting, selectedTestPoint]);

  // 处理函数
  const handleCreate = useCallback(() => {
    setCreateModalVisible(true);
    resetFormAndState();
  }, [resetFormAndState]);

  const handleEdit = useCallback((record: UnifiedTestCaseResponse) => {
    setSelectedTestCase(record);
    setEditModalVisible(true);
    // 延迟表单设置，避免在同一个渲染周期内设置过多状态
    setTimeout(() => {
      form.setFieldsValue({
        ...record,
        // 处理preconditions类型转换：string[] -> string
        preconditions: record.preconditions ? record.preconditions.join('\n') : '',
        // 处理expected_result类型转换：string[] -> string
        expected_result: record.expected_result ? record.expected_result.join('\n') : '',
        // 处理steps数据结构转换：去除step_number
        steps: record.steps?.map(step => ({
          action: step.action,
          expected: step.expected
        })) || [{ action: '', expected: '' }]
      });
      // 单独重置相关状态
      setSelectedTestPoint(null);
      setIsInheriting(false);
    }, 0);
  }, []);

  const handleView = useCallback((record: UnifiedTestCaseResponse) => {
    setSelectedTestCase(record);
    setViewModalVisible(true);
  }, []);

  const handleDelete = useCallback((id: number) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div style={{ padding: 24 }}>
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
                  onChange={(e) => {
                    if (!e.target.value) {
                      setSearchText('');
                      setCurrentPage(1);
                    }
                  }}
                />
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => refetch()}
                  loading={isLoading}
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
          rowSelection={rowSelection}
          scroll={{ x: 1200 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: testCases?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size || 20);
            }
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
              <Text strong>描述：</Text>
              <div style={{ marginTop: 8 }}>
                {selectedTestCase.description}
              </div>
            </div>

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