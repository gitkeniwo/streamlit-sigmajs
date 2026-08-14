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

export interface DisplayConfig {
  node_labels: 'auto' | 'hover' | 'hidden';
  edge_labels: 'always' | 'hover' | 'hidden';
  node_label_size: number;
  node_size: number;
  node_size_field: string | null;
  node_color_field: string | null;
  node_label_field: string | null;
  node_size_mode: 'auto' | 'fixed';
  edge_label_size: number;
  label_density: number;
  label_rendered_size_threshold: number;
  label_font_family: string;
  label_font_url: string | null;
  show_legend: boolean;
  legend_collapsed: boolean;
  show_fullscreen_button: boolean;
  properties_panel: 'compact' | 'cards' | 'hidden';
  selection_dimming: number;
  hide_edges_on_move: boolean;
}

export interface LayoutConfig {
  name: 'forceatlas2' | 'force' | 'circular' | 'circlepack' | 'grid' | 'concentric' | 'hierarchical' | 'random' | 'none';
  node_x_field: string | null;
  node_y_field: string | null;
  iterations: number;
  gravity: number;
  scaling_ratio: number;
  lin_log_mode: boolean;
  strong_gravity_mode: boolean;
  dynamic_after_drag: boolean;
  drag_relaxation_ms: number;
  hierarchy_direction: 'TB' | 'BT' | 'LR' | 'RL';
}

export interface GraphConfig {
  display: DisplayConfig;
  layout: LayoutConfig;
}

export interface StreamlitComponentArgs {
  graphData?: PropertyGraphData;
  height?: number;
  theme?: 'streamlit' | 'humanistic';
  config?: GraphConfig;
}

export interface SigmaGraphState {
  clicked: { type: 'node' | 'edge'; id: string } | null;
  selection: { nodes: string[]; edges: string[] };
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
