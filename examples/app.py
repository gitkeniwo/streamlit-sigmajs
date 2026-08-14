"""Single-page playground for streamlit-sigmajs."""

from __future__ import annotations

from dataclasses import fields
from textwrap import dedent
from typing import Any

import streamlit as st

from example_graphs import EXAMPLES, supply_chain
from st_sigma import DisplayConfig, GraphConfig, LayoutConfig, normalize_graph, sigma_graph


st.set_page_config(
    page_title="streamlit-sigmajs",
    page_icon="🕸️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Keep content below Streamlit's fixed header.
st.markdown(
    """
    <style>
    [data-testid="stMainBlockContainer"] {
        padding: 4rem 1rem 0;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

MAX_CONCURRENT_GRAPHS = 4
LAYOUT_FAMILIES = {
    "Organic": ["forceatlas2", "force", "random"],
    "Geometric": ["circular", "circlepack", "concentric"],
    "Structured": ["grid", "hierarchical", "none"],
}
LAYOUTS = [name for layouts in LAYOUT_FAMILIES.values() for name in layouts]

FONT_PRESETS = {
    "System": (
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        None,
    ),
    "Space Grotesk": (
        "'Space Grotesk', sans-serif",
        "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&display=swap",
    ),
    "IBM Plex Sans": (
        "'IBM Plex Sans', sans-serif",
        "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap",
    ),
    "Georgia": ("Georgia, serif", None),
}


def split_input(value: Any) -> tuple[Any, Any | None]:
    """Separate a DataFrame pair from single-value graph inputs."""
    return value if isinstance(value, tuple) else (value, None)


def render_graph(
    value: Any,
    *,
    key: str,
    height: int = 500,
    theme: str = "streamlit",
    config: GraphConfig | None = None,
):
    """Render any gallery input and return the component's interaction state."""
    graph, edges = split_input(value)
    return sigma_graph(
        graph,
        edges=edges,
        height=height,
        theme=theme,
        config=config,
        key=key,
    )


def graph_metrics(value: Any) -> dict[str, int]:
    """Return compact metrics for a supported graph input."""
    graph, edges = split_input(value)
    normalized = normalize_graph(graph, edges=edges)
    return {
        "nodes": len(normalized["nodes"]),
        "edges": len(normalized["edges"]),
        "types": len(
            {label for node in normalized["nodes"] for label in node["labels"]}
        ),
    }


def quiet_display(**overrides: Any) -> DisplayConfig:
    """Create a low-clutter display preset for gallery thumbnails."""
    values = {
        "node_size_mode": "auto",
        "node_size": 10.0,
        "node_size_field": "size",
        "node_labels": "hover",
        "edge_labels": "hidden",
        "show_legend": False,
        "properties_panel": "hidden",
    }
    values.update(overrides)
    return DisplayConfig(**values)


def compare_display(**overrides: Any) -> DisplayConfig:
    """Show labels, relationship types, and the legend in comparisons."""
    values = {
        "node_size_field": "size",
        "node_labels": "auto",
        "edge_labels": "always",
        "edge_label_size": 8,
        "show_legend": True,
        "legend_collapsed": True,
        "properties_panel": "hidden",
    }
    values.update(overrides)
    return DisplayConfig(**values)


def supply_chain_layout() -> LayoutConfig:
    """Use the hand-authored left-to-right coordinates of the supply chain."""
    return LayoutConfig(
        name="none",
        node_x_field="x",
        node_y_field="y",
    )


def scenario_cards() -> list[dict[str, Any]]:
    """Build four task-oriented templates on deliberately different datasets."""
    scenarios = {
        "Knowledge graph": (
            "Relationship types on every edge; click a node for its properties",
            "Neo4j-like — Computing pioneers",
            DisplayConfig(
                edge_labels="always",
                edge_label_size=10,
                properties_panel="cards",
                show_legend=True,
                legend_collapsed=True,
            ),
            LayoutConfig(),
            "neo4j_graph",
            None,
        ),
        "Influence & hubs": (
            "Node size follows degree; only the hubs are named",
            "NetworkX — Les Misérables",
            DisplayConfig(
                node_size_field="size",
                label_rendered_size_threshold=14,
                node_label_size=14,
                edge_labels="hidden",
                properties_panel="hidden",
            ),
            LayoutConfig(scaling_ratio=20),
            "networkx_graph",
            None,
        ),
        "Categorical mapping": (
            "Colored by country instead of node type — any property works",
            "Synthetic supply chain",
            DisplayConfig(
                node_color_field="country",
                node_size_field="size",
                node_labels="auto",
                edge_labels="hidden",
                show_legend=True,
                legend_collapsed=False,
                properties_panel="hidden",
            ),
            supply_chain_layout(),
            "property_graph",
            None,
        ),
        "Clean topology": (
            "No text at all — structure only, for large graphs",
            "DataFrames — Davis Southern Women",
            DisplayConfig(
                node_size_field="size",
                node_labels="hidden",
                edge_labels="hidden",
                show_legend=False,
                properties_panel="hidden",
                hide_edges_on_move=True,
            ),
            LayoutConfig(scaling_ratio=20),
            "nodes_df",
            "edges_df",
        ),
    }
    return [
        {
            "title": title,
            "caption": caption,
            "value": EXAMPLES[dataset_name][2](),
            "key": (
                "compare-scenario-"
                f"{title.lower().replace(' ', '-').replace('&', 'and')}"
            ),
            "config": GraphConfig(display=display, layout=layout),
            "graph_expression": graph_expression,
            "edges_expression": edges_expression,
            "playground_dataset": dataset_name,
        }
        for title, (
            caption,
            dataset_name,
            display,
            layout,
            graph_expression,
            edges_expression,
        ) in scenarios.items()
    ]


def full_config_code(
    display: DisplayConfig,
    layout: LayoutConfig,
    *,
    graph_expression: str = "graph",
    edges_expression: str | None = None,
    height: int = 500,
    theme: str = "streamlit",
    key: str = "graph",
) -> str:
    """Return a copy-ready example with every public option explicit."""
    edges_value = edges_expression if edges_expression is not None else "None"
    return dedent(
        f"""
        from st_sigma import DisplayConfig, GraphConfig, LayoutConfig, sigma_graph

        config = GraphConfig(
            display=DisplayConfig(
                node_labels={display.node_labels!r},
                edge_labels={display.edge_labels!r},
                node_label_size={display.node_label_size!r},
                node_size={display.node_size!r},
                node_size_mode={display.node_size_mode!r},
                edge_label_size={display.edge_label_size!r},
                label_density={display.label_density!r},
                label_rendered_size_threshold={display.label_rendered_size_threshold!r},
                label_font_family={display.label_font_family!r},
                label_font_url={display.label_font_url!r},
                show_legend={display.show_legend!r},
                legend_collapsed={display.legend_collapsed!r},
                show_fullscreen_button={display.show_fullscreen_button!r},
                properties_panel={display.properties_panel!r},
                selection_dimming={display.selection_dimming!r},
                hide_edges_on_move={display.hide_edges_on_move!r},
                node_size_field={display.node_size_field!r},
                node_color_field={display.node_color_field!r},
                node_label_field={display.node_label_field!r},
            ),
            layout=LayoutConfig(
                name={layout.name!r},
                iterations={layout.iterations!r},
                gravity={layout.gravity!r},
                scaling_ratio={layout.scaling_ratio!r},
                lin_log_mode={layout.lin_log_mode!r},
                strong_gravity_mode={layout.strong_gravity_mode!r},
                dynamic_after_drag={layout.dynamic_after_drag!r},
                drag_relaxation_ms={layout.drag_relaxation_ms!r},
                hierarchy_direction={layout.hierarchy_direction!r},
                node_x_field={layout.node_x_field!r},
                node_y_field={layout.node_y_field!r},
            ),
        )

        sigma_graph(
            graph={graph_expression},
            edges={edges_value},
            height={height!r},
            theme={theme!r},
            layout=None,
            config=config,
            key={key!r},
        )
        """
    ).strip()


def minimal_config_code(
    config: GraphConfig,
    *,
    graph_expression: str = "graph",
    edges_expression: str | None = None,
    height: int,
    theme: str,
    key: str,
) -> str:
    """Return runnable code containing only configuration that changes defaults."""
    display_defaults = DisplayConfig()
    layout_defaults = LayoutConfig()
    display_values = [
        (field.name, getattr(config.display, field.name))
        for field in fields(config.display)
        if getattr(config.display, field.name)
        != getattr(display_defaults, field.name)
    ]
    layout_values = [
        (field.name, getattr(config.layout, field.name))
        for field in fields(config.layout)
        if getattr(config.layout, field.name) != getattr(layout_defaults, field.name)
    ]

    imports = {"sigma_graph"}
    setup_lines: list[str] = []
    call_arguments = [graph_expression]
    if edges_expression is not None:
        call_arguments.append(f"edges={edges_expression}")

    if not display_values and [name for name, _value in layout_values] == ["name"]:
        call_arguments.append(f"layout={layout_values[0][1]!r}")
    elif display_values or layout_values:
        imports.add("GraphConfig")
        config_lines = ["config = GraphConfig("]
        if display_values:
            imports.add("DisplayConfig")
            config_lines.append("    display=DisplayConfig(")
            config_lines.extend(
                f"        {name}={value!r}," for name, value in display_values
            )
            config_lines.append("    ),")
        if layout_values:
            imports.add("LayoutConfig")
            config_lines.append("    layout=LayoutConfig(")
            config_lines.extend(
                f"        {name}={value!r}," for name, value in layout_values
            )
            config_lines.append("    ),")
        config_lines.append(")")
        setup_lines.extend(config_lines)
        call_arguments.append("config=config")

    if height != 600:
        call_arguments.append(f"height={height!r}")
    if theme != "streamlit":
        call_arguments.append(f"theme={theme!r}")
    call_arguments.append(f"key={key!r}")

    import_order = ["DisplayConfig", "GraphConfig", "LayoutConfig", "sigma_graph"]
    import_names = ", ".join(name for name in import_order if name in imports)
    call = f"sigma_graph({', '.join(call_arguments)})"
    sections = [f"from st_sigma import {import_names}"]
    if setup_lines:
        sections.append("\n".join(setup_lines))
    sections.append(call)
    return "\n\n".join(sections)


def _config_constructor(
    display_values: list[tuple[str, Any]],
    layout_values: list[tuple[str, Any]],
    *,
    variable_name: str,
) -> list[str]:
    """Build one named GraphConfig declaration for a shared code example."""
    lines = [f"{variable_name} = GraphConfig("]
    if display_values:
        lines.append("    display=DisplayConfig(")
        lines.extend(f"        {name}={value!r}," for name, value in display_values)
        lines.append("    ),")
    if layout_values:
        lines.append("    layout=LayoutConfig(")
        lines.extend(f"        {name}={value!r}," for name, value in layout_values)
        lines.append("    ),")
    lines.append(")")
    return lines


def compare_config_code(cards: list[dict[str, Any]]) -> str:
    """Return one deduplicated, runnable code sample for comparison cards."""
    display_defaults = DisplayConfig()
    layout_defaults = LayoutConfig()
    displays = [card["config"].display for card in cards]
    layouts = [card["config"].layout for card in cards]
    shared_display = all(display == displays[0] for display in displays)
    shared_layout = all(layout == layouts[0] for layout in layouts)
    imports = {"sigma_graph"}
    setup_lines: list[str] = []
    shared_config_name: str | None = None

    display_values = [
        (field.name, getattr(displays[0], field.name))
        for field in fields(displays[0])
        if getattr(displays[0], field.name)
        != getattr(display_defaults, field.name)
    ]
    layout_values = [
        (field.name, getattr(layouts[0], field.name))
        for field in fields(layouts[0])
        if getattr(layouts[0], field.name) != getattr(layout_defaults, field.name)
    ]

    if shared_display and (shared_layout or display_values):
        shared_layout_values = layout_values if shared_layout else []
        if display_values or shared_layout_values:
            shared_config_name = "config" if shared_layout else "base_config"
            imports.add("GraphConfig")
            if display_values:
                imports.add("DisplayConfig")
            if shared_layout_values:
                imports.add("LayoutConfig")
            setup_lines.extend(
                _config_constructor(
                    display_values,
                    shared_layout_values,
                    variable_name=shared_config_name,
                )
            )

    call_lines: list[str] = []
    emitted_config_count = 0
    for card in cards:
        call_arguments = [card.get("graph_expression", "graph")]
        edges_expression = card.get("edges_expression")
        if edges_expression is not None:
            call_arguments.append(f"edges={edges_expression}")

        card_display_values = [
            (field.name, getattr(card["config"].display, field.name))
            for field in fields(card["config"].display)
            if getattr(card["config"].display, field.name)
            != getattr(display_defaults, field.name)
        ]
        card_layout_values = [
            (field.name, getattr(card["config"].layout, field.name))
            for field in fields(card["config"].layout)
            if getattr(card["config"].layout, field.name)
            != getattr(layout_defaults, field.name)
        ]

        if shared_config_name is not None:
            call_arguments.append(f"config={shared_config_name}")
            if not shared_layout and card_layout_values:
                if [name for name, _value in card_layout_values] == ["name"]:
                    call_arguments.append(f"layout={card_layout_values[0][1]!r}")
                else:
                    imports.add("LayoutConfig")
                    values = ", ".join(
                        f"{name}={value!r}" for name, value in card_layout_values
                    )
                    call_arguments.append(f"layout=LayoutConfig({values})")
        elif card_display_values or card_layout_values:
            emitted_config_count += 1
            config_name = f"config_{emitted_config_count}"
            imports.add("GraphConfig")
            if card_display_values:
                imports.add("DisplayConfig")
            if card_layout_values:
                imports.add("LayoutConfig")
            if setup_lines:
                setup_lines.append("")
            setup_lines.extend(
                _config_constructor(
                    card_display_values,
                    card_layout_values,
                    variable_name=config_name,
                )
            )
            call_arguments.append(f"config={config_name}")

        call_arguments.append("height=430")
        theme = card.get("theme", "streamlit")
        if theme != "streamlit":
            call_arguments.append(f"theme={theme!r}")
        call_arguments.append(f"key={card['key']!r}")
        call_lines.extend(
            [f"# {card['title']}", f"sigma_graph({', '.join(call_arguments)})"]
        )

    import_order = ["DisplayConfig", "GraphConfig", "LayoutConfig", "sigma_graph"]
    import_names = ", ".join(name for name in import_order if name in imports)
    sections = [f"from st_sigma import {import_names}"]
    if setup_lines:
        sections.append("\n".join(setup_lines))
    sections.append("\n".join(call_lines))
    return "\n\n".join(sections)


def selection_summary(normalized: dict[str, Any], result: Any) -> str:
    """Build a readable summary of the current component selection."""
    selection = getattr(result, "selection", None) or {"nodes": [], "edges": []}
    clicked = getattr(result, "clicked", None)
    node_ids = list(selection.get("nodes", []))
    edge_ids = list(selection.get("edges", []))
    if not node_ids and not edge_ids and clicked:
        target = node_ids if clicked.get("type") == "node" else edge_ids
        target.append(clicked.get("id"))

    nodes = {node["id"]: node for node in normalized["nodes"]}
    edges = {edge["id"]: edge for edge in normalized["edges"]}
    if node_ids:
        node = nodes.get(node_ids[0])
        if node:
            name = node["properties"].get("name", node["id"])
            label = node["labels"][0] if node["labels"] else "Node"
            extra = len(node_ids) + len(edge_ids) - 1
            suffix = f" + {extra} more" if extra else ""
            return f"Selected: {name} ({label}){suffix}"
    if edge_ids:
        edge = edges.get(edge_ids[0])
        if edge:
            source = nodes.get(edge["source"], {"properties": {}})["properties"].get(
                "name", edge["source"]
            )
            target = nodes.get(edge["target"], {"properties": {}})["properties"].get(
                "name", edge["target"]
            )
            extra = len(edge_ids) - 1
            suffix = f" + {extra} more" if extra else ""
            return f"Selected: {edge['type']} ({source} → {target}){suffix}"
    return "Click a node or edge to inspect it."


def render_playground(controls: dict[str, Any]) -> None:
    """Render the primary, full-width interactive graph."""
    example_name = controls["example_name"]
    input_format, _description, build_graph = EXAMPLES[example_name]
    value = build_graph()
    graph, edges = split_input(value)
    normalized = normalize_graph(graph, edges=edges)
    metrics = graph_metrics(value)
    label_font_family, label_font_url = FONT_PRESETS[controls["font_preset"]]
    config = GraphConfig(
        display=DisplayConfig(
            node_labels=controls["node_labels"],
            edge_labels=controls["edge_labels"],
            node_label_size=controls["node_label_size"],
            node_size=controls["node_size"],
            node_size_field=controls["node_size_field"],
            node_color_field=controls["node_color_field"],
            node_size_mode=controls["node_size_mode"],
            edge_label_size=controls["edge_label_size"],
            label_density=controls["label_density"],
            label_rendered_size_threshold=controls["label_threshold"],
            label_font_family=label_font_family,
            label_font_url=label_font_url,
            show_legend=controls["show_legend"],
            legend_collapsed=controls["legend_collapsed"],
            properties_panel=controls["properties_panel"],
            selection_dimming=controls["selection_dimming"],
            hide_edges_on_move=controls["hide_edges_on_move"],
        ),
        layout=LayoutConfig(
            name=controls["layout_name"],
            node_x_field="x" if controls["layout_name"] == "none" else None,
            node_y_field="y" if controls["layout_name"] == "none" else None,
            iterations=controls["iterations"],
            gravity=controls["gravity"],
            scaling_ratio=controls["scaling_ratio"],
            lin_log_mode=controls["lin_log_mode"],
            strong_gravity_mode=controls["strong_gravity_mode"],
            dynamic_after_drag=controls["dynamic_after_drag"],
            drag_relaxation_ms=controls["drag_relaxation_ms"],
            hierarchy_direction=controls["hierarchy_direction"],
        ),
    )

    st.caption(
        f"**{example_name}** · {input_format} · {metrics['nodes']} nodes · "
        f"{metrics['edges']} edges · {metrics['types']} types"
    )
    result = render_graph(
        value,
        key="playground",
        height=controls["height"],
        theme=controls["theme"],
        config=config,
    )
    st.caption(selection_summary(normalized, result))

    code_tab, data_tab, selection_tab = st.tabs(
        ["Code", "Normalized data", "Selection"]
    )
    with code_tab:
        st.code(
            minimal_config_code(
                config,
                height=controls["height"],
                theme=controls["theme"],
                key="playground",
            ),
            language="python",
            height=180,
        )
        with st.expander("All options"):
            st.code(
                full_config_code(
                    config.display,
                    config.layout,
                    height=controls["height"],
                    theme=controls["theme"],
                    key="playground",
                ),
                language="python",
            )
    with data_tab:
        st.json(normalized, expanded=False)
    with selection_tab:
        selection = getattr(result, "selection", None) or {"nodes": [], "edges": []}
        clicked = getattr(result, "clicked", None)
        st.json(selection)
        st.caption(
            f"clicked={clicked!r} · `clicked` fires for one rerun; `selection` "
            "persists until it changes."
        )


def compare_cards(
    cards: list[dict[str, Any]],
    *,
    metrics_caption: str,
) -> None:
    """Render a two-column comparison and one shared code section."""
    if len(cards) > MAX_CONCURRENT_GRAPHS:
        raise ValueError(
            f"{len(cards)} graphs exceeds the {MAX_CONCURRENT_GRAPHS}-instance "
            "WebGL context budget; paginate the comparison instead."
        )
    st.caption(metrics_caption)
    for row_start in range(0, len(cards), 2):
        columns = st.columns(2)
        for column, card in zip(columns, cards[row_start : row_start + 2]):
            with column:
                st.markdown(f"#### {card['title']}")
                st.caption(card["caption"])
                render_graph(
                    card["value"],
                    key=card["key"],
                    height=430,
                    theme=card.get("theme", "streamlit"),
                    config=card["config"],
                )
                if "playground_dataset" in card and st.button(
                    "Open in Playground",
                    key=f"open-{card['key']}",
                    use_container_width=True,
                ):
                    st.session_state["pending_scenario"] = {
                        "dataset": card["playground_dataset"],
                        "display": card["config"].display,
                        "layout": card["config"].layout,
                    }
                    # Apply this before the keyed View widget is recreated.
                    st.session_state["pending_view"] = "Playground"
                    st.rerun()

    with st.expander("Python"):
        st.code(compare_config_code(cards), language="python")


def render_compare(mode: str, *, layout_family: str = "Organic") -> None:
    """Render one of the gallery's side-by-side comparisons."""
    if mode == "Themes":
        value = supply_chain()
        metrics = graph_metrics(value)
        display = compare_display()
        cards = [
            {
                "title": theme.title(),
                "caption": f"{theme.title()} theme",
                "value": value,
                "key": f"compare-theme-{theme}",
                "theme": theme,
                "config": GraphConfig(
                    display=display,
                    layout=supply_chain_layout(),
                ),
            }
            for theme in ("streamlit", "humanistic")
        ]
        compare_cards(
            cards,
            metrics_caption=(
                "A synthetic European battery supply chain — 6 node types, "
                "5 relationship types, and edge properties like lead_days "
                f"and annual_capacity · {metrics['nodes']} nodes · "
                f"{metrics['edges']} edges"
            ),
        )
        return

    if mode == "Layouts":
        value = supply_chain()
        metrics = graph_metrics(value)
        cards = []
        for name in LAYOUT_FAMILIES[layout_family]:
            layout = LayoutConfig(
                name=name,
                node_x_field="x" if name == "none" else None,
                node_y_field="y" if name == "none" else None,
            )
            cards.append(
                {
                    "title": name,
                    "caption": f"{name} layout",
                    "value": value,
                    "key": f"compare-layout-{name}",
                    "config": GraphConfig(display=compare_display(), layout=layout),
                }
            )
        compare_cards(
            cards,
            metrics_caption=(
                "A synthetic European battery supply chain — 6 node types, "
                "5 relationship types, and edge properties like lead_days "
                f"and annual_capacity · {layout_family} layouts · "
                f"{metrics['nodes']} nodes · {metrics['edges']} edges"
            ),
        )
        return

    if mode == "Data inputs":
        format_examples = [
            "Synthetic supply chain",
            "NetworkX — Karate Club",
            "DataFrames — Davis Southern Women",
            "Neo4j-like — Computing pioneers",
        ]
        format_expressions = {
            "Synthetic supply chain": ("property_graph", None),
            "NetworkX — Karate Club": ("networkx_graph", None),
            "DataFrames — Davis Southern Women": ("nodes_df", "edges_df"),
            "Neo4j-like — Computing pioneers": ("neo4j_graph", None),
        }
        format_captions = {
            "Synthetic supply chain": "Typed property-graph dictionary",
            "NetworkX — Karate Club": "NetworkX graph",
            "DataFrames — Davis Southern Women": "Separate node and edge DataFrames",
            "Neo4j-like — Computing pioneers": "Neo4j-style graph objects",
        }
        cards = []
        total_nodes = 0
        total_edges = 0
        for name in format_examples:
            input_format, _description, builder = EXAMPLES[name]
            value = builder()
            metrics = graph_metrics(value)
            total_nodes += metrics["nodes"]
            total_edges += metrics["edges"]
            graph_expression, edges_expression = format_expressions[name]
            card_layout = (
                supply_chain_layout()
                if name == "Synthetic supply chain"
                else LayoutConfig()
            )
            cards.append(
                {
                    "title": input_format,
                    "caption": (
                        f"{format_captions[name]} · {metrics['nodes']} nodes · "
                        f"{metrics['edges']} edges"
                    ),
                    "value": value,
                    "key": f"compare-data-{name}",
                    "config": GraphConfig(
                        display=compare_display(
                            edge_labels="hidden",
                            node_labels="hover",
                        )
                        if name
                        in {
                            "NetworkX — Karate Club",
                            "DataFrames — Davis Southern Women",
                        }
                        else compare_display(),
                        layout=card_layout,
                    ),
                    "graph_expression": graph_expression,
                    "edges_expression": edges_expression,
                }
            )
        compare_cards(
            cards,
            metrics_caption=(
                f"4 supported input shapes · {total_nodes} nodes · {total_edges} edges"
            ),
        )
        return

    if mode == "Scenarios":
        compare_cards(
            scenario_cards(),
            metrics_caption=(
                "Four ready-made configurations for common graph tasks — "
                "each on a different dataset."
            ),
        )
        return

    raise ValueError(f"Unknown comparison mode: {mode}")


def apply_pending_scenario() -> None:
    """Prime keyed Playground widgets once, before Streamlit creates them."""
    pending_view = st.session_state.pop("pending_view", None)
    if pending_view is not None:
        st.session_state["view"] = pending_view

    pending = st.session_state.pop("pending_scenario", None)
    if pending is None:
        return

    display: DisplayConfig = pending["display"]
    layout: LayoutConfig = pending["layout"]
    font_preset = next(
        (
            name
            for name, (family, url) in FONT_PRESETS.items()
            if family == display.label_font_family and url == display.label_font_url
        ),
        "System",
    )
    values = {
        "pg_dataset": pending["dataset"],
        "pg_layout": layout.name,
        "pg_node_size_mode": display.node_size_mode,
        "pg_node_size": display.node_size,
        "pg_node_size_field": display.node_size_field,
        "pg_node_color_field": display.node_color_field,
        "pg_node_labels": display.node_labels,
        "pg_edge_labels": display.edge_labels,
        "pg_node_label_size": display.node_label_size,
        "pg_edge_label_size": display.edge_label_size,
        "pg_label_density": display.label_density,
        "pg_label_threshold": display.label_rendered_size_threshold,
        "pg_font_preset": font_preset,
        "pg_properties_panel": display.properties_panel,
        "pg_show_legend": display.show_legend,
        "pg_legend_collapsed": display.legend_collapsed,
        "pg_selection_dimming": display.selection_dimming,
        "pg_hide_edges_on_move": display.hide_edges_on_move,
        "pg_iterations": layout.iterations,
        "pg_gravity": layout.gravity,
        "pg_scaling_ratio": layout.scaling_ratio,
        "pg_lin_log_mode": layout.lin_log_mode,
        "pg_strong_gravity_mode": layout.strong_gravity_mode,
        "pg_hierarchy_direction": layout.hierarchy_direction,
        "pg_dynamic_after_drag": layout.dynamic_after_drag,
        "pg_drag_relaxation_ms": layout.drag_relaxation_ms,
    }
    for key, value in values.items():
        st.session_state[key] = value


def set_playground_defaults() -> None:
    """Initialize keyed widgets without overwriting later user choices."""
    defaults = {
        "view": "Playground",
        "pg_dataset": next(iter(EXAMPLES)),
        "pg_theme": "streamlit",
        "pg_layout": LAYOUTS[0],
        "pg_height": 640,
        "pg_node_size_mode": "auto",
        "pg_node_size": 10.0,
        "pg_node_size_field": "size",
        "pg_node_color_field": None,
        "pg_node_labels": "auto",
        "pg_edge_labels": "hover",
        "pg_node_label_size": 12,
        "pg_edge_label_size": 9,
        "pg_label_density": 0.8,
        "pg_label_threshold": 6.0,
        "pg_font_preset": "System",
        "pg_properties_panel": "compact",
        "pg_show_legend": True,
        "pg_legend_collapsed": True,
        "pg_selection_dimming": 0.68,
        "pg_hide_edges_on_move": False,
        "pg_iterations": 100,
        "pg_gravity": 1.0,
        "pg_scaling_ratio": 10.0,
        "pg_lin_log_mode": False,
        "pg_strong_gravity_mode": False,
        "pg_hierarchy_direction": "TB",
        "pg_dynamic_after_drag": True,
        "pg_drag_relaxation_ms": 1000,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


def node_property_fields(example_name: str) -> list[str]:
    """Return node property names available for explicit visual mappings."""
    value = EXAMPLES[example_name][2]()
    graph, edges = split_input(value)
    normalized = normalize_graph(graph, edges=edges)
    return sorted(
        {
            property_name
            for node in normalized["nodes"]
            for property_name in node["properties"]
        }
    )


apply_pending_scenario()
set_playground_defaults()


with st.sidebar:
    st.markdown("### streamlit-sigmajs")
    st.caption("Interactive property graphs for Streamlit.")
    view = (
        st.segmented_control(
            "View",
            ["Playground", "Compare"],
            key="view",
        )
        or "Playground"
    )

    controls: dict[str, Any] = {}
    compare_mode = "Themes"
    layout_family = "Organic"
    if view == "Playground":
        controls["example_name"] = st.selectbox(
            "Dataset", list(EXAMPLES), key="pg_dataset"
        )
        controls["theme"] = (
            st.segmented_control(
                "Theme",
                ["streamlit", "humanistic"],
                key="pg_theme",
            )
            or "streamlit"
        )
        controls["layout_name"] = st.selectbox(
            "Layout", LAYOUTS, key="pg_layout"
        )
        controls["height"] = st.slider(
            "Height", 400, 1000, step=20, key="pg_height"
        )
        st.divider()

        with st.expander("Labels"):
            controls["node_size_mode"] = st.selectbox(
                "Node sizing", ["auto", "fixed"], key="pg_node_size_mode"
            )
            controls["node_size"] = st.slider(
                "Node size", 3.0, 20.0, step=0.5, key="pg_node_size"
            )
            property_fields = node_property_fields(controls["example_name"])
            field_options: list[str | None] = [None, *property_fields]
            if st.session_state["pg_node_size_field"] not in field_options:
                st.session_state["pg_node_size_field"] = None
            if st.session_state["pg_node_color_field"] not in field_options:
                st.session_state["pg_node_color_field"] = None
            controls["node_size_field"] = st.selectbox(
                "Node size field",
                field_options,
                key="pg_node_size_field",
                format_func=lambda value: "None" if value is None else value,
            )
            controls["node_color_field"] = st.selectbox(
                "Node color field",
                field_options,
                key="pg_node_color_field",
                format_func=lambda value: "Labels" if value is None else value,
            )
            controls["node_labels"] = st.selectbox(
                "Node labels", ["auto", "hover", "hidden"], key="pg_node_labels"
            )
            controls["edge_labels"] = st.selectbox(
                "Edge labels",
                ["hover", "hidden", "always"],
                key="pg_edge_labels",
            )
            controls["node_label_size"] = st.slider(
                "Node label size", 8, 22, key="pg_node_label_size"
            )
            controls["edge_label_size"] = st.slider(
                "Edge label size", 7, 18, key="pg_edge_label_size"
            )
            controls["label_density"] = st.slider(
                "Density", 0.0, 1.0, step=0.05, key="pg_label_density"
            )
            controls["label_threshold"] = st.slider(
                "Size threshold",
                0.0,
                16.0,
                step=0.5,
                key="pg_label_threshold",
            )
            controls["font_preset"] = st.selectbox(
                "Font", list(FONT_PRESETS), key="pg_font_preset"
            )

        with st.expander("Panels"):
            controls["properties_panel"] = st.selectbox(
                "Properties",
                ["compact", "cards", "hidden"],
                key="pg_properties_panel",
            )
            controls["show_legend"] = st.checkbox(
                "Legend", key="pg_show_legend"
            )
            controls["legend_collapsed"] = st.checkbox(
                "Collapsed",
                disabled=not controls["show_legend"],
                key="pg_legend_collapsed",
            )
            controls["selection_dimming"] = st.slider(
                "Selection dimming",
                0.0,
                0.9,
                step=0.05,
                key="pg_selection_dimming",
            )
            controls["hide_edges_on_move"] = st.checkbox(
                "Hide edges while moving", key="pg_hide_edges_on_move"
            )

        with st.expander("Layout details"):
            controls["iterations"] = st.slider(
                "Iterations", 0, 400, step=10, key="pg_iterations"
            )
            controls["gravity"] = st.slider(
                "Gravity", 0.0, 5.0, step=0.1, key="pg_gravity"
            )
            controls["scaling_ratio"] = st.slider(
                "Scaling ratio", 1.0, 30.0, step=1.0, key="pg_scaling_ratio"
            )
            controls["lin_log_mode"] = st.checkbox(
                "LinLog mode", key="pg_lin_log_mode"
            )
            controls["strong_gravity_mode"] = st.checkbox(
                "Strong gravity", key="pg_strong_gravity_mode"
            )
            controls["hierarchy_direction"] = st.selectbox(
                "Direction",
                ["TB", "LR", "BT", "RL"],
                disabled=controls["layout_name"] != "hierarchical",
                key="pg_hierarchy_direction",
            )

        with st.expander("After dragging"):
            controls["dynamic_after_drag"] = st.checkbox(
                "Relax neighbors", key="pg_dynamic_after_drag"
            )
            controls["drag_relaxation_ms"] = st.slider(
                "Maximum settling time (ms)",
                200,
                3000,
                step=100,
                disabled=not controls["dynamic_after_drag"],
                key="pg_drag_relaxation_ms",
            )
    else:
        compare_mode = st.selectbox(
            "Compare", ["Themes", "Layouts", "Data inputs", "Scenarios"]
        )
        if compare_mode == "Layouts":
            layout_family = (
                st.segmented_control(
                    "Family",
                    list(LAYOUT_FAMILIES),
                    default="Organic",
                )
                or "Organic"
            )

    st.caption(
        "[GitHub](https://github.com/gitkeniwo/streamlit-sigmajs) · "
        "[PyPI](https://pypi.org/project/streamlit-sigmajs/)"
    )


if view == "Playground":
    render_playground(controls)
else:
    render_compare(compare_mode, layout_family=layout_family)
