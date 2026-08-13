"""Interactive gallery for streamlit-sigmajs."""

from __future__ import annotations

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

LAYOUTS = [
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
    """Render any gallery input through the public package API."""
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
        "node_labels": "hover",
        "edge_labels": "hidden",
        "show_legend": False,
        "properties_panel": "hidden",
    }
    values.update(overrides)
    return DisplayConfig(**values)


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
                properties_panel={display.properties_panel!r},
                selection_dimming={display.selection_dimming!r},
                hide_edges_on_move={display.hide_edges_on_move!r},
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


def page_header(section: str) -> None:
    """Render the shared, intentionally small page heading."""
    st.title("streamlit-sigmajs")
    st.caption("Interactive property graphs for Streamlit.")
    st.subheader(section)


def playground_page() -> None:
    """Interactive graph playground with controls beside the graph."""
    page_header("Playground")
    graph_column, controls_column = st.columns([3, 1], gap="large")

    with controls_column:
        st.subheader("Playground controls")
        example_name = st.selectbox("Dataset", list(EXAMPLES))
        theme = st.segmented_control(
            "Theme",
            ["streamlit", "humanistic"],
            default="streamlit",
        )
        layout_name = st.selectbox("Layout", LAYOUTS)
        height = st.slider("Height", 400, 900, 700, 50)

        with st.expander("Labels", expanded=True):
            node_size_mode = st.selectbox("Node sizing", ["auto", "fixed"])
            node_size = st.slider("Node size", 3.0, 20.0, 10.0, 0.5)
            node_labels = st.selectbox("Node labels", ["auto", "hover", "hidden"])
            edge_labels = st.selectbox("Edge labels", ["hover", "hidden", "always"])
            node_label_size = st.slider("Node label size", 8, 22, 12)
            edge_label_size = st.slider("Edge label size", 7, 18, 9)
            label_density = st.slider("Density", 0.0, 1.0, 0.8, 0.05)
            label_threshold = st.slider("Size threshold", 0.0, 16.0, 6.0, 0.5)
            font_preset = st.selectbox("Font", list(FONT_PRESETS))

        with st.expander("Panels"):
            properties_panel = st.selectbox(
                "Properties",
                ["compact", "cards", "hidden"],
            )
            show_legend = st.checkbox("Legend", value=True)
            legend_collapsed = st.checkbox(
                "Collapsed",
                value=True,
                disabled=not show_legend,
            )
            selection_dimming = st.slider(
                "Selection dimming",
                0.0,
                0.9,
                0.68,
                0.05,
            )
            hide_edges_on_move = st.checkbox(
                "Hide edges while moving",
                value=False,
            )

        with st.expander("Layout details"):
            iterations = st.slider("Iterations", 0, 400, 100, 10)
            gravity = st.slider("Gravity", 0.0, 5.0, 1.0, 0.1)
            scaling_ratio = st.slider("Scaling ratio", 1.0, 30.0, 10.0, 1.0)
            lin_log_mode = st.checkbox("LinLog mode", value=False)
            strong_gravity_mode = st.checkbox("Strong gravity", value=False)
            hierarchy_direction = st.selectbox(
                "Direction",
                ["TB", "LR", "BT", "RL"],
                disabled=layout_name != "hierarchical",
            )

        with st.expander("After dragging"):
            dynamic_after_drag = st.checkbox("Relax neighbors", value=True)
            drag_relaxation_ms = st.slider(
                "Maximum settling time (ms)",
                200,
                3000,
                1000,
                100,
                disabled=not dynamic_after_drag,
            )

    label_font_family, label_font_url = FONT_PRESETS[font_preset]
    playground_config = GraphConfig(
        display=DisplayConfig(
            node_labels=node_labels,
            edge_labels=edge_labels,
            node_label_size=node_label_size,
            node_size=node_size,
            node_size_mode=node_size_mode,
            edge_label_size=edge_label_size,
            label_density=label_density,
            label_rendered_size_threshold=label_threshold,
            label_font_family=label_font_family,
            label_font_url=label_font_url,
            show_legend=show_legend,
            legend_collapsed=legend_collapsed,
            properties_panel=properties_panel,
            selection_dimming=selection_dimming,
            hide_edges_on_move=hide_edges_on_move,
        ),
        layout=LayoutConfig(
            name=layout_name,
            iterations=iterations,
            gravity=gravity,
            scaling_ratio=scaling_ratio,
            lin_log_mode=lin_log_mode,
            strong_gravity_mode=strong_gravity_mode,
            dynamic_after_drag=dynamic_after_drag,
            drag_relaxation_ms=drag_relaxation_ms,
            hierarchy_direction=hierarchy_direction,
        ),
    )

    input_format, description, build_graph = EXAMPLES[example_name]
    playground_value = build_graph()
    metrics = graph_metrics(playground_value)

    with graph_column:
        st.markdown(f"#### {example_name}")
        st.caption(
            f"{input_format} · {metrics['nodes']} nodes · {metrics['edges']} edges · "
            f"{metrics['types']} types"
        )
        render_graph(
            playground_value,
            key=f"playground-{example_name}",
            height=height,
            theme=theme or "streamlit",
            config=playground_config,
        )

        with st.expander("Python"):
            st.code(
                full_config_code(
                    playground_config.display,
                    playground_config.layout,
                    height=height,
                    theme=theme or "streamlit",
                ),
                language="python",
            )

        with st.expander("Normalized data"):
            graph, edges = split_input(playground_value)
            st.json(normalize_graph(graph, edges=edges), expanded=False)


def themes_page() -> None:
    """Show the same graph in both built-in themes."""
    page_header("Themes")
    theme_graph = supply_chain()
    streamlit_column, humanistic_column = st.columns(2)
    theme_display = quiet_display(show_legend=True, legend_collapsed=True)

    with streamlit_column:
        st.markdown("#### Streamlit")
        render_graph(
            theme_graph,
            key="theme-streamlit",
            height=500,
            theme="streamlit",
            config=GraphConfig(display=theme_display),
        )
    with humanistic_column:
        st.markdown("#### Humanistic")
        render_graph(
            theme_graph,
            key="theme-humanistic",
            height=500,
            theme="humanistic",
            config=GraphConfig(display=theme_display),
        )

    with st.expander("Python"):
        st.code(
            full_config_code(
                theme_display,
                LayoutConfig(),
                height=500,
                theme="streamlit",
                key="theme-streamlit",
            )
            + "\n\n"
            + full_config_code(
                theme_display,
                LayoutConfig(),
                height=500,
                theme="humanistic",
                key="theme-humanistic",
            ),
            language="python",
        )


def data_page() -> None:
    """Show the supported Python graph input formats."""
    page_header("Direct inputs")
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

    for row_start in range(0, len(format_examples), 2):
        columns = st.columns(2)
        for column, name in zip(columns, format_examples[row_start : row_start + 2]):
            input_format, _description, builder = EXAMPLES[name]
            value = builder()
            metrics = graph_metrics(value)
            with column:
                st.markdown(f"#### {input_format}")
                st.caption(f"{metrics['nodes']} nodes · {metrics['edges']} edges")
                display = quiet_display()
                layout = LayoutConfig()
                render_graph(
                    value,
                    key=f"data-{name}",
                    height=390,
                    config=GraphConfig(display=display, layout=layout),
                )
                graph_expression, edges_expression = format_expressions[name]
                with st.expander("Python"):
                    st.code(
                        full_config_code(
                            display,
                            layout,
                            graph_expression=graph_expression,
                            edges_expression=edges_expression,
                            height=390,
                            key=f"data-{name}",
                        ),
                        language="python",
                    )


def layouts_page() -> None:
    """Show layout presets by family."""
    page_header("Layouts")
    layout_family = st.selectbox(
        "Family",
        ["Organic", "Geometric", "Structured"],
    )
    layout_groups = {
        "Organic": ["forceatlas2", "force", "random"],
        "Geometric": ["circular", "circlepack", "concentric"],
        "Structured": ["grid", "hierarchical", "none"],
    }
    selected_layouts = layout_groups[layout_family or "Organic"]
    columns = st.columns(3)
    for column, layout in zip(columns, selected_layouts):
        with column:
            st.markdown(f"#### {layout}")
            display_config = quiet_display()
            layout_config = LayoutConfig(name=layout)
            render_graph(
                supply_chain(),
                key=f"layout-{layout}",
                height=390,
                config=GraphConfig(
                    display=display_config,
                    layout=layout_config,
                ),
            )
            with st.expander("Python"):
                st.code(
                    full_config_code(
                        display_config,
                        layout_config,
                        height=390,
                        key=f"layout-{layout}",
                    ),
                    language="python",
                )


def display_page() -> None:
    """Show low-clutter display presets."""
    page_header("Display presets")
    display_presets = {
        "Balanced": DisplayConfig(node_size_mode="auto", node_size=10.0),
        "Explore": DisplayConfig(
            node_size_mode="auto",
            node_size=10.0,
            node_labels="hover",
            edge_labels="hover",
            properties_panel="compact",
            legend_collapsed=True,
        ),
        "Dense": DisplayConfig(
            node_size_mode="auto",
            node_size=10.0,
            node_labels="hidden",
            edge_labels="hidden",
            properties_panel="hidden",
            show_legend=False,
            hide_edges_on_move=True,
        ),
    }
    columns = st.columns(3)
    for column, (name, display) in zip(columns, display_presets.items()):
        with column:
            st.markdown(f"#### {name}")
            layout = LayoutConfig()
            render_graph(
                EXAMPLES["NetworkX — Les Misérables"][2](),
                key=f"display-{name}",
                height=420,
                config=GraphConfig(display=display, layout=layout),
            )
            with st.expander("Python"):
                st.code(
                    full_config_code(
                        display,
                        layout,
                        height=420,
                        key=f"display-{name}",
                    ),
                    language="python",
                )


navigation = st.navigation(
    [
        st.Page(playground_page, title="Playground", icon="🛠️", default=True),
        st.Page(themes_page, title="Themes", icon="🎨"),
        st.Page(data_page, title="Data inputs", icon="🗂️"),
        st.Page(layouts_page, title="Layouts", icon="🧭"),
        st.Page(display_page, title="Display", icon="🖥️"),
    ],
    position="sidebar",
)
navigation.run()
