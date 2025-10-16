import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Card, Button, Drawer, Typography, Divider, Tag, Space, Tooltip, Select } from 'antd';
const { Option } = Select;
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  CompressOutlined,
  FullscreenOutlined,
  ApartmentOutlined,
  RadiusSettingOutlined,
  BorderOutlined,
  DeploymentUnitOutlined,
  AppstoreOutlined,
  NodeIndexOutlined,
  CreditCardOutlined,
  TagOutlined
} from '@ant-design/icons';
import { Graph, ExtensionCategory, register } from '@antv/g6';
import { ReactNode } from '@antv/g6-extension-react';
import { KnowledgeGraphData, GraphNode, GraphRelation } from '../../types/knowledgeGraph';
import { knowledgeGraphService } from '../../services/knowledgeGraphService';
import {
  BusinessCardNode,
  InterfaceNode,
  TestCaseNode,
  BadgeNode
} from '../../components/KnowledgeGraph';
import NodeLegend from '../../components/KnowledgeGraph/NodeLegend';

// 注册 React Node 扩展
register(ExtensionCategory.NODE, 'react-node', ReactNode);

const { Text, Title, Paragraph } = Typography;

interface GraphComponentProps {
  data: KnowledgeGraphData;
}

interface NodeDetails {
  node: GraphNode;
  relatedNodes: GraphNode[];
  edges: GraphRelation[];
}

// 布局类型定义
export type LayoutType = 'dagre' | 'circular' | 'radial' | 'concentric' | 'grid' | 'random' | 'd3-force' | 'fruchterman-cluster';

// 密度设置类型
export type DensityLevel = 'compact' | 'normal' | 'spacious';

// 节点显示模式类型
export type NodeDisplayMode = 'card' | 'badge';

// 布局配置定义
export interface LayoutConfig {
  type: LayoutType;
  name: string;
  icon: React.ReactNode;
  description: string;
  config: any;
}

// Enhanced G6 graph component with React Nodes
interface G6GraphProps {
  data: any;
  onNodeClick: (nodeData: any) => void;
  layoutType: LayoutType;
  density: DensityLevel;
  nodeDisplayMode: NodeDisplayMode;
  onGraphReady: (graph: Graph) => void;
}

const G6Graph: React.FC<G6GraphProps> = ({ data, onNodeClick, layoutType, density, nodeDisplayMode, onGraphReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  // Get React component based on node type and display mode
  const getReactComponent = (nodeType: string) => {
    if (nodeDisplayMode === 'badge') {
      // Badge mode for all node types
      return (nodeData: any) => (
        <BadgeNode
          data={nodeData.data || nodeData}
          onClick={() => onNodeClick(nodeData)}
        />
      );
    } else {
      // Card mode (existing behavior)
      switch (nodeType) {
        case 'interface':
          return (nodeData: any) => <InterfaceNode id={nodeData.id} data={nodeData.data || nodeData} density={density} />;
        case 'test_case':
          return (nodeData: any) => <TestCaseNode id={nodeData.id} data={nodeData.data || nodeData} density={density} />;
        case 'scenario':
        case 'business':
        default:
          return (nodeData: any) => <BusinessCardNode id={nodeData.id} data={nodeData.data || nodeData} density={density} />;
      }
    }
  };

  
  // Initialize graph
  useEffect(() => {
    if (!containerRef.current || !data?.nodes?.length) return;

    // Destroy existing graph
    if (graphRef.current) {
      graphRef.current.destroy();
      graphRef.current = null;
    }

    // Transform data for G6 with React nodes
    const g6Data = {
      nodes: data.nodes.map((node: any) => {
        const nodeType = node.data?.type || node.type;
        return {
          id: node.id,
          type: 'react-node',
          style: {
            x: Math.random() * 400 + 50,
            y: Math.random() * 300 + 50,
            component: getReactComponent(nodeType),
          },
          data: {
            ...node.data,
            id: node.id,
            label: node.data?.label || node.label || node.id,
            type: nodeType,
            description: node.data?.description || node.description,
            businessType: node.data?.businessType || node.businessType,
            extra_data: node.data?.extra_data || node.extra_data,
            expanded: false,
            selected: false,
          },
        };
      }),
      edges: data.edges.map((edge: any) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        style: {
          stroke: '#bfbfbf',
          lineWidth: 2,
          endArrow: true,
        },
        label: edge.label,
        data: edge.data,
      })),
    };

    // Create graph
    const graph = new Graph({
      container: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      data: g6Data,
      layout: getLayoutConfig(layoutType, density, data.nodes),
      node: {
        type: 'react-node',
        style: {
          component: (nodeData: any) => {
            // 确保 type数据正确获取，从多个可能的来源获取
            let nodeType = 'unknown';

            // 尝试从不同位置获取node type
            if (nodeData.data?.type) {
              nodeType = nodeData.data.type;
            } else if (nodeData.type) {
              nodeType = nodeData.type;
            } else if (nodeData._cfg?.model?.data?.type) {
              nodeType = nodeData._cfg.model.data.type;
            } else if (nodeData._cfg?.model?.type) {
              nodeType = nodeData._cfg.model.type;
            }

  
            const component = getReactComponent(nodeType);
            return component(nodeData);
          },
        },
      },
      edge: {
        style: {
          stroke: '#bfbfbf',
          lineWidth: 2,
          endArrow: true,
          labelBackgroundColor: '#fff',
          labelBackgroundStroke: '#e8e8e8',
          labelBackgroundRadius: 4,
          labelBackgroundPadding: [2, 4, 2, 4],
          labelFill: '#666',
          labelFontSize: 12,
        },
      },
      behaviors: [
        'drag-element',
        'zoom-canvas',
        'drag-canvas',
        'hover-activate',
      ],
    });

    // Update all nodes with graph instance reference - removed to prevent circular reference
    // The graph instance will be set dynamically in the React components when needed

    // Add node click event listener
    graph.on('node:click', (event: any) => {
      console.log('Raw click event:', event);

      // Try different ways to get the node ID and data
      let nodeId, nodeData;

      // Method 1: Try event.itemId
      if (event.itemId) {
        nodeId = event.itemId;
        nodeData = graph.getNodeData(nodeId);
      }
      // Method 2: Try event.target?.id
      else if (event.target?.id) {
        nodeId = event.target.id;
        nodeData = graph.getNodeData(nodeId);
      }
      // Method 3: Try direct event.data
      else if (event.data) {
        nodeData = event.data;
        nodeId = nodeData.id || nodeData.data?.id;
      }
      // Method 4: Try to get first item if it's an array
      else if (Array.isArray(event.item)) {
        nodeId = event.item[0]?.id;
        nodeData = nodeId ? graph.getNodeData(nodeId) : null;
      }

      console.log('Extracted node data:', { nodeId, nodeData });

      if (nodeData) {
        onNodeClick(nodeData);
      } else {
        console.error('Could not extract node data from click event:', event);
      }
    });

    // Render graph
    graph.render();
    graphRef.current = graph;

    // Notify parent component that graph is ready
    if (onGraphReady) {
      onGraphReady(graph);
    }

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && graphRef.current) {
        graphRef.current.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (graphRef.current) {
        graphRef.current.destroy();
        graphRef.current = null;
      }
    };
  }, [data, layoutType, density, nodeDisplayMode, onGraphReady]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

// Get spacing multipliers based on density level
const getDensityMultipliers = (density: DensityLevel) => {
  switch (density) {
    case 'compact':
      return { node: 0.5, rank: 0.5, radius: 0.6, size: 0.8 };
    case 'normal':
      return { node: 0.8, rank: 0.8, radius: 0.9, size: 0.9 };
    case 'spacious':
      return { node: 1.3, rank: 1.3, radius: 1.2, size: 1.0 };
    default:
      return { node: 1.3, rank: 1.3, radius: 1.2, size: 1.0 };
  }
};

// Calculate node size based on node type and content
const calculateNodeSize = (nodeData: any): [number, number] => {
  const nodeType = nodeData.data?.type || nodeData.type;
  const label = nodeData.data?.label || nodeData.label || '';
  const description = nodeData.data?.description || nodeData.description || '';

  // Base sizes by node type
  const baseSizes = {
    scenario: [180, 120],
    business: [160, 100],
    interface: [150, 95],
    test_case: [200, 110]
  };

  const baseSize = baseSizes[nodeType as keyof typeof baseSizes] || [150, 100];

  // Adjust size based on content length
  const labelLength = label.length;
  const descLength = description.length;

  let widthMultiplier = 1;
  let heightMultiplier = 1;

  if (labelLength > 15) widthMultiplier += 0.2;
  if (labelLength > 25) widthMultiplier += 0.3;
  if (descLength > 50) heightMultiplier += 0.2;
  if (descLength > 100) heightMultiplier += 0.3;

  return [
    Math.floor(baseSize[0] * widthMultiplier),
    Math.floor(baseSize[1] * heightMultiplier)
  ];
};

// Enhanced layout configuration with dynamic spacing
const getLayoutConfig = (type: LayoutType, density: DensityLevel = 'normal', _nodes?: any[]) => {
  const multipliers = getDensityMultipliers(density);

  switch (type) {
    case 'dagre':
      return {
        type: 'dagre',
        rankdir: 'TB',
        align: 'UL',
        nodesepFunc: (node: any) => {
          const nodeType = node.data?.type || node.type;
          const baseSpacing = {
            scenario: 160,
            business: 140,
            interface: 130,
            test_case: 150
          };
          return (baseSpacing[nodeType as keyof typeof baseSpacing] || 140) * multipliers.node;
        },
        ranksepFunc: (node: any) => {
          const nodeType = node.data?.type || node.type;
          const baseSpacing = {
            scenario: 240,
            business: 200,
            interface: 190,
            test_case: 220
          };
          return (baseSpacing[nodeType as keyof typeof baseSpacing] || 200) * multipliers.rank;
        },
        nodeSize: (node: any) => calculateNodeSize(node),
        preventOverlap: true,
        controlPoints: true,
        edgeLabelSpace: true,
      };

    case 'd3-force':
      return {
        type: 'd3-force',
        link: {
          distance: (d: any) => {
            // Shorter distance within same business type
            if (d.source?.data?.businessType === d.target?.data?.businessType) {
              return 120 * multipliers.node;
            }
            return 200 * multipliers.node;
          },
          strength: (d: any) => {
            // Stronger connections within same business type
            if (d.source?.data?.businessType === d.target?.data?.businessType) {
              return 0.8;
            }
            return 0.3;
          },
        },
        manyBody: {
          strength: (d: any) => {
            const nodeType = d.data?.type || d.type;
            const strengths = {
              scenario: -150,
              business: -120,
              interface: -90,
              test_case: -100
            };
            return strengths[nodeType as keyof typeof strengths] || -100;
          },
        },
        collide: {
          radius: (d: any) => {
            const [width, height] = calculateNodeSize(d);
            return Math.max(width, height) / 2 * multipliers.size;
          },
          strength: 0.8,
        },
        center: {
          strength: 0.1,
        },
      };

    case 'fruchterman-cluster':
      return {
        type: 'fruchterman',
        gravity: 10 * multipliers.rank,
        speed: 5,
        clustering: true,
        nodeClusterBy: 'businessType',
        clusterGravity: 20 * multipliers.rank,
        nodeSize: (node: any) => {
          const [width, height] = calculateNodeSize(node);
          return Math.max(width, height) * multipliers.size;
        },
        preventOverlap: true,
      };

    case 'circular':
      return {
        type: 'circular',
        startRadius: 130 * multipliers.radius,
        endRadius: 350 * multipliers.radius,
        clockwise: true,
        preventOverlap: true,
        nodeSize: (node: any) => calculateNodeSize(node),
        divisions: 5,
      };

    case 'radial':
      return {
        type: 'radial',
        unitRadius: 130 * multipliers.radius,
        preventOverlap: true,
        maxIteration: 100,
        nodeSize: (node: any) => {
          const [width, height] = calculateNodeSize(node);
          return Math.max(width, height) * multipliers.size;
        },
        centrality: 'degree',
      };

    case 'concentric':
      return {
        type: 'concentric',
        sortBy: 'degree',
        clockwise: true,
        preventOverlap: true,
        nodeSpacing: 60 * multipliers.node,
        minNodeSpacing: 30 * multipliers.node,
        nodeSize: (node: any) => calculateNodeSize(node),
      };

    case 'grid':
      return {
        type: 'grid',
        preventOverlap: true,
        sortBy: 'id',
        condense: false,
        nodeSize: (node: any) => calculateNodeSize(node),
        width: 300 * multipliers.size,
        height: 200 * multipliers.size,
      };

    case 'random':
      return {
        type: 'random',
        width: 1200 * multipliers.radius,
        height: 800 * multipliers.radius,
      };

    default:
      return {
        type: 'dagre',
        rankdir: 'TB',
        align: 'UL',
        nodesep: 100 * multipliers.node,
        ranksep: 150 * multipliers.rank,
        nodeSize: (node: any) => calculateNodeSize(node),
        preventOverlap: true,
        controlPoints: true,
      };
  }
};

const GraphComponent: React.FC<GraphComponentProps> = ({ data }) => {
  const [selectedNode, setSelectedNode] = useState<NodeDetails | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [layoutType, setLayoutType] = useState<LayoutType>('d3-force');
  const [density, setDensity] = useState<DensityLevel>('spacious');
  const [nodeDisplayMode, setNodeDisplayMode] = useState<NodeDisplayMode>('badge');
  const graphRef = useRef<Graph | null>(null);

  // Handle graph ready callback
  const handleGraphReady = useCallback((graph: Graph) => {
    graphRef.current = graph;
  }, []);

  // 辅助函数
  const getNodeColor = (type: string): string => {
    switch (type) {
      case 'scenario':
        return '#722ed1';
      case 'business':
        return '#1890ff';
      case 'interface':
        return '#fa8c16';
      case 'test_case':
        return '#13c2c2';
      default:
        return '#999';
    }
  };

  // 布局选项配置
  const layoutOptions: LayoutConfig[] = [
    {
      type: 'dagre',
      name: '分层布局',
      icon: <ApartmentOutlined />,
      description: '层次结构布局，适合有向图',
      config: {}
    },
    {
      type: 'd3-force',
      name: '力导向布局',
      icon: <RadiusSettingOutlined />,
      description: '按业务类型自动聚类',
      config: {}
    },
    {
      type: 'fruchterman-cluster',
      name: '聚类力导向',
      icon: <DeploymentUnitOutlined />,
      description: '力导向聚类布局',
      config: {}
    },
    {
      type: 'circular',
      name: '圆形布局',
      icon: <RadiusSettingOutlined />,
      description: '环形排列，适合循环关系',
      config: {}
    },
    {
      type: 'radial',
      name: '径向布局',
      icon: <BorderOutlined />,
      description: '中心辐射布局',
      config: {}
    },
    {
      type: 'concentric',
      name: '同心圆布局',
      icon: <DeploymentUnitOutlined />,
      description: '按重要性分层排列',
      config: {}
    },
    {
      type: 'grid',
      name: '网格布局',
      icon: <AppstoreOutlined />,
      description: '规则网格排列',
      config: {}
    },
    {
      type: 'random',
      name: '随机布局',
      icon: <NodeIndexOutlined />,
      description: '随机分布',
      config: {}
    }
  ];

  // 布局切换处理
  const handleLayoutChange = (value: LayoutType) => {
    setLayoutType(value);
    // 保存到localStorage
    localStorage.setItem('knowledge-graph-layout', value);
  };

  // 密度切换处理
  const handleDensityChange = (value: DensityLevel) => {
    setDensity(value);
    // 保存到localStorage
    localStorage.setItem('knowledge-graph-density', value);
  };

  // 节点显示模式切换处理
  const handleNodeDisplayModeChange = (value: NodeDisplayMode) => {
    setNodeDisplayMode(value);
    // 保存到localStorage
    localStorage.setItem('knowledge-graph-node-display-mode', value);
  };

  // 从localStorage恢复设置
  useEffect(() => {
    const savedLayout = localStorage.getItem('knowledge-graph-layout') as LayoutType;
    if (savedLayout && layoutOptions.find(opt => opt.type === savedLayout)) {
      setLayoutType(savedLayout);
    }
    // 如果没有保存的布局设置，使用新的默认值 'd3-force'
    else {
      setLayoutType('d3-force');
      localStorage.setItem('knowledge-graph-layout', 'd3-force');
    }

    const savedDensity = localStorage.getItem('knowledge-graph-density') as DensityLevel;
    if (savedDensity && ['compact', 'normal', 'spacious'].includes(savedDensity)) {
      setDensity(savedDensity);
    }
    // 如果没有保存的密度设置，使用宽松模式
    else {
      setDensity('spacious');
      localStorage.setItem('knowledge-graph-density', 'spacious');
    }

    const savedNodeDisplayMode = localStorage.getItem('knowledge-graph-node-display-mode') as NodeDisplayMode;
    if (savedNodeDisplayMode && ['card', 'badge'].includes(savedNodeDisplayMode)) {
      setNodeDisplayMode(savedNodeDisplayMode);
    }
    // 如果没有保存的节点显示模式设置，使用新的默认值 'badge'
    else {
      setNodeDisplayMode('badge');
      localStorage.setItem('knowledge-graph-node-display-mode', 'badge');
    }
  }, [layoutOptions]);

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsExpanded(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 转换数据格式为 G6 所需格式
  const g6Data = useMemo(() => {
    if (!data?.nodes || !data?.edges) return { nodes: [], edges: [] };

    return {
      nodes: data.nodes.map(node => ({
        id: node.id,
        label: node.label,
        type: node.type,
        data: {
          label: node.label,
          type: node.type,
          description: node.description,
          businessType: node.businessType,
          extra_data: node.extra_data,
        },
      })),
      edges: data.edges.map(edge => ({
        id: `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: edge.type,
        data: {
          label: edge.label,
          type: edge.type,
        },
      }))
    };
  }, [data]);

  // 处理节点点击
  const handleNodeClick = async (nodeData: any) => {
    setLoadingDetails(true);
    try {
      console.log('handleNodeClick received:', nodeData);

      // Handle case where nodeData might be an array
      if (Array.isArray(nodeData)) {
        if (nodeData.length === 0) {
          console.error('Received empty array as nodeData');
          return;
        }
        // Take the first item if it's an array
        nodeData = nodeData[0];
        console.log('Using first item from array:', nodeData);
      }

      // G6 node data might be nested, try different ways to get the ID
      let nodeId = nodeData.id;

      // If no ID at top level, check if it's in the data property
      if (!nodeId && nodeData.data) {
        nodeId = nodeData.data.id;
      }

      // If still no ID, try to extract from the original data structure
      if (!nodeId && typeof nodeData === 'object') {
        // Look for any property that might contain the node ID
        const possibleIdProps = ['nodeId', 'itemId', 'key'];
        for (const prop of possibleIdProps) {
          if (nodeData[prop]) {
            nodeId = nodeData[prop];
            break;
          }
        }
      }

      if (!nodeId) {
        console.error('No node ID found in nodeData:', nodeData);
        return;
      }

      const numericId = parseInt(nodeId, 10);

      if (isNaN(numericId)) {
        console.error('Invalid node ID (not a number):', nodeId);
        return;
      }

      console.log('Successfully extracted node ID:', numericId);
      const relatedData = await knowledgeGraphService.getEntityDetails(numericId);

      // 转换 GraphEntity 到 GraphNode 类型
      const convertedNodes: GraphNode[] = (relatedData.related_entities || []).map((entity: any) => ({
        id: entity.id.toString(),
        name: entity.name,
        label: entity.name,
        type: entity.type as GraphNode['type'],
        description: entity.description,
        businessType: entity.business_type,
        extra_data: entity.metadata
      }));

      // Use the original nodeData structure but ensure we have label and type for display
      const displayNodeData = {
        ...nodeData,
        id: nodeId,
        label: nodeData.data?.label || nodeData.label || `Entity ${nodeId}`,
        type: nodeData.data?.type || nodeData.type || 'unknown',
        description: nodeData.data?.description || nodeData.description,
        businessType: nodeData.data?.businessType || nodeData.businessType,
        extra_data: nodeData.data?.extra_data || nodeData.extra_data
      };

      setSelectedNode({
        node: displayNodeData,
        relatedNodes: convertedNodes,
        edges: relatedData.related_relations || []
      });
      setDrawerVisible(true);
    } catch (error) {
      console.error('获取节点详情失败:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  // 处理缩放
  const handleZoom = useCallback((type: 'in' | 'out' | 'fit') => {
    if (!graphRef.current) return;

    switch (type) {
      case 'in':
        graphRef.current.zoomTo(graphRef.current.getZoom() * 1.2);
        break;
      case 'out':
        graphRef.current.zoomTo(graphRef.current.getZoom() * 0.8);
        break;
      case 'fit':
        graphRef.current.fitView();
        break;
    }
  }, []);

  // 处理浏览器窗口全屏
  const handleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        // 进入全屏
        await document.documentElement.requestFullscreen();
        setIsExpanded(true);
      } else {
        // 退出全屏
        await document.exitFullscreen();
        setIsExpanded(false);
      }

      // Resize graph after state change
      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.fitView();
        }
      }, 100);
    } catch (error) {
      console.error('Fullscreen API error:', error);
      // 如果全屏API不可用，回退到原来的全屏方式
      setIsExpanded(!isExpanded);
      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.fitView();
        }
      }, 100);
    }
  };

  
  
  return (
    <Card
      title="知识图谱"
      extra={
        <Space>
          <Tooltip title="放大">
            <Button
              type="text"
              size="small"
              icon={<ZoomInOutlined />}
              onClick={() => handleZoom('in')}
            />
          </Tooltip>

          <Tooltip title="缩小">
            <Button
              type="text"
              size="small"
              icon={<ZoomOutOutlined />}
              onClick={() => handleZoom('out')}
            />
          </Tooltip>

          <Tooltip title="适应视图">
            <Button
              type="text"
              size="small"
              icon={<FullscreenOutlined />}
              onClick={() => handleZoom('fit')}
            />
          </Tooltip>

          <Tooltip title={isExpanded ? "退出全屏" : "全屏"}>
            <Button
              type="text"
              size="small"
              icon={isExpanded ? <CompressOutlined /> : <ExpandOutlined />}
              onClick={handleFullscreen}
            />
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
              {layoutOptions.map(option => (
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

          <Divider type="vertical" />

          <Space>
            <span style={{ fontSize: '14px', color: '#666' }}>节点:</span>
            <Select
              value={nodeDisplayMode}
              onChange={handleNodeDisplayModeChange}
              style={{ width: 100 }}
              size="small"
            >
              <Option value="card">
                <Space size={4}>
                  <CreditCardOutlined />
                  <span>卡片</span>
                </Space>
              </Option>
              <Option value="badge">
                <Space size={4}>
                  <TagOutlined />
                  <span>徽章</span>
                </Space>
              </Option>
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
        {data.nodes && data.nodes.length > 0 ? (
          <G6Graph
            data={g6Data}
            onNodeClick={handleNodeClick}
            layoutType={layoutType}
            density={density}
            nodeDisplayMode={nodeDisplayMode}
            onGraphReady={handleGraphReady}
          />
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
          <div>
            <div style={{ marginBottom: 16 }}>
              <Tag color={getNodeColor(selectedNode.node.type)}>
                {selectedNode.node.type}
              </Tag>
              <Title level={4} style={{ marginTop: 8 }}>
                {selectedNode.node.label}
              </Title>
            </div>

            <Divider />

            <div style={{ marginBottom: 16 }}>
              <Title level={5}>描述</Title>
              <Paragraph>
                {selectedNode.node.description || '暂无描述'}
              </Paragraph>
            </div>

            {selectedNode.node.extra_data && (
              <div style={{ marginBottom: 16 }}>
                <Title level={5}>额外信息</Title>
                <Text>
                  <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                    {JSON.stringify(selectedNode.node.extra_data, null, 2)}
                  </pre>
                </Text>
              </div>
            )}

            {selectedNode.relatedNodes.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Title level={5}>相关节点</Title>
                <Space wrap>
                  {selectedNode.relatedNodes.map(node => (
                    <Tag
                      key={node.id}
                      color={getNodeColor(node.type)}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleNodeClick({ id: node.id, data: node })}
                    >
                      {node.label}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            {selectedNode.edges.length > 0 && (
              <div>
                <Title level={5}>关系</Title>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selectedNode.edges.map((edge, index) => (
                    <div key={index} style={{
                      padding: 8,
                      background: '#f9f9f9',
                      borderRadius: 4
                    }}>
                      <Text strong>{edge.predicate}</Text>
                      <br />
                      <Text type="secondary">
                        {edge.subject_name} → {edge.object_name}
                      </Text>
                    </div>
                  ))}
                </Space>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </Card>
  );
};

export default GraphComponent;