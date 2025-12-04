import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from '@xyflow/react';

// 定义边的自定义数据类型
interface CustomEdgeData extends Record<string, unknown> {
  label?: string;
  relationship?: string;
  strength?: number; // 连接强度，影响边样式
  animated?: boolean; // 是否启用动画
}

/**
 * 自定义贝塞尔曲线边组件
 * 使用优美的贝塞尔曲线替代直线，提供丰富的视觉效果
 */
const CustomBezierEdge = memo<EdgeProps<Edge<CustomEdgeData>>>(
  function CustomBezierEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
    selected,
  }) {
    // 计算贝塞尔曲线路径
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature: 0.25, // 控制曲线的弯曲程度
    });

    // 获取连接强度，默认为中等强度
    const strength = data?.strength || 3;

    // 根据连接强度计算边的样式 - 更细的线条
    const strokeWidth = Math.max(0.5, Math.min(2, strength * 0.4));

    // 根据选择状态和连接强度计算颜色
    const getStrokeColor = () => {
      if (selected) {
        return '#3b82f6'; // 选中时使用蓝色
      }

      // 根据连接强度设置不同的颜色
      if (strength >= 4) {
        return '#16a34a'; // 强连接：绿色
      } else if (strength >= 2) {
        return '#6b7280'; // 中等连接：灰色
      } else {
        return '#9ca3af'; // 弱连接：浅灰色
      }
    };

    // 处理边的点击事件
    const onEdgeClick = () => {
      console.log(`Custom edge clicked: ${id}`, data);
    };

    return (
      <>
        {/* 主边 */}
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            ...style,
            strokeWidth,
            stroke: getStrokeColor(),
            filter: selected
              ? 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))'
              : 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        {/* 如果需要动画效果，添加动画边 */}
        {(data?.animated || selected) && (
          <BaseEdge
            id={`${id}-animated`}
            path={edgePath}
            markerEnd={markerEnd}
            style={{
              ...style,
              strokeWidth,
              stroke: 'url(#animatedGradient)',
              strokeDasharray: '8 4',
              animation: 'dashAnimation 2s linear infinite',
              filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.3))',
            }}
          />
        )}

        {/* 边标签 */}
        {data?.label && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                background: selected
                  ? 'rgba(59, 130, 246, 0.9)'
                  : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(8px)',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: '600',
                color: selected ? '#ffffff' : '#374151',
                border: `1px solid ${selected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer',
                pointerEvents: 'all',
                transition: 'all 0.2s ease-in-out',
                whiteSpace: 'nowrap',
              }}
              onClick={onEdgeClick}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = `translate(-50%, -50%) translate(${labelX}px,${labelY}px) scale(1.05)`;
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = `translate(-50%, -50%) translate(${labelX}px,${labelY}px) scale(1)`;
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
              }}
            >
              {data.label}
            </div>
          </EdgeLabelRenderer>
        )}

        {/* 定义渐变色 */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <linearGradient id="animatedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>

        {/* 添加样式标签用于动画 */}
        <style>{`
          @keyframes dashAnimation {
            to {
              stroke-dashoffset: -24;
            }
          }
        `}</style>
      </>
    );
  }
);

// 为性能优化添加 displayName
CustomBezierEdge.displayName = 'CustomBezierEdge';

export default CustomBezierEdge;