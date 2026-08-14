from datetime import date
import json
from pathlib import Path
try:
    import tomllib
except ModuleNotFoundError:  # Python 3.10
    import tomli as tomllib

from st_sigma import (
    _inline_javascript_with_chunks,
    neo4jgraph_to_sigma,
    serialize_neo4j_value,
)


class FakeNode(dict):
    def __init__(self, element_id, labels, **properties):
        super().__init__(properties)
        self.element_id = element_id
        self.labels = labels


class FakeRelationship(dict):
    def __init__(
        self,
        element_id,
        start_node,
        end_node,
        relationship_type,
        **properties,
    ):
        super().__init__(properties)
        self.element_id = element_id
        self.start_node = start_node
        self.end_node = end_node
        self.type = relationship_type


class FakeGraph:
    def __init__(self, nodes, relationships):
        self.nodes = nodes
        self.relationships = relationships


def test_serialize_neo4j_value_handles_nested_non_json_values():
    value = {
        "date": date(2025, 10, 22),
        "scores": [1.0, float("nan"), float("inf")],
    }

    assert serialize_neo4j_value(value) == {
        "date": "2025-10-22",
        "scores": [1.0, None, None],
    }


def test_neo4j_conversion_uses_structural_objects_not_neo4j_imports():
    alice = FakeNode("person-1", {"Person"}, name="Alice")
    graph = FakeGraph(
        nodes=[alice],
        relationships=[
            FakeRelationship(
                "rel-1",
                alice,
                alice,
                "KNOWS",
                since=2025,
            )
        ],
    )

    assert neo4jgraph_to_sigma(graph) == {
        "nodes": [
            {
                "identity": "person-1",
                "labels": ["Person"],
                "properties": {"name": "Alice"},
            }
        ],
        "relationships": [
            {
                "identity": "rel-1",
                "start": "person-1",
                "end": "person-1",
                "type": "KNOWS",
                "properties": {"since": 2025},
            }
        ],
    }


def test_component_v2_manifest_and_assets_are_packaged():
    package_dir = Path(__file__).parents[1] / "st_sigma"
    manifest = package_dir / "pyproject.toml"
    build_dir = package_dir / "frontend" / "build"

    assert manifest.is_file()
    assert 'name = "sigma_graph"' in manifest.read_text(encoding="utf-8")
    assert len(list(build_dir.glob("index-*.js"))) == 1
    assert len(list(build_dir.glob("style-*.css"))) == 1
    assert len(list(build_dir.glob("dagre*.js"))) == 1


def test_editable_install_fallback_inlines_dynamic_chunks():
    build_dir = Path(__file__).parents[1] / "st_sigma" / "frontend" / "build"
    entry = next(build_dir.glob("index-*.js"))

    javascript = _inline_javascript_with_chunks(build_dir, entry)

    assert 'import("./dagre' not in javascript
    assert 'import("data:text/javascript;base64,' in javascript


def test_all_package_versions_match():
    root = Path(__file__).parents[1]
    root_version = tomllib.loads((root / "pyproject.toml").read_text())["project"]["version"]
    manifest_version = tomllib.loads(
        (root / "st_sigma" / "pyproject.toml").read_text()
    )["project"]["version"]
    frontend_version = json.loads(
        (root / "st_sigma" / "frontend" / "package.json").read_text()
    )["version"]
    lock_version = json.loads(
        (root / "st_sigma" / "frontend" / "package-lock.json").read_text()
    )["version"]
    examples_reqs = (root / "examples" / "requirements.txt").read_text()

    assert root_version == manifest_version == frontend_version == lock_version
    assert f"streamlit-sigmajs=={root_version}" in examples_reqs
