from __future__ import annotations

import math
from collections.abc import Mapping
from typing import Any

from .schema import PropertyGraph, PropertyGraphEdge, PropertyGraphNode


def serialize_value(value: Any) -> Any:
    """Return a JSON-safe representation of common graph property values."""
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if value is None:
        return None
    if value.__class__.__module__.startswith("pandas") and str(value) == "<NA>":
        return None
    if isinstance(value, (list, tuple, set)):
        return [serialize_value(item) for item in value]
    if isinstance(value, Mapping):
        return {str(key): serialize_value(item) for key, item in value.items()}
    if hasattr(value, "item"):
        try:
            return serialize_value(value.item())
        except (TypeError, ValueError):
            pass
    return value


def _properties(record: Mapping[str, Any], excluded: set[str]) -> dict[str, Any]:
    nested = record.get("properties")
    if isinstance(nested, Mapping):
        return serialize_value(dict(nested))
    return serialize_value(
        {
            key: value
            for key, value in record.items()
            if key not in excluded and not _is_missing(value)
        }
    )


def _is_missing(value: Any) -> bool:
    if value is None:
        return True
    try:
        missing = value != value
    except (TypeError, ValueError):
        return False
    return isinstance(missing, bool) and missing


def from_mapping(graph: Mapping[str, Any]) -> PropertyGraph:
    """Normalize canonical or legacy property-graph dictionaries."""
    raw_nodes = graph.get("nodes")
    raw_edges = graph.get("edges", graph.get("relationships"))
    if raw_nodes is None or raw_edges is None:
        raise ValueError("A graph mapping must contain 'nodes' and 'edges' (or legacy 'relationships').")

    nodes: list[PropertyGraphNode] = []
    for raw in raw_nodes:
        node_id = raw.get("id", raw.get("identity"))
        if node_id is None:
            raise ValueError("Every node requires an 'id'.")
        labels = raw.get("labels", raw.get("label", ["Node"]))
        if _is_missing(labels):
            labels = ["Node"]
        if isinstance(labels, str):
            labels = [labels]
        elif not isinstance(labels, (list, tuple, set)):
            labels = [labels]
        nodes.append({
            "id": str(node_id),
            "labels": [str(label) for label in labels] or ["Node"],
            "properties": _properties(raw, {"id", "identity", "label", "labels", "properties"}),
        })

    edges: list[PropertyGraphEdge] = []
    for index, raw in enumerate(raw_edges):
        source = raw.get("source", raw.get("start"))
        target = raw.get("target", raw.get("end"))
        if source is None or target is None:
            raise ValueError("Every edge requires 'source' and 'target'.")
        edges.append({
            "id": str(raw.get("id", raw.get("identity", f"edge-{index}"))),
            "source": str(source),
            "target": str(target),
            "type": str(raw.get("type", raw.get("label", "CONNECTED_TO"))),
            "properties": _properties(raw, {"id", "identity", "source", "target", "start", "end", "type", "label", "directed", "properties"}),
            "directed": bool(raw.get("directed", True)),
        })
    return {"nodes": nodes, "edges": edges}


def from_neo4j(graph: Any) -> PropertyGraph:
    """Convert a ``neo4j.graph.Graph``-like value without importing Neo4j."""
    nodes = [{
        "id": str(node.element_id),
        "labels": sorted(str(label) for label in node.labels),
        "properties": serialize_value(dict(node)),
    } for node in graph.nodes]
    edges = [{
        "id": str(rel.element_id),
        "source": str(rel.start_node.element_id),
        "target": str(rel.end_node.element_id),
        "type": str(rel.type),
        "properties": serialize_value(dict(rel)),
        "directed": True,
    } for rel in graph.relationships]
    return {"nodes": nodes, "edges": edges}


def from_networkx(graph: Any) -> PropertyGraph:
    """Convert a NetworkX Graph, DiGraph, MultiGraph, or MultiDiGraph."""
    directed = bool(graph.is_directed())
    nodes: list[PropertyGraphNode] = []
    for node_id, attributes in graph.nodes(data=True):
        properties = serialize_value(dict(attributes))
        raw_labels = properties.pop("labels", properties.pop("label", "Node"))
        labels = (
            list(raw_labels)
            if isinstance(raw_labels, (list, tuple, set))
            else [raw_labels]
        )
        properties.setdefault("name", str(node_id))
        nodes.append({"id": str(node_id), "labels": [str(item) for item in labels], "properties": properties})

    raw_edges = graph.edges(keys=True, data=True) if graph.is_multigraph() else (
        (source, target, index, data)
        for index, (source, target, data) in enumerate(graph.edges(data=True))
    )
    edges: list[PropertyGraphEdge] = []
    for source, target, key, attributes in raw_edges:
        properties = serialize_value(dict(attributes))
        edge_type = str(properties.pop("type", properties.pop("label", "CONNECTED_TO")))
        edge_id = properties.pop("id", f"{source}-{target}-{key}")
        edges.append({"id": str(edge_id), "source": str(source), "target": str(target), "type": edge_type, "properties": properties, "directed": directed})
    return {"nodes": nodes, "edges": edges}


def from_dataframes(nodes: Any, edges: Any) -> PropertyGraph:
    """Convert node and edge DataFrames using conventional property columns."""
    node_columns = set(nodes.columns)
    edge_columns = set(edges.columns)
    if "id" not in node_columns:
        raise ValueError("nodes DataFrame requires an 'id' column.")
    if missing := {"source", "target"} - edge_columns:
        raise ValueError(f"edges DataFrame is missing columns: {sorted(missing)}")
    return from_mapping({"nodes": nodes.to_dict(orient="records"), "edges": edges.to_dict(orient="records")})


def normalize_graph(graph: Any, *, edges: Any = None) -> PropertyGraph:
    """Dispatch supported graph inputs to the canonical property-graph schema."""
    if edges is not None:
        if hasattr(graph, "columns") and hasattr(edges, "columns"):
            return from_dataframes(graph, edges)
        raise TypeError("The 'edges' argument is only valid with a nodes DataFrame.")
    if isinstance(graph, Mapping):
        return from_mapping(graph)
    if hasattr(graph, "relationships") and hasattr(graph, "nodes"):
        return from_neo4j(graph)
    if hasattr(graph, "nodes") and hasattr(graph, "edges") and hasattr(graph, "is_directed"):
        return from_networkx(graph)
    raise TypeError("Unsupported graph input. Pass a property-graph mapping, NetworkX graph, Neo4j graph result, or nodes/edges DataFrames.")
