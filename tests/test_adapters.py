from __future__ import annotations

import inspect
from dataclasses import fields

import networkx as nx
import pandas as pd
import pytest

from st_sigma import (
    DisplayConfig,
    GraphConfig,
    LayoutConfig,
    from_dataframes,
    from_mapping,
    from_networkx,
    normalize_graph,
)


def test_mapping_normalizes_legacy_and_canonical_fields():
    graph = from_mapping({
        "nodes": [{"identity": 1, "labels": ["Person"], "properties": {"name": "Ada"}}],
        "relationships": [{"identity": 2, "start": 1, "end": 1, "type": "KNOWS", "properties": {}}],
    })

    assert graph["nodes"][0] == {"id": "1", "labels": ["Person"], "properties": {"name": "Ada"}}
    assert graph["edges"][0]["source"] == "1"
    assert graph["edges"][0]["directed"] is True


def test_networkx_graph_is_accepted_directly():
    graph = nx.Graph()
    graph.add_node("alice", label="Person", name="Alice")
    graph.add_node("bob", labels=["Person", "Engineer"], name="Bob")
    graph.add_edge("alice", "bob", type="KNOWS", since=2020)

    converted = from_networkx(graph)

    assert converted["nodes"][1]["labels"] == ["Person", "Engineer"]
    assert converted["edges"][0]["type"] == "KNOWS"
    assert converted["edges"][0]["directed"] is False
    assert normalize_graph(graph) == converted


def test_dataframes_are_accepted_as_node_and_edge_tables():
    nodes = pd.DataFrame([{"id": "p1", "label": "Person", "name": "Ada"}])
    edges = pd.DataFrame([{"id": "r1", "source": "p1", "target": "p1", "type": "KNOWS"}])

    converted = from_dataframes(nodes, edges)

    assert converted["nodes"][0]["properties"] == {"name": "Ada"}
    assert converted["edges"][0]["id"] == "r1"
    assert normalize_graph(nodes, edges=edges) == converted


def test_dataframes_explain_missing_structural_columns():
    with pytest.raises(ValueError, match="source"):
        from_dataframes(pd.DataFrame([{"id": 1}]), pd.DataFrame([{"target": 1}]))


def test_dataframe_missing_values_are_removed_from_properties():
    nodes = pd.DataFrame([
        {"id": "p1", "label": "Person", "name": "Ada", "optional": pd.NA},
    ])
    edges = pd.DataFrame(columns=["source", "target"])

    converted = from_dataframes(nodes, edges)

    assert converted["nodes"][0]["properties"] == {"name": "Ada"}


def test_sigma_graph_rejects_unknown_theme(monkeypatch):
    import st_sigma

    monkeypatch.setattr(st_sigma, "_component_func", lambda **kwargs: kwargs)

    with pytest.raises(ValueError, match="streamlit.*humanistic"):
        st_sigma.sigma_graph({"nodes": [], "edges": []}, theme="neon")


def test_sigma_graph_passes_normalized_data_and_theme(monkeypatch):
    import st_sigma

    monkeypatch.setattr(st_sigma, "_component_func", lambda **kwargs: kwargs)
    result = st_sigma.sigma_graph(
        {"nodes": [{"id": "1", "label": "Person"}], "edges": []},
        theme="humanistic",
        key="graph",
    )

    assert result["key"] == "graph"
    assert result["data"]["theme"] == "humanistic"
    assert result["data"]["graphData"]["nodes"][0]["labels"] == ["Person"]
    assert result["data"]["config"]["display"]["edge_labels"] == "hover"
    assert result["data"]["config"]["display"]["properties_panel"] == "compact"
    assert result["data"]["config"]["display"]["node_size_mode"] == "auto"
    assert result["data"]["config"]["display"]["node_size"] == 10
    assert result["data"]["config"]["layout"]["dynamic_after_drag"] is True


def test_post_drag_relaxation_is_enabled_by_default():
    assert LayoutConfig().dynamic_after_drag is True


def test_sigma_graph_serializes_advanced_display_and_layout_config(monkeypatch):
    import st_sigma

    monkeypatch.setattr(st_sigma, "_component_func", lambda **kwargs: kwargs)
    config = GraphConfig(
        display=DisplayConfig(
            node_labels="hover",
            edge_labels="hidden",
            label_font_family="'IBM Plex Sans', sans-serif",
            label_font_url="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans",
            properties_panel="cards",
            show_legend=False,
        ),
        layout=LayoutConfig(
            name="hierarchical",
            iterations=42,
            dynamic_after_drag=True,
            drag_solver="force",
            hierarchy_direction="LR",
        ),
    )

    result = st_sigma.sigma_graph(
        {"nodes": [], "edges": []},
        config=config,
        layout="random",
    )

    assert result["data"]["config"]["display"]["node_labels"] == "hover"
    assert result["data"]["config"]["display"]["show_legend"] is False
    assert result["data"]["config"]["display"]["label_font_family"].startswith("'IBM")
    assert result["data"]["config"]["layout"]["name"] == "random"
    assert result["data"]["config"]["layout"]["iterations"] == 42
    assert result["data"]["config"]["layout"]["drag_solver"] == "force"
    assert result["data"]["config"]["layout"]["hierarchy_direction"] == "LR"


@pytest.mark.parametrize(
    ("factory", "message"),
    [
        (lambda: DisplayConfig(edge_labels="sometimes"), "edge_labels"),
        (lambda: DisplayConfig(selection_dimming=2), "selection_dimming"),
        (lambda: DisplayConfig(label_font_family="  "), "label_font_family"),
        (lambda: DisplayConfig(node_size_mode="relative"), "node_size_mode"),
        (lambda: DisplayConfig(node_size=0), "node_size"),
        (lambda: LayoutConfig(name="spiral"), "layout name"),
        (lambda: LayoutConfig(drag_solver="spring"), "drag_solver"),
        (lambda: LayoutConfig(hierarchy_direction="diagonal"), "hierarchy_direction"),
        (lambda: LayoutConfig(drag_relaxation_ms=-1), "drag_relaxation_ms"),
    ],
)
def test_config_validation_explains_invalid_values(factory, message):
    with pytest.raises(ValueError, match=message):
        factory()


@pytest.mark.parametrize("config_type", [DisplayConfig, LayoutConfig, GraphConfig])
def test_config_docstrings_cover_every_public_field(config_type):
    docstring = inspect.getdoc(config_type) or ""
    missing = [field.name for field in fields(config_type) if field.name not in docstring]

    assert missing == []
