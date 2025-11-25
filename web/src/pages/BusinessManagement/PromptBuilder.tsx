import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Steps,
  List,
  Select,
  Form,
  Input,
  Tag,
  Divider,
  Alert,
  message,
  Spin,
  Empty,
  Tooltip,
  Collapse,
  Modal,
  Badge,
  Result,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  SaveOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { businessService, PromptCombination, PromptCombinationItem } from '../../services/businessService';
import { useProject } from '../../contexts/ProjectContext';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { Option } = Select;
const { TextArea } = Input;
const { Panel } = Collapse;

// 获取提示词类型的标签
const getPromptTypeLabel = (type: string): string => {
  const typeLabels: Record<string, string> = {
    'system': '系统提示词',
    'template': '模板',
    'business_description': '业务描述',
    'shared_content': '共享内容',
    'requirements': '需求说明',
  };
  return typeLabels[type] || type;
};

interface PromptBuilderProps {
  businessType?: string;
  combinationId?: number;
  onSave?: (combination: PromptCombination) => void;
  onCancel?: () => void;
}

const PromptBuilder: React.FC<PromptBuilderProps> = ({
  businessType,
  combinationId,
  onSave,
  onCancel
}) => {
  // Extract URL parameters and query parameters
  const { id: urlId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const urlBusinessType = searchParams.get('business_type');

  // Combine URL parameters with props, with URL params taking precedence
  const finalCombinationId = urlId ? parseInt(urlId) : combinationId;
  const finalBusinessType = urlBusinessType || businessType;
  const isEditMode = !!finalCombinationId;

  const queryClient = useQueryClient();
  const { currentProject } = useProject();
  const [editForm] = Form.useForm();
  // createForm暂时移除以避免连接警告
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPromptIds, setSelectedPromptIds] = useState<number[]>([]);
  const [combinationName, setCombinationName] = useState('');
  const [combinationDescription, setCombinationDescription] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);

  // 获取可用的提示词列表
  const { data: promptsData, isLoading: promptsLoading } = useQuery({
    queryKey: ['prompts', 'available'],
    queryFn: () => businessService.getAvailablePrompts(),
    staleTime: 5 * 60 * 1000,
  });

  // 如果传入了组合ID，获取现有组合数据
  const { data: existingCombination, isLoading: combinationLoading } = useQuery({
    queryKey: ['promptCombination', finalCombinationId],
    queryFn: () => businessService.getPromptCombination(finalCombinationId!),
    enabled: !!finalCombinationId,
    staleTime: 5 * 60 * 1000,
  });

  // 保存提示词组合
  const saveMutation = useMutation({
    mutationFn: finalCombinationId
      ? (data: any) => businessService.updatePromptCombination(finalCombinationId, data)
      : businessService.createPromptCombination,
    onSuccess: (data) => {
      message.success('提示词组合保存成功');
      queryClient.invalidateQueries({ queryKey: ['promptCombinations'] });
      queryClient.invalidateQueries({ queryKey: ['promptCombination', finalCombinationId] });
      if (onSave) {
        onSave(data);
      }
    },
    onError: (error: any) => {
      message.error(error.message || '保存提示词组合失败');
    },
  });

  // 获取提示词预览
  const previewMutation = useMutation({
    mutationFn: businessService.previewPromptCombination,
    onSuccess: (data) => {
      setPreviewData(data);
      setIsPreviewModalVisible(true);
    },
    onError: (error: any) => {
      message.error(error.message || '预览生成失败');
    },
  });

  // 初始化表单数据
  useEffect(() => {
    if (existingCombination) {
      setCombinationName(existingCombination.name);
      setCombinationDescription(existingCombination.description || '');

      // 确保正确提取prompt_id
      const promptIds = existingCombination.items?.map(item => item.prompt_id) || [];
      setSelectedPromptIds(promptIds);

      editForm.setFieldsValue({
        name: existingCombination.name,
        description: existingCombination.description,
      });
    }
  }, [existingCombination, editForm]);

  // 根据业务类型过滤提示词
  const getFilteredPrompts = () => {
    if (!promptsData?.prompts) return [];

    if (!finalBusinessType) return promptsData.prompts;

    return promptsData.prompts.filter(prompt =>
      !prompt.business_type || prompt.business_type === finalBusinessType
    );
  };

  // 按类型分组提示词
  const getPromptsByType = () => {
    const filteredPrompts = getFilteredPrompts();
    const grouped: Record<string, any[]> = {};

    filteredPrompts.forEach(prompt => {
      if (!grouped[prompt.type]) {
        grouped[prompt.type] = [];
      }
      grouped[prompt.type].push(prompt);
    });

    return grouped;
  };

  const handleAddPrompt = (promptId: number) => {
    if (!selectedPromptIds.includes(promptId)) {
      setSelectedPromptIds([...selectedPromptIds, promptId]);
    }
  };

  const handleRemovePrompt = (promptId: number) => {
    setSelectedPromptIds(selectedPromptIds.filter(id => id !== promptId));
  };

  const handlePreview = () => {
    if (selectedPromptIds.length === 0) {
      message.warning('请先选择提示词');
      return;
    }

    // 将提示词ID列表转换为后端期望的组合项目格式
    const items = selectedPromptIds.map((promptId, index) => ({
      prompt_id: promptId,
      order: index * 10,  // 按顺序分配，每个间隔10
      is_required: true,
    }));

    previewMutation.mutate({
      items,
      variables: {},
    });
  };

  const handleSave = () => {
    if (!combinationName.trim()) {
      message.error('请输入组合名称');
      return;
    }

    if (selectedPromptIds.length === 0) {
      message.error('请至少选择一个提示词');
      return;
    }

    const saveData = {
      name: combinationName.trim(),
      description: combinationDescription.trim(),
      business_type: finalBusinessType,
      project_id: currentProject?.id,
      prompt_ids: selectedPromptIds,
    };

    saveMutation.mutate(saveData);
  };

  // 综合加载状态
  const isLoading = promptsLoading || combinationLoading;

  // 如果数据正在加载，显示加载状态
  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">正在加载数据...</Text>
        </div>
      </div>
    );
  }

  // 如果是编辑模式但没有获取到组合数据，显示错误状态
  if (isEditMode && !existingCombination) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <Result
          status="error"
          title="加载失败"
          subTitle="无法加载提示词组合数据，请刷新页面重试"
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          }
        />
      </div>
    );
  }

  // 如果提示词数据加载失败，显示错误状态
  if (!promptsData) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <Result
          status="warning"
          title="提示词数据加载失败"
          subTitle="无法获取可用的提示词列表，请检查网络连接或联系管理员"
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          }
        />
      </div>
    );
  }

  const promptsByType = getPromptsByType();
  const selectedPrompts = selectedPromptIds.map(id =>
    (promptsData?.prompts || []).find(p => p.id === id)
  ).filter(Boolean);

  const steps = [
    {
      title: '基本信息',
      description: '设置组合名称和描述',
    },
    {
      title: '选择提示词',
      description: '选择要组合的提示词',
    },
    {
      title: '预览确认',
      description: '预览效果并保存',
    },
  ];

  if (promptsLoading || combinationLoading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>加载提示词数据...</div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            {finalBusinessType && (
              <Tag color="blue" style={{ marginRight: 12 }}>
                {finalBusinessType}
              </Tag>
            )}
            {currentProject && (
              <Text type="secondary" style={{ fontSize: 14 }}>
                当前项目: {currentProject.name}
              </Text>
            )}
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
                重置
              </Button>
              {onCancel && (
                <Button onClick={onCancel}>
                  取消
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Only show Steps in create mode */}
      {!isEditMode && (
        <Card style={{ marginTop: 16 }}>
          <Steps current={currentStep} items={steps} />
        </Card>
      )}

      {/* Edit Mode - Direct editing interface */}
      {isEditMode && (
        <Card style={{ marginTop: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form
                form={editForm}
                layout="vertical"
                initialValues={{
                  name: combinationName,
                  description: combinationDescription,
                }}
              >
                <Form.Item
                  label="组合名称"
                  name="name"
                  rules={[{ required: true, message: '请输入组合名称' }]}
                >
                  <Input
                    placeholder="例如：RCC业务标准提示词组合"
                    value={combinationName}
                    onChange={(e) => setCombinationName(e.target.value)}
                  />
                </Form.Item>

                <Form.Item
                  label="组合描述"
                  name="description"
                >
                  <TextArea
                    placeholder="描述这个提示词组合的用途和特点..."
                    rows={3}
                    value={combinationDescription}
                    onChange={(e) => setCombinationDescription(e.target.value)}
                  />
                </Form.Item>
              </Form>
            </Col>

            <Col span={12}>
              <Card size="small" title="组合信息">
                <div style={{ marginBottom: 16 }}>
                  <Text strong>业务类型：</Text>
                  <Tag color="blue">{finalBusinessType || '通用'}</Tag>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>项目：</Text>
                  <Text>{currentProject?.name || '全局'}</Text>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>已选择提示词：</Text>
                  <Tag color="green">{selectedPrompts.length} 个</Tag>
                </div>
                <div>
                  <Text strong>状态：</Text>
                  <Tag color="green">已配置</Tag>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={16}>
              <Card size="small" title="已选择的提示词" style={{ height: 400, overflow: 'auto' }}>
                {selectedPrompts.length > 0 ? (
                  <List
                    size="small"
                    dataSource={selectedPrompts}
                    renderItem={(prompt, index) => (
                      <List.Item
                        actions={[
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemovePrompt(prompt?.id)}
                          />
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<Badge count={index + 1} />}
                          title={
                            <Space>
                              <span>{prompt?.name || '未知提示词'}</span>
                              <Tag size="small">{getPromptTypeLabel(prompt?.type)}</Tag>
                            </Space>
                          }
                          description={
                            <Text type="secondary" ellipsis={{ tooltip: prompt.description }}>
                              {prompt.description || '无描述'}
                            </Text>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="还没有选择提示词" />
                )}
              </Card>
            </Col>

            <Col span={8}>
              <Card size="small" title="可选提示词" style={{ height: 400, overflow: 'auto' }}>
                {Object.keys(promptsByType).length > 0 ? (
                  <Collapse accordion>
                    {Object.entries(promptsByType).map(([type, prompts]) => (
                      <Panel
                        header={
                          <Space>
                            <Badge count={prompts.length} showZero>
                              <Text strong>{getPromptTypeLabel(type)}</Text>
                            </Badge>
                          </Space>
                        }
                        key={type}
                      >
                        <List
                          size="small"
                          dataSource={prompts}
                          renderItem={(prompt) => (
                            <List.Item
                              actions={[
                                <Button
                                  type={selectedPromptIds.includes(prompt.id) ? 'primary' : 'default'}
                                  size="small"
                                  icon={selectedPromptIds.includes(prompt.id) ? <CheckCircleOutlined /> : <PlusOutlined />}
                                  onClick={() => handleAddPrompt(prompt.id)}
                                  disabled={selectedPromptIds.includes(prompt.id)}
                                >
                                  {selectedPromptIds.includes(prompt.id) ? '已选择' : '选择'}
                                </Button>
                              ]}
                            >
                              <List.Item.Meta
                                title={
                                  <Space>
                                    <span>{prompt.name}</span>
                                    {prompt.business_type && (
                                      <Tag size="small">{prompt.business_type}</Tag>
                                    )}
                                  </Space>
                                }
                                description={
                                  <Text type="secondary" ellipsis={{ tooltip: prompt.description }}>
                                    {prompt.description || '无描述'}
                                  </Text>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      </Panel>
                    ))}
                  </Collapse>
                ) : (
                  <Empty description="没有可用的提示词" />
                )}
              </Card>
            </Col>
          </Row>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Space size="large">
              <Button onClick={handlePreview} loading={previewMutation.isPending}>
                预览组合效果
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saveMutation.isPending}
              >
                保存修改
              </Button>
              {onCancel && (
                <Button onClick={onCancel}>
                  取消
                </Button>
              )}
            </Space>
          </div>
        </Card>
      )}

      {/* Create Mode - Step-by-step wizard */}
      {!isEditMode && currentStep === 0 && (
        <Card title="基本信息" style={{ marginTop: 16 }}>
          <Form
            form={editForm} // Using editForm for now to fix connection warning
            layout="vertical"
            initialValues={{
              name: combinationName,
              description: combinationDescription,
            }}
          >
            <Form.Item
              label="组合名称"
              name="name"
              rules={[{ required: true, message: '请输入组合名称' }]}
            >
              <Input
                placeholder="例如：RCC业务标准提示词组合"
                value={combinationName}
                onChange={(e) => setCombinationName(e.target.value)}
              />
            </Form.Item>

            <Form.Item
              label="组合描述"
              name="description"
            >
              <TextArea
                placeholder="描述这个提示词组合的用途和特点..."
                rows={3}
                value={combinationDescription}
                onChange={(e) => setCombinationDescription(e.target.value)}
              />
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Button type="primary" onClick={() => setCurrentStep(1)}>
              下一步
            </Button>
          </div>
        </Card>
      )}

      {currentStep === 1 && (
        <Card title="选择提示词" style={{ marginTop: 16 }}>
          <Alert
            message="提示词选择"
            description="选择要组合的提示词。提示词将按照选择的顺序进行组合。建议按照：系统提示词 -> 业务描述 -> 具体要求的顺序选择。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Row gutter={[16, 16]}>
            <Col span={16}>
              <Card size="small" title="可选提示词" style={{ height: 500, overflow: 'auto' }}>
                {Object.keys(promptsByType).length > 0 ? (
                  <Collapse accordion>
                    {Object.entries(promptsByType).map(([type, prompts]) => (
                      <Panel
                        header={
                          <Space>
                            <Badge count={prompts.length} showZero>
                              <Text strong>{getPromptTypeLabel(type)}</Text>
                            </Badge>
                          </Space>
                        }
                        key={type}
                      >
                        <List
                          size="small"
                          dataSource={prompts}
                          renderItem={(prompt) => (
                            <List.Item
                              actions={[
                                <Button
                                  type={selectedPromptIds.includes(prompt.id) ? 'primary' : 'default'}
                                  size="small"
                                  icon={selectedPromptIds.includes(prompt.id) ? <CheckCircleOutlined /> : <PlusOutlined />}
                                  onClick={() => handleAddPrompt(prompt.id)}
                                  disabled={selectedPromptIds.includes(prompt.id)}
                                >
                                  {selectedPromptIds.includes(prompt.id) ? '已选择' : '选择'}
                                </Button>
                              ]}
                            >
                              <List.Item.Meta
                                title={
                                  <Space>
                                    <span>{prompt.name}</span>
                                    {prompt.business_type && (
                                      <Tag size="small">{prompt.business_type}</Tag>
                                    )}
                                  </Space>
                                }
                                description={
                                  <Text type="secondary" ellipsis={{ tooltip: prompt.description }}>
                                    {prompt.description || '无描述'}
                                  </Text>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      </Panel>
                    ))}
                  </Collapse>
                ) : (
                  <Empty description="没有可用的提示词" />
                )}
              </Card>
            </Col>

            <Col span={8}>
              <Card size="small" title="已选择的提示词" style={{ height: 500, overflow: 'auto' }}>
                {selectedPrompts.length > 0 ? (
                  <List
                    size="small"
                    dataSource={selectedPrompts}
                    renderItem={(prompt, index) => (
                      <List.Item
                        actions={[
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemovePrompt(prompt?.id)}
                          />
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<Badge count={index + 1} />}
                          title={
                            <Space>
                              <span>{prompt?.name || '未知提示词'}</span>
                              <Tag size="small">{getPromptTypeLabel(prompt?.type)}</Tag>
                            </Space>
                          }
                          description={
                            <Text type="secondary" ellipsis={{ tooltip: prompt.description }}>
                              {prompt.description || '无描述'}
                            </Text>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="还没有选择提示词" />
                )}
              </Card>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setCurrentStep(0)}>
                上一步
              </Button>
              <Button onClick={handlePreview} loading={previewMutation.isPending}>
                预览效果
              </Button>
              <Button type="primary" onClick={() => setCurrentStep(2)}>
                下一步
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {currentStep === 2 && (
        <Card title="预览确认" style={{ marginTop: 16 }}>
          <Alert
            message="确认提示词组合"
            description="请确认提示词组合的信息和选择。可以在保存前预览最终的组合效果。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card size="small" title="组合信息">
                <div style={{ marginBottom: 16 }}>
                  <Text strong>名称：</Text>
                  <Text>{combinationName || '未设置'}</Text>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>业务类型：</Text>
                  <Tag color="blue">{finalBusinessType || '通用'}</Tag>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>项目：</Text>
                  <Text>{currentProject?.name || '全局'}</Text>
                </div>
                <div>
                  <Text strong>描述：</Text>
                  <Paragraph>{combinationDescription || '无描述'}</Paragraph>
                </div>
              </Card>
            </Col>

            <Col span={12}>
              <Card size="small" title={`已选择 ${selectedPrompts.length} 个提示词`}>
                <List
                  size="small"
                  dataSource={selectedPrompts}
                  renderItem={(prompt, index) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Badge count={index + 1} />}
                        title={
                          <Space>
                            <span>{prompt.name}</span>
                            <Tag size="small">{getPromptTypeLabel(prompt.type)}</Tag>
                          </Space>
                        }
                        description={
                          <Text type="secondary" ellipsis={{ tooltip: prompt?.description }}>
                            {prompt?.description || '无描述'}
                          </Text>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Space size="large">
              <Button onClick={() => setCurrentStep(1)}>
                上一步
              </Button>
              <Button
                icon={<EyeOutlined />}
                onClick={handlePreview}
                loading={previewMutation.isPending}
              >
                预览组合效果
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saveMutation.isPending}
              >
                保存组合
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {/* 预览模态框 */}
      <Modal
        title="提示词组合预览"
        open={isPreviewModalVisible}
        onCancel={() => setIsPreviewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsPreviewModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {previewData && (
          <div>
            <Alert
              message="预览结果"
              description={previewData.message}
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />

            {previewData.combined_prompt && (
              <Card size="small" title="组合后的提示词">
                <div style={{
                  background: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '6px',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  maxHeight: '300px',
                  overflow: 'auto'
                }}>
                  {previewData.combined_prompt}
                </div>
              </Card>
            )}

            {previewData.variables && previewData.variables.length > 0 && (
              <Card size="small" title="检测到的变量" style={{ marginTop: 16 }}>
                <Space wrap>
                  {previewData.variables.map((variable: string) => (
                    <Tag key={variable} color="blue">
                      {variable}
                    </Tag>
                  ))}
                </Space>
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PromptBuilder;