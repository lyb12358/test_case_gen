import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Typography, Space, Tag } from 'antd';
import { FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import {
  getNodeColors,
  getNodeSize,
  ModernCardStyles,
  WhiteBackgroundNodeStyles,
  NodeSpecificStyles,
  TextTruncation,
  StatusColors,
  PriorityColors,
  KnowledgeGraphColors
} from '../styles/KnowledgeGraphStyles';

const { Title, Text } = Typography;

interface TestCaseNodeData {
  label: string;
  nodeType: 'test_point' | 'test_case';
  level: number;
  color: string;
  stage?: 'test_point' | 'test_case';
  status?: 'draft' | 'approved';
  priority?: 'low' | 'medium' | 'high';
  description?: string;
  module?: string;
  preconditions?: string;
}

interface TestCaseNodeProps {
  id: string;
  data: TestCaseNodeData;
  selected?: boolean;
}

/**
 * 测试用例节点组件 - 第四层节点
 */
const TestCaseNode: React.FC<TestCaseNodeProps> = ({ id, data, selected }) => {
  const {
    label = '未知测试用例',
    stage = 'test_case',
    status = 'draft',
    priority = 'medium',
    description,
    module,
    color = '#eb2f96'
  } = data;

  // 获取节点颜色和尺寸
  // 测试点用浅蓝色，测试用例根据状态变色
  const nodeType = stage === 'test_point' ? 'test_point' : 'test_case';
  const colors = getNodeColors(nodeType, status);
  const sizes = getNodeSize('test_case');

  // 获取状态颜色和图标
  const getStatusInfo = () => {
    switch (status) {
      case 'approved':
        return { color: '#3b82f6', icon: <CheckCircleOutlined />, text: '已审批' };
      case 'draft':
      default:
        return { color: '#6b7280', icon: <ClockCircleOutlined />, text: '草稿' };
    }
  };

  // 获取优先级颜色
  const getPriorityColor = () => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  // 获取状态信息
  const statusInfo = getStatusInfo();
  const priorityColor = getPriorityColor();

  // 创建颜色背景样式
  const createStatusStyle = (color: string, opacity: number = 0.1): React.CSSProperties => ({
    background: `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    color: color,
    border: `1px solid ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
  });

  return (
    <>
      {/* 连接点 */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: colors.primary,
          border: '2px solid rgba(255, 255, 255, 0.8)',
          width: 6,
          height: 6,
        }}
      />

      {/* 现代化测试用例节点卡片 */}
      <div
        style={{
          ...(nodeType === 'test_point' ? WhiteBackgroundNodeStyles.testPoint : WhiteBackgroundNodeStyles.testCase),
          ...(selected ? ModernCardStyles.selectedCard : ModernCardStyles.card),
          ...(selected && ModernCardStyles.hoverCard),
          background: '#ffffff',
          borderColor: selected ? colors.primary : colors.primary,
          borderWidth: selected ? 4 : 2,
          cursor: 'pointer',
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
              ...ModernCardStyles.icon,
              color: colors.primary,
              display: 'flex',
              alignItems: 'center',
              fontSize: '16px'
            }}>
              {stage === 'test_point' ? '📝' : <FileTextOutlined />}
            </div>
            <Typography.Title
              level={5}
              style={{
                ...ModernCardStyles.title,
                ...TextTruncation.singleLine,
                color: '#111827',
                fontWeight: 'bold',
                margin: 0,
                fontSize: `${sizes.labelFontSize}px`,
                lineHeight: '1.2',
                flex: 1,
              }}
              title={label}
            >
              {label}
            </Typography.Title>
          </div>

          {/* 阶段和状态标签 */}
          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
            <Space size={2}>
              <div
                style={{
                  ...ModernCardStyles.statusTag,
                  ...(stage === 'test_point'
                    ? createStatusStyle(KnowledgeGraphColors.testPoint.primary, 0.1)
                    : createStatusStyle(KnowledgeGraphColors.testCase.primary, 0.1)
                  ),
                }}
              >
                {stage === 'test_point' ? '测试点' : '测试用例'}
              </div>
              <div
                style={{
                  ...ModernCardStyles.statusTag,
                  ...createStatusStyle(statusInfo.color, 0.1),
                }}
              >
                {statusInfo.text}
              </div>
            </Space>
          </div>

          {/* 优先级指示器 */}
          <div style={{ textAlign: 'center', marginBottom: '4px' }}>
            <div
              style={{
                ...ModernCardStyles.priorityTag,
                ...createStatusStyle(priorityColor, 0.1),
              }}
            >
              <div
                style={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: priorityColor,
                  display: 'inline-block',
                  marginRight: '3px',
                  boxShadow: `0 0 4px ${priorityColor}33`,
                }}
              />
              {priority === 'high' ? '高' : priority === 'medium' ? '中' : '低'}
            </div>
          </div>

          {/* 模块信息 - 使用智能文字截断 */}
          {module && (
            <Typography.Text
              style={{
                ...TextTruncation.singleLine,
                color: '#6b7280',
                display: 'block',
                textAlign: 'center',
                fontSize: '9px',
                fontWeight: '500',
              }}
              title={module}
            >
              {module}
            </Typography.Text>
          )}

          {/* 状态图标 */}
          <div style={{
            textAlign: 'center',
            marginTop: '4px'
          }}>
            <div style={{
              ...ModernCardStyles.icon,
              fontSize: '12px',
              color: statusInfo.color,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...createStatusStyle(statusInfo.color, 0.1),
              borderRadius: '50%',
              width: '20px',
              height: '20px',
            }}>
              {statusInfo.icon}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default memo(TestCaseNode);