import os
import streamlit.components.v1 as components
from neo4j.graph import Graph
import datetime

_RELEASE = True

# Declare a Streamlit component. `declare_component` returns a function
# that is used to create instances of the component. We're naming this
# function "_component_func", with an underscore prefix, because we don't want
# to expose it directly to users. Instead, we will create a custom wrapper
# function, below, that will serve as our component's public API.

# It's worth noting that this call to `declare_component` is the
# *only thing* you need to do to create the binding between Streamlit and
# your component frontend. Everything else we do in this file is simply a
# best practice.

if not _RELEASE:
    _component_func = components.declare_component(
        # We give the component a simple, descriptive name ("my_component"
        # does not fit this bill, so please choose something better for your
        # own component :)
        "st_sigmagraph",
        # Pass `url` here to tell Streamlit that the component will be served
        # by the local dev server that you run via `npm run start`.
        # (This is useful while your component is in development.)
        url="http://localhost:3001",
    )
else:
    # When we're distributing a production version of the component, we'll
    # replace the `url` param with `path`, and point it to the component's
    # build directory:
    parent_dir = os.path.dirname(os.path.abspath(__file__))
    build_dir = os.path.join(parent_dir, "frontend/build")
    _component_func = components.declare_component("st_sigmagraph", path=build_dir)


def serialize_neo4j_value(val):
    import math
    import numpy as np

    # Neo4j Date/Time types
    if hasattr(val, "isoformat"):
        return val.isoformat()
    if isinstance(val, (float, np.floating)) and (math.isnan(val) or math.isinf(val)):
        return None
    if val is None or val is np.nan:
        return None
    if isinstance(val, (list, tuple)):
        return [serialize_neo4j_value(v) for v in val]
    if isinstance(val, dict):
        return {k: serialize_neo4j_value(v) for k, v in val.items()}
    return val


def neo4jgraph_to_sigma(result):
    # extract nodes and relationships
    nodes = []
    relationships = []

    for node in result.nodes:
        nodes.append(
            {
                "identity": node.element_id,
                "labels": list(node.labels),
                "properties": {
                    k: serialize_neo4j_value(v) for k, v in dict(node).items()
                },
            }
        )

    for rel in result.relationships:
        relationships.append(
            {
                "identity": rel.element_id,
                "start": rel.start_node.element_id,
                "end": rel.end_node.element_id,
                "type": rel.type,
                "properties": {
                    k: serialize_neo4j_value(v) for k, v in dict(rel).items()
                },
            }
        )

    return {"nodes": nodes, "relationships": relationships}


# Create a wrapper function for the component. This is an optional
# best practice - we could simply expose the component function returned by
# `declare_component` and call it done. The wrapper allows us to customize
# our component's API: we can pre-process its input args, post-process its
# output value, and add a docstring for users.
def st_sigmagraph(
    graphData=None, height=600, layout="force", layout_settings=None, key=None
):
    """Create a new instance of "st_sigmagraph".

    Parameters
    ----------
    graphData: dict
        The graph data in the format returned by neo4jgraph_to_sigma.
    height: int
        Height of the component in pixels.
    layout: str
        Layout algorithm to use. Options: "force" (default), "circular", "random".
    layout_settings: dict, optional
        Configuration dictionary for the chosen layout.
        For 'force', options include:
            - gravity (default: 0.5): How strong nodes are pulled to center
            - scalingRatio (default: 20): How much the graph expands
            - linLogMode (default: True): Cluster separation mode
            - iterations (default: 100): Number of initial layout iterations
    key: str or None
        An optional key that uniquely identifies this component.
    """

    # Default settings for "force" layout to address clustering issues
    default_force_settings = {
        "gravity": 0.5,  # Reduced from 1 to let it spread out
        "scalingRatio": 20,  # Increased from 10 to add space
        "linLogMode": True,  # Helps separate clusters
        "strongGravityMode": False,
        "iterations": 150,  # A bit more time to settle
    }

    if layout == "force":
        if layout_settings is None:
            layout_settings = default_force_settings
        else:
            # Merge user settings with defaults
            layout_settings = {**default_force_settings, **layout_settings}

    component_value = _component_func(
        graphData=graphData,
        height=height,
        layout=layout,
        layoutSettings=layout_settings,
        key=key,
        default=None,
    )

    return component_value
