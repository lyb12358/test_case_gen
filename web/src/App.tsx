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
        <Router>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="test-cases">
                <Route index element={<TestCaseList />} />
                <Route path=":id" element={<TestCaseDetail />} />
                <Route path="generate" element={<TestCaseGenerate />} />
              </Route>
              <Route path="tasks">
                <Route index element={<TaskList />} />
                <Route path=":id" element={<TaskDetail />} />
              </Route>
            </Route>
          </Routes>
        </Router>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;