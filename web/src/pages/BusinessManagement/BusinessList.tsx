import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Popconfirm,
  Statistic,
  Row,
  Col,
  Tooltip,
  Badge,
  Progress,
  Empty,
  Alert
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  BuildOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  SettingOutlined
} from '@ant-design/icons';
import {
  getTwoStageStatusTag,
  type TwoStageConfig
} from '../../utils/twoStageStatus';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessService, BusinessType, BusinessTypeCreate, BusinessTypeStats } from '../../services/businessService';
import { useProject } from '../../contexts/ProjectContext';
import BusinessEditor from './BusinessEditor';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const BusinessList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentProject, projects } = useProject();
  const [searchText, setSearchText] = useState('');
  const [selectedProject, setSelectedProject] = useState<number | undefined>(currentProject?.id);
  const [selectedStatus, setSelectedStatus] = useState<boolean | undefined>(undefined);
  const [editorModalVisible, setEditorModalVisible] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<BusinessType | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 当当前项目变更时，自动更新选中的项目
  useEffect(() => {
    console.log('BusinessList: currentProject changed to:', currentProject?.id);
    setSelectedProject(currentProject?.id);

    // 当项目切换时，强制失效统计查询缓存
    if (currentProject?.id !== undefined) {
      console.log('BusinessList: Invalidating stats cache for project:', currentProject.id);
      queryClient.invalidateQueries({
        queryKey: ['businessTypeStats']
      });
    }
  }, [currentProject, queryClient]);

  // 获取业务类型列表
  const { data: businessTypesData, isLoading, error, refetch } = useQuery({
    queryKey: ['businessTypes', selectedProject, selectedStatus, currentPage, searchText],
    queryFn: () => {
      console.log('BusinessList: Fetching business types with params', {
        project_id: selectedProject,
        is_active: selectedStatus,
        page: currentPage,
        size: pageSize,
        search: searchText || undefined
      });
      return businessService.getBusinessTypes({
        project_id: selectedProject,
        is_active: selectedStatus,
        page: currentPage,
        size: pageSize,
        search: searchText || undefined
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: (error) => {
      console.error('BusinessList: Failed to fetch business types:', error);
    }
  });

  // 获取业务类型统计
  const { data: statsData, error: statsError } = useQuery({
    queryKey: ['businessTypeStats', selectedProject],
    queryFn: () => {
      console.log('BusinessList: Fetching business type stats with project_id:', selectedProject);
      return businessService.getBusinessTypeStats(selectedProject);
    },
    staleTime: 5 * 60 * 1000,
    enabled: selectedProject !== undefined, // 确保项目选择后才查询
    onSuccess: (data) => {
      console.log('BusinessList: Stats received for project', selectedProject, ':', {
        total: data.total_business_types,
        active: data.active_business_types,
        configured: data.business_types_with_prompt_combinations,
        not_configured: data.business_types_without_prompt_combinations
      });
    },
    onError: (error) => {
      console.error('BusinessList: Failed to fetch business type stats:', error);
    }
  });

  // 添加调试日志 (移动到所有hook声明之后)
  console.log('BusinessList: Component rendering', {
    currentProject: currentProject?.id,
    selectedProject: selectedProject,
    projects: projects.length,
    isLoading,
    statsData: statsData ? 'loaded' : 'not loaded',
    stats: statsData ? {
      total: statsData.total_business_types,
      active: statsData.active_business_types,
      configured: statsData.business_types_with_prompt_combinations,
      not_configured: statsData.business_types_without_prompt_combinations
    } : null
  });

  // 删除业务类型
  const deleteMutation = useMutation({
    mutationFn: businessService.deleteBusinessType,
    onSuccess: () => {
      message.success('业务类型删除成功');
      queryClient.invalidateQueries({ queryKey: ['businessTypes'] });
      queryClient.invalidateQueries({ queryKey: ['businessTypeStats'] });
    },
    onError: (error: any) => {
      message.error(error.message || '删除业务类型失败');
    },
  });

  // 激活/停用业务类型
  const activateMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      businessService.activateBusinessType(id, { is_active }),
    onSuccess: () => {
      message.success('业务类型状态更新成功');
      queryClient.invalidateQueries({ queryKey: ['businessTypes'] });
      queryClient.invalidateQueries({ queryKey: ['businessTypeStats'] });
    },
    onError: (error: any) => {
      message.error(error.message || '更新业务类型状态失败');
    },
  });

  const handleCreateBusiness = () => {
    setEditingBusiness(null);
    setEditorModalVisible(true);
  };

  const handleEditBusiness = (business: BusinessType) => {
    setEditingBusiness(business);
    setEditorModalVisible(true);
  };

  const handleDeleteBusiness = (businessId: number) => {
    deleteMutation.mutate(businessId);
  };

  const handleToggleActivation = (business: BusinessType) => {
    if (business.is_active) {
      // 停用
      activateMutation.mutate({ id: business.id, is_active: false });
    } else {
      // 激活前检查提示词组合
      if (!business.has_valid_prompt_combination) {
        message.warning('业务类型需要配置有效的提示词组合才能激活');
        return;
      }
      activateMutation.mutate({ id: business.id, is_active: true });
    }
  };

  const handleViewPromptCombination = (business: BusinessType) => {
    // Navigate to the new business prompt configuration page
    navigate(`/business-management/business-types/${business.id}/configure`);
  };

  const getStatusTag = (business: BusinessType) => {
    if (business.is_active) {
      return (
        <Tag color="green" icon={<CheckCircleOutlined />}>
          激活
        </Tag>
      );
    } else if (business.has_valid_prompt_combination) {
      return (
        <Tag color="blue" icon={<BuildOutlined />}>
          可激活
        </Tag>
      );
    } else {
      return (
        <Tag color="orange" icon={<ExclamationCircleOutlined />}>
          需配置
        </Tag>
      );
    }
  };

  const getPromptCombinationTag = (business: BusinessType) => {
    if (business.has_valid_prompt_combination) {
      return (
        <Tooltip title={business.prompt_combination_name || '已配置'}>
          <Tag color="green" icon={<CheckCircleOutlined />}>
            已配置
          </Tag>
        </Tooltip>
      );
    } else {
      return (
        <Tooltip title="需要配置提示词组合">
          <Tag color="red" icon={<CloseCircleOutlined />}>
            未配置
          </Tag>
        </Tooltip>
      );
    }
  };

  // 渲染两阶段生成状态标签 - 使用简化的工具函数
  const getTwoStageStatusTagForRecord = (record: BusinessType) => {
    const config: TwoStageConfig = {
      has_test_point_combination: record.has_valid_test_point_combination,
      has_test_case_combination: record.has_valid_test_case_combination
    };

    return getTwoStageStatusTag(config);
  };

  const columns = [
    {
      title: '业务编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string) => <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{code}</span>
    },
    {
      title: '业务名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record: BusinessType) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          {record.description && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '所属项目',
      dataIndex: 'project_name',
      key: 'project_name',
      width: 150,
      render: (projectName: string) => projectName || <Text type="secondary">未分配</Text>,
    },
    {
      title: '提示词组合',
      key: 'prompt_combination',
      width: 120,
      render: (_: any, record: BusinessType) => getPromptCombinationTag(record),
    },
    {
      title: '两阶段状态',
      key: 'two_stage_status',
      width: 120,
      render: (_: any, record: BusinessType) => getTwoStageStatusTagForRecord(record),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: BusinessType) => getStatusTag(record),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: BusinessType) => (
        <Space size="small">
          <Tooltip title="编辑业务类型">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditBusiness(record)}
            />
          </Tooltip>

          <Tooltip title={record.has_valid_prompt_combination ? "查看提示词配置" : "配置两阶段提示词"}>
            <Button
              type="text"
              size="small"
              icon={<SettingOutlined />}
              onClick={() => handleViewPromptCombination(record)}
              style={{
                color: record.has_valid_prompt_combination ? '#52c41a' : '#fa8c16'
              }}
            />
          </Tooltip>

          <Tooltip title={record.is_active ? "停用" : "激活"}>
            <Switch
              size="small"
              checked={record.is_active}
              onChange={() => handleToggleActivation(record)}
              disabled={!record.has_valid_prompt_combination && !record.is_active}
            />
          </Tooltip>

          <Tooltip title="删除">
            <Popconfirm
              title="确定删除吗？"
              description="删除后无法恢复"
              onConfirm={() => handleDeleteBusiness(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deleteMutation.isPending}
                disabled={record.is_active}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handleEditorSuccess = () => {
    setEditorModalVisible(false);
    setEditingBusiness(null);
    refetch();
  };

  // 错误处理
  if (error || statsError) {
    console.error('BusinessList: Component error', { error, statsError });
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="业务管理加载失败"
          description="无法加载业务类型数据，请检查网络连接或联系管理员"
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => refetch()}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计概览 */}
      {statsData && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="业务类型总数"
                value={statsData.total_business_types}
                prefix={<BuildOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="激活业务"
                value={statsData.active_business_types}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已配置提示词"
                value={statsData.business_types_with_prompt_combinations}
                valueStyle={{ color: '#1890ff' }}
                prefix={<SettingOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="待配置业务"
                value={statsData.business_types_without_prompt_combinations}
                valueStyle={{ color: '#fa8c16' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 操作区域 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space wrap>
            <Search
              placeholder="搜索业务类型..."
              allowClear
              style={{ width: 300 }}
              onSearch={setSearchText}
              onChange={(e) => !e.target.value && setSearchText('')}
            />

            <Select
              placeholder="选择项目"
              allowClear
              style={{ width: 200 }}
              value={selectedProject}
              onChange={setSelectedProject}
            >
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>

            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: 150 }}
              value={selectedStatus !== undefined ? (selectedStatus ? 'active' : 'inactive') : undefined}
              onChange={(value) => setSelectedStatus(value === 'active' ? true : value === 'inactive' ? false : undefined)}
            >
              <Option value="active">激活</Option>
              <Option value="inactive">未激活</Option>
            </Select>
          </Space>

          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateBusiness}
            >
              新建业务类型
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              loading={isLoading}
            >
              刷新
            </Button>
          </Space>
        </div>

        {/* 提示信息 */}
        <Alert
          message="业务管理说明"
          description={
            <div>
              <p>• 业务类型需要配置有效的提示词组合才能激活</p>
              <p>• 只有激活的业务类型才能用于生成测试用例</p>
              <p>• 点击设置图标可以配置或查看提示词组合</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Card>

      {/* 业务类型列表 */}
      <Card title="业务类型列表">
        <Table
          columns={columns}
          dataSource={businessTypesData?.items || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: currentPage,
            total: businessTypesData?.total || 0,
            pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page) => setCurrentPage(page),
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 业务编辑器模态框 */}
      <Modal
        title={editingBusiness ? '编辑业务类型' : '新建业务类型'}
        open={editorModalVisible}
        onCancel={() => setEditorModalVisible(false)}
        footer={null}
        width={800}
        destroyOnHidden
      >
        <BusinessEditor
          business={editingBusiness}
          onSuccess={handleEditorSuccess}
          onCancel={() => setEditorModalVisible(false)}
        />
      </Modal>
    </div>
  );
};

export default BusinessList;
