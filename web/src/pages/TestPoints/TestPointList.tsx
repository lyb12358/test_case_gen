/**
 * Test Point List Page - Table with filtering and management functionality.
 * Updated with improved empty state UI.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Pagination,
  Modal,
  message,
  Tooltip,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Empty,
  Spin,
  Badge,
  Typography
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RocketOutlined,
  BulbOutlined,
  BookOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';

import {
  TestPointSummary,
  TestPointStatus,
  Priority,
  getTestPointStatusName,
  getPriorityName,
  getTestPointStatusOptions,
  getPriorityOptions
} from '../../types/testPoints';
import { unifiedGenerationService } from '../../services';
import { useProject } from '../../contexts/ProjectContext';
import { configService } from '../../services/configService';

const { Search } = Input;
const { Option } = Select;
const { Title, Paragraph, Text } = Typography;

// Test point utility functions
const testPointUtils = {
  getPriorityColor: (priority: Priority) => {
    const colors = {
      high: 'red',
      medium: 'orange',
      low: 'green'
    };
    return colors[priority] || 'default';
  },

  getStatusColor: (status: TestPointStatus) => {
    const colors = {
      draft: 'default',
      approved: 'success',
      modified: 'warning',
      completed: 'processing'
    };
    return colors[status] || 'default';
  },

  getStatusTransitions: (currentStatus: TestPointStatus): TestPointStatus[] => {
    const transitions: Record<TestPointStatus, TestPointStatus[]> = {
      draft: ['approved', 'modified'],
      approved: ['modified', 'completed'],
      modified: ['approved', 'completed'],
      completed: ['modified']
    };
    return transitions[currentStatus] || [];
  },

  formatDate: (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  },

  canEdit: (record: TestPointSummary) => {
    return record.status !== 'completed';
  },

  canDelete: (record: TestPointSummary) => {
    return record.status === 'draft';
  }
};

const TestPointList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentProject } = useProject();

  // Component mount debug
  console.log('TestPointList component mounted!');

  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<TestPointStatus | undefined>();
  const [priorityFilter, setPriorityFilter] = useState<Priority | undefined>();
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  // Dynamic configuration state
  const [configOptions, setConfigOptions] = useState<{
    businessTypes: Array<{value: string; label: string}>;
  }>({
    businessTypes: []
  });

  // Load configuration options
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        const businessTypes = await configService.getBusinessTypeOptions();
        setConfigOptions({ businessTypes });
      } catch (error) {
        console.error('Failed to load configuration options:', error);
        message.error('加载配置选项失败');
      }
    };

    loadConfiguration();
  }, []);

  // Fetch test points
  const {
    data: testPointsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['test-points', currentPage, pageSize, searchText, statusFilter, priorityFilter, businessTypeFilter, currentProject?.id],
    queryFn: () => unifiedGenerationService.getTestPoints({
      page: currentPage,
      size: pageSize,
      search: searchText || undefined,
      status: statusFilter,
      priority: priorityFilter,
      business_type: businessTypeFilter,
      project_id: currentProject?.id
    }),
    placeholderData: (previousData) => previousData,
    enabled: !!currentProject
  });

  // Debug logging
  console.log('TestPointList Debug:', {
    testPointsData,
    isLoading,
    error,
    hasItems: testPointsData?.items?.length,
    currentProject: currentProject?.id
  });

  // Fetch statistics data
  const {
    data: statsData
  } = useQuery({
    queryKey: ['test-point-stats', currentProject?.id],
    queryFn: () => unifiedGenerationService.getTestPointStatistics(currentProject?.id),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Delete test point mutation
  const deleteTestPointMutation = useMutation({
    mutationFn: unifiedGenerationService.deleteTestPoint,
    onSuccess: () => {
      message.success('测试点删除成功');
      setSelectedRowKeys([]);
      queryClient.invalidateQueries({ queryKey: ['test-points'] });
      queryClient.invalidateQueries({ queryKey: ['test-point-stats'] });
    },
    onError: (error: any) => {
      message.error(`删除失败: ${error.response?.data?.detail || error.message}`);
    }
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TestPointStatus }) =>
      unifiedGenerationService.updateTestPointStatus(id, { status }),
    onSuccess: () => {
      message.success('状态更新成功');
      queryClient.invalidateQueries({ queryKey: ['test-points'] });
    },
    onError: (error: any) => {
      message.error(`状态更新失败: ${error.response?.data?.detail || error.message}`);
    }
  });

  // Batch operation mutation
  const batchOperationMutation = useMutation({
    mutationFn: unifiedGenerationService.batchOperation,
    onSuccess: (data) => {
      message.success(`批量操作成功：${data.success_count} 个成功，${data.failed_count} 个失败`);
      setSelectedRowKeys([]);
      queryClient.invalidateQueries({ queryKey: ['test-points'] });
      queryClient.invalidateQueries({ queryKey: ['test-point-stats'] });
    },
    onError: (error: any) => {
      message.error(`批量操作失败: ${error.response?.data?.detail || error.message}`);
    }
  });

  // Handle search
  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  // Handle filter change
  const handleFilterChange = (key: string, value: any) => {
    switch (key) {
      case 'status':
        setStatusFilter(value);
        break;
      case 'priority':
        setPriorityFilter(value);
        break;
      case 'businessType':
        setBusinessTypeFilter(value);
        break;
    }
    setCurrentPage(1);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchText('');
    setStatusFilter(undefined);
    setPriorityFilter(undefined);
    setBusinessTypeFilter(undefined);
    setCurrentPage(1);
  };

  // Handle table actions
  const handleEdit = (id: number) => {
    navigate(`/test-points/${id}/edit`);
  };

  const handleView = (id: number) => {
    navigate(`/test-points/${id}`);
  };

  const handleDelete = (id: number) => {
    deleteTestPointMutation.mutate(id);
  };

  const handleStatusChange = (id: number, newStatus: TestPointStatus) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const handleBatchApprove = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要批准的测试点');
      return;
    }
    batchOperationMutation.mutate({
      test_point_ids: selectedRowKeys,
      operation: 'approve'
    });
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的测试点');
      return;
    }
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个测试点吗？此操作不可撤销。`,
      onOk: () => {
        batchOperationMutation.mutate({
          test_point_ids: selectedRowKeys,
          operation: 'delete'
        });
      }
    });
  };

  // Generate test cases
  const handleGenerateTestCases = (id: number) => {
    navigate(`/test-points/${id}/generate-test-cases`);
  };

  // Table columns
  const columns: ColumnsType<TestPointSummary> = [
    {
      title: '测试点ID',
      dataIndex: 'test_point_id',
      key: 'test_point_id',
      width: 100,
      render: (text: string) => (
        <Badge count={text} style={{ backgroundColor: '#52c41a' }} />
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string, record: TestPointSummary) => (
        <Tooltip placement="topLeft" title={text}>
          <Button
            type="link"
            onClick={() => handleView(record.id)}
            style={{ padding: 0, height: 'auto', textAlign: 'left' }}
          >
            {text}
          </Button>
        </Tooltip>
      ),
    },
    {
      title: '业务类型',
      dataIndex: 'business_type',
      key: 'business_type',
      width: 120,
      render: (businessType: string) => (
        <Tag>{configService.getBusinessTypeName(businessType)}</Tag>
      ),
      filters: configOptions.businessTypes.map(({value, label}) => ({
        text: label,
        value: value,
      })),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: Priority) => (
        <Tag color={testPointUtils.getPriorityColor(priority)}>
          {getPriorityName(priority)}
        </Tag>
      ),
      filters: getPriorityOptions().map(({value, label}) => ({
        text: label,
        value: value,
      })),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: TestPointStatus, record: TestPointSummary) => (
        <Select
          value={status}
          size="small"
          style={{ width: '100%' }}
          onChange={(value) => handleStatusChange(record.id, value)}
          options={testPointUtils.getStatusTransitions(status).map(s => ({
            value: s,
            label: getTestPointStatusName(s)
          }))}
        >
          <Option value={status}>
            <Tag color={testPointUtils.getStatusColor(status)}>
              {getTestPointStatusName(status)}
            </Tag>
          </Option>
        </Select>
      ),
      filters: getTestPointStatusOptions().map(({value, label}) => ({
        text: label,
        value: value,
      })),
    },
    {
      title: '测试用例',
      dataIndex: 'test_case_count',
      key: 'test_case_count',
      width: 80,
      render: (count: number) => (
        <Badge count={count} showZero style={{ backgroundColor: '#52c41a' }} />
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 150,
      render: (date: string) => (
        <Tooltip title={testPointUtils.formatDate(date)}>
          <span>{new Date(date).toLocaleDateString()}</span>
        </Tooltip>
      ),
      sorter: (a: TestPointSummary, b: TestPointSummary) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record: TestPointSummary) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record.id)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record.id)}
              disabled={!testPointUtils.canEdit(record)}
            />
          </Tooltip>
          <Tooltip title="生成测试用例">
            <Button
              type="text"
              icon={<PlayCircleOutlined />}
              onClick={() => handleGenerateTestCases(record.id)}
              disabled={record.status !== 'approved'}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确定删除此测试点吗？"
              description="删除后将无法恢复"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={deleteTestPointMutation.isPending}
                disabled={!testPointUtils.canDelete(record)}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Row selection
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys as number[]);
    },
    getCheckboxProps: (record: TestPointSummary) => ({
      disabled: false,
    }),
  };

  if (error) {
    return (
      <Card>
        <Empty
          description="加载测试点列表失败"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={() => refetch()}>
            重试
          </Button>
        </Empty>
      </Card>
    );
  }

  // 如果没有选择项目，显示提示信息
  if (!currentProject) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Empty
            description={
              <div>
                <h3>请先选择一个项目</h3>
                <p>请在顶部导航栏选择一个项目后，即可查看该项目的测试点列表。</p>
              </div>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总测试点数"
              value={testPointsData?.total || 0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已批准"
              value={statsData?.approved_test_points || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="草稿"
              value={statsData?.draft_test_points || 0}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成"
              value={statsData?.completed_test_points || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters and Actions */}
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space size="middle" wrap>
              <Search
                placeholder="搜索测试点标题或描述"
                allowClear
                enterButton={<SearchOutlined />}
                style={{ width: 300 }}
                onSearch={handleSearch}
                onChange={(e) => !e.target.value && setSearchText('')}
              />

              <Select
                placeholder="状态"
                allowClear
                style={{ width: 120 }}
                value={statusFilter}
                onChange={(value) => handleFilterChange('status', value)}
                options={getTestPointStatusOptions()}
              />

              <Select
                placeholder="优先级"
                allowClear
                style={{ width: 100 }}
                value={priorityFilter}
                onChange={(value) => handleFilterChange('priority', value)}
                options={getPriorityOptions()}
              />

              <Select
                placeholder="业务类型"
                allowClear
                style={{ width: 150 }}
                value={businessTypeFilter}
                onChange={(value) => handleFilterChange('businessType', value)}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={configOptions.businessTypes}
              />

              <Button onClick={clearFilters}>
                清除筛选
              </Button>

              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                刷新
              </Button>
            </Space>
          </Col>

          <Col>
            <Space>
              {selectedRowKeys.length > 0 && (
                <>
                  <Button
                    onClick={handleBatchApprove}
                    loading={batchOperationMutation.isPending}
                  >
                    批量批准 ({selectedRowKeys.length})
                  </Button>
                  <Button
                    danger
                    onClick={handleBatchDelete}
                    loading={batchOperationMutation.isPending}
                  >
                    批量删除 ({selectedRowKeys.length})
                  </Button>
                </>
              )}

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/test-points/create')}
              >
                新建测试点
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        <Spin spinning={isLoading}>
          {testPointsData?.items && testPointsData.items.length > 0 ? (
            <>
              <Table
                columns={columns}
                dataSource={testPointsData.items}
                rowKey="id"
                rowSelection={rowSelection}
                pagination={false}
                scroll={{ x: 1200 }}
                size="middle"
              />

              {/* Pagination */}
              {testPointsData && testPointsData.pages > 1 && (
                <div style={{ marginTop: '16px', textAlign: 'right' }}>
                  <Pagination
                    current={currentPage}
                    total={testPointsData.total}
                    pageSize={pageSize}
                    showSizeChanger
                    showQuickJumper
                    showTotal={(total, range) =>
                      `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
                    }
                    onChange={(page, size) => {
                      setCurrentPage(page);
                      setPageSize(size || 20);
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            // Empty state when no test points exist
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <Empty
                image={<BulbOutlined style={{ fontSize: 64, color: '#faad14' }} />}
                imageStyle={{ height: 64, marginBottom: 24 }}
                description={
                  <div style={{ maxWidth: 500, margin: '0 auto' }}>
                    <Title level={4} style={{ color: '#262626', marginBottom: 16 }}>
                      还没有测试点
                    </Title>
                    <Paragraph style={{ color: '#8c8c8c', fontSize: 16, lineHeight: 1.6 }}>
                      测试点是测试用例生成的基础。您可以手动创建测试点，或使用 AI 智能生成功能来快速创建高质量的测试点。
                    </Paragraph>
                  </div>
                }
              >
                <Space size="large" wrap>
                  <Button
                    type="primary"
                    size="large"
                    icon={<PlusOutlined />}
                    onClick={() => navigate('/test-points/create')}
                    style={{ height: 48, padding: '0 24px' }}
                  >
                    手动创建测试点
                  </Button>
                  <Button
                    size="large"
                    icon={<RocketOutlined />}
                    onClick={() => navigate('/test-cases/generate')}
                    style={{ height: 48, padding: '0 24px' }}
                  >
                    AI 智能生成
                  </Button>
                  <Button
                    size="large"
                    icon={<BookOutlined />}
                    onClick={() => window.open('/docs/test-points', '_blank')}
                    style={{ height: 48, padding: '0 24px' }}
                  >
                    查看帮助文档
                  </Button>
                </Space>

                <div style={{ marginTop: 32, padding: '20px', background: '#fafafa', borderRadius: 8, textAlign: 'left' }}>
                  <Title level={5} style={{ color: '#262626', marginBottom: 12 }}>
                    <BulbOutlined /> 快速开始指南
                  </Title>
                  <Row gutter={[16, 8]}>
                    <Col span={12}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span style={{ color: '#52c41a', marginRight: 8, fontSize: 16 }}>1.</span>
                        <div>
                          <Text strong>手动创建</Text>
                          <div style={{ color: '#8c8c8c', fontSize: 14 }}>
                            适合有明确测试需求的场景，可以精确控制测试点内容
                          </div>
                        </div>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span style={{ color: '#52c41a', marginRight: 8, fontSize: 16 }}>2.</span>
                        <div>
                          <Text strong>AI 生成</Text>
                          <div style={{ color: '#8c8c8c', fontSize: 14 }}>
                            基于业务类型智能生成测试点，节省时间和人力成本
                          </div>
                        </div>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span style={{ color: '#52c41a', marginRight: 8, fontSize: 16 }}>3.</span>
                        <div>
                          <Text strong>审批流程</Text>
                          <div style={{ color: '#8c8c8c', fontSize: 14 }}>
                            创建后需要审批通过，确保测试点质量和准确性
                          </div>
                        </div>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span style={{ color: '#52c41a', marginRight: 8, fontSize: 16 }}>4.</span>
                        <div>
                          <Text strong>生成用例</Text>
                          <div style={{ color: '#8c8c8c', fontSize: 14 }}>
                            基于已审批的测试点生成详细的测试用例
                          </div>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>
              </Empty>
            </div>
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default TestPointList;