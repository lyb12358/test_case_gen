import React, { useState } from 'react';
import { Card } from 'antd';
import { KnowledgeGraphData, GraphNode } from '../../types/knowledgeGraph';

interface GraphComponentProps {
  data: KnowledgeGraphData;
}

const GraphComponent: React.FC<GraphComponentProps> = ({ data }) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const getNodeColor = (type: string): string => {
    switch (type) {
      case 'business':
        return '#1890ff';
      case 'service':
        return '#52c41a';
      case 'interface':
        return '#fa8c16';
      default:
        return '#999';
    }
  };

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
  };

  return (
    <div style={{ display: 'flex', height: '500px' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Simple SVG visualization */}
        <svg width="100%" height="100%" viewBox="0 0 800 500">
          {/* Render edges */}
          {data.edges.map((edge, index) => {
            const sourceNode = data.nodes.find(n => n.id === edge.source);
            const targetNode = data.nodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            // Simple layout - position nodes in a circle
            const sourceIndex = data.nodes.indexOf(sourceNode);
            const targetIndex = data.nodes.indexOf(targetNode);
            const angleStep = (2 * Math.PI) / data.nodes.length;

            const sourceX = 400 + 200 * Math.cos(sourceIndex * angleStep);
            const sourceY = 250 + 200 * Math.sin(sourceIndex * angleStep);
            const targetX = 400 + 200 * Math.cos(targetIndex * angleStep);
            const targetY = 250 + 200 * Math.sin(targetIndex * angleStep);

            return (
              <g key={index}>
                <line
                  x1={sourceX}
                  y1={sourceY}
                  x2={targetX}
                  y2={targetY}
                  stroke="#999"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                <text
                  x={(sourceX + targetX) / 2}
                  y={(sourceY + targetY) / 2}
                  fill="#333"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {edge.label}
                </text>
              </g>
            );
          })}

          {/* Define arrow marker */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#999"
              />
            </marker>
          </defs>

          {/* Render nodes */}
          {data.nodes.map((node, index) => {
            const angleStep = (2 * Math.PI) / data.nodes.length;
            const x = 400 + 200 * Math.cos(index * angleStep);
            const y = 250 + 200 * Math.sin(index * angleStep);
            const radius = node.type === 'business' ? 40 : node.type === 'service' ? 35 : 30;

            return (
              <g
                key={node.id}
                onClick={() => handleNodeClick(node)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={getNodeColor(node.type)}
                  stroke="#fff"
                  strokeWidth="2"
                />
                <text
                  x={x}
                  y={y}
                  fill="#fff"
                  fontSize="12"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {node.name.length > 10 ? node.name.substring(0, 10) + '...' : node.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(255,255,255,0.9)', padding: '10px', borderRadius: '4px', fontSize: '12px', border: '1px solid #d9d9d9' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#1890ff', borderRadius: '50%', marginRight: '8px' }}></div>
            业务实体
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#52c41a', borderRadius: '50%', marginRight: '8px' }}></div>
            服务实体
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#fa8c16', borderRadius: '50%', marginRight: '8px' }}></div>
            接口实体
          </div>
        </div>
      </div>

      {selectedNode && (
        <div style={{ width: '300px', marginLeft: '16px' }}>
          <Card
            title="节点详情"
            size="small"
            extra={
              <button
                onClick={() => setSelectedNode(null)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px' }}
              >
                ×
              </button>
            }
          >
            <div>
              <p><strong>名称:</strong> {selectedNode.name}</p>
              <p><strong>类型:</strong> {selectedNode.type}</p>
              {selectedNode.businessType && (
                <p><strong>业务类型:</strong> {selectedNode.businessType}</p>
              )}
              {selectedNode.description && (
                <p><strong>描述:</strong> {selectedNode.description}</p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GraphComponent;