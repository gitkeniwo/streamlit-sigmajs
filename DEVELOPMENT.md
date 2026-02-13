# Local Development Guide for st-sigma

This guide explains how to develop the `st-sigma` Streamlit component locally before publishing to PyPI.

## Architecture Overview

```
streamlit-sigmajs/
├── st_sigma/
│   ├── __init__.py          # Python wrapper (declares component)
│   └── frontend/
│       ├── src/              # React/TypeScript source
│       ├── build/            # Compiled frontend (MUST exist for production mode)
│       └── package.json
├── setup.py                  # Package metadata
└── DEVELOPMENT.md            # This file
```

## How Streamlit Custom Components Work

1. **Python wrapper** (`__init__.py`) calls `components.declare_component()` to register the component
2. **Frontend** is a React app that communicates with Streamlit via `streamlit-component-lib`
3. In **production mode** (`_RELEASE = True`), Streamlit serves static files from `frontend/build/`
4. In **development mode** (`_RELEASE = False`), Streamlit proxies to a local dev server (e.g., `localhost:3001`)

## Local Development Setup

### 1. Install as Editable Package

From the **main project root** (not inside `streamlit-sigmajs/`):

```bash
uv pip install -e ./streamlit-sigmajs
```

This creates a `.pth` file that points Python imports directly to your source directory, so changes are reflected immediately without reinstalling.

### 2. Build the Frontend

```bash
cd streamlit-sigmajs/st_sigma/frontend
npm install
npm run build
```

**IMPORTANT**: You must rebuild the frontend after any TypeScript/React changes.

### 3. Verify Installation

```bash
uv run python -c "
import st_sigma
print('Module path:', st_sigma.__file__)
# Should show: /path/to/graph-integration/streamlit-sigmajs/st_sigma/__init__.py
"
```

## Common Issues & Solutions

### Issue: Component shows old version / doesn't update

**Symptom**: Changes to frontend code don't appear in Streamlit.

**Root Cause**: Python is loading from `site-packages/` instead of the editable source.

**Diagnosis**:
```bash
uv run python -c "import st_sigma; print(st_sigma.__file__)"
```

If it shows `.venv/lib/python3.x/site-packages/st_sigma/...`, you have a conflict.

**Solution**:
```bash
# Remove any conflicting packages
uv pip uninstall streamlit-sigmajs  # PyPI version
uv pip uninstall st-sigma           # Old local installs

# Reinstall as editable
uv pip install -e ./streamlit-sigmajs --force-reinstall

# Verify
uv run python -c "import st_sigma; print(st_sigma.__file__)"
# Should now show: .../streamlit-sigmajs/st_sigma/__init__.py
```

### Issue: Two packages provide the same module

**Symptom**: Both `st-sigma` (local) and `streamlit-sigmajs` (PyPI) are installed.

**Root Cause**: `pyproject.toml` has `streamlit-sigmajs>=0.1.0` as a dependency, AND you installed the local editable version.

**Solution**:
1. Remove `streamlit-sigmajs` from `pyproject.toml` dependencies
2. Only use `uv pip install -e ./streamlit-sigmajs` for local development
3. Add it back to `pyproject.toml` when you're ready to publish and use the PyPI version

### Issue: Frontend changes not reflected

**Symptom**: After editing `.tsx` files, the component looks the same.

**Solution**:
```bash
cd streamlit-sigmajs/st_sigma/frontend
npm run build
```

Then refresh your Streamlit app (Ctrl+R or click "Rerun").

## Development Workflow

### Iterating on Python Code

Changes to `st_sigma/__init__.py` are reflected immediately (editable install). Just refresh Streamlit.

### Iterating on Frontend Code

1. Edit files in `st_sigma/frontend/src/`
2. Run `npm run build`
3. Refresh Streamlit

**Tip**: For faster iteration, use development mode:

```python
# In st_sigma/__init__.py, set:
_RELEASE = False
```

Then run the Vite dev server:
```bash
cd st_sigma/frontend
npm run dev  # Starts on localhost:3001
```

This enables hot-reload for frontend changes.

## Preparing for PyPI Publication

When ready to publish:

1. **Build frontend** (critical - `uv build` does NOT do this):
   ```bash
   cd st_sigma/frontend
   npm install
   npm run build
   ```

2. **Ensure production mode**:
   ```python
   # In st_sigma/__init__.py
   _RELEASE = True
   ```

3. **Build and publish**:
   ```bash
   cd streamlit-sigmajs
   uv build
   uv publish
   ```

4. **Update main project**:
   ```toml
   # In graph-integration/pyproject.toml
   dependencies = [
       ...
       "streamlit-sigmajs>=0.2.0",  # Your new version
   ]
   ```

## Quick Reference

| Task | Command |
|------|---------|
| Install locally | `uv pip install -e ./streamlit-sigmajs` |
| Rebuild frontend | `cd streamlit-sigmajs/st_sigma/frontend && npm run build` |
| Check module path | `uv run python -c "import st_sigma; print(st_sigma.__file__)"` |
| List sigma packages | `uv pip list \| grep -i sigma` |
| Force reinstall | `uv pip install -e ./streamlit-sigmajs --force-reinstall` |
| Start dev server | `cd st_sigma/frontend && npm run dev` |
