// Neo4j graph data types and interfaces
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

// Export edge info interface
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

// Export relationship type interface
export interface RelationshipType {
  type: string;
  color: string;
  count: number;
}