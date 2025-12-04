import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Typography, Space, Tag, Badge } from 'antd';
import { AppstoreOutlined, ExperimentOutlined, CheckCircleOutlined } from '@ant-design/icons';
import {
  getNodeColors,
  getNodeSize,
  ModernCardStyles,
  WhiteBackgroundNodeStyles,
  NodeSpecificStyles,
  TextTruncation,
  StatusColors,
  KnowledgeGraphColors,
  getSemanticColors,
  ShadowLevels
} from '../styles/KnowledgeGraphStyles';

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

      {/* 现代化业务类型节点卡片 */}
      <div
        style={{
          ...WhiteBackgroundNodeStyles.business,
          ...(selected ? ModernCardStyles.selectedCard : ModernCardStyles.card),
          ...(selected && ModernCardStyles.hoverCard),
          background: '#ffffff',
          borderColor: isActive ? colors.primary : '#d1d5db',
          borderWidth: selected ? 4 : 3,
          cursor: 'pointer',
          opacity: isActive ? 1 : 0.6,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 移除渐变装饰背景，使用纯白色背景 */}

        {/* 内容容器 */}
        <div style={ModernCardStyles.contentContainer}>
          {/* 标题区域 */}
          <div style={ModernCardStyles.header}>
            <div style={{
              filter: isActive ? 'none' : 'grayscale(0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {getBusinessIcon()}
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <Typography.Title
                level={5}
                style={{
                  ...ModernCardStyles.title,
                  color: isActive ? '#111827' : '#6b7280',
                  fontWeight: 'bold',
                  margin: 0,
                  fontSize: `${sizes.fontSize}px`,
                  lineHeight: '1.3',
                }}
              >
                {label}
              </Typography.Title>
              {businessName && businessName !== label && (
                <Typography.Text
                  style={{
                    ...ModernCardStyles.subtitle,
                    color: isActive ? '#4b5563' : '#9ca3af',
                    display: 'block',
                    marginTop: '1px',
                  }}
                >
                  {businessName}
                </Typography.Text>
              )}
            </div>
          </div>

          {/* 业务类型标签 */}
          {businessType && (
            <div style={{ textAlign: 'center', marginBottom: '6px' }}>
              <div
                style={{
                  ...ModernCardStyles.statusTag,
                  background: isActive
                    ? `${colors.primary}20`
                    : StatusColors.draft.bg,
                  color: isActive
                    ? colors.primary
                    : StatusColors.draft.text,
                  border: `1px solid ${isActive ? `${colors.primary}40` : 'rgba(156, 163, 175, 0.3)'}`,
                  backdropFilter: 'blur(8px)',
                }}
              >
                {businessType}
              </div>
            </div>
          )}

          {/* 描述信息 - 使用智能文字截断 */}
          {description && (
            <Typography.Text
              style={{
                ...ModernCardStyles.multilineText,
                color: isActive ? '#374151' : '#9ca3af',
                textAlign: 'center',
                fontSize: '10px',
                height: '24px',
              }}
            >
              {description}
            </Typography.Text>
          )}

          {/* 统计信息网格 - 使用统一的语义化颜色 */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '6px'
          }}>
            {/* 测试点统计 */}
            <div
              style={{
                background: isActive ? getSemanticColors('testPoint').background : '#f9fafb',
                padding: '4px 6px',
                borderRadius: '6px',
                border: isActive ? `1px solid ${getSemanticColors('testPoint').primary}20` : '1px solid #e5e7eb',
                boxShadow: ShadowLevels.small,
                textAlign: 'center',
                minWidth: '50px',
              }}
            >
              <ExperimentOutlined
                style={{
                  ...ModernCardStyles.icon,
                  fontSize: '12px',
                  color: isActive ? getSemanticColors('testPoint').icon : '#9ca3af',
                  display: 'block',
                  marginBottom: '2px'
                }}
              />
              <Typography.Text style={{
                fontSize: '8px',
                color: isActive ? getSemanticColors('testPoint').text : '#9ca3af',
                fontWeight: '500',
                display: 'block'
              }}>
                测试点
              </Typography.Text>
              <Badge
                count={testPointCount}
                style={{
                  backgroundColor: isActive ? getSemanticColors('testPoint').primary : '#9ca3af',
                  fontSize: '9px',
                  height: '16px',
                  lineHeight: '16px',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}
                overflowCount={99}
              />
            </div>

            {/* 测试用例统计 */}
            <div
              style={{
                background: isActive ? getSemanticColors('testCase').background : '#f9fafb',
                padding: '4px 6px',
                borderRadius: '6px',
                border: isActive ? `1px solid ${getSemanticColors('testCase').primary}20` : '1px solid #e5e7eb',
                boxShadow: ShadowLevels.small,
                textAlign: 'center',
                minWidth: '50px',
              }}
            >
              <CheckCircleOutlined
                style={{
                  ...ModernCardStyles.icon,
                  fontSize: '12px',
                  color: isActive ? getSemanticColors('testCase').icon : '#9ca3af',
                  display: 'block',
                  marginBottom: '2px'
                }}
              />
              <Typography.Text style={{
                fontSize: '8px',
                color: isActive ? getSemanticColors('testCase').text : '#9ca3af',
                fontWeight: '500',
                display: 'block'
              }}>
                测试用例
              </Typography.Text>
              <Badge
                count={testCaseCount}
                style={{
                  backgroundColor: isActive ? getSemanticColors('testCase').primary : '#9ca3af',
                  fontSize: '9px',
                  height: '16px',
                  lineHeight: '16px',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}
                overflowCount={999}
              />
            </div>
          </div>
        </div>

        {/* 活跃状态指示器 */}
        <div style={{
          position: 'absolute',
          bottom: '6px',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isActive ? colors.primary : '#9ca3af',
              opacity: isActive ? 1 : 0.4,
              boxShadow: isActive ? `0 0 8px ${colors.primary}60` : 'none',
              transition: 'all 0.2s ease-in-out'
            }}
          />
        </div>
      </div>
    </>
  );
};

export default memo(BusinessTypeNode);