import Graph from 'graphology';

import { PropertyGraphData } from './types';

export interface GraphFieldMapping {
  nodeSizeField: string | null;
  nodeColorField: string | null;
  nodeLabelField: string | null;
  nodeXField: string | null;
  nodeYField: string | null;
}

export const extractUniqueLabels = (graphData: PropertyGraphData): string[] => {
  const labels = new Set<string>();
  graphData.nodes.forEach((node) => node.labels.forEach((label) => labels.add(label)));
  return Array.from(labels).sort();
};

export const getNodeColorCategory = (
  node: PropertyGraphData['nodes'][number],
  field: string | null,
): string => {
  if (!field) return node.labels[0] || 'Unknown';
  const value = node.properties[field];
  return value === null || value === undefined ? 'Unknown' : String(value);
};

export const extractUniqueNodeColorCategories = (
  graphData: PropertyGraphData,
  field: string | null,
): string[] => Array.from(
  new Set(graphData.nodes.map((node) => getNodeColorCategory(node, field))),
).sort();

export const extractUniqueRelationshipTypes = (graphData: PropertyGraphData): string[] => (
  Array.from(new Set(graphData.edges.map((edge) => edge.type))).sort()
);

const hashString = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const deterministicPosition = (nodeId: string, salt = ''): { x: number; y: number } => {
  const xHash = hashString(`${salt}:x:${nodeId}`);
  const yHash = hashString(`${salt}:y:${nodeId}`);
  return {
    x: (xHash / 0xffffffff) * 10 - 5,
    y: (yHash / 0xffffffff) * 10 - 5,
  };
};

export const convertPropertyGraphToGraph = (
  graphData: PropertyGraphData,
  colorMap: Map<string, string>,
  defaultNodeColor: string,
  defaultEdgeColor: string,
  defaultNodeSize: number,
  mapping: GraphFieldMapping,
): Graph => {
  const graph = new Graph({ multi: true });

  graphData.nodes.forEach((node) => {
    const primaryLabel = node.labels[0] || 'Unknown';
    const colorCategory = getNodeColorCategory(node, mapping.nodeColorField);
    const color = colorMap.get(colorCategory) || defaultNodeColor;
    const configuredSize = mapping.nodeSizeField
      ? Number(node.properties[mapping.nodeSizeField])
      : Number.NaN;
    const hasExplicitSize = Number.isFinite(configuredSize) && configuredSize > 0;
    const size = hasExplicitSize ? configuredSize : defaultNodeSize;
    const mappedLabel = mapping.nodeLabelField
      ? node.properties[mapping.nodeLabelField]
      : null;
    const label = mappedLabel === null || mappedLabel === undefined || mappedLabel === ''
      ? node.id
      : String(mappedLabel);
    const seededPosition = deterministicPosition(node.id);
    const configuredX = mapping.nodeXField ? Number(node.properties[mapping.nodeXField]) : Number.NaN;
    const configuredY = mapping.nodeYField ? Number(node.properties[mapping.nodeYField]) : Number.NaN;
    const x = Number.isFinite(configuredX) ? configuredX : seededPosition.x;
    const y = Number.isFinite(configuredY) ? configuredY : seededPosition.y;

    graph.addNode(node.id, {
      x,
      y,
      initialX: x,
      initialY: y,
      size,
      label,
      color,
      borderColor: color,
      type: 'border',
      primaryLabel,
      colorCategory,
      labels: node.labels,
      properties: node.properties,
      baseSize: size,
      hasExplicitSize,
      baseColor: color,
    });
  });

  graphData.edges.forEach((relationship) => {
    if (!graph.hasNode(relationship.source) || !graph.hasNode(relationship.target)) {
      throw new Error(
        `Edge "${relationship.id}" references a missing node: `
        + `${relationship.source} -> ${relationship.target}`,
      );
    }

    const attributes = {
      id: relationship.id,
      size: 2,
      color: defaultEdgeColor,
      relType: relationship.type,
      properties: relationship.properties,
      label: relationship.type,
      baseColor: defaultEdgeColor,
      baseSize: 2,
    };
    if (relationship.directed) {
      graph.addDirectedEdgeWithKey(
        relationship.id,
        relationship.source,
        relationship.target,
        attributes,
      );
    } else {
      graph.addUndirectedEdgeWithKey(
        relationship.id,
        relationship.source,
        relationship.target,
        attributes,
      );
    }
  });

  return graph;
};
