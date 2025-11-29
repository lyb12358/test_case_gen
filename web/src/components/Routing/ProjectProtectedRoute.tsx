import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { Modal, Button, Alert, Spin } from 'antd';
import { ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useProject } from '../../contexts/ProjectContext';
import { ProjectSelection } from '../ProjectSelection';

interface ProjectProtectedRouteProps {
  children: React.ReactNode;
  requireProject?: boolean;
  fallbackPath?: string;
}

const ProjectProtectedRoute: React.FC<ProjectProtectedRouteProps> = ({
  children,
  requireProject = true,
  fallbackPath = '/dashboard'
}) => {
  const { currentProject, loading, error, clearError, loadProjects } = useProject();
  const location = useLocation();
  const [showProjectSelection, setShowProjectSelection] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // 页面路径，不需要项目上下文的路径
  const publicPaths = ['/dashboard', '/knowledge-graph'];
  const isPublicPath = publicPaths.some(path => location.pathname.startsWith(path));

  useEffect(() => {
    // 添加调试日志
    console.log('ProjectProtectedRoute Debug:', {
      pathname: location.pathname,
      requireProject,
      loading,
      currentProject: currentProject?.id,
      isPublicPath,
      showProjectSelection
    });

    // 如果需要项目但没有当前项目，且不是公共路径
    if (requireProject && !loading && !currentProject && !isPublicPath) {
      console.log('需要选择项目，显示选择框');
      // 延迟显示选择框，避免闪烁
      const timer = setTimeout(() => {
        setShowProjectSelection(true);
      }, 100);

      return () => clearTimeout(timer);
    }

    // 如果有项目但之前显示了选择框，则关闭
    if (currentProject && showProjectSelection) {
      console.log('项目已选择，关闭选择框');
      setShowProjectSelection(false);
    }
  }, [currentProject, loading, requireProject, isPublicPath, showProjectSelection, location.pathname]);

  // 加载状态
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column'
      }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#666' }}>加载项目信息中...</div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        padding: '0 20px'
      }}>
        <Alert
          message="项目加载失败"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24, maxWidth: 500 }}
          action={
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={isRetrying}
              onClick={async () => {
                setIsRetrying(true);
                clearError();
                try {
                  await loadProjects();
                } finally {
                  setIsRetrying(false);
                }
              }}
            >
              重试
            </Button>
          }
        />
        <Button
          type="link"
          onClick={() => {
            clearError();
            window.location.href = fallbackPath;
          }}
        >
          返回首页
        </Button>
      </div>
    );
  }

  // 不需要项目上下文的路径，直接渲染
  if (!requireProject || isPublicPath) {
    return <Outlet />;
  }

  // 需要项目但没有项目，显示选择模态框
  if (!currentProject) {
    return (
      <>
        {/* 显示一个占位页面 */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          background: '#f5f5f5'
        }}>

          <ExclamationCircleOutlined style={{ fontSize: 64, color: '#1890ff', marginBottom: 16 }} />
          <h2>需要选择项目</h2>
          <p style={{ color: '#666', marginBottom: 24 }}>
            请先选择一个项目以访问此页面
          </p>
          <button
            onClick={() => setShowProjectSelection(true)}
            style={{
              padding: '8px 16px',
              background: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            选择项目
          </button>
        </div>

        {/* 项目选择模态框 */}
        <ProjectSelection
          visible={showProjectSelection}
          onCancel={() => {
            setShowProjectSelection(false);
            // 如果用户取消选择，导航到仪表板
            window.location.href = fallbackPath;
          }}
          onSelect={(project) => {
            setShowProjectSelection(false);
            // 项目选择后会自动刷新当前页面
          }}
        />
      </>
    );
  }

  // 有项目，正常渲染
  return <Outlet />;
};

export default ProjectProtectedRoute;