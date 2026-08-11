"""Small, public graph examples for the Streamlit gallery.

The conversion helpers in this module deliberately live outside the package.
They demonstrate the intended v0.2 adapters without making them public API
before that API has been designed and tested.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import networkx as nx
import pandas as pd

SigmaGraph = dict[str, list[dict[str, Any]]]


def networkx_to_sigma(
    graph: nx.Graph,
    *,
    node_label: Callable[[Any, dict[str, Any]], str] | None = None,
    node_type: Callable[[Any, dict[str, Any]], str] | None = None,
) -> SigmaGraph:
    """Convert a NetworkX graph to the component's current wire format."""
    nodes: list[dict[str, Any]] = []
    relationships: list[dict[str, Any]] = []

    for node_id, attributes in graph.nodes(data=True):
        properties = dict(attributes)
        properties.setdefault(
            "name",
            node_label(node_id, properties) if node_label else str(node_id),
        )
        properties.setdefault("size", 8 + min(graph.degree(node_id), 12))
        label = node_type(node_id, properties) if node_type else "Node"
        nodes.append(
            {
                "identity": str(node_id),
                "labels": [label],
                "properties": properties,
            }
        )

    for index, (source, target, attributes) in enumerate(graph.edges(data=True)):
        properties = dict(attributes)
        relationships.append(
            {
                "identity": f"edge-{index}",
                "start": str(source),
                "end": str(target),
                "type": str(properties.pop("type", "CONNECTED_TO")),
                "properties": properties,
            }
        )

    return {"nodes": nodes, "relationships": relationships}


def dataframes_to_sigma(
    nodes: pd.DataFrame,
    relationships: pd.DataFrame,
) -> SigmaGraph:
    """Convert two property tables to the current graph wire format."""
    required_node_columns = {"id", "label", "name"}
    required_edge_columns = {"id", "source", "target", "type"}
    if missing := required_node_columns - set(nodes.columns):
        raise ValueError(f"nodes DataFrame is missing columns: {sorted(missing)}")
    if missing := required_edge_columns - set(relationships.columns):
        raise ValueError(
            f"relationships DataFrame is missing columns: {sorted(missing)}"
        )

    sigma_nodes = []
    for record in nodes.to_dict(orient="records"):
        sigma_nodes.append(
            {
                "identity": str(record.pop("id")),
                "labels": [str(record.pop("label"))],
                "properties": record,
            }
        )

    sigma_relationships = []
    for record in relationships.to_dict(orient="records"):
        sigma_relationships.append(
            {
                "identity": str(record.pop("id")),
                "start": str(record.pop("source")),
                "end": str(record.pop("target")),
                "type": str(record.pop("type")),
                "properties": record,
            }
        )

    return {"nodes": sigma_nodes, "relationships": sigma_relationships}


def karate_club() -> SigmaGraph:
    graph = nx.karate_club_graph()
    return networkx_to_sigma(
        graph,
        node_label=lambda node_id, data: f"Member {node_id}",
        node_type=lambda _node_id, data: str(data["club"]),
    )


def davis_southern_women() -> SigmaGraph:
    """Build the Davis graph through DataFrames to exercise tabular input."""
    graph = nx.davis_southern_women_graph()
    women = set(graph.graph["top"])

    node_records = [
        {
            "id": node_id,
            "label": "Woman" if node_id in women else "Event",
            "name": str(node_id),
            "size": 8 + min(graph.degree(node_id), 12),
            "bipartite": 0 if node_id in women else 1,
        }
        for node_id in graph.nodes
    ]
    edge_records = [
        {
            "id": f"attendance-{index}",
            "source": source,
            "target": target,
            "type": "ATTENDED",
        }
        for index, (source, target) in enumerate(graph.edges)
    ]
    return dataframes_to_sigma(
        pd.DataFrame(node_records),
        pd.DataFrame(edge_records),
    )


def les_miserables() -> SigmaGraph:
    graph = nx.les_miserables_graph()
    return networkx_to_sigma(
        graph,
        node_type=lambda _node_id, _data: "Character",
    )


def supply_chain() -> SigmaGraph:
    """An original, license-safe property graph with typed relationships."""
    node_specs = [
        ("mine-nl", "Supplier", "Limburg Silica", "Netherlands", 15),
        ("mine-se", "Supplier", "Nordic Lithium", "Sweden", 15),
        ("fab-de", "Factory", "Rhine Cell Fab", "Germany", 18),
        ("fab-pl", "Factory", "Vistula Pack Assembly", "Poland", 18),
        ("port-rtm", "Port", "Port of Rotterdam", "Netherlands", 14),
        ("warehouse-be", "Warehouse", "Antwerp Hub", "Belgium", 14),
        ("product-city", "Product", "City Battery", "Europe", 20),
        ("product-grid", "Product", "Grid Storage Pack", "Europe", 20),
        ("customer-transit", "Customer", "Metro Transit", "France", 16),
        ("customer-utility", "Customer", "North Sea Utility", "Denmark", 16),
    ]
    nodes = [
        {
            "identity": node_id,
            "labels": [label],
            "properties": {
                "name": name,
                "country": country,
                "size": size,
                "example": "synthetic",
            },
        }
        for node_id, label, name, country, size in node_specs
    ]

    edge_specs = [
        ("s1", "mine-nl", "fab-de", "SUPPLIES", {"material": "silica", "lead_days": 3}),
        ("s2", "mine-se", "fab-de", "SUPPLIES", {"material": "lithium", "lead_days": 6}),
        ("s3", "fab-de", "port-rtm", "SHIPS_VIA", {"mode": "rail", "lead_days": 2}),
        ("s4", "port-rtm", "fab-pl", "SHIPS_TO", {"mode": "barge", "lead_days": 4}),
        ("s5", "fab-pl", "product-city", "ASSEMBLES", {"annual_capacity": 12000}),
        ("s6", "fab-pl", "product-grid", "ASSEMBLES", {"annual_capacity": 5000}),
        ("s7", "product-city", "warehouse-be", "STORED_AT", {"stock": 380}),
        ("s8", "product-grid", "warehouse-be", "STORED_AT", {"stock": 95}),
        ("s9", "warehouse-be", "customer-transit", "DELIVERS_TO", {"sla_days": 2}),
        ("s10", "warehouse-be", "customer-utility", "DELIVERS_TO", {"sla_days": 3}),
        ("s11", "mine-se", "port-rtm", "SHIPS_VIA", {"mode": "sea", "lead_days": 5}),
    ]
    relationships = [
        {
            "identity": edge_id,
            "start": source,
            "end": target,
            "type": edge_type,
            "properties": properties,
        }
        for edge_id, source, target, edge_type, properties in edge_specs
    ]
    return {"nodes": nodes, "relationships": relationships}


EXAMPLES: dict[str, tuple[str, Callable[[], SigmaGraph]]] = {
    "Synthetic supply chain": (
        "Original property graph with typed, directed relationships and properties.",
        supply_chain,
    ),
    "NetworkX — Karate Club": (
        "Community attributes from NetworkX's built-in Karate Club graph.",
        karate_club,
    ),
    "DataFrames — Davis Southern Women": (
        "A bipartite NetworkX graph converted through node and edge DataFrames.",
        davis_southern_women,
    ),
    "NetworkX — Les Misérables": (
        "A weighted character co-appearance graph for a denser layout.",
        les_miserables,
    ),
}
