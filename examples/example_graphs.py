"""Small, public graph examples for the Streamlit gallery."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import networkx as nx
import pandas as pd

def karate_club() -> nx.Graph:
    graph = nx.karate_club_graph()
    for node_id, data in graph.nodes(data=True):
        data["name"] = f"Member {node_id}"
        data["label"] = str(data["club"])
        data["size"] = 8 + min(graph.degree(node_id), 12)
    return graph


def davis_southern_women() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Return separate node and edge property tables."""
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
    return pd.DataFrame(node_records), pd.DataFrame(edge_records)


def les_miserables() -> nx.Graph:
    graph = nx.les_miserables_graph()
    for node_id, data in graph.nodes(data=True):
        data["name"] = str(node_id)
        data["label"] = "Character"
    return graph


def supply_chain() -> dict[str, list[dict[str, Any]]]:
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
            "id": node_id,
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
    edges = [
        {
            "id": edge_id,
            "source": source,
            "target": target,
            "type": edge_type,
            "properties": properties,
        }
        for edge_id, source, target, edge_type, properties in edge_specs
    ]
    return {"nodes": nodes, "edges": edges}


EXAMPLES: dict[str, tuple[str, str, Callable[[], Any]]] = {
    "Synthetic supply chain": (
        "Property graph dict",
        "Original property graph with typed, directed relationships and properties.",
        supply_chain,
    ),
    "NetworkX — Karate Club": (
        "NetworkX",
        "Community attributes from NetworkX's built-in Karate Club graph.",
        karate_club,
    ),
    "DataFrames — Davis Southern Women": (
        "DataFrames",
        "A bipartite NetworkX graph converted through node and edge DataFrames.",
        davis_southern_women,
    ),
    "NetworkX — Les Misérables": (
        "NetworkX",
        "A weighted character co-appearance graph for a denser layout.",
        les_miserables,
    ),
}
