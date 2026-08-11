"""Materialize public example graphs into the ignored examples/data cache."""

from __future__ import annotations

import json
from pathlib import Path

from example_graphs import EXAMPLES


DATA_DIR = Path(__file__).parent / "data"


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    for name, (_description, build_graph) in EXAMPLES.items():
        slug = name.lower().replace(" — ", "-").replace(" ", "-")
        destination = DATA_DIR / f"{slug}.json"
        destination.write_text(
            json.dumps(build_graph(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"wrote {destination.relative_to(Path(__file__).parents[1])}")


if __name__ == "__main__":
    main()
