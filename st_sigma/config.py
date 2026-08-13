from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Literal


NodeLabelMode = Literal["auto", "hover", "hidden"]
EdgeLabelMode = Literal["always", "hover", "hidden"]
PropertiesPanelMode = Literal["compact", "cards", "hidden"]
NodeSizeMode = Literal["auto", "fixed"]
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
HierarchyDirection = Literal["TB", "BT", "LR", "RL"]


@dataclass(frozen=True)
class DisplayConfig:
    """Configure labels, overlays, inspectors, and selection rendering.

    Parameters
    ----------
    node_labels : {"auto", "hover", "hidden"}, default="auto"
        Control node-label visibility. ``"auto"`` lets Sigma render labels
        according to ``label_density`` and
        ``label_rendered_size_threshold``. ``"hover"`` only shows a label
        for a hovered or selected node, and ``"hidden"`` disables node
        labels.
    edge_labels : {"always", "hover", "hidden"}, default="hover"
        Control relationship-label visibility. ``"hover"`` shows the label
        for a hovered or selected edge.
    node_label_size : int, default=12
        Node-label font size in CSS pixels. Must be positive.
    node_size : float, default=10
        Default node radius in screen pixels. A positive ``size`` property on
        an individual node takes precedence.
    node_size_mode : {"auto", "fixed"}, default="auto"
        ``"auto"`` reduces the default node size when the graph is dense or
        its component is narrow. ``"fixed"`` always uses ``node_size``.
    edge_label_size : int, default=9
        Edge-label font size in CSS pixels. Must be positive.
    label_density : float, default=0.8
        Sigma label density from ``0`` to ``1``. Lower values reduce label
        clutter when ``node_labels="auto"``.
    label_rendered_size_threshold : float, default=6
        Minimum rendered node size at which an automatic node label is
        eligible to appear.
    label_font_family : str, default=system font stack
        CSS ``font-family`` value used by node labels, edge labels, and graph
        overlays. Local fonts can be used without ``label_font_url``.
    label_font_url : str or None, default=None
        Optional URL of a CSS stylesheet that defines the requested font,
        such as a Google Fonts stylesheet or a self-hosted ``@font-face``
        file. This is a stylesheet URL, not a direct font-file URL.
    show_legend : bool, default=True
        Show the node-type and relationship-type legend.
    legend_collapsed : bool, default=True
        Start the legend in its compact collapsed state. Has no effect when
        ``show_legend`` is false.
    properties_panel : {"compact", "cards", "hidden"}, default="compact"
        Choose the node and edge property inspector. ``"compact"`` uses a
        dense key/value layout, ``"cards"`` gives each property more space,
        and ``"hidden"`` disables the inspector.
    selection_dimming : float, default=0.68
        Strength used to fade unrelated nodes after selecting a node or edge.
        ``0`` keeps their original colors; ``1`` blends them fully into the
        graph background.
    hide_edges_on_move : bool, default=False
        Temporarily hide edges while the camera is panning or zooming. This
        can improve responsiveness for larger graphs.

    Notes
    -----
    ``DisplayConfig`` is immutable. Create a new instance when changing a
    setting between Streamlit reruns.
    """

    node_labels: NodeLabelMode = "auto"
    edge_labels: EdgeLabelMode = "hover"
    node_label_size: int = 12
    node_size: float = 10.0
    node_size_mode: NodeSizeMode = "auto"
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
        if self.node_size_mode not in {"auto", "fixed"}:
            raise ValueError("node_size_mode must be 'auto' or 'fixed'.")
        if self.node_label_size <= 0 or self.edge_label_size <= 0:
            raise ValueError("Label sizes must be positive.")
        if self.node_size <= 0:
            raise ValueError("node_size must be positive.")
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
    """Configure initial node placement and optional post-drag relaxation.

    Parameters
    ----------
    name : str, default="forceatlas2"
        Initial layout preset. Supported values are:

        - ``"forceatlas2"``: ForceAtlas2 placement for general networks.
        - ``"force"``: a simple force-directed layout suited to small graphs.
        - ``"circular"``: place every node on one circle.
        - ``"circlepack"``: pack nodes into circles grouped by primary label.
        - ``"grid"``: place nodes on a regular grid.
        - ``"concentric"``: place high-degree nodes near the center.
        - ``"hierarchical"``: a layered Dagre layout.
        - ``"random"``: assign random coordinates.
        - ``"none"``: preserve node ``x`` and ``y`` properties when supplied.

    iterations : int, default=100
        Number of synchronous iterations used by the initial
        ``"forceatlas2"`` or ``"force"`` layout. ``0`` skips iterative
        placement. This setting does not affect the other presets.
    gravity : float, default=1.0
        ForceAtlas2 gravity pulling disconnected regions toward the center.
        Must be non-negative. Used by the initial ForceAtlas2 layout.
    scaling_ratio : float, default=10.0
        ForceAtlas2 repulsion scaling. Larger values generally spread nodes
        farther apart. Must be positive.
    lin_log_mode : bool, default=False
        Enable ForceAtlas2 LinLog attraction, which can make clusters more
        distinct.
    strong_gravity_mode : bool, default=False
        Enable ForceAtlas2 strong gravity to keep distant components closer
        to the center.
    dynamic_after_drag : bool, default=True
        While a node is dragged, let nearby nodes respond dynamically. After
        release, keep the dragged node at the dropped position while the
        remaining nodes settle.
    drag_relaxation_ms : int, default=1000
        Maximum settling time after release in milliseconds. Relaxation stops
        early when the graph converges. ``0`` disables dynamic dragging and
        relaxation even when ``dynamic_after_drag`` is true.
    hierarchy_direction : {"TB", "BT", "LR", "RL"}, default="TB"
        Direction for the ``"hierarchical"`` layout: top-to-bottom,
        bottom-to-top, left-to-right, or right-to-left. Ignored by other
        layouts.

    Notes
    -----
    Initial placement and drag physics are independent. For example, the
    spring-damper solver deforms a circular graph locally and then restores its
    shape without replacing the selected initial layout.
    """

    name: LayoutName = "forceatlas2"
    iterations: int = 100
    gravity: float = 1.0
    scaling_ratio: float = 10.0
    lin_log_mode: bool = False
    strong_gravity_mode: bool = False
    dynamic_after_drag: bool = True
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
    """Group advanced settings for :func:`st_sigma.sigma_graph`.

    Parameters
    ----------
    display : DisplayConfig, default=DisplayConfig()
        Labels, overlays, inspectors, legend, and selection appearance.
    layout : LayoutConfig, default=LayoutConfig()
        Initial placement and post-drag layout behavior.

    Examples
    --------
    >>> config = GraphConfig(
    ...     display=DisplayConfig(edge_labels="hidden"),
    ...     layout=LayoutConfig(name="circular"),
    ... )
    """

    display: DisplayConfig = field(default_factory=DisplayConfig)
    layout: LayoutConfig = field(default_factory=LayoutConfig)


def resolve_config(
    config: GraphConfig | None,
    layout: LayoutName | LayoutConfig | None,
) -> GraphConfig:
    """Resolve the full configuration and an optional layout override.

    A string ``layout`` replaces only ``config.layout.name``. Passing a
    :class:`LayoutConfig` replaces the complete layout section. This helper is
    mainly useful to wrappers around :func:`st_sigma.sigma_graph`.
    """
    resolved = config or GraphConfig()
    if layout is None:
        return resolved
    if isinstance(layout, LayoutConfig):
        return replace(resolved, layout=layout)
    return replace(resolved, layout=replace(resolved.layout, name=layout))
