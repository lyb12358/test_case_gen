import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button, Card, Typography, Collapse, Space } from 'antd';
import {
  BugOutlined,
  ReloadOutlined,
  HomeOutlined,
  ExceptionOutlined,
  CopyOutlined
} from '@ant-design/icons';

const { Paragraph, Text } = Typography;
const { Panel } = Collapse;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  enableDevMode?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: ErrorBoundary.generateErrorId()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo
    });

    // 调用自定义错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 在开发环境中打印错误信息
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // 发送错误报告到监控服务（生产环境）
    if (process.env.NODE_ENV === 'production') {
      ErrorBoundary.reportError(error, errorInfo, this.state.errorId);
    }
  }

  private static generateErrorId(): string {
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  private static reportError(error: Error, errorInfo: ErrorInfo, errorId: string) {
    // 这里可以集成错误监控服务，如 Sentry
    try {
      const errorReport = {
        errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // 发送到错误监控服务
      console.error('Error Report:', errorReport);

      // 这里可以替换为实际的错误报告服务
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // });
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleCopyError = () => {
    const { error, errorInfo, errorId } = this.state;
    const errorText = `
错误ID: ${errorId}
错误信息: ${error?.message}
错误堆栈: ${error?.stack}
组件堆栈: ${errorInfo?.componentStack}
时间: ${new Date().toISOString()}
页面: ${window.location.href}
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      // 显示复制成功提示
      const message = document.createElement('div');
      message.textContent = '错误信息已复制到剪贴板';
      message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #52c41a;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 9999;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      document.body.appendChild(message);
      setTimeout(() => {
        if (message.parentNode) {
          message.parentNode.removeChild(message);
        }
      }, 3000);
    }).catch(() => {
      console.error('Failed to copy error to clipboard');
    });
  };

  private renderErrorDetails() {
    const { error, errorInfo, errorId } = this.state;
    const { showDetails = true, enableDevMode = process.env.NODE_ENV === 'development' } = this.props;

    if (!showDetails || !error) {
      return null;
    }

    return (
      <Card size="small" style={{ marginTop: 16, maxWidth: 800, margin: '0 auto' }}>
        <Collapse ghost>
          <Panel
            header={
              <Space>
                <ExceptionOutlined />
                <span>错误详情</span>
                <Text type="secondary">({errorId})</Text>
              </Space>
            }
            key="error-details"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>错误ID:</Text>
                <Text code copyable>{errorId}</Text>
              </div>

              <div>
                <Text strong>错误信息:</Text>
                <div style={{
                  background: '#fff2f0',
                  border: '1px solid #ffccc7',
                  borderRadius: 4,
                  padding: 8,
                  marginTop: 4,
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  maxHeight: 200,
                  overflow: 'auto'
                }}>
                  {error.message}
                </div>
              </div>

              {error.stack && enableDevMode && (
                <div>
                  <Text strong>错误堆栈:</Text>
                  <div style={{
                    background: '#f5f5f5',
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                    padding: 8,
                    marginTop: 4,
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    whiteSpace: 'pre-wrap',
                    maxHeight: 300,
                    overflow: 'auto'
                  }}>
                    {error.stack}
                  </div>
                </div>
              )}

              {errorInfo?.componentStack && enableDevMode && (
                <div>
                  <Text strong>组件堆栈:</Text>
                  <div style={{
                    background: '#f0f9ff',
                    border: '1px solid #91d5ff',
                    borderRadius: 4,
                    padding: 8,
                    marginTop: 4,
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    whiteSpace: 'pre-wrap',
                    maxHeight: 200,
                    overflow: 'auto'
                  }}>
                    {errorInfo.componentStack}
                  </div>
                </div>
              )}

              <div>
                <Text strong>页面信息:</Text>
                <div style={{ marginTop: 4 }}>
                  <div><Text type="secondary">URL:</Text> <Text code>{window.location.href}</Text></div>
                  <div><Text type="secondary">时间:</Text> <Text>{new Date().toLocaleString()}</Text></div>
                  <div><Text type="secondary">用户代理:</Text> <Text code style={{ fontSize: '11px' }}>{navigator.userAgent}</Text></div>
                </div>
              </div>
            </Space>
          </Panel>
        </Collapse>
      </Card>
    );
  }

  render() {
    const { hasError, errorId } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // 如果提供了自定义的 fallback，使用它
      if (fallback) {
        return fallback;
      }

      // 默认的错误页面
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
          padding: 20
        }}>
          <Result
            status="error"
            icon={<BugOutlined />}
            title="页面出错了"
            subTitle={`很抱歉，页面遇到了一个意外错误。错误ID: ${errorId}`}
            extra={[
              <Button
                key="reload"
                type="primary"
                icon={<ReloadOutlined />}
                onClick={this.handleReload}
              >
                刷新页面
              </Button>,
              <Button
                key="home"
                icon={<HomeOutlined />}
                onClick={this.handleGoHome}
              >
                返回首页
              </Button>,
              <Button
                key="copy"
                icon={<CopyOutlined />}
                onClick={this.handleCopyError}
              >
                复制错误信息
              </Button>
            ]}
          >
            <Paragraph>
              <Text type="secondary">
                如果问题持续存在，请联系技术支持并提供错误ID: <Text strong>{errorId}</Text>
              </Text>
            </Paragraph>
          </Result>

          {this.renderErrorDetails()}
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;