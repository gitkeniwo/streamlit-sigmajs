"""Interactive gallery for streamlit-sigmajs."""

from __future__ import annotations

import streamlit as st

from example_graphs import EXAMPLES
from st_sigma import normalize_graph, sigma_graph


st.set_page_config(
    page_title="streamlit-sigmajs gallery",
    page_icon="🕸️",
    layout="wide",
)

st.title("streamlit-sigmajs")
st.caption("Small public graphs for exploring the component without a database.")

with st.sidebar:
    st.header("Graph")
    example_name = st.selectbox("Dataset", list(EXAMPLES))
    theme = st.segmented_control(
        "Theme",
        ["streamlit", "humanistic"],
        default="streamlit",
    )
    height = st.slider("Canvas height", 400, 900, 650, 50)
    st.divider()
    st.markdown(
        "Select a node or relationship to inspect its properties. "
        "Use the controls on the canvas to zoom and reset the camera."
    )

input_format, description, build_graph = EXAMPLES[example_name]
input_data = build_graph()
if isinstance(input_data, tuple):
    graph, edges = input_data
    normalized = normalize_graph(graph, edges=edges)
else:
    graph, edges = input_data, None
    normalized = normalize_graph(graph)

metric_nodes, metric_edges, metric_types = st.columns(3)
metric_nodes.metric("Nodes", len(normalized["nodes"]))
metric_edges.metric("Relationships", len(normalized["edges"]))
metric_types.metric(
    "Node types",
    len({label for node in normalized["nodes"] for label in node["labels"]}),
)

st.caption(f"Direct input: {input_format}")
st.write(description)
sigma_graph(
    graph,
    edges=edges,
    height=height,
    theme=theme or "streamlit",
    key=f"gallery-{example_name}",
)

with st.expander("Inspect the component input"):
    st.json(normalized, expanded=False)
