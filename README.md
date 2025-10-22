# st-sigma

[![GLWT](https://img.shields.io/badge/License-GLWT-pink)](https://github.com/gitkeniwo/streamlit-sigmajs/blob/main/LICENSE)
[![pypi](https://img.shields.io/pypi/v/streamlit-sigmajs)](https://pypi.org/project/streamlit-sigmajs)

Streamlit component that allows you visualize interactive graphs using sigma.js.

## Demo

<img width="1448" height="988" alt="image" src="https://github.com/user-attachments/assets/7b82119a-70a5-4037-94e2-e461bfa8a923" />

## Roadmap
- [x] Basic graph visualization
- [x] Node and edge styling
- [x] Event handling (click, hover)
- [ ] Graph layouts
- [ ] Theming

## Local Installation

Activate your uv venv, then run:

```sh
pip install -e .
```

To build your frontend code, run the following commands from the `st_sigma/frontend` directory:

```sh
npm install
npm run build
```

To run in development mode with hot-reloading, in the `st_sigma/frontend` directory, run:

```sh
npm install
npm run start
```

To start your streamlit app, in the `st_sigma` directory, run:

```sh
uv pip install streamlit neo4j
streamlit run example_app.py
```

## Install from PyPI

```sh
uv add streamlit-sigmajs
```

## Build and publish to PyPI

1. Update version in `pyproject.toml`
2. Build the package:
```sh
uv sync
rm -rf dist
uv build
```
3. Publish the package:
```sh
export UV_PUBLISHER_TOKEN="your_token_here"
uv publish dist/*
```

## Usage 

The graph visualizer takes a customized graph dictionary in its `graphData` argument.
You can convert a Neo4j graph result to the required dictionary using the `neo4jgraph_to_sigma` utility function.
The `neo4jgraph_to_sigma` function takes a `neo4j.Graph` object as input, usually the results you get from `driver.execute_query(..., result_transformer_=neo4j.Result.graph)`.

```python
import streamlit as st
from st_sigma import st_sigmagraph, neo4jgraph_to_sigma

import neo4j
from neo4j import GraphDatabase

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
```
