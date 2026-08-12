export interface PropertyGraphNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

export interface PropertyGraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
  directed: boolean;
}

export interface PropertyGraphData {
  nodes: PropertyGraphNode[];
  edges: PropertyGraphEdge[];
}

export interface StreamlitComponentArgs {
  graphData?: PropertyGraphData;
  height?: number;
  theme?: 'streamlit' | 'humanistic';
}

export interface NodeInfo {
  id: string;
  labels: string[];
  color: string;
  properties: Record<string, any>;
}

// 新增：边/关系信息接口
export interface EdgeInfo {
  id: string;
  source: string;
  target: string;
  relType: string;
  color: string;
  properties: Record<string, any>;
}

export interface NodeType {
  type: string;
  color: string;
  description: string;
}

// 新增：关系类型接口
export interface RelationshipType {
  type: string;
  color: string;
  count: number;
}
