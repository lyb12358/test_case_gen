import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Typography, Space, Tag } from 'antd';
import { FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { getNodeColors, getNodeSize, GlassStyles } from '../styles/KnowledgeGraphStyles';

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

  const statusInfo = getStatusInfo();
  const priorityColor = getPriorityColor();

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

      {/* 玻璃拟态节点卡片 */}
      <div
        style={{
          width: sizes.width,
          minWidth: sizes.width,
          height: sizes.height,
          ...GlassStyles.glassCard,
          background: colors.gradient,
          borderColor: selected ? 'rgba(255, 255, 255, 0.6)' : colors.primary,
          borderWidth: selected ? 3 : 2,
          transform: selected ? GlassStyles.selectedEffect.transform : 'scale(1)',
          boxShadow: selected
            ? `0 12px 40px ${colors.shadow}, 0 6px 20px rgba(0, 0, 0, 0.15)`
            : `0 8px 32px ${colors.shadow}, 0 4px 16px rgba(0, 0, 0, 0.1)`,
          transition: GlassStyles.transition,
          cursor: 'pointer',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* 标题区域 */}
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <Space align="center" size={4}>
            <div style={{
              fontSize: `${sizes.iconSize}px`,
              color: 'rgba(255, 255, 255, 0.9)',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            }}>
              {stage === 'test_point' ? '📝' : <FileTextOutlined />}
            </div>
            <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
              <Title
                level={5}
                style={{
                  margin: 0,
                  color: 'rgba(255, 255, 255, 0.95)',
                  fontWeight: 'bold',
                  fontSize: `${sizes.labelFontSize}px`,
                  lineHeight: '1.2',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                }}
                title={label}
              >
                {label}
              </Title>
            </div>
          </Space>
        </div>

        {/* 阶段和状态标签 - 玻璃拟态样式 */}
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <Space size={2}>
            <div
              style={{
                display: 'inline-block',
                backdropFilter: 'blur(8px)',
                background: stage === 'test_point'
                  ? 'rgba(14, 165, 233, 0.2)'
                  : 'rgba(22, 163, 74, 0.2)',
                padding: '1px 4px',
                borderRadius: '8px',
                border: stage === 'test_point'
                  ? '1px solid rgba(14, 165, 233, 0.3)'
                  : '1px solid rgba(22, 163, 74, 0.3)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Text
                style={{
                  fontSize: '9px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: '500',
                  lineHeight: '1.2',
                }}
              >
                {stage === 'test_point' ? '测试点' : '测试用例'}
              </Text>
            </div>
            <div
              style={{
                display: 'inline-block',
                backdropFilter: 'blur(8px)',
                background: `${statusInfo.color}20`,
                padding: '1px 4px',
                borderRadius: '8px',
                border: `1px solid ${statusInfo.color}40`,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Text
                style={{
                  fontSize: '9px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: '500',
                  lineHeight: '1.2',
                }}
              >
                {statusInfo.text}
              </Text>
            </div>
          </Space>
        </div>

        {/* 优先级指示器 - 玻璃拟态样式 */}
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              backdropFilter: 'blur(8px)',
              background: `${priorityColor}20`,
              border: `1px solid ${priorityColor}40`,
              borderRadius: '10px',
              padding: '2px 6px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: priorityColor,
                boxShadow: `0 0 4px ${priorityColor}50`,
              }}
            />
            <Text style={{
              fontSize: '7px',
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: '500',
            }}>
              {priority === 'high' ? '高' : priority === 'medium' ? '中' : '低'}
            </Text>
          </div>
        </div>

        {/* 模块信息 */}
        {module && (
          <Text
            style={{
              fontSize: '7px',
              color: 'rgba(255, 255, 255, 0.8)',
              display: 'block',
              textAlign: 'center',
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
            }}
            title={module}
          >
            {module}
          </Text>
        )}

        {/* 状态图标 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.9)',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            display: 'inline-block',
            backdropFilter: 'blur(8px)',
            background: `${statusInfo.color}15`,
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            lineHeight: '20px',
            border: `1px solid ${statusInfo.color}30`,
          }}>
            {statusInfo.icon}
          </div>
        </div>
      </div>
    </>
  );
};

export default memo(TestCaseNode);