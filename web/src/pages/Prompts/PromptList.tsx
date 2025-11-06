/**
 * Prompt List Page - Advanced table with filtering and search functionality.
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
  Spin
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  ExportOutlined,
  ImportOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';

import {
  PromptSummary,
  PromptType,
  PromptStatus,
  BusinessType,
  getPromptTypeName,
  getPromptStatusName,
  getBusinessTypeName,
  getPromptTypeOptions,
  getPromptStatusOptions,
  getBusinessTypeOptions
} from '../../types/prompts';
import { configService } from '../../services/configService';
import promptService, { promptUtils } from '../../services/promptService';
import { statsService } from '../../services/promptService';
import { useProject } from '../../contexts/ProjectContext';

const { Search } = Input;
const { Option } = Select;

const PromptList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentProject } = useProject();

  // 添加调试信息
  console.log('PromptList: 组件开始渲染', { currentProject });

  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<PromptType | undefined>();
  const [statusFilter, setStatusFilter] = useState<PromptStatus | undefined>();
  const [businessTypeFilter, setBusinessTypeFilter] = useState<BusinessType | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  // Dynamic configuration state
  const [configOptions, setConfigOptions] = useState<{
    promptTypes: Array<{value: string; label: string}>;
    promptStatuses: Array<{value: string; label: string}>;
    businessTypes: Array<{value: string; label: string}>;
  }>({
    promptTypes: [],
    promptStatuses: [],
    businessTypes: []
  });

  // Load configuration options
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        const [promptTypes, promptStatuses, businessTypes] = await Promise.all([
          getPromptTypeOptions(),
          getPromptStatusOptions(),
          getBusinessTypeOptions()
        ]);

        setConfigOptions({
          promptTypes,
          promptStatuses,
          businessTypes
        });
      } catch (error) {
        console.error('Failed to load configuration options:', error);
        message.error('加载配置选项失败');
      }
    };

    loadConfiguration();
  }, []);

  // Fetch prompts
  const {
    data: promptsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['prompts', currentPage, pageSize, searchText, typeFilter, statusFilter, businessTypeFilter, currentProject?.id],
    queryFn: () => promptService.prompt.getPrompts({
      page: currentPage,
      size: pageSize,
      search: searchText || undefined,
      type: typeFilter,
      status: statusFilter,
      business_type: businessTypeFilter,
      project_id: currentProject?.id
    }),
    placeholderData: (previousData) => previousData,
    enabled: !!currentProject // 只有选择了项目才启用查询
  });

  // Fetch statistics data
  const {
    data: statsData
  } = useQuery({
    queryKey: ['prompt-stats', currentProject?.id],
    queryFn: () => statsService.getOverviewStats(currentProject?.id),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Delete prompt mutation
  const deletePromptMutation = useMutation({
    mutationFn: promptService.prompt.deletePrompt,
    onSuccess: () => {
      message.success('提示词删除成功');
      setSelectedRowKeys([]);
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['prompt-stats'] });
    },
    onError: (error: any) => {
      message.error(`删除失败: ${error.response?.data?.detail || error.message}`);
    }
  });

  // Batch delete mutation
  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => promptService.prompt.deletePrompt(id)));
    },
    onSuccess: () => {
      message.success(`批量删除 ${selectedRowKeys.length} 个提示词成功`);
      setSelectedRowKeys([]);
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['prompt-stats'] });
    },
    onError: (error: any) => {
      message.error(`批量删除失败: ${error.response?.data?.detail || error.message}`);
    }
  });

  // Clone prompt mutation
  const clonePromptMutation = useMutation({
    mutationFn: promptService.prompt.clonePrompt,
    onSuccess: (data: any) => {
      message.success('提示词克隆成功');
      queryClient.invalidateQueries({ queryKey: ['prompt-stats'] });
      navigate(`/prompts/${data.id}/edit`);
    },
    onError: (error: any) => {
      message.error(`克隆失败: ${error.response?.data?.detail || error.message}`);
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
      case 'type':
        setTypeFilter(value);
        break;
      case 'status':
        setStatusFilter(value);
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
    setTypeFilter(undefined);
    setStatusFilter(undefined);
    setBusinessTypeFilter(undefined);
    setCurrentPage(1);
  };

  // Handle table actions
  const handleEdit = (id: number) => {
    navigate(`/prompts/${id}/edit`);
  };

  const handleView = (id: number) => {
    navigate(`/prompts/${id}`);
  };

  const handleDelete = (id: number) => {
    deletePromptMutation.mutate(id);
  };

  const handleClone = (id: number) => {
    clonePromptMutation.mutate(id);
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的提示词');
      return;
    }
    Modal.confirm({
      title: '批量删除确认',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个提示词吗？此操作不可恢复。`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        batchDeleteMutation.mutate(selectedRowKeys);
      }
    });
  };

  // Table columns
  const columns: ColumnsType<PromptSummary> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string, record: PromptSummary) => (
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
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: PromptType) => (
        <Tag color={promptUtils.getTypeColor(type)}>
          {getPromptTypeName(type)}
        </Tag>
      ),
      filters: configOptions.promptTypes.map(({value, label}) => ({
        text: label,
        value: value,
      })),
    },
    {
      title: '业务类型',
      dataIndex: 'business_type',
      key: 'business_type',
      width: 120,
      render: (businessType: BusinessType) => (
        businessType ? (
          <Tag>{getBusinessTypeName(businessType)}</Tag>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        )
      ),
      filters: configOptions.businessTypes.map(({value, label}) => ({
        text: label,
        value: value,
      })),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: PromptStatus) => (
        <Tag color={promptUtils.getStatusColor(status)}>
          {getPromptStatusName(status)}
        </Tag>
      ),
      filters: configOptions.promptStatuses.map(({value, label}) => ({
        text: label,
        value: value,
      })),
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      width: 100,
      render: (author: string) => author || <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 80,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 150,
      render: (date: string) => (
        <Tooltip title={promptUtils.formatDate(date)}>
          <span>{new Date(date).toLocaleDateString()}</span>
        </Tooltip>
      ),
      sorter: (a: PromptSummary, b: PromptSummary) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record: PromptSummary) => (
        <Space size="small">
          <Tooltip title="查看">
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
            />
          </Tooltip>
          <Tooltip title="克隆">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => handleClone(record.id)}
              loading={clonePromptMutation.isPending}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确定要删除这个提示词吗？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
              okType="danger"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={deletePromptMutation.isPending}
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
  };

  if (error) {
    return (
      <Card>
        <Empty
          description="加载提示词列表失败"
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
                <p>请在顶部导航栏选择一个项目后，即可查看该项目的提示词列表。</p>
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
              title="总提示词数"
              value={promptsData?.total || 0}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃提示词"
              value={statsData?.active_prompts || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="草稿提示词"
              value={statsData?.draft_prompts || 0}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="归档提示词"
              value={statsData?.archived_prompts || 0}
              valueStyle={{ color: '#999' }}
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
                placeholder="搜索提示词名称或内容"
                allowClear
                enterButton={<SearchOutlined />}
                style={{ width: 300 }}
                onSearch={handleSearch}
                onChange={(e) => !e.target.value && setSearchText('')}
              />

              <Select
                placeholder="类型"
                allowClear
                style={{ width: 120 }}
                value={typeFilter}
                onChange={(value) => handleFilterChange('type', value)}
                options={configOptions.promptTypes}
              />

              <Select
                placeholder="状态"
                allowClear
                style={{ width: 120 }}
                value={statusFilter}
                onChange={(value) => handleFilterChange('status', value)}
                options={configOptions.promptStatuses}
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
                <Button
                  danger
                  onClick={handleBatchDelete}
                  loading={batchDeleteMutation.isPending}
                >
                  批量删除 ({selectedRowKeys.length})
                </Button>
              )}

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  console.log('PromptList: 点击新建提示词按钮');
                  console.log('PromptList Debug:', {
                    currentPath: window.location.pathname,
                    targetPath: '/prompts/create',
                    timestamp: new Date().toISOString()
                  });
                  navigate('/prompts/create');
                }}
              >
                新建提示词
              </Button>

              <Tooltip title="导出功能">
                <Button icon={<ExportOutlined />} disabled>
                  导出
                </Button>
              </Tooltip>

              <Tooltip title="导入功能">
                <Button icon={<ImportOutlined />} disabled>
                  导入
                </Button>
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        <Spin spinning={isLoading}>
          <Table
            columns={columns}
            dataSource={promptsData?.items || []}
            rowKey="id"
            rowSelection={rowSelection}
            pagination={false}
            scroll={{ x: 1200 }}
            size="middle"
          />

          {/* Pagination */}
          {promptsData && promptsData.pages > 1 && (
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <Pagination
                current={currentPage}
                total={promptsData.total}
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
        </Spin>
      </Card>
    </div>
  );
};

export default PromptList;