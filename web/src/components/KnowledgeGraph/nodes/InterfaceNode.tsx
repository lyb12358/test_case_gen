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
  Tabs,
  List
} from 'antd';
import { registerNode } from '../NodeRegistry';
import {
  ApiOutlined,
  CodeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  ExpandOutlined,
  CompressOutlined,
  CopyOutlined,
  PlayCircleOutlined,
  BugOutlined,
  FileTextOutlined
} from '@ant-design/icons';

const { Text } = Typography;

type DensityLevel = 'compact' | 'normal' | 'spacious';

interface InterfaceNodeProps {
  id: string;
  data: {
    id: string;
    label: string;
    type: 'interface';
    description?: string;
    businessType?: string;
    extra_data?: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      path?: string;
      baseUrl?: string;
      status?: 'active' | 'deprecated' | 'testing' | 'error';
      version?: string;
      authentication?: string;
      parameters?: Array<{
        name: string;
        type: string;
        required?: boolean;
        description?: string;
      }>;
      responses?: Array<{
        code: number;
        description?: string;
        schema?: string;
      }>;
      headers?: Record<string, string>;
      requestBody?: string;
      examples?: Array<{
        name: string;
        request?: string;
        response?: string;
      }>;
      testCases?: Array<{
        name: string;
        status: 'pass' | 'fail' | 'pending';
        lastRun?: string;
      }>;
      metrics?: {
        totalCalls?: number;
        successRate?: number;
        avgResponseTime?: number;
        errorRate?: number;
      };
    };
    expanded?: boolean;
    selected?: boolean;
  };
  density?: DensityLevel;
}

const InterfaceNode: React.FC<InterfaceNodeProps> = ({ data, density = 'spacious' }) => {
  const [expanded, setExpanded] = useState(data.expanded || false);
  const [activeTab, setActiveTab] = useState('overview');
  const { label, description, businessType, extra_data } = data;

  // Get density-based width
  const getDensityWidth = (density: DensityLevel) => {
    switch (density) {
      case 'compact': return 260;
      case 'normal': return 290;
      case 'spacious':
      default: return 320;
    }
  };

  const cardWidth = getDensityWidth(density);

  // 获取HTTP方法颜色
  const getMethodColor = (method?: string): string => {
    switch (method?.toUpperCase()) {
      case 'GET': return '#52c41a';
      case 'POST': return '#1890ff';
      case 'PUT': return '#fa8c16';
      case 'DELETE': return '#ff4d4f';
      case 'PATCH': return '#722ed1';
      default: return '#8c8c8c';
    }
  };

  // 获取接口状态
  const getInterfaceStatus = () => {
    const status = extra_data?.status || 'active';
    switch (status) {
      case 'active':
        return { icon: <CheckCircleOutlined />, color: 'success', text: '正常' };
      case 'testing':
        return { icon: <ClockCircleOutlined />, color: 'processing', text: '测试中' };
      case 'deprecated':
        return { icon: <ExclamationCircleOutlined />, color: 'warning', text: '已废弃' };
      case 'error':
        return { icon: <BugOutlined />, color: 'error', text: '错误' };
      default:
        return { icon: <ClockCircleOutlined />, color: 'default', text: '未知' };
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

  // 复制URL
  const copyUrl = () => {
    const url = `${extra_data?.baseUrl || ''}${extra_data?.path || ''}`;
    navigator.clipboard.writeText(url);
  };

  const interfaceStatus = getInterfaceStatus();

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
          icon={<ApiOutlined />}
          style={{
            backgroundColor: getMethodColor(extra_data?.method),
            border: 'none'
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Text
            strong
            style={{
              fontSize: '14px',
              color: '#262626',
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {label}
          </Text>
          {extra_data?.method && (
            <Tag
              color={getMethodColor(extra_data.method)}
              style={{
                margin: 0,
                fontSize: '10px',
                fontWeight: 'bold',
                minWidth: '40px',
                textAlign: 'center'
              }}
            >
              {extra_data.method.toUpperCase()}
            </Tag>
          )}
        </div>
        <Badge
          status={interfaceStatus.color as any}
          text={interfaceStatus.text}
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
        border: `2px solid ${data.selected ? '#fa8c16' : '#f0f0f0'}`,
        boxShadow: data.selected
          ? '0 4px 12px rgba(250, 140, 22, 0.2)'
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
        {/* 接口信息 */}
        <Space size={4}>
          <Tag color="orange" style={{ margin: 0, fontSize: '12px' }}>
            接口
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
            <Tag color="blue" style={{ margin: 0, fontSize: '11px' }}>
              v{extra_data.version}
            </Tag>
          )}
        </Space>

        {/* API路径 */}
        <Space size={4} style={{ width: '100%' }}>
          <Text
            code
            style={{
              fontSize: '11px',
              color: '#d4380d',
              backgroundColor: '#fff2e8',
              border: '1px solid #ffbb96',
              borderRadius: '4px',
              padding: '2px 6px',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {extra_data?.path || '/api/endpoint'}
          </Text>
          <Tooltip title="复制URL">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={copyUrl}
              style={{ padding: '0 4px', minWidth: 'auto' }}
            />
          </Tooltip>
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
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              size="small"
              style={{ marginTop: '8px' }}
              items={[
                {
                  key: 'overview',
                  label: (
                    <span style={{ fontSize: '12px' }}>
                      <CodeOutlined /> 概览
                    </span>
                  ),
                  children: (
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      {/* 认证信息 */}
                      {extra_data?.authentication && (
                        <div>
                          <Text strong style={{ fontSize: '12px' }}>认证: </Text>
                          <Tag color="blue" style={{ fontSize: '11px' }}>
                            {extra_data.authentication}
                          </Tag>
                        </div>
                      )}

                      {/* 性能指标 */}
                      {extra_data?.metrics && (
                        <div>
                          <Text strong style={{ fontSize: '12px' }}>性能指标:</Text>
                          <div style={{ marginTop: '4px' }}>
                            <Space wrap>
                              {extra_data.metrics.totalCalls !== undefined && (
                                <Text style={{ fontSize: '11px' }}>
                                  调用: {extra_data.metrics.totalCalls}
                                </Text>
                              )}
                              {extra_data.metrics.successRate !== undefined && (
                                <Text style={{ fontSize: '11px', color: '#52c41a' }}>
                                  成功率: {extra_data.metrics.successRate}%
                                </Text>
                              )}
                              {extra_data.metrics.avgResponseTime !== undefined && (
                                <Text style={{ fontSize: '11px' }}>
                                  响应时间: {extra_data.metrics.avgResponseTime}ms
                                </Text>
                              )}
                              {extra_data.metrics.errorRate !== undefined && (
                                <Text style={{ fontSize: '11px', color: '#ff4d4f' }}>
                                  错误率: {extra_data.metrics.errorRate}%
                                </Text>
                              )}
                            </Space>
                          </div>
                        </div>
                      )}
                    </Space>
                  )
                },
                {
                  key: 'params',
                  label: (
                    <span style={{ fontSize: '12px' }}>
                      <FileTextOutlined /> 参数
                    </span>
                  ),
                  children: (
                    <div>
                      {extra_data?.parameters && extra_data.parameters.length > 0 ? (
                        <List
                          size="small"
                          dataSource={extra_data.parameters}
                          renderItem={(param) => (
                            <List.Item style={{ padding: '4px 0' }}>
                              <Space size={8} style={{ width: '100%' }}>
                                <Text strong style={{ fontSize: '11px' }}>
                                  {param.name}
                                </Text>
                                <Tag color="geekblue" style={{ fontSize: '10px', margin: 0 }}>
                                  {param.type}
                                </Tag>
                                {param.required && (
                                  <Tag color="red" style={{ fontSize: '10px', margin: 0 }}>
                                    必需
                                  </Tag>
                                )}
                                <Text
                                  type="secondary"
                                  style={{
                                    fontSize: '11px',
                                    flex: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {param.description}
                                </Text>
                              </Space>
                            </List.Item>
                          )}
                        />
                      ) : (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          无参数
                        </Text>
                      )}
                    </div>
                  )
                },
                {
                  key: 'test',
                  label: (
                    <span style={{ fontSize: '12px' }}>
                      <BugOutlined /> 测试
                    </span>
                  ),
                  children: (
                    <div>
                      {extra_data?.testCases && extra_data.testCases.length > 0 ? (
                        <List
                          size="small"
                          dataSource={extra_data.testCases}
                          renderItem={(testCase) => (
                            <List.Item style={{ padding: '4px 0' }}>
                              <Space size={8} style={{ width: '100%' }}>
                                <Text strong style={{ fontSize: '11px' }}>
                                  {testCase.name}
                                </Text>
                                <Badge
                                  status={
                                    testCase.status === 'pass' ? 'success' :
                                    testCase.status === 'fail' ? 'error' : 'default'
                                  }
                                  text={
                                    testCase.status === 'pass' ? '通过' :
                                    testCase.status === 'fail' ? '失败' : '待测'
                                  }
                                  style={{ fontSize: '10px' }}
                                />
                                {testCase.lastRun && (
                                  <Text type="secondary" style={{ fontSize: '10px' }}>
                                    {new Date(testCase.lastRun).toLocaleDateString()}
                                  </Text>
                                )}
                              </Space>
                            </List.Item>
                          )}
                        />
                      ) : (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          无测试用例
                        </Text>
                      )}
                    </div>
                  )
                }
              ]}
            />

            {/* 操作按钮 */}
            <Space size={8}>
              <Tooltip title="测试接口">
                <Button
                  type="link"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  style={{
                    padding: '0 8px',
                    height: '24px',
                    fontSize: '12px'
                  }}
                >
                  测试
                </Button>
              </Tooltip>
              <Tooltip title="查看文档">
                <Button
                  type="link"
                  size="small"
                  style={{
                    padding: '0 8px',
                    height: '24px',
                    fontSize: '12px'
                  }}
                >
                  文档
                </Button>
              </Tooltip>
              <Tooltip title="查看日志">
                <Button
                  type="link"
                  size="small"
                  icon={<FileTextOutlined />}
                  style={{
                    padding: '0 8px',
                    height: '24px',
                    fontSize: '12px'
                  }}
                >
                  日志
                </Button>
              </Tooltip>
            </Space>
          </>
        )}
      </Space>
    </Card>
  );
};

// Register the component with the node registry
registerNode('interface', 'Interface Node', {
  displayName: 'Interface Node',
  description: 'API interface node with endpoint details',
  defaultSize: { width: 150, height: 95 },
  minSize: { width: 120, height: 80 },
  maxSize: { width: 200, height: 120 }
})(InterfaceNode);

export default InterfaceNode;