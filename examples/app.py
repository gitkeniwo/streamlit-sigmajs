"""Interactive gallery for streamlit-sigmajs."""

from __future__ import annotations

import streamlit as st

from example_graphs import EXAMPLES
from st_sigma import st_sigmagraph


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
    height = st.slider("Canvas height", 400, 900, 650, 50)
    st.divider()
    st.markdown(
        "Select a node or relationship to inspect its properties. "
        "Use the controls on the canvas to zoom and reset the camera."
    )

description, build_graph = EXAMPLES[example_name]
graph = build_graph()

metric_nodes, metric_edges, metric_types = st.columns(3)
metric_nodes.metric("Nodes", len(graph["nodes"]))
metric_edges.metric("Relationships", len(graph["relationships"]))
metric_types.metric(
    "Node types",
    len({label for node in graph["nodes"] for label in node["labels"]}),
)

st.write(description)
st_sigmagraph(graphData=graph, height=height, key=f"gallery-{example_name}")

with st.expander("Inspect the component input"):
    st.json(graph, expanded=False)
