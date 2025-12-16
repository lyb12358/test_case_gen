import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Tag,
  Input,
  Select,
  Modal,
  Form,
  Row,
  Col,
  Typography,
  App,
  Popconfirm,
  Divider,
  Tabs,
  Badge,
  Tooltip,
  Switch,
  Alert,
  Dropdown
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
  FilterOutlined,
  ExportOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  MoreOutlined
} from '@ant-design/icons';

import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../../contexts/ProjectContext';

// 导入类型和服务
import { businessService } from '../../services/businessService';
import unifiedGenerationService from '../../services/unifiedGenerationService';
import StepEditor from '../../components/TestGeneration/StepEditor';
import {
  UnifiedTestCaseResponse,
  UnifiedTestCaseStatus,
  UnifiedTestCaseCreate,
  UnifiedTestCaseUpdate,
  UnifiedTestCaseFormData
} from '../../types/unifiedTestCase';
import { debounce } from '../../utils/debounce';
import { downloadFile, generateExportFilename } from '../../utils/fileUtils';
import type { components } from '../../types/api';
import { useBusinessTypeMapping } from '../../hooks';

type BusinessType = import('../../services/businessService').BusinessType;

const { Title, Text } = Typography;
const { Search } = Input;
const { TabPane } = Tabs;

// 类型定义
type StageFilter = 'all' | 'test_point' | 'test_case';
type CreationMode = 'test_point' | 'convert' | 'test_case';


const UnifiedTestCaseManager: React.FC = () => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currentProject } = useProject();

  // Business type mapping for display
  const { getBusinessTypeFullName, getBusinessTypeColor } = useBusinessTypeMapping();

  // 响应式检测 - 针对页面布局优化
  const [isCompact, setIsCompact] = useState(false);
  const [isVeryCompact, setIsVeryCompact] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsVeryCompact(width < 1200);   // 超紧凑布局
      setIsCompact(width < 1500);        // 紧凑布局
    };

    handleResize(); // 初始检测
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 如果没有选择项目，显示提示或重定向
  if (!currentProject) {
    return (
      <div style={{ padding: '24px' }}>
        <Title level={2}>测试用例管理</Title>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Text type="secondary">请先选择一个项目来管理测试用例</Text>
          </div>
        </Card>
      </div>
    );
  }

  // 状态管理
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [aiGenerationModalVisible, setAiGenerationModalVisible] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<UnifiedTestCaseResponse | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [creationMode, setCreationMode] = useState<CreationMode>('test_point');

  // 导出状态
  const [isExporting, setIsExporting] = useState(false);

  // AI生成状态
  const [aiForm] = Form.useForm();
  const [generationMode, setGenerationMode] = useState<'test_points_only' | 'test_cases_only'>('test_points_only');
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>('');
  const [additionalContext, setAdditionalContext] = useState<string>('');

  // 弹窗内测试点选择状态
  const [modalTestPoints, setModalTestPoints] = useState<any[]>([]);
  const [selectedTestPointIds, setSelectedTestPointIds] = useState<number[]>([]);
  const [loadingTestPoints, setLoadingTestPoints] = useState(false);
  const [testPointSearchText, setTestPointSearchText] = useState('');

  // 简化的状态重置函数
  const resetFormAndState = useCallback(() => {
    form.resetFields();
    setSelectedTestCase(null);
    setCreationMode('test_point');
  }, [form]);

  // 获取数据 - 根据stage过滤
  const { data: testCases, isLoading, error, refetch } = useQuery({
    queryKey: ['unifiedTestCases', currentProject?.id, stageFilter, currentPage, pageSize, searchText, 'id_desc'],
    queryFn: () => unifiedGenerationService.getUnifiedTestCases({
      project_id: currentProject.id,
      stage: stageFilter === 'all' ? undefined : stageFilter,
      page: currentPage,
      size: pageSize,
      keyword: searchText,
      sort_by: 'id',
      sort_order: 'desc'
    }),
    enabled: !!currentProject?.id
  });

  const { data: businessTypes } = useQuery({
    queryKey: ['businessTypes', currentProject?.id],
    queryFn: () => businessService.getBusinessTypes({ project_id: currentProject.id }),
    enabled: !!currentProject?.id
  });

  // 获取测试点数据（用于转换）
  const { data: testPoints } = useQuery({
    queryKey: ['testPoints', currentProject?.id, 'id_desc'],
    queryFn: () => unifiedGenerationService.getUnifiedTestCases({
      project_id: currentProject.id,
      stage: 'test_point',
      page: 1,
      size: 100,
      sort_by: 'id',
      sort_order: 'desc'
    }),
    enabled: !!currentProject?.id && creationMode === 'convert'
  });

  // 创建测试用例/测试点
  const createMutation = useMutation({
    mutationFn: (data: UnifiedTestCaseCreate) => {
      const testCaseData = {
        ...data,
        project_id: currentProject.id
      };
      return unifiedGenerationService.createUnifiedTestCase(testCaseData);
    },
    onSuccess: () => {
      message.success(creationMode === 'test_point' ? '测试点创建成功' : '测试用例创建成功');
      setCreateModalVisible(false);
      resetFormAndState();
      queryClient.invalidateQueries({ queryKey: ['unifiedTestCases'] });
    },
    onError: (error: any) => {
      console.error('创建失败:', error);

      // 特殊处理422验证错误
      if (error.response?.status === 422) {
        const validationErrors = error.response?.data?.detail;
        if (Array.isArray(validationErrors)) {
          const fieldErrors = validationErrors.map((err: any) =>
            `${err.loc?.join('.') || '字段'}: ${err.msg}`
          ).join(', ');
          message.error(`数据验证失败: ${fieldErrors}`);
        } else {
          message.error('数据验证失败，请检查必填字段是否完整');
        }
      } else {
        message.error(`创建失败: ${error.message || '网络错误，请稍后重试'}`);
      }
    }
  });

  // 更新测试用例
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UnifiedTestCaseUpdate }) =>
      unifiedGenerationService.updateUnifiedTestCase(id, data),
    onSuccess: () => {
      message.success('更新成功');
      setEditModalVisible(false);
      setConvertModalVisible(false);
      resetFormAndState();
      queryClient.invalidateQueries({ queryKey: ['unifiedTestCases'] });
    },
    onError: (error: any) => {
      console.error('更新失败:', error);

      // 检查是否为名称重复等业务错误
      const errorMessage = error.response?.data?.detail || error.message || '';

      if (errorMessage.includes('already exists') ||
          errorMessage.includes('duplicate') ||
          errorMessage.includes('unique') ||
          errorMessage.includes('名称') ||
          errorMessage.includes('name')) {
        message.error('该名称在当前业务类型下已存在，请使用不同的名称');
      } else {
        message.error(`更新失败: ${error.message || '未知错误'}`);
      }
    }
  });

  // 删除测试用例
  const deleteMutation = useMutation({
    mutationFn: (id: number) => unifiedGenerationService.deleteUnifiedTestCase(id),
    onSuccess: () => {
      message.success('删除成功');
      setSelectedRowKeys([]);
      queryClient.invalidateQueries({ queryKey: ['unifiedTestCases'] });
    },
    onError: (error: any) => {
      console.error('删除失败:', error);
      message.error(`删除失败: ${error.message || '未知错误'}`);
    }
  });

  // AI生成mutation
  const aiGenerationMutation = useMutation({
    mutationFn: async (params: {
      business_type: string;
      generation_mode: 'test_points_only' | 'test_cases_only';
      test_point_ids?: number[];
      additional_context?: string;
    }) => {
      const requestData = {
        business_type: params.business_type,
        project_id: currentProject.id,
        generation_mode: params.generation_mode,
        test_point_ids: params.test_point_ids,
        additional_context: params.additional_context
      };

      return unifiedGenerationService.generateUnified(requestData);
    },
    onSuccess: (response) => {
      message.success('AI生成任务已创建');
      setAiGenerationModalVisible(false);
      aiForm.resetFields();
      setSelectedBusinessType('');
      setAdditionalContext('');
      queryClient.invalidateQueries({ queryKey: ['unifiedTestCases'] });
    },
    onError: (error: any) => {
      console.error('AI生成失败:', error);
      message.error(`AI生成失败: ${error.response?.data?.detail || error.message || '未知错误'}`);
    }
  });

  // 防抖搜索
  const debouncedSearch = useMemo(
    () => debounce((value: string) => {
      setSearchText(value);
      setCurrentPage(1);
    }, 300),
    []
  );

  // 数据转换函数
  const convertFormDataToCreate = (formData: UnifiedTestCaseFormData, businessType: string, projectId: number): UnifiedTestCaseCreate => {
    const isTestPoint = creationMode === 'test_point';

    return {
      project_id: projectId,
      business_type: businessType,
      test_case_id: isTestPoint ?
        `TP_${formData.business_type}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}` :
        `TC_${formData.business_type}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: formData.name,
      description: formData.description || '',
      priority: formData.priority as 'high' | 'medium' | 'low',
      // 测试点不需要详细字段，测试用例需要
      ...(isTestPoint ? {} : {
        preconditions: formData.preconditions || undefined,
        steps: (formData.steps || []).map((step, index) => {
          const { step_number, action, expected } = step;
          return {
            step_number: step_number || index + 1,
            action: action || '',
            expected: expected || ''
          };
        }),
        // expected_result 字段已移除 - 使用steps中的expected字段
        remarks: formData.remarks,
        module: formData.module,
        functional_module: formData.functional_module,
        functional_domain: formData.functional_domain
      })
    };
  };

  const convertFormDataToConvert = (formData: UnifiedTestCaseFormData): UnifiedTestCaseUpdate => {
    return {
      stage: 'test_case', // 明确设置stage为test_case
      test_case_id: `TC_${formData.business_type}_${Date.now()}`,
      // 将preconditions数组转换为字符串，用换行符连接
      preconditions: formData.preconditions
        ? (Array.isArray(formData.preconditions)
            ? formData.preconditions.join('\n')
            : formData.preconditions)
        : undefined,
      steps: (formData.steps || []).map((step, index) => {
        const { step_number, action, expected } = step;
        return {
          step_number: step_number || index + 1,
          action: action || '', // 保持action字段，即使为空也通过验证
          expected: expected || ''
        };
      }),
      // expected_result 字段已移除 - 使用steps中的expected字段
    };
  };

  const convertFormDataToUpdate = (formData: UnifiedTestCaseFormData): UnifiedTestCaseUpdate => {
    return {
      name: formData.name,
      description: formData.description,
      business_type: formData.business_type,
      priority: formData.priority as 'high' | 'medium' | 'low',
      preconditions: formData.preconditions || undefined,
      steps: (formData.steps || []).map((step, index) => {
        const { step_number, action, expected } = step;
        return {
          step_number: step_number || index + 1,
          action: action || '',
          expected: expected || ''
        };
      }),
      // expected_result 字段已移除 - 使用steps中的expected字段
    };
  };

  // 业务类型变化时自动加载测试点
  const handleBusinessTypeChange = useCallback(async (businessType: string) => {
    setSelectedBusinessType(businessType);

    if (generationMode === 'test_cases_only') {
      setLoadingTestPoints(true);
      setSelectedTestPointIds([]); // 清空之前的选择
      setTestPointSearchText(''); // 清空搜索文本

      try {
        const response = await unifiedGenerationService.getTestPoints({
          business_type: businessType,
          project_id: currentProject.id,
          stage: 'test_point'
        });
        setModalTestPoints(response.items || []);
      } catch (error) {
        message.error('加载测试点失败');
        setModalTestPoints([]);
      } finally {
        setLoadingTestPoints(false);
      }
    }
  }, [generationMode, currentProject.id, message]);

  // 生成模式变化时的处理
  const handleGenerationModeChange = useCallback((mode: 'test_points_only' | 'test_cases_only') => {
    setGenerationMode(mode);

    if (mode === 'test_points_only') {
      // 切换到生成测试点模式时，清空测试点相关状态
      setModalTestPoints([]);
      setSelectedTestPointIds([]);
      setTestPointSearchText('');
    } else if (mode === 'test_cases_only' && selectedBusinessType) {
      // 切换到生成测试用例模式时，如果已选择业务类型，则加载测试点
      handleBusinessTypeChange(selectedBusinessType);
    }
  }, [selectedBusinessType, handleBusinessTypeChange]);

  // AI生成处理函数
  const handleAIGeneration = useCallback((values: any) => {
    if (!selectedBusinessType) {
      message.error('请选择业务类型');
      return;
    }

    const testPointIds = generationMode === 'test_cases_only'
      ? selectedTestPointIds
      : undefined;

    if (generationMode === 'test_cases_only' && (!testPointIds || testPointIds.length === 0)) {
      message.error('请选择至少一个测试点来生成测试用例');
      return;
    }

    // 验证选中的测试点是否有效
    if (generationMode === 'test_cases_only' && testPointIds) {
      const validTestPointIds = modalTestPoints
        .filter(tp => testPointIds.includes(tp.id))
        .map(tp => tp.id);

      if (validTestPointIds.length !== testPointIds.length) {
        const invalidIds = testPointIds.filter(id => !validTestPointIds.includes(id));
        console.warn('发现无效的测试点ID:', invalidIds);
        message.warning(`检测到${invalidIds.length}个无效的测试点，将只处理有效的${validTestPointIds.length}个测试点`);
      }

      if (validTestPointIds.length === 0) {
        message.error('没有找到有效的测试点，请重新选择');
        return;
      }

      // 使用验证后的测试点ID列表
      aiGenerationMutation.mutate({
        business_type: selectedBusinessType,
        generation_mode: generationMode,
        test_point_ids: validTestPointIds,
        additional_context: values.additional_context
      });
    } else {
      // 测试点生成模式或其他模式
      aiGenerationMutation.mutate({
        business_type: selectedBusinessType,
        generation_mode: generationMode,
        test_point_ids: testPointIds,
        additional_context: values.additional_context
      });
    }
  }, [selectedBusinessType, generationMode, selectedTestPointIds, modalTestPoints, aiGenerationMutation, message]);

  // 提交表单
  const handleSubmit = useCallback((isEdit: boolean = false) => {
    form.validateFields().then((values) => {
      // 在测试用例模式（创建或转换）下验证steps
      if (creationMode === 'test_case' || creationMode === 'convert') {
        const steps = values.steps || [];

        // 验证至少有一个步骤
        if (steps.length === 0) {
          message.error('测试用例必须包含至少一个执行步骤');
          return;
        }

        // 验证每个步骤的action和expected不能为空
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const action = step.action?.trim();
          const expected = step.expected?.trim();

          // 验证action字段
          if (!action) {
            message.error(`步骤 ${i + 1} 的操作描述不能为空`);
            return;
          }

          if (action.length > 2000) {
            message.error(`步骤 ${i + 1} 的操作描述长度不能超过2000个字符`);
            return;
          }

          // 验证expected字段
          if (!expected) {
            message.error(`步骤 ${i + 1} 的期望结果不能为空`);
            return;
          }

          if (expected.length > 2000) {
            message.error(`步骤 ${i + 1} 的期望结果长度不能超过2000个字符`);
            return;
          }
        }
      }

      // Clean steps data to remove id fields before any processing
      const cleanedSteps = (values.steps || []).map((step: any) => {
        const { id, step_number, action, expected } = step;
        return {
          step_number: step_number || 1,
          action: action || '',
          expected: expected || ''
        };
      });

      const formData: UnifiedTestCaseFormData = {
        ...values,
        steps: cleanedSteps
      };

      if (creationMode === 'convert') {
        // 转换模式
        if (selectedTestCase) {
          const convertData = convertFormDataToConvert(formData);
          updateMutation.mutate({ id: selectedTestCase.id, data: convertData });
        }
      } else if (isEdit && selectedTestCase) {
        // 编辑模式 - 根据记录类型过滤提交数据
        let updateData = convertFormDataToUpdate(formData);

        // 如果编辑测试点，移除测试用例专用字段
        if (selectedTestCase.stage === 'test_point') {
          const { preconditions, steps, ...testPointData } = updateData;
          updateData = testPointData;
        }

        updateMutation.mutate({ id: selectedTestCase.id, data: updateData });
      } else {
        // 创建模式
        const createData = convertFormDataToCreate(formData, values.business_type, currentProject.id);
        createMutation.mutate(createData);
      }
    });
  }, [form, selectedTestCase, createMutation, updateMutation, creationMode, currentProject.id]);

  // 处理函数
  const handleCreate = useCallback((mode: CreationMode) => {
    // 只允许创建测试点，如果不是test_point则忽略
    if (mode !== 'test_point') {
      return;
    }
    resetFormAndState();
    setCreationMode(mode);
    setCreateModalVisible(true);
  }, [resetFormAndState]);

  const handleEdit = useCallback((record: UnifiedTestCaseResponse) => {
    setSelectedTestCase(record);
    setEditModalVisible(true);

    // Set creationMode based on record stage for proper field display
    const isTestCase = record.stage === 'test_case';
    setCreationMode(isTestCase ? 'test_case' : 'test_point');

    setTimeout(() => {
      const formValues: any = {
        name: record.name,
        business_type: record.business_type,
        priority: record.priority,
        description: record.description
      };

      // Only add test case specific fields for test cases
      if (isTestCase) {
        // Ensure steps have proper structure for StepEditor
        const stepsWithIds = (record.steps || []).map((step: any, index: number) => ({
          id: step.id || `step_${Date.now()}_${index}`,
          step_number: step.step_number || index + 1,
          action: step.action || '',
          expected: step.expected || ''
        }));

        formValues.preconditions = record.preconditions;
        formValues.steps = stepsWithIds;
      }

      form.setFieldsValue(formValues);
    }, 100);
  }, [form]);

  const handleConvert = useCallback((record: UnifiedTestCaseResponse) => {
    setSelectedTestCase(record);
    setCreationMode('convert');
    setConvertModalVisible(true);
    setTimeout(() => {
      form.setFieldsValue({
        name: record.name,
        business_type: record.business_type,
        priority: record.priority,
        description: record.description,
        preconditions: ['测试环境已准备'], // 默认前置条件
        steps: [{ id: 1, step_number: 1, action: '', expected: '' }], // 默认步骤
        expected_result: ['测试通过'] // 默认预期结果
      });
    }, 100);
  }, [form]);

  const handleView = useCallback((record: UnifiedTestCaseResponse) => {
    setSelectedTestCase(record);
    setViewModalVisible(true);
  }, []);

  const handleDelete = useCallback((id: number) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  // 导出处理函数
  const handleExport = useCallback(async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      // 获取当前筛选的条件
      const businessType = selectedBusinessType || undefined;

      // 构建描述性文件名，包含筛选信息
      let filenamePrefix = 'test-cases';
      if (businessType) {
        filenamePrefix += `-${businessType}`;
      }
      if (stageFilter !== 'all') {
        filenamePrefix += `-${stageFilter}`;
      }

      // 调用导出服务
      const blob = await unifiedGenerationService.exportTestCasesToExcel(
        businessType,
        currentProject.id
      );

      // 生成文件名并下载
      const filename = generateExportFilename(filenamePrefix, 'xlsx');
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
  }, [isExporting, selectedBusinessType, stageFilter, currentProject.id]);

  // 表格列定义
  const columns: ColumnsType<UnifiedTestCaseResponse> = [
    {
      title: '测试用例ID',
      dataIndex: 'test_case_id',
      key: 'test_case_id',
      width: isVeryCompact ? 100 : isCompact ? 140 : 200,
      render: (text: string) => {
        // 响应式ID显示
        let maxWidth = 180;
        let fontSize = '12px';

        if (isVeryCompact) {
          maxWidth = 80;
          fontSize = '10px';
        } else if (isCompact) {
          maxWidth = 120;
          fontSize = '11px';
        }

        return (
          <Tooltip title={text}>
            <div style={{
              maxWidth,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize,
              fontFamily: 'Monaco, Consolas, monospace'
            }}>
              {text}
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: isVeryCompact ? 150 : isCompact ? 200 : 250,
      render: (text: string) => {
        // 响应式名称显示
        let maxWidth = 230;
        let fontSize = '14px';

        if (isVeryCompact) {
          maxWidth = 130;
          fontSize = '12px';
        } else if (isCompact) {
          maxWidth = 180;
          fontSize = '13px';
        }

        return (
          <Tooltip title={text}>
            <div style={{
              maxWidth,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize
            }}>
              {text}
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: '阶段',
      dataIndex: 'stage',
      key: 'stage',
      width: isVeryCompact ? 70 : isCompact ? 85 : 100,
      render: (stage: string) => {
        // 响应式阶段显示
        const isCompactStage = isVeryCompact || isCompact;

        if (stage === 'test_point') {
          return (
            <Tooltip title="测试点">
              <Tag
                color="blue"
                icon={<ExperimentOutlined />}
                style={{
                  fontSize: isVeryCompact ? '9px' : isCompact ? '10px' : '12px',
                  padding: isVeryCompact ? '2px 4px' : isCompact ? '3px 6px' : '4px 8px'
                }}
              >
                {isCompactStage ? '测点' : '测试点'}
              </Tag>
            </Tooltip>
          );
        } else {
          return (
            <Tooltip title="测试用例">
              <Tag
                color="green"
                icon={<FileTextOutlined />}
                style={{
                  fontSize: isVeryCompact ? '9px' : isCompact ? '10px' : '12px',
                  padding: isVeryCompact ? '2px 4px' : isCompact ? '3px 6px' : '4px 8px'
                }}
              >
                {isCompactStage ? '用例' : '测试用例'}
              </Tag>
            </Tooltip>
          );
        }
      },
    },
    {
      title: '业务类型',
      dataIndex: 'business_type',
      key: 'business_type',
      width: isVeryCompact ? 100 : isCompact ? 150 : 200,
      render: (type: string) => {
        if (!type) return <Tag>-</Tag>;
        const fullName = getBusinessTypeFullName(type);
        const color = getBusinessTypeColor(type);

        // 根据屏幕宽度显示简化的业务类型名称
        let displayName = fullName;
        let fontSize = '12px';
        let maxWidth = 180;
        let whiteSpace = 'normal';

        if (isVeryCompact) {
          displayName = fullName.length > 4 ? fullName.substring(0, 4) + '...' : fullName;
          fontSize = '9px';
          maxWidth = 70;
          whiteSpace = 'nowrap';
        } else if (isCompact) {
          displayName = fullName.length > 6 ? fullName.substring(0, 6) + '...' : fullName;
          fontSize = '10px';
          maxWidth = 110;
          whiteSpace = 'nowrap';
        }

        return (
          <Tooltip title={`[${type}] ${fullName}`}>
            <Tag
              color={color}
              style={{
                fontSize,
                maxWidth,
                whiteSpace,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                height: 'auto',
                padding: isVeryCompact ? '2px 4px' : '4px 8px',
                lineHeight: '1.2',
                display: 'inline-block'
              }}
            >
              [{type}] {displayName}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: isVeryCompact ? 60 : isCompact ? 70 : 100,
      render: (status: string) => {
        const statusConfig = {
          draft: { color: 'default', text: '草稿', shortText: '草' },
          approved: { color: 'success', text: '已批准', shortText: '准' },
          rejected: { color: 'error', text: '已拒绝', shortText: '拒' }
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

        // 响应式显示 - 统一使用Tag组件避免竖排问题
        if (isVeryCompact) {
          // 超紧凑布局：使用单字符和极小样式
          return (
            <Tooltip title={config.text}>
              <Tag
                color={config.color}
                style={{
                  fontSize: '8px',
                  padding: '1px 3px',
                  lineHeight: '1.1',
                  margin: 0,
                  minWidth: '16px',
                  textAlign: 'center',
                  display: 'inline-block'
                }}
              >
                {config.shortText}
              </Tag>
            </Tooltip>
          );
        } else if (isCompact) {
          // 紧凑布局：使用简化文字和较小样式
          return (
            <Tooltip title={config.text}>
              <Tag
                color={config.color}
                style={{
                  fontSize: '9px',
                  padding: '2px 4px',
                  lineHeight: '1.2',
                  margin: 0,
                  whiteSpace: 'nowrap'
                }}
              >
                {config.shortText}
              </Tag>
            </Tooltip>
          );
        } else {
          // 正常布局：使用Badge组件
          return <Badge status={config.color as any} text={config.text} />;
        }
      },
    },
    ...(isVeryCompact ? [] : [{
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: isCompact ? 80 : 100,
      render: (priority: string) => {
        const colorMap = {
          high: 'red',
          medium: 'orange',
          low: 'green'
        };
        const textMap = {
          high: '高',
          medium: '中',
          low: '低'
        };

        // 紧凑模式下使用更短的文字
        const displayText = isVeryCompact ?
          (priority === 'high' ? 'H' : priority === 'medium' ? 'M' : 'L') :
          (isCompact ?
            (priority === 'high' ? '高' : priority === 'medium' ? '中' : '低') :
            textMap[priority as keyof typeof textMap]
          );

        return (
          <Tag
            color={colorMap[priority as keyof typeof colorMap]}
            style={{
              fontSize: isCompact ? '10px' : '12px',
              padding: isCompact ? '2px 6px' : '4px 8px'
            }}
          >
            {displayText}
          </Tag>
        );
      },
    }]),
    ...(isVeryCompact ? [] : [{
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: isCompact ? 140 : 180,
      render: (date: string) => {
        const dateObj = new Date(date);

        // 响应式时间显示
        if (isCompact) {
          // 紧凑布局：显示简短日期时间
          return (
            <Tooltip title={dateObj.toLocaleString()}>
              <span style={{ fontSize: '11px' }}>
                {dateObj.toLocaleDateString('zh-CN', {
                  month: 'short',
                  day: '2-digit'
                })} {dateObj.toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </Tooltip>
          );
        } else {
          // 正常布局：显示完整日期时间
          return dateObj.toLocaleString();
        }
      },
    }]),
    {
      title: '操作',
      key: 'action',
      width: isVeryCompact ? 120 : isCompact ? 180 : 250,
      render: (_, record) => {
        // 响应式操作按钮显示
        if (isVeryCompact) {
          // 超紧凑布局：只显示图标，使用Dropdown
          const items = [
            {
              key: 'view',
              label: '查看',
              icon: <EyeOutlined />,
              onClick: () => handleView(record)
            },
            {
              key: 'edit',
              label: '编辑',
              icon: <EditOutlined />,
              onClick: () => handleEdit(record)
            }
          ];

          if (record.stage === 'test_point') {
            items.push({
              key: 'convert',
              label: '转换',
              icon: <ThunderboltOutlined />,
              onClick: () => handleConvert(record)
            });
          }

          items.push({
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: '确定删除这条记录吗？',
                content: '删除后无法恢复',
                okText: '确定',
                cancelText: '取消',
                onOk: () => handleDelete(record.id)
              });
            }
          });

          return (
            <Dropdown
              menu={{ items }}
              trigger={['click']}
              placement="bottomLeft"
            >
              <Button
                type="text"
                size="small"
                icon={<MoreOutlined />}
                style={{ padding: '2px 4px' }}
              />
            </Dropdown>
          );
        } else if (isCompact) {
          // 紧凑布局：显示主要操作，次要操作放入下拉菜单
          const secondaryItems = [];

          if (record.stage === 'test_point') {
            secondaryItems.push({
              key: 'convert',
              label: '转换',
              icon: <ThunderboltOutlined />,
              onClick: () => handleConvert(record)
            });
          }

          secondaryItems.push({
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: '确定删除这条记录吗？',
                content: '删除后无法恢复',
                okText: '确定',
                cancelText: '取消',
                onOk: () => handleDelete(record.id)
              });
            }
          });

          return (
            <Space size="small">
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleView(record)}
                style={{ padding: '0 4px' }}
              >
                查看
              </Button>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                style={{ padding: '0 4px' }}
              >
                编辑
              </Button>
              {secondaryItems.length > 0 && (
                <Dropdown
                  menu={{ items: secondaryItems }}
                  trigger={['click']}
                  placement="bottomLeft"
                >
                  <Button
                    type="link"
                    size="small"
                    icon={<MoreOutlined />}
                    style={{ padding: '0 4px' }}
                  />
                </Dropdown>
              )}
            </Space>
          );
        } else {
          // 正常布局：显示所有按钮
          return (
            <Space size="small">
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleView(record)}
              >
                查看
              </Button>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                编辑
              </Button>
              {record.stage === 'test_point' && (
                <Button
                  type="link"
                  size="small"
                  icon={<ThunderboltOutlined />}
                  onClick={() => handleConvert(record)}
                  style={{ color: '#52c41a' }}
                >
                  转换
                </Button>
              )}
              <Popconfirm
                title="确定删除这条记录吗？"
                onConfirm={() => handleDelete(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                >
                  删除
                </Button>
              </Popconfirm>
            </Space>
          );
        }
      },
    },
  ];

  // 渲染表单
  const renderForm = () => (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        priority: 'medium',
        steps: [{ id: 1, step_number: 1, action: '', expected: '' }]
      }}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label={creationMode === 'convert' ? '名称（继承自测试点）' : '名称'}
            name="name"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input
              placeholder={creationMode === 'convert' ? '名称将从测试点继承' : '请输入名称'}
              readOnly={creationMode === 'convert'}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="业务类型"
            name="business_type"
            rules={[{ required: true, message: '请选择业务类型' }]}
          >
            <Select
              placeholder={creationMode === 'convert' ? '业务类型将从测试点继承' : '请选择业务类型'}
              disabled={creationMode === 'convert'}
            >
              {businessTypes?.items?.map((type: any) => (
                <Select.Option key={type.code} value={type.code}>
                  [{type.code}] {type.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="优先级"
            name="priority"
            rules={[{ required: true, message: '请选择优先级' }]}
          >
            <Select>
              <Select.Option value="high">高</Select.Option>
              <Select.Option value="medium">中</Select.Option>
              <Select.Option value="low">低</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label="描述"
        name="description"
        rules={[{ required: true, message: '请输入描述' }]}
      >
        <Input.TextArea
          rows={2}
          placeholder="请输入描述（必填）"
        />
      </Form.Item>

      {/* 测试用例专用字段 - 创建和编辑模式都支持 */}
      {(creationMode !== 'test_point' || (editModalVisible && selectedTestCase?.stage === 'test_case')) && (
        <>
          <Form.Item
            label="前置条件"
            name="preconditions"
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入前置条件，每行一个"
            />
          </Form.Item>

          <Form.Item
            label="测试步骤"
            name="steps"
          >
            <StepEditor />
          </Form.Item>

          {/* 预期结果字段已移除 - 使用测试步骤中的expected字段 */}
        </>
      )}
    </Form>
  );

  if (error) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Title level={4}>加载失败</Title>
          <Button type="primary" onClick={() => refetch()}>
            重新加载
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                统一测试管理
              </Title>
            </Col>
            <Col>
              <Space>
                {/* 阶段过滤器 */}
                <Select
                  value={stageFilter}
                  onChange={setStageFilter}
                  style={{ width: 120 }}
                  placeholder="筛选阶段"
                >
                  <Select.Option value="all">
                    <Space>
                      <Badge color="blue" />
                      全部
                    </Space>
                  </Select.Option>
                  <Select.Option value="test_point">
                    <Space>
                      <ExperimentOutlined style={{ color: '#1890ff' }} />
                      测试点
                    </Space>
                  </Select.Option>
                  <Select.Option value="test_case">
                    <Space>
                      <FileTextOutlined style={{ color: '#52c41a' }} />
                      测试用例
                    </Space>
                  </Select.Option>
                </Select>

                <Search
                  placeholder="搜索测试用例..."
                  allowClear
                  style={{ width: 300 }}
                  onSearch={debouncedSearch}
                  onChange={(e) => debouncedSearch(e.target.value)}
                />
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => refetch()}
                >
                  刷新
                </Button>

                {/* 导出按钮 */}
                <Button
                  type="default"
                  icon={<ExportOutlined />}
                  loading={isExporting}
                  onClick={handleExport}
                  disabled={isLoading || !testCases?.items?.length}
                >
                  导出
                </Button>

                {/* 创建按钮组 - 只保留创建测试点按钮 */}
                <Button.Group>
                  <Button
                    type="primary"
                    icon={<ExperimentOutlined />}
                    onClick={() => handleCreate('test_point')}
                  >
                    创建测试点
                  </Button>
                </Button.Group>

                {/* AI生成按钮组 */}
                <Button.Group>
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    onClick={() => setAiGenerationModalVisible(true)}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  >
                    AI生成
                  </Button>
                </Button.Group>
              </Space>
            </Col>
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={testCases?.items || []}
          loading={isLoading}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          scroll={{
            x: isVeryCompact ? 800 : isCompact ? 1000 : undefined,
            y: 'calc(100vh - 300px)'
          }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: testCases?.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size || 20);
            },
            ...(isVeryCompact && {
              pageSizeOptions: ['10', '20'],
              simple: true
            })
          }}
          size={isVeryCompact ? 'small' : 'middle'}
        />
      </Card>

      {/* 创建模态框 */}
      <Modal
        title={
          creationMode === 'test_point' ? '创建测试点' :
          creationMode === 'test_case' ? '创建测试用例' : ''
        }
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          resetFormAndState();
        }}
        onOk={() => handleSubmit(false)}
        confirmLoading={createMutation.isPending}
        width={1000}
        destroyOnHidden
      >
        {/* 创建标签页 - 只保留创建测试点 */}
        <Tabs
          activeKey="test_point"
          items={[
            {
              key: 'test_point',
              label: (
                <span>
                  <ExperimentOutlined />
                  创建测试点
                </span>
              ),
              children: renderForm()
            }
          ]}
        />
      </Modal>

      {/* 编辑模态框 */}
      <Modal
        title={selectedTestCase?.stage === 'test_point' ? '编辑测试点' : '编辑测试用例'}
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          resetFormAndState();
        }}
        onOk={() => handleSubmit(true)}
        confirmLoading={updateMutation.isPending}
        width={1000}
        destroyOnHidden
      >
        {renderForm()}
      </Modal>

      {/* 转换模态框 */}
      <Modal
        title="将测试点转换为测试用例"
        open={convertModalVisible}
        onCancel={() => {
          setConvertModalVisible(false);
          resetFormAndState();
        }}
        onOk={() => handleSubmit(false)}
        confirmLoading={updateMutation.isPending}
        width={1000}
        destroyOnHidden
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            正在将测试点 <Text strong>{selectedTestCase?.name}</Text> 转换为测试用例
          </Text>
        </div>
        {renderForm()}
      </Modal>

      {/* 查看模态框 */}
      <Modal
        title={selectedTestCase?.stage === 'test_point' ? '查看测试点' : '查看测试用例'}
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false);
          setSelectedTestCase(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setViewModalVisible(false);
            setSelectedTestCase(null);
          }}>
            关闭
          </Button>
        ]}
        width={1000}
        destroyOnHidden
      >
        {selectedTestCase && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>ID：</Text>
                  <Tag color="blue">{selectedTestCase.test_case_id}</Tag>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>阶段：</Text>
                  {selectedTestCase.stage === 'test_point' ? (
                    <Tag color="blue" icon={<ExperimentOutlined />}>测试点</Tag>
                  ) : (
                    <Tag color="green" icon={<FileTextOutlined />}>测试用例</Tag>
                  )}
                </div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>名称：</Text>
                  {selectedTestCase.name}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>业务类型：</Text>
                  <Tag color="purple">{selectedTestCase.business_type}</Tag>
                </div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>优先级：</Text>
                  <Tag color={
                    selectedTestCase.priority === 'high' ? 'red' :
                    selectedTestCase.priority === 'medium' ? 'orange' : 'green'
                  }>
                    {selectedTestCase.priority === 'high' ? '高' :
                     selectedTestCase.priority === 'medium' ? '中' : '低'}
                  </Tag>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>状态：</Text>
                  <Badge
                    status={
                      selectedTestCase.status === 'approved' ? 'success' :
                      selectedTestCase.status === 'rejected' ? 'error' : 'default'
                    }
                    text={
                      selectedTestCase.status === 'approved' ? '已批准' :
                      selectedTestCase.status === 'rejected' ? '已拒绝' : '草稿'
                    }
                  />
                </div>
              </Col>
            </Row>

            <div style={{ marginBottom: 16 }}>
              <Text strong>描述：</Text>
              <div style={{ marginTop: 8 }}>
                {selectedTestCase.description || '无'}
              </div>
            </div>

            {selectedTestCase.stage === 'test_case' && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>前置条件：</Text>
                  <div style={{ marginTop: 8 }}>
                    {selectedTestCase.preconditions || '无'}
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Text strong>测试步骤：</Text>
                  <div style={{ marginTop: 8 }}>
                    {selectedTestCase.steps?.map((step, index) => (
                      <div key={index} style={{ marginBottom: 8 }}>
                        <div>
                          <strong>步骤 {step.step_number}:</strong> {step.action}
                        </div>
                        <div>
                          <strong>预期结果:</strong> {step.expected}
                        </div>
                      </div>
                    )) || '无'}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* AI生成模态框 */}
      <Modal
        title="AI智能生成"
        open={aiGenerationModalVisible}
        onCancel={() => {
          setAiGenerationModalVisible(false);
          aiForm.resetFields();
          setSelectedBusinessType('');
          setAdditionalContext('');
          // 清空测试点相关状态
          setModalTestPoints([]);
          setSelectedTestPointIds([]);
          setTestPointSearchText('');
          setLoadingTestPoints(false);
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setAiGenerationModalVisible(false);
            aiForm.resetFields();
            setSelectedBusinessType('');
            setAdditionalContext('');
            // 清空测试点相关状态
            setModalTestPoints([]);
            setSelectedTestPointIds([]);
            setTestPointSearchText('');
            setLoadingTestPoints(false);
          }}>
            取消
          </Button>,
          <Button
            key="generate"
            type="primary"
            onClick={() => aiForm.submit()}
            loading={aiGenerationMutation.isPending}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
          >
            {aiGenerationMutation.isPending ? '生成中...' : '开始生成'}
          </Button>
        ]}
        width={800}
        destroyOnHidden
      >
        <Form
          form={aiForm}
          layout="vertical"
          onFinish={handleAIGeneration}
          initialValues={{
            additional_context: ''
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="生成模式"
                name="generation_mode"
                rules={[{ required: true, message: '请选择生成模式' }]}
              >
                <Select
                  value={generationMode}
                  onChange={handleGenerationModeChange}
                  placeholder="请选择生成模式"
                >
                  <Select.Option value="test_points_only">
                    <Space>
                      <ExperimentOutlined />
                      生成测试点
                    </Space>
                  </Select.Option>
                  <Select.Option value="test_cases_only">
                    <Space>
                      <FileTextOutlined />
                      生成测试用例
                    </Space>
                  </Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="业务类型"
                name="business_type"
                rules={[{ required: true, message: '请选择业务类型' }]}
              >
                <Select
                  value={selectedBusinessType}
                  onChange={handleBusinessTypeChange}
                  placeholder="请选择业务类型"
                >
                  {businessTypes?.items?.map((type: any) => (
                    <Select.Option key={type.code} value={type.code}>
                      [{type.code}] {type.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {generationMode === 'test_cases_only' && (
            <Form.Item label="选择测试点" required>
              <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <Search
                    placeholder="搜索测试点名称或描述..."
                    allowClear
                    value={testPointSearchText}
                    onChange={(e) => setTestPointSearchText(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <Table
                    size="small"
                    rowSelection={{
                      selectedRowKeys: selectedTestPointIds,
                      onChange: (selectedKeys) => setSelectedTestPointIds(selectedKeys as number[]),
                      type: 'checkbox'
                    }}
                    columns={[
                      {
                        title: '测试点',
                        dataIndex: 'test_case_id',
                        width: 150,
                        render: (text: string) => (
                          <Tooltip title={text} placement="topLeft">
                            <div style={{
                              maxWidth: 120,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {text}
                            </div>
                          </Tooltip>
                        )
                      },
                      {
                        title: '测试点名称',
                        dataIndex: 'name',
                        ellipsis: true,
                        width: 200
                      },
                      {
                        title: '描述',
                        dataIndex: 'description',
                        ellipsis: true,
                        width: 'auto'
                      }
                    ]}
                    dataSource={modalTestPoints.filter(tp =>
                      tp.name.toLowerCase().includes(testPointSearchText.toLowerCase()) ||
                      (tp.description && tp.description.toLowerCase().includes(testPointSearchText.toLowerCase()))
                    )}
                    pagination={false}
                    loading={loadingTestPoints}
                    rowKey="id"
                    scroll={{ y: 200 }}
                  />
                </div>

                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary">
                    已选择 {selectedTestPointIds.length} 个测试点
                  </Text>
                  <Space>
                    <Button
                      size="small"
                      onClick={() => setSelectedTestPointIds([])}
                      disabled={selectedTestPointIds.length === 0}
                    >
                      清空选择
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setSelectedTestPointIds(modalTestPoints.map(tp => tp.id))}
                      disabled={modalTestPoints.length === 0}
                    >
                      全选
                    </Button>
                  </Space>
                </div>
              </div>
            </Form.Item>
          )}

          {generationMode === 'test_cases_only' && selectedTestPointIds.length === 0 && (
            <Alert
              message="请选择至少一个测试点来生成测试用例"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {generationMode === 'test_points_only' && (
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">
                <InfoCircleOutlined /> 测试点生成模式：将根据选定的业务类型生成新的测试点
              </Text>
            </div>
          )}

          <Form.Item
            label="额外上下文（可选）"
            name="additional_context"
            help="提供额外的上下文信息，帮助AI更好地生成内容"
          >
            <Input.TextArea
              rows={4}
              placeholder="请输入额外的上下文信息（可选）"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UnifiedTestCaseManager;