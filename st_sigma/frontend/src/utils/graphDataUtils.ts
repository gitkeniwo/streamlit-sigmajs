import Graph from 'graphology';
import { Neo4jGraphData, Neo4jNode } from './types';
import { createLabelColorMap } from './colorUtils';

// 从 Neo4j 数据中提取所有唯一的 labels
export const extractUniqueLabels = (graphData: Neo4jGraphData): string[] => {
  const labelsSet = new Set<string>();
  
  graphData.nodes.forEach(node => {
    node.labels.forEach(label => labelsSet.add(label));
  });
  
  return Array.from(labelsSet).sort();
};

// 将 Neo4j 数据转换为 Graphology 图
// 在 graphDataUtils.ts 中修改边的创建
export const convertNeo4jToGraph = (
  graphData: Neo4jGraphData,
  labelColorMap: Map<string, string>
): Graph => {
  const graph = new Graph();

  // 添加节点
  graphData.nodes.forEach(node => {
    const nodeId = String(node.identity);
    const primaryLabel = node.labels[0] || 'Unknown';
    const color = labelColorMap.get(primaryLabel) || '#9B8579';
    
    const size = node.properties.size || 15;
    
    const label = node.properties.name || 
                  node.properties.label || 
                  node.properties.title ||
                  `Node ${nodeId}`;

    graph.addNode(nodeId, {
      x: Math.random() * 10 - 5,
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

  // 添加边 - 移除 type 属性，改为存储在自定义字段中
  graphData.relationships.forEach(relationship => {
    const sourceId = String(relationship.start);
    const targetId = String(relationship.end);
    
    if (graph.hasNode(sourceId) && graph.hasNode(targetId)) {
      const edgeId = `${sourceId}-${targetId}-${relationship.identity}`;
      
      graph.addEdge(sourceId, targetId, {
        id: edgeId,
        size: 2,
        color: '#d4c4b0',
        // 不使用 type 作为 Sigma 的边类型
        // 而是存储在 relType 中
        relType: relationship.type,
        properties: relationship.properties,
      });
    }
  });

  return graph;
};