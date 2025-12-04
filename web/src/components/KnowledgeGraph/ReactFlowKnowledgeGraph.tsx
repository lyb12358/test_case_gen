import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  BackgroundVariant,
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// 导入自定义节点组件
import TSPNode from './nodes/TSPNode';
import ProjectNode from './nodes/ProjectNode';
import BusinessTypeNode from './nodes/BusinessTypeNode';
import TestCaseNode from './nodes/TestCaseNode';

// 导入自定义边组件
import CustomBezierEdge from './CustomBezierEdge';

import { Card, Button, Drawer, Typography, Divider, Space, Tooltip, Spin, Tag } from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  CompressOutlined,
  FullscreenOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';

// 定义React Flow节点类型
const nodeTypes = {
  tspNode: TSPNode,
  projectNode: ProjectNode,
  businessTypeNode: BusinessTypeNode,
  testCaseNode: TestCaseNode,
};

// 定义React Flow边类型
const edgeTypes = {
  customBezier: CustomBezierEdge,
};

import { elkLayoutService } from './ELKLayoutService';
import type { ReactFlowNode, ReactFlowEdge } from './DagreLayoutService';
import { dataTransformService } from './DataTransformService';
import KnowledgeGraphErrorBoundary from './ErrorBoundary';
import NodeLegend from './NodeLegend';

const { Text, Title, Paragraph } = Typography;

// 自定义节点类型导入（稍后创建）
// import TSPNode from './nodes/TSPNode';
// import ProjectNode from './nodes/ProjectNode';
// import BusinessTypeNode from './nodes/BusinessTypeNode';
// import TestCaseNode from './nodes/TestCaseNode';

interface ReactFlowKnowledgeGraphProps {
  data: any; // KnowledgeGraphData
  onError?: (error: Error) => void;
}

/**
 * React Flow知识图谱组件
 * 基于React Flow + ELK.js的思维导图可视化
 */
const ReactFlowKnowledgeGraphContent: React.FC<ReactFlowKnowledgeGraphProps> = ({
  data,
  onError,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<ReactFlowNode | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLayouting, setIsLayouting] = useState(false);

  const { fitView, zoomIn, zoomOut } = useReactFlow();

  
  // 转换和布局数据 - 思维导图模式
  const applyLayout = useCallback(async (graphData: any) => {
    if (!graphData?.nodes || !graphData?.edges) return;

    setIsLayouting(true);
    try {
      // 设置固定的思维导布局配置 - 径向模式
      elkLayoutService.updateDirection('RIGHT');
      elkLayoutService.updateSpacing('150', '120');

      // 转换数据格式
      const { nodes: reactFlowNodes, edges: reactFlowEdges } =
        dataTransformService.transformToReactFlow(graphData);

      console.log('开始思维导布局计算，节点数量:', reactFlowNodes.length);

      // 应用ELK径向布局
      const layouted = await elkLayoutService.layout(reactFlowNodes, reactFlowEdges);

      console.log('布局计算完成，使用算法: Dagre (思维导图布局)');

      // 更新React Flow状态
      setNodes(layouted.nodes);
      setEdges(layouted.edges);

      // 适应视图，确保TSP中心节点可见
      setTimeout(() => {
        fitView({
          padding: 0.3,
          duration: 800,
          includeHiddenNodes: false
        });
      }, 100);
    } catch (error) {
      console.error('思维导布局计算失败:', error);
      onError?.(error instanceof Error ? error : new Error('思维导布局计算失败'));
    } finally {
      setIsLayouting(false);
    }
  }, [setNodes, setEdges, fitView, onError]);

  // 数据变化时重新布局
  useEffect(() => {
    applyLayout(data);
  }, [data, applyLayout]);

  // 节点连接处理
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // 节点点击处理
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node as ReactFlowNode);
    setDrawerVisible(true);
  }, []);

  
  // 重新布局
  const handleRelayout = useCallback(() => {
    applyLayout(data);
  }, [data, applyLayout]);

  // 适应视图
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 800 });
  }, [fitView]);

  // 全屏切换
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsExpanded(true);
    } else {
      document.exitFullscreen();
      setIsExpanded(false);
    }
  }, []);

  
  // 监听全屏状态
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsExpanded(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 节点统计
  
  if (!data?.nodes || data.nodes.length === 0) {
    return (
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
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>

      {/* React Flow画布 */}
      <div style={{ width: '100%', height: isExpanded ? '100vh' : 'calc(100vh - 200px)' }}>
        {isLayouting ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              background: 'rgba(255, 255, 255, 0.8)'
            }}
          >
            <Spin size="large">正在计算布局...</Spin>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
            attributionPosition="bottom-left"
            connectionLineType={ConnectionLineType.SmoothStep}
            defaultEdgeOptions={{
              type: 'customBezier',
              data: { strength: 3, animated: false },
              style: { strokeWidth: 2 },
            }}
          >
            <Background
              color="rgba(0, 0, 0, 0.1)" // 深色背景点，提高对比度
              gap={25}
              variant={BackgroundVariant.Dots}
            />
            <Controls
              style={{
                marginBottom: 60,
                backdropFilter: 'blur(12px)',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
              }}
              showZoom={false}
              showFitView={false}
              showInteractive={false}
            />
            <MiniMap
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
              }}
              nodeColor={(node) => {
                // 根据节点类型返回颜色
                const nodeType = node.data?.nodeType;
                switch (nodeType) {
                  case 'tsp': return '#1e40af';
                  case 'project': return '#059669';
                  case 'business_type': return '#9333ea';
                  case 'test_point': return '#0ea5e9';
                  case 'test_case': return '#16a34a';
                  default: return '#6b7280';
                }
              }}
              zoomable
              pannable
              position="top-right"
            />
          </ReactFlow>
        )}
      </div>

      {/* 节点图例 */}
      <NodeLegend />

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
            <Title level={4}>{selectedNode.data.label}</Title>
            <Paragraph>
              <Text strong>类型: </Text>
              <Tag color={selectedNode.data.color}>
                {selectedNode.data.nodeType}
              </Tag>
            </Paragraph>
            <Paragraph>
              <Text strong>层级: </Text>
              {selectedNode.data.level}
            </Paragraph>
            {selectedNode.data.description && (
              <Paragraph>
                <Text strong>描述: </Text>
                {selectedNode.data.description}
              </Paragraph>
            )}
            {selectedNode.data.businessType && (
              <Paragraph>
                <Text strong>业务类型: </Text>
                {selectedNode.data.businessName || selectedNode.data.businessType}
              </Paragraph>
            )}
            {selectedNode.data.stats && (
              <Paragraph>
                <Text strong>统计: </Text>
                <pre>{JSON.stringify(selectedNode.data.stats, null, 2)}</pre>
              </Paragraph>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

/**
 * 包装的React Flow知识图谱组件，包含Provider
 */
const ReactFlowKnowledgeGraph: React.FC<ReactFlowKnowledgeGraphProps> = (props) => {
  const [isCardFullscreen, setIsCardFullscreen] = useState(false);

  // 卡片全屏切换
  const toggleCardFullscreen = useCallback(() => {
    setIsCardFullscreen(prev => !prev);
  }, []);

  // 键盘事件监听（ESC键退出全屏）
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isCardFullscreen) {
        setIsCardFullscreen(false);
      }
    };

    if (isCardFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isCardFullscreen]);

  return (
    <ReactFlowProvider>
      <KnowledgeGraphErrorBoundary onError={props.onError}>
        {/* 正常模式：显示知识图谱卡片 */}
        {!isCardFullscreen && (
          <Card
            title="知识图谱（施工中）"
            extra={
              <Space>
                <Tooltip title="重新布局">
                  <Button
                    type="text"
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => window.location.reload()}
                  />
                </Tooltip>
                <Tooltip title={isCardFullscreen ? "退出全屏" : "全屏显示"}>
                  <Button
                    type="text"
                    size="small"
                    icon={isCardFullscreen ? <CompressOutlined /> : <FullscreenOutlined />}
                    onClick={toggleCardFullscreen}
                  />
                </Tooltip>
              </Space>
            }
            style={{ height: '100%', margin: 0 }}
            styles={{ body: { padding: 0, height: 'calc(100% - 60px)' } }}
          >
            <ReactFlowKnowledgeGraphContent {...props} />
          </Card>
        )}

        {/* 全屏模式：显示模态覆盖层 */}
        {isCardFullscreen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000,
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'fadeIn 0.3s ease-in-out',
            }}
            onClick={toggleCardFullscreen}
          >
            <div
              style={{
                width: '95vw',
                height: '95vh',
                maxWidth: '95%',
                maxHeight: '95%',
                background: 'white',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                animation: 'slideUp 0.3s ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card
                title="知识图谱（施工中）"
                extra={
                  <Space>
                    <Tooltip title="重新布局">
                      <Button
                        type="text"
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={() => window.location.reload()}
                      />
                    </Tooltip>
                    <Tooltip title="退出全屏 (ESC)">
                      <Button
                        type="text"
                        size="small"
                        icon={<CompressOutlined />}
                        onClick={toggleCardFullscreen}
                      />
                    </Tooltip>
                  </Space>
                }
                style={{ height: '100%', margin: 0 }}
                styles={{ body: { padding: 0, height: 'calc(100% - 60px)' } }}
              >
                <ReactFlowKnowledgeGraphContent {...props} />
              </Card>
            </div>
          </div>
        )}

        {/* CSS动画定义 */}
        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes slideUp {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}</style>
      </KnowledgeGraphErrorBoundary>
    </ReactFlowProvider>
  );
};

export default ReactFlowKnowledgeGraph;