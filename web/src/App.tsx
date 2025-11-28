import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntdApp, theme, Empty, Button } from 'antd';
import zhCN from 'antd/locale/zh_CN';

import MainLayout from '@/components/Layout/MainLayout';
import Dashboard from '@/pages/Dashboard';
import UnifiedTestCaseList from '@/components/UnifiedTestCase/UnifiedTestCaseList';
import TaskList from '@/pages/Tasks/TaskList';
import TaskDetail from '@/pages/Tasks/TaskDetail';
import KnowledgeGraph from '@/pages/KnowledgeGraph';
import ProjectManager from '@/pages/Projects/ProjectManager';
import { PromptList, PromptEditor, PromptDetail } from '@/pages/Prompts';
import { TestPointList, TestPointEditor, TestPointDetail } from '@/pages/TestPoints';
import BusinessList from '@/pages/BusinessManagement/BusinessList';
import BusinessTypeConfig from '@/pages/BusinessManagement/BusinessTypeConfig';
import PromptBuilder from '@/pages/BusinessManagement/PromptBuilder';
import BusinessPromptConfiguration from '@/pages/BusinessManagement/BusinessPromptConfiguration';
// New Test Management components
import TestManagementHub from '@/pages/TestManagement/TestManagementHub';
import TestPointManager from '@/pages/TestManagement/TestPointManager';
import TestCaseManager from '@/pages/TestManagement/TestCaseManager';
import BatchGenerator from '@/pages/TestManagement/BatchGenerator';
import { TaskProvider } from '@/contexts/TaskContext';
import { ProjectProvider } from '@/contexts/ProjectContext';
import ProjectProtectedRoute from '@/components/Routing/ProjectProtectedRoute';
import { useProject } from '@/contexts/ProjectContext';
import { AppProvider } from '@/hooks/useMessage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Wrapper component to connect UnifiedTestCaseList with ProjectContext
const UnifiedTestCaseListWithProject: React.FC = () => {
  const { currentProject } = useProject();

  if (!currentProject) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Empty
          description={
            <div>
              <h3>请先选择一个项目</h3>
              <p>请在顶部导航栏选择一个项目后，即可查看该项目的测试用例列表。</p>
            </div>
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" href="/projects">
            去选择项目
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <UnifiedTestCaseList
      projectId={currentProject.id}
      businessType={undefined}
    />
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1890ff',
          },
        }}
      >
        <AppProvider>
          <ProjectProvider>
            <TaskProvider>
              <Router>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                {/* 公共页面 - 不需要项目上下文 */}
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="knowledge-graph" element={<KnowledgeGraph />} />
                <Route path="projects" element={<ProjectManager />} />

                {/* 需要项目上下文的页面 - 业务管理 */}
                <Route path="business-management" element={<BusinessList />} />
                <Route path="business-management/config" element={<BusinessTypeConfig />} />
                <Route path="business-management/prompt-combinations/create" element={<PromptBuilder />} />
                <Route path="business-management/prompt-combinations/:id" element={<PromptBuilder />} />
                <Route path="business-management/business-types/:id/configure" element={<BusinessPromptConfiguration />} />

                
                <Route path="tasks" element={<ProjectProtectedRoute><Outlet /></ProjectProtectedRoute>}>
                  <Route index element={<TaskList />} />
                  <Route path=":id" element={<TaskDetail />} />
                </Route>

                <Route path="prompts" element={<ProjectProtectedRoute><Outlet /></ProjectProtectedRoute>}>
                  <Route index element={<PromptList />} />
                  <Route path="list" element={<PromptList />} />
                  <Route path="create" element={<PromptEditor />} />
                  <Route path=":id" element={<PromptDetail />} />
                  <Route path=":id/edit" element={<PromptEditor />} />
                </Route>

                <Route path="test-points" element={<ProjectProtectedRoute><Outlet /></ProjectProtectedRoute>}>
                  <Route index element={<TestPointList />} />
                  <Route path="list" element={<TestPointList />} />
                  <Route path="create" element={<TestPointEditor />} />
                  <Route path=":id" element={<TestPointDetail />} />
                  <Route path=":id/edit" element={<TestPointEditor />} />
                </Route>

                {/* 需要项目上下文的页面 - 统一测试管理 */}
                <Route path="test-management" element={<ProjectProtectedRoute><Outlet /></ProjectProtectedRoute>}>
                  <Route index element={<TestManagementHub />} />
                  <Route path="points" element={<TestPointManager />} />
                  <Route path="cases" element={<TestCaseManager />} />
                  <Route path="generate" element={<BatchGenerator />} />
                </Route>

                              </Route>
              </Routes>
              </Router>
            </TaskProvider>
          </ProjectProvider>
        </AppProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;