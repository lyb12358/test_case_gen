import React from 'react';
import {
  Typography,
  Space,
  Badge,
  Statistic,
  Row,
  Col
} from 'antd';
import {
  CloudOutlined,
  ProjectOutlined,
  AppstoreOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { createNodeComponent, BaseNodeData, getNodeTypeStyle } from '../BaseNode';
import { registerNode } from '../NodeRegistry';

const { Title, Text } = Typography;

interface TSPRootNodeData extends BaseNodeData {
  type: 'tsp';
  isRoot: boolean;
  // 统计数据
  stats?: {
    projectCount: number;
    businessTypeCount: number;
    testCaseCount: number;
    testPointCount: number;
  };
}

interface TSPRootNodeProps {
  id: string;
  data: TSPRootNodeData;
  density?: 'compact' | 'normal' | 'spacious';
  onClick?: (data: TSPRootNodeData) => void;
  className?: string;
  style?: React.CSSProperties;
}

// Create the TSP root node content renderer
const renderTSPRootContent = (data: TSPRootNodeData, config: any) => {
  const { label, description, stats } = data;

  return (
    <>
      {/* 标题区域 */}
      <div style={{ textAlign: 'center' }}>
        <CloudOutlined
          style={{
            fontSize: config.iconSize * 2,
            color: 'rgba(255,255,255,0.9)',
            marginBottom: '8px',
            display: 'block'
          }}
        />
        <Title
          level={config.titleSize === 18 ? 3 : config.titleSize === 16 ? 4 : 5}
          style={{
            color: '#fff',
            margin: '0 0 4px 0',
            fontWeight: 'bold',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            fontSize: config.titleSize
          }}
        >
          {label}
        </Title>
        {description && (
          <Text
            style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: config.fontSize,
              display: 'block',
              textAlign: 'center'
            }}
          >
            {description}
          </Text>
        )}
      </div>

      {/* 统计数据区域 */}
      {stats && config.cardHeight > 120 && (
        <Row gutter={[8, 8]}>
          <Col span={12}>
            <div
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 6,
                padding: '8px',
                textAlign: 'center'
              }}
            >
              <ProjectOutlined
                style={{
                  fontSize: config.iconSize,
                  color: 'rgba(255,255,255,0.9)',
                  marginBottom: '2px',
                  display: 'block'
                }}
              />
              <div style={{ color: '#fff', fontSize: config.fontSize + 2, fontWeight: 'bold' }}>
                {stats.projectCount}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: config.fontSize - 1 }}>
                项目
              </div>
            </div>
          </Col>
          <Col span={12}>
            <div
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 6,
                padding: '8px',
                textAlign: 'center'
              }}
            >
              <AppstoreOutlined
                style={{
                  fontSize: config.iconSize,
                  color: 'rgba(255,255,255,0.9)',
                  marginBottom: '2px',
                  display: 'block'
                }}
              />
              <div style={{ color: '#fff', fontSize: config.fontSize + 2, fontWeight: 'bold' }}>
                {stats.businessTypeCount}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: config.fontSize - 1 }}>
                业务类型
              </div>
            </div>
          </Col>
          {config.cardHeight > 140 && (
            <>
              <Col span={12}>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 6,
                    padding: '8px',
                    textAlign: 'center'
                  }}
                >
                  <FileTextOutlined
                    style={{
                      fontSize: config.iconSize,
                      color: 'rgba(255,255,255,0.9)',
                      marginBottom: '2px',
                      display: 'block'
                    }}
                  />
                  <div style={{ color: '#fff', fontSize: config.fontSize + 2, fontWeight: 'bold' }}>
                    {stats.testPointCount}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: config.fontSize - 1 }}>
                    测试点
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 6,
                    padding: '8px',
                    textAlign: 'center'
                  }}
                >
                  <FileTextOutlined
                    style={{
                      fontSize: config.iconSize,
                      color: 'rgba(255,255,255,0.9)',
                      marginBottom: '2px',
                      display: 'block'
                    }}
                  />
                  <div style={{ color: '#fff', fontSize: config.fontSize + 2, fontWeight: 'bold' }}>
                    {stats.testCaseCount}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: config.fontSize - 1 }}>
                    测试用例
                  </div>
                </div>
              </Col>
            </>
          )}
        </Row>
      )}

      {/* 状态标签 */}
      <div style={{ textAlign: 'center', marginTop: '8px' }}>
        <Badge
          status="processing"
          text={<span style={{ color: 'rgba(255,255,255,0.9)', fontSize: config.fontSize }}>系统运行中</span>}
        />
      </div>
    </>
  );
};

// Create the TSP root node component using the factory
const TSPRootNode = createNodeComponent<TSPRootNodeData>(
  'TSPRootNode',
  renderTSPRootContent,
  getNodeTypeStyle('tsp')
);

// Register the component with the node registry
registerNode('tsp', 'TSP Root Node', {
  displayName: 'TSP Root Node',
  description: 'TSP system root node with statistics',
  defaultSize: { width: 320, height: 280 },
  minSize: { width: 200, height: 160 },
  maxSize: { width: 400, height: 320 }
})(TSPRootNode);

export default TSPRootNode;