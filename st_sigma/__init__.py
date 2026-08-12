from pathlib import Path

import streamlit as st
from streamlit.errors import StreamlitAPIException


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
    import math
    import numpy as np

    # Neo4j Date/Time types
    if hasattr(val, "isoformat"):
        return val.isoformat()
    if isinstance(val, (float, np.floating)) and (math.isnan(val) or math.isinf(val)):
        return None
    if val is None or val is np.nan:
        return None
    if isinstance(val, (list, tuple)):
        return [serialize_neo4j_value(v) for v in val]
    if isinstance(val, dict):
        return {k: serialize_neo4j_value(v) for k, v in val.items()}
    return val


def neo4jgraph_to_sigma(result):
    """Convert a Neo4j graph result without requiring the Neo4j package."""
    nodes = []
    relationships = []

    for node in result.nodes:
        nodes.append(
            {
                "identity": node.element_id,
                "labels": list(node.labels),
                "properties": {
                    key: serialize_neo4j_value(value)
                    for key, value in dict(node).items()
                },
            }
        )

    for relationship in result.relationships:
        relationships.append(
            {
                "identity": relationship.element_id,
                "start": relationship.start_node.element_id,
                "end": relationship.end_node.element_id,
                "type": relationship.type,
                "properties": {
                    key: serialize_neo4j_value(value)
                    for key, value in dict(relationship).items()
                },
            }
        )

    return {"nodes": nodes, "relationships": relationships}

def st_sigmagraph(graphData=None, height=600, key=None):
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
    return _component_func(
        key=key,
        data={"graphData": graphData, "height": height},
    )
