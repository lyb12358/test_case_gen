import React, { useState } from 'react';
import {
  Card,
  Tag,
  Typography,
  Space,
  Button,
  Tooltip,
  Badge,
  Avatar,
  Divider,
  Progress
} from 'antd';
import {
  CloudServerOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ApiOutlined,
  DatabaseOutlined,
  SettingOutlined,
  ExpandOutlined,
  CompressOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';

const { Text } = Typography;

type DensityLevel = 'compact' | 'normal' | 'spacious';

interface ServiceNodeProps {
  id: string;
  data: {
    label: string;
    type: 'service';
    description?: string;
    businessType?: string;
    extra_data?: {
      port?: number;
      status?: 'running' | 'stopped' | 'error' | 'warning';
      version?: string;
      endpoint?: string;
      dependencies?: string[];
      metrics?: {
        cpu?: number;
        memory?: number;
        requestCount?: number;
        responseTime?: number;
      };
      health?: 'healthy' | 'unhealthy' | 'degraded';
      lastCheck?: string;
    };
    expanded?: boolean;
    selected?: boolean;
  };
  density?: DensityLevel;
}

const ServiceNode: React.FC<ServiceNodeProps> = ({ id, data, density = 'spacious' }) => {
  const [expanded, setExpanded] = useState(data.expanded || false);
  const { label, description, businessType, extra_data } = data;

  // Get density-based width
  const getDensityWidth = (density: DensityLevel) => {
    switch (density) {
      case 'compact': return 240;
      case 'normal': return 270;
      case 'spacious':
      default: return 300;
    }
  };

  const cardWidth = getDensityWidth(density);

  // 获取服务状态图标和颜色
  const getServiceStatus = () => {
    const status = extra_data?.status || 'stopped';
    switch (status) {
      case 'running':
        return {
          icon: <PlayCircleOutlined />,
          color: '#52c41a',
          text: '运行中',
          badge: 'success'
        };
      case 'stopped':
        return {
          icon: <PauseCircleOutlined />,
          color: '#8c8c8c',
          text: '已停止',
          badge: 'default'
        };
      case 'error':
        return {
          icon: <CloseCircleOutlined />,
          color: '#ff4d4f',
          text: '错误',
          badge: 'error'
        };
      case 'warning':
        return {
          icon: <ExclamationCircleOutlined />,
          color: '#faad14',
          text: '警告',
          badge: 'warning'
        };
      default:
        return {
          icon: <PauseCircleOutlined />,
          color: '#8c8c8c',
          text: '未知',
          badge: 'default'
        };
    }
  };

  // 获取健康状态
  const getHealthStatus = () => {
    const health = extra_data?.health || 'unhealthy';
    switch (health) {
      case 'healthy':
        return { color: 'success', text: '健康' };
      case 'degraded':
        return { color: 'warning', text: '降级' };
      case 'unhealthy':
        return { color: 'error', text: '不健康' };
      default:
        return { color: 'default', text: '未知' };
    }
  };

  // 切换展开/收缩状态
  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = !expanded;
    setExpanded(newExpanded);
  };

  // 处理节点点击
  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Graph interaction is handled at the graph level
  };

  const serviceStatus = getServiceStatus();
  const healthStatus = getHealthStatus();

  const cardTitle = (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%'
    }}>
      <Space size={8}>
        <Avatar
          size="small"
          icon={<CloudServerOutlined />}
          style={{
            backgroundColor: serviceStatus.color,
            border: 'none'
          }}
        />
        <Text
          strong
          style={{
            fontSize: '14px',
            color: '#262626',
            maxWidth: '160px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {label}
        </Text>
        <Badge
          status={serviceStatus.badge as any}
          text={serviceStatus.text}
          size="small"
        />
      </Space>

      <Button
        type="text"
        size="small"
        icon={expanded ? <CompressOutlined /> : <ExpandOutlined />}
        onClick={toggleExpand}
        style={{
          padding: '0 4px',
          minWidth: 'auto',
          height: '20px',
          lineHeight: '20px'
        }}
      />
    </div>
  );

  return (
    <Card
      size="small"
      title={cardTitle}
      hoverable
      onClick={handleNodeClick}
      style={{
        width: cardWidth,
        borderRadius: 8,
        border: `2px solid ${data.selected ? '#52c41a' : '#f0f0f0'}`,
        boxShadow: data.selected
          ? '0 4px 12px rgba(82, 196, 26, 0.2)'
          : '0 2px 8px rgba(0,0,0,0.06)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: '#fff',
        transform: data.selected ? 'scale(1.02)' : 'scale(1)',
      }}
      styles={{
        body: {
          padding: expanded ? '12px' : '8px 12px',
        },
        header: {
          padding: '8px 12px',
          minHeight: 'auto',
          borderBottom: expanded ? '1px solid #f0f0f0' : 'none',
        }
      }}
    >
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        {/* 服务信息 */}
        <Space size={4}>
          <Tag color="green" style={{ margin: 0, fontSize: '12px' }}>
            服务
          </Tag>
          {businessType && (
            <Tag
              style={{
                margin: 0,
                fontSize: '11px',
                color: '#666',
                backgroundColor: '#f5f5f5',
                border: '1px solid #d9d9d9'
              }}
            >
              {businessType}
            </Tag>
          )}
          {extra_data?.version && (
            <Tag
              color="blue"
              style={{
                margin: 0,
                fontSize: '11px'
              }}
            >
              v{extra_data.version}
            </Tag>
          )}
        </Space>

        {/* 端口和端点信息 */}
        <Space size={8}>
          {extra_data?.port && (
            <Space size={4}>
              <ApiOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
              <Text style={{ fontSize: '12px', color: '#666' }}>
                端口: {extra_data.port}
              </Text>
            </Space>
          )}
          {extra_data?.endpoint && (
            <Space size={4}>
              <DatabaseOutlined style={{ color: '#722ed1', fontSize: '12px' }} />
              <Text
                style={{
                  fontSize: '12px',
                  color: '#666',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {extra_data.endpoint}
              </Text>
            </Space>
          )}
        </Space>

        {/* 描述 */}
        {description && (
          <Text
            type="secondary"
            style={{
              fontSize: '12px',
              lineHeight: '1.4',
              display: expanded ? 'block' : '-webkit-box',
              WebkitLineClamp: expanded ? 'none' : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {description}
          </Text>
        )}

        {/* 展开时显示详细信息 */}
        {expanded && (
          <>
            {/* 健康状态 */}
            <div style={{
              padding: '8px',
              backgroundColor: '#fafafa',
              borderRadius: '4px',
              border: '1px solid #f0f0f0'
            }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Space size={8}>
                  <Text strong style={{ fontSize: '12px' }}>健康状态:</Text>
                  <Tag color={healthStatus.color} style={{ margin: 0, fontSize: '11px' }}>
                    {healthStatus.text}
                  </Tag>
                  {extra_data?.lastCheck && (
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      检查时间: {new Date(extra_data.lastCheck).toLocaleTimeString()}
                    </Text>
                  )}
                </Space>

                {/* 性能指标 */}
                {extra_data?.metrics && (
                  <>
                    <Divider style={{ margin: '8px 0' }} />
                    <Text strong style={{ fontSize: '12px' }}>性能指标:</Text>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      {extra_data.metrics.cpu !== undefined && (
                        <div>
                          <Text style={{ fontSize: '12px' }}>CPU: </Text>
                          <Progress
                            percent={extra_data.metrics.cpu}
                            size="small"
                            style={{ margin: 0, width: '100px' }}
                            showInfo={false}
                            strokeColor={
                              extra_data.metrics.cpu > 80 ? '#ff4d4f' :
                              extra_data.metrics.cpu > 60 ? '#faad14' : '#52c41a'
                            }
                          />
                          <Text style={{ fontSize: '12px', marginLeft: '8px' }}>
                            {extra_data.metrics.cpu}%
                          </Text>
                        </div>
                      )}
                      {extra_data.metrics.memory !== undefined && (
                        <div>
                          <Text style={{ fontSize: '12px' }}>内存: </Text>
                          <Progress
                            percent={extra_data.metrics.memory}
                            size="small"
                            style={{ margin: 0, width: '100px' }}
                            showInfo={false}
                            strokeColor={
                              extra_data.metrics.memory > 80 ? '#ff4d4f' :
                              extra_data.metrics.memory > 60 ? '#faad14' : '#52c41a'
                            }
                          />
                          <Text style={{ fontSize: '12px', marginLeft: '8px' }}>
                            {extra_data.metrics.memory}%
                          </Text>
                        </div>
                      )}
                      {extra_data.metrics.responseTime && (
                        <Text style={{ fontSize: '12px' }}>
                          响应时间: {extra_data.metrics.responseTime}ms
                        </Text>
                      )}
                      {extra_data.metrics.requestCount !== undefined && (
                        <Text style={{ fontSize: '12px' }}>
                          请求数: {extra_data.metrics.requestCount}
                        </Text>
                      )}
                    </Space>
                  </>
                )}

                {/* 依赖服务 */}
                {extra_data?.dependencies && extra_data.dependencies.length > 0 && (
                  <>
                    <Divider style={{ margin: '8px 0' }} />
                    <Text strong style={{ fontSize: '12px' }}>依赖服务:</Text>
                    <Space wrap>
                      {extra_data.dependencies.map((dep, index) => (
                        <Tag key={index} style={{ fontSize: '11px' }}>
                          {dep}
                        </Tag>
                      ))}
                    </Space>
                  </>
                )}
              </Space>
            </div>

            {/* 操作按钮 */}
            <Space size={8}>
              <Tooltip title="重启服务">
                <Button
                  type="link"
                  size="small"
                  icon={<ReloadOutlined />}
                  style={{
                    padding: '0 8px',
                    height: '24px',
                    fontSize: '12px'
                  }}
                >
                  重启
                </Button>
              </Tooltip>
              <Tooltip title="查看日志">
                <Button
                  type="link"
                  size="small"
                  style={{
                    padding: '0 8px',
                    height: '24px',
                    fontSize: '12px'
                  }}
                >
                  日志
                </Button>
              </Tooltip>
              <Tooltip title="服务配置">
                <Button
                  type="link"
                  size="small"
                  icon={<SettingOutlined />}
                  style={{
                    padding: '0 8px',
                    height: '24px',
                    fontSize: '12px'
                  }}
                >
                  配置
                </Button>
              </Tooltip>
            </Space>
          </>
        )}
      </Space>
    </Card>
  );
};

export default ServiceNode;