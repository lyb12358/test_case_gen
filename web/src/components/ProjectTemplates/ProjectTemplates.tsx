import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Tag,
  Modal,
  Form,
  Input,
  message,
  Divider,
  Spin,
  Alert
} from 'antd';
import {
  FileOutlined,
  PlusOutlined,
  CopyOutlined,
  CheckOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { projectService, ProjectCreate } from '../../services/projectService';
import { useProject } from '../../contexts/ProjectContext';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  businessTypes: string[];
  icon: string;
  category: string;
  color: string;
}

// Project template definitions - updated with real business types from the system
const getProjectTemplateDefinitions = (availableBusinessTypes: string[]): ProjectTemplate[] => {
  const businessTypeGroups = {
    // Climate & Environment
    climate: availableBusinessTypes.filter(bt => ['RCC', 'RFD', 'RPP', 'RHL', 'ZAB', 'ZAE', 'ZAF', 'ZAJ', 'ZAM'].includes(bt)),
    // Access & Security
    security: availableBusinessTypes.filter(bt => ['RDL_RDU', 'RDO_RDC', 'RCE', 'RES', 'ZAD', 'ZAG', 'ZAH'].includes(bt)),
    // Air Quality & Purification
    air: availableBusinessTypes.filter(bt => ['PAI', 'PAB', 'ZAV'].includes(bt)),
    // Smart Features
    smart: availableBusinessTypes.filter(bt => ['PAB', 'ZAY', 'VIVO_WATCH', 'RWS', 'RSM', 'ZAS'].includes(bt)),
    // Energy & Battery
    energy: availableBusinessTypes.filter(bt => ['ZAN', 'ZBB', 'PAE'].includes(bt))
  };

  return [
    {
      id: 'remote-control',
      name: '远控场景',
      description: `TSP远程控制业务场景，包含所有${availableBusinessTypes.length}个远控业务类型`,
      businessTypes: availableBusinessTypes, // Include all available business types
      icon: '🚗',
      category: '基础场景',
      color: '#1890ff'
    },
    {
      id: 'climate-control',
      name: '气候与环境控制',
      description: `环境控制相关业务场景，包含${businessTypeGroups.climate.length}个业务类型`,
      businessTypes: businessTypeGroups.climate,
      icon: '🌡️',
      category: '环境控制',
      color: '#52c41a'
    },
    {
      id: 'security-access',
      name: '安全与访问控制',
      description: `车辆安全、门锁、访问控制相关业务场景，包含${businessTypeGroups.security.length}个业务类型`,
      businessTypes: businessTypeGroups.security,
      icon: '🔒',
      category: '安全系统',
      color: '#fa8c16'
    },
    {
      id: 'air-quality',
      name: '空气质量与净化',
      description: `空气净化和空调系统相关业务场景，包含${businessTypeGroups.air.length}个业务类型`,
      businessTypes: businessTypeGroups.air,
      icon: '🌬️',
      category: '环境控制',
      color: '#13c2c2'
    },
    {
      id: 'smart-features',
      name: '智能功能',
      description: `智能座舱、娱乐、交互功能相关业务场景，包含${businessTypeGroups.smart.length}个业务类型`,
      businessTypes: businessTypeGroups.smart,
      icon: '✨',
      category: '智能系统',
      color: '#722ed1'
    },
    {
      id: 'energy-management',
      name: '能源与电池管理',
      description: `电池管理、预热、能源相关业务场景，包含${businessTypeGroups.energy.length}个业务类型`,
      businessTypes: businessTypeGroups.energy,
      icon: '🔋',
      category: '能源系统',
      color: '#eb2f96'
    }
  ].filter(template => template.businessTypes.length > 0); // Only show templates with available business types
};

interface ProjectTemplatesProps {
  visible: boolean;
  onCancel: () => void;
  onSelect: (template: ProjectTemplate) => void;
  onCreateCustom: () => void;
}

const ProjectTemplates: React.FC<ProjectTemplatesProps> = ({
  visible,
  onCancel,
  onSelect,
  onCreateCustom
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [customFormVisible, setCustomFormVisible] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { selectProject } = useProject();

  // Load business types from API
  const { data: businessTypesData, isLoading: businessTypesLoading } = useQuery({
    queryKey: ['business-types'],
    queryFn: async () => {
      const response = await apiClient.get('/business-types');
      return response.data.business_types || [];
    },
    enabled: visible,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get dynamic project templates based on available business types
  const projectTemplates = businessTypesData
    ? getProjectTemplateDefinitions(businessTypesData)
    : [];

  const handleTemplateSelect = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setSubmitting(true);

      // 基于模板创建项目
      const projectData: ProjectCreate = {
        name: `${selectedTemplate.name} - ${new Date().toLocaleDateString()}`,
        description: selectedTemplate.description,
        is_active: true
      };

      const newProject = await projectService.createProject(projectData);
      message.success(`基于模板创建项目 "${newProject.name}" 成功`);

      selectProject(newProject);
      onSelect(selectedTemplate);
      onCancel();
    } catch (error: any) {
      message.error(error.message || '创建项目失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCustom = async (values: any) => {
    try {
      setSubmitting(true);

      const projectData: ProjectCreate = {
        name: values.name,
        description: values.description,
        is_active: true
      };

      const newProject = await projectService.createProject(projectData);
      message.success(`自定义项目 "${newProject.name}" 创建成功`);

      selectProject(newProject);
      setCustomFormVisible(false);
      onCancel();
    } catch (error: any) {
      message.error(error.message || '创建项目失败');
    } finally {
      setSubmitting(false);
    }
  };

  const groupedTemplates = projectTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, ProjectTemplate[]>);

  return (
    <Modal
      title={
        <Space>
          <FileOutlined />
          选择项目模板
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={1000}
      footer={null}
      destroyOnClose
    >
      <div style={{ marginBottom: 24 }}>
        <Text type="secondary">
          选择一个项目模板快速开始，或者创建自定义项目。模板包含了预设的业务类型和推荐配置。
        </Text>
      </div>

      {/* Loading State */}
      {businessTypesLoading && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>正在加载业务类型...</div>
        </div>
      )}

      {/* API Error State */}
      {!businessTypesLoading && !businessTypesData && (
        <Alert
          message="加载业务类型失败"
          description="无法从服务器获取业务类型列表，请刷新页面重试。"
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Preset Templates */}
      {!businessTypesLoading && businessTypesData && (
        <div style={{ marginBottom: 24 }}>
          <Alert
            message="基于真实业务数据"
            description={`系统已加载 ${businessTypesData.length} 个可用的业务类型，以下模板会根据实际可用的业务类型自动生成。`}
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
          <Title level={4}>预设模板</Title>
          {Object.entries(groupedTemplates).map(([category, templates]) => (
          <div key={category} style={{ marginBottom: 24 }}>
            <Tag color="blue" style={{ marginBottom: 12 }}>
              {category}
            </Tag>
            <Row gutter={[16, 16]}>
              {templates.map((template) => (
                <Col xs={24} sm={12} lg={8} key={template.id}>
                  <Card
                    hoverable
                    style={{
                      borderColor: selectedTemplate?.id === template.id ? template.color : undefined,
                      borderWidth: selectedTemplate?.id === template.id ? 2 : 1,
                    }}
                    onClick={() => handleTemplateSelect(template)}
                    actions={[
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTemplate(template);
                          handleCreateFromTemplate();
                        }}
                        disabled={!selectedTemplate || selectedTemplate.id !== template.id}
                      >
                        使用模板
                      </Button>
                    ]}
                  >
                    <Card.Meta
                      avatar={
                        <div style={{
                          fontSize: 32,
                          textAlign: 'center',
                          width: 48,
                          height: 48,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: `${template.color}15`,
                          borderRadius: '50%'
                        }}>
                          {template.icon}
                        </div>
                      }
                      title={
                        <Space>
                          <Text strong>{template.name}</Text>
                          {selectedTemplate?.id === template.id && (
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          )}
                        </Space>
                      }
                      description={
                        <div>
                          <Paragraph
                            ellipsis={{ rows: 2 }}
                            style={{ marginBottom: 8 }}
                          >
                            {template.description}
                          </Paragraph>
                          <Space wrap>
                            {template.businessTypes.slice(0, 3).map(type => (
                              <Tag key={type}>{type}</Tag>
                            ))}
                            {template.businessTypes.length > 3 && (
                              <Tag>+{template.businessTypes.length - 3}</Tag>
                            )}
                          </Space>
                        </div>
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        ))}
        </div>
      )}

      <Divider />

      {/* 自定义项目 */}
      <div>
        <Title level={4}>自定义项目</Title>
        <Card
          hoverable
          style={{ textAlign: 'center', padding: '32px' }}
          onClick={() => setCustomFormVisible(true)}
        >
          <Space direction="vertical" size="large">
            <div style={{ fontSize: 48 }}>🎯</div>
            <div>
              <Title level={5} style={{ margin: 0 }}>创建自定义项目</Title>
              <Text type="secondary">
                从零开始创建完全自定义的项目配置
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
            >
              创建自定义项目
            </Button>
          </Space>
        </Card>
      </div>

      {/* 自定义项目表单 */}
      <Modal
        title="创建自定义项目"
        open={customFormVisible}
        onCancel={() => setCustomFormVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateCustom}
        >
          <Form.Item
            name="name"
            label="项目名称"
            rules={[
              { required: true, message: '请输入项目名称' },
              { max: 100, message: '项目名称不能超过100个字符' }
            ]}
          >
            <Input placeholder="例如：我的自定义项目" />
          </Form.Item>

          <Form.Item
            name="description"
            label="项目描述"
            rules={[
              { max: 500, message: '项目描述不能超过500个字符' }
            ]}
          >
            <TextArea
              rows={4}
              placeholder="请描述这个项目的用途和包含的业务场景..."
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCustomFormVisible(false)}>
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
              >
                创建项目
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
};

export default ProjectTemplates;