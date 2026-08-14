import { describe, expect, it } from 'vitest';

import { convertPropertyGraphToGraph, deterministicPosition } from './graphDataUtils';
import { PropertyGraphData } from './types';

const mapping = {
  nodeSizeField: null,
  nodeColorField: null,
  nodeLabelField: 'name',
  nodeXField: null,
  nodeYField: null,
};

const graphData: PropertyGraphData = {
  nodes: [
    { id: 'a', labels: ['Person'], properties: { name: 'Ada', size: 5000, x: 99, y: 98 } },
    { id: 'b', labels: ['Person'], properties: { name: 'Bob', weight: 14, px: 2, py: 3 } },
  ],
  edges: [
    { id: 'knows', source: 'a', target: 'b', type: 'KNOWS', properties: {}, directed: true },
  ],
};

describe('convertPropertyGraphToGraph', () => {
  it('treats size/x/y as data unless fields are explicitly mapped', () => {
    const graph = convertPropertyGraphToGraph(
      graphData,
      new Map([['Person', '#123456']]),
      '#000000',
      '#999999',
      10,
      mapping,
    );

    expect(graph.getNodeAttribute('a', 'size')).toBe(10);
    expect(graph.getNodeAttribute('a', 'x')).not.toBe(99);
    expect(graph.getNodeAttribute('a', 'label')).toBe('Ada');
    expect(graph.getNodeAttribute('a', 'properties').size).toBe(5000);
  });

  it('only uses the explicitly configured label property', () => {
    const graph = convertPropertyGraphToGraph(
      graphData,
      new Map([['Person', '#123456']]),
      '#000000',
      '#999999',
      10,
      { ...mapping, nodeLabelField: 'title' },
    );

    expect(graph.getNodeAttribute('a', 'label')).toBe('a');
    expect(graph.getNodeAttribute('a', 'properties').name).toBe('Ada');
  });

  it('honors explicit size and coordinate mappings', () => {
    const graph = convertPropertyGraphToGraph(
      graphData,
      new Map([['Person', '#123456']]),
      '#000000',
      '#999999',
      10,
      { ...mapping, nodeSizeField: 'weight', nodeXField: 'px', nodeYField: 'py' },
    );

    expect(graph.getNodeAttribute('b', 'size')).toBe(14);
    expect(graph.getNodeAttribute('b', 'x')).toBe(2);
    expect(graph.getNodeAttribute('b', 'y')).toBe(3);
  });

  it('rejects dangling edges rather than silently dropping them', () => {
    const invalid = {
      ...graphData,
      edges: [{ ...graphData.edges[0], target: 'missing' }],
    };

    expect(() => convertPropertyGraphToGraph(
      invalid,
      new Map([['Person', '#123456']]),
      '#000000',
      '#999999',
      10,
      mapping,
    )).toThrow(/knows.*a -> missing/);
  });
});

describe('deterministicPosition', () => {
  it('returns stable initial coordinates for the same node id', () => {
    expect(deterministicPosition('node-42')).toEqual(deterministicPosition('node-42'));
    expect(deterministicPosition('node-42')).not.toEqual(deterministicPosition('node-43'));
  });
});
