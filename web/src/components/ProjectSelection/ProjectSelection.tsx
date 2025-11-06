import React, { useState, useEffect } from 'react';
import {
  Modal,
  Card,
  Button,
  Input,
  Form,
  Select,
  Typography,
  Space,
  List,
  Tag,
  Empty,
  message,
  Spin,
  Divider
} from 'antd';
import {
  PlusOutlined,
  ProjectOutlined,
  CheckOutlined,
  EditOutlined,
  FileOutlined
} from '@ant-design/icons';
import { projectService, Project, ProjectCreate } from '../../services/projectService';
import ProjectTemplates from '../ProjectTemplates/ProjectTemplates';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface ProjectSelectionProps {
  visible: boolean;
  onCancel: () => void;
  onSelect: (project: Project) => void;
  currentProjectId?: number;
}

const ProjectSelection: React.FC<ProjectSelectionProps> = ({
  visible,
  onCancel,
  onSelect,
  currentProjectId
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [templateMode, setTemplateMode] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Load projects when modal opens
  useEffect(() => {
    if (visible) {
      loadProjects();
    }
  }, [visible]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await projectService.getProjects(true);
      setProjects(response.projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      message.error('加载项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (values: ProjectCreate) => {
    try {
      setSubmitting(true);
      const newProject = await projectService.createProject(values);
      message.success('项目创建成功');

      // Reset form and switch back to selection mode
      form.resetFields();
      setCreateMode(false);

      // Reload projects and select the new one
      await loadProjects();
      onSelect(newProject);
    } catch (error: any) {
      console.error('Failed to create project:', error);
      message.error(error.message || '创建项目失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectProject = (project: Project) => {
    onSelect(project);
    onCancel();
  };

  const toggleCreateMode = () => {
    setCreateMode(!createMode);
    if (!createMode) {
      form.resetFields();
    }
  };

  const toggleTemplateMode = () => {
    setTemplateMode(!templateMode);
    if (!templateMode) {
      form.resetFields();
    }
  };

  const handleTemplateSelect = (template: any) => {
    // 模板选择后会自动创建项目并选择
    // 这里可以添加额外的处理逻辑
    console.log('Template selected:', template);
  };

  return (
    <Modal
      title={
        <Space>
          <ProjectOutlined />
          {templateMode ? '选择项目模板' : createMode ? '创建新项目' : '选择项目'}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={720}
      footer={null}
      destroyOnHidden
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>加载项目列表...</div>
        </div>
      ) : templateMode ? (
        // Template Selection Mode
        <ProjectTemplates
          visible={templateMode}
          onCancel={() => {
            setTemplateMode(false);
          }}
          onSelect={handleTemplateSelect}
          onCreateCustom={() => {
            setTemplateMode(false);
            setCreateMode(true);
          }}
        />
      ) : createMode ? (
        // Create Project Form
        <div>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateProject}
            initialValues={{
              is_active: true
            }}
          >
            <Form.Item
              name="name"
              label="项目名称"
              rules={[
                { required: true, message: '请输入项目名称' },
                { max: 100, message: '项目名称不能超过100个字符' }
              ]}
            >
              <Input placeholder="例如：智能座舱项目" />
            </Form.Item>

            <Form.Item
              name="description"
              label="项目描述"
              rules={[
                { max: 500, message: '项目描述不能超过500个字符' }
              ]}
            >
              <Input.TextArea
                rows={4}
                placeholder="请描述这个项目的用途和包含的业务场景..."
              />
            </Form.Item>

            <Form.Item
              name="is_active"
              label="项目状态"
              valuePropName="checked"
            >
              <Select>
                <Option value={true}>激活</Option>
                <Option value={false}>停用</Option>
              </Select>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={toggleCreateMode}>
                  取消
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  icon={<PlusOutlined />}
                >
                  创建项目
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      ) : (
        // Project Selection
        <div>
          <div style={{ marginBottom: 16 }}>
            <Space split={<Divider type="vertical" />}>
              <Title level={5} style={{ margin: 0 }}>
                可选择项目 ({projects.length})
              </Title>
              <Button
                icon={<FileOutlined />}
                onClick={toggleTemplateMode}
              >
                使用模板
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={toggleCreateMode}
              >
                创建新项目
              </Button>
            </Space>
          </div>

          {projects.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无项目"
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={toggleCreateMode}
              >
                创建第一个项目
              </Button>
            </Empty>
          ) : (
            <List
              grid={{
                gutter: 16,
                xs: 1,
                sm: 1,
                md: 2,
                lg: 2,
                xl: 2,
                xxl: 2,
              }}
              dataSource={projects}
              renderItem={(project) => (
                <List.Item>
                  <Card
                    hoverable
                    className={`project-card ${
                      currentProjectId === project.id ? 'selected' : ''
                    }`}
                    onClick={() => handleSelectProject(project)}
                    actions={[
                      <Button
                        type="text"
                        icon={<CheckOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectProject(project);
                        }}
                      >
                        选择
                      </Button>
                    ]}
                    style={{
                      borderColor: currentProjectId === project.id ? '#1890ff' : undefined,
                      borderWidth: currentProjectId === project.id ? 2 : 1,
                    }}
                  >
                    <Card.Meta
                      avatar={
                        <ProjectOutlined
                          style={{
                            fontSize: 24,
                            color: currentProjectId === project.id ? '#1890ff' : '#666'
                          }}
                        />
                      }
                      title={
                        <Space>
                          <Text strong>{project.name}</Text>
                          {currentProjectId === project.id && (
                            <Tag color="blue">当前项目</Tag>
                          )}
                          {!project.is_active && (
                            <Tag color="default">已停用</Tag>
                          )}
                        </Space>
                      }
                      description={
                        <div>
                          <Paragraph
                            ellipsis={{ rows: 2, expandable: false }}
                            style={{ marginBottom: 8 }}
                          >
                            {project.description || '暂无描述'}
                          </Paragraph>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            创建时间: {new Date(project.created_at).toLocaleDateString()}
                          </Text>
                        </div>
                      }
                    />
                  </Card>
                </List.Item>
              )}
            />
          )}
        </div>
      )}
    </Modal>
  );
};

export default ProjectSelection;