import React from 'react';
import { App as AntdApp } from 'antd';
import { useContext } from 'react';

interface MessageContextType {
  message: any;
}

// 创建App context来提供message功能
export const AppContext = React.createContext<MessageContextType>({
  message: null,
});

// 自定义hook来使用message，添加fallback机制
export const useMessage = () => {
  const { message } = useContext(AppContext);

  // Fallback: 如果message不存在，直接使用AntdApp.useApp()
  if (!message) {
    return AntdApp.useApp();
  }

  return message;
};

// AppProvider组件 - 修复React 19兼容性问题
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { message } = AntdApp.useApp();

  return (
    <AppContext.Provider value={{ message }}>
      {children}
    </AppContext.Provider>
  );
};