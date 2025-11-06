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

const BreadcrumbNavigation: React.FC = () => {
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

  // 自定义项目渲染
  const itemRender = (route: BreadcrumbItem, params: any, routes: BreadcrumbItem[], paths: string[]) => {
    const isLast = routes.indexOf(route) === routes.length - 1;

    if (isLast) {
      // 最后一个项目，显示项目信息
      if (currentProject && (route.path.includes('/test-cases') || route.path.includes('/prompts') || route.path.includes('/tasks'))) {
        return (
          <span>
            {route.icon} {route.title}
            {currentProject && (
              <Text type="secondary" style={{ marginLeft: 8 }}>
                ({currentProject.name})
              </Text>
            )}
          </span>
        );
      }
      return <span>{route.icon} {route.title}</span>;
    }

    return (
      <a onClick={() => navigate(route.path)}>
        {route.icon} {route.title}
      </a>
    );
  };

  // 获取页面标题
  const getPageTitle = () => {
    if (breadcrumbItems.length === 0) return '';
    const lastItem = breadcrumbItems[breadcrumbItems.length - 1];
    return lastItem.title;
  };

  const pageTitle = getPageTitle();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      padding: '12px 0'
    }}>
      <div style={{ flex: 1 }}>
        <Breadcrumb
          items={breadcrumbItems}
          itemRender={itemRender}
        />
        {pageTitle && (
          <div style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 20, fontWeight: 500, color: '#262626' }}>
              {pageTitle}
            </Text>
            {currentProject && (currentPath.includes('/test-cases') || currentPath.includes('/prompts') || currentPath.includes('/tasks')) && (
              <Text style={{ fontSize: 14, color: '#8c8c8c', marginLeft: 12 }}>
                当前项目: {currentProject.name}
              </Text>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BreadcrumbNavigation;