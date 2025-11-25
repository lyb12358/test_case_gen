import React from 'react';
import { Result, Button, Empty, Spin, Alert, Typography, Space } from 'antd';
import {
  LoadingOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  DatabaseOutlined,
  SearchOutlined,
  SettingOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

const { Text } = Typography;

// 通用加载状态组件
interface LoadingStateProps {
  tip?: string;
  size?: 'small' | 'default' | 'large';
  style?: React.CSSProperties;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  tip = '加载中...',
  size = 'default',
  style = { padding: '40px 0', textAlign: 'center' as const }
}) => {
  return (
    <div style={style}>
      <Spin size={size} tip={tip} indicator={<LoadingOutlined style={{ fontSize: size === 'large' ? 32 : 24 }} spin />} />
    </div>
  );
};

// 通用空状态组件
interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  image?: string;
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = '暂无数据',
  description = '当前没有数据可显示',
  action,
  image = Empty.PRESENTED_IMAGE_SIMPLE,
  style = { padding: '40px 0' }
}) => {
  return (
    <div style={style}>
      <Empty
        image={image}
        imageStyle={{ height: 80 }}
        description={
          <Space direction="vertical" size={4}>
            <Text strong>{title}</Text>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {description}
            </Text>
          </Space>
        }
      >
        {action}
      </Empty>
    </div>
  );
};

// 针对不同场景的空状态组件
export const NoDataState: React.FC<{ onRefresh?: () => void; loading?: boolean }> = ({
  onRefresh,
  loading = false
}) => (
  <EmptyState
    title="暂无数据"
    description="当前页面没有数据可显示"
    image={Empty.PRESENTED_IMAGE_SIMPLE}
    action={
      onRefresh && (
        <Button
          type="primary"
          icon={<DatabaseOutlined />}
          onClick={onRefresh}
          loading={loading}
        >
          刷新数据
        </Button>
      )
    }
  />
);

export const NoSearchResultState: React.FC<{ onClearSearch?: () => void; loading?: boolean }> = ({
  onClearSearch,
  loading = false
}) => (
  <EmptyState
    title="未找到相关结果"
    description="尝试调整搜索条件或关键词"
    image={Empty.PRESENTED_IMAGE_SIMPLE}
    action={
      onClearSearch && (
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={onClearSearch}
          loading={loading}
        >
          清除搜索条件
        </Button>
      )
    }
  />
);

export const NoConfigState: React.FC<{ onConfig?: () => void; loading?: boolean }> = ({
  onConfig,
  loading = false
}) => (
  <EmptyState
    title="尚未配置"
    description="请先进行相关配置才能使用此功能"
    image={Empty.PRESENTED_IMAGE_SIMPLE}
    action={
      onConfig && (
        <Button
          type="primary"
          icon={<SettingOutlined />}
          onClick={onConfig}
          loading={loading}
        >
          前去配置
        </Button>
      )
    }
  />
);

// 通用错误状态组件
interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  showRetry?: boolean;
  loading?: boolean;
  error?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = '加载失败',
  description = '数据加载失败，请检查网络连接或稍后重试',
  onRetry,
  showRetry = true,
  loading = false,
  error
}) => {
  return (
    <Result
      status="error"
      title={title}
      subTitle={description}
      extra={
        showRetry && onRetry ? (
          <Button
            type="primary"
            icon={<ExclamationCircleOutlined />}
            onClick={onRetry}
            loading={loading}
          >
            重试
          </Button>
        ) : undefined
      }
    >
      {error && (
        <Alert
          message="错误详情"
          description={error}
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginTop: 16 }}
        />
      )}
    </Result>
  );
};

// 网络错误状态
export const NetworkErrorState: React.FC<{ onRetry?: () => void; loading?: boolean }> = ({
  onRetry,
  loading = false
}) => (
  <ErrorState
    title="网络连接失败"
    description="无法连接到服务器，请检查网络连接状态"
    onRetry={onRetry}
    loading={loading}
  />
);

// 服务器错误状态
export const ServerErrorState: React.FC<{ onRetry?: () => void; loading?: boolean }> = ({
  onRetry,
  loading = false
}) => (
  <ErrorState
    title="服务器错误"
    description="服务器出现错误，请稍后重试或联系管理员"
    onRetry={onRetry}
    loading={loading}
  />
);

// 权限错误状态
export const PermissionErrorState: React.FC<{ onGoHome?: () => void }> = ({
  onGoHome
}) => (
  <Result
    status="403"
    title="访问被拒绝"
    subTitle="您没有权限访问此页面或功能"
    extra={
      onGoHome && (
        <Button type="primary" onClick={onGoHome}>
          返回首页
        </Button>
      )
    }
  />
);

// 配置提醒组件
interface ConfigAlertProps {
  type: 'warning' | 'info';
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const ConfigAlert: React.FC<ConfigAlertProps> = ({
  type,
  title,
  description,
  action
}) => (
  <Alert
    message={
      <Space>
        {type === 'warning' ? <WarningOutlined /> : <InfoCircleOutlined />}
        <span>{title}</span>
      </Space>
    }
    description={
      <div>
        <Text type="secondary">{description}</Text>
        {action && <div style={{ marginTop: '8px' }}>{action}</div>}
      </div>
    }
    type={type}
    showIcon={false}
    style={{ marginBottom: 16 }}
  />
);

// 状态指示器组件
interface StatusIndicatorProps {
  status: 'loading' | 'success' | 'warning' | 'error';
  text: string;
  extra?: React.ReactNode;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  text,
  extra
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <LoadingOutlined spin />;
      case 'success':
        return null; // Success indicator often uses green color instead
      case 'warning':
        return <WarningOutlined />;
      case 'error':
        return <ExclamationCircleOutlined />;
      default:
        return <InfoCircleOutlined />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return '#1890ff';
      case 'success':
        return '#52c41a';
      case 'warning':
        return '#faad14';
      case 'error':
        return '#ff4d4f';
      default:
        return '#8c8c8c';
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {status !== 'success' && (
        <span style={{ color: getStatusColor() }}>{getStatusIcon()}</span>
      )}
      {status === 'success' && (
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: getStatusColor()
        }} />
      )}
      <Text style={{ color: getStatusColor() }}>{text}</Text>
      {extra}
    </div>
  );
};

export default {
  LoadingState,
  EmptyState,
  NoDataState,
  NoSearchResultState,
  NoConfigState,
  ErrorState,
  NetworkErrorState,
  ServerErrorState,
  PermissionErrorState,
  ConfigAlert,
  StatusIndicator
};