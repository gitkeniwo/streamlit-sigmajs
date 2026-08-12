from __future__ import annotations

from typing import Any, TypedDict


class PropertyGraphNode(TypedDict):
    id: str
    labels: list[str]
    properties: dict[str, Any]


class PropertyGraphEdge(TypedDict):
    id: str
    source: str
    target: str
    type: str
    properties: dict[str, Any]
    directed: bool


class PropertyGraph(TypedDict):
    nodes: list[PropertyGraphNode]
    edges: list[PropertyGraphEdge]

