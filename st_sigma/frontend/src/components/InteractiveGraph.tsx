import { useEffect, useMemo, useRef, useState } from 'react';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import FA2LayoutSupervisor from 'graphology-layout-forceatlas2/worker';
import { circular, random } from 'graphology-layout';
import Sigma from 'sigma';
import { NodeBorderProgram } from '@sigma/node-border';

import LegendPanel, { NodeType, RelationshipType } from './LegendPanel';
import PropertiesPanel, { NodeInfo } from './PropertiesPanel';
import RelationshipPropertiesPanel, { EdgeInfo } from './RelationshipPropertiesPanel';
import { GraphConfig, StreamlitComponentArgs } from '../utils/types';
import {
  convertPropertyGraphToGraph,
  extractUniqueLabels,
  extractUniqueRelationshipTypes,
} from '../utils/graphDataUtils';
import { createLabelColorMap } from '../utils/colorUtils';
import { getThemeTokens } from '../utils/theme';

import './InteractiveGraph.css';

interface InteractiveGraphProps {
  args: StreamlitComponentArgs;
}

const DEFAULT_CONFIG: GraphConfig = {
  display: {
    node_labels: 'auto',
    edge_labels: 'hover',
    node_label_size: 12,
    edge_label_size: 9,
    label_density: 0.8,
    label_rendered_size_threshold: 6,
    show_legend: true,
    legend_collapsed: true,
    properties_panel: 'compact',
    selection_dimming: 0.68,
    hide_edges_on_move: false,
  },
  layout: {
    name: 'forceatlas2',
    iterations: 100,
    gravity: 1,
    scaling_ratio: 10,
    lin_log_mode: false,
    strong_gravity_mode: false,
    dynamic_after_drag: false,
    drag_relaxation_ms: 700,
  },
};

const colorToNumber = (color: string): number | null => {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) return Number.parseInt(hex[1], 16);
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(color);
  if (!rgb) return null;
  return (Number(rgb[1]) << 16) + (Number(rgb[2]) << 8) + Number(rgb[3]);
};

const mixColors = (foreground: string, background: string, amount: number): string => {
  const from = colorToNumber(foreground);
  const to = colorToNumber(background);
  if (from === null || to === null) return foreground;

  const channel = (shift: number) => Math.round(
    ((from >> shift) & 255) * (1 - amount) + ((to >> shift) & 255) * amount,
  );
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, '0')).join('')}`;
};

const InteractiveGraph: React.FC<InteractiveGraphProps> = ({ args }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);

  const draggedNodeRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);
  const hoveredNodeRef = useRef<string | null>(null);
  const hoveredEdgeRef = useRef<string | null>(null);
  const selectedNodeIdRef = useRef<string | null>(null);
  const selectedNodeNeighborsRef = useRef<Set<string>>(new Set());
  const selectedEdgeIdRef = useRef<string | null>(null);
  const selectedEdgeNodesRef = useRef<Set<string>>(new Set());

  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<EdgeInfo | null>(null);
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([]);

  const graphData = args.graphData;
  const componentHeight = args.height || 600;
  const themeName = args.theme || 'streamlit';
  const theme = getThemeTokens(themeName);
  const config = args.config || DEFAULT_CONFIG;
  const displayConfig = config.display;
  const layoutConfig = config.layout;

  const stableGraphData = useMemo(() => {
    return graphData ? JSON.stringify(graphData) : null;
  }, [graphData]);
  const stableConfig = useMemo(() => JSON.stringify(config), [config]);

  const refresh = () => sigmaRef.current?.refresh();

  const clearSelectedNode = () => {
    selectedNodeIdRef.current = null;
    selectedNodeNeighborsRef.current = new Set();
    setSelectedNode(null);
    refresh();
  };

  const clearSelectedEdge = () => {
    selectedEdgeIdRef.current = null;
    selectedEdgeNodesRef.current = new Set();
    setSelectedEdge(null);
    refresh();
  };

  useEffect(() => {
    if (!containerRef.current || !graphData || !stableGraphData) return;

    selectedNodeIdRef.current = null;
    selectedNodeNeighborsRef.current = new Set();
    selectedEdgeIdRef.current = null;
    selectedEdgeNodesRef.current = new Set();
    hoveredNodeRef.current = null;
    hoveredEdgeRef.current = null;
    setSelectedNode(null);
    setSelectedEdge(null);

    const uniqueLabels = extractUniqueLabels(graphData);
    const uniqueRelTypes = extractUniqueRelationshipTypes(graphData);
    const labelColorMap = createLabelColorMap(uniqueLabels, theme.palette);

    setNodeTypes(
      uniqueLabels.map((label) => ({
        type: label,
        color: labelColorMap.get(label) || theme.node,
        description: `${label} nodes`,
      })),
    );

    const relTypeCount = new Map<string, number>();
    graphData.edges.forEach((relationship) => {
      relTypeCount.set(
        relationship.type,
        (relTypeCount.get(relationship.type) || 0) + 1,
      );
    });
    setRelationshipTypes(
      uniqueRelTypes.map((type) => ({
        type,
        count: relTypeCount.get(type) || 0,
      })),
    );

    const graph = convertPropertyGraphToGraph(
      graphData,
      labelColorMap,
      theme.node,
      theme.edge,
    );
    graphRef.current = graph;
    const renderedBackground = getComputedStyle(containerRef.current).backgroundColor;

    const forceAtlasSettings = {
      gravity: layoutConfig.gravity,
      scalingRatio: layoutConfig.scaling_ratio,
      linLogMode: layoutConfig.lin_log_mode,
      strongGravityMode: layoutConfig.strong_gravity_mode,
    };

    if (layoutConfig.name === 'circular') {
      circular.assign(graph);
    } else if (layoutConfig.name === 'random') {
      random.assign(graph);
    } else if (layoutConfig.name === 'forceatlas2' && layoutConfig.iterations > 0) {
      forceAtlas2.assign(graph, {
        iterations: layoutConfig.iterations,
        settings: forceAtlasSettings,
      });
    }

    const sigma = new Sigma(graph, containerRef.current, {
      nodeProgramClasses: { border: NodeBorderProgram },
      defaultEdgeColor: theme.edge,
      defaultNodeColor: theme.node,
      labelColor: { color: theme.text },
      labelSize: displayConfig.node_label_size,
      labelWeight: '500',
      edgeLabelSize: displayConfig.edge_label_size,
      labelDensity: displayConfig.label_density,
      labelRenderedSizeThreshold: displayConfig.label_rendered_size_threshold,
      renderLabels: displayConfig.node_labels !== 'hidden',
      renderEdgeLabels: displayConfig.edge_labels !== 'hidden',
      hideEdgesOnMove: displayConfig.hide_edges_on_move,
      enableEdgeEvents: true,
      nodeReducer: (node, data) => {
        const baseSize = data.baseSize ?? data.size;
        const baseColor = data.baseColor ?? data.color;
        const displayData: Record<string, any> = {
          ...data,
          size: baseSize,
          color: baseColor,
          borderColor: data.borderColor ?? baseColor,
          type: 'border',
          highlighted: false,
        };

        const selectedNodeId = selectedNodeIdRef.current;
        if (selectedNodeId) {
          if (node === selectedNodeId) {
            displayData.size = baseSize * 1.06;
            displayData.borderColor = theme.selected;
          } else if (!selectedNodeNeighborsRef.current.has(node)) {
            displayData.color = mixColors(
              baseColor,
              renderedBackground || theme.background,
              displayConfig.selection_dimming,
            );
            displayData.borderColor = mixColors(
              baseColor,
              renderedBackground || theme.background,
              displayConfig.selection_dimming * 0.42,
            );
          }
        }

        if (selectedEdgeIdRef.current) {
          if (selectedEdgeNodesRef.current.has(node)) {
            displayData.size = baseSize * 1.04;
            displayData.borderColor = theme.selected;
          } else {
            displayData.color = mixColors(
              baseColor,
              renderedBackground || theme.background,
              displayConfig.selection_dimming,
            );
            displayData.borderColor = mixColors(
              baseColor,
              renderedBackground || theme.background,
              displayConfig.selection_dimming * 0.42,
            );
          }
        }

        if (hoveredNodeRef.current === node) {
          displayData.size = baseSize * 1.08;
          displayData.borderColor = theme.selected;
        }

        if (draggedNodeRef.current === node) {
          displayData.borderColor = theme.selected;
        }

        if (displayConfig.node_labels === 'hidden') {
          displayData.label = null;
        } else if (displayConfig.node_labels === 'hover') {
          const showLabel = hoveredNodeRef.current === node
            || selectedNodeId === node
            || selectedEdgeNodesRef.current.has(node);
          displayData.label = showLabel ? data.label : null;
        }

        return displayData;
      },
      edgeReducer: (edge, data) => {
        const baseSize = data.baseSize ?? data.size;
        const baseColor = data.baseColor ?? data.color;
        const displayData: Record<string, any> = {
          ...data,
          size: baseSize,
          color: baseColor,
        };

        const selectedNodeId = selectedNodeIdRef.current;
        if (selectedNodeId) {
          const [source, target] = graph.extremities(edge);
          if (source === selectedNodeId || target === selectedNodeId) {
            displayData.color = graph.getNodeAttribute(selectedNodeId, 'baseColor');
            displayData.size = baseSize * 1.5;
          } else {
            displayData.color = theme.edgeMuted;
            displayData.size = baseSize * 0.72;
          }
        }

        const selectedEdgeId = selectedEdgeIdRef.current;
        if (selectedEdgeId) {
          if (selectedEdgeId === edge) {
            displayData.color = theme.selected;
            displayData.size = baseSize * 1.8;
          } else {
            displayData.color = theme.edgeMuted;
            displayData.size = baseSize * 0.72;
          }
        }

        if (hoveredEdgeRef.current === edge) {
          displayData.size *= 1.2;
        }

        if (displayConfig.edge_labels === 'hidden') {
          displayData.label = null;
        } else if (displayConfig.edge_labels === 'hover') {
          const showLabel = hoveredEdgeRef.current === edge || selectedEdgeId === edge;
          displayData.label = showLabel ? data.label : null;
        }

        return displayData;
      },
    });
    sigmaRef.current = sigma;

    let dynamicLayout: FA2LayoutSupervisor | null = null;
    let relaxationTimer: ReturnType<typeof setTimeout> | null = null;
    let fixedLayoutNode: string | null = null;
    let draggedPosition: { x: number; y: number } | null = null;

    const stopDynamicLayout = () => {
      if (relaxationTimer) clearTimeout(relaxationTimer);
      relaxationTimer = null;
      dynamicLayout?.stop();
      dynamicLayout?.kill();
      dynamicLayout = null;
      if (fixedLayoutNode && graph.hasNode(fixedLayoutNode)) {
        graph.removeNodeAttribute(fixedLayoutNode, 'fixed');
      }
      fixedLayoutNode = null;
      draggedPosition = null;
    };

    const startDynamicLayout = (node: string) => {
      if (!layoutConfig.dynamic_after_drag || layoutConfig.name !== 'forceatlas2') return;
      stopDynamicLayout();
      fixedLayoutNode = node;
      draggedPosition = {
        x: graph.getNodeAttribute(node, 'x'),
        y: graph.getNodeAttribute(node, 'y'),
      };
      graph.setNodeAttribute(node, 'fixed', true);
      dynamicLayout = new FA2LayoutSupervisor(graph, {
        settings: { ...forceAtlasSettings, slowDown: 5 },
        outputReducer: (key, attributes) => {
          if (key === fixedLayoutNode && draggedPosition) {
            return { ...attributes, ...draggedPosition };
          }
          return attributes;
        },
      });
      dynamicLayout.start();
    };

    const finishDragging = () => {
      isDraggingRef.current = false;
      draggedNodeRef.current = null;
      document.body.style.cursor = 'default';
      if (dynamicLayout) {
        relaxationTimer = setTimeout(
          stopDynamicLayout,
          layoutConfig.drag_relaxation_ms,
        );
      }
      sigma.refresh();
    };

    sigma.on('downNode', ({ node }) => {
      isDraggingRef.current = true;
      draggedNodeRef.current = node;
      document.body.style.cursor = 'grabbing';
      startDynamicLayout(node);
      sigma.refresh();
    });

    sigma.getMouseCaptor().on('mousemovebody', (event) => {
      if (!isDraggingRef.current || !draggedNodeRef.current) return;

      const position = sigma.viewportToGraph(event);
      draggedPosition = position;
      graph.setNodeAttribute(draggedNodeRef.current, 'x', position.x);
      graph.setNodeAttribute(draggedNodeRef.current, 'y', position.y);

      event.preventSigmaDefault();
      event.original.preventDefault();
      event.original.stopPropagation();
    });

    sigma.getMouseCaptor().on('mouseup', finishDragging);

    sigma.getTouchCaptor().on('touchmove', (event) => {
      if (!isDraggingRef.current || !draggedNodeRef.current) return;

      const position = sigma.viewportToGraph(event.touches[0]);
      draggedPosition = position;
      graph.setNodeAttribute(draggedNodeRef.current, 'x', position.x);
      graph.setNodeAttribute(draggedNodeRef.current, 'y', position.y);

      event.preventSigmaDefault();
      event.original.preventDefault();
      event.original.stopPropagation();
    });
    sigma.getTouchCaptor().on('touchup', finishDragging);

    sigma.on('clickNode', ({ node }) => {
      if (isDraggingRef.current) return;

      const attributes = graph.getNodeAttributes(node);
      selectedNodeIdRef.current = node;
      selectedNodeNeighborsRef.current = new Set(graph.neighbors(node));
      selectedEdgeIdRef.current = null;
      selectedEdgeNodesRef.current = new Set();

      setSelectedEdge(null);
      setSelectedNode({
        id: node,
        labels: attributes.labels || [],
        color: attributes.baseColor ?? attributes.color,
        properties: attributes.properties || {},
      });
      sigma.refresh();
    });

    sigma.on('clickEdge', ({ edge }) => {
      const attributes = graph.getEdgeAttributes(edge);
      const [source, target] = graph.extremities(edge);

      selectedNodeIdRef.current = null;
      selectedNodeNeighborsRef.current = new Set();
      selectedEdgeIdRef.current = edge;
      selectedEdgeNodesRef.current = new Set([source, target]);

      setSelectedNode(null);
      setSelectedEdge({
        id: edge,
        source: graph.getNodeAttribute(source, 'label'),
        target: graph.getNodeAttribute(target, 'label'),
        relType: attributes.relType || 'UNKNOWN',
        color: theme.selected,
        properties: attributes.properties || {},
      });
      sigma.refresh();
    });

    sigma.on('clickStage', () => {
      selectedNodeIdRef.current = null;
      selectedNodeNeighborsRef.current = new Set();
      selectedEdgeIdRef.current = null;
      selectedEdgeNodesRef.current = new Set();
      setSelectedNode(null);
      setSelectedEdge(null);
      sigma.refresh();
    });

    sigma.on('enterNode', ({ node }) => {
      hoveredNodeRef.current = node;
      if (!isDraggingRef.current) document.body.style.cursor = 'grab';
      sigma.refresh();
    });

    sigma.on('leaveNode', () => {
      hoveredNodeRef.current = null;
      if (!isDraggingRef.current) document.body.style.cursor = 'default';
      sigma.refresh();
    });

    sigma.on('enterEdge', ({ edge }) => {
      hoveredEdgeRef.current = edge;
      document.body.style.cursor = 'pointer';
      sigma.refresh();
    });

    sigma.on('leaveEdge', () => {
      hoveredEdgeRef.current = null;
      document.body.style.cursor = 'default';
      sigma.refresh();
    });

    return () => {
      stopDynamicLayout();
      sigma.kill();
      sigmaRef.current = null;
      graphRef.current = null;
      document.body.style.cursor = 'default';
    };
  }, [stableGraphData, stableConfig, themeName]);

  if (!graphData) {
    return (
      <div className="graph-container" data-theme={themeName}>
        <div className="no-data-message">
          <h3>No Graph Data</h3>
          <p>Please provide graph data to visualize.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="graph-container" data-theme={themeName}>
      <div className="content-wrapper">
        <div
          ref={containerRef}
          className="sigma-container"
          style={{ width: '100%', height: `${componentHeight}px` }}
        />

        {displayConfig.show_legend && (
          <LegendPanel
            nodeTypes={nodeTypes}
            relationshipTypes={relationshipTypes}
            graphOrder={graphRef.current?.order || 0}
            graphSize={graphRef.current?.size || 0}
            initiallyCollapsed={displayConfig.legend_collapsed}
          />
        )}

        {selectedNode && displayConfig.properties_panel !== 'hidden' && (
          <PropertiesPanel
            selectedNode={selectedNode}
            onClose={clearSelectedNode}
            mode={displayConfig.properties_panel}
          />
        )}

        {selectedEdge && displayConfig.properties_panel !== 'hidden' && (
          <RelationshipPropertiesPanel
            selectedEdge={selectedEdge}
            onClose={clearSelectedEdge}
            mode={displayConfig.properties_panel}
          />
        )}
      </div>
    </div>
  );
};

export default InteractiveGraph;
