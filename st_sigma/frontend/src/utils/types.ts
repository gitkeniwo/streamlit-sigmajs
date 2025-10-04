// Neo4j 数据结构类型定义
export interface Neo4jNode {
  identity: number | string;
  labels: string[];
  properties: Record<string, any>;
}

export interface Neo4jRelationship {
  identity: number | string;
  start: number | string;
  end: number | string;
  type: string;
  properties: Record<string, any>;
}

export interface Neo4jGraphData {
  nodes: Neo4jNode[];
  relationships: Neo4jRelationship[];
}

export interface StreamlitComponentArgs {
  graphData?: Neo4jGraphData;
  height?: number;
}

export interface NodeInfo {
  id: string;
  labels: string[];
  color: string;
  properties: Record<string, any>;
}

export interface NodeType {
  type: string;
  color: string;
  description: string;
}