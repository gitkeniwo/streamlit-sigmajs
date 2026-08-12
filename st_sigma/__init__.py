from pathlib import Path

import streamlit as st
from streamlit.errors import StreamlitAPIException

from .adapters import (
    from_dataframes,
    from_mapping,
    from_neo4j,
    from_networkx,
    normalize_graph,
    serialize_value,
)
from .schema import PropertyGraph, PropertyGraphEdge, PropertyGraphNode

__all__ = [
    "PropertyGraph",
    "PropertyGraphEdge",
    "PropertyGraphNode",
    "from_dataframes",
    "from_mapping",
    "from_neo4j",
    "from_networkx",
    "neo4jgraph_to_sigma",
    "normalize_graph",
    "serialize_neo4j_value",
    "sigma_graph",
    "st_sigmagraph",
]


def _register_component():
    """Register packaged assets, with an inline fallback for editable installs."""
    try:
        return st.components.v2.component(
            "streamlit-sigmajs.sigma_graph",
            js="index-*.js",
            css="style-*.css",
        )
    except StreamlitAPIException:
        # Streamlit discovers v2 manifests from installed distribution files.
        # Editable installs may not expose package data in that file list, so
        # use the same built assets inline for local development and tests.
        build_dir = Path(__file__).parent / "frontend" / "build"
        js_files = list(build_dir.glob("index-*.js"))
        css_files = list(build_dir.glob("style-*.css"))
        if len(js_files) != 1 or len(css_files) != 1:
            raise
        return st.components.v2.component(
            "streamlit-sigmajs.sigma_graph",
            js=js_files[0].read_text(encoding="utf-8"),
            # A line break makes the minified stylesheet unambiguously inline
            # to Streamlit's path/content classifier.
            css="/* editable-install fallback */\n"
            + css_files[0].read_text(encoding="utf-8"),
        )


_component_func = _register_component()


def serialize_neo4j_value(val):
    """Backward-compatible alias for :func:`serialize_value`."""
    return serialize_value(val)


def neo4jgraph_to_sigma(result):
    """Convert Neo4j data to the legacy v0.1 dictionary shape."""
    graph = from_neo4j(result)
    return {
        "nodes": [
            {
                "identity": node["id"],
                "labels": node["labels"],
                "properties": node["properties"],
            }
            for node in graph["nodes"]
        ],
        "relationships": [
            {
                "identity": edge["id"],
                "start": edge["source"],
                "end": edge["target"],
                "type": edge["type"],
                "properties": edge["properties"],
            }
            for edge in graph["edges"]
        ],
    }


def sigma_graph(graph, *, edges=None, height=600, theme="streamlit", key=None):
    """Render a supported graph value without a manual conversion step.

    ``graph`` may be a canonical or legacy graph dictionary, a NetworkX graph,
    a Neo4j ``Graph`` result, or a node DataFrame when ``edges`` is provided.
    """
    if theme not in {"streamlit", "humanistic"}:
        raise ValueError("theme must be 'streamlit' or 'humanistic'.")
    graph_data = normalize_graph(graph, edges=edges)
    return _component_func(
        key=key,
        data={"graphData": graph_data, "height": height, "theme": theme},
    )

def st_sigmagraph(graphData=None, height=600, theme="humanistic", key=None):
    """Render an interactive Sigma.js graph in a Streamlit app.

    Parameters
    ----------
    graphData: dict or None
        Graph data containing ``nodes`` and ``relationships``. Use
        :func:`neo4jgraph_to_sigma` to convert a Neo4j graph result.
    height: int
        Component height in pixels.
    key: str or None
        An optional key that uniquely identifies this component. If this is
        None, and the component's arguments are changed, the component will
        be re-mounted in the Streamlit frontend and lose its current state.

    Returns
    -------
    streamlit.components.v2.component.ComponentResult
        Persistent component state. Interaction values will be added to this
        result as the public API evolves.

    """
    if graphData is None:
        return _component_func(
            key=key,
            data={"graphData": None, "height": height, "theme": theme},
        )
    return sigma_graph(graphData, height=height, theme=theme, key=key)
