import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Tooltip,
  Popconfirm,
  Input,
  Select,
  DatePicker,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Modal,
  Form,
  message,
  Drawer,
  Badge,
  Dropdown,
  Menu
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  ExportOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  BarsOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { unifiedGenerationService } from '../../services';
import { downloadFile, generateExportFilename } from '../../utils/fileUtils';
import {
  UnifiedTestCaseResponse,
  UnifiedTestCaseFilter,
  UnifiedTestCaseStatistics,
  UnifiedTestCaseStage,
  UnifiedTestCaseStatus,
  ViewMode,
  SearchFilter
} from '../../types/unifiedTestCase';

const { Title, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface UnifiedTestCaseListProps {
  projectId?: number;
  businessType?: string;
  viewMode?: ViewMode;
  onSelectionChange?: (selectedItems: UnifiedTestCaseResponse[]) => void;
  height?: string | number;
  showActions?: boolean;
  selectable?: boolean;
}

const UnifiedTestCaseList: React.FC<UnifiedTestCaseListProps> = ({
  projectId,
  businessType,
  viewMode = ViewMode.UNIFIED,
  onSelectionChange,
  height = 'calc(100vh - 300px)',
  showActions = true,
  selectable = true
}) => {
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [testCases, setTestCases] = useState<UnifiedTestCaseResponse[]>([]);
  const [statistics, setStatistics] = useState<UnifiedTestCaseStatistics | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [selectedItems, setSelectedItems] = useState<UnifiedTestCaseResponse[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // 搜索和过滤
  const [searchFilter, setSearchFilter] = useState<SearchFilter>({});
  const [filterVisible, setFilterVisible] = useState(false);

  // 详情和编辑
  const [detailVisible, setDetailVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState<UnifiedTestCaseResponse | null>(null);

  // 服务实例
  const service = unifiedGenerationService;

  // 加载数据
  const loadTestCases = async (page: number = 1) => {
    setLoading(true);
    try {
      const filter: UnifiedTestCaseFilter = {
        project_id: projectId,
        business_type: businessType,
        keyword: searchFilter.keyword,
        status: searchFilter.status,
        priority: searchFilter.priority,
        stage: searchFilter.stage,
        page,
        size: pageSize,
        sort_by: 'created_at',
        sort_order: 'desc'
      };

      const response = await service.getUnifiedTestCases(filter);
      setTestCases(response.items);
      setTotal(response.total);
      setCurrentPage(page);
    } catch (error) {
      console.error('加载测试用例列表失败:', error);
      message.error('加载测试用例列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计信息
  const loadStatistics = async () => {
    try {
      const stats = await service.getStatistics(projectId, businessType);
      setStatistics(stats);
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  };

  // 导出处理函数
  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const blob = await service.exportTestCasesToExcel(
        businessType || undefined,
        projectId || undefined
      );

      const filename = generateExportFilename(businessType);
      downloadFile(blob, filename);

      message.success('导出成功！');
    } catch (error: any) {
      console.error('导出失败:', error);
      const errorMessage = error?.response?.data?.detail ||
                          error?.message ||
                          '导出失败，请稍后重试';
      message.error(`导出失败: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadTestCases();
    loadStatistics();
  }, [projectId, businessType, searchFilter, pageSize]);

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchFilter(prev => ({ ...prev, keyword: value }));
    setCurrentPage(1);
  };

  // 处理过滤
  const handleFilter = (filter: SearchFilter) => {
    setSearchFilter(filter);
    setFilterVisible(false);
    setCurrentPage(1);
  };

  // 处理选择变化
  const handleSelectionChange = (selectedKeys: number[], selectedRows: UnifiedTestCaseResponse[]) => {
    setSelectedRowKeys(selectedKeys);
    setSelectedItems(selectedRows);
    onSelectionChange?.(selectedRows);
  };

  // 处理删除
  const handleDelete = async (id: number) => {
    try {
      await service.deleteUnifiedTestCase(id);
      message.success('删除成功');
      loadTestCases(currentPage);
      loadStatistics();
    } catch (error: any) {
      console.error('删除失败:', error);

      // 根据错误类型显示不同的提示
      if (error.message?.includes('不存在')) {
        message.warning('测试用例不存在，可能已被删除');
        loadTestCases(currentPage); // 刷新列表
      } else if (error.message?.includes('服务器内部错误')) {
        message.error('服务器暂时繁忙，请稍后重试');
      } else if (error.message?.includes('关联数据')) {
        message.error('删除失败：存在关联数据，请先清理相关记录');
      } else {
        message.error(error.message || '删除失败，请稍后重试');
      }
    }
  };

  // 处理批量删除
  const handleBatchDelete = async () => {
    try {
      await service.batchDelete(selectedRowKeys);
      message.success('批量删除成功');
      setSelectedRowKeys([]);
      setSelectedItems([]);
      loadTestCases(currentPage);
      loadStatistics();
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  // 处理状态更新
  const handleStatusUpdate = async (id: number, status: UnifiedTestCaseStatus) => {
    try {
      await service.updateUnifiedTestCase(id, { status });
      message.success('状态更新成功');
      loadTestCases(currentPage);
      loadStatistics();
    } catch (error) {
      message.error('状态更新失败');
    }
  };

  // 查看详情
  const handleViewDetail = (item: UnifiedTestCaseResponse) => {
    setCurrentItem(item);
    setDetailVisible(true);
  };

  // 编辑
  const handleEdit = (item: UnifiedTestCaseResponse) => {
    setCurrentItem(item);
    setEditVisible(true);
  };

  // 表格列定义
  const columns: ColumnsType<UnifiedTestCaseResponse> = [
    {
      title: 'ID',
      dataIndex: 'case_id',
      key: 'case_id',
      width: 100,
      fixed: 'left',
      render: (text, record) => (
        <Space direction="vertical" size="small">
          <Text strong>{text}</Text>
          <Tag color={record.stage === UnifiedTestCaseStage.TEST_POINT ? 'blue' : 'green'}>
            {record.stage === UnifiedTestCaseStage.TEST_POINT ? '测试点' : '测试用例'}
          </Tag>
        </Space>
      )
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
      render: (text, record) => (
        <Tooltip title={text}>
          <Text strong>{text}</Text>
          {record.module && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.module}
              </Text>
            </div>
          )}
        </Tooltip>
      )
    },
    {
      title: '业务类型',
      dataIndex: 'business_type',
      key: 'business_type',
      width: 100,
      render: (text) => <Tag>{text}</Tag>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={service.getStatusColor(status)}>
          {service.getStatusLabel(status)}
        </Tag>
      )
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority) => (
        <Tag color={service.getPriorityColor(priority)}>
          {service.getPriorityLabel(priority)}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item
                  key="approve"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleStatusUpdate(record.id, UnifiedTestCaseStatus.APPROVED)}
                  disabled={record.status === UnifiedTestCaseStatus.APPROVED}
                >
                  批准
                </Menu.Item>
                <Menu.Item
                  key="complete"
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleStatusUpdate(record.id, UnifiedTestCaseStatus.COMPLETED)}
                  disabled={record.status === UnifiedTestCaseStatus.COMPLETED}
                >
                  完成
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  key="delete"
                  icon={<DeleteOutlined />}
                  danger
                >
                  <Popconfirm
                    title="确定要删除这个测试用例吗？"
                    onConfirm={() => handleDelete(record.id)}
                  >
                    删除
                  </Popconfirm>
                </Menu.Item>
              </Menu>
            }
          >
            <Button type="link" size="small">
              更多 <CopyOutlined />
            </Button>
          </Dropdown>
        </Space>
      )
    }
  ];

  // 批量操作菜单
  const batchActions = (
    <Space>
      <Button
        icon={<CheckCircleOutlined />}
        onClick={() => service.approveTestCases(selectedRowKeys)}
      >
        批量批准
      </Button>
      <Button
        icon={<PlayCircleOutlined />}
        onClick={() => service.completeTestCases(selectedRowKeys)}
      >
        批量完成
      </Button>
      <Popconfirm
        title="确定要批量删除选中的测试用例吗？"
        onConfirm={handleBatchDelete}
      >
        <Button danger icon={<DeleteOutlined />}>
          批量删除
        </Button>
      </Popconfirm>
    </Space>
  );

  return (
    <div>
      {/* 统计卡片 */}
      {statistics && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总数量"
                value={statistics.total_count}
                prefix={<AppstoreOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="测试点"
                value={statistics.test_point_count}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="测试用例"
                value={statistics.test_case_count}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已完成"
                value={statistics.status_distribution?.completed || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space>
              <Search
                placeholder="搜索测试用例名称、描述或ID"
                allowClear
                enterButton
                style={{ width: 300 }}
                onSearch={handleSearch}
              />
              <Button
                icon={<FilterOutlined />}
                onClick={() => setFilterVisible(true)}
              >
                过滤
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => loadTestCases()}>
                刷新
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={handleExport}
                loading={isExporting}
              >
                导出
              </Button>
              {showActions && (
                <Button type="primary" icon={<PlusOutlined />}>
                  新建测试用例
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 批量操作栏 */}
      {selectedRowKeys.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <Space>
            <Badge count={selectedRowKeys.length}>
              <Text>已选择</Text>
            </Badge>
            {batchActions}
            <Button
              type="link"
              onClick={() => {
                setSelectedRowKeys([]);
                setSelectedItems([]);
              }}
            >
              取消选择
            </Button>
          </Space>
        </Card>
      )}

      {/* 表格 */}
      <Table
        columns={columns}
        dataSource={testCases}
        rowKey="id"
        loading={loading}
        scroll={{ y: height, x: 1200 }}
        rowSelection={
          selectable
            ? {
                selectedRowKeys,
                onChange: handleSelectionChange,
                preserveSelectedRowKeys: true
              }
            : undefined
        }
        pagination={{
          current: currentPage,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          onChange: loadTestCases,
          onShowSizeChange: (current, size) => {
            setPageSize(size);
            loadTestCases(current);
          }
        }}
      />

      {/* 详情弹窗 */}
      <Modal
        title="测试用例详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={800}
      >
        {currentItem && (
          <div>
            {/* 详情内容 */}
            <p>ID: {currentItem.case_id}</p>
            <p>名称: {currentItem.name}</p>
            <p>描述: {currentItem.description}</p>
            {/* 更多详情... */}
          </div>
        )}
      </Modal>

      {/* 编辑弹窗 */}
      <Modal
        title="编辑测试用例"
        open={editVisible}
        onCancel={() => setEditVisible(false)}
        footer={null}
        width={800}
      >
        {currentItem && (
          <div>
            {/* 编辑表单 */}
            <p>编辑功能开发中...</p>
          </div>
        )}
      </Modal>

      {/* 过滤抽屉 */}
      <Drawer
        title="过滤条件"
        placement="right"
        onClose={() => setFilterVisible(false)}
        open={filterVisible}
        width={300}
      >
        <Form layout="vertical" onFinish={handleFilter}>
          <Form.Item name="status" label="状态">
            <Select placeholder="选择状态" allowClear>
              <Option value={UnifiedTestCaseStatus.DRAFT}>草稿</Option>
              <Option value={UnifiedTestCaseStatus.APPROVED}>已批准</Option>
              <Option value={UnifiedTestCaseStatus.COMPLETED}>已完成</Option>
            </Select>
          </Form.Item>

          <Form.Item name="priority" label="优先级">
            <Select placeholder="选择优先级" allowClear>
              <Option value="high">高</Option>
              <Option value="medium">中</Option>
              <Option value="low">低</Option>
            </Select>
          </Form.Item>

          <Form.Item name="stage" label="阶段">
            <Select placeholder="选择阶段" allowClear>
              <Option value={UnifiedTestCaseStage.TEST_POINT}>测试点</Option>
              <Option value={UnifiedTestCaseStage.TEST_CASE}>测试用例</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                应用过滤
              </Button>
              <Button onClick={() => setSearchFilter({})}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

export default UnifiedTestCaseList;