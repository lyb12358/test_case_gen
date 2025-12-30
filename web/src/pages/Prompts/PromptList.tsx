/**
 * Prompt List Page - Advanced table with filtering and search functionality.
 */

import { formatDateTime } from '@/utils/timeFormatter';
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
  Checkbox,
  Alert
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
  Prompt,
  PromptSummary,
  PromptType,
  PromptStatus,
  GenerationStage,
  BusinessType,
  getPromptTypeName,
  getPromptStatusName,
  getGenerationStageName,
  getBusinessTypeNameSync,
  getPromptTypeOptions,
  getPromptStatusOptions,
  getGenerationStageOptions,
  getBusinessTypeOptions
} from '../../types/prompts';
import { configService } from '../../services/configService';
import promptService, { promptUtils } from '../../services/promptService';
import { statsService } from '../../services/promptService';
import { useProject } from '../../contexts/ProjectContext';
import { projectService } from '../../services/projectService';
import PromptDeletePreview from './PromptDeletePreview';

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
  const [generationStageFilters, setGenerationStageFilters] = useState<GenerationStage[]>([]);
  const [businessTypeFilter, setBusinessTypeFilter] = useState<BusinessType | undefined>();

  // Handle generation stage filter change with type safety
  const handleGenerationStageChange = useCallback((checkedValues: string[]) => {
    // Type assertion is safe here because checkbox options use valid GenerationStage values
    setGenerationStageFilters(checkedValues as GenerationStage[]);
  }, []);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  // Delete preview state
  const [deletePreviewVisible, setDeletePreviewVisible] = useState(false);
  const [deletePreviewData, setDeletePreviewData] = useState<any>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [isBatchDelete, setIsBatchDelete] = useState(false);
  const [isDataSyncing, setIsDataSyncing] = useState(false);

  // Dynamic configuration state
  const [configOptions, setConfigOptions] = useState<{
    promptTypes: Array<{value: string; label: string}>;
    promptStatuses: Array<{value: string; label: string}>;
    businessTypes: Array<{value: string; label: string}>;
    generationStages: Array<{value: string; label: string}>;
  }>({
    promptTypes: [],
    promptStatuses: [],
    businessTypes: [],
    generationStages: []
  });

  // Load configuration options
  useEffect(() => {
    const loadConfiguration = async () => {
      if (!currentProject) return;

      try {
        const [promptTypes, promptStatuses, generationStages] = await Promise.all([
          getPromptTypeOptions(),
          getPromptStatusOptions(),
          getGenerationStageOptions()
        ]);

        // Get business types from current project
        let businessTypes: Array<{value: string; label: string}> = [];
        try {
          const projectBusinessTypes = await projectService.getProjectBusinessTypes(currentProject.id);
          businessTypes = projectBusinessTypes
            .filter(bt => bt.is_active) // Only include active business types
            .map(bt => ({
              value: bt.code,
              label: bt.name
            }));
        } catch (btError) {
          console.warn('Failed to load project business types, falling back to default:', btError);
          // Fallback to default options
          businessTypes = getBusinessTypeOptions();
        }

        setConfigOptions({
          promptTypes,
          promptStatuses,
          businessTypes,
          generationStages
        });
      } catch (error) {
        console.error('Failed to load configuration options:', error);
        message.error('加载配置选项失败');
      }
    };

    loadConfiguration();
  }, [currentProject]);

  // Fetch prompts
  const {
    data: promptsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['prompts', currentPage, pageSize, searchText, typeFilter, statusFilter, generationStageFilters, businessTypeFilter],
    queryFn: () => promptService.prompt.getPrompts({
      page: currentPage,
      size: pageSize,
      search: searchText || undefined,
      type: typeFilter,
      status: statusFilter,
      generation_stage: generationStageFilters.length > 0 ? generationStageFilters.join(',') : undefined,
      business_type: businessTypeFilter
      // 不传递 project_id，显示所有项目的提示词
    }),
    placeholderData: (previousData) => previousData,
    enabled: true // 始终启用查询，不受项目选择限制
  });

  // Fetch statistics data
  const {
    data: statsData
  } = useQuery({
    queryKey: ['prompt-stats'],
    queryFn: () => statsService.getOverviewStats(undefined), // 不传递项目ID，获取全局统计
    staleTime: 30 * 1000, // 30 seconds cache (reduced from 5 minutes for better consistency)
    enabled: true, // 始终启用，不受项目选择限制
    // Depend on prompts data to ensure stats are updated after list changes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  });

  // Delete prompt mutation
  const deletePromptMutation = useMutation({
    mutationFn: promptService.prompt.deletePrompt,
    onMutate: () => {
      setIsDataSyncing(true);
    },
    onSuccess: async () => {
      message.success('提示词删除成功，正在同步数据...');
      setSelectedRowKeys([]);

      // First invalidate prompts data
      await queryClient.invalidateQueries({ queryKey: ['prompts'] });

      // Wait a bit to ensure the list data is updated, then invalidate stats
      // This ensures the stats API gets the most recent data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['prompt-stats'] });
        // Hide syncing state after a short delay
        setTimeout(() => {
          setIsDataSyncing(false);
          message.success('数据同步完成');
        }, 500);
      }, 100);
    },
    onError: (error: any) => {
      setIsDataSyncing(false);
      message.error(`删除失败: ${error.response?.data?.detail || error.message}`);
    }
  });

  // Delete preview mutations
  const getDeletePreviewMutation = useMutation({
    mutationFn: promptService.prompt.getDeletePreview,
    onSuccess: (data) => {
      setDeletePreviewData(data);
      setDeletePreviewVisible(true);
    },
    onError: (error: any) => {
      message.error(`获取删除预览失败: ${error.response?.data?.detail || error.message}`);
    }
  });

  const getBatchDeletePreviewMutation = useMutation({
    mutationFn: promptService.prompt.getBatchDeletePreview,
    onSuccess: (data) => {
      setDeletePreviewData(data);
      setDeletePreviewVisible(true);
    },
    onError: (error: any) => {
      message.error(`获取批量删除预览失败: ${error.response?.data?.detail || error.message}`);
    }
  });

  // Batch delete mutation
  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map(id => promptService.prompt.deletePrompt(id)));
    },
    onMutate: () => {
      setIsDataSyncing(true);
    },
    onSuccess: async () => {
      message.success(`批量删除 ${selectedRowKeys.length} 个提示词成功，正在同步数据...`);
      setSelectedRowKeys([]);

      // First invalidate prompts data
      await queryClient.invalidateQueries({ queryKey: ['prompts'] });

      // Wait a bit to ensure the list data is updated, then invalidate stats
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['prompt-stats'] });
        // Hide syncing state after a short delay
        setTimeout(() => {
          setIsDataSyncing(false);
          message.success('数据同步完成');
        }, 500);
      }, 100);
    },
    onError: (error: any) => {
      setIsDataSyncing(false);
      message.error(`批量删除失败: ${error.response?.data?.detail || error.message}`);
    }
  });

  // Clone prompt mutation
  const clonePromptMutation = useMutation({
    mutationFn: promptService.prompt.clonePrompt,
    onSuccess: (data: any) => {
      message.success('提示词克隆成功');
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
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
    setGenerationStageFilters([]);
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
    setPendingDeleteId(id);
    setIsBatchDelete(false);
    getDeletePreviewMutation.mutate(id);
  };

  const handleClone = (id: number) => {
    clonePromptMutation.mutate(id);
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的提示词');
      return;
    }
    setPendingDeleteId(null);
    setIsBatchDelete(true);
    getBatchDeletePreviewMutation.mutate(selectedRowKeys);
  };

  // Delete preview handlers
  const handleDeletePreviewCancel = () => {
    setDeletePreviewVisible(false);
    setDeletePreviewData(null);
    setPendingDeleteId(null);
    setIsBatchDelete(false);
  };

  const handleDeletePreviewConfirm = () => {
    if (isBatchDelete && selectedRowKeys.length > 0) {
      batchDeleteMutation.mutate(selectedRowKeys);
    } else if (pendingDeleteId) {
      deletePromptMutation.mutate(pendingDeleteId);
    }
    handleDeletePreviewCancel();
  };

  // Table columns
  const columns: ColumnsType<Prompt> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string, record: Prompt) => (
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
          <Tag>{getBusinessTypeNameSync(businessType)}</Tag>
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
      title: '生成阶段',
      dataIndex: 'generation_stage',
      key: 'generation_stage',
      width: 140,
      render: (generationStage: GenerationStage) => (
        generationStage ? (
          <Tag color={promptUtils.getGenerationStageColor(generationStage)}>
            {getGenerationStageName(generationStage)}
          </Tag>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        )
      ),
      filters: configOptions.generationStages.map(({value, label}) => ({
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
          <span>{formatDateTime(date, "YYYY-MM-DD")}</span>
        </Tooltip>
      ),
      sorter: (a: Prompt, b: Prompt) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record: Prompt) => (
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
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              loading={getDeletePreviewMutation.isPending || deletePromptMutation.isPending}
              onClick={() => handleDelete(record.id)}
            />
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

  return (
    <div style={{ padding: '24px' }}>

      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={
                <span>
                  总提示词数
                  {isDataSyncing && <Spin size="small" style={{ marginLeft: '8px' }} />}
                </span>
              }
              value={promptsData?.total || 0}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={
                <span>
                  活跃提示词
                  {isDataSyncing && <Spin size="small" style={{ marginLeft: '8px' }} />}
                </span>
              }
              value={statsData?.active_prompts || 0}
              valueStyle={{
                color: '#1890ff'
              }}
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

              <Checkbox.Group
                options={[
                  { label: '测试点生成', value: 'test_point' },
                  { label: '测试用例生成', value: 'test_case' }
                ]}
                value={generationStageFilters}
                onChange={handleGenerationStageChange}
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

      {/* Delete Preview Modal */}
      <PromptDeletePreview
        visible={deletePreviewVisible}
        onCancel={handleDeletePreviewCancel}
        onConfirm={handleDeletePreviewConfirm}
        loading={getDeletePreviewMutation.isPending || getBatchDeletePreviewMutation.isPending}
        data={deletePreviewData}
        isBatch={isBatchDelete}
      />
    </div>
  );
};

export default PromptList;