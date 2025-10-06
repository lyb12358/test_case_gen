export interface GraphNode {
  id: string;
  name: string;
  label: string;
  type: 'business' | 'service' | 'interface';
  description?: string;
  businessType?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  type: string;
  businessType?: string;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphStats {
  total_entities: number;
  total_relations: number;
  business_entities: number;
  service_entities: number;
  interface_entities: number;
}

export interface GraphEntity {
  id: number;
  name: string;
  type: string;
  description?: string;
  business_type?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface GraphRelation {
  id: number;
  subject: string;
  predicate: string;
  object: string;
  business_type?: string;
  created_at: string;
}