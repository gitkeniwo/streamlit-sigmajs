import { useEffect, useMemo, useRef, useState } from 'react';
import Graph from 'graphology';
import forceLayout from 'graphology-layout-force';
import FA2LayoutSupervisor from 'graphology-layout-forceatlas2/worker';
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
import { applyInitialLayout } from '../utils/layoutUtils';

import './InteractiveGraph.css';

interface InteractiveGraphProps {
  args: StreamlitComponentArgs;
}

const DEFAULT_CONFIG: GraphConfig = {
  display: {
    node_labels: 'auto',
    edge_labels: 'hover',
    node_label_size: 12,
    node_size: 10,
    node_size_mode: 'auto',
    edge_label_size: 9,
    label_density: 0.8,
    label_rendered_size_threshold: 6,
    label_font_family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    label_font_url: null,
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
    dynamic_after_drag: true,
    drag_solver: 'force',
    drag_relaxation_ms: 1000,
    hierarchy_direction: 'TB',
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

const getStableGraphBounds = (graph: Graph) => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  graph.forEachNode((_node, attributes) => {
    minX = Math.min(minX, attributes.x);
    maxX = Math.max(maxX, attributes.x);
    minY = Math.min(minY, attributes.y);
    maxY = Math.max(maxY, attributes.y);
  });
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { x: [-1, 1] as [number, number], y: [-1, 1] as [number, number] };
  }
  const xPadding = Math.max((maxX - minX) * 0.08, 0.5);
  const yPadding = Math.max((maxY - minY) * 0.08, 0.5);
  return {
    x: [minX - xPadding, maxX + xPadding] as [number, number],
    y: [minY - yPadding, maxY + yPadding] as [number, number],
  };
};

const getAdaptiveNodeSize = (
  width: number,
  height: number,
  nodeCount: number,
  configuredSize: number,
) => {
  if (nodeCount <= 0) return configuredSize;
  const availableArea = Math.max(width * height, 1);
  const densityScale = Math.sqrt(availableArea / (nodeCount * 8000));
  return Math.max(Math.min(configuredSize, configuredSize * densityScale), 3);
};

const InteractiveGraph: React.FC<InteractiveGraphProps> = ({ args }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const adaptiveNodeSizeRef = useRef(10);

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

  useEffect(() => {
    const fontUrl = displayConfig.label_font_url?.trim();
    if (!fontUrl) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontUrl;
    link.dataset.sigmaFont = 'true';
    link.onload = () => {
      document.fonts?.ready.then(refresh);
    };
    document.head.appendChild(link);

    return () => link.remove();
  }, [displayConfig.label_font_url, displayConfig.label_font_family]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      sigmaRef.current?.resize(true).refresh();
    });
    return () => cancelAnimationFrame(frame);
  }, [componentHeight]);

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
      displayConfig.node_size,
    );
    graphRef.current = graph;
    const renderedBackground = getComputedStyle(containerRef.current).backgroundColor;

    const forceAtlasSettings = {
      gravity: layoutConfig.gravity,
      scalingRatio: layoutConfig.scaling_ratio,
      linLogMode: layoutConfig.lin_log_mode,
      strongGravityMode: layoutConfig.strong_gravity_mode,
    };

    applyInitialLayout(graph, layoutConfig, forceAtlasSettings);

    const updateAdaptiveNodeSize = () => {
      const container = containerRef.current;
      if (!container || displayConfig.node_size_mode === 'fixed') {
        adaptiveNodeSizeRef.current = displayConfig.node_size;
        return;
      }
      adaptiveNodeSizeRef.current = getAdaptiveNodeSize(
        container.clientWidth,
        container.clientHeight,
        graph.order,
        displayConfig.node_size,
      );
    };
    updateAdaptiveNodeSize();

    const sigma = new Sigma(graph, containerRef.current, {
      nodeProgramClasses: { border: NodeBorderProgram },
      defaultEdgeColor: theme.edge,
      defaultNodeColor: theme.node,
      labelColor: { color: theme.text },
      labelFont: displayConfig.label_font_family,
      labelSize: displayConfig.node_label_size,
      labelWeight: '500',
      edgeLabelFont: displayConfig.label_font_family,
      edgeLabelSize: displayConfig.edge_label_size,
      labelDensity: displayConfig.label_density,
      labelRenderedSizeThreshold: displayConfig.label_rendered_size_threshold,
      renderLabels: displayConfig.node_labels !== 'hidden',
      renderEdgeLabels: displayConfig.edge_labels !== 'hidden',
      hideEdgesOnMove: displayConfig.hide_edges_on_move,
      enableEdgeEvents: true,
      nodeReducer: (node, data) => {
        const baseSize = data.hasExplicitSize
          ? (data.baseSize ?? data.size)
          : adaptiveNodeSizeRef.current;
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
            displayData.size = baseSize * 1.1;
            displayData.color = mixColors(baseColor, theme.background, 0.08);
            displayData.borderColor = mixColors(baseColor, theme.text, 0.42);
            displayData.highlighted = true;
            displayData.forceLabel = true;
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
            displayData.size = baseSize * 1.06;
            displayData.borderColor = mixColors(baseColor, theme.text, 0.3);
            displayData.forceLabel = true;
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
          displayData.borderColor = mixColors(baseColor, theme.text, 0.3);
          displayData.forceLabel = true;
        }

        if (draggedNodeRef.current === node) {
          displayData.size = baseSize * 1.08;
          displayData.borderColor = mixColors(baseColor, theme.text, 0.38);
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
    const stableGraphBounds = getStableGraphBounds(graph);
    sigma.setCustomBBox(stableGraphBounds);
    sigma.refresh();
    sigmaRef.current = sigma;

    const resizeObserver = new ResizeObserver(() => {
      updateAdaptiveNodeSize();
      sigma.resize(true).refresh();
    });
    resizeObserver.observe(containerRef.current);

    let dynamicLayout: FA2LayoutSupervisor | null = null;
    let relaxationTimer: ReturnType<typeof setTimeout> | null = null;
    let forceFrame: number | null = null;
    let fixedLayoutNode: string | null = null;
    let draggedPosition: { x: number; y: number } | null = null;
    let dragMoved = false;
    let suppressNodeClickUntil = 0;

    const stopDynamicLayout = () => {
      if (relaxationTimer) clearTimeout(relaxationTimer);
      relaxationTimer = null;
      if (forceFrame !== null) cancelAnimationFrame(forceFrame);
      forceFrame = null;
      dynamicLayout?.stop();
      dynamicLayout?.kill();
      dynamicLayout = null;
      if (fixedLayoutNode && graph.hasNode(fixedLayoutNode)) {
        graph.removeNodeAttribute(fixedLayoutNode, 'fixed');
      }
      fixedLayoutNode = null;
      draggedPosition = null;
    };

    const startPostDragLayout = (
      node: string,
      position: { x: number; y: number },
    ) => {
      if (!layoutConfig.dynamic_after_drag || layoutConfig.drag_relaxation_ms === 0) return false;
      stopDynamicLayout();
      fixedLayoutNode = node;
      draggedPosition = position;
      graph.setNodeAttribute(node, 'fixed', true);

      if (layoutConfig.drag_solver === 'force') {
        const graphSpan = Math.max(
          stableGraphBounds.x[1] - stableGraphBounds.x[0],
          stableGraphBounds.y[1] - stableGraphBounds.y[0],
          1,
        );
        const runForceFrame = () => {
          if (!fixedLayoutNode || !draggedPosition) return;
          forceLayout.assign(graph, {
            maxIterations: 1,
            isNodeFixed: (key) => key === fixedLayoutNode,
            settings: {
              attraction: 0.00008,
              repulsion: 0.04,
              gravity: 0.00001,
              inertia: 0,
              maxMove: graphSpan * 0.0015,
            },
          });
          graph.mergeNodeAttributes(fixedLayoutNode, draggedPosition);
          sigma.refresh();
          forceFrame = requestAnimationFrame(runForceFrame);
        };
        runForceFrame();
      } else {
        dynamicLayout = new FA2LayoutSupervisor(graph, {
          settings: { ...forceAtlasSettings, slowDown: 8 },
          outputReducer: (key, attributes) => {
            if (key === fixedLayoutNode && draggedPosition) {
              return { ...attributes, ...draggedPosition };
            }
            return attributes;
          },
        });
        dynamicLayout.start();
      }
      relaxationTimer = setTimeout(() => {
        stopDynamicLayout();
        sigma.refresh();
      }, layoutConfig.drag_relaxation_ms);
      return true;
    };

    const finishDragging = () => {
      const draggedNode = draggedNodeRef.current;
      const finalPosition = draggedNode && graph.hasNode(draggedNode)
        ? {
            x: graph.getNodeAttribute(draggedNode, 'x'),
            y: graph.getNodeAttribute(draggedNode, 'y'),
          }
        : null;
      isDraggingRef.current = false;
      draggedNodeRef.current = null;
      document.body.style.cursor = 'default';
      sigma.setSetting('enableCameraPanning', true);
      if (dragMoved && draggedNode && finalPosition) {
        suppressNodeClickUntil = Date.now() + 150;
        startPostDragLayout(draggedNode, finalPosition);
      }
      dragMoved = false;
      sigma.refresh();
    };

    sigma.on('downNode', ({ node }) => {
      stopDynamicLayout();
      sigma.setSetting('enableCameraPanning', false);
      isDraggingRef.current = true;
      draggedNodeRef.current = node;
      dragMoved = false;
      document.body.style.cursor = 'grabbing';
      sigma.refresh();
    });

    sigma.getMouseCaptor().on('mousemovebody', (event) => {
      if (!isDraggingRef.current || !draggedNodeRef.current) return;

      const position = sigma.viewportToGraph(event);
      dragMoved = true;
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
      dragMoved = true;
      draggedPosition = position;
      graph.setNodeAttribute(draggedNodeRef.current, 'x', position.x);
      graph.setNodeAttribute(draggedNodeRef.current, 'y', position.y);

      event.preventSigmaDefault();
      event.original.preventDefault();
      event.original.stopPropagation();
    });
    sigma.getTouchCaptor().on('touchup', finishDragging);

    sigma.on('clickNode', ({ node }) => {
      if (isDraggingRef.current || Date.now() < suppressNodeClickUntil) return;

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
      resizeObserver.disconnect();
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
    <div
      className="graph-container"
      data-theme={themeName}
      style={{ fontFamily: displayConfig.label_font_family }}
    >
      <div className="content-wrapper" style={{ height: `${componentHeight}px` }}>
        <div
          ref={containerRef}
          className="sigma-container"
          style={{ width: '100%', height: '100%' }}
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
