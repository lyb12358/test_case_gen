import React, { memo, useMemo, useCallback } from 'react';
import { Card, Typography, Space } from 'antd';
import type { CSSProperties } from 'react';

const { Text } = Typography;

/**
 * Base interface for all knowledge graph nodes
 */
export interface BaseNodeData {
  id: string;
  label: string;
  type: string;
  description?: string;
  businessType?: string;
  extra_data?: Record<string, any>;
  selected?: boolean;
  expanded?: boolean;
  projectId?: number;
  stage?: string;
  status?: string;
  priority?: string;
}

/**
 * Props for BaseNode component
 */
export interface BaseNodeProps {
  id: string;
  data: BaseNodeData;
  density?: 'compact' | 'normal' | 'spacious';
  onClick?: (data: BaseNodeData) => void;
  className?: string;
  style?: CSSProperties;
  children?: React.ReactNode;
}

/**
 * Density configurations for responsive sizing
 */
const DENSITY_CONFIG = {
  compact: {
    padding: 8,
    fontSize: 12,
    titleSize: 14,
    iconSize: 16,
    cardWidth: 200,
    cardHeight: 80
  },
  normal: {
    padding: 12,
    fontSize: 14,
    titleSize: 16,
    iconSize: 20,
    cardWidth: 280,
    cardHeight: 120
  },
  spacious: {
    padding: 16,
    fontSize: 14,
    titleSize: 18,
    iconSize: 24,
    cardWidth: 340,
    cardHeight: 160
  }
};

/**
 * Abstract base component for all knowledge graph nodes
 * Provides consistent styling, memoization, and density support
 */
const BaseNode: React.FC<BaseNodeProps> = memo(({
  id,
  data,
  density = 'normal',
  onClick,
  className,
  style,
  children
}) => {
  const config = useMemo(() => DENSITY_CONFIG[density], [density]);

  const handleClick = useCallback(() => {
    onClick?.(data);
  }, [data, onClick]);

  const cardStyle = useMemo((): CSSProperties => ({
    width: config.cardWidth,
    minHeight: config.cardHeight,
    borderRadius: 8,
    border: data.selected ? '2px solid #1890ff' : '1px solid #d9d9d9',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.3s ease',
    padding: config.padding,
    ...style
  }), [config, data.selected, onClick, style]);

  const memoizedChildren = useMemo(() => children, [children]);

  return (
    <Card
      hoverable={!!onClick}
      className={className}
      style={cardStyle}
      onClick={handleClick}
      size="small"
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {memoizedChildren}
      </Space>
    </Card>
  );
});

BaseNode.displayName = 'BaseNode';

/**
 * Higher-order component to create specific node types
 * Provides consistent interface and behavior
 */
export const createNodeComponent = <T extends BaseNodeData>(
  displayName: string,
  renderContent: (data: T, config: typeof DENSITY_CONFIG[keyof typeof DENSITY_CONFIG]) => React.ReactNode,
  defaultStyle?: CSSProperties
) => {
  const NodeComponent = memo<BaseNodeProps & { data: T }>(({
    data,
    density = 'normal',
    onClick,
    className,
    style
  }) => {
    const config = useMemo(() => DENSITY_CONFIG[density], [density]);

    const handleClick = useCallback(() => {
      onClick?.(data);
    }, [data, onClick]);

    const cardStyle = useMemo((): CSSProperties => ({
      width: config.cardWidth,
      minHeight: config.cardHeight,
      borderRadius: 8,
      border: data.selected ? '2px solid #1890ff' : '1px solid #d9d9d9',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.3s ease',
      padding: config.padding,
      ...defaultStyle,
      ...style
    }), [config, data.selected, onClick, defaultStyle, style]);

    const content = useMemo(() => renderContent(data, config), [data, config]);

    return (
      <Card
        hoverable={!!onClick}
        className={className}
        style={cardStyle}
        onClick={handleClick}
        size="small"
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {content}
        </Space>
      </Card>
    );
  });

  NodeComponent.displayName = displayName;
  return NodeComponent;
};

/**
 * Utility function to get node type-specific styling
 */
export const getNodeTypeStyle = (nodeType: string): CSSProperties => {
  const typeStyles: Record<string, CSSProperties> = {
    tsp: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      border: 'none',
      color: '#fff'
    },
    project: {
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      border: 'none',
      color: '#fff'
    },
    business: {
      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      border: 'none',
      color: '#fff'
    },
    test_case: {
      background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      border: 'none',
      color: '#fff'
    },
    interface: {
      background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      border: 'none',
      color: '#fff'
    },
    scenario: {
      background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      border: 'none',
      color: '#fff'
    }
  };

  return typeStyles[nodeType] || {};
};

/**
 * Utility function to format node labels based on density
 */
export const formatNodeLabel = (label: string, density: string): string => {
  const maxLength = density === 'compact' ? 15 : density === 'normal' ? 25 : 35;

  if (label.length <= maxLength) {
    return label;
  }

  return `${label.substring(0, maxLength)}...`;
};

export default BaseNode;