from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Literal


NodeLabelMode = Literal["auto", "hover", "hidden"]
EdgeLabelMode = Literal["always", "hover", "hidden"]
PropertiesPanelMode = Literal["compact", "cards", "hidden"]
LayoutName = Literal[
    "forceatlas2",
    "force",
    "circular",
    "circlepack",
    "grid",
    "concentric",
    "hierarchical",
    "random",
    "none",
]
DragSolver = Literal["force", "forceatlas2"]
HierarchyDirection = Literal["TB", "BT", "LR", "RL"]


@dataclass(frozen=True)
class DisplayConfig:
    """Controls labels, overlays, and selection rendering."""

    node_labels: NodeLabelMode = "auto"
    edge_labels: EdgeLabelMode = "hover"
    node_label_size: int = 12
    edge_label_size: int = 9
    label_density: float = 0.8
    label_rendered_size_threshold: float = 6
    label_font_family: str = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    label_font_url: str | None = None
    show_legend: bool = True
    legend_collapsed: bool = True
    properties_panel: PropertiesPanelMode = "compact"
    selection_dimming: float = 0.68
    hide_edges_on_move: bool = False

    def __post_init__(self) -> None:
        if self.node_labels not in {"auto", "hover", "hidden"}:
            raise ValueError("node_labels must be 'auto', 'hover', or 'hidden'.")
        if self.edge_labels not in {"always", "hover", "hidden"}:
            raise ValueError("edge_labels must be 'always', 'hover', or 'hidden'.")
        if self.properties_panel not in {"compact", "cards", "hidden"}:
            raise ValueError("properties_panel must be 'compact', 'cards', or 'hidden'.")
        if self.node_label_size <= 0 or self.edge_label_size <= 0:
            raise ValueError("Label sizes must be positive.")
        if not self.label_font_family.strip():
            raise ValueError("label_font_family must not be empty.")
        if self.label_font_url is not None and not self.label_font_url.strip():
            raise ValueError("label_font_url must be None or a non-empty stylesheet URL.")
        if not 0 <= self.label_density <= 1:
            raise ValueError("label_density must be between 0 and 1.")
        if not 0 <= self.selection_dimming <= 1:
            raise ValueError("selection_dimming must be between 0 and 1.")


@dataclass(frozen=True)
class LayoutConfig:
    """Controls initial placement and optional post-drag relaxation."""

    name: LayoutName = "forceatlas2"
    iterations: int = 100
    gravity: float = 1.0
    scaling_ratio: float = 10.0
    lin_log_mode: bool = False
    strong_gravity_mode: bool = False
    dynamic_after_drag: bool = False
    drag_solver: DragSolver = "force"
    drag_relaxation_ms: int = 1000
    hierarchy_direction: HierarchyDirection = "TB"

    def __post_init__(self) -> None:
        if self.name not in {
            "forceatlas2",
            "force",
            "circular",
            "circlepack",
            "grid",
            "concentric",
            "hierarchical",
            "random",
            "none",
        }:
            raise ValueError("Unsupported layout name.")
        if self.drag_solver not in {"force", "forceatlas2"}:
            raise ValueError("drag_solver must be 'force' or 'forceatlas2'.")
        if self.hierarchy_direction not in {"TB", "BT", "LR", "RL"}:
            raise ValueError("hierarchy_direction must be 'TB', 'BT', 'LR', or 'RL'.")
        if self.iterations < 0:
            raise ValueError("iterations must be non-negative.")
        if self.gravity < 0 or self.scaling_ratio <= 0:
            raise ValueError("gravity must be non-negative and scaling_ratio positive.")
        if self.drag_relaxation_ms < 0:
            raise ValueError("drag_relaxation_ms must be non-negative.")


@dataclass(frozen=True)
class GraphConfig:
    """Advanced component configuration grouped by concern."""

    display: DisplayConfig = field(default_factory=DisplayConfig)
    layout: LayoutConfig = field(default_factory=LayoutConfig)


def resolve_config(
    config: GraphConfig | None,
    layout: LayoutName | LayoutConfig | None,
) -> GraphConfig:
    resolved = config or GraphConfig()
    if layout is None:
        return resolved
    if isinstance(layout, LayoutConfig):
        return replace(resolved, layout=layout)
    return replace(resolved, layout=replace(resolved.layout, name=layout))
