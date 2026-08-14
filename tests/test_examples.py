from __future__ import annotations

import ast
import sys
from dataclasses import fields
from pathlib import Path


EXAMPLES_DIR = Path(__file__).parents[1] / "examples"
sys.path.insert(0, str(EXAMPLES_DIR))

from example_graphs import EXAMPLES, les_miserables, supply_chain  # noqa: E402
from st_sigma import (  # noqa: E402
    DisplayConfig,
    GraphConfig,
    LayoutConfig,
    normalize_graph,
)


def load_gallery_function(name: str):
    """Load a pure gallery helper without executing the Streamlit app."""
    source = (EXAMPLES_DIR / "app.py").read_text(encoding="utf-8")
    tree = ast.parse(source)
    functions = [
        node
        for node in tree.body
        if isinstance(node, ast.FunctionDef)
        and node.name
        in {
            "minimal_config_code",
            "_config_constructor",
            "compare_config_code",
            "supply_chain_layout",
            "scenario_cards",
        }
    ]
    namespace = {
        "Any": object,
        "fields": fields,
        "DisplayConfig": DisplayConfig,
        "GraphConfig": GraphConfig,
        "LayoutConfig": LayoutConfig,
        "EXAMPLES": EXAMPLES,
    }
    exec(
        compile(ast.Module(body=functions, type_ignores=[]), "app.py", "exec"),
        namespace,
    )
    return namespace[name]


def load_gallery_constant(name: str):
    """Read a literal module constant without executing the Streamlit app."""
    source = (EXAMPLES_DIR / "app.py").read_text(encoding="utf-8")
    tree = ast.parse(source)
    for node in tree.body:
        if (
            isinstance(node, ast.Assign)
            and any(
                isinstance(target, ast.Name) and target.id == name
                for target in node.targets
            )
        ):
            return ast.literal_eval(node.value)
    raise AssertionError(f"Missing gallery constant: {name}")


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


def test_supply_chain_supports_the_prepositioned_layout():
    graph = supply_chain()

    assert all(
        isinstance(node["properties"].get("x"), (int, float))
        and isinstance(node["properties"].get("y"), (int, float))
        for node in graph["nodes"]
    )


def test_les_miserables_exposes_degree_based_node_sizes():
    graph = les_miserables()

    sizes = [data["size"] for _node_id, data in graph.nodes(data=True)]
    labels = {data["label"] for _node_id, data in graph.nodes(data=True)}

    assert max(sizes) - min(sizes) >= 8
    assert labels == {"Principal", "Supporting", "Minor"}


def test_comparisons_stay_within_the_webgl_context_budget():
    """Each Sigma instance costs 3 WebGL contexts; browsers cap around 16."""
    max_concurrent_graphs = load_gallery_constant("MAX_CONCURRENT_GRAPHS")
    layout_families = load_gallery_constant("LAYOUT_FAMILIES")
    source = (EXAMPLES_DIR / "app.py").read_text(encoding="utf-8")

    assert max_concurrent_graphs == 4
    assert all(
        len(layouts) <= max_concurrent_graphs
        for layouts in layout_families.values()
    )
    assert "if len(cards) > MAX_CONCURRENT_GRAPHS:" in source


def test_supply_chain_comparisons_use_prepositioned_coordinates():
    supply_chain_layout = load_gallery_function("supply_chain_layout")

    layout = supply_chain_layout()

    assert layout.name == "none"
    assert layout.node_x_field == "x"
    assert layout.node_y_field == "y"
    source = (EXAMPLES_DIR / "app.py").read_text(encoding="utf-8")
    assert "layout=supply_chain_layout()," in source
    assert 'if name == "Synthetic supply chain"' in source


def test_gallery_is_a_single_page_with_sidebar_controls():
    source = (EXAMPLES_DIR / "app.py").read_text(encoding="utf-8")

    assert "with st.sidebar" in source
    assert "st.tabs(" in source
    assert "st.navigation(" not in source
    assert "st.Page(" not in source
    assert "st.title(" not in source
    assert 'st.columns([3, 1]' not in source


def test_gallery_code_examples_show_every_configuration_field():
    source = (EXAMPLES_DIR / "app.py").read_text(encoding="utf-8")

    assert '"node_size_mode": "auto"' in source
    for config_type in (DisplayConfig, LayoutConfig):
        for field in fields(config_type):
            assert f"{field.name}={{" in source


def test_minimal_config_code_emits_runnable_default_and_layout_examples():
    minimal_config_code = load_gallery_function("minimal_config_code")

    default_code = minimal_config_code(
        GraphConfig(), height=600, theme="streamlit", key="default"
    )
    layout_code = minimal_config_code(
        GraphConfig(layout=LayoutConfig(name="circular")),
        height=640,
        theme="streamlit",
        key="playground",
    )

    ast.parse(default_code)
    ast.parse(layout_code)
    assert default_code == (
        "from st_sigma import sigma_graph\n\n"
        "sigma_graph(graph, key='default')"
    )
    assert "GraphConfig" not in layout_code
    assert (
        "sigma_graph(graph, layout='circular', height=640, key='playground')"
        in layout_code
    )


def test_minimal_config_code_emits_only_required_config_and_imports():
    minimal_config_code = load_gallery_function("minimal_config_code")
    code = minimal_config_code(
        GraphConfig(display=DisplayConfig(node_labels="hover")),
        graph_expression="nodes_df",
        edges_expression="edges_df",
        height=430,
        theme="humanistic",
        key="data",
    )

    ast.parse(code)
    assert "DisplayConfig, GraphConfig, sigma_graph" in code
    assert "LayoutConfig" not in code
    assert "node_labels='hover'" in code
    assert "node_size=" not in code
    assert "edges=edges_df" in code
    assert "theme='humanistic'" in code


def test_compare_config_code_shares_imports_and_common_configuration():
    compare_config_code = load_gallery_function("compare_config_code")
    display = DisplayConfig(node_labels="hover", node_size_field="size")
    cards = [
        {
            "title": "Streamlit",
            "key": "theme-streamlit",
            "config": GraphConfig(display=display),
        },
        {
            "title": "Humanistic",
            "key": "theme-humanistic",
            "theme": "humanistic",
            "config": GraphConfig(display=display),
        },
    ]

    code = compare_config_code(cards)

    ast.parse(code)
    assert code.count("from st_sigma import") == 1
    assert code.count("config = GraphConfig(") == 1
    assert code.count("sigma_graph(") == 2
    assert "config=config" in code
    assert "theme='humanistic'" in code


def test_scenario_comparison_shows_four_distinct_business_templates():
    scenario_cards = load_gallery_function("scenario_cards")
    cards = scenario_cards()
    source = (EXAMPLES_DIR / "app.py").read_text(encoding="utf-8")

    assert [card["title"] for card in cards] == [
        "Knowledge graph",
        "Influence & hubs",
        "Categorical mapping",
        "Clean topology",
    ]
    assert [card["playground_dataset"] for card in cards] == [
        "Neo4j-like — Computing pioneers",
        "NetworkX — Les Misérables",
        "Synthetic supply chain",
        "DataFrames — Davis Southern Women",
    ]
    assert cards[2]["config"].display.node_color_field == "country"
    assert cards[2]["config"].display.legend_collapsed is False
    assert cards[3]["graph_expression"] == "nodes_df"
    assert cards[3]["edges_expression"] == "edges_df"
    assert '"Scenarios"' in source
    assert '"Display presets"' not in source
    assert "Four ready-made configurations for common graph tasks" in source
    assert '@media (max-width: 1300px)' not in source


def test_scenario_cards_use_four_distinct_values():
    scenario_cards = load_gallery_function("scenario_cards")
    cards = scenario_cards()
    normalized_values = []
    for card in cards:
        value = card["value"]
        normalized_values.append(
            normalize_graph(value[0], edges=value[1])
            if isinstance(value, tuple)
            else normalize_graph(value)
        )
    fingerprints = {
        (
            tuple(sorted(node["id"] for node in value["nodes"])),
            tuple(sorted(edge["id"] for edge in value["edges"])),
        )
        for value in normalized_values
    }

    assert len(cards) == 4
    assert len(fingerprints) == 4


def test_compare_config_code_numbers_only_emitted_individual_configs():
    compare_config_code = load_gallery_function("compare_config_code")
    cards = [
        {
            "title": "Minimal",
            "key": "minimal",
            "config": GraphConfig(display=DisplayConfig(node_labels="hidden")),
        },
        {
            "title": "Default",
            "key": "default",
            "config": GraphConfig(),
        },
        {
            "title": "Fully labelled",
            "key": "full",
            "config": GraphConfig(display=DisplayConfig(label_density=1.0)),
        },
    ]

    code = compare_config_code(cards)

    ast.parse(code)
    assert "config_1 = GraphConfig(" in code
    assert "config_2 = GraphConfig(" in code
    assert "config_3" not in code
    assert "sigma_graph(graph, height=430, key='default')" in code
