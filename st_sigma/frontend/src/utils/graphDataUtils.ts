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

// 新增：提取所有唯一的关系类型
export const extractUniqueRelationshipTypes = (graphData: Neo4jGraphData): string[] => {
  const typesSet = new Set<string>();
  
  graphData.relationships.forEach(rel => {
    typesSet.add(rel.type);
  });
  
  return Array.from(typesSet).sort();
};

// 将 Neo4j 数据转换为 Graphology 图
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
    
    // 计算节点大小（可以基于属性或使用默认值）
    const size = node.properties.size || 15;
    
    // 使用 name 或 id 作为显示标签
    const label = node.properties.name || 
                  node.properties.label || 
                  node.properties.title ||
                  `Node ${nodeId}`;

    graph.addNode(nodeId, {
      x: Math.random() * 10 - 5, // 随机初始位置，后续会用布局算法调整
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

  // 添加边
  graphData.relationships.forEach(relationship => {
    const sourceId = String(relationship.start);
    const targetId = String(relationship.end);
    
    // 确保节点存在
    if (graph.hasNode(sourceId) && graph.hasNode(targetId)) {
      const edgeId = `${sourceId}-${targetId}-${relationship.identity}`;
      
      graph.addEdge(sourceId, targetId, {
        id: edgeId,
        size: 2,
        color: '#d4c4b0',
        // 关系类型
        relType: relationship.type,
        // 关系属性
        properties: relationship.properties,
        // 用于显示的标签
        label: relationship.type,
        // 基础属性
        baseColor: '#d4c4b0',
        baseSize: 2,
      });
    }
  });

  return graph;
};