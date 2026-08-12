from __future__ import annotations

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


def test_sigma_graph_serializes_advanced_display_and_layout_config(monkeypatch):
    import st_sigma

    monkeypatch.setattr(st_sigma, "_component_func", lambda **kwargs: kwargs)
    config = GraphConfig(
        display=DisplayConfig(
            node_labels="hover",
            edge_labels="hidden",
            properties_panel="cards",
            show_legend=False,
        ),
        layout=LayoutConfig(
            name="circular",
            iterations=42,
            dynamic_after_drag=True,
        ),
    )

    result = st_sigma.sigma_graph(
        {"nodes": [], "edges": []},
        config=config,
        layout="random",
    )

    assert result["data"]["config"]["display"]["node_labels"] == "hover"
    assert result["data"]["config"]["display"]["show_legend"] is False
    assert result["data"]["config"]["layout"]["name"] == "random"
    assert result["data"]["config"]["layout"]["iterations"] == 42


@pytest.mark.parametrize(
    ("factory", "message"),
    [
        (lambda: DisplayConfig(edge_labels="sometimes"), "edge_labels"),
        (lambda: DisplayConfig(selection_dimming=2), "selection_dimming"),
        (lambda: LayoutConfig(name="grid"), "layout name"),
        (lambda: LayoutConfig(drag_relaxation_ms=-1), "drag_relaxation_ms"),
    ],
)
def test_config_validation_explains_invalid_values(factory, message):
    with pytest.raises(ValueError, match=message):
        factory()
