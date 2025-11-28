import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Select,
    Input,
  Tag,
  Divider,
  Alert,
  message,
  Spin,
  Empty,
  Tooltip,
  Modal,
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { businessService, BusinessType, PromptCombination } from '../../services/businessService';
import { useProject } from '../../contexts/ProjectContext';
import { InlinePromptBuilder, CombinationPreview, InlineCombinationDetails } from '@/components/PromptBuilder';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface BusinessPromptConfigurationProps {
  businessType?: BusinessType;
  onSave?: () => void;
  onCancel?: () => void;
}

const BusinessPromptConfiguration: React.FC<BusinessPromptConfigurationProps> = ({
  businessType,
  onSave,
  onCancel
}) => {
  const { id: urlId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentProject } = useProject();

    const [testPointCombinationId, setTestPointCombinationId] = useState<number | undefined>();
  const [testCaseCombinationId, setTestCaseCombinationId] = useState<number | undefined>();
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);

  // 新增状态
  const [testPointBuilderVisible, setTestPointBuilderVisible] = useState(false);
  const [testCaseBuilderVisible, setTestCaseBuilderVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewStage, setPreviewStage] = useState<'test_point' | 'test_case'>('test_point');
  const [previewCombinationId, setPreviewCombinationId] = useState<number | undefined>();

  // 组合数据状态（用于临时存储用户配置的组合）
  const [testPointCombinationData, setTestPointCombinationData] = useState<{
    name: string;
    description?: string;
    items: Array<{
      prompt_id: number;
      order: number;
      variable_name?: string;
      is_required: boolean;
    }>;
  } | undefined>();
  const [testCaseCombinationData, setTestCaseCombinationData] = useState<{
    name: string;
    description?: string;
    items: Array<{
      prompt_id: number;
      order: number;
      variable_name?: string;
      is_required: boolean;
    }>;
  } | undefined>();

  // Get business type data if ID is provided
  const { data: businessData, isLoading: businessLoading } = useQuery({
    queryKey: ['businessType', urlId],
    queryFn: () => businessService.getBusinessType(parseInt(urlId)),
    enabled: !!urlId,
    staleTime: 5 * 60 * 1000,
  });

  
  // Update business type configuration with unified save
  const updateMutation = useMutation({
    mutationFn: async (data: {
      test_point_combination_data?: {
        name: string;
        description?: string;
        items: Array<{
          prompt_id: number;
          order: number;
          variable_name?: string;
          is_required: boolean;
        }>;
        existingCombinationId?: number;
      };
      test_case_combination_data?: {
        name: string;
        description?: string;
        items: Array<{
          prompt_id: number;
          order: number;
          variable_name?: string;
          is_required: boolean;
        }>;
        existingCombinationId?: number;
      };
      test_point_combination_id?: number;
      test_case_combination_id?: number;
    }) => {
      const businessId = parseInt(urlId);

      // Create/update combinations and update business type in one go
      const updateData: { test_point_combination_id?: number; test_case_combination_id?: number } = {};

      if (data.test_point_combination_data) {
        if (data.test_point_combination_data.existingCombinationId) {
          // Update existing combination
          await businessService.updatePromptCombination(
            data.test_point_combination_data.existingCombinationId,
            {
              name: data.test_point_combination_data.name,
              description: data.test_point_combination_data.description,
              prompt_ids: data.test_point_combination_data.items.map(item => item.prompt_id)
            }
          );
          updateData.test_point_combination_id = data.test_point_combination_data.existingCombinationId;
        } else {
          // Create new combination
          const testPointCombination = await businessService.createPromptCombination({
            name: data.test_point_combination_data.name,
            description: data.test_point_combination_data.description,
            project_id: currentProject?.id || 1,
            business_type: businessData?.code || businessType?.code || '',
            prompt_ids: data.test_point_combination_data.items.map(item => item.prompt_id)
          });
          updateData.test_point_combination_id = testPointCombination.id;
        }
      } else if (data.test_point_combination_id) {
        updateData.test_point_combination_id = data.test_point_combination_id;
      }

      if (data.test_case_combination_data) {
        if (data.test_case_combination_data.existingCombinationId) {
          // Update existing combination
          await businessService.updatePromptCombination(
            data.test_case_combination_data.existingCombinationId,
            {
              name: data.test_case_combination_data.name,
              description: data.test_case_combination_data.description,
              prompt_ids: data.test_case_combination_data.items.map(item => item.prompt_id)
            }
          );
          updateData.test_case_combination_id = data.test_case_combination_data.existingCombinationId;
        } else {
          // Create new combination
          const testCaseCombination = await businessService.createPromptCombination({
            name: data.test_case_combination_data.name,
            description: data.test_case_combination_data.description,
            project_id: currentProject?.id || 1,
            business_type: businessData?.code || businessType?.code || '',
            prompt_ids: data.test_case_combination_data.items.map(item => item.prompt_id)
          });
          updateData.test_case_combination_id = testCaseCombination.id;
        }
      } else if (data.test_case_combination_id) {
        updateData.test_case_combination_id = data.test_case_combination_id;
      }

      return businessService.updateBusinessType(businessId, updateData);
    },
    onSuccess: () => {
      message.success('业务类型提示词配置保存成功');
      queryClient.invalidateQueries({ queryKey: ['businessType', urlId] });
      queryClient.invalidateQueries({ queryKey: ['businessTypes'] });
      queryClient.invalidateQueries({ queryKey: ['businessTypeStats'] });
      if (onSave) {
        onSave();
      } else {
        navigate('/business-management');
      }
    },
    onError: (error: any) => {
      message.error(error.message || '保存配置失败');
    },
  });

  // Initialize form when business data is loaded
  useEffect(() => {
    const business = businessData || businessType;
    if (business) {
      setTestPointCombinationId(business.test_point_combination_id || undefined);
      setTestCaseCombinationId(business.test_case_combination_id || undefined);

    }
  }, [businessData, businessType]);

  const handleSave = () => {
    updateMutation.mutate({
      test_point_combination_data: testPointCombinationData ? {
        ...testPointCombinationData,
        existingCombinationId: testPointCombinationId
      } : undefined,
      test_case_combination_data: testCaseCombinationData ? {
        ...testCaseCombinationData,
        existingCombinationId: testCaseCombinationId
      } : undefined,
      test_point_combination_id: testPointCombinationId,
      test_case_combination_id: testCaseCombinationId,
    });
  };

  // 新增处理函数
  const handleCreateTestPointCombination = () => {
    setTestPointBuilderVisible(true);
  };

  const handleCreateTestCaseCombination = () => {
    setTestCaseBuilderVisible(true);
  };

  const handlePreviewCombination = (stage: 'test_point' | 'test_case', combinationId?: number) => {
    setPreviewStage(stage);
    setPreviewCombinationId(combinationId);
    setPreviewVisible(true);
  };

  const handleCombinationCreated = (combinationData: {
    name: string;
    description?: string;
    items: Array<{
      prompt_id: number;
      order: number;
      variable_name?: string;
      is_required: boolean;
    }>;
  }, stage: 'test_point' | 'test_case') => {
    const currentCombinationId = stage === 'test_point' ? testPointCombinationId : testCaseCombinationId;
    const isEditMode = !!currentCombinationId;

    if (stage === 'test_point') {
      setTestPointCombinationData(combinationData);
      setTestPointBuilderVisible(false);
    } else {
      setTestCaseCombinationData(combinationData);
      setTestCaseBuilderVisible(false);
    }

    message.success(`${isEditMode ? '编辑' : '创建'}${stage === 'test_point' ? '测试点' : '测试用例'}提示词组合${isEditMode ? '并更新' : ''}`);
  };

  
  // 验证新组合数据是否包含系统提示词
  const validateNewCombinationHasSystemPrompt = async (combinationData: any): Promise<boolean> => {
    if (!combinationData?.items || combinationData.items.length === 0) {
      return false;
    }

    try {
      // 获取可用提示词列表来检查类型
      const response = await businessService.getAvailablePrompts();
      const prompts = response.prompts;

      // 检查是否包含系统类型的提示词
      const hasSystemPrompt = combinationData.items.some((item: any) => {
        const prompt = prompts.find((p: any) => p.id === item.prompt_id);
        return prompt?.type === 'system';
      });

      return hasSystemPrompt;
    } catch (error) {
      console.error('验证提示词类型失败:', error);
      return false;
    }
  };

  const handleSaveConfirm = async () => {
    const validationErrors: string[] = [];

    // 验证新创建的测试点组合
    if (testPointCombinationData) {
      const hasSystemPrompt = await validateNewCombinationHasSystemPrompt(testPointCombinationData);
      if (!hasSystemPrompt) {
        validationErrors.push('测试点提示词组合必须包含至少一个系统提示词');
      }
    }

    // 验证新创建的测试用例组合
    if (testCaseCombinationData) {
      const hasSystemPrompt = await validateNewCombinationHasSystemPrompt(testCaseCombinationData);
      if (!hasSystemPrompt) {
        validationErrors.push('测试用例提示词组合必须包含至少一个系统提示词');
      }
    }

    // 如果有验证错误，显示并阻止保存
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => message.error(error));
      return;
    }

    setIsSaveModalVisible(true);
  };

  const handleSaveConfirmed = () => {
    setIsSaveModalVisible(false);
    handleSave();
  };

  // 重置功能 - 重置表单数据而不是刷新页面
  const handleReset = () => {
    // 重置所有表单状态
    setTestPointCombinationId(undefined);
    setTestCaseCombinationId(undefined);
    setTestPointCombinationData(undefined);
    setTestCaseCombinationData(undefined);

    // 重新加载业务数据到原始状态
    queryClient.invalidateQueries({ queryKey: ['businessType', urlId] });

    message.info('已重置配置状态，请重新进行配置');
  };

  // 返回业务类型列表
  const handleBackToList = () => {
    navigate('/business-management');
  };

  const isLoading = businessLoading;

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

  const business = businessData || businessType;
  if (!business) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <Empty description="业务类型数据不存在" />
      </div>
    );
  }

  return (
    <div>
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={handleBackToList}
              type="text"
            >
              返回列表
            </Button>
          </Col>
          <Col flex="auto">
            <Space>
              <Title level={4} style={{ margin: 0 }}>
                配置提示词组合
              </Title>
              <Tag color="blue">{business.code}</Tag>
              <Text strong>{business.name}</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Tooltip title="重置当前配置状态">
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
              </Tooltip>
              {onCancel && (
                <Button onClick={onCancel}>
                  取消
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      <Alert
        message="两阶段提示词配置"
        description="系统采用两阶段生成模式：测试点提示词用于生成具体测试场景，测试用例提示词用于生成详细的测试步骤。请为每个阶段选择对应的提示词组合。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card
            title={
              <Space>
                <SettingOutlined />
                <span>测试点提示词组合</span>
                {testPointCombinationId && <Tag color="green">已保存</Tag>}
                {testPointCombinationData && !testPointCombinationId && <Tag color="orange">待保存</Tag>}
              </Space>
            }
            extra={
              testPointCombinationId && (
                <Tooltip title="查看当前组合详情">
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => handlePreviewCombination('test_point', testPointCombinationId)}
                  >
                    详情
                  </Button>
                </Tooltip>
              )
            }
            style={{ height: 260 }}
          >
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px'
            }}>
              <div style={{ textAlign: 'center', maxWidth: '100%', width: '100%' }}>
                {testPointCombinationId ? (
                  <div style={{ height: '100%', width: '100%' }}>
                    <InlineCombinationDetails
                      combinationId={testPointCombinationId}
                      businessType={business.code}
                      businessTypeName={business.name}
                      stage="test_point"
                      onPreview={(combinationId) => handlePreviewCombination('test_point', combinationId)}
                      onEdit={() => setTestPointBuilderVisible(true)}
                      height={180}
                    />
                  </div>
                ) : (
                  <>
                    <div
                      style={{ cursor: 'pointer' }}
                      onClick={handleCreateTestPointCombination}
                    >
                      <PlusOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                      <Title level={4}>创建测试点提示词组合</Title>
                      <Paragraph type="secondary" style={{ marginBottom: '24px' }}>
                        点击此处，为当前业务类型构建专用的测试点生成提示词组合
                      </Paragraph>
                    </div>
                    {testPointCombinationData && (
                      <div style={{
                        padding: '12px',
                        backgroundColor: '#fff7e6',
                        borderRadius: 6,
                        border: '1px solid #ffd591'
                      }}>
                        <Text type="warning">
                          <ExclamationCircleOutlined style={{ marginRight: '8px' }} />
                          已配置测试点提示词组合（待保存）
                        </Text>
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#d48806' }}>
                          组合名称：{testPointCombinationData.name} | 包含 {testPointCombinationData.items.length} 个提示词
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </Card>
        </Col>

        <Col span={12}>
          <Card
            title={
              <Space>
                <SettingOutlined />
                <span>测试用例提示词组合</span>
                {testCaseCombinationId && <Tag color="green">已保存</Tag>}
                {testCaseCombinationData && !testCaseCombinationId && <Tag color="orange">待保存</Tag>}
              </Space>
            }
            extra={
              testCaseCombinationId && (
                <Tooltip title="查看当前组合详情">
                  <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => handlePreviewCombination('test_case', testCaseCombinationId)}
                  >
                    详情
                  </Button>
                </Tooltip>
              )
            }
            style={{ height: 260 }}
          >
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '20px'
            }}>
              <div style={{ textAlign: 'center', maxWidth: '100%', width: '100%' }}>
                {testCaseCombinationId ? (
                  <div style={{ height: '100%', width: '100%' }}>
                    <InlineCombinationDetails
                      combinationId={testCaseCombinationId}
                      businessType={business.code}
                      businessTypeName={business.name}
                      stage="test_case"
                      onPreview={(combinationId) => handlePreviewCombination('test_case', combinationId)}
                      onEdit={() => setTestCaseBuilderVisible(true)}
                      height={180}
                    />
                  </div>
                ) : (
                  <>
                    <div
                      style={{ cursor: 'pointer' }}
                      onClick={handleCreateTestCaseCombination}
                    >
                      <PlusOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                      <Title level={4}>创建测试用例提示词组合</Title>
                      <Paragraph type="secondary" style={{ marginBottom: '24px' }}>
                        点击此处，为当前业务类型构建专用的测试用例生成提示词组合
                      </Paragraph>
                    </div>
                    {testCaseCombinationData && (
                      <div style={{
                        padding: '12px',
                        backgroundColor: '#fff7e6',
                        borderRadius: 6,
                        border: '1px solid #ffd591'
                      }}>
                        <Text type="warning">
                          <ExclamationCircleOutlined style={{ marginRight: '8px' }} />
                          已配置测试用例提示词组合（待保存）
                        </Text>
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#d48806' }}>
                          组合名称：{testCaseCombinationData.name} | 包含 {testCaseCombinationData.items.length} 个提示词
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Space size="large">
          <Button onClick={handleSaveConfirm} type="primary" icon={<SaveOutlined />} loading={updateMutation.isPending}>
            保存配置
          </Button>
          {onCancel && (
            <Button onClick={onCancel}>
              取消
            </Button>
          )}
        </Space>
      </div>

      {/* 确认保存模态框 */}
      <Modal
        title="确认保存配置"
        open={isSaveModalVisible}
        onOk={handleSaveConfirmed}
        onCancel={() => setIsSaveModalVisible(false)}
        okText="确认保存"
        cancelText="取消"
      >
        <Alert
          message="即将保存业务类型配置"
          description={
            <div>
              <p>您即将为业务类型 <strong>{business.name} ({business.code})</strong> 保存提示词组合配置。</p>
              <p>保存完成后，可以使用这些提示词组合生成测试点和测试用例。</p>
            </div>
          }
          type="info"
          showIcon
        />
      </Modal>

      {/* 内嵌提示词构建器 - 测试点 */}
      <InlinePromptBuilder
        visible={testPointBuilderVisible}
        businessType={business.code}
        businessTypeName={business.name}
        stage="test_point"
        projectId={business.project_id}
        existingCombinationId={testPointCombinationId}
        onSuccess={(combinationId) => handleCombinationCreated(combinationId, 'test_point')}
        onCancel={() => setTestPointBuilderVisible(false)}
      />

      {/* 内嵌提示词构建器 - 测试用例 */}
      <InlinePromptBuilder
        visible={testCaseBuilderVisible}
        businessType={business.code}
        businessTypeName={business.name}
        stage="test_case"
        projectId={business.project_id}
        existingCombinationId={testCaseCombinationId}
        onSuccess={(combinationId) => handleCombinationCreated(combinationId, 'test_case')}
        onCancel={() => setTestCaseBuilderVisible(false)}
      />

      {/* 组合预览模态框 */}
      <Modal
        title={`${previewStage === 'test_point' ? '测试点' : '测试用例'}提示词组合预览`}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <CombinationPreview
          combinationId={previewCombinationId}
          businessType={business.code}
          businessTypeName={business.name}
          stage={previewStage}
          visible={previewVisible}
          onClose={() => setPreviewVisible(false)}
        />
      </Modal>
    </div>
  );
};

export default BusinessPromptConfiguration;