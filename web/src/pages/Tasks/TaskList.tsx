import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Typography,
  Table,
  Button,
  Space,
  Tag,
  Progress,
  Tooltip,
  Popconfirm,
  Input,
  Select,
  DatePicker,
  Modal,
  Descriptions,
  Alert,
  Empty
} from 'antd';
const { Text } = Typography;
import { formatDateTime } from '@/utils/timeFormatter';
import {
  ReloadOutlined,
  EyeOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  PlusOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '@/services/taskService';
import { Task } from '@/types/testCases';
import { useProject } from '@/contexts/ProjectContext';

const { Title } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

const TaskList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentProject } = useProject();

  // State declarations
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // 获取任务列表 - 按项目过滤
  const { data: apiResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['tasks', currentProject?.id],
    queryFn: () => taskService.getAllTasks(currentProject?.id),
    enabled: !!currentProject
  });

  // 数据过滤和排序
  const filteredTasks = useMemo(() => {
    if (!apiResponse?.tasks) return [];

    let filteredData = [...apiResponse.tasks];

    // 按搜索文本过滤
    if (searchText) {
      filteredData = filteredData.filter((item: any) =>
        Object.values(item).some((value: any) =>
          String(value).toLowerCase().includes(searchText.toLowerCase())
        )
      );
    }

    // 按状态过滤
    if (selectedStatus) {
      filteredData = filteredData.filter((item: any) => item.status === selectedStatus);
    }

    // 按日期范围过滤
    if (dateRange && dateRange.length === 2) {
      const [start, end] = dateRange;
      filteredData = filteredData.filter((item: any) => {
        const createdAt = dayjs(item.created_at);
        return createdAt.isAfter(start) && createdAt.isBefore(end);
      });
    }

    return filteredData.sort((a: any, b: any) =>
      dayjs(b.created_at || '').unix() - dayjs(a.created_at || '').unix()
    );
  }, [apiResponse, searchText, selectedStatus, dateRange]);

  // 删除任务
  const deleteMutation = useMutation({
    mutationFn: taskService.deleteTask,
    onSuccess: () => {
      Modal.success({
        title: '删除成功',
        content: '任务已成功删除'
      });
      queryClient.invalidateQueries({ queryKey: ['tasks', currentProject?.id] });
    },
    onError: (error: any) => {
      Modal.error({
        title: '删除失败',
        content: error.message || '删除任务时发生错误'
      });
    },
  });

  const handleDelete = (taskId: string) => {
    deleteMutation.mutate(taskId);
  };

  const handleViewDetail = (task: Task) => {
    setSelectedTask(task);
    setDetailModalVisible(true);
  };

  const getStatusTag = (status: string) => {
    const statusConfig = {
      'pending': { color: 'orange', text: '等待中', icon: <ClockCircleOutlined /> },
      'running': { color: 'blue', text: '进行中', icon: <LoadingOutlined /> },
      'completed': { color: 'green', text: '已完成', icon: <CheckCircleOutlined /> },
      'failed': { color: 'red', text: '失败', icon: <ExclamationCircleOutlined /> }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  const getTaskTypeText = (businessType?: string) => {
    const taskTypes = {
      'test_case_generation': '测试用例生成',
      'interface_test_generation': '接口测试生成',
      'data_processing': '数据处理',
      'system_maintenance': '系统维护'
    };

    if (businessType) {
      return taskTypes['test_case_generation'];
    }
    return taskTypes['test_case_generation'];
  };

  const getBusinessTypeFullName = (type?: string) => {
    if (!type) return '-';
    const names: Record<string, string> = {
      'RCC': '远程净化',
      'RFD': '香氛控制',
      'ZAB': '远程恒温座舱设置',
      'ZBA': '水淹报警'
    };
    return names[type] || type;
  };

  const columns: any[] = [
    {
      title: '任务ID',
      dataIndex: 'task_id',
      key: 'task_id',
      width: 120,
      render: (id: string) => <span style={{ fontFamily: 'monospace' }}>#{id}</span>,
    },
    {
      title: '任务类型',
      dataIndex: 'business_type',
      key: 'task_type',
      width: 150,
      render: (businessType: string) => getTaskTypeText(businessType),
    },
    {
      title: '业务类型',
      dataIndex: 'business_type',
      key: 'business_type',
      width: 120,
      render: (type: string) => type ? getBusinessTypeFullName(type) : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
      filters: [
        { text: '等待中', value: 'pending' },
        { text: '进行中', value: 'running' },
        { text: '已完成', value: 'completed' },
        { text: '失败', value: 'failed' },
      ],
      onFilter: (value: string | number | boolean, record: Task) => record.status === value,
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 120,
      render: (progress: number, record: Task) => {
        if (record.status === 'completed') {
          return <Progress percent={100} size="small" status="success" />;
        } else if (record.status === 'failed') {
          return <Progress percent={progress || 0} size="small" status="exception" />;
        } else if (record.status === 'running' && progress) {
          return <Progress percent={progress} size="small" status="active" />;
        }
        return <Progress percent={0} size="small" />;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time: string) => formatDateTime(time),
      sorter: (a: Task, b: Task) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: '最后更新',
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: 180,
      render: (time: string, record: Task) => {
        const updateTime = time || record.created_at;
        return updateTime ? formatDateTime(updateTime) : '-';
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: Task) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title="删除任务">
            <Popconfirm
              title="确定删除吗？"
              description="删除后无法恢复"
              onConfirm={() => handleDelete(record.task_id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deleteMutation.isPending}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Error handling
  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="任务管理加载失败"
          description="无法加载任务数据，请检查网络连接或联系管理员"
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
    <div>
      {/* 项目信息展示 */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              任务管理 - {currentProject?.name || '未选择项目'}
            </Title>
            <div style={{ color: '#666', marginTop: 4 }}>
              {currentProject ?
                `项目ID: ${currentProject.id} | ${currentProject.description || '无描述'}` :
                '请先选择一个项目以查看相关任务'
              }
            </div>
          </div>
          <Space>
            <Tooltip title="请前往「测试管理中心」创建新任务">
              <Button
                type="primary"
                disabled={true}
                icon={<PlusOutlined />}
              >
                创建新任务
              </Button>
            </Tooltip>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              loading={isLoading}
            >
              刷新
            </Button>
          </Space>
        </div>
      </Card>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Search
              placeholder="搜索任务..."
              allowClear
              style={{ width: 300 }}
              onSearch={setSearchText}
              onChange={(e) => !e.target.value && setSearchText('')}
            />
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: 150 }}
              value={selectedStatus}
              onChange={setSelectedStatus}
            >
              <Select.Option value="pending">等待中</Select.Option>
              <Select.Option value="running">进行中</Select.Option>
              <Select.Option value="completed">已完成</Select.Option>
              <Select.Option value="failed">失败</Select.Option>
            </Select>
            <RangePicker
              placeholder={['开始日期', '结束日期']}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            />
          </Space>
        </div>

        {!currentProject ? (
          <Alert
            message="请先选择项目"
            description="请在顶部导航栏选择一个项目后，即可查看该项目的相关任务。"
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        ) : filteredTasks && Array.isArray(filteredTasks) && filteredTasks.length > 0 ? (
          <Table
            columns={columns}
            dataSource={filteredTasks}
            rowKey="task_id"
            loading={isLoading}
            pagination={{
              total: filteredTasks?.length || 0,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
            scroll={{ x: 1200 }}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                当前项目 <strong>{currentProject?.name || '未选择项目'}</strong> 暂无任务
                <br />
                <span style={{ color: '#999', fontSize: '12px' }}>
                  创建新任务开始生成测试用例
                </span>
              </span>
            }
            style={{ marginTop: 32, marginBottom: 32 }}
          >
            <Space direction="vertical" size="middle">
              <Button
                type="primary"
                disabled={true}
                size="large"
                icon={<PlusOutlined />}
              >
                创建新任务（已禁用）
              </Button>
              <Text type="secondary">
                请前往 <a onClick={() => navigate('/test-management/generate')}>测试管理中心</a> 创建新任务
              </Text>
            </Space>
          </Empty>
        )}
      </Card>

      {/* 任务详情弹窗 */}
      <Modal
        title="任务详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {selectedTask && (
          <div>
            <Descriptions
              bordered
              column={2}
              size="small"
            >
              <Descriptions.Item label="任务ID">
                <span style={{ fontFamily: 'monospace' }}>#{selectedTask.task_id}</span>
              </Descriptions.Item>
              <Descriptions.Item label="任务类型">
                {getTaskTypeText(selectedTask.business_type)}
              </Descriptions.Item>
              <Descriptions.Item label="业务类型">
                {selectedTask.business_type ? getBusinessTypeFullName(selectedTask.business_type) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {getStatusTag(selectedTask.status)}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {formatDateTime(selectedTask.created_at)}
              </Descriptions.Item>
              <Descriptions.Item label="最后更新">
                {(selectedTask.completed_at || selectedTask.created_at) ?
                  formatDateTime(selectedTask.completed_at || selectedTask.created_at) : '-'
                }
              </Descriptions.Item>
              {selectedTask.progress !== undefined && (
                <Descriptions.Item label="进度" span={2}>
                  <Progress
                    percent={selectedTask.progress}
                    status={
                      selectedTask.status === 'completed' ? 'success' :
                      selectedTask.status === 'failed' ? 'exception' : 'active'
                    }
                  />
                </Descriptions.Item>
              )}
              {selectedTask.message && (
                <Descriptions.Item label="消息" span={2}>
                  {selectedTask.message}
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedTask.status === 'running' && (
              <Alert
                message="任务进行中"
                description="该任务正在执行中，请耐心等待完成。"
                type="info"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}

            {selectedTask.status === 'failed' && (
              <Alert
                message="任务失败"
                description={selectedTask.message || '任务执行过程中遇到错误，请检查配置或重试。'}
                type="error"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TaskList;