# st-sigma

Streamlit component that allows you visualize interactive graphs using sigma.js.

## Installation instructions

### Development Mode (Recommended)

To install the package in editable mode so that local changes are reflected immediately:

1. Activate your uv venv
2. Run the following command from the root directory:

```sh
uv pip install -e ./streamlit-sigmajs
```

### Build Frontend

To build your frontend code, run the following commands from the `streamlit-sigmajs/st_sigma/frontend` directory:

```sh
npm install
npm run build
```

### Run Example

To start your streamlit app, in the `streamlit-sigmajs/st_sigma` directory, run:

```sh
uv pip install streamlit neo4j
streamlit run example.py
```

## Usage instructions

```python
import streamlit as st
from st_sigma import st_sigmagraph, neo4jgraph_to_sigma

# ... (Neo4j connection setup) ...

# Basic Usage
st_sigmagraph(
    graphData=result,
    height=500,  # Required by Streamlit to reserve space
    layout="force",  # Options: "force" (default), "circular", "random"
    layout_settings={
        "gravity": 0.5,
        "iterations": 150
    },
    key="neo4j_graph"
)
```

The component now supports dynamic resizing within its container (height: 100vh). You must still provide a `height` argument to `st_sigmagraph` to reserve the vertical space in the Streamlit layout.

## Publishing to PyPI

To build and publish the package to PyPI using `uv`:

1. **Build Frontend First** (Critical):
   Ensure the frontend is compiled before packaging, as `uv build` does not do this automatically.
   ```sh
   cd st_sigma/frontend
   npm install
   npm run build
   cd ../..
   ```

2. **Clean old builds** (optional but recommended):
   ```sh
   rm -rf dist/
   ```

3. **Build the package**:
   ```sh
   uv build
   ```

4. **Publish to PyPI**:
   ```sh
   uv publish
   ```
   *Note: Ensure you have your PyPI credentials configured or set via environment variables (`UV_PUBLISH_TOKEN`).*

