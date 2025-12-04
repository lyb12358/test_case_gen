import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Typography, Space, Tag, Progress } from 'antd';
import { ProjectOutlined, BranchesOutlined, SettingOutlined } from '@ant-design/icons';
import { getNodeColors, getNodeSize, GlassStyles } from '../styles/KnowledgeGraphStyles';

const { Title, Text } = Typography;

interface ProjectNodeData {
  label: string;
  nodeType: 'project';
  level: number;
  color: string;
  description?: string;
  isActive?: boolean;
  businessTypes?: string[];
  testCaseCount?: number;
  progress?: number;
}

interface ProjectNodeProps {
  id: string;
  data: ProjectNodeData;
  selected?: boolean;
}

/**
 * 项目节点组件 - 第二层节点
 */
const ProjectNode: React.FC<ProjectNodeProps> = ({ id, data, selected }) => {
  const {
    label = '未知项目',
    description,
    isActive = true,
    businessTypes = [],
    testCaseCount = 0,
    progress = 0,
    color = '#52c41a'
  } = data;

  // 获取项目节点的颜色和尺寸
  const colors = getNodeColors('project');
  const sizes = getNodeSize('project');

  // 计算项目状态颜色
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
          width: 10,
          height: 10,
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: colors.primary,
          border: '2px solid rgba(255, 255, 255, 0.8)',
          width: 10,
          height: 10,
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
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* 标题区域 */}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <Space align="center" size={6}>
            <ProjectOutlined
              style={{
                fontSize: `${sizes.iconSize}px`,
                color: isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(156, 163, 175, 0.9)',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              }}
            />
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
          </Space>
        </div>

        {/* 项目状态标签 - 玻璃拟态样式 */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div
            style={{
              display: 'inline-block',
              backdropFilter: 'blur(8px)',
              background: isActive
                ? 'rgba(34, 197, 94, 0.2)'
                : 'rgba(156, 163, 175, 0.2)',
              padding: '2px 8px',
              borderRadius: '12px',
              border: isActive
                ? '1px solid rgba(34, 197, 94, 0.3)'
                : '1px solid rgba(156, 163, 175, 0.3)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Text
              style={{
                fontSize: '10px',
                color: isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.7)',
                fontWeight: '500',
              }}
            >
              {isActive ? '活跃' : '非活跃'}
            </Text>
          </div>
        </div>

        {/* 描述信息 */}
        {description && (
          <Text
            style={{
              fontSize: '10px',
              color: '#666',
              display: 'block',
              textAlign: 'center',
              marginBottom: '8px',
              height: '28px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: '1.4',
            }}
          >
            {description}
          </Text>
        )}

        {/* 统计信息 - 玻璃拟态样式 */}
        <div style={{ marginBottom: '8px' }}>
          <Space size={12} style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
            <div
              style={{
                backdropFilter: 'blur(8px)',
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '6px 8px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                textAlign: 'center',
              }}
            >
              <BranchesOutlined
                style={{
                  fontSize: '14px',
                  color: isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(156, 163, 175, 0.9)',
                  display: 'block',
                  marginBottom: '2px',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                }}
              />
              <Text style={{ fontSize: '10px', color: isActive ? 'rgba(255, 255, 255, 0.8)' : 'rgba(156, 163, 175, 0.8)' }}>
                业务
              </Text>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: isActive ? 'rgba(255, 255, 255, 0.95)' : 'rgba(156, 163, 175, 0.95)',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                }}
              >
                {businessTypes.length}
              </div>
            </div>
            <div
              style={{
                backdropFilter: 'blur(8px)',
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '6px 8px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                textAlign: 'center',
              }}
            >
              <SettingOutlined
                style={{
                  fontSize: '14px',
                  color: isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(156, 163, 175, 0.9)',
                  display: 'block',
                  marginBottom: '2px',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                }}
              />
              <Text style={{ fontSize: '10px', color: isActive ? 'rgba(255, 255, 255, 0.8)' : 'rgba(156, 163, 175, 0.8)' }}>
                测试
              </Text>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: isActive ? 'rgba(255, 255, 255, 0.95)' : 'rgba(156, 163, 175, 0.95)',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                }}
              >
                {testCaseCount}
              </div>
            </div>
          </Space>
        </div>

        {/* 进度条 - 玻璃拟态样式 */}
        {progress > 0 && (
          <div style={{ marginBottom: '6px' }}>
            <Progress
              percent={progress}
              size="small"
              strokeColor={colors.primary}
              showInfo={false}
              style={{ margin: 0 }}
            />
            <Text
              style={{
                fontSize: '9px',
                color: isActive ? 'rgba(255, 255, 255, 0.8)' : 'rgba(156, 163, 175, 0.8)',
                textAlign: 'center',
                display: 'block',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
              }}
            >
              完成度 {progress}%
            </Text>
          </div>
        )}

        {/* 底部装饰 */}
        <div
          style={{
            height: '2px',
            background: `linear-gradient(90deg, transparent 0%, ${colors.primary} 50%, transparent 100%)`,
            borderRadius: '1px',
            opacity: isActive ? 1 : 0.3,
          }}
        />
      </div>
    </>
  );
};

export default memo(ProjectNode);