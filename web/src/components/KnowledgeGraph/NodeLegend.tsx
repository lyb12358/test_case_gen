import React, { useState, useEffect } from 'react';
import { Card, Space, Typography, Button, Avatar, Tag, Tooltip, Badge } from 'antd';
import {
  CloudOutlined,
  ProjectOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  InfoCircleOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  DownOutlined,
  UpOutlined
} from '@ant-design/icons';

const { Text } = Typography;

interface NodeLegendProps {
  visible?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}

interface NodeTypeInfo {
  type: string;
  name: string;
  color: string;
  icon: React.ReactNode;
  description: string;
}

const NodeLegend: React.FC<NodeLegendProps> = ({
  visible: externalVisible,
  onVisibilityChange
}) => {
  // 内部状态管理可见性，支持外部控制
  const [internalVisible, setInternalVisible] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // 确定最终的可见性状态
  const visible = externalVisible !== undefined ? externalVisible : internalVisible;

  // 新架构节点类型信息配置 - 与实际节点组件保持一致
  const nodeTypes: NodeTypeInfo[] = [
    {
      type: 'tsp',
      name: 'TSP服务',
      color: '#8c8c8c',
      icon: <CloudOutlined />,
      description: 'TSP远程控制服务根节点（灰色背景）'
    },
    {
      type: 'project',
      name: '项目',
      color: '#1890ff',
      icon: <ProjectOutlined />,
      description: '测试项目管理节点（蓝色背景）'
    },
    {
      type: 'business',
      name: '业务类型',
      color: '#722ed1',
      icon: <AppstoreOutlined />,
      description: 'TSP业务类型（紫色背景）'
    }
  ];

  // 统一测试节点的状态信息 - 与UnifiedTestNode组件保持一致
  const testNodeStates = [
    {
      type: 'test_point',
      name: '测试点',
      color: '#faad14',
      icon: <PlayCircleOutlined />,
      description: '测试点（黄色背景，仅名称+描述）'
    },
    {
      type: 'test_case',
      name: '测试用例',
      color: '#52c41a',
      icon: <CheckCircleOutlined />,
      description: '测试用例（绿色背景，详细信息）'
    }
  ];

  // 从本地存储加载状态
  useEffect(() => {
    const savedVisible = localStorage.getItem('knowledge-graph-legend-visible');
    const savedExpanded = localStorage.getItem('knowledge-graph-legend-expanded');

    if (savedVisible !== null && externalVisible === undefined) {
      setInternalVisible(savedVisible === 'true');
    }

    if (savedExpanded !== null) {
      setExpanded(savedExpanded === 'true');
    }
  }, [externalVisible]);

  // 保存可见性状态
  const handleVisibilityChange = (newVisible: boolean) => {
    if (externalVisible === undefined) {
      setInternalVisible(newVisible);
      localStorage.setItem('knowledge-graph-legend-visible', newVisible.toString());
    }
    if (onVisibilityChange) {
      onVisibilityChange(newVisible);
    }
  };

  // 保存展开状态
  const handleExpandedChange = (newExpanded: boolean) => {
    setExpanded(newExpanded);
    localStorage.setItem('knowledge-graph-legend-expanded', newExpanded.toString());
  };

  if (!visible) {
    // 隐藏状态下只显示一个小的浮动按钮
    return (
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 1000
        }}
      >
        <Tooltip title="显示节点图例">
          <Button
            type="primary"
            shape="circle"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleVisibilityChange(true)}
            style={{
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              background: '#1890ff'
            }}
          />
        </Tooltip>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        zIndex: 1000,
        minWidth: expanded ? 280 : 200,
        maxWidth: 320
      }}
    >
      <Card
        size="small"
        title={
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '14px'
          }}>
            <Space size={4}>
              <InfoCircleOutlined />
              <span>节点图例</span>
            </Space>
            <Space size={2}>
              <Button
                type="text"
                size="small"
                icon={expanded ? <UpOutlined /> : <DownOutlined />}
                onClick={() => handleExpandedChange(!expanded)}
                style={{ padding: '0 4px', minWidth: 'auto', height: '20px' }}
              />
              <Button
                type="text"
                size="small"
                icon={<EyeInvisibleOutlined />}
                onClick={() => handleVisibilityChange(false)}
                style={{ padding: '0 4px', minWidth: 'auto', height: '20px' }}
              />
            </Space>
          </div>
        }
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(24, 144, 255, 0.2)',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
        }}
        styles={{
          body: {
            padding: expanded ? '12px 16px' : '8px 12px',
            maxHeight: expanded ? 'none' : '180px',
            overflow: expanded ? 'visible' : 'hidden'
          },
          header: {
            padding: '8px 12px',
            borderBottom: '1px solid rgba(24, 144, 255, 0.1)',
            minHeight: 'auto'
          }
        }}
      >
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          {/* 基础节点类型 */}
          {nodeTypes.map((nodeType) => (
            <div
              key={nodeType.type}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: expanded ? '6px 8px' : '4px 6px',
                borderRadius: '6px',
                backgroundColor: expanded ? 'rgba(24, 144, 255, 0.05)' : 'transparent',
                transition: 'all 0.2s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                if (expanded) {
                  e.currentTarget.style.backgroundColor = 'rgba(24, 144, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = expanded ? 'rgba(24, 144, 255, 0.05)' : 'transparent';
              }}
            >
              <Avatar
                size={expanded ? 'small' : 20}
                icon={nodeType.icon}
                style={{
                  backgroundColor: nodeType.color,
                  border: 'none',
                  marginRight: expanded ? '8px' : '6px'
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: expanded ? '6px' : '4px'
                }}>
                  <Text
                    strong
                    style={{
                      fontSize: expanded ? '13px' : '12px',
                      color: '#262626',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {nodeType.name}
                  </Text>
                  <Tag
                    color={nodeType.color}
                    style={{
                      margin: 0,
                      fontSize: '10px',
                      lineHeight: '14px',
                      padding: '0 4px',
                      borderRadius: '3px',
                      opacity: expanded ? 0.9 : 0.8
                    }}
                  >
                    {nodeType.type}
                  </Tag>
                </div>
                {expanded && (
                  <Text
                    type="secondary"
                    style={{
                      fontSize: '11px',
                      lineHeight: '1.3',
                      display: 'block',
                      marginTop: '2px'
                    }}
                  >
                    {nodeType.description}
                  </Text>
                )}
              </div>
            </div>
          ))}

          {/* 分隔线 */}
          {expanded && (
            <div style={{
              height: '1px',
              background: 'linear-gradient(to right, transparent, rgba(24, 144, 255, 0.2), transparent)',
              margin: '8px 0'
            }} />
          )}

          {/* 测试节点状态 */}
          {expanded && (
            <div style={{ marginBottom: '4px' }}>
              <Text
                strong
                style={{
                  fontSize: '12px',
                  color: '#595959',
                  display: 'block',
                  marginBottom: '6px'
                }}
              >
                测试节点状态
              </Text>
            </div>
          )}

          {testNodeStates.map((testState) => (
            <div
              key={testState.type}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: expanded ? '6px 8px' : '4px 6px',
                borderRadius: '6px',
                backgroundColor: expanded ? 'rgba(24, 144, 255, 0.03)' : 'transparent',
                transition: 'all 0.2s ease',
                cursor: 'default',
                border: expanded ? `1px solid ${testState.color}20` : 'none'
              }}
              onMouseEnter={(e) => {
                if (expanded) {
                  e.currentTarget.style.backgroundColor = `${testState.color}10`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = expanded ? 'rgba(24, 144, 255, 0.03)' : 'transparent';
              }}
            >
              <div
                style={{
                  width: expanded ? '24px' : '20px',
                  height: expanded ? '24px' : '20px',
                  borderRadius: '50%',
                  background: testState.type === 'test_point'
                    ? 'linear-gradient(135deg, #fffbe6 0%, #fff7e6 100%)'
                    : 'linear-gradient(135deg, #f6ffed 0%, #e6f7d2 100%)',
                  border: `2px solid ${testState.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: expanded ? '8px' : '6px'
                }}
              >
                {testState.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: expanded ? '6px' : '4px'
                }}>
                  <Text
                    strong
                    style={{
                      fontSize: expanded ? '13px' : '12px',
                      color: '#262626',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {testState.name}
                  </Text>
                  <Badge
                    color={testState.color}
                    text={testState.type}
                    style={{
                      fontSize: '10px',
                      lineHeight: '14px'
                    }}
                  />
                </div>
                {expanded && (
                  <Text
                    type="secondary"
                    style={{
                      fontSize: '11px',
                      lineHeight: '1.3',
                      display: 'block',
                      marginTop: '2px'
                    }}
                  >
                    {testState.description}
                  </Text>
                )}
              </div>
            </div>
          ))}

          {!expanded && (
            <div style={{
              textAlign: 'center',
              padding: '4px',
              borderTop: '1px solid rgba(24, 144, 255, 0.1)',
              marginTop: '4px'
            }}>
              <Text
                type="secondary"
                style={{
                  fontSize: '10px',
                  fontStyle: 'italic'
                }}
              >
                点击展开查看详情
              </Text>
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default NodeLegend;