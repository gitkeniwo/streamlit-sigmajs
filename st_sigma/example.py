import streamlit as st
from st_sigma import st_sigmagraph

import neo4j
from neo4j import GraphDatabase
import json

NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "12345678"

def query_neo4j_graph(query: str):
    
    with GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD)) as driver:
        result = driver.execute_query( query, result_transformer_ = neo4j.Result.graph )
        
        # 提取节点和关系
        nodes = []
        relationships = []
                
        # 提取节点
        for node in result.nodes:
            nodes.append({
                "identity": node.element_id,
                "labels": list(node.labels),
                "properties": dict(node)
            })
                    
        # 提取关系
        for rel in result.relationships:
            relationships.append({
                "identity": rel.element_id,
                "start": rel.start_node.element_id,
                "end": rel.end_node.element_id,
                "type": rel.type,
                "properties": dict(rel)
            })
        
        return {
            "nodes": nodes,
            "relationships": relationships
        }


# 查询输入
query = st.text_area(
    "Enter Cypher Query",
    value="MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 50",
    height=100
)

st.subheader("Component with variable args")


height = st.slider("Graph Height", min_value=400, max_value=1200, value=600, step=50)

# 执行查询按钮
if st.button("Visualize Graph"):
    try:
        with st.spinner("Querying Neo4j..."):
            graph_data = query_neo4j_graph(query)
            
            if not graph_data["nodes"]:
                st.warning("No nodes found in the query result.")
            else:
                st.success(f"Found {len(graph_data['nodes'])} nodes and {len(graph_data['relationships'])} relationships")
                
                # 调用自定义组件
                st_sigmagraph(
                    graphData=graph_data,
                    height=height,
                    key="neo4j_graph"
                )
    except Exception as e:
        st.error(f"Error: {str(e)}")
