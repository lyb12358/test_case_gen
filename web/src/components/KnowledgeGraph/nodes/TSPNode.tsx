import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, Typography, Space, Badge } from 'antd';
import { CrownOutlined, ProjectOutlined, FileTextOutlined } from '@ant-design/icons';
import { getNodeColors, getNodeSize, GlassStyles } from '../styles/KnowledgeGraphStyles';

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

      {/* 玻璃拟态节点卡片 */}
      <div
        style={{
          width: sizes.width,
          minWidth: sizes.width,
          height: sizes.height,
          ...GlassStyles.glassCard,
          background: colors.gradient,
          borderColor: selected ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)',
          borderWidth: selected ? 3 : 2,
          transform: selected ? GlassStyles.selectedEffect.transform : 'scale(1)',
          boxShadow: selected
            ? GlassStyles.selectedEffect.boxShadow
            : `0 8px 32px ${colors.shadow}, 0 4px 16px rgba(0, 0, 0, 0.1)`,
          transition: GlassStyles.transition,
          cursor: 'pointer',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {/* 标题区域 */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <Space align="center" size={8}>
            <CrownOutlined
              style={{
                fontSize: `${sizes.iconSize}px`,
                color: 'rgba(255, 255, 255, 0.9)',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
              }}
            />
            <Title
              level={4}
              style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.95)',
                fontWeight: 'bold',
                fontSize: `${sizes.fontSize}px`,
                lineHeight: '1.2',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              }}
            >
              {label}
            </Title>
          </Space>
        </div>

        {/* 统计数据 - 玻璃拟态样式 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {/* 项目统计 */}
          <div
            style={{
              backdropFilter: 'blur(8px)',
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Space direction="vertical" size={2} align="center">
              <ProjectOutlined
                style={{
                  fontSize: '16px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              />
              <Text style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)' }}>项目</Text>
              <Badge
                count={finalStats.projectCount}
                style={{
                  backgroundColor: 'rgba(37, 99, 235, 0.8)',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}
                overflowCount={99}
              />
            </Space>
          </div>

          {/* 测试用例统计 */}
          <div
            style={{
              backdropFilter: 'blur(8px)',
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Space direction="vertical" size={2} align="center">
              <FileTextOutlined
                style={{
                  fontSize: '16px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                }}
              />
              <Text style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)' }}>测试</Text>
              <Badge
                count={finalStats.testCaseCount}
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.8)',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}
                overflowCount={999}
              />
            </Space>
          </div>

          {/* 业务类型统计 */}
          <div
            style={{
              backdropFilter: 'blur(8px)',
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Space direction="vertical" size={2} align="center">
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: 'rgba(147, 51, 234, 0.8)',
                }}
              />
              <Text style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)' }}>业务</Text>
              <Badge
                count={finalStats.businessTypeCount}
                style={{
                  backgroundColor: 'rgba(147, 51, 234, 0.8)',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}
                overflowCount={99}
              />
            </Space>
          </div>

          {/* 测试点统计 */}
          <div
            style={{
              backdropFilter: 'blur(8px)',
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Space direction="vertical" size={2} align="center">
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  background: 'rgba(14, 165, 233, 0.8)',
                }}
              />
              <Text style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)' }}>测试点</Text>
              <Badge
                count={finalStats.testPointCount}
                style={{
                  backgroundColor: 'rgba(14, 165, 233, 0.8)',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}
                overflowCount={999}
              />
            </Space>
          </div>
        </div>

        {/* 底部装饰 */}
        <div
          style={{
            marginTop: '12px',
            height: '3px',
            background: `linear-gradient(90deg, transparent 0%, ${colors.primary} 50%, transparent 100%)`,
            borderRadius: '2px',
          }}
        />
      </div>
    </>
  );
};

export default memo(TSPNode);