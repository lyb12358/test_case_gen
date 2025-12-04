import dagre from 'dagre';

// React Flow节点类型定义
export interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType: string; // 允许任何字符串类型，提供更好的兼容性
    level: number;
    originalData?: any;
    [key: string]: any;
  };
  width?: number;
  height?: number;
  sourcePosition?: string;
  targetPosition?: string;
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: {
    label?: string;
    relationship?: string;
    strength?: number;
    animated?: boolean;
  };
  style?: any;
  markerEnd?: string;
}

// 布局方向类型
export type LayoutDirection = 'TB' | 'LR' | 'BT' | 'RL';

// 节点尺寸配置
const NODE_DIMENSIONS = {
  tsp: { width: 200, height: 100 },
  project: { width: 180, height: 90 },
  business: { width: 160, height: 80 },
  business_type: { width: 160, height: 80 }, // 保留向后兼容
  test_point: { width: 140, height: 70 },
  test_case: { width: 120, height: 60 },
};

// 默认节点尺寸（用于未知类型）
const DEFAULT_NODE_DIMENSIONS = { width: 150, height: 80 };

/**
 * 获取节点尺寸，包含回退机制
 */
function getNodeDimensions(nodeType: string) {
  const dimensions = NODE_DIMENSIONS[nodeType as keyof typeof NODE_DIMENSIONS];
  if (!dimensions) {
    console.warn(`Unknown node type: "${nodeType}". Using default dimensions.`);
    return DEFAULT_NODE_DIMENSIONS;
  }
  return dimensions;
}

/**
 * React Flow官方推荐的Dagre布局算法
 * 使用官方模式实现专业的思维导图布局
 */
export function getLayoutedElements(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[],
  direction: LayoutDirection = 'TB'
): {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
} {
  // 创建Dagre图实例
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // 设置图配置
  dagreGraph.setGraph({
    rankdir: direction,           // 布局方向
    nodesep: 100,                // 节点间水平距离
    ranksep: 150,                // 层级间垂直距离
    marginx: 50,                 // 图的水平边距
    marginy: 50,                 // 图的垂直边距
    align: 'UL',                 // 对齐方式 (Upper Left)
  });

  // 设置默认节点尺寸
  const nodeWidth = 200;
  const nodeHeight = 100;

  // 为每个节点设置维度
  nodes.forEach((node) => {
    try {
      const dimensions = getNodeDimensions(node.data.nodeType);
      dagreGraph.setNode(node.id, {
        width: dimensions.width,
        height: dimensions.height,
      });
    } catch (error) {
      console.error(`Error setting dimensions for node ${node.id}:`, error);
      // 使用默认尺寸作为回退
      dagreGraph.setNode(node.id, DEFAULT_NODE_DIMENSIONS);
    }
  });

  // 添加边到图中
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // 运行布局算法
  dagre.layout(dagreGraph);

  // 计算节点位置
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const dimensions = NODE_DIMENSIONS[node.data.nodeType as keyof typeof NODE_DIMENSIONS];

    // Dagre计算的是左上角位置，React Flow需要中心位置
    const x = nodeWithPosition.x - dimensions.width / 2;
    const y = nodeWithPosition.y - dimensions.height / 2;

    // 根据布局方向设置句柄位置
    const handlePositions = getHandlePositions(direction);

    return {
      ...node,
      position: { x, y },
      sourcePosition: handlePositions.source,
      targetPosition: handlePositions.target,
    };
  });

  // 优化边配置 - 使用自定义贝塞尔曲线
  const layoutedEdges = edges.map((edge) => ({
    ...edge,
    type: 'customBezier', // 使用自定义贝塞尔曲线边
    data: {
      label: edge.data?.label || edge.data?.relationship,
      relationship: edge.data?.relationship || 'contains',
      strength: edge.data?.strength || 3, // 默认中等强度
      animated: edge.data?.animated || false, // 默认不动画
    },
    style: {
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
    markerEnd: 'arrowclosed',
  }));

  return {
    nodes: layoutedNodes,
    edges: layoutedEdges,
  };
}

/**
 * 根据布局方向计算句柄位置
 */
function getHandlePositions(direction: LayoutDirection): {
  source: Position;
  target: Position;
} {
  switch (direction) {
    case 'TB': // Top to Bottom
      return {
        source: 'bottom' as Position,
        target: 'top' as Position,
      };
    case 'BT': // Bottom to Top
      return {
        source: 'top' as Position,
        target: 'bottom' as Position,
      };
    case 'LR': // Left to Right
      return {
        source: 'right' as Position,
        target: 'left' as Position,
      };
    case 'RL': // Right to Left
      return {
        source: 'left' as Position,
        target: 'right' as Position,
      };
    default:
      return {
        source: 'bottom' as Position,
        target: 'top' as Position,
      };
  }
}

/**
 * 位置类型枚举 (从@xyflow/react导入)
 */
export enum Position {
  Top = 'top',
  Right = 'right',
  Bottom = 'bottom',
  Left = 'left',
}

/**
 * 布局配置预设
 */
export const LAYOUT_PRESETS = {
  VERTICAL: {
    direction: 'TB' as LayoutDirection,
    name: '垂直布局',
    description: '从上到下的思维导图布局',
  },
  HORIZONTAL: {
    direction: 'LR' as LayoutDirection,
    name: '水平布局',
    description: '从左到右的思维导图布局',
  },
  BOTTOM_TO_TOP: {
    direction: 'BT' as LayoutDirection,
    name: '逆向垂直布局',
    description: '从下到上的思维导图布局',
  },
  RIGHT_TO_LEFT: {
    direction: 'RL' as LayoutDirection,
    name: '逆向水平布局',
    description: '从右到左的思维导图布局',
  },
};

/**
 * 默认导出便捷函数
 */
export default getLayoutedElements;