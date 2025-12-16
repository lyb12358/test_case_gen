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
  Row,
  Col,
  Tooltip,
  Badge,
  Alert,
  Divider,
  Empty,
  Dropdown
} from 'antd';
import {
  SettingOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  BuildOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessService, BusinessType, GenerationModeRequest, GenerationModeResponse } from '../../services/businessService';
import { useProject } from '../../contexts/ProjectContext';
import PromptCombinationSelector from './PromptCombinationSelector';

const { Title, Text } = Typography;
const { Option } = Select;

// 预设配置模板 - 专注于两阶段生成的提示词组合配置
const CONFIGURATION_TEMPLATES = {
  standard_business: {
    name: '标准业务模板',
    description: '适用于大多数业务场景的两阶段测试生成',
    recommended_for: ['RCC', 'RFD', 'ZAB', 'ZBA', 'RPP'],
    icon: '⚡',
    generation_mode: 'two_stage' as const
  },
  complex_business: {
    name: '复杂业务模板',
    description: '适用于复杂业务场景，生成结构化、全面的测试用例',
    recommended_for: ['RCE', 'RDL_RDU', 'RDO_RDC', 'ZAY', 'WEIXIU_RSM'],
    icon: '🔧',
    generation_mode: 'two_stage' as const
  },
  climate_control: {
    name: '空调控制模板',
    description: '专门针对空调控制类业务的优化配置',
    recommended_for: ['RCC', 'RHL', 'ZAV'],
    icon: '❄️',
    generation_mode: 'two_stage' as const
  },
  security_business: {
    name: '安全相关模板',
    description: '适用于车辆安全和权限管理相关业务',
    recommended_for: ['RDL_RDU', 'RDO_RDC', 'RCE', 'ZAD'],
    icon: '🔒',
    generation_mode: 'two_stage' as const
  }
};

const BusinessTypeConfig: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentProject } = useProject();
  const [editingBusiness, setEditingBusiness] = useState<BusinessType | null>(null);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 响应式状态管理
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [isCompact, setIsCompact] = useState(screenWidth < 1500);
  const [isVeryCompact, setIsVeryCompact] = useState(screenWidth < 1200);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setScreenWidth(width);
      setIsCompact(width < 1500);
      setIsVeryCompact(width < 1200);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 获取业务类型列表
  const { data: businessTypesData, isLoading, error, refetch } = useQuery({
    queryKey: ['businessTypes', currentProject?.id, currentPage],
    queryFn: () => {
      return businessService.getBusinessTypes({
        project_id: currentProject?.id,
        page: currentPage,
        size: pageSize
      });
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!currentProject
  });

  // 获取生成模式
  const { data: generationModes, refetch: refetchGenerationModes } = useQuery({
    queryKey: ['generationModes', currentProject?.id],
    queryFn: async () => {
      if (!currentProject || !businessTypesData?.items) return {};
      const modes: Record<string, GenerationModeResponse> = {};

      for (const business of businessTypesData.items) {
        try {
          const mode = await businessService.getGenerationMode(business.code);
          modes[business.code] = mode;
        } catch (error) {
          console.error(`Failed to get generation mode for ${business.code}:`, error);
        }
      }

      return modes;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!currentProject && !!businessTypesData?.items
  });

  // 获取推荐的配置模板
  const getRecommendedTemplate = (businessCode: string) => {
    for (const [key, template] of Object.entries(CONFIGURATION_TEMPLATES)) {
      if (template.recommended_for.includes(businessCode)) {
        return { key, ...template };
      }
    }
    return null;
  };

  // 批量设置业务类型配置
  const setBatchGenerationModeMutation = useMutation({
    mutationFn: ({ businessTypes, templateKey }: { businessTypes: string[]; templateKey: string }) => {
      const template = CONFIGURATION_TEMPLATES[templateKey as keyof typeof CONFIGURATION_TEMPLATES];
      const promises = businessTypes.map(businessType =>
        businessService.setGenerationMode(businessType, {
          generation_mode: template.generation_mode as 'single_stage' | 'two_stage',
          // Note: Template IDs would need to be configured separately or use defaults
        })
      );
      return Promise.all(promises);
    },
    onSuccess: (_, { businessTypes }) => {
      message.success(`成功为 ${businessTypes.length} 个业务类型设置配置模板`);
      queryClient.invalidateQueries({ queryKey: ['generationModes'] });
      refetchGenerationModes();
    },
    onError: (error: any) => {
      message.error(error.message || '批量设置配置失败');
    },
  });

  // 设置生成模式
  const setGenerationModeMutation = useMutation({
    mutationFn: ({ businessType, data }: { businessType: string; data: GenerationModeRequest }) =>
      businessService.setGenerationMode(businessType, data),
    onSuccess: () => {
      message.success('生成模式设置成功');
      queryClient.invalidateQueries({ queryKey: ['generationModes'] });
      refetchGenerationModes();
    },
    onError: (error: any) => {
      message.error(error.message || '设置生成模式失败');
    },
  });

  const handleConfigBusiness = (business: BusinessType) => {
    setEditingBusiness(business);
    setConfigModalVisible(true);
  };

  const handleSaveConfig = (values: any) => {
    if (!editingBusiness) return;

    const configData: GenerationModeRequest = {
      generation_mode: values.generation_mode,
      test_point_combination_id: values.generation_mode === 'two_stage' ? values.test_point_combination_id : undefined,
      test_case_combination_id: values.generation_mode === 'two_stage' ? values.test_case_combination_id : undefined,
    };

    setGenerationModeMutation.mutate({
      businessType: editingBusiness.code,
      data: configData
    });
  };

  const getGenerationModeTag = (businessType: BusinessType) => {
    const mode = generationModes?.[businessType.code];

    if (!mode) {
      return (
        <Tag color="gray" icon={<ExclamationCircleOutlined />}>
          未配置
        </Tag>
      );
    }

    if (mode.generation_mode === 'two_stage') {
      return (
        <Tooltip title="两阶段生成：先生成测试点，再生成测试用例">
          <Tag color="blue" icon={<BuildOutlined />}>
            两阶段
          </Tag>
        </Tooltip>
      );
    } else {
      return (
        <Tooltip title="单阶段生成：直接生成测试用例">
          <Tag color="green" icon={<CheckCircleOutlined />}>
            单阶段
          </Tag>
        </Tooltip>
      );
    }
  };

  const getConfigurationStatus = (businessType: BusinessType) => {
    const mode = generationModes?.[businessType.code];

    if (!mode) {
      return {
        status: 'warning',
        text: '需要配置',
        icon: <ExclamationCircleOutlined />
      };
    }

    if (mode.generation_mode === 'two_stage') {
      if (mode.test_point_combination_id && mode.test_case_combination_id) {
        return {
          status: 'success',
          text: '配置完整',
          icon: <CheckCircleOutlined />
        };
      } else {
        return {
          status: 'warning',
          text: '需要配置提示词组合',
          icon: <ExclamationCircleOutlined />
        };
      }
    } else {
      if (businessType.has_valid_prompt_combination) {
        return {
          status: 'success',
          text: '配置完整',
          icon: <CheckCircleOutlined />
        };
      } else {
        return {
          status: 'warning',
          text: '需要配置提示词组合',
          icon: <ExclamationCircleOutlined />
        };
      }
    }
  };

  // 批量配置处理
  const handleBatchConfiguration = (templateKey: string) => {
    const template = CONFIGURATION_TEMPLATES[templateKey as keyof typeof CONFIGURATION_TEMPLATES];
    const businessTypes = businessTypesData?.items
      ?.filter(business => template.recommended_for.includes(business.code))
      .map(business => business.code) || [];

    if (businessTypes.length === 0) {
      message.info('没有适用于此模板的业务类型');
      return;
    }

    Modal.confirm({
      title: `批量应用配置模板`,
      content: (
        <div>
          <p>确定要将 <strong>{template.name}</strong> 应用到以下 {businessTypes.length} 个业务类型吗？</p>
          <div style={{ margin: '12px 0' }}>
            {businessTypes.map(code => (
              <Tag key={code} color="blue" style={{ margin: '2px' }}>{code}</Tag>
            ))}
          </div>
          <Alert
            message="注意"
            description="批量配置将覆盖现有的生成模式设置，但不会覆盖具体的提示词组合配置。"
            type="info"
            size="small"
          />
        </div>
      ),
      onOk: () => {
        setBatchGenerationModeMutation.mutate({ businessTypes, templateKey });
      },
      okText: '确认应用',
      cancelText: '取消'
    });
  };

  const columns = [
    {
      title: '业务编码',
      dataIndex: 'code',
      key: 'code',
      width: isVeryCompact ? 80 : isCompact ? 100 : 120,
      render: (code: string) => (
        <span style={{
          fontFamily: 'monospace',
          fontWeight: 'bold',
          fontSize: isVeryCompact ? '10px' : isCompact ? '11px' : '12px'
        }}>
          {code}
        </span>
      )
    },
    {
      title: '业务名称',
      dataIndex: 'name',
      key: 'name',
      width: isVeryCompact ? 150 : isCompact ? 180 : 220,
      render: (name: string, record: BusinessType) => {
        const recommendedTemplate = getRecommendedTemplate(record.code);

        // 响应式业务名称显示
        if (isVeryCompact) {
          // 超紧凑布局：只显示名称
          return (
            <Tooltip title={record.description || name}>
              <div>
                <div style={{
                  fontWeight: 500,
                  fontSize: '11px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {name}
                </div>
                {recommendedTemplate && (
                  <div style={{ marginTop: '2px' }}>
                    <Tooltip title={`推荐：${recommendedTemplate.description}`}>
                      <Tag
                        color="blue"
                        style={{ fontSize: '8px', lineHeight: '10px', padding: '1px 3px' }}
                      >
                        {recommendedTemplate.icon}
                      </Tag>
                    </Tooltip>
                  </div>
                )}
              </div>
            </Tooltip>
          );
        } else if (isCompact) {
          // 紧凑布局：显示名称和简化描述
          return (
            <div>
              <div style={{
                fontWeight: 500,
                fontSize: '12px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {name}
              </div>
              {recommendedTemplate && (
                <div style={{ marginTop: '2px' }}>
                  <Tooltip title={`推荐：${recommendedTemplate.description}`}>
                    <Tag
                      color="blue"
                      style={{ fontSize: '9px', lineHeight: '11px', padding: '1px 4px' }}
                    >
                      {recommendedTemplate.icon} {recommendedTemplate.name}
                    </Tag>
                  </Tooltip>
                </div>
              )}
            </div>
          );
        } else {
          // 正常布局：显示完整信息
          return (
            <div>
              <div style={{ fontWeight: 500 }}>{name}</div>
              {record.description && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                  {record.description}
                </div>
              )}
              {recommendedTemplate && (
                <div style={{ marginTop: '4px' }}>
                  <Tooltip title={`推荐使用：${recommendedTemplate.description}`}>
                    <Tag
                      color="blue"
                      style={{ fontSize: '11px', lineHeight: '12px' }}
                    >
                      {recommendedTemplate.icon} {recommendedTemplate.name}
                    </Tag>
                  </Tooltip>
                </div>
              )}
            </div>
          );
        }
      },
    },
    {
      title: '状态',
      key: 'status',
      width: isVeryCompact ? 60 : isCompact ? 80 : 100,
      render: (_: any, record: BusinessType) => (
        <Switch
          size={isVeryCompact ? 'small' : 'default'}
          checked={record.is_active}
          disabled
        />
      ),
    },
    ...(isVeryCompact ? [] : [{
      title: '生成模式',
      key: 'generation_mode',
      width: isCompact ? 100 : 120,
      render: (_: any, record: BusinessType) => getGenerationModeTag(record),
    }]),
    ...(isVeryCompact ? [] : [{
      title: '配置状态',
      key: 'config_status',
      width: isCompact ? 120 : 140,
      render: (_: any, record: BusinessType) => {
        const status = getConfigurationStatus(record);
        return (
          <Tag
            color={status.status}
            icon={status.icon}
            style={{ fontSize: isCompact ? '10px' : '11px' }}
          >
            {status.text}
          </Tag>
        );
      },
    }]),
    {
      title: '操作',
      key: 'actions',
      width: isVeryCompact ? 60 : isCompact ? 80 : 120,
      render: (_: any, record: BusinessType) => {
        // 响应式操作按钮显示
        if (isVeryCompact) {
          // 超紧凑布局：使用下拉菜单
          const items = [
            {
              key: 'config',
              label: '配置生成模式和提示词',
              icon: <SettingOutlined />,
              onClick: () => handleConfigBusiness(record)
            }
          ];

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
        } else {
          // 紧凑和正常布局：显示配置按钮
          return (
            <Space size="small">
              <Tooltip title="配置生成模式和提示词">
                <Button
                  type="text"
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={() => handleConfigBusiness(record)}
                  style={{ padding: isCompact ? '2px 4px' : '4px 8px' }}
                />
              </Tooltip>
            </Space>
          );
        }
      },
    },
  ];

  // 错误处理
  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="业务类型配置加载失败"
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

  if (!currentProject) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="请先选择项目"
          description="业务类型配置需要选择一个项目后才能使用"
          type="warning"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题和说明 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <SettingOutlined /> 业务类型配置
        </Title>
        <Text type="secondary">
          配置业务类型的生成模式（单阶段/两阶段）和对应的提示词组合
        </Text>
      </div>

      {/* 说明信息 */}
      <Alert
        message="配置说明"
        description={
          <div>
            <p><strong>单阶段生成：</strong>直接根据业务描述生成测试用例，适合简单业务场景</p>
            <p><strong>两阶段生成：</strong>先生成测试点，再根据测试点生成详细的测试用例，适合复杂业务场景</p>
            <p>每个业务类型都需要配置相应的提示词组合才能正常工作</p>
          </div>
        }
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 24 }}
      />

      {/* 快速配置模板 */}
      <Card title="快速配置模板" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          {Object.entries(CONFIGURATION_TEMPLATES).map(([key, template]) => {
            const applicableCount = businessTypesData?.items?.filter(business =>
              template.recommended_for.includes(business.code)
            ).length || 0;

            return (
              <Col xs={24} sm={12} md={6} key={key}>
                <Card
                  size="small"
                  hoverable
                  style={{ height: '100%' }}
                  bodyStyle={{ padding: '16px' }}
                  actions={[
                    <Button
                      key="apply"
                      type="primary"
                      size="small"
                      disabled={applicableCount === 0}
                      loading={setBatchGenerationModeMutation.isPending}
                      onClick={() => handleBatchConfiguration(key)}
                    >
                      {template.icon} 应用到 {applicableCount} 个业务
                    </Button>
                  ]}
                >
                  <Card.Meta
                    avatar={
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        background: template.generation_mode === 'single_stage' ? '#f6ffed' : '#e6f7ff'
                      }}>
                        {template.icon}
                      </div>
                    }
                    title={
                      <Space direction="vertical" size={0}>
                        <Text strong style={{ fontSize: '14px' }}>{template.name}</Text>
                        <Tag
                          color={template.generation_mode === 'single_stage' ? 'green' : 'blue'}
                          size="small"
                        >
                          {template.generation_mode === 'single_stage' ? '单阶段' : '两阶段'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <div style={{ marginTop: '8px' }}>
                        <Text type="secondary" style={{ fontSize: '12px', lineHeight: '1.4' }}>
                          {template.description}
                        </Text>
                        <div style={{ marginTop: '8px' }}>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            适用于：
                          </Text>
                          <div style={{ marginTop: '4px' }}>
                            {template.recommended_for.slice(0, 4).map(code => (
                              <Tag key={code} size="small" style={{ margin: '2px' }}>
                                {code}
                              </Tag>
                            ))}
                            {template.recommended_for.length > 4 && (
                              <Tag size="small" style={{ margin: '2px' }}>
                                +{template.recommended_for.length - 4}
                              </Tag>
                            )}
                          </div>
                        </div>
                      </div>
                    }
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* 业务类型列表 */}
      <Card title={`业务类型列表 (${businessTypesData?.total || 0})`}>
        <Table
          columns={columns}
          dataSource={businessTypesData?.items || []}
          rowKey="id"
          loading={isLoading}
          scroll={{
            x: isVeryCompact ? 600 : isCompact ? 800 : undefined,
            y: 'calc(100vh - 400px)'
          }}
          size={isVeryCompact ? 'small' : 'middle'}
          pagination={{
            current: currentPage,
            total: businessTypesData?.total || 0,
            pageSize,
            showSizeChanger: !isVeryCompact,
            showQuickJumper: !isVeryCompact,
            showTotal: (total, range) =>
              isVeryCompact ?
              `${range[0]}-${range[1]}/${total}` :
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
            onChange: (page) => setCurrentPage(page),
            ...(isVeryCompact && {
              simple: true,
              pageSizeOptions: ['10', '20']
            })
          }}
          locale={{
            emptyText: <Empty description="暂无业务类型数据" />
          }}
        />
      </Card>

      {/* 配置模态框 */}
      <Modal
        title={
          <span>
            <SettingOutlined /> 配置业务类型：{editingBusiness?.name}
          </span>
        }
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        {editingBusiness && (
          <BusinessTypeConfigForm
            business={editingBusiness}
            currentMode={generationModes?.[editingBusiness.code]}
            onSave={handleSaveConfig}
            onCancel={() => setConfigModalVisible(false)}
            loading={setGenerationModeMutation.isPending}
          />
        )}
      </Modal>
    </div>
  );
};

// 业务类型配置表单组件
interface BusinessTypeConfigFormProps {
  business: BusinessType;
  currentMode?: GenerationModeResponse;
  onSave: (values: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

const BusinessTypeConfigForm: React.FC<BusinessTypeConfigFormProps> = ({
  business,
  currentMode,
  onSave,
  onCancel,
  loading = false
}) => {
  const [form] = Form.useForm();

  // 获取推荐的模板
  const recommendedTemplate = React.useMemo(() => {
    for (const [key, template] of Object.entries(CONFIGURATION_TEMPLATES)) {
      if (template.recommended_for.includes(business.code)) {
        return { key, ...template };
      }
    }
    return null;
  }, [business.code]);

  useEffect(() => {
    if (currentMode) {
      form.setFieldsValue({
        generation_mode: currentMode.generation_mode,
        test_point_combination_id: currentMode.test_point_combination_id,
        test_case_combination_id: currentMode.test_case_combination_id,
      });
    } else {
      // 如果没有现有配置，使用推荐的模板
      form.setFieldsValue({
        generation_mode: recommendedTemplate?.generation_mode || 'single_stage',
      });
    }
  }, [currentMode, form, recommendedTemplate]);

  const handleFinish = (values: any) => {
    onSave(values);
  };

  const handleApplyTemplate = () => {
    if (recommendedTemplate) {
      form.setFieldsValue({
        generation_mode: recommendedTemplate.generation_mode,
      });
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
    >
      {/* 推荐配置模板提示 */}
      {recommendedTemplate && (
        <Alert
          message={
            <Space>
              <Text strong>推荐配置模板</Text>
              <Tag color="blue">{recommendedTemplate.icon} {recommendedTemplate.name}</Tag>
            </Space>
          }
          description={
            <div>
              <Text type="secondary">{recommendedTemplate.description}</Text>
              <div style={{ marginTop: '8px' }}>
                <Button
                  size="small"
                  type="primary"
                  ghost
                  onClick={handleApplyTemplate}
                >
                  应用模板配置
                </Button>
                <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
                  推荐使用 {recommendedTemplate.generation_mode === 'single_stage' ? '单阶段' : '两阶段'} 生成模式
                </Text>
              </div>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form.Item
        label={
          <Space>
            <span>生成模式</span>
            <Tooltip title="选择适合该业务类型的生成模式，这会影响测试用例生成的质量和效率">
              <InfoCircleOutlined style={{ color: '#999' }} />
            </Tooltip>
          </Space>
        }
        name="generation_mode"
        rules={[{ required: true, message: '请选择生成模式' }]}
      >
        <Select placeholder="请选择生成模式">
          <Option value="single_stage">
            <Space>
              <Text>单阶段生成</Text>
              <Tag color="green" size="small">快速</Tag>
            </Space>
          </Option>
          <Option value="two_stage">
            <Space>
              <Text>两阶段生成</Text>
              <Tag color="blue" size="small">高质量</Tag>
            </Space>
          </Option>
        </Select>
      </Form.Item>

      <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.generation_mode !== currentValues.generation_mode}>
        {({ getFieldValue }) => {
          const generationMode = getFieldValue('generation_mode');

          if (generationMode === 'two_stage') {
            return (
              <>
                <Divider>两阶段生成配置</Divider>

                <Form.Item
                  label="测试点生成提示词组合"
                  name="test_point_combination_id"
                  rules={[{ required: true, message: '请选择测试点生成提示词组合' }]}
                >
                  <PromptCombinationSelector
                    placeholder="请选择测试点生成提示词组合"
                    businessType={business.code}
                  />
                </Form.Item>

                <Form.Item
                  label="测试用例生成提示词组合"
                  name="test_case_combination_id"
                  rules={[{ required: true, message: '请选择测试用例生成提示词组合' }]}
                >
                  <PromptCombinationSelector
                    placeholder="请选择测试用例生成提示词组合"
                    businessType={business.code}
                  />
                </Form.Item>

                <Alert
                  message="两阶段生成说明"
                  description="两阶段生成会先使用测试点提示词组合生成结构化的测试点，然后使用测试用例提示词组合根据测试点生成详细的测试用例。"
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              </>
            );
          }

          return null;
        }}
      </Form.Item>

      <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
            保存配置
          </Button>
          <Button onClick={onCancel} icon={<CloseOutlined />}>
            取消
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default BusinessTypeConfig;