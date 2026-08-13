// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphConfig, PropertyGraphData } from '../utils/types';

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  setCustomBBox: vi.fn(),
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
      private readonly mouseCaptor = new MockCaptor(mocks.mouseHandlers);
      private readonly touchCaptor = new MockCaptor(mocks.touchHandlers);

      on(event: string, handler: (...args: any[]) => void) {
        mocks.sigmaHandlers.set(event, handler);
        return this;
      }
      kill() { return undefined; }
      refresh(options?: unknown) {
        mocks.refresh(options);
        return this;
      }
      resize() { return this; }
      setCustomBBox(bounds: unknown) {
        mocks.setCustomBBox(bounds);
        return this;
      }
      setSetting() { return this; }
      getMouseCaptor() { return this.mouseCaptor; }
      getTouchCaptor() { return this.touchCaptor; }
      viewportToGraph(position: { x: number; y: number }) { return position; }
    },
  };
});

vi.mock('@sigma/node-border', () => ({ NodeBorderProgram: class {} }));
vi.mock('../utils/layoutUtils', () => ({ applyInitialLayout: vi.fn() }));

import InteractiveGraph from './InteractiveGraph';

const graphData: PropertyGraphData = {
  nodes: [
    { id: 'a', labels: ['Person'], properties: { name: 'Ada', x: 0, y: 0 } },
    { id: 'b', labels: ['Person'], properties: { name: 'Bob', x: 1, y: 0 } },
  ],
  edges: [
    { id: 'e', source: 'a', target: 'b', type: 'KNOWS', properties: {}, directed: true },
  ],
};

const config: GraphConfig = {
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
    properties_panel: 'compact',
    selection_dimming: 0.68,
    hide_edges_on_move: false,
  },
  layout: {
    name: 'none',
    iterations: 0,
    gravity: 1,
    scaling_ratio: 10,
    lin_log_mode: false,
    strong_gravity_mode: false,
    dynamic_after_drag: true,
    drag_relaxation_ms: 1000,
    hierarchy_direction: 'TB',
  },
};

class ResizeObserverStub {
  observe() { return undefined; }
  disconnect() { return undefined; }
}

describe('InteractiveGraph drag lifecycle', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    mocks.refresh.mockClear();
    mocks.setCustomBBox.mockClear();
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
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('uses partial refreshes and never changes the bbox during dragging', async () => {
    await act(async () => {
      root.render(<InteractiveGraph args={{ graphData, config, theme: 'humanistic' }} />);
    });
    expect(mocks.setCustomBBox).toHaveBeenCalledTimes(1);

    await act(async () => {
      mocks.sigmaHandlers.get('downNode')?.({ node: 'a' });
      mocks.mouseHandlers.get('mousemovebody')?.({
        x: 2,
        y: 1,
        preventSigmaDefault: vi.fn(),
        original: { preventDefault: vi.fn(), stopPropagation: vi.fn() },
      });
      mocks.mouseHandlers.get('mouseup')?.();
    });

    expect(mocks.setCustomBBox).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).toHaveBeenCalledWith({ partialGraph: { nodes: ['a'] } });
  });
});
