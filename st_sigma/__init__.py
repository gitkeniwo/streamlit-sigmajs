import base64
from collections.abc import Callable
from dataclasses import asdict
from pathlib import Path
from typing import Any, Literal

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
from .config import DisplayConfig, GraphConfig, LayoutConfig, resolve_config

__all__ = [
    "PropertyGraph",
    "PropertyGraphEdge",
    "PropertyGraphNode",
    "DisplayConfig",
    "GraphConfig",
    "LayoutConfig",
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


def _inline_javascript_with_chunks(build_dir: Path, entry_file: Path) -> str:
    """Inline relative Vite chunks for the editable-install fallback.

    This development-only path uses ``data:`` module imports. Deployments with
    a CSP that blocks ``data:`` scripts should use the packaged manifest assets.
    """
    javascript = entry_file.read_text(encoding="utf-8")
    for chunk in build_dir.glob("*.js"):
        if chunk == entry_file:
            continue
        relative_reference = f'"./{chunk.name}"'
        if relative_reference not in javascript:
            continue
        encoded = base64.b64encode(chunk.read_bytes()).decode("ascii")
        javascript = javascript.replace(
            relative_reference,
            f'"data:text/javascript;base64,{encoded}"',
        )
    return javascript


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
            js=_inline_javascript_with_chunks(build_dir, js_files[0]),
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


def sigma_graph(
    graph: object,
    *,
    edges: object | None = None,
    height: int = 600,
    theme: Literal["streamlit", "humanistic"] = "streamlit",
    layout: str | LayoutConfig | None = None,
    config: GraphConfig | None = None,
    key: str | None = None,
    on_clicked_change: Callable[[], None] | None = None,
    on_selection_change: Callable[[], None] | None = None,
) -> Any:
    """Render an interactive property graph in a Streamlit app.

    Parameters
    ----------
    graph : object
        Graph data in one of the supported forms:

        - a canonical or legacy property-graph mapping;
        - a NetworkX ``Graph``, ``DiGraph``, ``MultiGraph``, or
          ``MultiDiGraph``;
        - a ``neo4j.graph.Graph``-like value, including output produced with
          ``result_transformer_=neo4j.Result.graph``;
        - a pandas node DataFrame when ``edges`` is also supplied.

        Inputs are normalized automatically; no adapter call is required.
    edges : object or None, default=None
        Edge DataFrame paired with a node DataFrame passed as ``graph``.
        Nodes require an ``id`` column. Edges require ``source`` and
        ``target`` columns. Do not set this argument for other graph types.
    height : int, default=600
        Graph canvas height in CSS pixels.
    theme : {"streamlit", "humanistic"}, default="streamlit"
        Visual theme. ``"streamlit"`` follows the host application's theme
        variables. ``"humanistic"`` uses warm surfaces and a muted palette.
    layout : str, LayoutConfig, or None, default=None
        Convenient layout override. A preset string changes only
        ``config.layout.name``; a :class:`LayoutConfig` replaces the entire
        layout section. Supported preset names are ``"forceatlas2"``,
        ``"force"``, ``"circular"``, ``"circlepack"``, ``"grid"``,
        ``"concentric"``, ``"hierarchical"``, ``"random"``, and ``"none"``.
    config : GraphConfig or None, default=None
        Advanced display and layout configuration. Defaults to
        :class:`GraphConfig` when omitted.
    key : str or None, default=None
        Stable Streamlit component key. Supply a unique key when rendering
        multiple graphs or when the same graph survives application reruns.
    on_clicked_change : callable or None, default=None
        Optional Streamlit callback invoked after a node or edge click. Read
        ``result.clicked`` for ``{"type": "node" | "edge", "id": str}``.
    on_selection_change : callable or None, default=None
        Optional Streamlit callback invoked when the current selection changes.
        Read ``result.selection`` for ``{"nodes": [...], "edges": [...]}``.

    Returns
    -------
    streamlit.components.v2.component.ComponentResult
        Component state with a one-rerun ``clicked`` trigger and persistent
        ``selection`` containing selected node and edge IDs.

    Raises
    ------
    TypeError
        If ``graph`` is unsupported or ``edges`` is used without DataFrames.
    ValueError
        If ``theme`` or a configuration option is invalid, or required graph
        columns and identifiers are missing.

    Examples
    --------
    >>> sigma_graph(graph, theme="streamlit", layout="forceatlas2", key="kg")  # doctest: +SKIP

    See Also
    --------
    GraphConfig : Top-level advanced configuration.
    DisplayConfig : Label, legend, inspector, and selection configuration.
    LayoutConfig : Initial layout and post-drag relaxation configuration.
    """
    if theme not in {"streamlit", "humanistic"}:
        raise ValueError("theme must be 'streamlit' or 'humanistic'.")
    graph_data = normalize_graph(graph, edges=edges)
    resolved_config = resolve_config(config, layout)
    component_args: dict[str, Any] = {
        "key": key,
        "data": {
            "graphData": graph_data,
            "height": height,
            "theme": theme,
            "config": asdict(resolved_config),
        },
    }
    if on_clicked_change is not None:
        component_args["on_clicked_change"] = on_clicked_change
    if on_selection_change is not None:
        component_args["on_selection_change"] = on_selection_change
    return _component_func(**component_args)


def st_sigmagraph(graphData=None, height=600, theme="humanistic", key=None):
    """Render a graph with the legacy v0.1 API.

    New applications should use :func:`sigma_graph`, which accepts NetworkX,
    Neo4j, DataFrames, and canonical property-graph mappings directly.

    Parameters
    ----------
    graphData: dict or None
        Graph data containing ``nodes`` and ``relationships``. Use
        :func:`neo4jgraph_to_sigma` to convert a Neo4j graph result.
    height: int
        Component height in pixels.
    theme: {"streamlit", "humanistic"}
        Visual theme. The compatibility default is ``"humanistic"``.
    key: str or None
        An optional key that uniquely identifies this component. If this is
        None, and the component's arguments are changed, the component will
        be re-mounted in the Streamlit frontend and lose its current state.

    Returns
    -------
    streamlit.components.v2.component.ComponentResult
        Component state including click and selection values.

    """
    if graphData is None:
        return _component_func(
            key=key,
            data={"graphData": None, "height": height, "theme": theme},
        )
    return sigma_graph(graphData, height=height, theme=theme, key=key)
