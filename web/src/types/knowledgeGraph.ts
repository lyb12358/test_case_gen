export interface GraphNode {
  id: string;
  name: string;
  label: string;
  type: 'scenario' | 'business' | 'service' | 'interface' | 'test_case';
  description?: string;
  businessType?: string;
  parentId?: number;
  entityOrder?: number;
  extra_data?: any;
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
  scenario_entities: number;
  business_entities: number;
  service_entities: number;
  interface_entities: number;
  test_case_entities: number;
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
  subject_name?: string;
  object_name?: string;
  business_type?: string;
  created_at: string;
}

export interface EntityDetails {
  id: number;
  name: string;
  type: string;
  description?: string;
  business_type?: string;
  parent_id?: number;
  entity_order?: number;
  extra_data?: string;
  created_at: string;
  children?: EntityDetails[];
  business_description?: string;
  test_cases?: TestCaseInfo[];
  related_entities?: GraphEntity[];
  related_relations?: GraphRelation[];
}

export interface BusinessDescription {
  entity_id: number;
  entity_name: string;
  full_description: string;
  business_code: string;
}

export interface EntityTestCases {
  entity_id: number;
  entity_name: string;
  test_cases: TestCaseInfo[];
}

export interface TestCaseItemInfo {
  id: number;
  group_id: number;
  test_case_id: string;
  name: string;
  description?: string;
  module?: string;
  functional_module?: string;
  functional_domain?: string;
  preconditions: string[];
  steps: string[];
  expected_result: string[];
  remarks?: string;
  entity_order?: number;
  created_at: string;
}

export interface TestCaseGroupInfo {
  id: number;
  business_type: string;
  generation_metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
  test_case_items: TestCaseItemInfo[];
}

export interface TestCaseInfo {
  id: number;
  name: string;
  description?: string;
  test_data: Record<string, any>;
  created_at: string;
}