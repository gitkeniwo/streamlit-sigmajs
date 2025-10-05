import { useEffect, useRef, useState, useMemo } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { Streamlit, withStreamlitConnection } from 'streamlit-component-lib';

import LegendPanel, { NodeType, RelationshipType } from './LegendPanel';
import PropertiesPanel, { NodeInfo } from './PropertiesPanel';
import RelationshipPropertiesPanel, { EdgeInfo } from './RelationshipPropertiesPanel';

import { 
  StreamlitComponentArgs, 
  Neo4jGraphData 
} from '../utils/types';
import { 
  extractUniqueLabels,
  extractUniqueRelationshipTypes,
  convertNeo4jToGraph 
} from '../utils/graphDataUtils';
import { createLabelColorMap } from '../utils/colorUtils';

// import './InteractiveGraph.css';

interface InteractiveGraphProps {
  args: StreamlitComponentArgs;
}

const InteractiveGraph: React.FC<InteractiveGraphProps> = ({ args }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<EdgeInfo | null>(null);
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([]);
  
  // Drag state
  const draggedNodeRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);
  
  // For initialization tracking
  const initializedRef = useRef(false);

  // Get data from args
  const graphData = args.graphData;
  const componentHeight = args.height || 600;

  // To avoid re-initialization on every render, memoize the graphData
  const stableGraphData = useMemo(() => {
    if (!graphData) return null;
    return JSON.stringify(graphData);
  }, [graphData]);

  useEffect(() => {
    if (!containerRef.current || !graphData || !stableGraphData) {
      console.warn('Container or graph data not available');
      return;
    }

    if (initializedRef.current && sigmaRef.current) {
      console.log('Already initialized, skipping...');
      return;
    }

    console.log('Initializing graph...');
    initializedRef.current = true;

    // Extract unique labels
    const uniqueLabels = extractUniqueLabels(graphData);
    
    // Extract unique relationship types
    const uniqueRelTypes = extractUniqueRelationshipTypes(graphData);
    
    // Create label to color mapping
    const labelColorMap = createLabelColorMap(uniqueLabels);
    
    // Create legend data
    const legendData: NodeType[] = uniqueLabels.map(label => ({
      type: label,
      color: labelColorMap.get(label) || '#9B8579',
      description: `${label} nodes`,
    }));
    setNodeTypes(legendData);

    // Create relationship types data
    const relTypeCount = new Map<string, number>();
    graphData.relationships.forEach(rel => {
      relTypeCount.set(rel.type, (relTypeCount.get(rel.type) || 0) + 1);
    });
    
    const relTypesData: RelationshipType[] = uniqueRelTypes.map(type => ({
      type: type,
      count: relTypeCount.get(type) || 0,
    }));
    setRelationshipTypes(relTypesData);

    // Convert to graphology instance
    const graph = convertNeo4jToGraph(graphData, labelColorMap);
    graphRef.current = graph;

    // Apply ForceAtlas2 layout
    forceAtlas2.assign(graph, {
      iterations: 100,
      settings: {
        gravity: 1,
        scalingRatio: 10,
      }
    });

    // Create Sigma instance
    const sigma = new Sigma(graph, containerRef.current, {
      defaultEdgeColor: '#d4c4b0',
      defaultNodeColor: '#9B8579',
      labelColor: { color: '#4a4137' },
      labelSize: 14,
      labelWeight: '500',
      renderEdgeLabels: true, // Enable edge labels
      enableEdgeEvents: true, // Enable edge events
    });
    sigmaRef.current = sigma;

    // Drag and Drop Implementation
    sigma.on('downNode', (e) => {
      isDraggingRef.current = true;
      draggedNodeRef.current = e.node;
      graph.setNodeAttribute(e.node, 'highlighted', true);
      document.body.style.cursor = 'grabbing';
    });

    sigma.getMouseCaptor().on('mousemovebody', (e) => {
      if (!isDraggingRef.current || !draggedNodeRef.current) return;

      const pos = sigma.viewportToGraph(e);
      graph.setNodeAttribute(draggedNodeRef.current, 'x', pos.x);
      graph.setNodeAttribute(draggedNodeRef.current, 'y', pos.y);

      e.preventSigmaDefault();
      e.original.preventDefault();
      e.original.stopPropagation();
    });

    sigma.getMouseCaptor().on('mouseup', () => {
      if (draggedNodeRef.current) {
        graph.removeNodeAttribute(draggedNodeRef.current, 'highlighted');
      }
      isDraggingRef.current = false;
      draggedNodeRef.current = null;
      document.body.style.cursor = 'default';
    });

    sigma.getMouseCaptor().on('touchmove', (e) => {
      if (!isDraggingRef.current || !draggedNodeRef.current) return;

      const pos = sigma.viewportToGraph(e);
      graph.setNodeAttribute(draggedNodeRef.current, 'x', pos.x);
      graph.setNodeAttribute(draggedNodeRef.current, 'y', pos.y);

      e.preventSigmaDefault();
      e.original.preventDefault();
      e.original.stopPropagation();
    });

    // Handle node clicks
    sigma.on('clickNode', ({ node }) => {
      if (isDraggingRef.current) return;

      const attrs = graph.getNodeAttributes(node);
      const neighbors = graph.neighbors(node);

      // Close edge panel, open node panel
      setSelectedEdge(null);
      setSelectedNode({
        id: node,
        labels: attrs.labels || [],
        color: attrs.color,
        properties: attrs.properties || {},
      });

      // Reset all nodes
      graph.forEachNode((n) => {
        const baseSize = graph.getNodeAttribute(n, 'baseSize');
        const baseColor = graph.getNodeAttribute(n, 'baseColor');
        graph.setNodeAttribute(n, 'size', baseSize);
        graph.setNodeAttribute(n, 'color', baseColor);
        graph.removeNodeAttribute(n, 'highlighted');
      });

      // Reset all edges
      graph.forEachEdge((edge) => {
        const baseColor = graph.getEdgeAttribute(edge, 'baseColor');
        const baseSize = graph.getEdgeAttribute(edge, 'baseSize');
        graph.setEdgeAttribute(edge, 'color', baseColor);
        graph.setEdgeAttribute(edge, 'size', baseSize);
      });

      // Highlight selected node and neighbors
      graph.forEachNode((n) => {
        if (n === node) {
          const baseSize = graph.getNodeAttribute(n, 'baseSize');
          graph.setNodeAttribute(n, 'size', baseSize * 1.3);
          graph.setNodeAttribute(n, 'highlighted', true);
        } else if (neighbors.includes(n)) {
          const baseColor = graph.getNodeAttribute(n, 'baseColor');
          graph.setNodeAttribute(n, 'color', baseColor);
        } else {
          const baseColor = graph.getNodeAttribute(n, 'baseColor');
          graph.setNodeAttribute(n, 'color', baseColor + '40');
        }
      });

      // Highlight edges
      graph.forEachEdge((edge) => {
        const [source, target] = graph.extremities(edge);
        if (source === node || target === node) {
          graph.setEdgeAttribute(edge, 'color', attrs.color);
          graph.setEdgeAttribute(edge, 'size', 3);
        } else {
          graph.setEdgeAttribute(edge, 'color', '#e8e3d8');
        }
      });

      sigma.refresh();
    });

    // Handle edge clicks 
    sigma.on('clickEdge', ({ edge }) => {
      const attrs = graph.getEdgeAttributes(edge);
      const [source, target] = graph.extremities(edge);
      
      // Get source and target node labels
      const sourceLabel = graph.getNodeAttribute(source, 'label');
      const targetLabel = graph.getNodeAttribute(target, 'label');

      // Close node panel, open edge panel
      setSelectedNode(null);
      setSelectedEdge({
        id: edge,
        source: sourceLabel,
        target: targetLabel,
        relType: attrs.relType || 'UNKNOWN',
        color: '#CC8B65',
        properties: attrs.properties || {},
      });

      // Reset all nodes
      graph.forEachNode((n) => {
        const baseSize = graph.getNodeAttribute(n, 'baseSize');
        const baseColor = graph.getNodeAttribute(n, 'baseColor');
        graph.setNodeAttribute(n, 'size', baseSize);
        graph.setNodeAttribute(n, 'color', baseColor);
        graph.removeNodeAttribute(n, 'highlighted');
      });

      // Reset all edges
      graph.forEachEdge((e) => {
        const baseColor = graph.getEdgeAttribute(e, 'baseColor');
        const baseSize = graph.getEdgeAttribute(e, 'baseSize');
        graph.setEdgeAttribute(e, 'color', baseColor);
        graph.setEdgeAttribute(e, 'size', baseSize);
      });

      // Highlight selected edge and connected nodes
      graph.setEdgeAttribute(edge, 'color', '#CC8B65');
      graph.setEdgeAttribute(edge, 'size', 4);
      
      const sourceBaseSize = graph.getNodeAttribute(source, 'baseSize');
      const targetBaseSize = graph.getNodeAttribute(target, 'baseSize');
      graph.setNodeAttribute(source, 'size', sourceBaseSize * 1.3);
      graph.setNodeAttribute(target, 'size', targetBaseSize * 1.3);

      sigma.refresh();
    });

    // Handle stage clicks
    sigma.on('clickStage', () => {
      setSelectedNode(null);
      setSelectedEdge(null);

      graph.forEachNode((node) => {
        const baseSize = graph.getNodeAttribute(node, 'baseSize');
        const baseColor = graph.getNodeAttribute(node, 'baseColor');
        
        graph.setNodeAttribute(node, 'size', baseSize);
        graph.setNodeAttribute(node, 'color', baseColor);
        graph.removeNodeAttribute(node, 'highlighted');
      });

      graph.forEachEdge((edge) => {
        const baseColor = graph.getEdgeAttribute(edge, 'baseColor');
        const baseSize = graph.getEdgeAttribute(edge, 'baseSize');
        graph.setEdgeAttribute(edge, 'color', baseColor);
        graph.setEdgeAttribute(edge, 'size', baseSize);
      });

      sigma.refresh();
    });

    // Hover effects for nodes
    sigma.on('enterNode', ({ node }) => {
      if (!isDraggingRef.current) {
        document.body.style.cursor = 'grab';
      }
      const baseSize = graph.getNodeAttribute(node, 'baseSize');
      const isHighlighted = graph.getNodeAttribute(node, 'highlighted');
      
      if (isHighlighted) {
        graph.setNodeAttribute(node, 'size', baseSize * 1.5);
      } else {
        graph.setNodeAttribute(node, 'size', baseSize * 1.2);
      }
      sigma.refresh();
    });

    sigma.on('leaveNode', ({ node }) => {
      if (!isDraggingRef.current) {
        document.body.style.cursor = 'default';
      }
      const baseSize = graph.getNodeAttribute(node, 'baseSize');
      const isHighlighted = graph.getNodeAttribute(node, 'highlighted');
      
      if (isHighlighted) {
        graph.setNodeAttribute(node, 'size', baseSize * 1.3);
      } else {
        graph.setNodeAttribute(node, 'size', baseSize);
      }
      sigma.refresh();
    });

    // Hover effects for edges 
    sigma.on('enterEdge', ({ edge }) => {
      document.body.style.cursor = 'pointer';
      const currentSize = graph.getEdgeAttribute(edge, 'size');
      graph.setEdgeAttribute(edge, 'size', currentSize * 1.5);
      sigma.refresh();
    });

    sigma.on('leaveEdge', ({ edge }) => {
      document.body.style.cursor = 'default';
      const baseSize = graph.getEdgeAttribute(edge, 'baseSize');
      // If this edge is selected, keep it slightly larger
      if (selectedEdge?.id === edge) {
        graph.setEdgeAttribute(edge, 'size', 4);
      } else {
        graph.setEdgeAttribute(edge, 'size', baseSize);
      }
      sigma.refresh();
    });

    // Notify Streamlit that the component is ready
    Streamlit.setComponentReady();
    Streamlit.setFrameHeight(componentHeight + 200);
    
    // Trace cleanup function
    return () => {
      console.log('Cleaning up...');
      if (sigmaRef.current) {
        sigmaRef.current.kill();
        sigmaRef.current = null;
      }
      initializedRef.current = false;
    };
  }, [stableGraphData]);

  // When componentHeight changes, update frame height
  useEffect(() => {
    if (initializedRef.current) {
      Streamlit.setFrameHeight(componentHeight + 100);
    }
  }, [componentHeight]);

  // If no data, show message
  if (!graphData) {
    return (
      <div className="graph-container">
        <div className="no-data-message">
          <h3>No Graph Data</h3>
          <p>Please provide Neo4j graph data to visualize.</p>
        </div>
      </div>
    );
  }





   return (
    <div className="font-space-grotesk flex flex-col w-full h-screen bg-[#f4f1ea]">
      {/* Header */}
      {/* <div className="px-10 py-6 bg-[#fdfcfb] border-b border-[#e8e3d8] shadow-sm">
        <h2 className="text-2xl font-medium text-[#1a1715] tracking-tight mb-2">
          Interactive Graph Visualization
        </h2>
        <p className="text-sm text-[#6b5d4f]">
          Click nodes/edges for details • Drag to reposition • Hover to highlight
        </p>
      </div> */}

      {/* Content */}
      <div className="flex flex-1 overflow-hidden relative p-6">
        {/* Sigma Container */}
        <div 
          ref={containerRef} 
          className="flex-1 bg-[#fdfcfb] rounded-2xl shadow-md border border-[#e8e3d8] relative"
          style={{ height: `${componentHeight}px` }}
        />

        {/* Panels */}
        <LegendPanel 
          nodeTypes={nodeTypes}
          relationshipTypes={relationshipTypes}
          graphOrder={graphRef.current?.order || 0}
          graphSize={graphRef.current?.size || 0}
        />

        {selectedNode && (
          <PropertiesPanel 
            selectedNode={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        )}

        {selectedEdge && (
          <RelationshipPropertiesPanel 
            selectedEdge={selectedEdge}
            onClose={() => setSelectedEdge(null)}
          />
        )}
      </div>
    </div>
  );



};

export default withStreamlitConnection(InteractiveGraph);