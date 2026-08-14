// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import Graph from 'graphology';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphConfig, PropertyGraphData } from '../utils/types';

const mocks = vi.hoisted(() => ({
  sigmaConstructor: vi.fn(),
  setCustomBBox: vi.fn(),
  refresh: vi.fn(),
  resize: vi.fn(),
  animatedReset: vi.fn(),
  applyInitialLayout: vi.fn(() => Promise.resolve()),
  sigmaHandlers: new Map<string, (...args: any[]) => void>(),
  mouseHandlers: new Map<string, (...args: any[]) => void>(),
  touchHandlers: new Map<string, (...args: any[]) => void>(),
}));

vi.mock('sigma', () => {
  class MockCaptor {
    constructor(private readonly handlers: Map<string, (...args: any[]) => void>) {}
    on(event: string, handler: (...args: any[]) => void) {
      this.handlers.set(event, handler);
      return this;
    }
  }

  return {
    default: class MockSigma {
      private readonly container: HTMLElement;
      private readonly mouseCaptor = new MockCaptor(mocks.mouseHandlers);
      private readonly touchCaptor = new MockCaptor(mocks.touchHandlers);

      constructor(_graph: unknown, container: HTMLElement) {
        this.container = container;
        mocks.sigmaConstructor();
      }

      on(event: string, handler: (...args: any[]) => void) {
        mocks.sigmaHandlers.set(event, handler);
        return this;
      }
      kill() { return undefined; }
      refresh(options?: unknown) {
        mocks.refresh(options);
        return this;
      }
      resize(force?: boolean) {
        mocks.resize(force);
        return this;
      }
      getCamera() { return { animatedReset: mocks.animatedReset }; }
      setCustomBBox(bounds: unknown) {
        mocks.setCustomBBox(bounds);
        return this;
      }
      setSetting() { return this; }
      setSettings() { return this; }
      getContainer() { return this.container; }
      getMouseCaptor() { return this.mouseCaptor; }
      getTouchCaptor() { return this.touchCaptor; }
      viewportToGraph(position: { x: number; y: number }) { return position; }
    },
  };
});

vi.mock('@sigma/node-border', () => ({ NodeBorderProgram: class {} }));
vi.mock('../utils/layoutUtils', () => ({
  applyInitialLayout: mocks.applyInitialLayout,
}));

import InteractiveGraph, { getStableGraphBounds } from './InteractiveGraph';

const graphData: PropertyGraphData = {
  nodes: [
    { id: 'a', labels: ['Person'], properties: { name: 'Ada' } },
    { id: 'b', labels: ['Person'], properties: { name: 'Bob' } },
  ],
  edges: [
    { id: 'e', source: 'a', target: 'b', type: 'KNOWS', properties: {}, directed: true },
  ],
};

const config = (selectionDimming: number): GraphConfig => ({
  display: {
    node_labels: 'auto',
    edge_labels: 'hover',
    node_label_size: 12,
    node_size: 10,
    node_size_mode: 'auto',
    edge_label_size: 9,
    label_density: 0.8,
    label_rendered_size_threshold: 6,
    label_font_family: 'sans-serif',
    label_font_url: null,
    show_legend: true,
    legend_collapsed: true,
    show_fullscreen_button: true,
    properties_panel: 'compact',
    selection_dimming: selectionDimming,
    hide_edges_on_move: false,
    node_size_field: null,
    node_color_field: null,
    node_label_field: 'name',
  },
  layout: {
    name: 'forceatlas2',
    iterations: 10,
    gravity: 1,
    scaling_ratio: 10,
    lin_log_mode: false,
    strong_gravity_mode: false,
    dynamic_after_drag: true,
    drag_relaxation_ms: 1000,
    hierarchy_direction: 'TB',
    node_x_field: null,
    node_y_field: null,
  },
});

class ResizeObserverStub {
  observe() { return undefined; }
  disconnect() { return undefined; }
}

describe('getStableGraphBounds', () => {
  it('adds enough padding for labels outside laid-out node coordinates', () => {
    const graph = new Graph();
    graph.addNode('left-top', { x: -4, y: 2 });
    graph.addNode('right-bottom', { x: 6, y: -2 });

    expect(getStableGraphBounds(graph)).toEqual({
      x: [-6.5, 8.5],
      y: [-3, 3],
    });
  });
});

describe('InteractiveGraph lifecycle', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mocks.sigmaConstructor.mockClear();
    mocks.setCustomBBox.mockClear();
    mocks.refresh.mockClear();
    mocks.resize.mockClear();
    mocks.animatedReset.mockClear();
    mocks.applyInitialLayout.mockClear();
    mocks.sigmaHandlers.clear();
    mocks.mouseHandlers.clear();
    mocks.touchHandlers.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not recreate Sigma or rerun layout for selection dimming changes', async () => {
    await act(async () => {
      root.render(
        <InteractiveGraph args={{ graphData, config: config(0.4), theme: 'humanistic' }} />,
      );
    });

    expect(mocks.sigmaConstructor).toHaveBeenCalledTimes(1);
    expect(mocks.applyInitialLayout).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.render(
        <InteractiveGraph args={{ graphData, config: config(0.8), theme: 'humanistic' }} />,
      );
    });

    expect(mocks.sigmaConstructor).toHaveBeenCalledTimes(1);
    expect(mocks.applyInitialLayout).toHaveBeenCalledTimes(1);
  });

  it('does not recompute the custom bbox while dragging or relaxing', async () => {
    await act(async () => {
      root.render(
        <InteractiveGraph args={{ graphData, config: config(0.68), theme: 'humanistic' }} />,
      );
      await Promise.resolve();
    });
    const callsAfterInitialLayout = mocks.setCustomBBox.mock.calls.length;
    expect(callsAfterInitialLayout).toBe(1);

    await act(async () => {
      mocks.sigmaHandlers.get('downNode')?.({ node: 'a' });
      mocks.mouseHandlers.get('mousemovebody')?.({
        x: 2,
        y: 1,
        preventSigmaDefault: vi.fn(),
        original: {
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        },
      });
      mocks.mouseHandlers.get('mouseup')?.();
    });

    expect(mocks.setCustomBBox).toHaveBeenCalledTimes(callsAfterInitialLayout);
    expect(mocks.refresh).toHaveBeenCalledWith({ partialGraph: { nodes: ['a'] } });
  });

  it('sets a fallback bbox when the initial layout fails', async () => {
    const layoutError = new Error('layout failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.applyInitialLayout.mockRejectedValueOnce(layoutError);

    await act(async () => {
      root.render(
        <InteractiveGraph args={{ graphData, config: config(0.68), theme: 'humanistic' }} />,
      );
      await Promise.resolve();
    });

    expect(consoleError).toHaveBeenCalledWith('Failed to apply initial graph layout:', layoutError);
    expect(mocks.setCustomBBox).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it('keeps Sigma hidden until the asynchronous initial layout completes', async () => {
    let finishLayout: (() => void) | undefined;
    mocks.applyInitialLayout.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishLayout = resolve;
    }));

    await act(async () => {
      root.render(
        <InteractiveGraph args={{ graphData, config: config(0.68), theme: 'humanistic' }} />,
      );
    });
    const sigmaContainer = container.querySelector<HTMLElement>('.sigma-container');
    expect(sigmaContainer?.style.visibility).toBe('hidden');
    expect(mocks.setCustomBBox).not.toHaveBeenCalled();

    await act(async () => {
      finishLayout?.();
      await Promise.resolve();
    });

    expect(sigmaContainer?.style.visibility).toBe('visible');
    expect(mocks.setCustomBBox).toHaveBeenCalledTimes(1);
  });

  it('expands in-page, locks scrolling, refits, and collapses on Escape', async () => {
    document.body.style.overflow = 'clip';
    await act(async () => {
      root.render(
        <InteractiveGraph args={{ graphData, config: config(0.68), theme: 'humanistic' }} />,
      );
      await Promise.resolve();
    });

    const graphContainer = container.querySelector<HTMLElement>('.graph-container');
    const expandButton = container.querySelector<HTMLButtonElement>('.expand-toggle-button');
    vi.mocked(requestAnimationFrame).mockImplementation((callback) => {
      callback(0);
      return 2;
    });
    await act(async () => {
      expandButton?.click();
    });

    expect(graphContainer?.classList.contains('is-expanded')).toBe(true);
    expect(expandButton?.getAttribute('aria-label')).toBe('Collapse graph');
    expect(document.body.style.overflow).toBe('hidden');
    expect(mocks.resize).toHaveBeenCalledWith(true);
    expect(mocks.animatedReset).toHaveBeenCalledWith({ duration: 250 });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(graphContainer?.classList.contains('is-expanded')).toBe(false);
    expect(expandButton?.getAttribute('aria-label')).toBe('Expand graph');
    expect(document.body.style.overflow).toBe('clip');
    expect(mocks.animatedReset).toHaveBeenCalledTimes(2);

    await act(async () => {
      expandButton?.click();
    });
    await act(async () => {
      expandButton?.click();
    });

    expect(graphContainer?.classList.contains('is-expanded')).toBe(false);
    expect(document.body.style.overflow).toBe('clip');
    document.body.style.overflow = '';
  });

  it('can hide the fullscreen control through display configuration', async () => {
    const hiddenButtonConfig = config(0.68);
    hiddenButtonConfig.display.show_fullscreen_button = false;

    await act(async () => {
      root.render(
        <InteractiveGraph
          args={{ graphData, config: hiddenButtonConfig, theme: 'humanistic' }}
        />,
      );
    });

    expect(container.querySelector('.expand-toggle-button')).toBeNull();
  });
});
