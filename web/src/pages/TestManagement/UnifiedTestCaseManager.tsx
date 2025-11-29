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
  App,
  Popconfirm,
  Divider,
  Tabs,
  Badge,
  Tooltip,
  Switch
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
  ExportOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';

import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../../contexts/ProjectContext';

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
import { debounce } from '../../utils/debounce';
import type { components } from '../../types/api';
import { useBusinessTypeMapping } from '../../hooks';

type BusinessType = import('../../services/businessService').BusinessType;

const { Title, Text } = Typography;
const { Search } = Input;
const { TabPane } = Tabs;

// 类型定义
type StageFilter = 'all' | 'test_point' | 'test_case';
type CreationMode = 'test_point' | 'convert' | 'test_case';

interface UnifiedTestCaseFormData {
  name: string;
  business_type: string;
  priority: string;
  description?: string;
  preconditions?: string[];
  steps?: Array<{
    id: number;
    step_number: number;
    action: string;
    expected: string;
  }>;
  expected_result?: string[];
}

const UnifiedTestCaseManager: React.FC = () => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currentProject } = useProject();

  // Business type mapping for display
  const { getBusinessTypeFullName, getBusinessTypeColor } = useBusinessTypeMapping();

  // 如果没有选择项目，显示提示或重定向
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
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<UnifiedTestCaseResponse | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [creationMode, setCreationMode] = useState<CreationMode>('test_point');

  // 简化的状态重置函数
  const resetFormAndState = useCallback(() => {
    form.resetFields();
    setSelectedTestCase(null);
    setCreationMode('test_point');
  }, [form]);

  // 获取数据 - 根据stage过滤
  const { data: testCases, isLoading, error, refetch } = useQuery({
    queryKey: ['unifiedTestCases', currentProject?.id, stageFilter, currentPage, pageSize, searchText],
    queryFn: () => unifiedGenerationService.getUnifiedTestCases({
      project_id: currentProject.id,
      stage: stageFilter === 'all' ? undefined : stageFilter,
      page: currentPage,
      size: pageSize,
      keyword: searchText,
      sort_by: 'created_at',
      sort_order: 'desc'
    }),
    enabled: !!currentProject?.id
  });

  const { data: businessTypes } = useQuery({
    queryKey: ['businessTypes', currentProject?.id],
    queryFn: () => businessService.getBusinessTypes({ project_id: currentProject.id }),
    enabled: !!currentProject?.id
  });

  // 获取测试点数据（用于转换）
  const { data: testPoints } = useQuery({
    queryKey: ['testPoints', currentProject?.id],
    queryFn: () => unifiedGenerationService.getUnifiedTestCases({
      project_id: currentProject.id,
      stage: 'test_point',
      page: 1,
      size: 100
    }),
    enabled: !!currentProject?.id && creationMode === 'convert'
  });

  // 创建测试用例/测试点
  const createMutation = useMutation({
    mutationFn: (data: UnifiedTestCaseCreate) => {
      const testCaseData = {
        ...data,
        project_id: currentProject.id
      };
      return unifiedGenerationService.createUnifiedTestCase(testCaseData);
    },
    onSuccess: () => {
      message.success(creationMode === 'test_point' ? '测试点创建成功' : '测试用例创建成功');
      setCreateModalVisible(false);
      resetFormAndState();
      queryClient.invalidateQueries({ queryKey: ['unifiedTestCases'] });
    },
    onError: (error: any) => {
      console.error('创建失败:', error);

      // 特殊处理422验证错误
      if (error.response?.status === 422) {
        const validationErrors = error.response?.data?.detail;
        if (Array.isArray(validationErrors)) {
          const fieldErrors = validationErrors.map((err: any) =>
            `${err.loc?.join('.') || '字段'}: ${err.msg}`
          ).join(', ');
          message.error(`数据验证失败: ${fieldErrors}`);
        } else {
          message.error('数据验证失败，请检查必填字段是否完整');
        }
      } else {
        message.error(`创建失败: ${error.message || '网络错误，请稍后重试'}`);
      }
    }
  });

  // 更新测试用例
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UnifiedTestCaseUpdate }) =>
      unifiedGenerationService.updateUnifiedTestCase(id, data),
    onSuccess: () => {
      message.success('更新成功');
      setEditModalVisible(false);
      setConvertModalVisible(false);
      resetFormAndState();
      queryClient.invalidateQueries({ queryKey: ['unifiedTestCases'] });
    },
    onError: (error: any) => {
      console.error('更新失败:', error);

      // 检查是否为名称重复等业务错误
      const errorMessage = error.response?.data?.detail || error.message || '';

      if (errorMessage.includes('already exists') ||
          errorMessage.includes('duplicate') ||
          errorMessage.includes('unique') ||
          errorMessage.includes('名称') ||
          errorMessage.includes('name')) {
        message.error('该名称在当前业务类型下已存在，请使用不同的名称');
      } else {
        message.error(`更新失败: ${error.message || '未知错误'}`);
      }
    }
  });

  // 删除测试用例
  const deleteMutation = useMutation({
    mutationFn: unifiedGenerationService.deleteUnifiedTestCase.bind(unifiedGenerationService),
    onSuccess: () => {
      message.success('删除成功');
      setSelectedRowKeys([]);
      queryClient.invalidateQueries({ queryKey: ['unifiedTestCases'] });
    },
    onError: (error: any) => {
      console.error('删除失败:', error);
      message.error(`删除失败: ${error.message || '未知错误'}`);
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
  const convertFormDataToCreate = (formData: UnifiedTestCaseFormData, businessType: string, projectId: number): UnifiedTestCaseCreate => {
    const isTestPoint = creationMode === 'test_point';

    return {
      project_id: projectId,
      business_type: businessType,
      test_case_id: isTestPoint ?
        `TP_${formData.business_type}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}` :
        `TC_${formData.business_type}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: formData.name,
      description: formData.description || '',
      priority: formData.priority as 'high' | 'medium' | 'low',
      // 测试点不需要详细字段，测试用例需要
      ...(isTestPoint ? {} : {
        preconditions: formData.preconditions || undefined,
        steps: (formData.steps || []).map((step, index) => {
          const { step_number, action, expected } = step;
          return {
            step_number: step_number || index + 1,
            action: action || '',
            expected: expected || ''
          };
        }),
        // expected_result 字段已移除 - 使用steps中的expected字段
      })
    };
  };

  const convertFormDataToConvert = (formData: UnifiedTestCaseFormData): UnifiedTestCaseUpdate => {
    return {
      stage: 'test_case',
      test_case_id: `TC_${formData.business_type}_${Date.now()}`,
      preconditions: formData.preconditions || undefined,
      steps: (formData.steps || []).map((step, index) => {
        const { step_number, action, expected } = step;
        return {
          step_number: step_number || index + 1,
          action: action || '',
          expected: expected || ''
        };
      }),
      // expected_result 字段已移除 - 使用steps中的expected字段
    };
  };

  const convertFormDataToUpdate = (formData: UnifiedTestCaseFormData): UnifiedTestCaseUpdate => {
    return {
      name: formData.name,
      description: formData.description,
      business_type: formData.business_type,
      priority: formData.priority as 'high' | 'medium' | 'low',
      preconditions: formData.preconditions || undefined,
      steps: (formData.steps || []).map((step, index) => {
        const { step_number, action, expected } = step;
        return {
          step_number: step_number || index + 1,
          action: action || '',
          expected: expected || ''
        };
      }),
      // expected_result 字段已移除 - 使用steps中的expected字段
    };
  };

  // 提交表单
  const handleSubmit = useCallback((isEdit: boolean = false) => {
    form.validateFields().then((values) => {
      // Clean steps data to remove id fields before any processing
      const cleanedSteps = (values.steps || []).map((step: any) => {
        const { id, step_number, action, expected } = step;
        return {
          step_number: step_number || 1,
          action: action || '',
          expected: expected || ''
        };
      });

      const formData: UnifiedTestCaseFormData = {
        ...values,
        steps: cleanedSteps
      };

      if (creationMode === 'convert') {
        // 转换模式
        if (selectedTestCase) {
          const convertData = convertFormDataToConvert(formData);
          updateMutation.mutate({ id: selectedTestCase.id, data: convertData });
        }
      } else if (isEdit && selectedTestCase) {
        // 编辑模式 - 根据记录类型过滤提交数据
        let updateData = convertFormDataToUpdate(formData);

        // 如果编辑测试点，移除测试用例专用字段
        if (selectedTestCase.stage === 'test_point') {
          const { preconditions, steps, ...testPointData } = updateData;
          updateData = testPointData;
        }

        updateMutation.mutate({ id: selectedTestCase.id, data: updateData });
      } else {
        // 创建模式
        const createData = convertFormDataToCreate(formData, values.business_type, currentProject.id);
        createMutation.mutate(createData);
      }
    });
  }, [form, selectedTestCase, createMutation, updateMutation, creationMode, currentProject.id]);

  // 处理函数
  const handleCreate = useCallback((mode: CreationMode) => {
    resetFormAndState();
    setCreationMode(mode);
    setCreateModalVisible(true);
  }, [resetFormAndState]);

  const handleEdit = useCallback((record: UnifiedTestCaseResponse) => {
    setSelectedTestCase(record);
    setEditModalVisible(true);

    // Set creationMode based on record stage for proper field display
    const isTestCase = record.stage === 'test_case';
    setCreationMode(isTestCase ? 'test_case' : 'test_point');

    setTimeout(() => {
      const formValues: any = {
        name: record.name,
        business_type: record.business_type,
        priority: record.priority,
        description: record.description
      };

      // Only add test case specific fields for test cases
      if (isTestCase) {
        // Ensure steps have proper structure for StepEditor
        const stepsWithIds = (record.steps || []).map((step: any, index: number) => ({
          id: step.id || `step_${Date.now()}_${index}`,
          step_number: step.step_number || index + 1,
          action: step.action || '',
          expected: step.expected || ''
        }));

        formValues.preconditions = record.preconditions;
        formValues.steps = stepsWithIds;
      }

      form.setFieldsValue(formValues);
    }, 100);
  }, [form]);

  const handleConvert = useCallback((record: UnifiedTestCaseResponse) => {
    setSelectedTestCase(record);
    setCreationMode('convert');
    setConvertModalVisible(true);
    setTimeout(() => {
      form.setFieldsValue({
        name: record.name,
        business_type: record.business_type,
        priority: record.priority,
        description: record.description,
        preconditions: ['测试环境已准备'], // 默认前置条件
        steps: [{ id: 1, step_number: 1, action: '', expected: '' }], // 默认步骤
        expected_result: ['测试通过'] // 默认预期结果
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

  // 表格列定义
  const columns: ColumnsType<UnifiedTestCaseResponse> = [
    {
      title: '测试用例ID',
      dataIndex: 'test_case_id',
      key: 'test_case_id',
      width: 200,
      render: (text: string) => (
        <Tooltip title={text}>
          <div style={{
            maxWidth: 180,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {text}
          </div>
        </Tooltip>
      )
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      render: (text: string) => (
        <Tooltip title={text}>
          <div style={{
            maxWidth: 230,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {text}
          </div>
        </Tooltip>
      )
    },
    {
      title: '阶段',
      dataIndex: 'stage',
      key: 'stage',
      width: 100,
      render: (stage: string) => {
        if (stage === 'test_point') {
          return (
            <Tag color="blue" icon={<ExperimentOutlined />}>
              测试点
            </Tag>
          );
        } else {
          return (
            <Tag color="green" icon={<FileTextOutlined />}>
              测试用例
            </Tag>
          );
        }
      },
    },
    {
      title: '业务类型',
      dataIndex: 'business_type',
      key: 'business_type',
      width: 200,
      render: (type: string) => {
        if (!type) return <Tag>-</Tag>;
        const fullName = getBusinessTypeFullName(type);
        const color = getBusinessTypeColor(type);
        return (
          <Tooltip title={`[${type}] ${fullName}`}>
            <Tag
              color={color}
              style={{
                maxWidth: 180,
                whiteSpace: 'normal',
                wordBreak: 'break-all',
                height: 'auto',
                padding: '4px 8px',
                lineHeight: '1.4'
              }}
            >
              [{type}] {fullName}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig = {
          draft: { color: 'default', text: '草稿' },
          approved: { color: 'success', text: '已批准' },
          rejected: { color: 'error', text: '已拒绝' }
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
        return <Badge status={config.color as any} text={config.text} />;
      },
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
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
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
          {record.stage === 'test_point' && (
            <Button
              type="link"
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => handleConvert(record)}
              style={{ color: '#52c41a' }}
            >
              转换
            </Button>
          )}
          <Popconfirm
            title="确定删除这条记录吗？"
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
            label={creationMode === 'convert' ? '名称（继承自测试点）' : '名称'}
            name="name"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input
              placeholder={creationMode === 'convert' ? '名称将从测试点继承' : '请输入名称'}
              readOnly={creationMode === 'convert'}
            />
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
            <Select
              placeholder={creationMode === 'convert' ? '业务类型将从测试点继承' : '请选择业务类型'}
              disabled={creationMode === 'convert'}
            >
              {businessTypes?.items?.map((type: any) => (
                <Select.Option key={type.code} value={type.code}>
                  [{type.code}] {type.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="优先级"
            name="priority"
            rules={[{ required: true, message: '请选择优先级' }]}
          >
            <Select>
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
        rules={[{ required: true, message: '请输入描述' }]}
      >
        <Input.TextArea
          rows={2}
          placeholder="请输入描述（必填）"
        />
      </Form.Item>

      {/* 测试用例专用字段 - 创建和编辑模式都支持 */}
      {(creationMode !== 'test_point' || (editModalVisible && selectedTestCase?.stage === 'test_case')) && (
        <>
          <Form.Item
            label="前置条件"
            name="preconditions"
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入前置条件，每行一个"
            />
          </Form.Item>

          <Form.Item
            label="测试步骤"
            name="steps"
          >
            <StepEditor />
          </Form.Item>

          {/* 预期结果字段已移除 - 使用测试步骤中的expected字段 */}
        </>
      )}
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
                统一测试管理
              </Title>
            </Col>
            <Col>
              <Space>
                {/* 阶段过滤器 */}
                <Select
                  value={stageFilter}
                  onChange={setStageFilter}
                  style={{ width: 120 }}
                  placeholder="筛选阶段"
                >
                  <Select.Option value="all">
                    <Space>
                      <Badge color="blue" />
                      全部
                    </Space>
                  </Select.Option>
                  <Select.Option value="test_point">
                    <Space>
                      <ExperimentOutlined style={{ color: '#1890ff' }} />
                      测试点
                    </Space>
                  </Select.Option>
                  <Select.Option value="test_case">
                    <Space>
                      <FileTextOutlined style={{ color: '#52c41a' }} />
                      测试用例
                    </Space>
                  </Select.Option>
                </Select>

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

                {/* 创建按钮组 */}
                <Button.Group>
                  <Button
                    type="primary"
                    icon={<ExperimentOutlined />}
                    onClick={() => handleCreate('test_point')}
                  >
                    创建测试点
                  </Button>
                  <Button
                    type="default"
                    icon={<FileTextOutlined />}
                    onClick={() => handleCreate('test_case')}
                  >
                    创建测试用例
                  </Button>
                </Button.Group>
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

      {/* 创建模态框 */}
      <Modal
        title={
          creationMode === 'test_point' ? '创建测试点' :
          creationMode === 'test_case' ? '创建测试用例' : ''
        }
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
        <Tabs
          activeKey={creationMode}
          onChange={(key) => setCreationMode(key as CreationMode)}
          items={[
            {
              key: 'test_point',
              label: (
                <span>
                  <ExperimentOutlined />
                  创建测试点
                </span>
              ),
              children: renderForm()
            },
            {
              key: 'test_case',
              label: (
                <span>
                  <FileTextOutlined />
                  创建测试用例
                </span>
              ),
              children: renderForm()
            }
          ]}
        />
      </Modal>

      {/* 编辑模态框 */}
      <Modal
        title={selectedTestCase?.stage === 'test_point' ? '编辑测试点' : '编辑测试用例'}
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

      {/* 转换模态框 */}
      <Modal
        title="将测试点转换为测试用例"
        open={convertModalVisible}
        onCancel={() => {
          setConvertModalVisible(false);
          resetFormAndState();
        }}
        onOk={() => handleSubmit(false)}
        confirmLoading={updateMutation.isPending}
        width={1000}
        destroyOnHidden
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            正在将测试点 <Text strong>{selectedTestCase?.name}</Text> 转换为测试用例
          </Text>
        </div>
        {renderForm()}
      </Modal>

      {/* 查看模态框 */}
      <Modal
        title={selectedTestCase?.stage === 'test_point' ? '查看测试点' : '查看测试用例'}
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
                  <Text strong>ID：</Text>
                  <Tag color="blue">{selectedTestCase.case_id}</Tag>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>阶段：</Text>
                  {selectedTestCase.stage === 'test_point' ? (
                    <Tag color="blue" icon={<ExperimentOutlined />}>测试点</Tag>
                  ) : (
                    <Tag color="green" icon={<FileTextOutlined />}>测试用例</Tag>
                  )}
                </div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>名称：</Text>
                  {selectedTestCase.name}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>业务类型：</Text>
                  <Tag color="purple">{selectedTestCase.business_type}</Tag>
                </div>
              </Col>
            </Row>

            <Row gutter={16}>
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
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>状态：</Text>
                  <Badge
                    status={
                      selectedTestCase.status === 'approved' ? 'success' :
                      selectedTestCase.status === 'rejected' ? 'error' : 'default'
                    }
                    text={
                      selectedTestCase.status === 'approved' ? '已批准' :
                      selectedTestCase.status === 'rejected' ? '已拒绝' : '草稿'
                    }
                  />
                </div>
              </Col>
            </Row>

            <div style={{ marginBottom: 16 }}>
              <Text strong>描述：</Text>
              <div style={{ marginTop: 8 }}>
                {selectedTestCase.description || '无'}
              </div>
            </div>

            {selectedTestCase.stage === 'test_case' && (
              <>
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
                          <strong>步骤 {step.step_number}:</strong> {step.action}
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
                    {selectedTestCase.expected_result?.join(', ') || '无'}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UnifiedTestCaseManager;