import React, { useEffect, useRef, useCallback } from 'react';
import { Graph as G6Graph } from '@antv/g6';
import { Renderer as CanvasRenderer } from '@antv/g-canvas';
import type { GraphOptions } from '@antv/g6';

/**
 * 简化的G6 Graph组件 - 基于官方文档推荐模式
 *
 * 核心特性：
 * - 使用官方推荐的简单useEffect模式
 * - 正确的渲染器配置
 * - 简洁的生命周期管理
 * - 稳定的事件处理
 */
export interface GraphProps {
  options: GraphOptions;
  onRender?: (graph: G6Graph) => void;
  onDestroy?: () => void;
  onNodeClick?: (event: any) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Graph: React.FC<GraphProps> = ({
  options,
  onRender,
  onDestroy,
  onNodeClick,
  className,
  style = { width: '100%', height: '100%' }
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 稳定的事件处理器
  const handleNodeClick = useCallback((event: any) => {
    try {
      onNodeClick?.(event);
    } catch (error) {
      console.error('Node click callback error:', error);
    }
  }, [onNodeClick]);

  // 主要的图表创建和销毁逻辑
  useEffect(() => {
    if (!containerRef.current) return;

    // 创建图表实例
    const graph = new G6Graph({
      container: containerRef.current,
      // 使用正确的渲染器函数配置
      renderer: () => new CanvasRenderer(),
      ...options
    });

    // 绑定事件监听器
    if (onNodeClick) {
      graph.on('node:click', handleNodeClick);
    }

    try {
      // 渲染图表
      graph.render();

      // 调用渲染回调
      onRender?.(graph);
    } catch (error) {
      console.error('Graph render error:', error);
    }

    // 清理函数
    return () => {
      try {
        // 移除事件监听器
        if (onNodeClick) {
          graph.off('node:click');
        }

        // 销毁图表实例
        if (!graph.destroyed) {
          graph.destroy();
        }

        // 调用销毁回调
        onDestroy?.();
      } catch (error) {
        console.warn('Graph cleanup error:', error);
      }
    };
  }, [options, onNodeClick, handleNodeClick, onRender, onDestroy]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
    />
  );
};

export default Graph;