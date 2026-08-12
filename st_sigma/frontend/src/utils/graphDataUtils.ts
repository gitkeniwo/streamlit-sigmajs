import Graph from 'graphology';
import { PropertyGraphData } from './types';
import { createLabelColorMap } from './colorUtils';


export const extractUniqueLabels = (graphData: PropertyGraphData): string[] => {
  const labelsSet = new Set<string>();
  
  graphData.nodes.forEach(node => {
    node.labels.forEach(label => labelsSet.add(label));
  });
  
  return Array.from(labelsSet).sort();
};


export const extractUniqueRelationshipTypes = (graphData: PropertyGraphData): string[] => {
  const typesSet = new Set<string>();
  
  graphData.edges.forEach(rel => {
    typesSet.add(rel.type);
  });
  
  return Array.from(typesSet).sort();
};

// Turn canonical property-graph data into a graphology Graph instance
export const convertPropertyGraphToGraph = (
  graphData: PropertyGraphData,
  labelColorMap: Map<string, string>,
  defaultNodeColor: string,
  defaultEdgeColor: string,
): Graph => {
  const graph = new Graph({ multi: true });

  // Add nodes
  graphData.nodes.forEach(node => {
    const nodeId = node.id;
    const primaryLabel = node.labels[0] || 'Unknown';
    const color = labelColorMap.get(primaryLabel) || defaultNodeColor;
    
    // compute size based on a "size" property or default
    const size = node.properties.size || 12;
    
    // use name, label, or title property as label if available
    const label = node.properties.name || 
                  node.properties.label || 
                  node.properties.title ||
                  `Node ${primaryLabel}`;
    const configuredX = Number(node.properties.x);
    const configuredY = Number(node.properties.y);

    graph.addNode(nodeId, {
      x: Number.isFinite(configuredX) ? configuredX : Math.random() * 10 - 5,
      y: Number.isFinite(configuredY) ? configuredY : Math.random() * 10 - 5,
      size: size,
      label: label,
      color: color,
      borderColor: color,
      type: 'border',
      labels: node.labels,
      properties: node.properties,
      baseSize: size,
      baseColor: color,
    });
  });

  // Add edges
  graphData.edges.forEach(relationship => {
    const sourceId = relationship.source;
    const targetId = relationship.target;
    
    // Only add edge if both nodes exist
    if (graph.hasNode(sourceId) && graph.hasNode(targetId)) {
      const edgeId = relationship.id;
      
      const attributes = {
        id: edgeId,
        size: 2,
        color: defaultEdgeColor,

        relType: relationship.type,

        properties: relationship.properties,

        label: relationship.type,

        baseColor: defaultEdgeColor,
        baseSize: 2,
      };
      if (relationship.directed) {
        graph.addDirectedEdgeWithKey(edgeId, sourceId, targetId, attributes);
      } else {
        graph.addUndirectedEdgeWithKey(edgeId, sourceId, targetId, attributes);
      }
    }
  });

  return graph;
};
