import Graph from 'graphology';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDragPhysics, DEFAULT_DRAG_PHYSICS_SETTINGS } from './dragPhysics';

const addNode = (graph: Graph, node: string, x: number, y: number) => {
  graph.addNode(node, { x, y });
};

const position = (graph: Graph, node: string) => ({
  x: graph.getNodeAttribute(node, 'x') as number,
  y: graph.getNodeAttribute(node, 'y') as number,
});

const displacement = (graph: Graph, node: string, startX: number, startY: number) => {
  const current = position(graph, node);
  return Math.hypot(current.x - startX, current.y - startY);
};

describe('drag physics', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  it('uses the tuned underdamped defaults', () => {
    expect(DEFAULT_DRAG_PHYSICS_SETTINGS).toMatchObject({
      k_edge: 220,
      k_anchor: 60,
      damping_ratio: 0.20,
      rest_velocity_ratio: 0.05,
    });
  });

  it('does not disturb an initially resting graph', () => {
    const graph = new Graph();
    addNode(graph, 'a', 0, 0);
    addNode(graph, 'b', 1, 0);
    addNode(graph, 'c', 2, 0);
    graph.addEdge('a', 'b');
    graph.addEdge('b', 'c');
    const physics = createDragPhysics(graph);

    physics.begin('a');
    physics.advance(1);

    expect(displacement(graph, 'a', 0, 0)).toBeLessThan(1e-6);
    expect(displacement(graph, 'b', 1, 0)).toBeLessThan(1e-6);
    expect(displacement(graph, 'c', 2, 0)).toBeLessThan(1e-6);
  });

  it('moves direct neighbors while keeping distant nodes local', () => {
    const graph = new Graph();
    for (let index = 0; index < 7; index += 1) addNode(graph, String(index), index, 0);
    for (let index = 0; index < 6; index += 1) graph.addEdge(String(index), String(index + 1));
    const physics = createDragPhysics(graph);

    physics.begin('0');
    for (let step = 1; step <= 60; step += 1) {
      physics.dragTo(2 * step / 60, 0);
      physics.advance(DEFAULT_DRAG_PHYSICS_SETTINGS.dt);
    }

    const hopDisplacements = Array.from({ length: 6 }, (_, index) => displacement(
      graph,
      String(index + 1),
      index + 1,
      0,
    ));
    expect(hopDisplacements[0]).toBeGreaterThan(0.3);
    expect(hopDisplacements[0]).toBeLessThan(2);
    expect(hopDisplacements[4]).toBeLessThan(0.1);
    for (let index = 1; index < hopDisplacements.length; index += 1) {
      expect(hopDisplacements[index]).toBeLessThan(hopDisplacements[index - 1]);
    }
  });

  it('settles after release and stops before or shortly after its deadline', () => {
    const graph = new Graph();
    addNode(graph, 'a', 0, 0);
    addNode(graph, 'b', 1, 0);
    graph.addEdge('a', 'b');
    const physics = createDragPhysics(graph);

    physics.begin('a');
    physics.dragTo(2, 0);
    physics.advance(0.25);
    physics.release(1000);
    physics.advance(1.5);

    expect(physics.isActive()).toBe(false);
    expect(physics.maxSpeed()).toBeLessThan(
      DEFAULT_DRAG_PHYSICS_SETTINGS.rest_velocity_ratio,
    );
  });

  it('keeps the dragged node pinned exactly at the latest cursor position', () => {
    const graph = new Graph();
    addNode(graph, 'a', 0, 0);
    addNode(graph, 'b', 1, 0);
    graph.addEdge('a', 'b');
    const onUpdate = vi.fn();
    const physics = createDragPhysics(graph, { onUpdate });

    physics.begin('a');
    physics.dragTo(3.25, -1.5);
    expect(position(graph, 'a')).toEqual({ x: 3.25, y: -1.5 });
    expect(onUpdate).not.toHaveBeenCalled();
    physics.advance(0.75);
    expect(position(graph, 'a')).toEqual({ x: 3.25, y: -1.5 });
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate.mock.calls[0][0]).toContain('a');

    physics.release(1000);
    physics.advance(0.4);
    expect(position(graph, 'a')).toEqual({ x: 3.25, y: -1.5 });
  });

  it('flushes a silent drag update immediately on release', () => {
    const graph = new Graph();
    addNode(graph, 'a', 0, 0);
    const onUpdate = vi.fn();
    const physics = createDragPhysics(graph, { onUpdate });

    physics.begin('a');
    physics.dragTo(4, 5);
    expect(onUpdate).not.toHaveBeenCalled();
    physics.release(1000);

    expect(onUpdate).toHaveBeenCalledWith(['a']);
  });

  it('limits simulation and updates to the configured hop neighborhood', () => {
    const graph = new Graph();
    for (let index = 0; index < 12; index += 1) addNode(graph, String(index), index, 0);
    for (let index = 0; index < 11; index += 1) graph.addEdge(String(index), String(index + 1));
    const onUpdate = vi.fn();
    const physics = createDragPhysics(graph, { onUpdate }, { active_hops: 3 });

    physics.begin('0');
    physics.dragTo(2, 0);
    physics.advance(0.5);

    expect(position(graph, '4')).toEqual({ x: 4, y: 0 });
    const updatedNodes = new Set(onUpdate.mock.calls.flatMap(([nodes]) => nodes));
    expect(updatedNodes.has('4')).toBe(false);
    expect(Array.from(updatedNodes).every((node) => Number(node) <= 3)).toBe(true);
  });

  it('handles empty, singleton, self-loop, overlap, and non-finite coordinates', () => {
    const empty = new Graph();
    const emptyPhysics = createDragPhysics(empty);
    emptyPhysics.begin('missing');
    emptyPhysics.advance(1);
    expect(emptyPhysics.isActive()).toBe(false);

    const graph = new Graph();
    addNode(graph, 'a', 0, 0);
    addNode(graph, 'b', 0, 0);
    addNode(graph, 'bad', Number.NaN, Infinity);
    graph.addEdge('a', 'a');
    graph.addEdge('a', 'b');
    const physics = createDragPhysics(graph);
    physics.begin('a');
    physics.dragTo(1, 1);
    physics.advance(0.5);
    physics.release(100);
    physics.advance(0.5);

    for (const node of ['a', 'b']) {
      expect(Number.isFinite(position(graph, node).x)).toBe(true);
      expect(Number.isFinite(position(graph, node).y)).toBe(true);
    }
    expect(Number.isNaN(position(graph, 'bad').x)).toBe(true);
    expect(position(graph, 'bad').y).toBe(Infinity);

    const singleton = new Graph();
    addNode(singleton, 'only', 4, 5);
    const singletonPhysics = createDragPhysics(singleton);
    singletonPhysics.begin('only');
    singletonPhysics.dragTo(6, 7);
    singletonPhysics.release(1000);
    singletonPhysics.advance(0.1);
    expect(position(singleton, 'only')).toEqual({ x: 6, y: 7 });
  });
});
