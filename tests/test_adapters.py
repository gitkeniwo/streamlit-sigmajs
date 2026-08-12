from __future__ import annotations

import networkx as nx
import pandas as pd
import pytest

from st_sigma import from_dataframes, from_mapping, from_networkx, normalize_graph


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
