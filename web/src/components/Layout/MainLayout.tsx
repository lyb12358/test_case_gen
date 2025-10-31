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
  TagsOutlined,
} from '@ant-design/icons';
import { useTask } from '@/contexts/TaskContext';

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
      key: '/test-cases',
      icon: <FileTextOutlined />,
      label: '测试用例管理',
      children: [
        {
          key: '/test-cases/list',
          label: '测试用例列表',
        },
        {
          key: '/test-cases/generate',
          label: '生成测试用例',
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
    if (pathname.startsWith('/test-cases')) {
      if (pathname === '/test-cases/generate') {
        return ['/test-cases/generate'];
      }
      return ['/test-cases/list'];
    }
    if (pathname.startsWith('/prompts')) {
      return ['/prompts/list'];
    }
    if (pathname.startsWith('/tasks')) {
      return ['/tasks'];
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
          style={{
            padding: '0 16px',
            background: colorBgContainer,
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
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

          <Space>
            {/* 任务状态显示 */}
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
                <Badge
                  status={
                    taskState.currentTask.status === 'completed' ? 'success' :
                    taskState.currentTask.status === 'running' ? 'processing' :
                    taskState.currentTask.status === 'failed' ? 'error' : 'default'
                  }
                >
                  <Button
                    type="text"
                    icon={<ClockCircleOutlined />}
                    onClick={() => navigate('/test-cases/generate')}
                    style={{
                      color: taskState.currentTask.status === 'running' ? '#1890ff' : undefined
                    }}
                  >
                    {taskState.isPolling && (
                      <Progress
                        percent={taskState.currentTask.progress || 0}
                        size="small"
                        style={{ width: 100, marginRight: 8 }}
                        format={() => `${taskState.currentTask.progress || 0}%`}
                      />
                    )}
                    {taskState.currentTask.status === 'completed' ? '任务完成' :
                     taskState.currentTask.status === 'running' ? '生成中...' :
                     taskState.currentTask.status === 'failed' ? '任务失败' : '处理中'}
                  </Button>
                </Badge>
              </Tooltip>
            )}

            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              title="刷新页面"
            >
              刷新
            </Button>
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