import {
  Streamlit,
  withStreamlitConnection,
  ComponentProps,
} from "streamlit-component-lib"
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  ReactElement,
  useRef,
} from "react"
import Graph from "graphology"
import Sigma from "sigma"
import forceAtlas2 from 'graphology-layout-forceatlas2';

import "./InteractiveGraph.module.css"




interface NodeAttributes {
  x: number;
  y: number;
  size: number;
  label: string;
  color: string;
  type: string;
  value?: number;
  description?: string;
}

interface NodeInfo {
  id: string;
  label: string;
  type: string;
  color: string;
  value?: number;
  description?: string;
  degree: number;
  neighbors: string[];
}



/**
 * A template for creating Streamlit components with React
 *
 * This component demonstrates the essential structure and patterns for
 * creating interactive Streamlit components, including:
 * - Accessing props and args sent from Python
 * - Managing component state with React hooks
 * - Communicating back to Streamlit via Streamlit.setComponentValue()
 * - Using the Streamlit theme for styling
 * - Setting frame height for proper rendering
 *
 * @param {ComponentProps} props - The props object passed from Streamlit
 * @param {Object} props.args - Custom arguments passed from the Python side
 * @param {string} props.args.name - Example argument showing how to access Python-defined values
 * @param {boolean} props.disabled - Whether the component is in a disabled state
 * @param {Object} props.theme - Streamlit theme object for consistent styling
 * @returns {ReactElement} The rendered component
 */
function InteractiveGraph({ args, disabled, theme }: ComponentProps): ReactElement {
  // 1. Refs, to hold Sigma.js instance and container
  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);


  // 2. 使用 useMemo 创建硬编码的 Graph 实例
  // 仅在组件首次渲染时执行一次，保证图实例的稳定。
  const graph = useMemo(() => {
    const graph = new Graph()

    // 添加节点 (Nodes)
    graph.addNode("n1", { label: "Apple", size: 10, x: 0, y: 0, color: "#FF5733" })
    graph.addNode("n2", { label: "Banana", size: 8, x: 1, y: 1, color: "#FFC300" })
    graph.addNode("n3", { label: "Cherry", size: 6, x: 2, y: 0, color: "#C70039" })
    graph.addNode("n4", { label: "Durian", size: 12, x: 1, y: -1, color: "#900C3F" })
    graph.addNode("n5", { label: "Elderberry", size: 5, x: 3, y: 1, color: "#581845" })
    graph.addNode("n6", { label: "Fig", size: 7, x: 3, y: -1, color: "#DAF7A6" })
    graph.addNode("n7", { label: "Grape", size: 9, x: 4, y: 0, color: "#8E44AD" })
    graph.addNode("n8", { label: "Honeydew", size: 4, x: 5, y: 1, color: "#27AE60" })
    graph.addNode("n9", { label: "Indian Fig", size: 11, x: 5, y: -1, color: "#2980B9" })
    graph.addNode("n10", { label: "Jackfruit", size: 13, x: 6, y: 0, color: "#F39C12" })

    // 添加边 (Edges)
    graph.addEdge("n1", "n2", { size: 2 })
    graph.addEdge("n2", "n3", { size: 1 })
    graph.addEdge("n3", "n4", { size: 3 })
    graph.addEdge("n4", "n1")
    graph.addEdge("n2", "n5", { size: 2 })
    graph.addEdge("n5", "n6", { size: 1 })
    graph.addEdge("n6", "n7", { size: 2 })
    graph.addEdge("n7", "n3", { size: 1 })
    graph.addEdge("n1", "n5", { size: 2 })
    graph.addEdge("n4", "n6", { size: 1 })
    graph.addEdge("n8", "n9", { size: 2 })
    graph.addEdge("n9", "n10", { size: 3 })
    graph.addEdge("n10", "n7", { size: 1 })
    graph.addEdge("n8", "n1", { size: 2 })
    graph.addEdge("n9", "n3", { size: 1 })
    graph.addEdge("n10", "n4", { size: 2 })

    // Use forceatlas2 layout to position nodes
    forceAtlas2.assign(graph, {iterations: 100, settings: {gravity: 1}});

    return graph
  }, []) // Ensure this runs only once


  // 3. Sigma.js 初始化和渲染逻辑
  useEffect(() => {
    if (containerRef.current) {
      
      try {
        // sigma renderer
        const sigma = new Sigma(
          graph,            // 参数 1: 已创建的 Graph 实例
          containerRef.current,     // 参数 2: DOM 容器
          {                         // 参数 3: 可选的设置对象
            // 使用 Streamlit 主题色作为默认节点颜色
            defaultNodeColor: theme?.primaryColor || '#6A78AB',
            // labelThreshold: 4,      // 调整标签显示门槛
          }
        )

        sigmaRef.current = sigma;

        // Click event to show node properties
        sigma.on('clickNode', (event) => {
          const nodeId = event.node;
          const attributes = graph.getNodeAttributes(nodeId) as NodeAttributes;
          const degree = graph.degree(nodeId);
          const neighbors = graph.neighbors(nodeId);

          // Update selected node state
          setSelectedNode({
            id: nodeId,
            attributes,
            degree,
            neighbors,
        });

        // Highlight the selected node
        graph.forEachNode((node) => {
            if (node === nodeId) {
              graph.setNodeAttribute(node, 'highlighted', true);
            } else {
              graph.setNodeAttribute(node, 'highlighted', false);
            }
          });
          sigma.refresh();
        });

        // Add hover effects
        sigma.on('enterNode', (event) => {
          graph.setNodeAttribute(event.node, 'highlighted', true);
          sigma.refresh();
        });

        sigma.on('leaveNode', (event) => {
          graph.setNodeAttribute(event.node, 'highlighted', false);
          sigma.refresh();
        });

        // 可选：添加交互功能（例如点击事件）
        sigmaRef.current.on("clickNode", (e: any) => {
           // 注意：Streamlit.setComponentValue 必须在连接 Streamlit 时才生效
           console.log("Node clicked:", e.node, graph.getNodeAttributes(e.node).label);
        })

      } catch (e) {
        console.error("Error initializing Sigma.js:", e)
      }

      // 清理函数：在组件卸载时销毁实例
      return () => {
        if (sigmaRef.current) {
          sigmaRef.current.kill()
          sigmaRef.current = null
        }
      }
    }
  }, [graph, theme]) // 依赖 graphInstance 和 theme

  // 4. 通知 Streamlit 组件高度（保持组件框架的正确性）
  useEffect(() => {
    Streamlit.setFrameHeight()
  }, [theme])


  // 5. 渲染容器
  // 必须指定宽度和高度，否则 Sigma.js 无法渲染
  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: "500px", // 固定的高度
    // 使用 Streamlit 主题背景色
    backgroundColor: theme?.backgroundColor || "#FFFFFF",
    borderRadius: '0.25rem',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  }


  return (
    <div className="graph-container" style={{ position: 'relative' }}>
      <div ref={containerRef} className="sigma-container" style={containerStyle} >
        {/* Loading overlay when disabled */}
        {disabled && <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          color: '#666',
        }}>Loading...</div>}
      </div>
    </div>
  )
}

export default InteractiveGraph
