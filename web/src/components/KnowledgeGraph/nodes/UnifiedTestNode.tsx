import React from 'react';
import {
  Card,
  Tag,
  Typography,
  Space,
  Button,
  Tooltip,
  Avatar,
  List,
  Collapse
} from 'antd';
import { registerNode } from '../NodeRegistry';
import {
  BookOutlined,
  FormOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  EditOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExpandOutlined,
  CompressOutlined
} from '@ant-design/icons';

const { Text } = Typography;
const { Panel } = Collapse;

type DensityLevel = 'compact' | 'normal' | 'spacious';

interface UnifiedTestNodeProps {
  id: string;
  data: {
    id: string;
    label: string;
    type: 'test_point' | 'test_case';
    description?: string;
    businessType?: string;
    stage?: 'test_point' | 'test_case';
    status?: 'draft' | 'approved' | 'completed';
    priority?: 'low' | 'medium' | 'high';
    projectId?: number;
    preconditions?: string;
    steps?: Array<{
      step: number;
      action: string;
      expected: string;
      actual?: string;
      status?: 'pass' | 'fail' | 'not_run';
    }>;
    expected_results?: string;
    module?: string;
    functional_module?: string;
    expanded?: boolean;
    selected?: boolean;
  };
  density?: DensityLevel;
}

const UnifiedTestNode: React.FC<UnifiedTestNodeProps> = ({ data, density = 'spacious' }) => {
  const [expanded, setExpanded] = React.useState(data.expanded || false);
  const { label, description, businessType, stage, status, priority, preconditions, steps, module, functional_module } = data;

  // 获取密度基础宽度
  const getDensityWidth = (density: DensityLevel) => {
    switch (density) {
      case 'compact': return 280;
      case 'normal': return 320;
      case 'spacious':
      default: return 360;
    }
  };

  const cardWidth = getDensityWidth(density);

  // 获取优先级颜色
  const getPriorityColor = (priority?: string): string => {
    switch (priority) {
      case 'high': return '#ff4d4f';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#8c8c8c';
    }
  };

  // 获取状态信息
  const getStatusInfo = () => {
    if (stage === 'test_point') {
      return {
        icon: <BookOutlined />,
        text: '测试点',
        color: '#faad14'
      };
    } else {
      return {
        icon: <FormOutlined />,
        text: '测试用例',
        color: '#52c41a'
      };
    }
  };

  // 获取节点样式
  const getNodeStyle = () => {
    const statusInfo = getStatusInfo();

    if (stage === 'test_point') {
      // 测试点：黄色背景
      return {
        border: `2px solid ${data.selected ? '#faad14' : '#ffc53d'}`,
        boxShadow: data.selected
          ? '0 4px 12px rgba(250, 173, 20, 0.2)'
          : '0 2px 8px rgba(250, 173, 20, 0.1)',
        backgroundColor: '#fffbe6',
        headerBg: '#fff7e6'
      };
    } else {
      // 测试用例：绿色背景
      return {
        border: `2px solid ${data.selected ? '#52c41a' : '#73d13d'}`,
        boxShadow: data.selected
          ? '0 4px 12px rgba(82, 196, 26, 0.2)'
          : '0 2px 8px rgba(82, 196, 26, 0.1)',
        backgroundColor: '#f6ffed',
        headerBg: '#f0f9e8'
      };
    }
  };

  // 获取状态图标
  const getStatusIcon = () => {
    const statusInfo = getStatusInfo();
    if (stage === 'test_point') {
      return <BookOutlined style={{ color: '#fa8c16' }} />;
    } else {
      return <FormOutlined style={{ color: '#52c41a' }} />;
    }
  };

  // 切换展开/收缩状态
  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = !expanded;
    setExpanded(newExpanded);
  };

  const statusInfo = getStatusInfo();
  const nodeStyle = getNodeStyle();

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
          icon={getStatusIcon()}
          style={{
            backgroundColor: statusInfo.color,
            border: 'none'
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
          {priority && (
            <Tag
              color={getPriorityColor(priority)}
              style={{
                margin: 0,
                fontSize: '10px',
                fontWeight: 'bold',
                minWidth: '40px',
                textAlign: 'center'
              }}
            >
              {priority.toUpperCase()}
            </Tag>
          )}
        </div>
      </Space>

      {/* 只有测试用例才显示展开按钮 */}
      {stage === 'test_case' && (
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
      )}
    </div>
  );

  return (
    <Card
      size="small"
      title={cardTitle}
      hoverable
      onClick={(e) => e.stopPropagation()}
      style={{
        width: cardWidth,
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: data.selected ? 'scale(1.02)' : 'scale(1)',
        ...nodeStyle
      }}
      styles={{
        body: {
          padding: expanded ? '12px' : '8px 12px',
          backgroundColor: nodeStyle.backgroundColor
        },
        header: {
          padding: '8px 12px',
          minHeight: 'auto',
          borderBottom: expanded ? '1px solid #f0f0f0' : 'none',
          backgroundColor: nodeStyle.headerBg
        }
      }}
    >
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        {/* 状态和业务类型标签 */}
        <Space size={4}>
          <Tag
            color={stage === 'test_point' ? 'orange' : 'green'}
            style={{ margin: 0, fontSize: '12px' }}
          >
            {stage === 'test_point' ? '测试点' : '测试用例'}
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
        </Space>

        {/* 描述 - 测试点和测试用例都显示，但测试用例可能有更多信息 */}
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

        {/* 只有测试用例展开时显示详细信息 */}
        {expanded && stage === 'test_case' && (
          <>
            {/* 状态信息 */}
            <div style={{
              padding: '8px',
              backgroundColor: '#fafafa',
              borderRadius: '4px',
              border: '1px solid #f0f0f0'
            }}>
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                <Text strong style={{ fontSize: '12px' }}>状态信息</Text>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Space size={4}>
                    <Avatar size="small" icon={getStatusIcon()} style={{ backgroundColor: statusInfo.color }} />
                    <Text style={{ fontSize: '11px' }}>类型: {statusInfo.text}</Text>
                  </Space>
                  {priority && (
                    <Space size={4}>
                      <Tag color={getPriorityColor(priority)} style={{ fontSize: '10px', margin: 0 }}>
                        {priority.toUpperCase()}
                      </Tag>
                      <Text style={{ fontSize: '11px' }}>优先级</Text>
                    </Space>
                  )}
                </div>
              </Space>
            </div>

            {/* 功能模块信息 */}
            {(module || functional_module) && (
              <div style={{
                padding: '8px',
                backgroundColor: '#fafafa',
                borderRadius: '4px',
                border: '1px solid #f0f0f0'
              }}>
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  <Text strong style={{ fontSize: '12px' }}>模块信息</Text>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {module && (
                      <Space size={4}>
                        <BookOutlined style={{ fontSize: '12px', color: '#1890ff' }} />
                        <Text style={{ fontSize: '11px' }}>模块: {module}</Text>
                      </Space>
                    )}
                    {functional_module && (
                      <Space size={4}>
                        <FormOutlined style={{ fontSize: '12px', color: '#52c41a' }} />
                        <Text style={{ fontSize: '11px' }}>功能域: {functional_module}</Text>
                      </Space>
                    )}
                  </div>
                </Space>
              </div>
            )}

            {/* 测试步骤 */}
            {steps && steps.length > 0 && (
              <Collapse ghost size="small">
                <Panel
                  header={
                    <Text strong style={{ fontSize: '12px' }}>
                      执行步骤 ({steps.length})
                    </Text>
                  }
                  key="steps"
                >
                  <List
                    size="small"
                    dataSource={steps.slice(0, 5)} // 只显示前5个步骤
                    renderItem={(step) => (
                      <List.Item style={{ padding: '4px 0' }}>
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                          <Space size={4}>
                            <Text style={{ fontSize: '11px', fontWeight: '500' }}>
                              {step.step}. {step.action}
                            </Text>
                            {step.status && (
                              <Tag
                                color={step.status === 'pass' ? 'success' : step.status === 'fail' ? 'error' : 'default'}
                                style={{ fontSize: '10px' }}
                              />
                            )}
                          </Space>
                          <Text type="secondary" style={{ fontSize: '10px', marginLeft: '20px' }}>
                            预期: {step.expected}
                          </Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Panel>
              </Collapse>
            )}

            {/* 前置条件 */}
            {preconditions && (
              <div style={{
                padding: '8px',
                backgroundColor: '#fafafa',
                borderRadius: '4px',
                border: '1px solid #f0f0f0'
              }}>
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  <Text strong style={{ fontSize: '12px' }}>前置条件</Text>
                  <Text style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                    {preconditions}
                  </Text>
                </Space>
              </div>
            )}

            {/* 操作按钮 */}
            <Space size={8}>
              <Tooltip title="执行测试">
                <Button
                  type="link"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    padding: '0 8px',
                    height: '24px',
                    fontSize: '12px'
                  }}
                >
                  执行
                </Button>
              </Tooltip>
              <Tooltip title="查看详情">
                <Button
                  type="link"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    padding: '0 8px',
                    height: '24px',
                    fontSize: '12px'
                  }}
                >
                  详情
                </Button>
              </Tooltip>
              <Tooltip title="编辑">
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    padding: '0 8px',
                    height: '24px',
                    fontSize: '12px'
                  }}
                >
                  编辑
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
registerNode('unified_test', 'Unified Test Node', {
  displayName: 'Unified Test Node',
  description: 'Unified test node with support for both test points and test cases',
  defaultSize: { width: 340, height: 200 },
  minSize: { width: 280, height: 160 },
  maxSize: { width: 400, height: 240 }
})(UnifiedTestNode);

export default UnifiedTestNode;