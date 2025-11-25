import React from 'react';
import { Breadcrumb, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HomeOutlined,
  ProjectOutlined,
  FileTextOutlined,
  EditOutlined,
  SettingOutlined,
  ShareAltOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  BulbOutlined
} from '@ant-design/icons';
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
    '/business-management/list': { path: '/business-management/list', title: '业务类型列表', icon: <DatabaseOutlined /> },
    '/business-management/config': { path: '/business-management/config', title: '业务配置', icon: <SettingOutlined /> },
    '/business-management/prompt-combinations/create': { path: '/business-management', title: '创建提示词组合', icon: <EditOutlined /> },
    '/knowledge-graph': { path: '/knowledge-graph', title: 'TSP本体图谱', icon: <ShareAltOutlined /> },
    '/test-management': { path: '/test-management', title: '测试管理', icon: <FileTextOutlined /> },
    '/test-management/points': { path: '/test-management/points', title: '测试点管理', icon: <BulbOutlined /> },
    '/test-management/cases': { path: '/test-management/cases', title: '测试用例管理', icon: <FileTextOutlined /> },
    '/test-management/generate': { path: '/test-management/generate', title: '批量生成', icon: <ThunderboltOutlined /> },
    '/prompts': { path: '/prompts', title: '提示词管理', icon: <EditOutlined /> },
    '/prompts/list': { path: '/prompts/list', title: '提示词列表', icon: <EditOutlined /> },
    '/prompts/create': { path: '/prompts/create', title: '创建提示词', icon: <EditOutlined /> },
    '/tasks': { path: '/tasks', title: '任务管理', icon: <ProjectOutlined /> },
  };

  // 支持无连字符的路径格式
  const altPathMap: Record<string, string> = {
  };

  const currentPath = location.pathname;
  const normalizedPath = altPathMap[currentPath] || currentPath;

  // 处理动态路由（详情页、编辑页等）
  const getDynamicBreadcrumbItems = (pathname: string): BreadcrumbItem[] | null => {
    // 测试用例详情和编辑
    if (pathname.startsWith('/test-cases/') && pathname !== '/test-cases/list' && pathname !== '/test-cases/generate' && pathname !== '/test-cases/generate-unified') {
      const baseItem = pathMap['/test-cases'];
      if (baseItem) {
        return [
          baseItem,
          {
            path: pathname,
            title: pathname.includes('/edit') ? '编辑测试用例' : '测试用例详情',
            icon: pathname.includes('/edit') ? <EditOutlined /> : <FileTextOutlined />
          }
        ];
      }
    }

    // 任务详情
    if (pathname.startsWith('/tasks/') && pathname !== '/tasks') {
      const baseItem = pathMap['/tasks'];
      if (baseItem) {
        return [
          baseItem,
          {
            path: pathname,
            title: '任务详情',
            icon: <ProjectOutlined />
          }
        ];
      }
    }

    // 提示词详情和编辑
    if (pathname.startsWith('/prompts/') && !pathname.includes('/list') && !pathname.includes('/create')) {
      const baseItem = pathMap['/prompts'];
      if (baseItem) {
        return [
          baseItem,
          {
            path: pathname,
            title: pathname.includes('/edit') ? '编辑提示词' : '提示词详情',
            icon: pathname.includes('/edit') ? <EditOutlined /> : <FileTextOutlined />
          }
        ];
      }
    }

    // 测试点详情和编辑
    if (pathname.startsWith('/test-points/') && !pathname.includes('/list') && !pathname.includes('/create')) {
      const baseItem = pathMap['/test-points'];
      if (baseItem) {
        return [
          baseItem,
          {
            path: pathname,
            title: pathname.includes('/edit') ? '编辑测试点' : '测试点详情',
            icon: pathname.includes('/edit') ? <EditOutlined /> : <FileTextOutlined />
          }
        ];
      }
    }

    // 业务管理提示词组合编辑
    if (pathname.startsWith('/business-management/prompt-combinations/') && pathname !== '/business-management/prompt-combinations/create') {
      const baseItem = pathMap['/business-management'];
      if (baseItem) {
        return [
          baseItem,
          {
            path: pathname,
            title: '编辑提示词组合',
            icon: <EditOutlined />
          }
        ];
      }
    }

    return null;
  };

  // 生成面包屑路径
  const generateBreadcrumbItems = () => {
    const items: BreadcrumbItem[] = [];

    // 始终从首页开始
    items.push(pathMap['/']);

    // 首先检查动态路由
    const dynamicItems = getDynamicBreadcrumbItems(normalizedPath);
    if (dynamicItems) {
      return items.concat(dynamicItems);
    }

    // 解析静态路径
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

  // 只有首页不显示面包屑，其他所有页面都显示
  if (normalizedPath === '/') {
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