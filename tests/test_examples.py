from __future__ import annotations

import sys
from pathlib import Path


EXAMPLES_DIR = Path(__file__).parents[1] / "examples"
sys.path.insert(0, str(EXAMPLES_DIR))

from example_graphs import EXAMPLES  # noqa: E402
from st_sigma import normalize_graph  # noqa: E402


def test_examples_use_valid_component_wire_format():
    input_formats = set()
    for _name, (_input_format, _description, build_graph) in EXAMPLES.items():
        input_formats.add(_input_format)
        input_data = build_graph()
        graph = (
            normalize_graph(input_data[0], edges=input_data[1])
            if isinstance(input_data, tuple)
            else normalize_graph(input_data)
        )
        node_ids = {node["id"] for node in graph["nodes"]}

        assert node_ids
        assert all(node["labels"] for node in graph["nodes"])
        assert all(
            edge["source"] in node_ids and edge["target"] in node_ids
            for edge in graph["edges"]
        )

    assert {"Property graph dict", "NetworkX", "DataFrames", "Neo4j Graph"} <= input_formats
