from __future__ import annotations

import sys
from pathlib import Path


EXAMPLES_DIR = Path(__file__).parents[1] / "examples"
sys.path.insert(0, str(EXAMPLES_DIR))

from example_graphs import EXAMPLES  # noqa: E402


def test_examples_use_valid_component_wire_format():
    for _name, (_description, build_graph) in EXAMPLES.items():
        graph = build_graph()
        node_ids = {node["identity"] for node in graph["nodes"]}

        assert node_ids
        assert all(node["labels"] for node in graph["nodes"])
        assert all(
            relationship["start"] in node_ids
            and relationship["end"] in node_ids
            for relationship in graph["relationships"]
        )
