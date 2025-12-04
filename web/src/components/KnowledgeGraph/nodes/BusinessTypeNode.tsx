import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Typography, Space, Tag, Badge } from 'antd';
import { AppstoreOutlined, ExperimentOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getNodeColors, getNodeSize, GlassStyles } from '../styles/KnowledgeGraphStyles';

const { Title, Text } = Typography;

interface BusinessTypeNodeData {
  label: string;
  nodeType: 'business_type';
  level: number;
  color: string;
  businessType?: string;
  businessName?: string;
  testCaseCount?: number;
  testPointCount?: number;
  description?: string;
  isActive?: boolean;
}

interface BusinessTypeNodeProps {
  id: string;
  data: BusinessTypeNodeData;
  selected?: boolean;
}

/**
 * 业务类型节点组件 - 第三层节点
 */
const BusinessTypeNode: React.FC<BusinessTypeNodeProps> = ({ id, data, selected }) => {
  const {
    label = '未知业务类型',
    businessType = '',
    businessName = '',
    testCaseCount = 0,
    testPointCount = 0,
    description,
    isActive = true,
    color = '#fa8c16'
  } = data;

  // 获取业务类型节点的颜色和尺寸
  const colors = getNodeColors('business_type');
  const sizes = getNodeSize('business_type');

  // 获取业务类型图标
  const getBusinessIcon = () => {
    const iconMap: Record<string, React.ReactNode> = {
      RCC: <span style={{ fontSize: `${sizes.iconSize}px` }}>❄️</span>, // 空调
      RFD: <span style={{ fontSize: `${sizes.iconSize}px` }}>🚗</span>, // 车门
      ZAB: <span style={{ fontSize: `${sizes.iconSize}px` }}>🔓</span>, // 解锁
      ZBA: <span style={{ fontSize: `${sizes.iconSize}px` }}>🔒</span>, // 上锁
      RCE: <span style={{ fontSize: `${sizes.iconSize}px` }}>⚙️</span>, // 引擎
      RES: <span style={{ fontSize: `${sizes.iconSize}px` }}>💺</span>, // 座椅
      RHL: <span style={{ fontSize: `${sizes.iconSize}px` }}>💡</span>, // 灯光
      RPP: <span style={{ fontSize: `${sizes.iconSize}px` }}>🔊</span>, // 寻车
      RWS: <span style={{ fontSize: `${sizes.iconSize}px` }}>🪟</span>, // 车窗
      default: <AppstoreOutlined style={{ fontSize: `${sizes.iconSize}px`, color: colors.primary }} />,
    };

    return iconMap[businessType] || iconMap.default;
  };

  // 获取状态颜色
  const getStatusColor = () => {
    if (!isActive) return '#9ca3af';
    return colors.primary;
  };

  const statusColor = getStatusColor();

  return (
    <>
      {/* 连接点 */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: colors.primary,
          border: '2px solid rgba(255, 255, 255, 0.8)',
          width: 8,
          height: 8,
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: colors.primary,
          border: '2px solid rgba(255, 255, 255, 0.8)',
          width: 8,
          height: 8,
        }}
      />

      {/* 玻璃拟态节点卡片 */}
      <div
        style={{
          width: sizes.width,
          minWidth: sizes.width,
          height: sizes.height,
          ...GlassStyles.glassCard,
          background: isActive ? colors.gradient : 'rgba(249, 250, 251, 0.8)',
          borderColor: selected ? 'rgba(255, 255, 255, 0.6)' : colors.primary,
          borderWidth: selected ? 3 : 2,
          transform: selected ? GlassStyles.selectedEffect.transform : 'scale(1)',
          boxShadow: selected
            ? `0 12px 40px ${colors.shadow}, 0 6px 20px rgba(0, 0, 0, 0.15)`
            : `0 8px 32px ${colors.shadow}, 0 4px 16px rgba(0, 0, 0, 0.1)`,
          transition: GlassStyles.transition,
          cursor: 'pointer',
          opacity: isActive ? 1 : 0.6,
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* 标题区域 */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <Space align="center" size={6}>
            <div style={{
              color: isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(156, 163, 175, 0.9)',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              filter: isActive ? 'none' : 'grayscale(0.6)'
            }}>
              {getBusinessIcon()}
            </div>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <Title
                level={5}
                style={{
                  margin: 0,
                  color: isActive ? 'rgba(255, 255, 255, 0.95)' : 'rgba(107, 114, 128, 0.95)',
                  fontWeight: 'bold',
                  fontSize: `${sizes.fontSize}px`,
                  lineHeight: '1.3',
                  textShadow: isActive ? '0 2px 4px rgba(0, 0, 0, 0.3)' : 'none',
                }}
              >
                {label}
              </Title>
              {businessName && businessName !== label && (
                <Text
                  style={{
                    fontSize: '9px',
                    color: isActive ? 'rgba(255, 255, 255, 0.7)' : 'rgba(107, 114, 128, 0.7)',
                    display: 'block',
                    marginTop: '1px',
                  }}
                >
                  {businessName}
                </Text>
              )}
            </div>
          </Space>
        </div>

        {/* 业务类型标签 - 玻璃拟态样式 */}
        {businessType && (
          <div style={{ textAlign: 'center', marginBottom: '6px' }}>
            <div
              style={{
                display: 'inline-block',
                backdropFilter: 'blur(8px)',
                background: isActive
                  ? 'rgba(147, 51, 234, 0.2)'
                  : 'rgba(156, 163, 175, 0.2)',
                padding: '1px 6px',
                borderRadius: '10px',
                border: isActive
                  ? '1px solid rgba(147, 51, 234, 0.3)'
                  : '1px solid rgba(156, 163, 175, 0.3)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Text
                style={{
                  fontSize: '9px',
                  color: isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 'bold',
                }}
              >
                {businessType}
              </Text>
            </div>
          </div>
        )}

        {/* 描述信息 */}
        {description && (
          <Text
            style={{
              fontSize: '9px',
              color: '#666',
              display: 'block',
              textAlign: 'center',
              marginBottom: '6px',
              height: '24px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: '1.3',
            }}
          >
            {description}
          </Text>
        )}

        {/* 统计信息 - 玻璃拟态样式 */}
        <div style={{ marginBottom: '6px' }}>
          <Space size={8} style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
            <div
              style={{
                backdropFilter: 'blur(8px)',
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '4px 6px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                textAlign: 'center',
              }}
            >
              <ExperimentOutlined
                style={{
                  fontSize: '12px',
                  color: isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(156, 163, 175, 0.9)',
                  display: 'block',
                  marginBottom: '1px',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                }}
              />
              <Text style={{ fontSize: '8px', color: isActive ? 'rgba(255, 255, 255, 0.8)' : 'rgba(156, 163, 175, 0.8)' }}>
                测试点
              </Text>
              <Badge
                count={testPointCount}
                style={{
                  backgroundColor: colors.primary,
                  fontSize: '9px',
                  height: '16px',
                  lineHeight: '16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
                overflowCount={99}
              />
            </div>
            <div
              style={{
                backdropFilter: 'blur(8px)',
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '4px 6px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                textAlign: 'center',
              }}
            >
              <CheckCircleOutlined
                style={{
                  fontSize: '12px',
                  color: isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(156, 163, 175, 0.9)',
                  display: 'block',
                  marginBottom: '1px',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                }}
              />
              <Text style={{ fontSize: '8px', color: isActive ? 'rgba(255, 255, 255, 0.8)' : 'rgba(156, 163, 175, 0.8)' }}>
                测试用例
              </Text>
              <Badge
                count={testCaseCount}
                style={{
                  backgroundColor: '#22c55e',
                  fontSize: '9px',
                  height: '16px',
                  lineHeight: '16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
                overflowCount={999}
              />
            </div>
          </Space>
        </div>

        {/* 活跃状态指示器 */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isActive ? colors.primary : '#9ca3af',
              margin: '0 auto',
              opacity: isActive ? 1 : 0.5,
              boxShadow: isActive ? `0 0 8px ${colors.primary}50` : 'none',
            }}
          />
        </div>
      </div>
    </>
  );
};

export default memo(BusinessTypeNode);