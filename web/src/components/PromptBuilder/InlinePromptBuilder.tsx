import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Card,
  Row,
  Col,
  Typography,
  Space,
  Button,
  Select,
  List,
  Tag,
  Divider,
  Alert,
  Spin,
  Input,
  Form,
  message,
  Tooltip,
  Switch,
  Collapse
} from 'antd';
import './InlinePromptBuilder.css';
import {
  PlusOutlined,
  DeleteOutlined,
  DragOutlined,
  EyeOutlined,
  CloseOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DownOutlined,
  UpOutlined
} from '@ant-design/icons';
import { DragDropProvider, SortableItem } from '../drag-drop';
import { useDragDrop } from '../../hooks/useDragDrop';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { businessService, Prompt, PromptCombination } from '@/services/businessService';
import CombinationPreview from './CombinationPreview';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface InlinePromptBuilderProps {
  visible: boolean;
  businessType: string;
  businessTypeName: string;
  stage: 'test_point' | 'test_case';
  projectId: number;
  existingCombinationId?: number;
  tempCombinationData?: {
    name: string;
    description?: string;
    items: Array<{
      prompt_id: number;
      order: number;
      variable_name?: string;
      is_required: boolean;
      prompt_name?: string;
      prompt_type?: string;
      prompt_content?: string;
    }>;
  };
  onSuccess: (combinationData: {
    name: string;
    description?: string;
    items: Array<{
      prompt_id: number;
      order: number;
      variable_name?: string;
      is_required: boolean;
    }>;
  }) => void;
  onCancel: () => void;
}

interface DraggablePromptItemProps {
  item: {
    id: string;
    prompt_id: number;
    prompt_name: string;
    prompt_type: string;
    prompt_content: string;
    order: number;
  };
  index: number;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  removeItem: (id: string) => void;
}

// 状态管理用于展开/收起
const useExpandedState = () => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return { expandedItems, toggleExpanded };
};

// 拖拽组件
const DraggablePromptItem: React.FC<DraggablePromptItemProps> = ({
  item,
  index,
  moveItem,
  removeItem
}) => {
  const { expandedItems, toggleExpanded } = useExpandedState();
  const isExpanded = expandedItems.has(item.id);

  const isLongContent = (item.prompt_content || '').length > 150;

  const getPromptTypeColor = (type: string) => {
    switch (type) {
      case 'system': return 'blue';
      case 'business_description': return 'green';
      case 'shared_content': return 'orange';
      default: return 'default';
    }
  };

  const getPromptTypeLabel = (type: string) => {
    switch (type) {
      case 'system': return '系统提示词';
      case 'business_description': return '业务描述';
      case 'shared_content': return '共享内容';
      default: return type;
    }
  };

  return (
    <SortableItem
      id={item.id}
      style={{
        marginBottom: '6px',
        cursor: 'move'
      }}
    >
      <Card
        size="small"
        bodyStyle={{
          padding: '10px',
          transition: 'all 0.2s ease'
        }}
        className="prompt-item-card"
        actions={[
          <Tooltip title="删除">
            <DeleteOutlined
              key="delete"
              onClick={() => removeItem(item.id)}
              style={{ color: '#ff4d4f' }}
            />
          </Tooltip>,
          ...(isLongContent ? [
            <Tooltip title={isExpanded ? "收起内容" : "展开内容"}>
              <Button
                key="expand"
                type="text"
                size="small"
                icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                onClick={() => toggleExpanded(item.id)}
                style={{ color: '#1890ff' }}
              />
            </Tooltip>
          ] : [])
        ]}
        style={{
          marginBottom: '6px',
          border: '1px solid #f0f0f0',
          borderRadius: '6px',
          transition: 'all 0.2s ease',
          cursor: 'move'
        }}
        hoverable
      >
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <DragOutlined
            style={{
              marginRight: '8px',
              color: '#999',
              marginTop: '2px',
              fontSize: '12px'
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '6px',
              flexWrap: 'wrap',
              gap: '4px'
            }}>
              <Text
                strong
                style={{
                  fontSize: '13px',
                  color: '#262626'
                }}
              >
                {item.prompt_name}
              </Text>
              <Tag
                color={getPromptTypeColor(item.prompt_type)}
                style={{
                  fontSize: '11px',
                  lineHeight: '16px',
                  padding: '0 4px',
                  height: '18px'
                }}
              >
                {getPromptTypeLabel(item.prompt_type)}
              </Tag>
              <Text
                type="secondary"
                style={{
                  fontSize: '11px',
                  color: '#8c8c8c'
                }}
              >
                #{item.order}
              </Text>
            </div>
            <div
              className={`prompt-content ${isExpanded ? 'expanded' : ''}`}
              style={{
                maxHeight: isExpanded ? 'none' : '54px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '12px',
                color: '#595959',
                lineHeight: '1.45',
                transition: 'max-height 0.3s ease',
                wordBreak: 'break-word'
              }}
            >
              {isExpanded ? (item.prompt_content || '暂无内容') : (
                <>
                  {(item.prompt_content || '暂无内容').substring(0, 150)}
                  {(item.prompt_content || '').length > 150 && '...'}
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    </SortableItem>
  );
};

const InlinePromptBuilder: React.FC<InlinePromptBuilderProps> = ({
  visible,
  businessType,
  businessTypeName,
  stage,
  projectId,
  existingCombinationId,
  tempCombinationData,
  onSuccess,
  onCancel
}) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const getItemId = useCallback((item: any) => item.id, []);

  // 状态管理
  const [selectedItems, setSelectedItems] = useState<Array<{
    id: string;
    prompt_id: number;
    prompt_name: string;
    prompt_type: string;
    prompt_content: string;
    order: number;
  }>>([]);

  const [showPreview, setShowPreview] = useState(false);
  const [combinationName, setCombinationName] = useState('');
  const [combinationDescription, setCombinationDescription] = useState('');

  const {
    items,
    setItems,
    handleDragEnd
  } = useDragDrop(selectedItems, getItemId);

  // 获取可用提示词
  const { data: availablePrompts, isLoading: promptsLoading } = useQuery({
    queryKey: ['availablePrompts', businessType],
    queryFn: () => businessService.getAvailablePrompts(),
    staleTime: 5 * 60 * 1000,
    enabled: visible
  });

  // 获取现有组合数据（编辑模式）
  const { data: existingCombination, isLoading: existingLoading } = useQuery({
    queryKey: ['promptCombination', existingCombinationId],
    queryFn: () => businessService.getPromptCombination(existingCombinationId!),
    staleTime: 5 * 60 * 1000,
    enabled: visible && !!existingCombinationId && !tempCombinationData // 如果有临时数据，不请求API
  });

  // 初始化表单和组合名称
  useEffect(() => {
    if (visible) {
      // 优先使用临时数据，否则使用API数据
      const sourceData = tempCombinationData || existingCombination;

      if (sourceData && (tempCombinationData || existingCombinationId)) {
        // 编辑模式：加载组合数据
        setCombinationName(sourceData.name || '');
        setCombinationDescription(sourceData.description || '');

        // 转换组合项目为选中项格式
        if (sourceData.items) {
          const transformedItems = sourceData.items.map(item => ({
            id: `${item.prompt_id}-${item.order}`,
            prompt_id: item.prompt_id,
            prompt_name: item.prompt_name || `提示词 ${item.prompt_id}`,
            prompt_type: item.prompt_type || '',
            prompt_content: item.prompt_content || '',
            order: item.order
          }));
          setSelectedItems(transformedItems);
          setItems(transformedItems);
        }
      } else {
        // 创建模式：使用默认值
        const defaultName = `${businessTypeName} - ${stage === 'test_point' ? '测试点' : '测试用例'}生成组合`;
        setCombinationName(defaultName);
        setCombinationDescription(`为${businessTypeName}业务类型生成的${stage === 'test_point' ? '测试点' : '测试用例'}专用提示词组合`);
        const emptyItems = [];
        setSelectedItems(emptyItems);
        setItems(emptyItems);
      }
    }
  }, [visible, businessTypeName, stage, existingCombination, existingCombinationId, tempCombinationData, setItems]);

  // 自动生成组合名称
  const generateCombinationName = () => {
    const defaultName = `${businessTypeName} - ${stage === 'test_point' ? '测试点' : '测试用例'}生成组合`;
    setCombinationName(defaultName);
  };

  // 添加提示词到组合
  const addPromptToCombination = useCallback((prompt: Prompt) => {
    // 检查是否已经添加
    if (items.some(item => item.prompt_id === prompt.id)) {
      message.warning('该提示词已经在组合中');
      return;
    }

    const newItem = {
      id: `temp-${Date.now()}`,
      prompt_id: prompt.id,
      prompt_name: prompt.name,
      prompt_type: prompt.type,
      prompt_content: prompt.content,
      order: items.length + 1
    };

    const newItems = [...items, newItem];
    setSelectedItems(newItems);
    setItems(newItems);
  }, [items, setSelectedItems, setItems]);

  // 从组合中移除提示词
  const removePromptFromCombination = useCallback((itemId: string) => {
    const newItems = items
      .filter(item => item.id !== itemId)
      .map((item, index) => ({ ...item, order: index + 1 }));
    setSelectedItems(newItems);
    setItems(newItems);
  }, [items, setSelectedItems, setItems]);

  // 拖拽排序处理
  const handleDragEndWithOrderUpdate = useCallback((event: any) => {
    handleDragEnd(event);

    // 如果拖拽改变了顺序，重新计算order
    if (event.items) {
      const reorderedItems = event.items.map((id: string, index: number) => {
        const item = items.find(item => item.id === id);
        return item ? { ...item, order: index + 1 } : null;
      }).filter(Boolean) as Array<{
        id: string;
        prompt_id: number;
        prompt_name: string;
        prompt_type: string;
        prompt_content: string;
        order: number;
      }>;

      setItems(reorderedItems);
      setSelectedItems(reorderedItems);
    }
  }, [handleDragEnd, items, setItems, setSelectedItems]);

  // 确认组合配置
  const handleConfirm = useCallback(() => {
    if (items.length === 0) {
      message.error('请至少选择一个提示词');
      return;
    }

    if (!combinationName.trim()) {
      message.error('请输入组合名称');
      return;
    }

    // 验证组合是否包含系统提示词
    const hasSystemPrompt = items.some(item => item.prompt_type === 'system');
    const hasBusinessDescription = items.some(item => item.prompt_type === 'business_description');

    if (!hasSystemPrompt) {
      message.warning('建议添加系统提示词以确保生成质量');
    }

    if (!hasBusinessDescription && stage === 'test_point') {
      message.warning('测试点生成建议添加业务描述');
    }

    // 准备组合数据，传递给父组件进行统一保存
    const combinationData = {
      name: combinationName.trim(),
      description: combinationDescription.trim() || undefined,
      items: items.map(item => ({
        prompt_id: item.prompt_id,
        order: item.order,
        variable_name: undefined,
        is_required: true
      }))
    };

    onSuccess(combinationData);
  }, [items, combinationName, combinationDescription, stage, onSuccess]);

  // 预览组合
  const handlePreview = useCallback(() => {
    if (items.length === 0) {
      message.warning('请先添加提示词');
      return;
    }
    setShowPreview(true);
  }, [items]);

  // 获取提示词类型颜色
  const getPromptTypeColor = (type: string) => {
    switch (type) {
      case 'system': return 'blue';
      case 'business_description': return 'green';
      case 'shared_content': return 'orange';
      default: return 'default';
    }
  };

  // 获取推荐的提示词
  const getRecommendedPrompts = () => {
    if (!availablePrompts?.prompts) return [];

    if (stage === 'test_point') {
      // 测试点生成推荐：系统提示词 + 业务描述 + 共享内容
      return availablePrompts.prompts.filter(prompt =>
        prompt.type === 'system' ||
        (prompt.type === 'business_description' && prompt.business_type === businessType) ||
        prompt.type === 'shared_content'
      );
    } else {
      // 测试用例生成推荐：系统提示词 + 业务描述 + 共享内容
      return availablePrompts.prompts.filter(prompt =>
        prompt.type === 'system' ||
        (prompt.type === 'business_description' && prompt.business_type === businessType) ||
        prompt.type === 'shared_content'
      );
    }
  };

  const recommendedPrompts = getRecommendedPrompts();

  if (!visible) return null;

  return (
    <DragDropProvider
      items={items.map(item => item.id)}
      onDragEnd={handleDragEndWithOrderUpdate}
    >
      <Modal
        title={
          <Space>
            <PlusOutlined />
            创建{stage === 'test_point' ? '测试点' : '测试用例'}提示词组合
            <Tag color="blue">{businessTypeName}</Tag>
          </Space>
        }
        open={visible}
        onCancel={onCancel}
        width={1200}
        footer={[
          <Button key="cancel" icon={<CloseOutlined />} onClick={onCancel}>
            取消
          </Button>,
          <Button
            key="preview"
            icon={<EyeOutlined />}
            onClick={handlePreview}
            disabled={items.length === 0}
          >
            预览组合
          </Button>,
          <Button
            key="confirm"
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleConfirm}
            disabled={items.length === 0}
          >
            确认配置
          </Button>
        ]}
      >
        <Row gutter={16}>
          {/* 左侧：选择区域 */}
          <Col span={12}>
            <Card
              title="选择提示词"
              extra={
                <Space>
                  <Button size="small" icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['availablePrompts'] })}>
                    刷新
                  </Button>
                </Space>
              }
              style={{ height: '600px' }}
            >
              {/* 内容容器 */}
              <div
                style={{
                  height: '540px', // Card高度减去header的约60px
                  overflow: 'auto',
                  padding: '8px'
                }}
                className="prompt-select-container"
              >
              {promptsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: '16px' }}>加载提示词...</div>
                </div>
              ) : (
                <div>
                  {/* 推荐提示词 */}
                  {recommendedPrompts.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <Title level={5}>
                        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                        推荐提示词
                      </Title>
                      <List
                        size="small"
                        dataSource={recommendedPrompts}
                        renderItem={(prompt) => (
                          <List.Item
                            actions={[
                              <Button
                                type="primary"
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => addPromptToCombination(prompt)}
                                disabled={items.some(item => item.prompt_id === prompt.id)}
                              >
                                {items.some(item => item.prompt_id === prompt.id) ? '已添加' : '添加'}
                              </Button>
                            ]}
                          >
                            <List.Item.Meta
                              title={
                                <Space>
                                  <Text strong>{prompt.name}</Text>
                                  <Tag color={getPromptTypeColor(prompt.type)}>{prompt.type === 'system' ? '系统' : prompt.type === 'business_description' ? '业务' : '共享'}</Tag>
                                </Space>
                              }
                              description={
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                  {prompt.content.substring(0, 100)}
                                  {prompt.content.length > 100 && '...'}
                                </div>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    </div>
                  )}

                  <Divider />

                  {/* 所有提示词 */}
                  <div>
                    <Title level={5}>所有可用提示词</Title>
                    <List
                      size="small"
                      dataSource={availablePrompts?.prompts || []}
                      renderItem={(prompt) => (
                        <List.Item
                          actions={[
                            <Button
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={() => addPromptToCombination(prompt)}
                              disabled={items.some(item => item.prompt_id === prompt.id)}
                            >
                              {items.some(item => item.prompt_id === prompt.id) ? '已添加' : '添加'}
                            </Button>
                          ]}
                        >
                          <List.Item.Meta
                            title={
                              <Space>
                                <Text>{prompt.name}</Text>
                                <Tag>{prompt.type}</Tag>
                                {prompt.business_type && <Tag color="green">{prompt.business_type}</Tag>}
                              </Space>
                            }
                            description={prompt.description}
                          />
                        </List.Item>
                      )}
                    />
                  </div>
                </div>
              )}
              </div>
            </Card>
          </Col>

          {/* 右侧：组合区域 */}
          <Col span={12}>
            <Card
              title="组合中的提示词"
              style={{ height: '600px' }}
            >
              {/* 组合信息 */}
              <div style={{ marginBottom: '12px' }}>
                <Form layout="vertical" form={form}>
                  <Form.Item label="组合名称" required>
                    <Input
                      value={combinationName}
                      onChange={(e) => setCombinationName(e.target.value)}
                      placeholder="请输入组合名称"
                    />
                  </Form.Item>
                  <Form.Item label="组合描述">
                    <TextArea
                      value={combinationDescription}
                      onChange={(e) => setCombinationDescription(e.target.value)}
                      placeholder="请输入组合描述（可选）"
                      rows={2}
                    />
                  </Form.Item>
                </Form>
              </div>

              <Divider style={{ margin: '12px 0' }} />

              {/* 已选择的提示词 */}
              <div
                className="prompt-item-container"
                style={{
                  height: '320px', // 固定高度，确保滚动条出现
                  overflow: 'auto',
                  border: '1px solid #f0f0f0',
                  borderRadius: '6px',
                  padding: '8px'
                }}
              >
                {items.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '32px 20px',
                    color: '#8c8c8c',
                    border: '2px dashed #e8e8e8',
                    borderRadius: '8px',
                    background: '#fafafa'
                  }}>
                    <PlusOutlined
                      style={{
                        fontSize: '28px',
                        marginBottom: '12px',
                        color: '#bfbfbf'
                      }}
                    />
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        marginBottom: '6px',
                        color: '#595959'
                      }}
                    >
                      尚未添加提示词
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#8c8c8c',
                        lineHeight: '1.4'
                      }}
                    >
                      从左侧选择提示词添加到组合中
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{
                      marginBottom: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      position: 'sticky',
                      top: 0,
                      background: '#fff',
                      zIndex: 1,
                      padding: '12px 8px 8px 8px',
                      borderBottom: '1px solid #f0f0f0',
                      margin: '0 -4px 16px -4px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <div style={{
                          background: '#1890ff',
                          color: 'white',
                          borderRadius: '10px',
                          padding: '2px 8px',
                          fontSize: '12px',
                          fontWeight: 500,
                          minWidth: '20px',
                          textAlign: 'center'
                        }}>
                          {items.length}
                        </div>
                        <Text
                          strong
                          style={{
                            fontSize: '14px',
                            color: '#262626'
                          }}
                        >
                          已选择提示词
                        </Text>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <DragOutlined
                          style={{
                            fontSize: '12px',
                            color: '#8c8c8c'
                          }}
                        />
                        <Text
                          type="secondary"
                          style={{
                            fontSize: '11px',
                            color: '#8c8c8c'
                          }}
                        >
                          拖拽调整顺序
                        </Text>
                      </div>
                    </div>

                    {items.map((item, index) => (
                      <DraggablePromptItem
                        key={item.id}
                        item={item}
                        index={index}
                        moveItem={() => {}} // 不再需要，@dnd-kit 处理
                        removeItem={removePromptFromCombination}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </Modal>

        {/* 预览模态框 */}
        <Modal
          title="组合预览"
          open={showPreview}
          onCancel={() => setShowPreview(false)}
          width={1000}
          footer={[
            <Button key="close" onClick={() => setShowPreview(false)}>
              关闭
            </Button>
          ]}
        >
          <CombinationPreview
            items={items.map(item => ({
              id: parseInt(item.id) || item.prompt_id,
              combination_id: 0,
              prompt_id: item.prompt_id,
              order: item.order,
              variable_name: undefined,
              is_required: true,
              created_at: new Date().toISOString(),
              prompt_name: item.prompt_name,
              prompt_type: item.prompt_type,
              prompt_content: item.prompt_content
            }))}
            businessType={businessType}
            businessTypeName={businessTypeName}
            stage={stage}
            visible={showPreview}
            onClose={() => setShowPreview(false)}
          />
        </Modal>
    </DragDropProvider>
  );
};

export default InlinePromptBuilder;