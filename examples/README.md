# Example gallery

The gallery is tracked because it is executable documentation. Downloaded or
materialized datasets belong in `examples/data/`, which is intentionally
ignored and excluded from Python distributions.

Build the frontend, then launch the gallery from the repository root:

```sh
cd st_sigma/frontend
npm ci
npm run build
cd ../..
uv run --extra examples streamlit run examples/app.py
```

The gallery is a single-page app with two views. Playground keeps a large,
interactive graph visible while its dataset, theme, layout, and detailed
controls live in the sidebar. Compare presents themes, supported Python inputs,
all layout options, and low-clutter display presets in two-column grids. Code
examples show only settings that differ from the defaults, with the full
configuration still available on demand. The page also exposes normalized
data and the component's persistent selection state.

The examples use public datasets bundled with NetworkX, an original synthetic
supply-chain graph, and a small Neo4j-compatible structural example.
To materialize JSON snapshots for adapter development:

```sh
uv run --extra examples python examples/prepare_data.py
```

Dataset references:

- [Zachary's Karate Club](https://networkx.org/documentation/stable/reference/generated/networkx.generators.social.karate_club_graph.html)
- [Davis Southern Women](https://networkx.org/documentation/stable/reference/generated/networkx.generators.social.davis_southern_women_graph.html)
- [Les Misérables](https://networkx.org/documentation/stable/reference/generated/networkx.generators.social.les_miserables_graph.html)

For local comparison with Neo4j's official Movies example, clone it into the
ignored cache. Its upstream licensing and attribution remain authoritative;
the repository is not redistributed by streamlit-sigmajs.

```sh
git clone --depth 1 https://github.com/neo4j-graph-examples/movies \
  examples/data/neo4j-movies
```
