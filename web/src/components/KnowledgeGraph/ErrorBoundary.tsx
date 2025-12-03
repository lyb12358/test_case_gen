import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button, Typography } from 'antd';

const { Text, Paragraph } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Boundary component for React 19 strict mode compatibility
 * Provides graceful error handling for knowledge graph components
 */
class KnowledgeGraphErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('KnowledgeGraph Error Boundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Update state with error info for display
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Result
          status="error"
          title="知识图谱渲染错误"
          subTitle="抱歉，知识图谱组件遇到了错误。请尝试刷新页面或联系技术支持。"
          extra={[
            <Button type="primary" onClick={this.handleReset} key="retry">
              重试
            </Button>,
            <Button onClick={() => window.location.reload()} key="refresh">
              刷新页面
            </Button>
          ]}
        >
          {this.props.showErrorDetails && this.state.error && (
            <div style={{ textAlign: 'left', marginTop: 16 }}>
              <Text strong>错误详情：</Text>
              <Paragraph>
                <pre style={{
                  background: '#f5f5f5',
                  padding: 12,
                  borderRadius: 6,
                  fontSize: 12,
                  overflow: 'auto',
                  maxHeight: 200
                }}>
                  {this.state.error.toString()}
                </pre>
              </Paragraph>

              {this.state.errorInfo && (
                <>
                  <Text strong>组件堆栈：</Text>
                  <Paragraph>
                    <pre style={{
                      background: '#f5f5f5',
                      padding: 12,
                      borderRadius: 6,
                      fontSize: 12,
                      overflow: 'auto',
                      maxHeight: 200
                    }}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </Paragraph>
                </>
              )}
            </div>
          )}
        </Result>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary for functional components
 * Uses the class component internally
 */
export const useKnowledgeGraphErrorBoundary = (options?: {
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
}) => {
  const ErrorBoundaryWrapper = ({ children }: { children: ReactNode }) => (
    <KnowledgeGraphErrorBoundary
      {...options}
    >
      {children}
    </KnowledgeGraphErrorBoundary>
  );

  return ErrorBoundaryWrapper;
};

/**
 * HOC to wrap components with error boundary
 */
export const withKnowledgeGraphErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    showErrorDetails?: boolean;
  }
) => {
  const WrappedComponent = (props: P) => (
    <KnowledgeGraphErrorBoundary {...options}>
      <Component {...props} />
    </KnowledgeGraphErrorBoundary>
  );

  WrappedComponent.displayName = `withKnowledgeGraphErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

export default KnowledgeGraphErrorBoundary;