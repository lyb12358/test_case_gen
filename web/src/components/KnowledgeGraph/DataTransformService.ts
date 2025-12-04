import type { ReactFlowNode, ReactFlowEdge } from './DagreLayoutService';
import type { KnowledgeGraphData } from '../../types/knowledgeGraph';

// 业务类型颜色映射
const businessTypeColors: Record<string, string> = {
  RCC: '#1890ff',
  RFD: '#52c41a',
  ZAB: '#fa8c16',
  ZBA: '#eb2f96',
  PAB: '#722ed1',
  PAE: '#13c2c2',
  PAI: '#faad14',
  RCE: '#f5222d',
  RES: '#2f54eb',
  RHL: '#a0d911',
  RPP: '#eb2f96',
  RSM: '#52c41a',
  RWS: '#1890ff',
  RDO_RDC: '#fa8c16',
  // 添加更多业务类型...
};

// 节点类型颜色映射 - 新5色设计系统
const nodeTypeColors = {
  tsp: '#1e40af',        // 深蓝色 - TSP根节点
  project: '#2563eb',    // 蓝色 - 项目节点
  business_type: '#9333ea', // 紫色 - 业务类型节点
  test_point: '#0ea5e9',   // 浅蓝色 - 测试点节点
  test_case: '#16a34a',    // 深绿色 - 测试用例节点
};

/**
 * 数据转换服务 - 将知识图谱API数据转换为React Flow格式
 */
export class DataTransformService {
  /**
   * 转换知识图谱数据为React Flow格式
   */
  transformToReactFlow(data: KnowledgeGraphData): {
    nodes: ReactFlowNode[];
    edges: ReactFlowEdge[];
  } {
    if (!data?.nodes || !data?.edges) {
      return { nodes: [], edges: [] };
    }

    const nodes = this.transformNodes(data.nodes);
    const edges = this.transformEdges(data.edges);

    return { nodes, edges };
  }

  /**
   * 转换节点数据
   */
  private transformNodes(apiNodes: any[]): ReactFlowNode[] {
    return apiNodes.map(apiNode => {
      const nodeType = apiNode.data?.type || apiNode.type || 'test_case';
      const level = this.getNodeLevel(nodeType);

      return {
        id: apiNode.id,
        type: this.getReactFlowNodeType(nodeType),
        position: { x: 0, y: 0 }, // 将由ELK计算
        data: {
          label: apiNode.data?.label || apiNode.label || apiNode.id,
          nodeType,
          level,
          originalData: apiNode.data || apiNode,
          color: this.getNodeColor(nodeType, apiNode.data?.businessType),
          businessType: apiNode.data?.businessType,
          stats: apiNode.data?.stats,
          description: apiNode.data?.description,
          // 添加特定的节点数据
          ...(nodeType === 'tsp' && {
            projectCount: apiNode.data?.stats?.projectCount || 0,
            testCaseCount: apiNode.data?.stats?.testCaseCount || 0,
          }),
          ...(nodeType === 'business_type' && {
            businessName: this.getBusinessTypeFullName(apiNode.data?.businessType),
          }),
          ...(['test_point', 'test_case'].includes(nodeType) && {
            stage: apiNode.data?.stage || nodeType, // 使用nodeType作为默认值，确保test_case正确映射
            priority: apiNode.data?.priority || 'medium',
            status: apiNode.data?.status || 'draft',
          }),
        },
      };
    });
  }

  /**
   * 转换边数据
   */
  private transformEdges(apiEdges: any[]): ReactFlowEdge[] {
    return apiEdges.map(apiEdge => ({
      id: apiEdge.id || `${apiEdge.source}-${apiEdge.target}`,
      source: apiEdge.source,
      target: apiEdge.target,
      type: 'smoothstep', // 使用平滑阶梯曲线
      data: {
        label: apiEdge.label,
        relationship: apiEdge.data?.relationship || 'contains',
      },
      style: {
        stroke: '#b1b1b7',
        strokeWidth: 2,
      },
    }));
  }

  /**
   * 获取节点层级
   */
  private getNodeLevel(nodeType: string): number {
    switch (nodeType) {
      case 'tsp': return 0;
      case 'project': return 1;
      case 'business_type': return 2;
      case 'test_point':
      case 'test_case': return 3;
      default: return 3;
    }
  }

  /**
   * 获取React Flow节点类型
   */
  private getReactFlowNodeType(nodeType: string): string {
    switch (nodeType) {
      case 'tsp': return 'tspNode';
      case 'project': return 'projectNode';
      case 'business':
      case 'business_type': return 'businessTypeNode'; // 兼容两种类型
      case 'test_point':
      case 'test_case': return 'testCaseNode';
      default: return 'default';
    }
  }

  /**
   * 获取节点颜色
   */
  private getNodeColor(nodeType: string, businessType?: string): string {
    if ((nodeType === 'business' || nodeType === 'business_type') && businessType) {
      return businessTypeColors[businessType] || '#d9d9d9';
    }
    return nodeTypeColors[nodeType as keyof typeof nodeTypeColors] || '#d9d9d9';
  }

  /**
   * 获取业务类型全名
   */
  private getBusinessTypeFullName(businessType?: string): string {
    if (!businessType) return '未知业务类型';

    const businessNames: Record<string, string> = {
      RCC: '远程空调控制',
      RFD: '远程车门控制',
      ZAB: '远程车门解锁',
      ZBA: '远程车门上锁',
      PAB: '远程鸣笛控制',
      PAE: '远程引擎熄火',
      PAI: '远程引擎点火',
      RCE: '远程引擎控制',
      RES: '远程座椅控制',
      RHL: '远程灯光控制',
      RPP: '远程寻车功能',
      RSM: '远程座椅调节',
      RWS: '远程车窗控制',
      RDO_RDC: '远程车门开关',
    };

    return businessNames[businessType] || businessType;
  }

  /**
   * 按层级统计节点
   */
  getNodeStats(nodes: ReactFlowNode[]): {
    level0: number; // TSP
    level1: number; // Project
    level2: number; // Business
    level3: number; // TestCase
    total: number;
  } {
    const stats = {
      level0: 0,
      level1: 0,
      level2: 0,
      level3: 0,
      total: nodes.length,
    };

    nodes.forEach(node => {
      switch (node.data.level) {
        case 0: stats.level0++; break;
        case 1: stats.level1++; break;
        case 2: stats.level2++; break;
        case 3: stats.level3++; break;
      }
    });

    return stats;
  }

  /**
   * 按业务类型分组
   */
  groupByBusinessType(nodes: ReactFlowNode[]): Record<string, number> {
    const groups: Record<string, number> = {};

    nodes.filter(node => node.data.nodeType === 'business_type').forEach(node => {
      const businessType = node.data.businessType || 'unknown';
      groups[businessType] = (groups[businessType] || 0) + 1;
    });

    return groups;
  }
}

// 单例实例
export const dataTransformService = new DataTransformService();