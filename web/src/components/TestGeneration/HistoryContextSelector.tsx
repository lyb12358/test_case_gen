import React, { useState, useCallback } from 'react';
import {
  Card,
  Select,
  Input,
  Button,
  Table,
  Modal,
  Tooltip,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Divider,
  Alert,
  Badge,
  Checkbox,
  Radio,
  Form,
  message,
  List,
  Avatar,
  Descriptions
} from 'antd';
import {
  HistoryOutlined,
  SearchOutlined,
  EyeOutlined,
  CopyOutlined,
  FilterOutlined,
  ClearOutlined,
  SaveOutlined,
  StarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  SettingOutlined,
  ReloadOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export interface HistoryContext {
  id: string;
  title: string;
  description?: string;
  content: string;
  category: string;
  businessType?: string;
  createdAt: string;
  createdBy?: string;
  lastUsed?: string;
  usageCount: number;
  tags: string[];
  isFavorite: boolean;
  metadata?: {
    generationMode?: string;
    variables?: Record<string, any>;
    results?: any;
    duration?: number;
    success?: boolean;
  };
}

export interface ContextFilter {
  category?: string;
  businessType?: string;
  tags?: string[];
  createdBy?: string;
  dateRange?: [string, string];
  favorites?: boolean;
  search?: string;
}

interface HistoryContextSelectorProps {
  visible?: boolean;
  onContextSelect?: (context: HistoryContext) => void;
  onContextCreate?: (context: Omit<HistoryContext, 'id' | 'createdAt' | 'usageCount'>) => void;
  onCancel?: () => void;
  allowCreate?: boolean;
  showPreview?: boolean;
  showFilters?: boolean;
  defaultFilter?: Partial<ContextFilter>;
  multiSelect?: boolean;
  maxSelection?: number;
}

const HistoryContextSelector: React.FC<HistoryContextSelectorProps> = ({
  visible = true,
  onContextSelect,
  onContextCreate,
  onCancel,
  allowCreate = true,
  showPreview = true,
  showFilters = true,
  defaultFilter = {},
  multiSelect = false,
  maxSelection = 10
}) => {
  const [form] = Form.useForm();
  const [selectedContexts, setSelectedContexts] = useState<HistoryContext[]>([]);
  const [previewContext, setPreviewContext] = useState<HistoryContext | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [filter, setFilter] = useState<ContextFilter>(defaultFilter);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'lastUsed' | 'createdAt' | 'usageCount' | 'title'>('lastUsed');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Mock data - in real implementation, this would come from API
  const [mockContexts] = useState<HistoryContext[]>([
    {
      id: '1',
      title: 'RCC业务测试上下文',
      description: '远程空调控制业务的完整测试上下文',
      content: '业务类型：RCC\n测试重点：功能完整性、响应时间、错误处理\n环境：测试环境\n特殊要求：需要验证极端温度下的响应',
      category: '业务上下文',
      businessType: 'RCC',
      createdAt: '2024-01-15T10:30:00Z',
      createdBy: 'test_engineer_1',
      lastUsed: '2024-01-20T14:22:00Z',
      usageCount: 15,
      tags: ['RCC', '功能测试', '性能测试'],
      isFavorite: true,
      metadata: {
        generationMode: 'full_two_stage',
        duration: 45,
        success: true
      }
    },
    {
      id: '2',
      title: '批量生成优化配置',
      description: '针对多业务类型批量生成的优化配置',
      content: '并发数：5\n超时设置：30分钟\n重试策略：3次\n错误处理：继续执行其他任务',
      category: '系统配置',
      createdAt: '2024-01-12T09:15:00Z',
      createdBy: 'system_admin',
      lastUsed: '2024-01-18T16:45:00Z',
      usageCount: 8,
      tags: ['批量生成', '性能优化', '并发控制'],
      isFavorite: false,
      metadata: {
        generationMode: 'batch_generation',
        variables: { concurrency: 5, timeout: 1800 }
      }
    },
    {
      id: '3',
      title: '安全测试重点说明',
      description: '强调安全测试的上下文信息',
      content: '重点关注：\n1. 身份验证机制\n2. 权限控制\n3. 数据加密传输\n4. SQL注入防护\n5. XSS攻击防护',
      category: '安全要求',
      createdAt: '2024-01-10T13:20:00Z',
      createdBy: 'security_engineer',
      lastUsed: '2024-01-16T11:30:00Z',
      usageCount: 12,
      tags: ['安全', '认证', '权限', '注入防护'],
      isFavorite: true,
      metadata: {
        generationMode: 'test_cases_only',
        success: true
      }
    }
  ]);

  // Categories for filtering
  const categories = Array.from(new Set(mockContexts.map(c => c.category)));
  const businessTypes = Array.from(new Set(mockContexts.map(c => c.businessType).filter(Boolean)));
  const allTags = Array.from(new Set(mockContexts.flatMap(c => c.tags)));

  // Filter and sort contexts
  const filteredContexts = React.useMemo(() => {
    let filtered = [...mockContexts];

    // Apply search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower) ||
        c.content.toLowerCase().includes(searchLower) ||
        c.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Apply category filter
    if (filter.category) {
      filtered = filtered.filter(c => c.category === filter.category);
    }

    // Apply business type filter
    if (filter.businessType) {
      filtered = filtered.filter(c => c.businessType === filter.businessType);
    }

    // Apply tags filter
    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter(c =>
        filter.tags!.some(tag => c.tags.includes(tag))
      );
    }

    // Apply favorites filter
    if (filter.favorites) {
      filtered = filtered.filter(c => c.isFavorite);
    }

    // Apply created by filter
    if (filter.createdBy) {
      filtered = filtered.filter(c => c.createdBy === filter.createdBy);
    }

    // Sort contexts
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'lastUsed':
          comparison = (a.lastUsed || a.createdAt).localeCompare(b.lastUsed || b.createdAt);
          break;
        case 'createdAt':
          comparison = a.createdAt.localeCompare(b.createdAt);
          break;
        case 'usageCount':
          comparison = a.usageCount - b.usageCount;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [mockContexts, searchText, filter, sortBy, sortOrder]);

  const handleContextSelect = useCallback((context: HistoryContext) => {
    if (multiSelect) {
      const newSelection = [...selectedContexts];
      const existingIndex = newSelection.findIndex(c => c.id === context.id);

      if (existingIndex >= 0) {
        newSelection.splice(existingIndex, 1);
      } else {
        if (newSelection.length >= maxSelection) {
          message.warning(`最多只能选择 ${maxSelection} 个上下文`);
          return;
        }
        newSelection.push(context);
      }

      setSelectedContexts(newSelection);
    } else {
      setSelectedContexts([context]);
    }
  }, [multiSelect, selectedContexts, maxSelection]);

  const handleConfirmSelection = useCallback(() => {
    if (selectedContexts.length === 0) {
      message.warning('请至少选择一个上下文');
      return;
    }

    if (multiSelect) {
      onContextSelect?.(selectedContexts[selectedContexts.length - 1]); // For simplicity, return the last selected
    } else {
      onContextSelect?.(selectedContexts[0]);
    }
    onCancel?.();
  }, [selectedContexts, multiSelect, onContextSelect, onCancel]);

  const handleCreateContext = useCallback((values: any) => {
    const newContext: Omit<HistoryContext, 'id' | 'createdAt' | 'usageCount'> = {
      title: values.title,
      description: values.description,
      content: values.content,
      category: values.category,
      businessType: values.businessType,
      createdBy: 'current_user', // Would come from auth context
      tags: values.tags || [],
      isFavorite: false,
      metadata: {}
    };

    onContextCreate?.(newContext);
    setCreateModalVisible(false);
    form.resetFields();
    message.success('上下文创建成功');
  }, [onContextCreate, form]);

  const handleToggleFavorite = useCallback((contextId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // In real implementation, this would update the backend
    message.success('收藏状态已更新');
  }, []);

  const handleCopyContext = useCallback((context: HistoryContext, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(context.content);
    message.success('内容已复制到剪贴板');
  }, []);

  const clearFilters = useCallback(() => {
    setFilter(defaultFilter);
    setSearchText('');
  }, [defaultFilter]);

  const renderContextTable = () => {
    const columns = [
      {
        title: '标题',
        dataIndex: 'title',
        key: 'title',
        render: (title: string, record: HistoryContext) => (
          <Space>
            {record.isFavorite && <StarOutlined style={{ color: '#faad14' }} />}
            <Text strong>{title}</Text>
            {record.metadata?.success && (
              <Badge status="success" />
            )}
          </Space>
        ),
      },
      {
        title: '分类',
        dataIndex: 'category',
        key: 'category',
        width: 120,
        render: (category: string) => (
          <Tag color="blue">{category}</Tag>
        ),
      },
      {
        title: '业务类型',
        dataIndex: 'businessType',
        key: 'businessType',
        width: 100,
        render: (businessType?: string) => (
          businessType ? <Tag>{businessType}</Tag> : '-'
        ),
      },
      {
        title: '标签',
        dataIndex: 'tags',
        key: 'tags',
        width: 200,
        render: (tags: string[]) => (
          <Space wrap>
            {tags.slice(0, 2).map(tag => (
              <Tag key={tag} size="small">{tag}</Tag>
            ))}
            {tags.length > 2 && (
              <Tag size="small">+{tags.length - 2}</Tag>
            )}
          </Space>
        ),
      },
      {
        title: '使用次数',
        dataIndex: 'usageCount',
        key: 'usageCount',
        width: 100,
        render: (count: number) => (
          <Badge count={count} showZero />
        ),
      },
      {
        title: '最后使用',
        dataIndex: 'lastUsed',
        key: 'lastUsed',
        width: 120,
        render: (lastUsed?: string) => (
          lastUsed ? new Date(lastUsed).toLocaleDateString() : '-'
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 150,
        render: (_, record: HistoryContext) => (
          <Space size="small">
            <Tooltip title="预览">
              <Button
                type="text"
                icon={<EyeOutlined />}
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewContext(record);
                }}
              />
            </Tooltip>
            <Tooltip title="复制内容">
              <Button
                type="text"
                icon={<CopyOutlined />}
                size="small"
                onClick={(e) => handleCopyContext(record, e)}
              />
            </Tooltip>
            <Tooltip title={record.isFavorite ? '取消收藏' : '收藏'}>
              <Button
                type="text"
                icon={<StarOutlined />}
                size="small"
                style={{ color: record.isFavorite ? '#faad14' : undefined }}
                onClick={(e) => handleToggleFavorite(record.id, e)}
              />
            </Tooltip>
          </Space>
        ),
      },
    ];

    const rowSelection = multiSelect ? {
      selectedRowKeys: selectedContexts.map(c => c.id),
      onChange: (selectedRowKeys: string[]) => {
        const contexts = filteredContexts.filter(c => selectedRowKeys.includes(c.id));
        setSelectedContexts(contexts.slice(0, maxSelection));
      },
    } : undefined;

    return (
      <Table
        columns={columns}
        dataSource={filteredContexts}
        rowKey="id"
        rowSelection={rowSelection}
        onRow={(record) => ({
          onClick: () => handleContextSelect(record),
          style: {
            cursor: 'pointer',
            backgroundColor: selectedContexts.some(c => c.id === record.id) ? '#e6f7ff' : undefined
          }
        })}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 个上下文`
        }}
      />
    );
  };

  const renderContextList = () => (
    <List
      dataSource={filteredContexts}
      renderItem={(item) => (
        <List.Item
          onClick={() => handleContextSelect(item)}
          style={{
            cursor: 'pointer',
            backgroundColor: selectedContexts.some(c => c.id === item.id) ? '#e6f7ff' : undefined
          }}
          actions={[
            <Tooltip title="预览">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewContext(item);
                }}
              />
            </Tooltip>,
            <Tooltip title={item.isFavorite ? '取消收藏' : '收藏'}>
              <Button
                type="text"
                icon={<StarOutlined />}
                style={{ color: item.isFavorite ? '#faad14' : undefined }}
                onClick={(e) => handleToggleFavorite(item.id, e)}
              />
            </Tooltip>
          ]}
        >
          <List.Item.Meta
            avatar={
              <Avatar icon={<FileTextOutlined />} />
            }
            title={
              <Space>
                <Text strong>{item.title}</Text>
                {item.isFavorite && <StarOutlined style={{ color: '#faad14' }} />}
                <Tag color="blue" size="small">{item.category}</Tag>
              </Space>
            }
            description={
              <Space direction="vertical" size="small">
                <Text type="secondary">{item.description}</Text>
                <Space wrap>
                  {item.tags.map(tag => (
                    <Tag key={tag} size="small">{tag}</Tag>
                  ))}
                </Space>
                <Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <ClockCircleOutlined /> {new Date(item.lastUsed || item.createdAt).toLocaleDateString()}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    使用 {item.usageCount} 次
                  </Text>
                </Space>
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );

  return (
    <Modal
      title={
        <Space>
          <HistoryOutlined />
          <span>历史上下文选择器</span>
          {selectedContexts.length > 0 && (
            <Badge count={selectedContexts.length} />
          )}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={1000}
      footer={[
        <Space key="actions">
          <Button onClick={clearFilters} icon={<ClearOutlined />}>
            清除筛选
          </Button>
          <Button onClick={onCancel}>
            取消
          </Button>
          <Button
            type="primary"
            onClick={handleConfirmSelection}
            disabled={selectedContexts.length === 0}
          >
            确认选择 ({selectedContexts.length})
          </Button>
        </Space>
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Search and Filters */}
        {showFilters && (
          <Card size="small" title="搜索和筛选">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Input
                  placeholder="搜索标题、描述、内容或标签..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                />
              </Col>
              <Col span={6}>
                <Select
                  placeholder="分类"
                  value={filter.category}
                  onChange={(value) => setFilter(prev => ({ ...prev, category: value }))}
                  allowClear
                  style={{ width: '100%' }}
                >
                  {categories.map(category => (
                    <Option key={category} value={category}>{category}</Option>
                  ))}
                </Select>
              </Col>
              <Col span={6}>
                <Select
                  placeholder="业务类型"
                  value={filter.businessType}
                  onChange={(value) => setFilter(prev => ({ ...prev, businessType: value }))}
                  allowClear
                  style={{ width: '100%' }}
                >
                  {businessTypes.map(type => (
                    <Option key={type} value={type}>{type}</Option>
                  ))}
                </Select>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Space>
                  <Checkbox
                    checked={filter.favorites}
                    onChange={(e) => setFilter(prev => ({ ...prev, favorites: e.target.checked }))}
                  >
                    仅显示收藏
                  </Checkbox>
                </Space>
              </Col>
              <Col span={8}>
                <Radio.Group
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  size="small"
                >
                  <Radio.Button value="lastUsed">最近使用</Radio.Button>
                  <Radio.Button value="usageCount">使用频率</Radio.Button>
                  <Radio.Button value="title">标题</Radio.Button>
                </Radio.Group>
              </Col>
              <Col span={8} style={{ textAlign: 'right' }}>
                {allowCreate && (
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => setCreateModalVisible(true)}
                  >
                    创建新上下文
                  </Button>
                )}
              </Col>
            </Row>
          </Card>
        )}

        {/* Contexts List */}
        <Card title={`历史上下文 (${filteredContexts.length})`} size="small">
          {filteredContexts.length > 0 ? renderContextTable() : (
            <Alert
              message="未找到匹配的上下文"
              description="尝试调整搜索条件或创建新的上下文"
              type="info"
              showIcon
            />
          )}
        </Card>
      </Space>

      {/* Context Preview Modal */}
      <Modal
        title="上下文预览"
        open={!!previewContext}
        onCancel={() => setPreviewContext(null)}
        footer={[
          <Button key="close" onClick={() => setPreviewContext(null)}>
            关闭
          </Button>,
          <Button
            key="select"
            type="primary"
            onClick={() => {
              if (previewContext) {
                handleContextSelect(previewContext);
                setPreviewContext(null);
              }
            }}
          >
            选择此上下文
          </Button>
        ]}
        width={700}
      >
        {previewContext && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="标题">{previewContext.title}</Descriptions.Item>
              <Descriptions.Item label="分类">{previewContext.category}</Descriptions.Item>
              <Descriptions.Item label="业务类型">{previewContext.businessType || '-'}</Descriptions.Item>
              <Descriptions.Item label="创建者">{previewContext.createdBy || '-'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(previewContext.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="使用次数">{previewContext.usageCount}</Descriptions.Item>
              <Descriptions.Item label="标签" span={2}>
                <Space wrap>
                  {previewContext.tags.map(tag => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            </Descriptions>

            {previewContext.description && (
              <div>
                <Title level={5}>描述</Title>
                <Paragraph>{previewContext.description}</Paragraph>
              </div>
            )}

            <div>
              <Title level={5}>内容</Title>
              <div style={{
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 6,
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: 12,
                maxHeight: 300,
                overflow: 'auto'
              }}>
                {previewContext.content}
              </div>
            </div>
          </Space>
        )}
      </Modal>

      {/* Create Context Modal */}
      <Modal
        title="创建新上下文"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={() => {
          form.validateFields().then(handleCreateContext);
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入上下文标题' }]}
          >
            <Input placeholder="输入上下文标题" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input placeholder="输入上下文描述（可选）" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="分类"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="选择分类">
                  {categories.map(category => (
                    <Option key={category} value={category}>{category}</Option>
                  ))}
                  <Option value="custom">自定义</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="businessType"
                label="业务类型"
              >
                <Select placeholder="选择业务类型（可选）" allowClear>
                  {businessTypes.map(type => (
                    <Option key={type} value={type}>{type}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入上下文内容' }]}
          >
            <TextArea
              placeholder="输入上下文的详细内容..."
              rows={6}
            />
          </Form.Item>

          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="输入标签，按回车添加"
              style={{ width: '100%' }}
            >
              {allTags.map(tag => (
                <Option key={tag} value={tag}>{tag}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
};

export default HistoryContextSelector;