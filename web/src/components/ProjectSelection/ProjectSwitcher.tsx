import React, { useState } from 'react';
import {
  Button,
  Dropdown,
  Space,
  Typography,
  Modal,
  message
} from 'antd';
import {
  ProjectOutlined,
  DownOutlined
} from '@ant-design/icons';
import { useProject } from '../../contexts/ProjectContext';
import ProjectSelection from './ProjectSelection';
import { ProjectCreate } from '../../services/projectService';

const { Text } = Typography;

const ProjectSwitcher: React.FC = () => {
  const { currentProject, projects, selectProject, createProject } = useProject();
  const [selectionVisible, setSelectionVisible] = useState(false);

  const handleProjectSelect = (project: any) => {
    if (project.key === 'create') {
      // This will be handled by the ProjectSelection modal
      setSelectionVisible(true);
    } else if (project.key === 'manage') {
      // Navigate to project management (to be implemented)
      message.info('项目管理功能开发中...');
    } else {
      const projectId = parseInt(project.key);
      const selectedProject = projects.find(p => p.id === projectId);
      if (selectedProject) {
        selectProject(selectedProject);
      }
    }
  };

  const handleCreateProject = async (projectData: ProjectCreate) => {
    try {
      const newProject = await createProject(projectData);
      selectProject(newProject);
      setSelectionVisible(false);
      message.success(`项目 "${newProject.name}" 创建成功`);
    } catch (error: any) {
      message.error(error.message || '创建项目失败');
    }
  };

  const dropdownItems = [
    {
      key: 'current',
      label: (
        <Space>
          <ProjectOutlined />
          <Text strong>{currentProject?.name || '选择项目'}</Text>
        </Space>
      ),
      disabled: true,
      style: { fontWeight: 500 }
    },
    {
      type: 'divider',
    },
    ...projects.map(project => ({
      key: project.id.toString(),
      label: (
        <Space>
          <Text>{project.name}</Text>
          {currentProject?.id === project.id && (
            <Text type="success">✓</Text>
          )}
          {!project.is_active && (
            <Text type="secondary">(已停用)</Text>
          )}
        </Space>
      ),
      disabled: currentProject?.id === project.id,
    })),
    {
      type: 'divider',
    },
    {
      key: 'create',
      label: (
        <Text style={{ color: '#1890ff' }}>+ 创建新项目</Text>
      ),
    },
    {
      key: 'manage',
      label: '项目管理',
    },
  ];

  return (
    <>
      <Dropdown
        menu={{
          items: dropdownItems,
          onClick: handleProjectSelect,
          style: { maxHeight: 400, overflow: 'auto' },
        }}
        trigger={['click']}
        placement="bottomLeft"
      >
        <Button
          type="text"
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            border: 'none',
            background: 'transparent'
          }}
        >
          <Space style={{ maxWidth: 180, alignItems: 'center' }}>
            <ProjectOutlined style={{ color: '#1890ff' }} />
            <Text
              ellipsis={{ tooltip: true }}
              style={{ maxWidth: 140, fontWeight: 500 }}
            >
              {currentProject?.name || '选择项目'}
            </Text>
            <DownOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
          </Space>
        </Button>
      </Dropdown>

      <ProjectSelection
        visible={selectionVisible}
        onCancel={() => setSelectionVisible(false)}
        onSelect={(project) => {
          selectProject(project);
          setSelectionVisible(false);
        }}
        currentProjectId={currentProject?.id}
      />
    </>
  );
};

export default ProjectSwitcher;