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
import { KnowledgeGraphColors, ModernCardStyles } from './styles/KnowledgeGraphStyles';

const { Text } = Typography;

interface NodeLegendProps {
  visible?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}

interface NodeTypeInfo {
  type: string;
  name: string;
  color: string;
  gradient: string;
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

  // 新架构节点类型信息配置 - 使用统一的颜色系统
  const nodeTypes: NodeTypeInfo[] = [
    {
      type: 'tsp',
      name: 'TSP根节点',
      color: KnowledgeGraphColors.tsp.primary,
      gradient: KnowledgeGraphColors.tsp.gradient,
      icon: <CloudOutlined />,
      description: 'TSP测试用例生成平台（深蓝色主题）'
    },
    {
      type: 'project',
      name: '项目节点',
      color: KnowledgeGraphColors.project.primary,
      gradient: KnowledgeGraphColors.project.gradient,
      icon: <ProjectOutlined />,
      description: '测试项目管理节点（绿色主题）'
    },
    {
      type: 'business_type',
      name: '业务类型',
      color: KnowledgeGraphColors.business.primary,
      gradient: KnowledgeGraphColors.business.gradient,
      icon: <AppstoreOutlined />,
      description: 'TSP业务类型（紫色主题）'
    },
    {
      type: 'test_point',
      name: '测试点',
      color: KnowledgeGraphColors.testPoint.primary,
      gradient: KnowledgeGraphColors.testPoint.gradient,
      icon: <PlayCircleOutlined />,
      description: '测试点场景（浅蓝色主题）'
    },
    {
      type: 'test_case',
      name: '测试用例',
      color: KnowledgeGraphColors.testCase.primary,
      gradient: KnowledgeGraphColors.testCase.gradient,
      icon: <CheckCircleOutlined />,
      description: '测试用例（深绿色主题）'
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
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
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
            fontSize: '14px',
            width: '100%',
          }}>
            <Space size={4}>
              <InfoCircleOutlined style={{
                color: '#000000 !important',
                fontSize: '14px'
              }} />
              <span style={{
                color: '#000000 !important',
                fontWeight: '600 !important',
                fontSize: '14px',
                lineHeight: '1.2',
                letterSpacing: '0.3px'
              }}>节点图例</span>
            </Space>
            <Space size={2}>
              <Button
                type="text"
                size="small"
                icon={expanded ? <UpOutlined /> : <DownOutlined />}
                onClick={() => handleExpandedChange(!expanded)}
                style={{
                  padding: '0 4px',
                  minWidth: 'auto',
                  height: '20px',
                  color: '#000000 !important',
                  background: 'rgba(255, 255, 255, 0.8) !important',
                  border: '1px solid rgba(0, 0, 0, 0.2) !important',
                  borderRadius: '4px',
                  fontWeight: '500'
                }}
              />
              <Button
                type="text"
                size="small"
                icon={<EyeInvisibleOutlined />}
                onClick={() => handleVisibilityChange(false)}
                style={{
                  padding: '0 4px',
                  minWidth: 'auto',
                  height: '20px',
                  color: '#000000 !important',
                  background: 'rgba(255, 255, 255, 0.8) !important',
                  border: '1px solid rgba(0, 0, 0, 0.2) !important',
                  borderRadius: '4px',
                  fontWeight: '500'
                }}
              />
            </Space>
          </div>
        }
        style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
        }}
        styles={{
          body: {
            padding: expanded ? '12px 16px' : '8px 12px',
            maxHeight: expanded ? 'none' : '180px',
            overflow: expanded ? 'visible' : 'hidden',
            background: '#ffffff',
            borderRadius: '0 0 8px 8px'
          },
          header: {
            padding: '8px 12px',
            borderBottom: '1px solid #e5e7eb',
            minHeight: 'auto',
            background: '#ffffff',
            borderRadius: '8px 8px 0 0'
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
              <div
                style={{
                  width: expanded ? '24px' : '20px',
                  height: expanded ? '24px' : '20px',
                  background: nodeType.gradient,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: expanded ? '8px' : '6px',
                  border: '2px solid #e5e7eb',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: expanded ? '12px' : '10px',
                }}
              >
                {nodeType.icon}
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
                      color: '#000000',
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
                      opacity: expanded ? 0.9 : 0.8,
                      fontWeight: '600'
                    }}
                  >
                    {nodeType.type}
                  </Tag>
                </div>
                {expanded && (
                  <Text
                    style={{
                      fontSize: '11px',
                      lineHeight: '1.3',
                      display: 'block',
                      marginTop: '2px',
                      color: '#666666'
                    }}
                  >
                    {nodeType.description}
                  </Text>
                )}
              </div>
            </div>
          ))}

          
          {!expanded && (
            <div style={{
              textAlign: 'center',
              padding: '4px',
              borderTop: '1px solid #e5e7eb',
              marginTop: '4px'
            }}>
              <Text
                style={{
                  fontSize: '10px',
                  fontStyle: 'italic',
                  color: '#666666'
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