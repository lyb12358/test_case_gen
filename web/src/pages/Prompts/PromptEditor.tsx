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
  FullscreenExitOutlined,
  BookOutlined,
  CodeOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

import {
  PromptCreate,
  PromptUpdate,
  getPromptTypeOptions,
  getPromptStatusOptions,
  getGenerationStageOptions,
  getBusinessTypeOptions
} from '../../types/prompts';
import promptService, { promptUtils } from '../../services/promptService';
import { useProject } from '../../contexts/ProjectContext';
import { projectService } from '../../services/projectService';
import PromptVariableGuide from '../../components/PromptBuilder/PromptVariableGuide';
import 'highlight.js/styles/github.css';

// Configure Monaco Editor to use local instance
if (import.meta.env.DEV) {
  // Development: Use local node_modules
  loader.config({
    paths: {
      vs: '/node_modules/monaco-editor/min/vs'
    }
  });
} else {
  // Production: Configure for Vite bundled resources
  // Set up Monaco environment to use bundled workers
  if (typeof window !== 'undefined') {
    window.MonacoEnvironment = {
      getWorkerUrl: function (moduleId, label) {
        // Return the bundled worker files
        const workerBaseUrl = './assets';
        switch (label) {
          case 'json':
            return `${workerBaseUrl}/json.worker.js`;
          case 'css':
          case 'scss':
          case 'less':
            return `${workerBaseUrl}/css.worker.js`;
          case 'html':
          case 'handlebars':
          case 'razor':
            return `${workerBaseUrl}/html.worker.js`;
          case 'typescript':
          case 'javascript':
            return `${workerBaseUrl}/ts.worker.js`;
          default:
            return `${workerBaseUrl}/editor.worker.js`;
        }
      }
    };
  }
}

// Pre-load Monaco Editor
loader.init().then((monaco) => {
  console.log('Monaco Editor pre-loaded successfully');

  // Force English locale to prevent CDN localization loading
  monaco.editor.setLocale('en');

}).catch((error) => {
  console.error('Failed to pre-load Monaco Editor:', error);
  // Note: setMonacoError will be called within component scope
});

const { Option } = Select;

const PromptEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { currentProject } = useProject();
  const [form] = Form.useForm();

  // State
  const [content, setContent] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasStartedEditing, setHasStartedEditing] = useState(false);
  const [isAutoSave, setIsAutoSave] = useState(false); // 禁用自动保存
  const [isMonacoLoading, setIsMonacoLoading] = useState(true);
  const [monacoError, setMonacoError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isManualSave, setIsManualSave] = useState(false);

  // 新增状态管理 - 用于解决表单同步问题
  const [isSaving, setIsSaving] = useState(false); // 替代isStatusChanging，更清晰的语义
  const [lastSaveTimestamp, setLastSaveTimestamp] = useState<number | null>(null);
  const [formSyncStatus, setFormSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [lastSyncedGenerationStage, setLastSyncedGenerationStage] = useState<string | null>(null);
  const [editorRef, setEditorRef] = useState<any>(null);  // Monaco editor reference
  const [activeTab, setActiveTab] = useState('editor');    // Active tab state
  const [isStatusChanging, setIsStatusChanging] = useState(false); // Status change indicator

  // Data consistency check states
  const [lastOptimisticUpdate, setLastOptimisticUpdate] = useState<{
    generation_stage?: string;
    timestamp: number;
  } | null>(null);
  const [dataInconsistencyDetected, setDataInconsistencyDetected] = useState(false);
  const [inconsistencyDetails, setInconsistencyDetails] = useState<{
    field: string;
    expectedValue: any;
    actualValue: any;
  } | null>(null);

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
    enabled: !isNew && !!id && id !== 'undefined'
  });

  // Create prompt mutation
  const createPromptMutation = useMutation({
    mutationFn: promptService.prompt.createPrompt,
    onMutate: () => {
      setIsStatusChanging(true);
    },
    onSuccess: (data) => {
      setHasUnsavedChanges(false);

      if (isManualSave) {
        message.success('提示词创建成功，正在更新统计数据...');
        setSaveSuccess(true);
        // 2秒后重置成功状态
        setTimeout(() => setSaveSuccess(false), 2000);
      }

      // Invalidate relevant queries after creation
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['prompt-stats'] });

      setTimeout(() => {
        setIsStatusChanging(false);
        message.success('数据同步完成');
      }, 1000);

      navigate(`/prompts/${data.id}`);
    },
    onError: (error: any) => {
      setIsStatusChanging(false);
      message.error(`创建失败: ${error.response?.data?.detail || error.message}`);
    },
    onSettled: () => {
      // mutation完成后的清理工作
      console.log('Create prompt mutation settled');
    }
  });

  // Update prompt mutation
  const updatePromptMutation = useMutation({
    mutationFn: (data: { id: number; prompt: PromptUpdate }) =>
      promptService.prompt.updatePrompt(data.id, data.prompt),
    onMutate: async (newData) => {
      setIsSaving(true);
      setIsStatusChanging(true); // 保持兼容性
      setFormSyncStatus('syncing');
      // 记录更新的generation_stage用于日志跟踪
      console.log('PromptEditor: Starting update with generation_stage:', newData.prompt.generation_stage);
    },
    onSuccess: (data, variables, context) => {
      setHasUnsavedChanges(false);
      const saveTimestamp = Date.now();
      setLastSaveTimestamp(saveTimestamp);

      console.log('PromptEditor: Update successful, server response generation_stage:', data.generation_stage);
      console.log('PromptEditor: Form generation_stage before update:', form.getFieldValue('generation_stage'));

      // 重要：使用服务器返回的实际数据更新缓存
      // 这确保我们使用最新的服务器数据，而不是乐观更新的数据
      queryClient.setQueryData(['prompt', variables.id], data);

      // 🚨 修复缓存竞态条件：不立即invalidateQueries，避免覆盖正确的数据
      // queryClient.invalidateQueries({ queryKey: ['prompts'] }); // 移除：会导致缓存被旧数据覆盖

      // 延迟更新列表缓存，确保当前编辑的prompt数据不被覆盖
      setTimeout(() => {
        console.log('🔄 PromptEditor: Delayed cache invalidation for prompts list');
        queryClient.invalidateQueries({ queryKey: ['prompts'] });
      }, 2000); // 2秒后更新列表，确保表单数据稳定

      // 强制表单同步 - 使用服务器返回的最新数据
      try {
        const formValues = {
          name: data.name,
          type: data.type,
          business_type: data.business_type,
          status: data.status,
          generation_stage: data.generation_stage, // 使用服务器返回的确切值
          author: data.author,
          tags: data.tags || []
        };

        console.log('PromptEditor: Force updating form with server data:', formValues);

        // 立即强制更新表单
        form.setFieldsValue(formValues);

        // 记录最后同步的generation_stage
        setLastSyncedGenerationStage(data.generation_stage);
        setFormSyncStatus('synced');

        // 验证表单是否立即正确更新
        const currentFormValue = form.getFieldValue('generation_stage');

        if (currentFormValue === data.generation_stage) {
          console.log('✅ PromptEditor: Form sync successful - generation_stage:', currentFormValue);
        } else {
          console.error('❌ PromptEditor: Form sync failed!', {
            expected: data.generation_stage,
            actual: currentFormValue,
            serverData: data
          });
          setFormSyncStatus('error');

          // 尝试再次同步
          setTimeout(() => {
            console.log('🔄 PromptEditor: Retrying form sync...');
            form.setFieldsValue({ generation_stage: data.generation_stage });

            const retryValue = form.getFieldValue('generation_stage');
            if (retryValue === data.generation_stage) {
              console.log('✅ PromptEditor: Retry sync successful');
              setFormSyncStatus('synced');
            } else {
              console.error('❌ PromptEditor: Retry sync also failed');
              message.error('数据同步失败，请刷新页面确认');
            }
          }, 100);
        }
      } catch (error) {
        console.error('PromptEditor: Error updating form with server data:', error);
        setFormSyncStatus('error');
        message.error('表单同步失败，请刷新页面');
      }

      // 只有手动保存才显示通知和按钮状态变化
      if (isManualSave) {
        message.success('提示词保存成功，数据已同步');
        setSaveSuccess(true);
        // 2秒后重置成功状态
        setTimeout(() => setSaveSuccess(false), 2000);
      }

      // 立即设置状态变化标志为false，避免延迟导致的竞态条件
      setIsSaving(false);
      setIsStatusChanging(false); // 保持兼容性
      console.log('PromptEditor: Status changing flag cleared immediately');
      console.log('PromptEditor: Save operation completed, form sync status:', formSyncStatus);

      // Form update is now immediate, no need for counter management
    },
    onError: (error, variables) => {
      setIsSaving(false);
      setIsStatusChanging(false); // 保持兼容性
      setFormSyncStatus('error');

      // Enhanced error handling with specific focus on generation stage issues
      let errorMessage = '保存失败';
      const errorObj = error as any;

      if (errorObj?.response?.data?.detail) {
        errorMessage = errorObj.response.data.detail;
      } else if (errorObj?.response?.data?.message) {
        errorMessage = errorObj.response.data.message;
      } else if (errorObj?.message) {
        errorMessage = errorObj.message;
      }

      // Specific handling for generation stage field persistence issues
      if (variables.prompt?.generation_stage &&
          (errorMessage.includes('generation_stage') ||
           errorMessage.includes('validation') ||
           errorMessage.includes('invalid'))) {
        errorMessage = `生成阶段字段更新失败: ${errorMessage}`;
        console.error('PromptEditor: Generation stage field update failed:', {
          attemptedValue: variables.prompt.generation_stage,
          error: errorMessage,
          fullError: error
        });
      }

      message.error(errorMessage);
      console.error('PromptEditor: Update failed:', error);
      console.error('PromptEditor: Failed update variables:', variables);
    },
    onSettled: () => {
      // mutation完成后的清理工作
      console.log('Update prompt mutation settled');
    }
  });

  // Handle content change
  const handleContentChange = useCallback((value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    setHasUnsavedChanges(true);

    // 标记用户已开始编辑
    if (!hasStartedEditing && newContent.length > 0) {
      setHasStartedEditing(true);
    }
  }, [hasStartedEditing]);

  // Handle variable insertion
  const handleInsertVariable = useCallback((variableName: string) => {
    if (editorRef) {
      const editor = editorRef;
      const position = editor.getPosition();
      const model = editor.getModel();

      if (model) {
        // Insert variable at current cursor position
        model.pushEditOperations(
          [],
          [{
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column
            },
            text: variableName
          }],
          () => null
        );

        // Move cursor to the end of inserted variable
        editor.setPosition({
          lineNumber: position.lineNumber,
          column: position.column + variableName.length
        });

        // Focus the editor
        editor.focus();

        // Mark as having unsaved changes
        setHasUnsavedChanges(true);
      }
    } else {
      // Fallback: copy to clipboard if editor is not available
      navigator.clipboard.writeText(variableName).then(() => {
        message.success('变量已复制到剪贴板');
      });
    }
  }, [editorRef]);

  
  // Handle save
  const handleSave = useCallback((showMessage = true) => {
    console.log('PromptEditor: handleSave called', {
      showMessage,
      contentLength: content.length,
      isNew,
      isAutoSave: !showMessage
    });

    // 标记是否为手动保存
    setIsManualSave(showMessage);

    // 执行完整的内容验证
    const validation = promptUtils.validateContent(content);
    if (validation.errors.length > 0) {
      // 设置验证错误，让用户看到具体问题
      setValidationErrors(validation.errors);
      setHasStartedEditing(true); // 确保显示验证错误

      if (showMessage) {
        const errorMsg = validation.errors.join('；');
        message.error(`请完善提示词内容：${errorMsg}`);
      }
      return;
    }

    // 添加表单状态检查
    try {
      const formValues = form.getFieldsValue();
      console.log('PromptEditor: Current form values', formValues);
    } catch (error) {
      console.error('PromptEditor: Error getting form values', error);
      if (showMessage) {
        message.error('表单验证失败，请重试');
      }
      return;
    }

    form.validateFields().then((values) => {
      // 确保 generation_stage 有有效值，处理所有边界情况
      let generationStage = values.generation_stage;
      if (!generationStage || generationStage.trim() === '') {
        generationStage = 'general';
      } else {
        generationStage = generationStage.trim();
      }

      console.log('PromptEditor: Submitting generation_stage:', generationStage);

      const promptData: PromptCreate | PromptUpdate = {
        name: values.name,
        content,
        type: values.type,
        business_type: values.business_type,
        status: values.status,
        generation_stage: generationStage,
        author: values.author,
        tags: values.tags,
        variables: detectedVariables,
        project_id: currentProject?.id,
        extra_metadata: {
          detected_variables_count: detectedVariables.length,
          content_length: content.length,
          last_edited: new Date().toISOString()
        }
      };

      // 为编辑分支定义numericId
      const numericId = Number(id);

      // 只在编辑模式下进行ID验证
      if (!isNew) {
        if (isNaN(numericId) || !isFinite(numericId)) {
          console.error('PromptEditor: Invalid ID for update:', { id, numericId });
          if (showMessage) {
            message.error('无效的提示词ID，无法保存');
          }
          return;
        }
      }

      // 详细的保存前日志记录
      console.log('PromptEditor: Preparing to save prompt with the following data:');
      console.log('- ID:', isNew ? 'new' : Number(id));
      console.log('- Name:', values.name);
      console.log('- Type:', values.type);
      console.log('- Business Type:', values.business_type);
      console.log('- Status:', values.status);
      console.log('- Generation Stage (original):', values.generation_stage);
      console.log('- Generation Stage (processed):', generationStage);
      console.log('- Author:', values.author);
      console.log('- Tags:', values.tags);
      console.log('- Is New:', isNew);
      console.log('- Show Message:', showMessage);

      if (isNew) {
        console.log('PromptEditor: Creating new prompt...');
        createPromptMutation.mutate(promptData as PromptCreate);
      } else {
        console.log('PromptEditor: Updating existing prompt:', numericId);
        updatePromptMutation.mutate({
          id: numericId,
          prompt: promptData
        });
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

  // Update form when prompt data is loaded
  // 分离的初始化useEffect - 仅处理初始数据加载
  useEffect(() => {
    if (prompt && !isMonacoLoading && !hasStartedEditing) {
      console.log('PromptEditor: Initial load - setting up form with data:', {
        promptId: prompt.id,
        generation_stage: prompt.generation_stage
      });

      setContent(prompt.content);

      try {
        const formValues = {
          name: prompt.name,
          type: prompt.type,
          business_type: prompt.business_type,
          status: prompt.status,
          generation_stage: prompt.generation_stage,
          author: prompt.author,
          tags: prompt.tags || []
        };

        console.log('PromptEditor: Initializing form with prompt data:', formValues);
        form.setFieldsValue(formValues);

        // 记录初始同步状态
        setLastSyncedGenerationStage(prompt.generation_stage);
        setFormSyncStatus('synced');

        console.log('PromptEditor: Form initialized successfully');
      } catch (error) {
        console.error('PromptEditor: Error initializing form', error);
        setFormSyncStatus('error');
      }
    }
  }, [prompt, isMonacoLoading, hasStartedEditing]); // 简化的依赖项

  // 专门处理保存后数据同步的useEffect - 避免与初始化冲突
  useEffect(() => {
    // 只有在最近有保存操作且不是正在保存时才处理
    if (lastSaveTimestamp && !isSaving && prompt) {
      console.log('PromptEditor: Post-save sync check', {
        lastSaveTimestamp,
        promptGenerationStage: prompt.generation_stage,
        lastSyncedGenerationStage,
        formSyncStatus
      });

      // 如果检测到数据不一致，且有最新保存时间戳，可能需要同步
      const currentFormValue = form.getFieldValue('generation_stage');

      if (currentFormValue !== prompt.generation_stage &&
          prompt.generation_stage === lastSyncedGenerationStage) {

        console.warn('PromptEditor: Detected form-data mismatch after save, attempting fix', {
          formValue: currentFormValue,
          dataValue: prompt.generation_stage,
          lastSynced: lastSyncedGenerationStage
        });

        // 重新同步表单
        setTimeout(() => {
          form.setFieldsValue({ generation_stage: prompt.generation_stage });
          console.log('PromptEditor: Form re-synced after save');
        }, 50);
      }
    }
  }, [prompt, lastSaveTimestamp, isSaving, lastSyncedGenerationStage, formSyncStatus]);

  // 自动保存功能已禁用 - 用户反馈生成阶段字段会立即恢复
  // 如需要重新启用，请修改 isAutoSave 初始值并取消注释以下代码
  /*
  useEffect(() => {
    const numericId = Number(id);
    const hasValidId = !isNaN(numericId) && isFinite(numericId);

    if (hasUnsavedChanges && isAutoSave && !isNew && hasValidId) {
      const timer = setTimeout(() => {
        console.log('PromptEditor: Triggering auto-save', { id, numericId });
        handleSave(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [content, hasUnsavedChanges, isAutoSave, isNew, id, handleSave]);
  */

  // Simplified Debug: Monitor only essential state changes
  useEffect(() => {
    console.log('🔍 PromptEditor: State monitor', {
      isSaving,
      formSyncStatus,
      promptId: prompt?.id,
      promptGenerationStage: prompt?.generation_stage
    });
  }, [isSaving, formSyncStatus, prompt?.id, prompt?.generation_stage]);

  // 简化后的状态管理：核心问题已在缓存层面修复，无需复杂的双重检查
  // 如果后续需要调试，可以重新启用以下代码：
  /*
  useEffect(() => {
    if (!isSaving && prompt && form && lastSaveTimestamp) {
      // 简化的一致性检查逻辑
      const currentFormValue = form.getFieldValue('generation_stage');
      if (currentFormValue !== prompt.generation_stage) {
        console.warn('🔧 PromptEditor: Form-data inconsistency detected, but main cache issue is fixed');
      }
    }
  }, [isSaving, prompt, form, lastSaveTimestamp]);
  */

  // Extract variables from content
  useEffect(() => {
    const variables = promptUtils.extractVariables(content);
    setDetectedVariables(variables);
  }, [content]);

  // Validate content
  useEffect(() => {
    // 只有在用户开始编辑后才进行验证
    if (hasStartedEditing) {
      const validation = promptUtils.validateContent(content);
      setValidationErrors(validation.errors);
    } else {
      // 初始状态不显示验证错误
      setValidationErrors([]);
    }
  }, [content, hasStartedEditing]);

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
            code: ({ inline, children, ...props }: { inline?: boolean; children?: React.ReactNode; [key: string]: any }) => {
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
    const currentBusinessType = form.getFieldValue('business_type');

    return (
      <div>
        {/* Detected Variables Section */}
        {detectedVariables.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
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
        )}

        {/* Template Variable Guide */}
        <PromptVariableGuide
          businessType={currentBusinessType}
          onInsertVariable={handleInsertVariable}
          showExamples={true}
        />
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

                <Tooltip title="模板变量指导">
                  <Button
                    icon={<CodeOutlined />}
                    onClick={() => setActiveTab('variables')}
                    type={activeTab === 'variables' ? 'primary' : 'default'}
                  >
                    变量
                  </Button>
                </Tooltip>

                
                <Button
                  icon={<SaveOutlined />}
                  type={saveSuccess ? "default" : "primary"}
                  style={saveSuccess ? {
                    backgroundColor: '#52c41a',
                    borderColor: '#52c41a',
                    color: 'white'
                  } : {}}
                  onClick={() => handleSave(true)}
                  loading={createPromptMutation.isPending || updatePromptMutation.isPending || isStatusChanging}
                >
                  {saveSuccess ? '✓ 已保存' : '保存'}
                </Button>

                <Button onClick={handleSaveAndContinue}>
                  保存并返回
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Data Inconsistency Alert */}
        {dataInconsistencyDetected && inconsistencyDetails && (
          <Alert
            type="warning"
            showIcon
            closable
            onClose={() => {
              setDataInconsistencyDetected(false);
              setInconsistencyDetails(null);
            }}
            style={{ marginBottom: 16 }}
            message="数据一致性警告"
            description={
              <div>
                <p>检测到数据不一致问题：</p>
                <p>
                  字段：{inconsistencyDetails.field}<br />
                  预期值：{inconsistencyDetails.expectedValue}<br />
                  服务器返回值：{inconsistencyDetails.actualValue}
                </p>
                <Space>
                  <Button size="small" type="primary" onClick={() => refetch()}>
                    重新获取数据
                  </Button>
                  <Button size="small" onClick={() => {
                    setDataInconsistencyDetected(false);
                    setInconsistencyDetails(null);
                  }}>
                    忽略
                  </Button>
                </Space>
              </div>
            }
          />
        )}

        {/* Form */}
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            type: 'business_description',
            status: 'draft',
            generation_stage: 'general',
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

            <Col span={6}>
              <Form.Item
                name="type"
                label="提示词类型"
                rules={[{ required: true, message: '请选择提示词类型' }]}
                tooltip="选择提示词的功能类型，如系统提示词、模板等"
              >
                <Select placeholder="选择提示词类型">
                  {configOptions.promptTypes.map(({value, label}) => (
                    <Option key={value} value={value}>
                      {label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={5}>
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

            <Col span={5}>
              <Form.Item
                name="generation_stage"
                label="生成阶段"
                tooltip="选择此提示词适用于哪个生成阶段"
                rules={[
                  {
                    required: true,
                    message: '请选择生成阶段'
                  },
                  {
                    validator: (_, value) => {
                      if (!value || value.trim() === '') {
                        return Promise.reject(new Error('生成阶段不能为空'));
                      }
                      // 验证值是否在有效选项中
                      const isValidStage = configOptions.generationStages.some(
                        option => option.value === value
                      );
                      if (!isValidStage) {
                        return Promise.reject(new Error('无效的生成阶段值'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
                help={dataInconsistencyDetected ? '⚠️ 检测到数据不一致，请检查或重新获取数据' : undefined}
                validateStatus={dataInconsistencyDetected ? 'warning' : undefined}
              >
                <Select
                  placeholder="选择生成阶段"
                  onChange={(value) => {
                    console.log('PromptEditor: Generation stage changed to:', value);
                    setHasUnsavedChanges(true);
                    setHasStartedEditing(true);

                    // 清除数据不一致状态（用户手动修改）
                    if (dataInconsistencyDetected) {
                      setDataInconsistencyDetected(false);
                      setInconsistencyDetails(null);
                      message.info('已清除数据不一致状态');
                    }
                  }}
                  onBlur={() => {
                    // 验证当前值
                    const currentValue = form.getFieldValue('generation_stage');
                    if (!currentValue || currentValue.trim() === '') {
                      form.setFieldsValue({
                        generation_stage: 'general'
                      });
                      message.warning('生成阶段已自动设置为默认值：通用');
                    }
                  }}
                >
                  {configOptions.generationStages.map(({value, label}) => (
                    <Option key={value} value={value}>
                      {label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="business_type"
                label="适用业务类型"
                tooltip="选择此提示词适用的业务类型，如不选择则适用于所有业务类型"
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

            <Col span={8}>
              <Form.Item name="author" label="作者">
                <Input placeholder="请输入作者名称" />
              </Form.Item>
            </Col>

            <Col span={8}>
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
          <Tabs activeKey={activeTab} onChange={setActiveTab} size="small">
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
                      onMount={(editor: any) => {
                        setIsMonacoLoading(false);
                        setMonacoError(null);
                        setEditorRef(editor);
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