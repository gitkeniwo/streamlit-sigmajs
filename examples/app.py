"""Multi-format, multi-theme gallery for streamlit-sigmajs."""

from __future__ import annotations

from typing import Any

import streamlit as st

from example_graphs import EXAMPLES, supply_chain
from st_sigma import normalize_graph, sigma_graph


st.set_page_config(
    page_title="streamlit-sigmajs gallery",
    page_icon="🕸️",
    layout="wide",
)


def split_input(value: Any) -> tuple[Any, Any | None]:
    return value if isinstance(value, tuple) else (value, None)


def render_graph(
    value: Any,
    *,
    key: str,
    height: int = 500,
    theme: str = "streamlit",
):
    graph, edges = split_input(value)
    return sigma_graph(
        graph,
        edges=edges,
        height=height,
        theme=theme,
        key=key,
    )


def graph_metrics(value: Any) -> dict[str, int]:
    graph, edges = split_input(value)
    normalized = normalize_graph(graph, edges=edges)
    return {
        "nodes": len(normalized["nodes"]),
        "edges": len(normalized["edges"]),
        "types": len(
            {label for node in normalized["nodes"] for label in node["labels"]}
        ),
    }


st.title("streamlit-sigmajs")
st.caption(
    "Direct Python graph inputs, one canonical property-graph model, "
    "and a React-free user API."
)

page = st.segmented_control(
    "Gallery view",
    ["All formats", "Theme comparison", "Playground"],
    default="All formats",
    label_visibility="collapsed",
)

if page == "All formats":
    st.subheader("The same API, four graph representations")
    st.code(
        "sigma_graph(graph, height=500, theme='streamlit')\n"
        "sigma_graph(nodes_df, edges=edges_df)",
        language="python",
    )

    format_examples = [
        "Synthetic supply chain",
        "NetworkX — Karate Club",
        "DataFrames — Davis Southern Women",
        "Neo4j-like — Computing pioneers",
    ]
    for row_start in range(0, len(format_examples), 2):
        columns = st.columns(2)
        for column, example_name in zip(columns, format_examples[row_start : row_start + 2]):
            input_format, description, build_graph = EXAMPLES[example_name]
            value = build_graph()
            metrics = graph_metrics(value)
            with column:
                st.markdown(f"#### {example_name}")
                st.caption(
                    f"{input_format} · {metrics['nodes']} nodes · "
                    f"{metrics['edges']} edges · {metrics['types']} node types"
                )
                st.write(description)
                render_graph(value, key=f"formats-{example_name}", height=460)

elif page == "Theme comparison":
    st.subheader("One graph, two visual languages")
    st.write(
        "The Streamlit theme follows the host app's color variables. "
        "Humanistic preserves the original warm, low-saturation design."
    )
    theme_graph = supply_chain()
    streamlit_column, humanistic_column = st.columns(2)
    with streamlit_column:
        st.markdown("#### Streamlit")
        st.caption("Neutral component styling with Streamlit theme tokens.")
        render_graph(
            theme_graph,
            key="theme-streamlit",
            height=520,
            theme="streamlit",
        )
    with humanistic_column:
        st.markdown("#### Humanistic")
        st.caption("Warm paper surfaces and the original muted palette.")
        render_graph(
            theme_graph,
            key="theme-humanistic",
            height=520,
            theme="humanistic",
        )

else:
    controls, canvas = st.columns([1, 3])
    with controls:
        st.markdown("#### Controls")
        example_name = st.selectbox("Dataset", list(EXAMPLES), key="playground-data")
        theme = st.segmented_control(
            "Theme",
            ["streamlit", "humanistic"],
            default="streamlit",
            key="playground-theme",
        )
        height = st.slider("Canvas height", 400, 900, 650, 50)

    input_format, description, build_graph = EXAMPLES[example_name]
    value = build_graph()
    metrics = graph_metrics(value)
    with canvas:
        st.markdown(f"#### {example_name}")
        st.caption(
            f"Direct input: {input_format} · {metrics['nodes']} nodes · "
            f"{metrics['edges']} edges"
        )
        st.write(description)
        render_graph(
            value,
            key=f"playground-{example_name}",
            height=height,
            theme=theme or "streamlit",
        )

    with st.expander("Inspect normalized component input"):
        graph, edges = split_input(value)
        st.json(normalize_graph(graph, edges=edges), expanded=False)
