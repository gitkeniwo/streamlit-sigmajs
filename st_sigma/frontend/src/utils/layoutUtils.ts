import Graph from 'graphology';
import { circlepack, circular } from 'graphology-layout';
import forceLayout from 'graphology-layout-force';
import forceAtlas2 from 'graphology-layout-forceatlas2';

import { deterministicPosition } from './graphDataUtils';
import { LayoutConfig } from './types';

export interface ForceAtlasSettings {
  gravity: number;
  scalingRatio: number;
  linLogMode: boolean;
  strongGravityMode: boolean;
}

const resetInitialPositions = (graph: Graph): void => {
  graph.forEachNode((node, attributes) => {
    const fallback = deterministicPosition(node);
    graph.mergeNodeAttributes(node, {
      x: Number.isFinite(attributes.initialX) ? attributes.initialX : fallback.x,
      y: Number.isFinite(attributes.initialY) ? attributes.initialY : fallback.y,
    });
  });
};

const assignGrid = (graph: Graph): void => {
  const nodes = graph.nodes();
  const columns = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  nodes.forEach((node, index) => {
    graph.mergeNodeAttributes(node, {
      x: index % columns,
      y: -Math.floor(index / columns),
    });
  });
};

const assignConcentric = (graph: Graph): void => {
  const nodes = graph.nodes().sort((a, b) => graph.degree(b) - graph.degree(a));
  if (!nodes.length) return;

  let cursor = 0;
  let ring = 0;
  while (cursor < nodes.length) {
    const capacity = ring === 0 ? 1 : ring * 6;
    const ringNodes = nodes.slice(cursor, cursor + capacity);
    const radius = ring * 1.8;
    ringNodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / ringNodes.length - Math.PI / 2;
      graph.mergeNodeAttributes(node, {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      });
    });
    cursor += ringNodes.length;
    ring += 1;
  }
};

const assignHierarchical = async (
  graph: Graph,
  direction: LayoutConfig['hierarchy_direction'],
): Promise<void> => {
  const { default: dagre } = await import('@dagrejs/dagre');
  const layoutGraph = new dagre.graphlib.Graph({ multigraph: true });
  layoutGraph.setGraph({
    rankdir: direction,
    nodesep: 42,
    ranksep: 72,
    marginx: 12,
    marginy: 12,
  });
  layoutGraph.setDefaultEdgeLabel(() => ({}));

  graph.forEachNode((node, attributes) => {
    const diameter = Math.max(28, Number(attributes.size || 12) * 2.4);
    layoutGraph.setNode(node, { width: diameter, height: diameter });
  });
  graph.forEachEdge((edge, _attributes, source, target) => {
    layoutGraph.setEdge(source, target, {}, edge);
  });

  dagre.layout(layoutGraph);
  graph.forEachNode((node) => {
    const position = layoutGraph.node(node);
    graph.mergeNodeAttributes(node, { x: position.x, y: -position.y });
  });
};

export const applyInitialLayout = async (
  graph: Graph,
  config: LayoutConfig,
  forceAtlasSettings: ForceAtlasSettings,
): Promise<void> => {
  resetInitialPositions(graph);
  switch (config.name) {
    case 'forceatlas2':
      if (config.iterations > 0) {
        forceAtlas2.assign(graph, { iterations: config.iterations, settings: forceAtlasSettings });
      }
      break;
    case 'force':
      if (config.iterations > 0) forceLayout.assign(graph, { maxIterations: config.iterations });
      break;
    case 'circular':
      circular.assign(graph);
      break;
    case 'circlepack':
      circlepack.assign(graph, { hierarchyAttributes: ['primaryLabel'] });
      break;
    case 'grid':
      assignGrid(graph);
      break;
    case 'concentric':
      assignConcentric(graph);
      break;
    case 'hierarchical':
      await assignHierarchical(graph, config.hierarchy_direction);
      break;
    case 'random':
      graph.forEachNode((node) => {
        graph.mergeNodeAttributes(node, deterministicPosition(node, 'random-layout'));
      });
      break;
    case 'none':
      break;
  }
};
