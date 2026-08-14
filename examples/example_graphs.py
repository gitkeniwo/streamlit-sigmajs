"""Small, public graph examples for the Streamlit gallery."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import networkx as nx
import pandas as pd


class Neo4jLikeNode(dict):
    def __init__(self, element_id: str, labels: list[str], **properties: Any):
        super().__init__(properties)
        self.element_id = element_id
        self.labels = set(labels)


class Neo4jLikeRelationship(dict):
    def __init__(
        self,
        element_id: str,
        start_node: Neo4jLikeNode,
        end_node: Neo4jLikeNode,
        relationship_type: str,
        **properties: Any,
    ):
        super().__init__(properties)
        self.element_id = element_id
        self.start_node = start_node
        self.end_node = end_node
        self.type = relationship_type


class Neo4jLikeGraph:
    """License-safe structural stand-in for ``neo4j.graph.Graph``."""

    def __init__(self, nodes: list[Neo4jLikeNode], relationships: list[Neo4jLikeRelationship]):
        self.nodes = nodes
        self.relationships = relationships


def movie_graph() -> Neo4jLikeGraph:
    people = [
        Neo4jLikeNode("person-ada", ["Person", "Researcher"], name="Ada", born=1815),
        Neo4jLikeNode("person-alan", ["Person", "Researcher"], name="Alan", born=1912),
        Neo4jLikeNode("person-grace", ["Person", "Engineer"], name="Grace", born=1906),
    ]
    works = [
        Neo4jLikeNode("work-engine", ["Work"], name="Analytical Engine Notes", year=1843),
        Neo4jLikeNode("work-computing", ["Work"], name="Computing Machinery", year=1950),
        Neo4jLikeNode("work-compiler", ["Work"], name="A-0 Compiler", year=1952),
    ]
    relationships = [
        Neo4jLikeRelationship("r1", people[0], works[0], "AUTHORED", role="translator and annotator"),
        Neo4jLikeRelationship("r2", people[1], works[1], "AUTHORED"),
        Neo4jLikeRelationship("r3", people[2], works[2], "CREATED"),
        Neo4jLikeRelationship("r4", people[0], people[1], "INSPIRED", domain="computing"),
        Neo4jLikeRelationship("r5", people[1], people[2], "CONTEMPORARY_OF"),
    ]
    return Neo4jLikeGraph(people + works, relationships)

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
        degree = graph.degree(node_id)
        data["name"] = str(node_id)
        data["label"] = (
            "Principal"
            if degree >= 15
            else "Supporting"
            if degree >= 5
            else "Minor"
        )
        data["size"] = 6 + min(degree, 18)
    return graph


def supply_chain() -> dict[str, list[dict[str, Any]]]:
    """An original, license-safe property graph with typed relationships."""
    node_specs = [
        ("mine-nl", "Supplier", "Limburg Silica", "Netherlands", 15, -4, 2),
        ("mine-se", "Supplier", "Nordic Lithium", "Sweden", 15, -4, -2),
        ("fab-de", "Factory", "Rhine Cell Fab", "Germany", 18, -2, 1),
        ("fab-pl", "Factory", "Vistula Pack Assembly", "Poland", 18, 0, -1),
        ("port-rtm", "Port", "Port of Rotterdam", "Netherlands", 14, 0, 2),
        ("warehouse-be", "Warehouse", "Antwerp Hub", "Belgium", 14, 4, -1),
        ("product-city", "Product", "City Battery", "Europe", 20, 2, 0),
        ("product-grid", "Product", "Grid Storage Pack", "Europe", 20, 2, -2),
        ("customer-transit", "Customer", "Metro Transit", "France", 16, 6, 0),
        ("customer-utility", "Customer", "North Sea Utility", "Denmark", 16, 6, -2),
    ]
    nodes = [
        {
            "id": node_id,
            "labels": [label],
            "properties": {
                "name": name,
                "country": country,
                "size": size,
                "x": x,
                "y": y,
                "example": "synthetic",
            },
        }
        for node_id, label, name, country, size, x, y in node_specs
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
    "Neo4j-like — Computing pioneers": (
        "Neo4j Graph",
        "A small public-fact graph using the same structural interface as neo4j.graph.Graph.",
        movie_graph,
    ),
    "NetworkX — Les Misérables": (
        "NetworkX",
        "A weighted character co-appearance graph for a denser layout.",
        les_miserables,
    ),
}
