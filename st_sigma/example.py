import streamlit as st
from st_sigma import st_sigmagraph, neo4jgraph_to_sigma

import neo4j
from neo4j import GraphDatabase
import json
import datetime

NEO4J_URI = "bolt://localhost:7677"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "your_password"

def query_neo4j_graph(query):
    
    with GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD)) as driver:
        result = driver.execute_query( query, result_transformer_ = neo4j.Result.graph )
        
        return result


query = st.text_area(
    "Enter Cypher Query",
    value="MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 4",
    height=100
)

st.subheader("Component with variable args")


height = st.slider("Graph Height", min_value=200, max_value=800, value=600, step=50)


if st.button("Visualize Graph"):
    try:
        with st.spinner("Querying Neo4j..."):
            result = query_neo4j_graph(query)
            result = neo4jgraph_to_sigma(result)
            
            if not result["nodes"]:
                st.warning("No nodes found in the query result.")
            else:
                st.success(f"Found {len(result['nodes'])} nodes and {len(result['relationships'])} relationships")
                
                st_sigmagraph(
                    graphData=result,
                    height=height,
                    key="neo4j_graph"
                )
    except Exception as e:
        st.error(f"Error: {str(e)}")
