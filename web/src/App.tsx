import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';

import MainLayout from '@/components/Layout/MainLayout';
import Dashboard from '@/pages/Dashboard';
import TestCaseList from '@/pages/TestCases/TestCaseList';
import TestCaseDetail from '@/pages/TestCases/TestCaseDetail';
import TestCaseGenerate from '@/pages/TestCases/TestCaseGenerate';
import TaskList from '@/pages/Tasks/TaskList';
import TaskDetail from '@/pages/Tasks/TaskDetail';
import KnowledgeGraph from '@/pages/KnowledgeGraph';
import ProjectManager from '@/pages/Projects/ProjectManager';
import { PromptList, PromptEditor, PromptDetail } from '@/pages/Prompts';
import BusinessList from '@/pages/BusinessManagement/BusinessList';
import PromptBuilder from '@/pages/BusinessManagement/PromptBuilder';
import { TaskProvider } from '@/contexts/TaskContext';
import { ProjectProvider } from '@/contexts/ProjectContext';
import ProjectProtectedRoute from '@/components/Routing/ProjectProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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
                <Route path="business-management" element={<ProjectProtectedRoute />}>
                  <Route index element={<BusinessList />} />
                  <Route path="prompt-combinations/create" element={<PromptBuilder />} />
                  <Route path="prompt-combinations/:id" element={<PromptBuilder />} />
                </Route>

                {/* 需要项目上下文的页面 - 测试用例管理 */}
                <Route path="test-cases" element={<ProjectProtectedRoute />}>
                  <Route index element={<TestCaseList />} />
                  <Route path="list" element={<TestCaseList />} />
                  <Route path="generate" element={<TestCaseGenerate />} />
                  <Route path=":id" element={<TestCaseDetail />} />
                </Route>

                <Route path="tasks" element={<ProjectProtectedRoute />}>
                  <Route index element={<TaskList />} />
                  <Route path=":id" element={<TaskDetail />} />
                </Route>

                <Route path="prompts" element={<ProjectProtectedRoute />}>
                  <Route index element={<PromptList />} />
                  <Route path="list" element={<PromptList />} />
                  <Route path="create" element={<PromptEditor />} />
                  <Route path=":id" element={<PromptDetail />} />
                  <Route path=":id/edit" element={<PromptEditor />} />
                </Route>
              </Route>
            </Routes>
            </Router>
          </TaskProvider>
        </ProjectProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;