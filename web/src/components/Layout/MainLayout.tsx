import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout as AntLayout,
  Menu,
  Button,
  theme,
  Typography,
  Space,
  Badge,
  Progress,
  Tooltip,
} from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  RocketOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  ClockCircleOutlined,
  EditOutlined,
  SettingOutlined,
  BuildOutlined,
  ThunderboltOutlined,
  DeploymentUnitOutlined,
} from '@ant-design/icons';
import { useTask } from '@/contexts/TaskContext';
import { useProject } from '@/contexts/ProjectContext';
import { ProjectSwitcher } from '@/components/ProjectSelection';
import BreadcrumbNavigation from '@/components/Navigation/BreadcrumbNavigation';
import HeaderBreadcrumbNavigation from '@/components/Navigation/HeaderBreadcrumbNavigation';
import './MainLayout.less';

const { Header, Sider, Content } = AntLayout;
const { Title } = Typography;

interface MainLayoutProps {
  children?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { state: taskState } = useTask();
  const { currentProject } = useProject();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: '/knowledge-graph',
      icon: <ShareAltOutlined />,
      label: 'TSP本体图谱',
    },
    {
      key: '/projects',
      icon: <SettingOutlined />,
      label: '项目管理',
    },
    {
      key: '/business-management',
      icon: <BuildOutlined />,
      label: '业务管理',
    },
    {
      key: '/test-management',
      icon: <FileTextOutlined />,
      label: '测试管理',
      children: [
        {
          key: '/test-management/points',
          label: '测试点管理',
        },
        {
          key: '/test-management/cases',
          label: '测试用例管理',
        },
        {
          key: '/test-management/generate',
          label: '批量生成',
        },
      ],
    },
    {
      key: '/prompts',
      icon: <EditOutlined />,
      label: '提示词管理',
      children: [
        {
          key: '/prompts/list',
          label: '提示词列表',
        },
      ],
    },
    {
      key: '/tasks',
      icon: <RocketOutlined />,
      label: '任务管理',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const getSelectedKeys = () => {
    const pathname = location.pathname;
    if (pathname === '/' || pathname === '/dashboard') {
      return ['/dashboard'];
    }
    // Handle new unified test management routes
    if (pathname.startsWith('/test-management')) {
      if (pathname === '/test-management') {
        return ['/test-management'];
      }
      if (pathname.startsWith('/test-management/points')) {
        return ['/test-management/points'];
      }
      if (pathname.startsWith('/test-management/cases')) {
        return ['/test-management/cases'];
      }
      if (pathname.startsWith('/test-management/generate')) {
        return ['/test-management/generate'];
      }
      return ['/test-management'];
    }
    if (pathname.startsWith('/prompts')) {
      return ['/prompts/list'];
    }
    if (pathname.startsWith('/business-management')) {
      if (pathname === '/business-management/config') {
        return ['/business-management/config'];
      }
      return ['/business-management'];
    }
    if (pathname.startsWith('/tasks')) {
      return ['/tasks'];
    }
    if (pathname.startsWith('/projects')) {
      return ['/projects'];
    }
    if (pathname.startsWith('/knowledge-graph')) {
      return ['/knowledge-graph'];
    }
    return [pathname];
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light">
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? 0 : '0 16px',
            background: colorBgContainer,
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {collapsed ? (
            <img src="/logo.svg" alt="Logo" style={{ width: 24, height: 24 }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/logo.svg" alt="Logo" style={{ width: 20, height: 20 }} />
              <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                测试用例生成
              </Title>
            </div>
          )}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <AntLayout>
        <Header
          className="main-layout-header"
          style={{
            padding: '0 16px',
            background: colorBgContainer,
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 64,
          }}
        >
          <div className="header-left-section">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 64,
                height: 64,
              }}
            />

            {/* Header Breadcrumb Navigation */}
            <HeaderBreadcrumbNavigation />
          </div>

          <Space className="header-right-section">
            {/* 项目切换器 */}
            <div className="project-switcher">
              <ProjectSwitcher />
            </div>

            {/* 紧凑的任务状态显示 */}
            {taskState.currentTask && (
              <Tooltip
                title={
                  <div>
                    <div>任务ID: #{taskState.currentTask.id}</div>
                    <div>业务类型: {taskState.currentTask.business_type}</div>
                    <div>状态: {taskState.currentTask.status === 'completed' ? '已完成' :
                           taskState.currentTask.status === 'running' ? '进行中' :
                           taskState.currentTask.status === 'failed' ? '失败' : '等待中'}</div>
                  </div>
                }
              >
                <Button
                  type="text"
                  size="small"
                  icon={<ClockCircleOutlined />}
                  onClick={() => navigate('/test-cases/generate')}
                  className="task-status-button"
                  style={{
                    color: taskState.currentTask.status === 'running' ? '#1890ff' : '#8c8c8c',
                    padding: '4px 8px',
                    height: 'auto'
                  }}
                >
                  {taskState.isPolling && (
                    <Progress
                      percent={taskState.currentTask.progress || 0}
                      size="small"
                      style={{ width: 60, marginRight: 4 }}
                      showInfo={false}
                    />
                  )}
                  {taskState.currentTask.status === 'completed' ? '完成' :
                   taskState.currentTask.status === 'running' ? '生成中' :
                   taskState.currentTask.status === 'failed' ? '失败' : '处理'}
                </Button>
              </Tooltip>
            )}

            <Tooltip title="刷新页面">
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                style={{ padding: '4px 8px', height: 'auto' }}
              />
            </Tooltip>
          </Space>
        </Header>
        <Content
          style={{
            margin: '16px',
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 'calc(100vh - 96px)',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default MainLayout;