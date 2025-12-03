import React from 'react';
import { Typography, Divider, Space, Tag } from 'antd';

const { Title, Paragraph, Text } = Typography;

interface GraphNode {
  id: string;
  name: string;
  label: string;
  type: string;
  description?: string;
  businessType?: string;
  extra_data?: Record<string, any>;
}

interface GraphRelation {
  predicate: string;
  subject_name: string;
  object_name: string;
}

interface NodeDetailsProps {
  node: GraphNode;
  relatedNodes: GraphNode[];
  edges: GraphRelation[];
  onNodeClick: (nodeData: GraphNode) => void;
}

/**
 * Node details component for displaying selected node information
 * Optimized for React 19 with memoization
 */
const NodeDetails: React.FC<NodeDetailsProps> = React.memo(({
  node,
  relatedNodes,
  edges,
  onNodeClick
}) => {
  // Helper function to get node color
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
      case 'tsp':
        return '#667eea';
      case 'project':
        return '#f093fb';
      default:
        return '#999';
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Tag color={getNodeColor(node.type)}>
          {node.type}
        </Tag>
        <Title level={4} style={{ marginTop: 8 }}>
          {node.label}
        </Title>
      </div>

      <Divider />

      <div style={{ marginBottom: 16 }}>
        <Title level={5}>描述</Title>
        <Paragraph>
          {node.description || '暂无描述'}
        </Paragraph>
      </div>

      {node.extra_data && Object.keys(node.extra_data).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Title level={5}>额外信息</Title>
          <Text>
            <pre style={{
              background: '#f5f5f5',
              padding: 8,
              borderRadius: 4,
              fontSize: 12,
              overflow: 'auto',
              maxHeight: 200
            }}>
              {JSON.stringify(node.extra_data, null, 2)}
            </pre>
          </Text>
        </div>
      )}

      {relatedNodes.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Title level={5}>相关节点</Title>
          <Space wrap>
            {relatedNodes.map(relatedNode => (
              <Tag
                key={relatedNode.id}
                color={getNodeColor(relatedNode.type)}
                style={{ cursor: 'pointer' }}
                onClick={() => onNodeClick(relatedNode)}
              >
                {relatedNode.label}
              </Tag>
            ))}
          </Space>
        </div>
      )}

      {edges.length > 0 && (
        <div>
          <Title level={5}>关系</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            {edges.map((edge, index) => (
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
  );
});

NodeDetails.displayName = 'NodeDetails';

export default NodeDetails;