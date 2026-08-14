# Changelog

Notable changes to `streamlit-sigmajs` are documented here.

## Unreleased

### Added

- Added explicit `node_size_field`, `node_color_field`, `node_label_field`,
  `node_x_field`, and `node_y_field` mappings so application properties are no
  longer interpreted as rendering attributes implicitly.
- Added node and edge click events plus persistent selection state to the
  component result, with optional Streamlit callbacks.
- Added frontend regression tests for color generation, theme token handling,
  graph conversion, and component lifecycle behavior.

### Fixed

- Generated Sigma-compatible hex colors for categories beyond the built-in
  palette and offset overflow hues to avoid immediately repeating its first
  color.
- Made the Sigma canvas follow Streamlit theme variables and runtime light/dark
  changes, including safe fallbacks for `unset`, `inherit`, and `initial` CSS
  values.
- Preserved NetworkX `label` properties when `labels` or `type` takes structural
  precedence instead of eagerly removing both fields.
- Added readable duplicate node/edge ID and dangling-edge validation before
  rendering.
- Kept dragged nodes from sticking when pointer release happens outside the
  component.
- Removed post-drag graph-bounds recomputation that caused the viewport to jump
  when relaxation ended.
- Prevented display-only configuration changes from rebuilding Sigma or
  rerunning the layout, and made fallback coordinates deterministic.
- Used Sigma's non-indexing refresh path for reducer-only hover and selection
  updates.

### Changed

- Redesigned the example app as a single-page playground with sidebar controls,
  compact non-default code snippets, comparison grids, and visible click and
  selection state.
- Enabled post-drag layout relaxation by default.
- Replaced the per-frame stateless force solver with real-time local spring
  physics during dragging and velocity-based settling after release.
- Removed the post-drag ForceAtlas2 solver option because global relayout after
  a drag conflicted with explicitly selected initial layouts.
- Reworked the example gallery as sidebar-navigated pages with controls local
  to the Playground.
- Made property inspectors responsive to both component width and height,
  aligned compact and card panel geometry, and tightened compact spacing.
- Restored a smaller graph-frame inset and replaced the red selected-node ring
  with a category-colored emphasis treatment.
- Added adaptive and fixed default node sizing, with an explicit `node_size`
  setting for dense graphs and small graph components.
- Moved Playground controls beside the graph and kept the sidebar for page
  navigation only.
- Loaded Dagre only for hierarchical layouts and added a version consistency
  check across Python, component-manifest, and frontend package metadata.
- Node labels now use only `DisplayConfig.node_label_field` (default `"name"`)
  and fall back to node IDs; NetworkX conversion no longer injects synthetic
  `name` properties.

### Compatibility

- `LayoutConfig.drag_solver` has been removed. Drag interactions now always use
  the layout-preserving local spring model; initial `name="forceatlas2"`
  placement remains available.
- Node labels no longer implicitly fall back through `name`, `label`, and
  `title`. The default mapping reads only `name`; graphs that use `label` or
  `title` as display text must set `node_label_field` explicitly.
- Invalid graphs with duplicate IDs or edges referencing missing endpoint nodes
  now raise `ValueError`. This intentionally changes the legacy
  `st_sigmagraph()` behavior, which previously rendered such inputs partially
  by silently dropping dangling edges.

## [0.2.0] - 2026-08-13

### Added

- Direct inputs for NetworkX graphs, Neo4j graph results, pandas DataFrames,
  and canonical or legacy property-graph dictionaries.
- A typed `sigma_graph()` API with `GraphConfig`, `DisplayConfig`, and
  `LayoutConfig`.
- Streamlit-native and humanistic themes.
- Configurable node and edge labels, label fonts, legends, compact or card
  property inspectors, selection dimming, and movement rendering.
- ForceAtlas2, force, circular, circle-pack, grid, concentric, hierarchical,
  random, and pre-positioned layouts.
- Optional post-drag relaxation that keeps the dropped node in place while
  surrounding nodes settle.
- A multi-input example gallery with an interactive playground.

### Changed

- Migrated the frontend to Streamlit Components v2 and Sigma reducers.
- Raised the minimum Streamlit version from 1.50 to 1.51.
- Reworked selection styling so unrelated nodes and edges are softly dimmed
  without losing their category colors.
- Made compact property inspectors and hover-only edge labels the defaults.
- Modernized wheel building and PyPI publishing with GitHub Trusted
  Publishing.
- Updated vulnerable transitive frontend build dependencies.

### Compatibility

- The v0.1 `st_sigmagraph()` entry point and legacy graph dictionary shape
  remain supported. New applications should use `sigma_graph()`.

## [0.1.2] - 2026-08-11

### Fixed

- Removed unused imports that caused a fresh PyPI installation to fail at
  import time.
- Corrected component registration and package metadata inherited from the
  original Streamlit template.
- Added a wheel installation smoke test to the build workflow.

[0.2.0]: https://github.com/gitkeniwo/streamlit-sigmajs/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/gitkeniwo/streamlit-sigmajs/releases/tag/v0.1.2
