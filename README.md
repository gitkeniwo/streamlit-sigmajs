# streamlit-sigmajs

[![GLWT](https://img.shields.io/badge/License-GLWT-pink)](https://github.com/gitkeniwo/streamlit-sigmajs/blob/main/LICENSE)
[![pypi](https://img.shields.io/pypi/v/streamlit-sigmajs)](https://pypi.org/project/streamlit-sigmajs)

A Streamlit component for interactive property graph visualization, powered by Sigma.js.

## Demo

<img width="1448" height="988" alt="image" src="https://github.com/user-attachments/assets/7b82119a-70a5-4037-94e2-e461bfa8a923" />

## Roadmap
- [x] Basic graph visualization
- [x] Node and edge styling
- [x] In-component node and edge selection
- [ ] Python interaction callbacks
- [ ] Graph layouts
- [ ] Theming

## Local Installation

Install the Python package and development dependencies:

```sh
uv sync --extra dev
```

To build your frontend code, run the following commands from the `st_sigma/frontend` directory:

```sh
npm ci
npm run build
```

To run in development mode with hot-reloading, in the `st_sigma/frontend` directory, run:

```sh
npm ci
npm run start
```

To start the repository example app, run:

```sh
uv run --extra examples streamlit run examples/app.py
```

The tracked gallery includes NetworkX, DataFrame, and synthetic property-graph
examples. Materialized and third-party datasets are kept in the ignored
`examples/data/` cache; see [`examples/README.md`](examples/README.md).

## Install from PyPI

```sh
uv add streamlit-sigmajs
```

## Build and publish to PyPI

1. Update the version in `pyproject.toml`.
2. Build the frontend and Python distributions:
```sh
cd st_sigma/frontend
npm ci
npm run build
cd ../..
uv build
```
3. Validate the distributions locally:
```sh
uvx twine check dist/*
```

PyPI releases are published by the `publish` GitHub Actions workflow using
[Trusted Publishing](https://docs.pypi.org/trusted-publishers/). Push a version
tag such as `v0.1.2`, or manually dispatch the workflow for an existing tag.
No PyPI API token is stored in GitHub.

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
