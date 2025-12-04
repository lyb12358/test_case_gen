
import { getLayoutedElements, LayoutDirection, type ReactFlowNode, type ReactFlowEdge } from './DagreLayoutService';

// ELK.js配置选项 - 强制径向思维导图模式
const elkOptions = {
  'elk.algorithm': 'radial', // 强制使用径向布局算法
  'elk.direction': 'RIGHT', // 主要方向
  'elk.radial.radius': '200', // 增加径向半径，确保节点分布更开
  'elk.radial.iterations': '10', // 增加迭代次数提高布局质量
  'elk.spacing.componentComponent': '50',
  'elk.spacing.nodeNode': '100', // 增加节点间距
  'elk.layered.spacing.nodeNodeBetweenLayers': '200',
  'elk.layered.spacing.nodeNode': '150',
  'elk.spacing.edgeNode': '30',
  'elk.layered.thoroughness': 10, // 提高布局质量
  'elk.layered.unnecessaryBendpoints': 'false',
  'elk.layered.spacing.edgeNodeSpacing': '15',
  'elk.separateConnectedComponents': 'false', // 不分离连接的组件
  'elk.component.compaction.strategy': 'COMPACTION_STRAIGHTEN_EDGES',
  'elk.component.compaction.active': 'true',
};


/**
 * 思维导图布局服务 - 处理真正的思维导图层次化布局
 */
export class ELKLayoutService {
  // 移除ELK依赖，使用自定义思维导图算法

  /**
   * 将知识图谱数据转换为ELK图格式 - 思维导图模式
   */
  private convertToELKGraph(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): any {
    // 为每个节点设置默认尺寸 - 思维导图优化
    const nodeDimensions = {
      tsp: { width: 200, height: 100 }, // 中心根节点
      project: { width: 180, height: 90 }, // 第一层项目节点
      business_type: { width: 160, height: 80 }, // 第二层业务节点
      test_point: { width: 140, height: 70 }, // 第三层测试点
      test_case: { width: 120, height: 60 }, // 第三层测试用例
    };

    // 找到TSP根节点
    const tspNode = nodes.find(node => node.data.nodeType === 'tsp');
    const otherNodes = nodes.filter(node => node.data.nodeType !== 'tsp');

    // 为TSP根节点设置特殊的径向布局选项
    const elkNodes = [
      ...(tspNode ? [{
        id: tspNode.id,
        width: tspNode.width || nodeDimensions.tsp.width,
        height: tspNode.height || nodeDimensions.tsp.height,
        layoutOptions: {
          'elk.radial.radius': '0', // 中心节点，半径为0
          'elk.padding': '[top=15,left=15,bottom=15,right=15]',
          'elk.alignment': 'CENTER',
        },
      }] : []),
      ...otherNodes.map(node => {
        const dimensions = nodeDimensions[node.data.nodeType as keyof typeof nodeDimensions];
        const layer = this.getLayerRadius(node.data.level);

        return {
          id: node.id,
          width: node.width || dimensions.width,
          height: node.height || dimensions.height,
          layoutOptions: {
            'elk.radial.radius': layer.radius.toString(), // 根据层级设置径向半径
            'elk.padding': '[top=8,left=8,bottom=8,right=8]',
            'elk.aspectRatio': (dimensions.width / dimensions.height).toString(),
          },
        };
      })
    ];

    const elkEdges = edges.map(edge => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
      layoutOptions: {
        'elk.layered.spacing.edgeNodeSpacing': '15',
      },
    }));

    return {
      id: 'root',
      layoutOptions: {
        ...elkOptions,
        // 确保所有节点在一个组件中
        'elk.component.compaction.strategy': 'COMPACTION_STRAIGHTEN_EDGES',
        'elk.component.compaction.active': 'true',
      },
      children: elkNodes,
      edges: elkEdges,
    };
  }

  /**
   * 根据节点层级获取径向半径 - 优化间距
   */
  private getLayerRadius(level: number): { radius: number } {
    switch (level) {
      case 0: return { radius: 0 };     // TSP绝对中心
      case 1: return { radius: 180 };   // 项目节点 - 第一层
      case 2: return { radius: 350 };   // 业务类型节点 - 第二层
      case 3: return { radius: 520 };   // 测试点/测试用例节点 - 第三层
      default: return { radius: 520 };
    }
  }

  /**
   * 执行思维导图布局计算 - 使用Dagre.js官方算法
   */
  async layout(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): Promise<{
    nodes: ReactFlowNode[];
    edges: ReactFlowEdge[];
  }> {
    // 数据验证
    if (!nodes || nodes.length === 0) {
      console.error('Dagre layout: No nodes provided');
      return { nodes: [], edges: [] };
    }

    if (!edges || edges.length === 0) {
      console.warn('Dagre layout: No edges provided, nodes will be positioned without connections');
    }

    console.log('Dagre layout: Starting with', nodes.length, 'nodes and', edges?.length || 0, 'edges - 使用 Dagre.js 自动布局算法');

    try {
      // 使用Dagre.js官方布局算法 - 水平思维导图布局
      const layoutedElements = getLayoutedElements(nodes, edges, 'LR'); // Left to Right
      console.log('Dagre layout: Layout completed successfully - 思维导图布局已生成');

      return layoutedElements;
    } catch (error) {
      console.error('Dagre layout calculation failed:', error);
      // 如果布局失败，返回简单的网格布局
      return this.getFallbackLayout(nodes, edges);
    }
  }

  
  
  /**
   * 后备布局（思维导图径向布局）
   */
  private getFallbackLayout(nodes: ReactFlowNode[], edges: ReactFlowEdge[]): {
    nodes: ReactFlowNode[];
    edges: ReactFlowEdge[];
  } {
    // 按层级分组节点
    const nodesByLevel = {
      0: nodes.filter(n => n.data.level === 0), // TSP
      1: nodes.filter(n => n.data.level === 1), // Projects
      2: nodes.filter(n => n.data.level === 2), // Business Types
      3: nodes.filter(n => n.data.level === 3), // Test Cases/Points
    };

    const layoutedNodes: ReactFlowNode[] = [];

    // TSP根节点在中心
    if (nodesByLevel[0].length > 0) {
      const tspNode = nodesByLevel[0][0];
      layoutedNodes.push({
        ...tspNode,
        position: { x: 0, y: 0 }
      });
    }

    // 第一层项目节点 - 围绕TSP均匀分布
    nodesByLevel[1].forEach((node, index) => {
      const angle = (index * 2 * Math.PI) / nodesByLevel[1].length;
      const radius = 150;
      layoutedNodes.push({
        ...node,
        position: {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        }
      });
    });

    // 第二层业务类型节点 - 围绕各自的项目节点均匀分布
    if (nodesByLevel[2].length > 0) {
      const businessNodesPerProject = Math.max(1, Math.floor(nodesByLevel[2].length / Math.max(1, nodesByLevel[1].length)));

      nodesByLevel[2].forEach((node, index) => {
        const projectIndex = Math.floor(index / businessNodesPerProject);
        const localIndex = index % businessNodesPerProject;

        // 获取对应项目节点的角度
        const projectAngle = projectIndex < nodesByLevel[1].length
          ? (projectIndex * 2 * Math.PI) / nodesByLevel[1].length
          : 0;

        // 在项目节点周围均匀分布业务节点
        const angleOffset = ((localIndex + 1) * 2 * Math.PI) / (businessNodesPerProject + 1);
        const finalAngle = projectAngle + angleOffset;
        const radius = 350;

        layoutedNodes.push({
          ...node,
          position: {
            x: Math.cos(finalAngle) * radius,
            y: Math.sin(finalAngle) * radius
          }
        });
      });
    }

    // 第三层测试节点 - 围绕业务类型节点均匀分布
    if (nodesByLevel[3].length > 0) {
      const testNodesPerBusiness = Math.max(1, Math.floor(nodesByLevel[3].length / Math.max(1, nodesByLevel[2].length)));

      nodesByLevel[3].forEach((node, index) => {
        const businessIndex = Math.floor(index / testNodesPerBusiness);
        const localIndex = index % testNodesPerBusiness;

        // 获取对应业务节点的角度
        const businessAngle = businessIndex < nodesByLevel[2].length
          ? ((businessIndex * 2 * Math.PI) / nodesByLevel[2].length)
          : 0;

        // 在业务节点周围均匀分布测试节点
        const angleOffset = ((localIndex + 1) * 2 * Math.PI) / (testNodesPerBusiness + 1);
        const finalAngle = businessAngle + angleOffset;
        const radius = 520;

        layoutedNodes.push({
          ...node,
          position: {
            x: Math.cos(finalAngle) * radius,
            y: Math.sin(finalAngle) * radius
          }
        });
      });
    }

    return {
      nodes: layoutedNodes,
      edges: edges.map(edge => ({
        ...edge,
        type: 'customBezier', // 使用自定义贝塞尔曲线边
        data: {
          label: edge.data?.label || edge.data?.relationship,
          relationship: edge.data?.relationship || 'contains',
          strength: edge.data?.strength || 3,
          animated: edge.data?.animated || false,
        },
        style: {
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        },
        markerEnd: 'arrowclosed',
        zIndex: 1, // 确保边在节点下方
      })),
    };
  }

  /**
   * 更新布局方向
   */
  updateDirection(direction: 'RIGHT' | 'DOWN' | 'LEFT' | 'UP'): void {
    (elkOptions as any)['elk.direction'] = direction;
  }

  /**
   * 更新间距配置
   */
  updateSpacing(nodeNodeBetweenLayers: string, nodeNode: string): void {
    (elkOptions as any)['elk.layered.spacing.nodeNodeBetweenLayers'] = nodeNodeBetweenLayers;
    (elkOptions as any)['elk.layered.spacing.nodeNode'] = nodeNode;
  }
}

// 单例实例
export const elkLayoutService = new ELKLayoutService();