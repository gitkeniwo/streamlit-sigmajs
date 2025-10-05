import Graph from 'graphology';
import { Neo4jGraphData, Neo4jNode } from './types';
import { createLabelColorMap } from './colorUtils';

// Extract all unique labels from the graph data
export const extractUniqueLabels = (graphData: Neo4jGraphData): string[] => {
  const labelsSet = new Set<string>();
  
  graphData.nodes.forEach(node => {
    node.labels.forEach(label => labelsSet.add(label));
  });
  
  return Array.from(labelsSet).sort();
};

// Extract all unique relationship types from the graph data
export const extractUniqueRelationshipTypes = (graphData: Neo4jGraphData): string[] => {
  const typesSet = new Set<string>();
  
  graphData.relationships.forEach(rel => {
    typesSet.add(rel.type);
  });
  
  return Array.from(typesSet).sort();
};

// Convert Neo4j graph data to Graphology format
export const convertNeo4jToGraph = (
  graphData: Neo4jGraphData,
  labelColorMap: Map<string, string>
): Graph => {
  const graph = new Graph();

  // Add nodes
  graphData.nodes.forEach(node => {
    const nodeId = String(node.identity);
    const primaryLabel = node.labels[0] || 'Unknown';
    const color = labelColorMap.get(primaryLabel) || '#9B8579';
    
    // Compute size based on a property or default
    const size = node.properties.size || 15;
    
    // Use a property for the label or fallback
    const label = node.properties.name || 
                  node.properties.label || 
                  node.properties.title ||
                  `Node ${nodeId}`;

    graph.addNode(nodeId, {
      x: Math.random() * 10 - 5, // Random position for initial layout
      y: Math.random() * 10 - 5,
      size: size,
      label: label,
      color: color,
      labels: node.labels,
      properties: node.properties,
      baseSize: size,
      baseColor: color,
    });
  });

  // Add edges
  graphData.relationships.forEach(relationship => {
    const sourceId = String(relationship.start);
    const targetId = String(relationship.end);
    
    // Ensure both nodes exist before adding the edge
    if (graph.hasNode(sourceId) && graph.hasNode(targetId)) {
      const edgeId = `${sourceId}-${targetId}-${relationship.identity}`;
      
      graph.addEdge(sourceId, targetId, {
        id: edgeId,
        size: 2,
        color: '#d4c4b0',
       
        relType: relationship.type,
       
        properties: relationship.properties,
        
        label: relationship.type,
        
        baseColor: '#d4c4b0',
        baseSize: 2,
      });
    }
  });

  return graph;
};