# Changelog

Notable changes to `streamlit-sigmajs` are documented here.

## Unreleased

### Changed

- Enabled post-drag layout relaxation by default.
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
