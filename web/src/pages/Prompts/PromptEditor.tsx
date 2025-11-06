/**
 * Prompt Editor Page - Split-view markdown editor with live preview.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Input,
  Select,
  Form,
  message,
  Space,
  Divider,
  Tag,
  Tooltip,
  Spin,
  Alert,
  Tabs,
  Badge
} from 'antd';
import {
  SaveOutlined,
  EyeOutlined,
  EditOutlined,
  LeftOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Editor, { loader } from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

import {
  PromptCreate,
  PromptUpdate,
  getPromptTypeOptions,
  getPromptStatusOptions,
  getBusinessTypeOptions
} from '../../types/prompts';
import promptService, { promptUtils } from '../../services/promptService';
import 'highlight.js/styles/github.css';

// Configure Monaco Editor to use local instance
loader.config({
  paths: {
    vs: '/node_modules/monaco-editor/min/vs'
  },
  'vs/nls': {
    availableLanguages: {
      '*': 'zh-cn'
    }
  }
});

// Pre-load Monaco Editor
loader.init().then((monaco) => {
  console.log('Monaco Editor pre-loaded successfully');

}).catch((error) => {
  console.error('Failed to pre-load Monaco Editor:', error);
  // Note: setMonacoError will be called within component scope
});

const { Option } = Select;

const PromptEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  // State
  const [content, setContent] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSave, setIsAutoSave] = useState(true);
  const [isMonacoLoading, setIsMonacoLoading] = useState(true);
  const [monacoError, setMonacoError] = useState<string | null>(null);

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

  // 判断是否为新建提示词 - 如果没有ID或ID为'create'，则为新建
  const isNew = !id || id === 'create' || id === 'null' || id === 'undefined' || id === 'NaN';

  // Fetch prompt data
  const {
    data: prompt,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['prompt', id],
    queryFn: () => promptService.prompt.getPrompt(Number(id)),
    enabled: !isNew && !!id && id !== 'undefined' && id !== 'NaN'
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: promptService.category.getCategories
  });

  // Create prompt mutation
  const createPromptMutation = useMutation({
    mutationFn: promptService.prompt.createPrompt,
    onSuccess: (data) => {
      message.success('提示词创建成功');
      setHasUnsavedChanges(false);
      navigate(`/prompts/${data.id}`);
    },
    onError: (error: any) => {
      message.error(`创建失败: ${error.response?.data?.detail || error.message}`);
    }
  });

  // Update prompt mutation
  const updatePromptMutation = useMutation({
    mutationFn: (data: { id: number; prompt: PromptUpdate }) =>
      promptService.prompt.updatePrompt(data.id, data.prompt),
    onSuccess: () => {
      message.success('提示词保存成功');
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['prompt', id] });
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    },
    onError: (error: any) => {
      message.error(`保存失败: ${error.response?.data?.detail || error.message}`);
    }
  });

  // Handle content change
  const handleContentChange = useCallback((value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    setHasUnsavedChanges(true);
  }, []);

  // Handle save
  const handleSave = useCallback((showMessage = true) => {
    console.log('PromptEditor: handleSave called', { showMessage, contentLength: content.length, isNew });

    if (!content.trim()) {
      if (showMessage) {
        message.error('内容不能为空');
      }
      return;
    }

    // 添加表单状态检查
    try {
      const formValues = form.getFieldsValue();
      console.log('PromptEditor: Current form values', formValues);
    } catch (error) {
      console.error('PromptEditor: Error getting form values', error);
      return;
    }

    form.validateFields().then((values) => {
      const promptData: PromptCreate | PromptUpdate = {
        name: values.name,
        content,
        type: values.type,
        business_type: values.business_type,
        status: values.status,
        author: values.author,
        category_id: values.category_id,
        tags: values.tags,
        variables: detectedVariables,
        extra_metadata: {
          detected_variables_count: detectedVariables.length,
          content_length: content.length,
          last_edited: new Date().toISOString()
        }
      };

      // 添加ID验证，防止NaN导致API调用失败
      const numericId = Number(id);
      if (isNaN(numericId) || !isFinite(numericId)) {
        console.error('PromptEditor: Invalid ID for update:', { id, numericId });
        if (showMessage) {
          message.error('无效的提示词ID，无法保存');
        }
        return;
      }

      if (isNew) {
        createPromptMutation.mutate(promptData as PromptCreate);
      } else {
        updatePromptMutation.mutate({
          id: numericId,
          prompt: promptData
        });
      }

      if (showMessage) {
        message.success('保存中...');
      }
    }).catch((error) => {
      console.error('PromptEditor: Form validation failed', error);
      // 检查是否是自动保存触发的错误
      if (showMessage) {
        // 只有手动保存时才显示错误消息，避免干扰用户编辑
        if (error.errorFields && error.errorFields.length > 0) {
          const firstError = error.errorFields[0];
          message.error(`表单校验失败: ${firstError.errors?.[0] || '请检查表单字段'}`);
        } else {
          message.error('表单校验失败，请检查输入内容');
        }
      }
    });
  }, [content, form, isNew, id, detectedVariables, createPromptMutation, updatePromptMutation]);

  // Handle save and continue
  const handleSaveAndContinue = useCallback(() => {
    handleSave();
    navigate('/prompts');
  }, [handleSave, navigate]);

  // 添加调试信息
  useEffect(() => {
    console.log('PromptEditor Debug:', {
      id,
      isNew,
      pathname: window.location.pathname,
      timestamp: new Date().toISOString()
    });
  }, [id, isNew]);

  // Handle Monaco Editor initialization errors
  useEffect(() => {
    const handleMonacoError = (event: ErrorEvent) => {
      if (event.filename && event.filename.includes('monaco') ||
          event.message && event.message.includes('Monaco')) {
        console.error('Monaco Editor initialization error:', event);
        setMonacoError('编辑器初始化失败，请刷新页面重试');
        setIsMonacoLoading(false);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && String(event.reason).includes('Monaco')) {
        console.error('Monaco Editor unhandled rejection:', event);
        setMonacoError('编辑器加载失败，请检查网络连接');
        setIsMonacoLoading(false);
      }
    };

    window.addEventListener('error', handleMonacoError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleMonacoError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

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

  // Update form when prompt data is loaded
  useEffect(() => {
    if (prompt && !isMonacoLoading) {
      console.log('PromptEditor: Updating form with prompt data');
      setContent(prompt.content);

      // 延迟一点设置表单值，确保组件完全初始化
      setTimeout(() => {
        try {
          form.setFieldsValue({
            name: prompt.name,
            type: prompt.type,
            business_type: prompt.business_type,
            status: prompt.status,
            author: prompt.author,
            category_id: prompt.category_id,
            tags: prompt.tags || []
          });
          console.log('PromptEditor: Form updated successfully');
        } catch (error) {
          console.error('PromptEditor: Error updating form', error);
        }
      }, 100);
    }
  }, [prompt, form, isMonacoLoading]);

  // Auto-save effect
  useEffect(() => {
    // 添加ID验证，防止自动保存时使用无效ID
    const numericId = Number(id);
    const hasValidId = !isNaN(numericId) && isFinite(numericId);

    if (hasUnsavedChanges && isAutoSave && !isNew && hasValidId) {
      const timer = setTimeout(() => {
        console.log('PromptEditor: Triggering auto-save', { id, numericId });
        // 自动保存时不显示消息，避免干扰用户
        handleSave(false);
      }, 2000); // 2 seconds after last change

      return () => clearTimeout(timer);
    }
  }, [content, hasUnsavedChanges, isAutoSave, isNew, id, handleSave]);

  // Extract variables from content
  useEffect(() => {
    const variables = promptUtils.extractVariables(content);
    setDetectedVariables(variables);
  }, [content]);

  // Validate content
  useEffect(() => {
    const validation = promptUtils.validateContent(content);
    setValidationErrors(validation.errors);
  }, [content]);

  // Render preview content
  const renderPreview = () => {
    if (!content.trim()) {
      return (
        <div style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontSize: '16px'
        }}>
          暂无内容预览
        </div>
      );
    }

    return (
      <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight, rehypeRaw]}
          components={{
            h1: ({ children, ...props }) => (
              <h1 style={{ borderBottom: '2px solid #e8e8e8', paddingBottom: '8px', marginBottom: '16px' }} {...props}>
                {children}
              </h1>
            ),
            h2: ({ children, ...props }) => (
              <h2 style={{ borderBottom: '1px solid #e8e8e8', paddingBottom: '6px', marginTop: '24px', marginBottom: '12px' }} {...props}>
                {children}
              </h2>
            ),
            code: ({ inline, children, ...props }) => {
              if (inline) {
                return (
                  <code style={{
                    backgroundColor: '#f5f5f5',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    fontSize: '0.9em'
                  }} {...props}>
                    {children}
                  </code>
                );
              }
              return (
                <code style={{
                  display: 'block',
                  backgroundColor: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '6px',
                  overflow: 'auto',
                  fontSize: '0.9em'
                }} {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  // Render variables panel
  const renderVariablesPanel = () => {
    if (detectedVariables.length === 0) {
      return (
        <Alert
          message="未检测到模板变量"
          description="在内容中使用 {{变量名}} 格式来定义模板变量"
          type="info"
          showIcon
        />
      );
    }

    return (
      <div>
        <div style={{ marginBottom: '12px' }}>
          <strong>检测到的模板变量：</strong>
        </div>
        <Space wrap>
          {detectedVariables.map(variable => (
            <Tag key={variable} color="blue">
              {'{{' + variable + '}}'}
            </Tag>
          ))}
        </Space>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error && !isNew) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="加载失败"
          description="无法加载提示词数据，请稍后重试"
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
      <Card>
        {/* Header */}
        <div style={{ marginBottom: '16px' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Button
                  icon={<LeftOutlined />}
                  onClick={() => navigate('/prompts')}
                >
                  返回列表
                </Button>
                <Divider type="vertical" />
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {isNew ? '新建提示词' : '编辑提示词'}
                </span>
                {hasUnsavedChanges && (
                  <Badge dot>
                    <span style={{ color: '#fa8c16' }}>有未保存的更改</span>
                  </Badge>
                )}
              </Space>
            </Col>
            <Col>
              <Space>
                <Tooltip title={isAutoSave ? '自动保存已开启' : '自动保存已关闭'}>
                  <Button
                    type={isAutoSave ? 'primary' : 'default'}
                    size="small"
                    onClick={() => setIsAutoSave(!isAutoSave)}
                  >
                    自动保存
                  </Button>
                </Tooltip>

                <Button
                  icon={isPreviewMode ? <EditOutlined /> : <EyeOutlined />}
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                >
                  {isPreviewMode ? '编辑' : '预览'}
                </Button>

                <Button
                  icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? '退出全屏' : '全屏'}
                </Button>

                <Button
                  icon={<SaveOutlined />}
                  type="primary"
                  onClick={() => handleSave(true)}
                  loading={createPromptMutation.isPending || updatePromptMutation.isPending}
                >
                  保存
                </Button>

                <Button onClick={handleSaveAndContinue}>
                  保存并返回
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Form */}
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            type: 'business_description',
            status: 'draft',
            tags: []
          }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="name"
                label="提示词名称"
                rules={[{ required: true, message: '请输入提示词名称' }]}
              >
                <Input placeholder="请输入提示词名称" />
              </Form.Item>
            </Col>

            <Col span={4}>
              <Form.Item
                name="type"
                label="类型"
                rules={[{ required: true, message: '请选择类型' }]}
              >
                <Select placeholder="选择类型">
                  {configOptions.promptTypes.map(({value, label}) => (
                    <Option key={value} value={value}>
                      {label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={4}>
              <Form.Item
                name="business_type"
                label="业务类型"
              >
                <Select placeholder="选择业务类型" allowClear showSearch>
                  {configOptions.businessTypes.map(({value, label}) => (
                    <Option key={value} value={value}>
                      {label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={4}>
              <Form.Item
                name="status"
                label="状态"
              >
                <Select>
                  {configOptions.promptStatuses.map(({value, label}) => (
                    <Option key={value} value={value}>
                      {label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={4}>
              <Form.Item name="category_id" label="分类">
                <Select placeholder="选择分类" allowClear>
                  {categories?.map(category => (
                    <Option key={category.id} value={category.id}>
                      {category.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="author" label="作者">
                <Input placeholder="请输入作者名称" />
              </Form.Item>
            </Col>

            <Col span={16}>
              <Form.Item name="tags" label="标签">
                <Select
                  mode="tags"
                  placeholder="输入标签，按回车添加"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert
            message="内容验证失败"
            description={
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
            type="error"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}

        {/* Main Content */}
        <Card
          title={
            <Space>
              <span>内容编辑</span>
              {detectedVariables.length > 0 && (
                <Badge count={detectedVariables.length} color="blue">
                  <span>模板变量</span>
                </Badge>
              )}
            </Space>
          }
          size="small"
        >
          <Tabs defaultActiveKey="editor" size="small">
            <Tabs.TabPane tab="编辑器" key="editor">
              <div style={{ height: isFullscreen ? '70vh' : '400px' }}>
                {monacoError ? (
                  <div style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fff5f5',
                    border: '1px solid #ffccc7',
                    borderRadius: '6px',
                    padding: '20px',
                    color: '#cf1322'
                  }}>
                    <div style={{ fontSize: '16px', marginBottom: '10px' }}>
                      编辑器加载失败
                    </div>
                    <div style={{ fontSize: '14px', color: '#8c8c8c', textAlign: 'center' }}>
                      {monacoError}
                    </div>
                    <Button
                      type="primary"
                      size="small"
                      style={{ marginTop: '10px' }}
                      onClick={() => window.location.reload()}
                    >
                      重新加载页面
                    </Button>
                  </div>
                ) : (
                  <>
                    {isMonacoLoading && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        zIndex: 1000
                      }}>
                        <Spin size="large" tip="编辑器加载中..." />
                      </div>
                    )}
                    <Editor
                      height="100%"
                      defaultLanguage="markdown"
                      value={content}
                      onChange={handleContentChange}
                      beforeMount={() => {
                        setIsMonacoLoading(false);
                        setMonacoError(null);
                      }}
                      onMount={() => {
                        setIsMonacoLoading(false);
                        setMonacoError(null);
                        console.log('Monaco Editor mounted successfully');
                      }}
                      options={{
                        minimap: { enabled: false },
                        wordWrap: 'on',
                        lineNumbers: 'on',
                        folding: true,
                        fontSize: 14,
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        suggest: {
                          showKeywords: false,
                          showSnippets: false
                        }
                      }}
                    />
                  </>
                )}
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane tab="预览" key="preview">
              <div style={{
                height: isFullscreen ? '70vh' : '400px',
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                backgroundColor: '#fff'
              }}>
                {renderPreview()}
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane
              tab={
                <span>
                  变量
                  {detectedVariables.length > 0 && (
                    <Badge count={detectedVariables.length} size="small" style={{ marginLeft: '8px' }} />
                  )}
                </span>
              }
              key="variables"
            >
              <div style={{ padding: '16px' }}>
                {renderVariablesPanel()}
              </div>
            </Tabs.TabPane>
          </Tabs>
        </Card>
      </Card>
    </div>
  );
};

export default PromptEditor;