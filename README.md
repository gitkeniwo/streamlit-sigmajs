# streamlit-sigmajs

[![PyPI](https://img.shields.io/pypi/v/streamlit-sigmajs)](https://pypi.org/project/streamlit-sigmajs)
[![Python](https://img.shields.io/pypi/pyversions/streamlit-sigmajs)](https://pypi.org/project/streamlit-sigmajs)
[![GLWT](https://img.shields.io/badge/License-GLWT-pink)](https://github.com/gitkeniwo/streamlit-sigmajs/blob/main/LICENSE)

Interactive property-graph visualization for Streamlit, powered by
[Sigma.js](https://www.sigmajs.org/). Pass a property-graph dictionary,
NetworkX graph, Neo4j graph result, or pair of pandas DataFrames directly from
Python.

<img width="1449" height="830" alt="image" src="https://github.com/user-attachments/assets/5d08ea19-3760-4e31-9708-c8db0c64d09e" />


## Features

- Direct NetworkX, Neo4j, DataFrame, and property-graph inputs
- Streamlit-native and warm humanistic themes
- Node and edge selection with compact property inspectors
- Configurable labels, legend, colors, fonts, and interaction behavior
- ForceAtlas2, force, circular, circlepack, grid, concentric, hierarchical,
  random, and pre-positioned layouts
- Real-time spring physics while dragging: nearby nodes respond immediately,
  then settle around the pinned dropped node without replacing the initial
  layout; disable it with `LayoutConfig(dynamic_after_drag=False)`
- Multiple independent graphs on the same Streamlit page

## Requirements

- Python 3.10 or newer
- Streamlit 1.51 or newer

No JavaScript or frontend setup is required when installing the package from
PyPI.

## Installation

With `uv`:

```sh
uv add streamlit-sigmajs
```

With `pip`:

```sh
python -m pip install streamlit-sigmajs
```

NetworkX, pandas, and the Neo4j driver are optional. Install only the library
used by your application.

## Quick start

Create `app.py`:

```python
import streamlit as st
from st_sigma import sigma_graph

st.title("Knowledge graph")

graph = {
    "nodes": [
        {
            "id": "ada",
            "labels": ["Person"],
            "properties": {"name": "Ada Lovelace", "born": 1815},
        },
        {
            "id": "notes",
            "labels": ["Work"],
            "properties": {"name": "Notes on the Analytical Engine"},
        },
    ],
    "edges": [
        {
            "id": "authored",
            "source": "ada",
            "target": "notes",
            "type": "AUTHORED",
            "properties": {"year": 1843},
            "directed": True,
        }
    ],
}

sigma_graph(graph, height=600, key="knowledge-graph")
```

Run it with `uv`:

```sh
uv run streamlit run app.py
```

Or with `pip`:

```sh
streamlit run app.py
```

The default `streamlit` theme follows the host app's colors. Click a node or
edge to inspect its properties, drag nodes to reposition them, and use the
mouse wheel or trackpad to zoom.

## Supported graph inputs

### NetworkX

Pass any NetworkX `Graph`, `DiGraph`, `MultiGraph`, or `MultiDiGraph`. Node
attributes become properties. The `label` or `labels` attribute sets the node
type, while an edge's `type` attribute sets its relationship type.

```python
import networkx as nx
from st_sigma import sigma_graph

graph = nx.karate_club_graph()
sigma_graph(graph, layout="forceatlas2", key="karate")
```

Install NetworkX with `uv add networkx` or `python -m pip install networkx`.

### pandas DataFrames

Pass the node DataFrame first and the edge DataFrame through `edges=`. Nodes
require an `id` column; edges require `source` and `target`. The conventional
optional columns are `label` or `labels` for nodes and `id`, `type`, and
`directed` for edges. All remaining columns become properties.

```python
import pandas as pd
from st_sigma import sigma_graph

nodes = pd.DataFrame([
    {"id": "ada", "label": "Person", "name": "Ada Lovelace"},
    {"id": "notes", "label": "Work", "name": "Analytical Engine Notes"},
])
edges = pd.DataFrame([
    {"id": "r1", "source": "ada", "target": "notes", "type": "AUTHORED"},
])

sigma_graph(nodes, edges=edges, theme="humanistic", key="dataframes")
```

Install pandas with `uv add pandas` or `python -m pip install pandas`.

### Neo4j

`neo4j.Result.graph` output can be passed directly; no conversion helper is
needed.

```python
import neo4j
from neo4j import GraphDatabase
from st_sigma import sigma_graph

with GraphDatabase.driver(NEO4J_URI, auth=NEO4J_AUTH) as driver:
    graph = driver.execute_query(
        "MATCH (a)-[r]->(b) RETURN a, r, b LIMIT 100",
        result_transformer_=neo4j.Result.graph,
    )

sigma_graph(graph, height=650, key="neo4j")
```

Install the driver with `uv add neo4j` or `python -m pip install neo4j`.

### Property-graph dictionaries

The canonical schema is:

```python
graph = {
    "nodes": [
        {
            "id": "node-id",
            "labels": ["NodeType"],
            "properties": {"name": "Visible label", "any_key": "any value"},
        }
    ],
    "edges": [
        {
            "id": "edge-id",
            "source": "source-node-id",
            "target": "target-node-id",
            "type": "RELATIONSHIP_TYPE",
            "properties": {},
            "directed": True,
        }
    ],
}
```

Legacy dictionaries using `identity`, `relationships`, `start`, and `end` are
also normalized automatically.

## Themes and layouts

Use a preset for common cases:

```python
sigma_graph(graph, theme="humanistic", layout="circular")
```

Themes:

- `streamlit` — neutral styling that follows Streamlit theme variables
- `humanistic` — warm surfaces and a muted, low-saturation palette

Layouts:

- `forceatlas2`
- `force`
- `circular`
- `circlepack`
- `grid`
- `concentric`
- `hierarchical`
- `random`
- `none` — preserve coordinates selected with `node_x_field` and `node_y_field`

## Display and interaction configuration

Most applications only need `sigma_graph(...)`. Use `GraphConfig` when more
control is required:

```python
from st_sigma import DisplayConfig, GraphConfig, LayoutConfig, sigma_graph

config = GraphConfig(
    display=DisplayConfig(
        node_size_mode="auto",     # "auto" | "fixed"
        node_size=10,
        node_size_field="weight",  # optional numeric property mapping
        node_color_field="category",  # optional categorical property mapping
        node_label_field="name",   # property used for visible node labels
        node_labels="hover",       # "auto" | "hover" | "hidden"
        edge_labels="hover",       # "always" | "hover" | "hidden"
        node_label_size=11,
        edge_label_size=8,
        properties_panel="compact",  # "compact" | "cards" | "hidden"
        show_legend=True,
        legend_collapsed=True,
        selection_dimming=0.68,
    ),
    layout=LayoutConfig(
        name="forceatlas2",
        node_x_field=None,          # set with node_y_field for pre-positioned data
        node_y_field=None,
        iterations=120,
        dynamic_after_drag=True,
        drag_relaxation_ms=1000,    # maximum post-release settling time
    ),
)

sigma_graph(graph, config=config, key="configured-graph")
```

Hierarchical layouts accept `hierarchy_direction="TB"`, `"BT"`, `"LR"`, or
`"RL"`.

To use a locally installed font, set `label_font_family`. For Google Fonts or a
self-hosted `@font-face` stylesheet, also provide its CSS URL:

```python
display = DisplayConfig(
    label_font_family="'IBM Plex Sans', sans-serif",
    label_font_url=(
        "https://fonts.googleapis.com/css2?"
        "family=IBM+Plex+Sans:wght@400;500;600&display=swap"
    ),
)
```

Automatic node sizing is enabled by default. It scales nodes down for dense
graphs and narrow components while treating `node_size` as the maximum default
size. Set `node_size_mode="fixed"` to use the configured size at every
component width. Properties are always preserved as application data; set
`node_size_field`, `node_color_field`, `node_label_field`, `node_x_field`, or
`node_y_field` when you explicitly want a property to control rendering.

The returned component result exposes interaction state. `result.clicked` is a
one-rerun event with `{"type": "node" | "edge", "id": ...}`, while
`result.selection` persists the current `nodes` and `edges` arrays. Optional
`on_clicked_change` and `on_selection_change` callbacks follow Streamlit's v2
component callback convention.

## Run the example gallery

The repository includes a single-page graph playground with sidebar controls,
live selection details, and a comparison view for property-graph, NetworkX,
DataFrame, and Neo4j-like inputs, themes, layouts, and display presets.

Clone the repository, then run it with `uv`:

```sh
git clone https://github.com/gitkeniwo/streamlit-sigmajs.git
cd streamlit-sigmajs
uv sync --extra examples
uv run streamlit run examples/app.py
```

Or create an editable environment with `pip`:

```sh
git clone https://github.com/gitkeniwo/streamlit-sigmajs.git
cd streamlit-sigmajs
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
python -m pip install -e ".[examples]"
streamlit run examples/app.py
```

Downloaded datasets are stored in the ignored `examples/data/` directory.
See the
[example gallery notes](https://github.com/gitkeniwo/streamlit-sigmajs/blob/main/examples/README.md)
for dataset sources and optional data preparation commands.

## Compatibility

The v0.1 `st_sigmagraph(graphData=...)` entry point remains available for
existing applications. New code should use `sigma_graph(...)`.

## License

[Good Luck With That Public License](https://github.com/gitkeniwo/streamlit-sigmajs/blob/main/LICENSE)
