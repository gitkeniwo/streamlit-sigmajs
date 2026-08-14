import { useEffect, useMemo, useRef, useState } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import { NodeBorderProgram } from '@sigma/node-border';

import LegendPanel, { NodeType, RelationshipType } from './LegendPanel';
import PropertiesPanel, { NodeInfo } from './PropertiesPanel';
import RelationshipPropertiesPanel, { EdgeInfo } from './RelationshipPropertiesPanel';
import { GraphConfig, StreamlitComponentArgs } from '../utils/types';
import {
  convertPropertyGraphToGraph,
  deterministicPosition,
  extractUniqueNodeColorCategories,
  getNodeColorCategory,
} from '../utils/graphDataUtils';
import { createLabelColorMap, mixColors } from '../utils/colorUtils';
import { getThemeTokens, GraphThemeTokens } from '../utils/theme';
import { applyInitialLayout } from '../utils/layoutUtils';
import { createDragPhysics } from '../utils/dragPhysics';

import './InteractiveGraph.css';

interface InteractiveGraphProps {
  args: StreamlitComponentArgs;
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  onSelectionChange?: (nodeIds: string[], edgeIds: string[]) => void;
}

const DEFAULT_CONFIG: GraphConfig = {
  display: {
    node_labels: 'auto',
    edge_labels: 'hover',
    node_label_size: 12,
    node_size: 10,
    node_size_field: null,
    node_color_field: null,
    node_label_field: 'name',
    node_size_mode: 'auto',
    edge_label_size: 9,
    label_density: 0.8,
    label_rendered_size_threshold: 6,
    label_font_family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    label_font_url: null,
    show_legend: true,
    legend_collapsed: true,
    show_fullscreen_button: true,
    properties_panel: 'compact',
    selection_dimming: 0.68,
    hide_edges_on_move: false,
  },
  layout: {
    name: 'forceatlas2',
    node_x_field: null,
    node_y_field: null,
    iterations: 100,
    gravity: 1,
    scaling_ratio: 10,
    lin_log_mode: false,
    strong_gravity_mode: false,
    dynamic_after_drag: true,
    drag_relaxation_ms: 1000,
    hierarchy_direction: 'TB',
  },
};

// Sigma fits node coordinates but renders labels beyond them; reserve room at canvas edges.
const GRAPH_BOUNDS_PADDING_RATIO = 0.25;

export const getStableGraphBounds = (graph: Graph) => {
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
  const xPadding = Math.max((maxX - minX) * GRAPH_BOUNDS_PADDING_RATIO, 0.5);
  const yPadding = Math.max((maxY - minY) * GRAPH_BOUNDS_PADDING_RATIO, 0.5);
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

const InteractiveGraph: React.FC<InteractiveGraphProps> = ({
  args,
  onNodeClick,
  onEdgeClick,
  onSelectionChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const adaptiveNodeSizeRef = useRef(10);
  const updateAdaptiveNodeSizeRef = useRef<() => void>(() => undefined);
  const stopDynamicLayoutRef = useRef<() => void>(() => undefined);

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
  const [isExpanded, setIsExpanded] = useState(false);

  const graphData = args.graphData;
  const componentHeight = args.height || 600;
  const themeName = args.theme || 'streamlit';
  const config = args.config || DEFAULT_CONFIG;
  const displayConfig = config.display;
  const layoutConfig = config.layout;
  const [theme, setTheme] = useState<GraphThemeTokens>(() => getThemeTokens(themeName));

  const displayConfigRef = useRef(displayConfig);
  const layoutConfigRef = useRef(layoutConfig);
  const themeRef = useRef(theme);
  const renderedBackgroundRef = useRef(theme.background);
  const callbacksRef = useRef({ onNodeClick, onEdgeClick, onSelectionChange });
  displayConfigRef.current = displayConfig;
  layoutConfigRef.current = layoutConfig;
  themeRef.current = theme;
  callbacksRef.current = { onNodeClick, onEdgeClick, onSelectionChange };

  const stableGraphData = useMemo(
    () => (graphData ? JSON.stringify(graphData) : null),
    [graphData],
  );
  const stableRendererConfig = useMemo(() => JSON.stringify({
    node_labels: displayConfig.node_labels,
    edge_labels: displayConfig.edge_labels,
    node_label_size: displayConfig.node_label_size,
    node_size: displayConfig.node_size,
    node_size_mode: displayConfig.node_size_mode,
    edge_label_size: displayConfig.edge_label_size,
    label_density: displayConfig.label_density,
    label_rendered_size_threshold: displayConfig.label_rendered_size_threshold,
    label_font_family: displayConfig.label_font_family,
    selection_dimming: displayConfig.selection_dimming,
    hide_edges_on_move: displayConfig.hide_edges_on_move,
  }), [
    displayConfig.node_labels,
    displayConfig.edge_labels,
    displayConfig.node_label_size,
    displayConfig.node_size,
    displayConfig.node_size_mode,
    displayConfig.edge_label_size,
    displayConfig.label_density,
    displayConfig.label_rendered_size_threshold,
    displayConfig.label_font_family,
    displayConfig.selection_dimming,
    displayConfig.hide_edges_on_move,
  ]);
  const stableInitialLayoutConfig = useMemo(() => JSON.stringify({
    name: layoutConfig.name,
    node_x_field: layoutConfig.node_x_field,
    node_y_field: layoutConfig.node_y_field,
    iterations: layoutConfig.iterations,
    gravity: layoutConfig.gravity,
    scaling_ratio: layoutConfig.scaling_ratio,
    lin_log_mode: layoutConfig.lin_log_mode,
    strong_gravity_mode: layoutConfig.strong_gravity_mode,
    hierarchy_direction: layoutConfig.hierarchy_direction,
  }), [
    layoutConfig.name,
    layoutConfig.node_x_field,
    layoutConfig.node_y_field,
    layoutConfig.iterations,
    layoutConfig.gravity,
    layoutConfig.scaling_ratio,
    layoutConfig.lin_log_mode,
    layoutConfig.strong_gravity_mode,
    layoutConfig.hierarchy_direction,
  ]);
  const stableLayoutKey = `${stableGraphData ?? ''}\u0000${stableInitialLayoutConfig}`;
  const [readyLayoutKey, setReadyLayoutKey] = useState<string | null>(null);
  const stableTheme = useMemo(() => JSON.stringify(theme), [theme]);

  const refreshVisual = () => sigmaRef.current?.refresh({ skipIndexation: true });

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let frame: number | null = null;
    let lastTokens = '';

    const resolveTheme = () => {
      frame = null;
      const tokens = getThemeTokens(themeName, container);
      const serialized = JSON.stringify(tokens);
      if (serialized !== lastTokens) {
        lastTokens = serialized;
        setTheme(tokens);
      }
    };
    const scheduleResolve = () => {
      if (frame === null) frame = requestAnimationFrame(resolveTheme);
    };

    resolveTheme();
    const observer = new MutationObserver(scheduleResolve);
    let ancestor: Element | null = container;
    while (ancestor) {
      observer.observe(ancestor, {
        attributes: true,
        attributeFilter: ['class', 'style', 'data-theme'],
      });
      if (ancestor.parentElement) {
        ancestor = ancestor.parentElement;
      } else {
        const root = ancestor.getRootNode();
        ancestor = root instanceof ShadowRoot ? root.host : null;
      }
    }
    observer.observe(document.head, { childList: true });
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
    colorScheme.addEventListener?.('change', scheduleResolve);

    return () => {
      observer.disconnect();
      colorScheme.removeEventListener?.('change', scheduleResolve);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [themeName, stableGraphData]);

  useEffect(() => {
    const fontUrl = displayConfig.label_font_url?.trim();
    if (!fontUrl) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontUrl;
    link.dataset.sigmaFont = 'true';
    link.onload = () => document.fonts?.ready.then(refreshVisual);
    document.head.appendChild(link);
    return () => link.remove();
  }, [displayConfig.label_font_url, displayConfig.label_font_family]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const sigma = sigmaRef.current;
      if (!sigma) return;
      sigma.resize(true);
      sigma.getCamera().animatedReset({ duration: 250 });
      sigma.refresh();
    });
    return () => cancelAnimationFrame(frame);
  }, [componentHeight, isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;
    const previousBodyOverflow = document.body.style.overflow;
    const collapseOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsExpanded(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', collapseOnEscape);
    return () => {
      window.removeEventListener('keydown', collapseOnEscape);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isExpanded]);

  const toggleExpanded = () => setIsExpanded((expanded) => !expanded);

  const clearSelectedNode = () => {
    selectedNodeIdRef.current = null;
    selectedNodeNeighborsRef.current = new Set();
    setSelectedNode(null);
    callbacksRef.current.onSelectionChange?.([], []);
    refreshVisual();
  };

  const clearSelectedEdge = () => {
    selectedEdgeIdRef.current = null;
    selectedEdgeNodesRef.current = new Set();
    setSelectedEdge(null);
    callbacksRef.current.onSelectionChange?.([], []);
    refreshVisual();
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

    const categories = extractUniqueNodeColorCategories(
      graphData,
      displayConfigRef.current.node_color_field,
    );
    const colorMap = createLabelColorMap(categories, themeRef.current.palette);
    const graph = convertPropertyGraphToGraph(
      graphData,
      colorMap,
      themeRef.current.node,
      themeRef.current.edge,
      displayConfigRef.current.node_size,
      {
        nodeSizeField: displayConfigRef.current.node_size_field,
        nodeColorField: displayConfigRef.current.node_color_field,
        nodeLabelField: displayConfigRef.current.node_label_field,
        nodeXField: layoutConfigRef.current.node_x_field,
        nodeYField: layoutConfigRef.current.node_y_field,
      },
    );
    graphRef.current = graph;

    const sigma = new Sigma(graph, containerRef.current, {
      nodeProgramClasses: { border: NodeBorderProgram },
      enableEdgeEvents: true,
      nodeReducer: (node, data) => {
        const activeDisplay = displayConfigRef.current;
        const activeTheme = themeRef.current;
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
        const background = renderedBackgroundRef.current || activeTheme.background;
        const selectedNodeId = selectedNodeIdRef.current;

        if (selectedNodeId) {
          if (node === selectedNodeId) {
            displayData.size = baseSize * 1.1;
            displayData.color = mixColors(baseColor, activeTheme.background, 0.08);
            displayData.borderColor = mixColors(baseColor, activeTheme.text, 0.42);
            displayData.highlighted = true;
            displayData.forceLabel = true;
          } else if (!selectedNodeNeighborsRef.current.has(node)) {
            displayData.color = mixColors(baseColor, background, activeDisplay.selection_dimming);
            displayData.borderColor = mixColors(
              baseColor,
              background,
              activeDisplay.selection_dimming * 0.42,
            );
          }
        }

        if (selectedEdgeIdRef.current) {
          if (selectedEdgeNodesRef.current.has(node)) {
            displayData.size = baseSize * 1.06;
            displayData.borderColor = mixColors(baseColor, activeTheme.text, 0.3);
            displayData.forceLabel = true;
          } else {
            displayData.color = mixColors(baseColor, background, activeDisplay.selection_dimming);
            displayData.borderColor = mixColors(
              baseColor,
              background,
              activeDisplay.selection_dimming * 0.42,
            );
          }
        }

        if (hoveredNodeRef.current === node) {
          displayData.size = baseSize * 1.08;
          displayData.borderColor = mixColors(baseColor, activeTheme.text, 0.3);
          displayData.forceLabel = true;
        }
        if (draggedNodeRef.current === node) {
          displayData.size = baseSize * 1.08;
          displayData.borderColor = mixColors(baseColor, activeTheme.text, 0.38);
        }

        if (activeDisplay.node_labels === 'hidden') {
          displayData.label = null;
        } else if (activeDisplay.node_labels === 'hover') {
          const showLabel = hoveredNodeRef.current === node
            || selectedNodeId === node
            || selectedEdgeNodesRef.current.has(node);
          displayData.label = showLabel ? data.label : null;
        }
        return displayData;
      },
      edgeReducer: (edge, data) => {
        const activeDisplay = displayConfigRef.current;
        const activeTheme = themeRef.current;
        const baseSize = data.baseSize ?? data.size;
        const baseColor = data.baseColor ?? data.color;
        const displayData: Record<string, any> = { ...data, size: baseSize, color: baseColor };
        const selectedNodeId = selectedNodeIdRef.current;

        if (selectedNodeId) {
          const [source, target] = graph.extremities(edge);
          if (source === selectedNodeId || target === selectedNodeId) {
            displayData.color = graph.getNodeAttribute(selectedNodeId, 'baseColor');
            displayData.size = baseSize * 1.5;
          } else {
            displayData.color = activeTheme.edgeMuted;
            displayData.size = baseSize * 0.72;
          }
        }
        const selectedEdgeId = selectedEdgeIdRef.current;
        if (selectedEdgeId) {
          if (selectedEdgeId === edge) {
            displayData.color = activeTheme.selected;
            displayData.size = baseSize * 1.8;
          } else {
            displayData.color = activeTheme.edgeMuted;
            displayData.size = baseSize * 0.72;
          }
        }
        if (hoveredEdgeRef.current === edge) displayData.size *= 1.2;

        if (activeDisplay.edge_labels === 'hidden') {
          displayData.label = null;
        } else if (activeDisplay.edge_labels === 'hover') {
          displayData.label = hoveredEdgeRef.current === edge || selectedEdgeId === edge
            ? data.label
            : null;
        }
        return displayData;
      },
    });
    sigmaRef.current = sigma;

    const updateAdaptiveNodeSize = () => {
      const container = containerRef.current;
      const activeDisplay = displayConfigRef.current;
      if (!container || activeDisplay.node_size_mode === 'fixed') {
        adaptiveNodeSizeRef.current = activeDisplay.node_size;
        return;
      }
      adaptiveNodeSizeRef.current = getAdaptiveNodeSize(
        container.clientWidth,
        container.clientHeight,
        graph.order,
        activeDisplay.node_size,
      );
    };
    updateAdaptiveNodeSizeRef.current = updateAdaptiveNodeSize;
    updateAdaptiveNodeSize();

    const relTypeCount = new Map<string, number>();
    graph.forEachEdge((_edge, attributes) => {
      const relType = String(attributes.relType || 'UNKNOWN');
      relTypeCount.set(relType, (relTypeCount.get(relType) || 0) + 1);
    });
    setRelationshipTypes(
      Array.from(relTypeCount).sort(([left], [right]) => left.localeCompare(right)).map(
        ([type, count]) => ({ type, count }),
      ),
    );

    const resizeObserver = new ResizeObserver(() => {
      updateAdaptiveNodeSize();
      sigma.resize(true).refresh();
    });
    resizeObserver.observe(containerRef.current);

    const dragPhysics = createDragPhysics(graph, {
      onUpdate: (movedNodes) => {
        sigma.refresh({ partialGraph: { nodes: movedNodes } });
      },
    });
    let dragMoved = false;
    let suppressNodeClickUntil = 0;

    const stopDynamicLayout = () => {
      dragPhysics.stop();
    };
    stopDynamicLayoutRef.current = stopDynamicLayout;

    const finishDragging = () => {
      if (!isDraggingRef.current) return;
      const draggedNode = draggedNodeRef.current;
      isDraggingRef.current = false;
      draggedNodeRef.current = null;
      document.body.style.cursor = 'default';
      sigma.setSetting('enableCameraPanning', true);
      if (dragMoved && draggedNode) {
        suppressNodeClickUntil = Date.now() + 150;
        const activeLayout = layoutConfigRef.current;
        if (
          activeLayout.dynamic_after_drag
          && activeLayout.drag_relaxation_ms > 0
        ) {
          dragPhysics.release(activeLayout.drag_relaxation_ms);
        } else {
          dragPhysics.stop();
        }
      }
      dragMoved = false;
      if (draggedNode && graph.hasNode(draggedNode)) {
        sigma.refresh({
          partialGraph: { nodes: [draggedNode] },
          skipIndexation: true,
        });
      }
    };

    sigma.on('downNode', ({ node }) => {
      stopDynamicLayout();
      sigma.setSetting('enableCameraPanning', false);
      isDraggingRef.current = true;
      draggedNodeRef.current = node;
      dragMoved = false;
      document.body.style.cursor = 'grabbing';
      sigma.refresh({ skipIndexation: true });
    });
    sigma.getMouseCaptor().on('mousemovebody', (event) => {
      if (!isDraggingRef.current || !draggedNodeRef.current) return;
      const position = sigma.viewportToGraph(event);
      dragMoved = true;
      const activeLayout = layoutConfigRef.current;
      if (
        activeLayout.dynamic_after_drag
        && activeLayout.drag_relaxation_ms > 0
      ) {
        if (!dragPhysics.isActive()) dragPhysics.begin(draggedNodeRef.current);
        dragPhysics.dragTo(position.x, position.y);
      } else {
        if (dragPhysics.isActive()) dragPhysics.stop();
        graph.mergeNodeAttributes(draggedNodeRef.current, position);
      }
      event.preventSigmaDefault();
      event.original.preventDefault();
      event.original.stopPropagation();
    });
    sigma.getMouseCaptor().on('mouseup', finishDragging);
    sigma.getTouchCaptor().on('touchmove', (event) => {
      if (!isDraggingRef.current || !draggedNodeRef.current) return;
      const position = sigma.viewportToGraph(event.touches[0]);
      dragMoved = true;
      const activeLayout = layoutConfigRef.current;
      if (
        activeLayout.dynamic_after_drag
        && activeLayout.drag_relaxation_ms > 0
      ) {
        if (!dragPhysics.isActive()) dragPhysics.begin(draggedNodeRef.current);
        dragPhysics.dragTo(position.x, position.y);
      } else {
        if (dragPhysics.isActive()) dragPhysics.stop();
        graph.mergeNodeAttributes(draggedNodeRef.current, position);
      }
      event.preventSigmaDefault();
      event.original.preventDefault();
      event.original.stopPropagation();
    });
    sigma.getTouchCaptor().on('touchup', finishDragging);
    window.addEventListener('mouseup', finishDragging);
    window.addEventListener('pointercancel', finishDragging);
    window.addEventListener('touchend', finishDragging);

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
      callbacksRef.current.onNodeClick?.(node);
      callbacksRef.current.onSelectionChange?.([node], []);
      sigma.refresh({ skipIndexation: true });
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
        color: themeRef.current.selected,
        properties: attributes.properties || {},
      });
      callbacksRef.current.onEdgeClick?.(edge);
      callbacksRef.current.onSelectionChange?.([], [edge]);
      sigma.refresh({ skipIndexation: true });
    });
    sigma.on('clickStage', () => {
      selectedNodeIdRef.current = null;
      selectedNodeNeighborsRef.current = new Set();
      selectedEdgeIdRef.current = null;
      selectedEdgeNodesRef.current = new Set();
      setSelectedNode(null);
      setSelectedEdge(null);
      callbacksRef.current.onSelectionChange?.([], []);
      sigma.refresh({ skipIndexation: true });
    });
    sigma.on('enterNode', ({ node }) => {
      hoveredNodeRef.current = node;
      if (!isDraggingRef.current) document.body.style.cursor = 'grab';
      sigma.refresh({ skipIndexation: true });
    });
    sigma.on('leaveNode', () => {
      hoveredNodeRef.current = null;
      if (!isDraggingRef.current) document.body.style.cursor = 'default';
      sigma.refresh({ skipIndexation: true });
    });
    sigma.on('enterEdge', ({ edge }) => {
      hoveredEdgeRef.current = edge;
      document.body.style.cursor = 'pointer';
      sigma.refresh({ skipIndexation: true });
    });
    sigma.on('leaveEdge', () => {
      hoveredEdgeRef.current = null;
      document.body.style.cursor = 'default';
      sigma.refresh({ skipIndexation: true });
    });

    return () => {
      window.removeEventListener('mouseup', finishDragging);
      window.removeEventListener('pointercancel', finishDragging);
      window.removeEventListener('touchend', finishDragging);
      resizeObserver.disconnect();
      stopDynamicLayout();
      sigma.kill();
      if (sigmaRef.current === sigma) sigmaRef.current = null;
      if (graphRef.current === graph) graphRef.current = null;
      document.body.style.cursor = 'default';
    };
  }, [stableGraphData]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.forEachNode((node, attributes) => {
      const configuredSize = displayConfig.node_size_field
        ? Number(attributes.properties?.[displayConfig.node_size_field])
        : Number.NaN;
      const hasExplicitSize = Number.isFinite(configuredSize) && configuredSize > 0;
      graph.mergeNodeAttributes(node, {
        size: hasExplicitSize ? configuredSize : displayConfig.node_size,
        baseSize: hasExplicitSize ? configuredSize : displayConfig.node_size,
        hasExplicitSize,
      });
    });
    updateAdaptiveNodeSizeRef.current();
    sigmaRef.current?.refresh();
  }, [stableGraphData, displayConfig.node_size_field]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !graphData) return;
    graphData.nodes.forEach((node) => {
      if (!graph.hasNode(node.id)) return;
      const mappedLabel = displayConfig.node_label_field
        ? node.properties[displayConfig.node_label_field]
        : null;
      graph.setNodeAttribute(
        node.id,
        'label',
        mappedLabel === null || mappedLabel === undefined || mappedLabel === ''
          ? node.id
          : String(mappedLabel),
      );
    });
    sigmaRef.current?.refresh({ skipIndexation: true });
  }, [stableGraphData, displayConfig.node_label_field]);

  useEffect(() => {
    const graph = graphRef.current;
    const sigma = sigmaRef.current;
    if (!graph || !sigma) return;
    stopDynamicLayoutRef.current();
    let cancelled = false;
    const forceAtlasSettings = {
      gravity: layoutConfig.gravity,
      scalingRatio: layoutConfig.scaling_ratio,
      linLogMode: layoutConfig.lin_log_mode,
      strongGravityMode: layoutConfig.strong_gravity_mode,
    };
    graphData?.nodes.forEach((node) => {
      if (!graph.hasNode(node.id)) return;
      const fallback = deterministicPosition(node.id);
      const x = layoutConfig.node_x_field
        ? Number(node.properties[layoutConfig.node_x_field])
        : Number.NaN;
      const y = layoutConfig.node_y_field
        ? Number(node.properties[layoutConfig.node_y_field])
        : Number.NaN;
      graph.mergeNodeAttributes(node.id, {
        initialX: Number.isFinite(x) ? x : fallback.x,
        initialY: Number.isFinite(y) ? y : fallback.y,
      });
    });
    void applyInitialLayout(graph, layoutConfig, forceAtlasSettings)
      .catch((error: unknown) => {
        if (!cancelled) console.error('Failed to apply initial graph layout:', error);
      })
      .then(() => {
        if (cancelled || graphRef.current !== graph || sigmaRef.current !== sigma) return;
        sigma.setCustomBBox(getStableGraphBounds(graph));
        sigma.refresh();
        setReadyLayoutKey(stableLayoutKey);
      });
    return () => {
      cancelled = true;
    };
  }, [stableGraphData, stableInitialLayoutConfig, stableLayoutKey]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !graphData) return;

    const categories = extractUniqueNodeColorCategories(graphData, displayConfig.node_color_field);
    const colorMap = createLabelColorMap(categories, theme.palette);
    graphData.nodes.forEach((nodeData) => {
      if (!graph.hasNode(nodeData.id)) return;
      const colorCategory = getNodeColorCategory(nodeData, displayConfig.node_color_field);
      const color = colorMap.get(colorCategory) || theme.node;
      graph.mergeNodeAttributes(nodeData.id, {
        color,
        colorCategory,
        baseColor: color,
        borderColor: color,
      });
    });
    graph.forEachEdge((edge) => {
      graph.mergeEdgeAttributes(edge, { color: theme.edge, baseColor: theme.edge });
    });
    setNodeTypes(categories.map((category) => ({
      type: category,
      color: colorMap.get(category) || theme.node,
      description: `${category} nodes`,
    })));

    setSelectedNode((current) => {
      if (!current || !graph.hasNode(current.id)) return current;
      return { ...current, color: graph.getNodeAttribute(current.id, 'baseColor') };
    });
    setSelectedEdge((current) => (current ? { ...current, color: theme.selected } : current));
    sigmaRef.current?.refresh({ skipIndexation: true });
  }, [stableGraphData, displayConfig.node_color_field, stableTheme]);

  useEffect(() => {
    const sigma = sigmaRef.current;
    if (!sigma) return;

    renderedBackgroundRef.current = getComputedStyle(sigma.getContainer()).backgroundColor
      || theme.background;
    updateAdaptiveNodeSizeRef.current();
    sigma.setSettings({
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
    });
    sigma.refresh({ skipIndexation: true });
  }, [stableGraphData, stableRendererConfig, stableTheme]);

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
      className={`graph-container ${isExpanded ? 'is-expanded' : ''}`}
      data-theme={themeName}
      style={{ fontFamily: displayConfig.label_font_family }}
    >
      <div
        className="content-wrapper"
        style={{ height: isExpanded ? '100%' : `${componentHeight}px` }}
      >
        <div
          ref={containerRef}
          className="sigma-container"
          style={{
            width: '100%',
            height: '100%',
            visibility: readyLayoutKey === stableLayoutKey ? 'visible' : 'hidden',
          }}
        />

        {displayConfig.show_fullscreen_button && (
          <button
            type="button"
            className="expand-toggle-button"
            onClick={toggleExpanded}
            aria-label={isExpanded ? 'Collapse graph' : 'Expand graph'}
            title={isExpanded ? 'Collapse graph' : 'Expand graph'}
            aria-pressed={isExpanded}
          >
            {isExpanded ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6" />
              </svg>
            )}
          </button>
        )}

        {displayConfig.show_legend && (
          <LegendPanel
            nodeTypes={nodeTypes}
            relationshipTypes={relationshipTypes}
            graphOrder={graphRef.current?.order || 0}
            graphSize={graphRef.current?.size || 0}
            initiallyCollapsed={displayConfig.legend_collapsed}
            nodeTypeTitle={displayConfig.node_color_field || 'Labels'}
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
