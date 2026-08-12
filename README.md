# streamlit-sigmajs

[![GLWT](https://img.shields.io/badge/License-GLWT-pink)](https://github.com/gitkeniwo/streamlit-sigmajs/blob/main/LICENSE)
[![pypi](https://img.shields.io/pypi/v/streamlit-sigmajs)](https://pypi.org/project/streamlit-sigmajs)

A Streamlit component for interactive property graph visualization, powered by Sigma.js.
Pass NetworkX graphs, Neo4j graph results, node/edge DataFrames, or a plain
property-graph dictionary directly from Python.

## Demo

<img width="1448" height="988" alt="image" src="https://github.com/user-attachments/assets/7b82119a-70a5-4037-94e2-e461bfa8a923" />

## Features

- [x] Basic graph visualization
- [x] NetworkX, Neo4j, DataFrame, and dictionary inputs
- [x] Streamlit-native and humanistic themes
- [x] In-component node and edge selection
- [x] Multiple independent graphs on one Streamlit page
- [x] ForceAtlas2, circular, random, and pre-positioned layouts
- [x] Compact/card property inspectors and configurable labels/legend
- [x] Optional worker-based layout relaxation while dragging
- [ ] Python interaction callbacks

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

For NetworkX, pass the graph directly. Node attributes become properties;
`label` or `labels` controls node types, and edge `type` controls relationship
types.

```python
import streamlit as st
import networkx as nx
from st_sigma import sigma_graph

graph = nx.karate_club_graph()
sigma_graph(graph, height=600, theme="streamlit", key="karate")
```

For DataFrames, pass the node table as the first argument and the edge table
with `edges=`. Nodes require `id`; edges require `source` and `target`.

```python
import pandas as pd
from st_sigma import sigma_graph

nodes = pd.DataFrame([
    {"id": "ada", "label": "Person", "name": "Ada Lovelace"},
    {"id": "engine", "label": "Work", "name": "Analytical Engine Notes"},
])
edges = pd.DataFrame([
    {"id": "r1", "source": "ada", "target": "engine", "type": "AUTHORED"},
])
sigma_graph(nodes, edges=edges, theme="humanistic")
```

Neo4j results returned with `neo4j.Result.graph` also work directly—no
conversion helper is required:

```python
import neo4j
from neo4j import GraphDatabase
from st_sigma import sigma_graph

with GraphDatabase.driver(NEO4J_URI, auth=AUTH) as driver:
    graph = driver.execute_query(
        "MATCH (a)-[r]->(b) RETURN a, r, b LIMIT 100",
        result_transformer_=neo4j.Result.graph,
    )

sigma_graph(graph, height=650, key="neo4j")
```

Plain dictionaries use one canonical property-graph schema:

```python
graph = {
    "nodes": [
        {"id": "ada", "labels": ["Person"], "properties": {"name": "Ada"}},
        {"id": "engine", "labels": ["Work"], "properties": {"name": "Notes"}},
    ],
    "edges": [
        {
            "id": "r1",
            "source": "ada",
            "target": "engine",
            "type": "AUTHORED",
            "properties": {"year": 1843},
            "directed": True,
        },
    ],
}
sigma_graph(graph)
```

`theme="streamlit"` is the default and follows the host app's theme variables.
Use `theme="humanistic"` for the original warm, low-saturation visual style.
The v0.1 `st_sigmagraph(graphData=...)` API remains available for compatibility.

### Display and layout configuration

The default presentation uses a compact properties panel, a collapsed legend,
automatic node labels, and edge labels shown only on hover. Advanced options
are grouped so the main function stays small:

```python
from st_sigma import DisplayConfig, GraphConfig, LayoutConfig, sigma_graph

config = GraphConfig(
    display=DisplayConfig(
        node_labels="hover",       # "auto" | "hover" | "hidden"
        edge_labels="hidden",      # "always" | "hover" | "hidden"
        node_label_size=11,
        edge_label_size=8,
        properties_panel="compact",  # "compact" | "cards" | "hidden"
        show_legend=True,
        legend_collapsed=True,
        selection_dimming=0.68,
    ),
    layout=LayoutConfig(
        name="forceatlas2",        # "circular" | "random" | "none"
        iterations=120,
        gravity=1.0,
        scaling_ratio=12.0,
        dynamic_after_drag=True,
        drag_relaxation_ms=700,
    ),
)

sigma_graph(graph, config=config)
```

For a layout preset without custom settings, use the shorter form:

```python
sigma_graph(graph, layout="circular")
```
