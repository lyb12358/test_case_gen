import React from 'react';
import { Typography } from 'antd';
import { useLocation } from 'react-router-dom';
import { useProject } from '../../contexts/ProjectContext';

const { Title } = Typography;

interface PageTitleProps {
  style?: React.CSSProperties;
}

const PageTitle: React.FC<PageTitleProps> = ({ style }) => {
  const location = useLocation();
  const { currentProject } = useProject();

  // 路径映射到页面标题
  const pathTitleMap: Record<string, string> = {
    '/': '仪表板',
    '/dashboard': '仪表板',
    '/projects': '项目管理',
    '/business-management': '业务管理',
    '/business-management/list': '业务类型列表',
    '/business-management/config': '业务配置',
    '/business-management/prompt-combinations/create': '创建提示词组合',
    '/knowledge-graph': 'TSP本体图谱',
    '/test-cases': '测试用例列表',
    '/test-cases/generate': '生成测试用例',
    '/test-cases/generate-unified': '统一两阶段生成',
    '/test-generation': '测试生成管理',
    '/test-generation/test-points': '测试点生成',
    '/test-generation/test-cases': '测试用例生成',
    '/test-generation/batch': '批量生成',
    '/prompts': '提示词管理',
    '/prompts/create': '创建提示词',
    '/tasks': '任务管理',
    '/test-points': '测试点管理',
    '/test-points/create': '创建测试点',
    // 动态详情页面路由
  };

  // 动态路由处理
  const getDynamicRouteTitle = (pathname: string): string | null => {
    // 测试用例详情和编辑
    if (pathname.startsWith('/test-cases/') && pathname !== '/test-cases/generate' && pathname !== '/test-cases/generate-unified') {
      if (pathname.includes('/edit')) {
        return '编辑测试用例';
      }
      return '测试用例详情';
    }
    // 任务详情
    if (pathname.startsWith('/tasks/') && pathname !== '/tasks') {
      return '任务详情';
    }
    // 提示词详情和编辑
    if (pathname.startsWith('/prompts/') && !pathname.includes('/list') && !pathname.includes('/create')) {
      if (pathname.includes('/edit')) {
        return '编辑提示词';
      }
      return '提示词详情';
    }
    // 业务管理提示词组合
    if (pathname.startsWith('/business-management/prompt-combinations/') && pathname !== '/business-management/prompt-combinations/create') {
      return '编辑提示词组合';
    }
    // 测试点详情和编辑
    if (pathname.startsWith('/test-points/') && !pathname.includes('/list') && !pathname.includes('/create')) {
      if (pathname.includes('/edit')) {
        return '编辑测试点';
      }
      return '测试点详情';
    }
    // 测试生成管理动态路由（如果有详情页）
    if (pathname.startsWith('/test-generation/')) {
      // 可以根据需要添加特定的测试生成详情页面处理
      return null; // 暂时返回null，使用静态映射
    }
    return null;
  };

  // 支持无连字符的路径格式 (向后兼容)
  const altPathMap: Record<string, string> = {
    '/testcases': '/test-cases',
    '/testcases/generate': '/test-cases/generate',
    '/testcases/generate-unified': '/test-cases/generate-unified',
    '/testpoints': '/test-points',
    '/testpoints/create': '/test-points/create',
  };

  const currentPath = location.pathname;
  const normalizedPath = altPathMap[currentPath] || currentPath;

  // 优先检查动态路由
  const dynamicTitle = getDynamicRouteTitle(normalizedPath);
  const pageTitle = dynamicTitle || pathTitleMap[normalizedPath] || '页面';

  // 仪表板不显示标题
  if (normalizedPath === '/' || normalizedPath === '/dashboard') {
    return null;
  }

  return (
    <div className="page-title" style={{ marginBottom: 24, ...style }}>
      <Title level={3} style={{ margin: 0, color: '#262626' }}>
        {pageTitle}
        {currentProject && (normalizedPath.includes('/test-cases') || normalizedPath.includes('/prompts') || normalizedPath.includes('/tasks')) && (
          <span style={{ fontSize: 14, color: '#8c8c8c', fontWeight: 'normal', marginLeft: 12 }}>
            - {currentProject.name}
          </span>
        )}
      </Title>
    </div>
  );
};

export default PageTitle;