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
  Switch,
  message,
  Popconfirm,
  Statistic,
  Row,
  Col,
  Tooltip,
  Badge,
  Progress,
  Empty
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ProjectOutlined,
  BarChartOutlined,
  TeamOutlined,
  FileTextOutlined,
  SettingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { projectService, Project, ProjectCreate, ProjectUpdate, ProjectStats } from '../../services/projectService';
import { useProject } from '../../contexts/ProjectContext';
import ProjectSelection from '../../components/ProjectSelection';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const ProjectManager: React.FC = () => {
  const { currentProject, projects, loadProjects, selectProject } = useProject();
  const [loading, setLoading] = useState(false);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [projectStats, setProjectStats] = useState<Record<number, ProjectStats>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProjectData();
  }, []);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      await loadProjects();

      // 获取每个项目的统计信息
      const statsPromises = projects.map(async (project) => {
        try {
          const statsResponse = await projectService.getProjectStats(project.id);
          return { [project.id]: statsResponse.projects[0] };
        } catch (error) {
          console.warn(`Failed to load stats for project ${project.id}:`, error);
          return { [project.id]: {} as ProjectStats };
        }
      });

      const statsResults = await Promise.all(statsPromises);
      const combinedStats = statsResults.reduce((acc, stats) => ({ ...acc, ...stats }), {});
      setProjectStats(combinedStats);
    } catch (error) {
      console.error('Failed to load project data:', error);
      message.error('加载项目数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = () => {
    setEditingProject(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    form.setFieldsValue({
      name: project.name,
      description: project.description,
      is_active: project.is_active
    });
    setModalVisible(true);
  };

  const handleDeleteProject = async (project: Project) => {
    if (project.name === '远控场景') {
      message.error('不能删除默认的"远控场景"项目');
      return;
    }

    try {
      await projectService.deleteProject(project.id);
      message.success(`项目 "${project.name}" 已删除`);
      await loadProjectData();

      // 如果删除的是当前项目，切换到默认项目
      if (currentProject?.id === project.id) {
        const defaultProject = projects.find(p => p.name === '远控场景');
        if (defaultProject) {
          selectProject(defaultProject);
        }
      }
    } catch (error: any) {
      message.error(error.message || '删除项目失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);

      if (editingProject) {
        // 更新项目
        const updatedProject = await projectService.updateProject(editingProject.id, values);
        message.success(`项目 "${updatedProject.name}" 更新成功`);
      } else {
        // 创建项目
        const newProject = await projectService.createProject(values);
        message.success(`项目 "${newProject.name}" 创建成功`);
      }

      setModalVisible(false);
      await loadProjectData();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Project) => (
        <Space>
          <ProjectOutlined />
          <div>
            <Text strong>{text}</Text>
            {record.name === '远控场景' && (
              <Tag color="blue" style={{ marginLeft: 8 }}>默认项目</Tag>
            )}
            {currentProject?.id === record.id && (
              <Tag color="green">当前项目</Tag>
            )}
            {!record.is_active && (
              <Tag color="default">已停用</Tag>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => (
        <Text type="secondary" title={text}>
          {text || '暂无描述'}
        </Text>
      ),
    },
    {
      title: '测试用例',
      key: 'test_cases',
      render: (_: any, record: Project) => {
        const stats = projectStats[record.id];
        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">组: </Text>
              <Text strong>{stats?.test_case_groups_count || 0}</Text>
            </div>
            <div>
              <Text type="secondary">用例: </Text>
              <Text strong>{stats?.test_cases_count || 0}</Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: '其他资源',
      key: 'resources',
      render: (_: any, record: Project) => {
        const stats = projectStats[record.id];
        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">任务: </Text>
              <Text>{stats?.generation_jobs_count || 0}</Text>
            </div>
            <div>
              <Text type="secondary">提示词: </Text>
              <Text>{stats?.prompts_count || 0}</Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'status',
      render: (isActive: boolean) => (
        <Badge
          status={isActive ? 'success' : 'default'}
          text={isActive ? '激活' : '停用'}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Project) => (
        <Space>
          <Tooltip title="编辑项目">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditProject(record)}
            />
          </Tooltip>
          <Tooltip title="切换到此项目">
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={() => selectProject(record)}
              disabled={currentProject?.id === record.id}
            />
          </Tooltip>
          {record.name !== '远控场景' && (
            <Popconfirm
              title="确定要删除这个项目吗？"
              description="删除后，项目下的所有数据将被标记为已删除。"
              onConfirm={() => handleDeleteProject(record)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除项目">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const totalStats = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.is_active).length,
    totalTestCases: Object.values(projectStats).reduce((sum, stats) => sum + (stats.test_cases_count || 0), 0),
    totalPrompts: Object.values(projectStats).reduce((sum, stats) => sum + (stats.prompts_count || 0), 0),
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面操作按钮 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadProjectData}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateProject}
          >
            创建项目
          </Button>
        </Space>
      </div>

      {/* 统计概览 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总项目数"
              value={totalStats.totalProjects}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="激活项目"
              value={totalStats.activeProjects}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix={`/ ${totalStats.totalProjects}`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="测试用例总数"
              value={totalStats.totalTestCases}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="提示词总数"
              value={totalStats.totalPrompts}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 项目列表 */}
      <Card title="项目列表">
        {projects.length === 0 ? (
          <Empty
            description="暂无项目"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateProject}
            >
              创建第一个项目
            </Button>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={projects}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 个项目`,
            }}
          />
        )}
      </Card>

      {/* 创建/编辑项目模态框 */}
      <Modal
        title={editingProject ? '编辑项目' : '创建新项目'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            is_active: true
          }}
        >
          <Form.Item
            name="name"
            label="项目名称"
            rules={[
              { required: true, message: '请输入项目名称' },
              { max: 100, message: '项目名称不能超过100个字符' },
              {
                validator: (_, value) => {
                  if (!value || editingProject) return Promise.resolve();

                  const isDuplicate = projects.some(
                    p => p.name === value && p.id !== editingProject?.id
                  );

                  if (isDuplicate) {
                    return Promise.reject(new Error('项目名称已存在'));
                  }
                  return Promise.resolve();
                }
              }
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
            <TextArea
              rows={4}
              placeholder="请描述这个项目的用途和包含的业务场景..."
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="项目状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="激活" unCheckedChildren="停用" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
              >
                {editingProject ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectManager;