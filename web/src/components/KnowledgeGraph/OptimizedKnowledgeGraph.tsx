import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  startTransition,
  Suspense,
  lazy
} from 'react';
import { Card, Button, Drawer, Typography, Divider, Tag, Space, Tooltip, Select, Spin } from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  CompressOutlined,
  FullscreenOutlined,
  ApartmentOutlined,
  RadiusSettingOutlined
} from '@ant-design/icons';
import type { GraphOptions } from '@antv/g6';

import { Graph } from './Graph';
import KnowledgeGraphErrorBoundary from './ErrorBoundary';
import NodeLegend from './NodeLegend';
import type { KnowledgeGraphData, GraphNode, GraphRelation } from '../../types/knowledgeGraph';
import { knowledgeGraphService } from '../../services/knowledgeGraphService';

const { Option } = Select;
const { Text, Title, Paragraph } = Typography;

// Lazy load heavy components
const LazyNodeDetails = lazy(() => import('./NodeDetails'));
const NodeDetails = React.lazy(() => import('./NodeDetails'));

// Layout types
export type LayoutType = 'force-directed' | 'mindmap';
export type DensityLevel = 'compact' | 'normal' | 'spacious';

// Layout configuration
export interface LayoutConfig {
  type: LayoutType;
  name: string;
  icon: React.ReactNode;
  description: string;
  config: any;
}

// Memoized layout options
const LAYOUT_OPTIONS: LayoutConfig[] = [
  {
    type: 'mindmap',
    name: '脑图树布局',
    icon: <ApartmentOutlined />,
    description: '层次化思维导图布局',
    config: {}
  },
  {
    type: 'force-directed',
    name: '力导向布局',
    icon: <RadiusSettingOutlined />,
    description: '自动聚类的网络布局',
    config: {}
  }
];

/**
 * Optimized Knowledge Graph component with React 19 compatibility
 * Features: Strict mode support, memoization, error boundaries, concurrent features
 */
interface OptimizedKnowledgeGraphProps {
  data: KnowledgeGraphData;
  initialLayout?: LayoutType;
  initialDensity?: DensityLevel;
  onError?: (error: Error) => void;
}

const OptimizedKnowledgeGraph: React.FC<OptimizedKnowledgeGraphProps> = ({
  data,
  initialLayout = 'mindmap',
  initialDensity = 'spacious',
  onError
}) => {
  // State management with useState
  const [selectedNode, setSelectedNode] = useState<NodeDetails | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [layoutType, setLayoutType] = useState<LayoutType>(initialLayout);
  const [density, setDensity] = useState<DensityLevel>(initialDensity);
  const [graphReady, setGraphReady] = useState(false);

  // Simplified node type mapping (no registry needed for basic G6 nodes)

  // Get density multipliers
  const getDensityMultipliers = useCallback((densityLevel: DensityLevel) => {
    switch (densityLevel) {
      case 'compact':
        return { node: 0.5, rank: 0.5, radius: 0.6, size: 0.8 };
      case 'normal':
        return { node: 0.8, rank: 0.8, radius: 0.9, size: 0.9 };
      case 'spacious':
        return { node: 1.3, rank: 1.3, radius: 1.2, size: 1.0 };
      default:
        return { node: 1.3, rank: 1.3, radius: 1.2, size: 1.0 };
    }
  }, []);

  // Simplified layout configuration using basic node sizes
  const getLayoutConfig = useCallback((type: LayoutType, densityLevel: DensityLevel) => {
    const multipliers = getDensityMultipliers(densityLevel);

    // Simple node size calculation based on type
    const getNodeBasicSize = (nodeType: string) => {
      switch (nodeType) {
        case 'tsp': return { width: 120, height: 80 };
        case 'project': return { width: 100, height: 60 };
        case 'business': return { width: 80, height: 80 };
        case 'test_case': return { width: 70, height: 70 };
        case 'interface': return { width: 50, height: 50 };
        default: return { width: 60, height: 60 };
      }
    };

    switch (type) {
      case 'mindmap':
        return {
          type: 'mindmap',
          direction: 'LR',
          getWidth: (node: any) => getNodeBasicSize(node.data?.originalType || node.data?.type).width,
          getHeight: (node: any) => getNodeBasicSize(node.data?.originalType || node.data?.type).height,
          getVGap: () => 20 * multipliers.node,
          getHGap: () => 50 * multipliers.node,
          getSide: (node: any) => {
            const nodeType = node.data?.originalType || node.data?.type;
            return ['business', 'project'].includes(nodeType) ? 'right' : 'left';
          },
          preventOverlap: true
        };

      case 'force-directed':
        return {
          type: 'force',
          preventOverlap: true,
          nodeSize: (node: any) => {
            const size = getNodeBasicSize(node.data?.originalType || node.data?.type);
            return Math.max(size.width, size.height) * multipliers.size;
          },
          nodeStrength: (node: any) => {
            const nodeType = node.data?.originalType || node.data?.type;
            const strengths = {
              tsp: -100,
              project: -300,
              business: -200,
              test_case: -250,
              interface: -150
            };
            return strengths[nodeType as keyof typeof strengths] || -200;
          },
          edgeStrength: 0.6,
          linkDistance: (edge: any) => {
            return edge.source?.data?.businessType === edge.target?.data?.businessType
              ? 150 * multipliers.node
              : 250 * multipliers.node;
          },
          damping: 0.9,
          maxSpeed: 200,
          interval: 0.02,
          minMovement: 0.1,
          maxIteration: 300,
          center: [0, 0]
        };

      default:
        return {
          type: 'mindmap',
          direction: 'LR',
          getWidth: (node: any) => getNodeBasicSize(node.data?.originalType || node.data?.type).width,
          getHeight: (node: any) => getNodeBasicSize(node.data?.originalType || node.data?.type).height,
          getVGap: () => 20 * multipliers.node,
          getHGap: () => 50 * multipliers.node,
          getSide: (node: any) => {
            const nodeType = node.data?.originalType || node.data?.type;
            return ['business', 'project'].includes(nodeType) ? 'right' : 'left';
          },
          preventOverlap: true
        };
    }
  }, [getDensityMultipliers]);

  // Simplified data transformation using basic G6 node types
  const g6Data = useMemo(() => {
    if (!data?.nodes || !data?.edges) return { nodes: [], edges: [] };

    return {
      nodes: data.nodes.map((node: any) => {
        const nodeType = node.data?.type || node.type;
        const isTSPRoot = nodeType === 'tsp';

        // Map node types to basic G6 shapes and colors
        let g6Type = 'circle';
        let color = '#1890ff';
        let size = 30;

        switch (nodeType) {
          case 'tsp':
            g6Type = 'rect';
            color = '#722ed1';
            size = [120, 80];
            break;
          case 'project':
            g6Type = 'rect';
            color = '#1890ff';
            size = [120, 80];
            break;
          case 'business_type':
            g6Type = 'rect';
            color = '#722ed1'; // 紫色 - 业务类型节点
            size = [120, 80];
            break;
          case 'test_point':
            g6Type = 'rect';
            color = '#faad14'; // 黄色 - 测试点节点
            size = [140, 80]; // 稍宽以容纳描述
            break;
          case 'test_case':
            g6Type = 'rect';
            color = '#52c41a'; // 绿色 - 测试用例节点
            size = [160, 120]; // 更大以容纳丰富信息
            break;
          case 'interface':
            g6Type = 'circle';
            color = '#13c2c2';
            size = 25;
            break;
          default:
            g6Type = 'circle';
            color = '#999';
            size = 30;
        }

        return {
          id: node.id,
          type: g6Type,
          style: {
            fill: color,
            stroke: selectedNode?.node.id === node.id ? '#ff4d4f' : '#fff',
            lineWidth: selectedNode?.node.id === node.id ? 3 : 2,
            // TSP根节点固定在中心位置
            x: isTSPRoot ? 400 : undefined,
            y: isTSPRoot ? 200 : undefined,
          },
          size: size,
          label: node.data?.label || node.label || node.id,
          data: {
            ...node.data,
            id: node.id,
            label: node.data?.label || node.label || node.id,
            type: nodeType,
            description: node.data?.description || node.description,
            businessType: node.data?.businessType || node.businessType,
            extra_data: node.data?.extra_data || node.extra_data,
            originalType: nodeType, // Keep original type for interactions
          },
        };
      }),
      edges: data.edges.map((edge: any) => ({
        id: edge.id || `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        style: {
          stroke: '#bfbfbf',
          lineWidth: 2,
          endArrow: {
            path: 'M 0,0 L 8,4 L 8,-4 Z',
            fill: '#bfbfbf',
          },
        },
        label: edge.label,
        data: edge.data,
      })),
    };
  }, [data, selectedNode]);

  // Handle node click with simplified data access
  const handleNodeClick = useCallback(async (nodeData: any) => {
    setLoadingDetails(true);

    try {
      // Extract node ID from G6 event or data structure
      let nodeId = nodeData.id || nodeData.itemId || nodeData.data?.id;

      if (!nodeId) {
        console.error('No node ID found in nodeData:', nodeData);
        return;
      }

      const numericId = parseInt(nodeId, 10);
      if (isNaN(numericId)) {
        console.error('Invalid node ID:', nodeId);
        return;
      }

      const relatedData = await knowledgeGraphService.getEntityDetails(numericId);

      // Get the actual node data from our g6Data
      const actualNodeData = g6Data.nodes.find(n => n.id === nodeId);

      startTransition(() => {
        setSelectedNode({
          node: actualNodeData || nodeData,
          relatedNodes: relatedData.related_entities || [],
          edges: relatedData.related_relations || []
        });
        setDrawerVisible(true);
      });
    } catch (error) {
      console.error('Failed to get node details:', error);
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setLoadingDetails(false);
    }
  }, [onError, g6Data]);

  // Simplified graph configuration using basic G6 nodes
  const graphOptions = useMemo((): GraphOptions => {
    return {
      data: g6Data,
      layout: getLayoutConfig(layoutType, density),
      node: {
        style: {
          labelCfg: {
            style: {
              fill: '#fff',
              fontSize: 12,
              fontWeight: 'bold',
            },
          },
        },
      },
      edge: {
        style: {
          labelCfg: {
            autoRotate: true,
            style: {
              fill: '#666',
              fontSize: 10,
              background: {
                fill: '#fff',
                stroke: '#e8e8e8',
                padding: [2, 4, 2, 4],
                radius: 4,
              },
            },
          },
        },
      },
      behaviors: [
        'drag-element',
        'zoom-canvas',
        'drag-canvas',
        'hover-activate',
      ],
    };
  }, [g6Data, layoutType, density]);

  
  // Layout change handler
  const handleLayoutChange = useCallback((value: LayoutType) => {
    startTransition(() => {
      setLayoutType(value);
      localStorage.setItem('knowledge-graph-layout', value);
    });
  }, []);

  // Density change handler
  const handleDensityChange = useCallback((value: DensityLevel) => {
    startTransition(() => {
      setDensity(value);
      localStorage.setItem('knowledge-graph-density', value);
    });
  }, []);

  
  // Restore settings from localStorage
  useEffect(() => {
    const savedLayout = localStorage.getItem('knowledge-graph-layout') as LayoutType;
    const savedDensity = localStorage.getItem('knowledge-graph-density') as DensityLevel;

    if (savedLayout && LAYOUT_OPTIONS.find(opt => opt.type === savedLayout)) {
      setLayoutType(savedLayout);
    }
    if (savedDensity && ['compact', 'normal', 'spacious'].includes(savedDensity)) {
      setDensity(savedDensity);
    }
  }, []);

  // Monitor fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsExpanded(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <KnowledgeGraphErrorBoundary onError={onError}>
      <Card
        title="知识图谱"
        extra={
          <Space>
            <Tooltip title="放大">
              <Button type="text" size="small" icon={<ZoomInOutlined />} />
            </Tooltip>
            <Tooltip title="缩小">
              <Button type="text" size="small" icon={<ZoomOutOutlined />} />
            </Tooltip>
            <Tooltip title="适应视图">
              <Button type="text" size="small" icon={<FullscreenOutlined />} />
            </Tooltip>

            <Divider type="vertical" />

            <Space>
              <span style={{ fontSize: '14px', color: '#666' }}>布局:</span>
              <Select
                value={layoutType}
                onChange={handleLayoutChange}
                style={{ width: 120 }}
                size="small"
              >
                {LAYOUT_OPTIONS.map(option => (
                  <Option key={option.type} value={option.type}>
                    <Space size={4}>
                      {option.icon}
                      <span>{option.name}</span>
                    </Space>
                  </Option>
                ))}
              </Select>
            </Space>

            <Divider type="vertical" />

            <Space>
              <span style={{ fontSize: '14px', color: '#666' }}>密度:</span>
              <Select
                value={density}
                onChange={handleDensityChange}
                style={{ width: 100 }}
                size="small"
              >
                <Option value="compact">紧凑</Option>
                <Option value="normal">正常</Option>
                <Option value="spacious">宽松</Option>
              </Select>
            </Space>
          </Space>
        }
        style={{
          height: isExpanded ? '100vh' : 'auto',
          margin: isExpanded ? 0 : undefined
        }}
        styles={{
          body: {
            padding: isExpanded ? 12 : 24,
            height: isExpanded ? 'calc(100vh - 120px)' : '800px'
          }
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            border: '1px solid #e8e8e8',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {g6Data.nodes.length > 0 ? (
            <Suspense fallback={<Spin size="large" />}>
              <Graph
                options={graphOptions}
                onNodeClick={handleNodeClick}
              />
            </Suspense>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#999',
                fontSize: '16px'
              }}
            >
              <p>暂无图谱数据</p>
              <p>请先生成测试用例以初始化知识图谱</p>
            </div>
          )}

          {/* 节点图例 */}
          <NodeLegend />
        </div>

        {/* 节点详情抽屉 */}
        <Drawer
          title="节点详情"
          placement="right"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          width={480}
          loading={loadingDetails}
        >
          {selectedNode && (
            <Suspense fallback={<Spin />}>
              <LazyNodeDetails
                node={selectedNode.node}
                relatedNodes={selectedNode.relatedNodes}
                edges={selectedNode.edges}
                onNodeClick={handleNodeClick}
              />
            </Suspense>
          )}
        </Drawer>
      </Card>
    </KnowledgeGraphErrorBoundary>
  );
};

export default OptimizedKnowledgeGraph;