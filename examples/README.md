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

The gallery uses public datasets bundled with NetworkX and an original
synthetic supply-chain graph. To materialize JSON snapshots for adapter
development:

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
