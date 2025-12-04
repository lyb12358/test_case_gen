import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Typography, Space, Tag, Progress } from 'antd';
import { ProjectOutlined, BranchesOutlined, SettingOutlined } from '@ant-design/icons';
import {
  getNodeColors,
  getNodeSize,
  ModernCardStyles,
  WhiteBackgroundNodeStyles,
  NodeSpecificStyles,
  TextTruncation,
  StatusColors
} from '../styles/KnowledgeGraphStyles';

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

      {/* 现代化项目节点卡片 */}
      <div
        style={{
          ...WhiteBackgroundNodeStyles.project,
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
            <ProjectOutlined
              style={{
                ...ModernCardStyles.icon,
                color: isActive ? colors.primary : '#9ca3af',
                fontSize: '18px'
              }}
            />
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
          </div>

          {/* 项目状态标签 */}
          <div style={{ textAlign: 'center', marginBottom: '6px' }}>
            <div
              style={{
                ...ModernCardStyles.statusTag,
                background: isActive
                  ? StatusColors.completed.bg
                  : StatusColors.draft.bg,
                color: isActive
                  ? StatusColors.completed.text
                  : StatusColors.draft.text,
                border: `1px solid ${isActive ? 'rgba(34, 197, 94, 0.3)' : 'rgba(156, 163, 175, 0.3)'}`,
                backdropFilter: 'blur(8px)',
              }}
            >
              {isActive ? '活跃' : '非活跃'}
            </div>
          </div>

          {/* 描述信息 - 使用智能文字截断 */}
          {description && (
            <Typography.Text
              style={{
                ...ModernCardStyles.multilineText,
                color: isActive ? 'rgba(255, 255, 255, 0.8)' : '#6b7280',
                textAlign: 'center',
                fontSize: '11px',
                height: '32px',
              }}
            >
              {description}
            </Typography.Text>
          )}

          {/* 统计信息网格 */}
          <div style={ModernCardStyles.statsContainer}>
            <div
              style={{
                background: isActive ? 'rgba(59, 130, 246, 0.08)' : '#f9fafb',
                padding: '6px 8px',
                borderRadius: '8px',
                border: isActive ? '1px solid rgba(59, 130, 246, 0.15)' : '1px solid #e5e7eb',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                textAlign: 'center',
                minWidth: '60px',
              }}
            >
              <BranchesOutlined
                style={{
                  ...ModernCardStyles.icon,
                  color: isActive ? colors.primary : '#9ca3af',
                  display: 'block',
                  marginBottom: '2px',
                  fontSize: '14px'
                }}
              />
              <Typography.Text style={{
                fontSize: '10px',
                color: isActive ? '#374151' : '#6b7280',
                fontWeight: '500'
              }}>
                业务
              </Typography.Text>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: isActive ? '#111827' : '#6b7280',
                }}
              >
                {businessTypes.length}
              </div>
            </div>

            <div
              style={{
                background: isActive ? 'rgba(59, 130, 246, 0.08)' : '#f9fafb',
                padding: '6px 8px',
                borderRadius: '8px',
                border: isActive ? '1px solid rgba(59, 130, 246, 0.15)' : '1px solid #e5e7eb',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                textAlign: 'center',
                minWidth: '60px',
              }}
            >
              <SettingOutlined
                style={{
                  ...ModernCardStyles.icon,
                  color: isActive ? colors.primary : '#9ca3af',
                  display: 'block',
                  marginBottom: '2px',
                  fontSize: '14px'
                }}
              />
              <Typography.Text style={{
                fontSize: '10px',
                color: isActive ? '#374151' : '#6b7280',
                fontWeight: '500'
              }}>
                测试
              </Typography.Text>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: isActive ? '#111827' : '#6b7280',
                }}
              >
                {testCaseCount}
              </div>
            </div>
          </div>

          {/* 进度条 */}
          {progress > 0 && (
            <div style={{ marginTop: '6px' }}>
              <Progress
                percent={progress}
                size="small"
                strokeColor={isActive ? colors.primary : '#9ca3af'}
                showInfo={false}
                style={{ margin: 0 }}
              />
              <Typography.Text
                style={{
                  fontSize: '9px',
                  color: isActive ? 'rgba(255, 255, 255, 0.8)' : '#6b7280',
                  textAlign: 'center',
                  display: 'block',
                  fontWeight: '500',
                }}
              >
                完成度 {progress}%
              </Typography.Text>
            </div>
          )}
        </div>

        {/* 移除底部装饰条，保持简洁的白色背景设计 */}
      </div>
    </>
  );
};

export default memo(ProjectNode);