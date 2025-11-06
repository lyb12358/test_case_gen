import React from 'react';
import { Breadcrumb, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { HomeOutlined, ProjectOutlined, FileTextOutlined, EditOutlined, SettingOutlined, ShareAltOutlined } from '@ant-design/icons';
import { useProject } from '../../contexts/ProjectContext';

const { Text } = Typography;

interface BreadcrumbItem {
  path: string;
  title: string;
  icon?: React.ReactNode;
}

const HeaderBreadcrumbNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentProject } = useProject();

  // 路径映射到面包屑项
  const pathMap: Record<string, BreadcrumbItem> = {
    '/': { path: '/', title: '首页', icon: <HomeOutlined /> },
    '/dashboard': { path: '/dashboard', title: '仪表板', icon: <HomeOutlined /> },
    '/projects': { path: '/projects', title: '项目管理', icon: <SettingOutlined /> },
    '/business-management': { path: '/business-management', title: '业务管理', icon: <ProjectOutlined /> },
    '/business-management/prompt-combinations/create': { path: '/business-management', title: '创建提示词组合', icon: <EditOutlined /> },
    '/knowledge-graph': { path: '/knowledge-graph', title: 'TSP本体图谱', icon: <ShareAltOutlined /> },
    '/test-cases': { path: '/test-cases', title: '测试用例管理', icon: <FileTextOutlined /> },
    '/test-cases/list': { path: '/test-cases/list', title: '测试用例列表', icon: <FileTextOutlined /> },
    '/test-cases/generate': { path: '/test-cases/generate', title: '生成测试用例', icon: <FileTextOutlined /> },
    '/prompts': { path: '/prompts', title: '提示词管理', icon: <EditOutlined /> },
    '/prompts/list': { path: '/prompts/list', title: '提示词列表', icon: <EditOutlined /> },
    '/prompts/create': { path: '/prompts/create', title: '创建提示词', icon: <EditOutlined /> },
    '/tasks': { path: '/tasks', title: '任务管理', icon: <ProjectOutlined /> },
  };

  // 支持无连字符的路径格式
  const altPathMap: Record<string, string> = {
    '/testcases': '/test-cases',
    '/testcases/list': '/test-cases/list',
    '/testcases/generate': '/test-cases/generate',
  };

  const currentPath = location.pathname;
  const normalizedPath = altPathMap[currentPath] || currentPath;

  // 生成面包屑路径
  const generateBreadcrumbItems = () => {
    const items: BreadcrumbItem[] = [];

    // 始终从首页开始
    items.push(pathMap['/']);

    // 解析路径
    const pathSegments = normalizedPath.split('/').filter(Boolean);
    let currentPathBuilder = '';

    pathSegments.forEach((segment, index) => {
      currentPathBuilder += `/${segment}`;
      const breadcrumbItem = pathMap[currentPathBuilder];

      if (breadcrumbItem) {
        items.push(breadcrumbItem);
      }
    });

    return items;
  };

  const breadcrumbItems = generateBreadcrumbItems();

  // 自定义项目渲染 - 优化为header版本
  const itemRender = (route: BreadcrumbItem, params: any, routes: BreadcrumbItem[], paths: string[]) => {
    const isLast = routes.indexOf(route) === routes.length - 1;

    if (isLast) {
      // 最后一个项目，显示项目信息（简化版本）
      if (currentProject && (route.path.includes('/test-cases') || route.path.includes('/prompts') || route.path.includes('/tasks'))) {
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {route.icon}
            <span style={{ fontSize: '13px', fontWeight: 500 }}>{route.title}</span>
            <Text type="secondary" style={{ fontSize: '12px', marginLeft: '4px' }}>
              ({currentProject.name})
            </Text>
          </span>
        );
      }
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {route.icon}
          <span style={{ fontSize: '13px', fontWeight: 500 }}>{route.title}</span>
        </span>
      );
    }

    return (
      <a
        onClick={() => navigate(route.path)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: '#8c8c8c',
          fontSize: '13px'
        }}
      >
        {route.icon}
        <span>{route.title}</span>
      </a>
    );
  };

  // 只在有路径时显示，首页不显示
  if (normalizedPath === '/' || normalizedPath === '/dashboard') {
    return null;
  }

  return (
    <div
      className="header-breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        marginLeft: '16px',
        height: '100%',
        minWidth: 0,
        flex: 1,
        overflow: 'hidden'
      }}
    >
      <Breadcrumb
        items={breadcrumbItems}
        itemRender={itemRender}
        style={{
          fontSize: '13px',
          whiteSpace: 'nowrap'
        }}
      />
    </div>
  );
};

export default HeaderBreadcrumbNavigation;