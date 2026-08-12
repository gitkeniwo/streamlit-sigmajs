import { useEffect, useMemo, useRef, useState } from 'react';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import Sigma from 'sigma';

import LegendPanel, { NodeType, RelationshipType } from './LegendPanel';
import PropertiesPanel, { NodeInfo } from './PropertiesPanel';
import RelationshipPropertiesPanel, { EdgeInfo } from './RelationshipPropertiesPanel';
import { StreamlitComponentArgs } from '../utils/types';
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

const withOpacity = (color: string, opacity: string): string => {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${opacity}` : color;
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

  const stableGraphData = useMemo(() => {
    return graphData ? JSON.stringify(graphData) : null;
  }, [graphData]);

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

    forceAtlas2.assign(graph, {
      iterations: 100,
      settings: {
        gravity: 1,
        scalingRatio: 10,
      },
    });

    const sigma = new Sigma(graph, containerRef.current, {
      defaultEdgeColor: theme.edge,
      defaultNodeColor: theme.node,
      labelColor: { color: theme.text },
      labelSize: 14,
      labelWeight: '500',
      renderEdgeLabels: true,
      enableEdgeEvents: true,
      nodeReducer: (node, data) => {
        const baseSize = data.baseSize ?? data.size;
        const baseColor = data.baseColor ?? data.color;
        const displayData = {
          ...data,
          size: baseSize,
          color: baseColor,
          highlighted: false,
        };

        const selectedNodeId = selectedNodeIdRef.current;
        if (selectedNodeId) {
          if (node === selectedNodeId) {
            displayData.size = baseSize * 1.3;
            displayData.highlighted = true;
          } else if (!selectedNodeNeighborsRef.current.has(node)) {
            displayData.color = withOpacity(baseColor, '40');
          }
        }

        if (selectedEdgeNodesRef.current.has(node)) {
          displayData.size = baseSize * 1.3;
        }

        if (hoveredNodeRef.current === node) {
          displayData.size = baseSize * (node === selectedNodeId ? 1.5 : 1.2);
        }

        if (draggedNodeRef.current === node) {
          displayData.highlighted = true;
        }

        return displayData;
      },
      edgeReducer: (edge, data) => {
        const baseSize = data.baseSize ?? data.size;
        const baseColor = data.baseColor ?? data.color;
        const displayData = {
          ...data,
          size: baseSize,
          color: baseColor,
        };

        const selectedNodeId = selectedNodeIdRef.current;
        if (selectedNodeId) {
          const [source, target] = graph.extremities(edge);
          if (source === selectedNodeId || target === selectedNodeId) {
            displayData.color = graph.getNodeAttribute(selectedNodeId, 'baseColor');
            displayData.size = 3;
          } else {
            displayData.color = theme.edgeMuted;
          }
        }

        if (selectedEdgeIdRef.current === edge) {
          displayData.color = theme.selected;
          displayData.size = 4;
        }

        if (hoveredEdgeRef.current === edge) {
          displayData.size *= 1.5;
        }

        return displayData;
      },
    });
    sigmaRef.current = sigma;

    sigma.on('downNode', ({ node }) => {
      isDraggingRef.current = true;
      draggedNodeRef.current = node;
      document.body.style.cursor = 'grabbing';
      sigma.refresh();
    });

    sigma.getMouseCaptor().on('mousemovebody', (event) => {
      if (!isDraggingRef.current || !draggedNodeRef.current) return;

      const position = sigma.viewportToGraph(event);
      graph.setNodeAttribute(draggedNodeRef.current, 'x', position.x);
      graph.setNodeAttribute(draggedNodeRef.current, 'y', position.y);

      event.preventSigmaDefault();
      event.original.preventDefault();
      event.original.stopPropagation();
    });

    sigma.getMouseCaptor().on('mouseup', () => {
      isDraggingRef.current = false;
      draggedNodeRef.current = null;
      document.body.style.cursor = 'default';
      sigma.refresh();
    });

    sigma.getTouchCaptor().on('touchmove', (event) => {
      if (!isDraggingRef.current || !draggedNodeRef.current) return;

      const position = sigma.viewportToGraph(event.touches[0]);
      graph.setNodeAttribute(draggedNodeRef.current, 'x', position.x);
      graph.setNodeAttribute(draggedNodeRef.current, 'y', position.y);

      event.preventSigmaDefault();
      event.original.preventDefault();
      event.original.stopPropagation();
    });

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
      sigma.kill();
      sigmaRef.current = null;
      graphRef.current = null;
      document.body.style.cursor = 'default';
    };
  }, [stableGraphData, themeName]);

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

        <LegendPanel
          nodeTypes={nodeTypes}
          relationshipTypes={relationshipTypes}
          graphOrder={graphRef.current?.order || 0}
          graphSize={graphRef.current?.size || 0}
        />

        {selectedNode && (
          <PropertiesPanel
            selectedNode={selectedNode}
            onClose={clearSelectedNode}
          />
        )}

        {selectedEdge && (
          <RelationshipPropertiesPanel
            selectedEdge={selectedEdge}
            onClose={clearSelectedEdge}
          />
        )}
      </div>
    </div>
  );
};

export default InteractiveGraph;
