import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Typography, Space, Badge } from 'antd';
import { CrownOutlined, ProjectOutlined, FileTextOutlined } from '@ant-design/icons';
import {
  getNodeColors,
  getNodeSize,
  ModernCardStyles,
  WhiteBackgroundNodeStyles,
  NodeSpecificStyles,
  TextTruncation,
  KnowledgeGraphColors
} from '../styles/KnowledgeGraphStyles';

const { Title, Text } = Typography;

interface TSPNodeData {
  label: string;
  nodeType: 'tsp';
  level: number;
  color: string;
  projectCount?: number;
  testCaseCount?: number;
  businessTypeCount?: number;
  testPointCount?: number;
  stats?: {
    projectCount: number;
    businessTypeCount: number;
    testCaseCount: number;
    testPointCount: number;
  };
}

interface TSPNodeProps {
  id: string;
  data: TSPNodeData;
  selected?: boolean;
}

/**
 * TSP根节点组件 - 思维导图的中心节点
 */
const TSPNode: React.FC<TSPNodeProps> = ({ id, data, selected }) => {
  const {
    label = 'TSP测试用例生成平台',
    projectCount = 0,
    testCaseCount = 0,
    businessTypeCount = 0,
    testPointCount = 0,
    stats,
  } = data;

  // 获取TSP节点的颜色和尺寸
  const colors = getNodeColors('tsp');
  const sizes = getNodeSize('tsp');

  // 合并统计数据
  const finalStats = {
    projectCount: projectCount || stats?.projectCount || 0,
    testCaseCount: testCaseCount || stats?.testCaseCount || 0,
    businessTypeCount: businessTypeCount || stats?.businessTypeCount || 0,
    testPointCount: testPointCount || stats?.testPointCount || 0,
  };

  return (
    <>
      {/* 连接点 */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: colors.primary,
          border: '2px solid rgba(255, 255, 255, 0.8)',
          width: 12,
          height: 12,
        }}
      />

      {/* 现代化TSP节点卡片 */}
      <div
        style={{
          ...WhiteBackgroundNodeStyles.tsp,
          ...(selected ? ModernCardStyles.selectedCard : ModernCardStyles.card),
          ...(selected && ModernCardStyles.hoverCard),
          background: '#ffffff',
          borderColor: selected ? colors.primary : colors.primary,
          borderWidth: selected ? 4 : 3,
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
            <CrownOutlined
              style={{
                ...ModernCardStyles.icon,
                color: colors.primary,
                fontSize: '20px'
              }}
            />
            <Typography.Title
              level={4}
              style={{
                ...ModernCardStyles.title,
                color: '#111827',
                fontWeight: 'bold',
                margin: 0,
                fontSize: `${sizes.fontSize}px`,
                lineHeight: '1.2',
              }}
            >
              {label}
            </Typography.Title>
          </div>

          {/* 统计数据网格 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginTop: '8px'
          }}>
            {/* 项目统计 */}
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.08)',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.15)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              }}
            >
              <Space direction="vertical" size={2} align="center">
                <ProjectOutlined
                  style={{
                    ...ModernCardStyles.icon,
                    color: KnowledgeGraphColors.project.primary,
                    fontSize: '16px'
                  }}
                />
                <Typography.Text style={{
                  fontSize: '11px',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  项目
                </Typography.Text>
                <Badge
                  count={finalStats.projectCount}
                  style={{
                    backgroundColor: KnowledgeGraphColors.project.primary,
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}
                  overflowCount={99}
                />
              </Space>
            </div>

            {/* 测试用例统计 */}
            <div
              style={{
                background: 'rgba(34, 197, 94, 0.08)',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid rgba(34, 197, 94, 0.15)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              }}
            >
              <Space direction="vertical" size={2} align="center">
                <FileTextOutlined
                  style={{
                    ...ModernCardStyles.icon,
                    color: KnowledgeGraphColors.testCase.primary,
                    fontSize: '16px'
                  }}
                />
                <Typography.Text style={{
                  fontSize: '11px',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  测试
                </Typography.Text>
                <Badge
                  count={finalStats.testCaseCount}
                  style={{
                    backgroundColor: KnowledgeGraphColors.testCase.primary,
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}
                  overflowCount={999}
                />
              </Space>
            </div>

            {/* 业务类型统计 */}
            <div
              style={{
                background: 'rgba(147, 51, 234, 0.08)',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid rgba(147, 51, 234, 0.15)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              }}
            >
              <Space direction="vertical" size={2} align="center">
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: KnowledgeGraphColors.business.primary,
                    boxShadow: '0 1px 3px rgba(147, 51, 234, 0.3)',
                  }}
                />
                <Typography.Text style={{
                  fontSize: '11px',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  业务
                </Typography.Text>
                <Badge
                  count={finalStats.businessTypeCount}
                  style={{
                    backgroundColor: KnowledgeGraphColors.business.primary,
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}
                  overflowCount={99}
                />
              </Space>
            </div>

            {/* 测试点统计 */}
            <div
              style={{
                background: 'rgba(14, 165, 233, 0.08)',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid rgba(14, 165, 233, 0.15)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              }}
            >
              <Space direction="vertical" size={2} align="center">
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    background: KnowledgeGraphColors.testPoint.primary,
                    boxShadow: '0 1px 3px rgba(14, 165, 233, 0.3)',
                  }}
                />
                <Typography.Text style={{
                  fontSize: '11px',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  测试点
                </Typography.Text>
                <Badge
                  count={finalStats.testPointCount}
                  style={{
                    backgroundColor: KnowledgeGraphColors.testPoint.primary,
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}
                  overflowCount={999}
                />
              </Space>
            </div>
          </div>
        </div>

        {/* 移除底部装饰条，保持简洁的白色背景设计 */}
      </div>
    </>
  );
};

export default memo(TSPNode);