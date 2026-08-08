import { describe, expect, it } from 'vitest';

import type { DelegationNode } from '@/lib/api/types';
import { getTimelineLayout } from './timeline-layout';

/** Build a minimal DelegationNode, overriding only the fields a test cares
 *  about. Non-root by default; pass `parent_id: null` for root nodes. */
function node(overrides: Partial<DelegationNode> & { id: string }): DelegationNode {
  return {
    parent_id: 'parent',
    agent: 'test-agent',
    model: null,
    title: '',
    time_created: 0,
    depth: 0,
    children: [],
    cost: 0,
    tokens_input: 0,
    tokens_output: 0,
    tokens_reasoning: 0,
    tokens_cache_read: 0,
    tokens_cache_write: 0,
    ...overrides,
  };
}

function positionOf(layout: ReturnType<typeof getTimelineLayout>, id: string) {
  const found = layout.nodes.find((n) => n.id === id);
  if (!found) throw new Error(`node ${id} not in layout`);
  return found.position;
}

describe('getTimelineLayout', () => {
  it('returns empty nodes and edges for an empty chain', () => {
    expect(getTimelineLayout([], new Set())).toEqual({ nodes: [], edges: [] });
  });

  it('places a single root node at (padding, padding)', () => {
    const layout = getTimelineLayout([node({ id: 'r', parent_id: null })], new Set());
    expect(layout.nodes).toHaveLength(1);
    expect(layout.nodes[0].position).toEqual({ x: 32, y: 32 });
    expect(layout.edges).toEqual([]);
  });

  it('puts the root in lane 0 and siblings in a shared lane, ordered by time', () => {
    const layout = getTimelineLayout(
      [
        node({ id: 'r', parent_id: null, time_created: 0 }),
        node({ id: 'c1', parent_id: 'r', time_created: 1000 }),
        node({ id: 'c2', parent_id: 'r', time_created: 2000 }),
      ],
      new Set(),
    );
    const root = positionOf(layout, 'r');
    const child1 = positionOf(layout, 'c1');
    const child2 = positionOf(layout, 'c2');

    expect(root.y).toBe(32);
    expect(child1.y).toBe(152);
    expect(child2.y).toBe(152);
    expect(child1.x).toBeGreaterThan(root.x);
    expect(child2.x).toBeGreaterThan(child1.x);
  });

  it('does not put cousins in the same lane', () => {
    const layout = getTimelineLayout(
      [
        node({ id: 'r', parent_id: null, time_created: 0 }),
        node({ id: 'a', parent_id: 'r', time_created: 100 }),
        node({ id: 'b', parent_id: 'r', time_created: 200 }),
        node({ id: 'a1', parent_id: 'a', time_created: 300 }),
        node({ id: 'b1', parent_id: 'b', time_created: 400 }),
      ],
      new Set(),
    );
    const a = positionOf(layout, 'a');
    const b = positionOf(layout, 'b');
    const a1 = positionOf(layout, 'a1');
    const b1 = positionOf(layout, 'b1');

    // Siblings share a lane.
    expect(a.y).toBe(b.y);
    // Cousins do not.
    expect(a1.y).not.toBe(b1.y);
    expect(a1.y).not.toBe(a.y);
    expect(b1.y).not.toBe(b.y);
  });

  it('does not mutate the input chain', () => {
    const input = [
      node({ id: 'r', parent_id: null, time_created: 0 }),
      node({ id: 'c1', parent_id: 'r', time_created: 1000 }),
      node({ id: 'c2', parent_id: 'r', time_created: 2000 }),
    ];
    const snapshot = JSON.parse(JSON.stringify(input)) as DelegationNode[];
    getTimelineLayout(input, new Set());
    expect(input).toEqual(snapshot);
  });

  it('is deterministic: two calls with the same input produce equal output', () => {
    const chain = [
      node({ id: 'r', parent_id: null, time_created: 0 }),
      node({ id: 'c1', parent_id: 'r', time_created: 1000 }),
      node({ id: 'c2', parent_id: 'r', time_created: 2000 }),
    ];
    expect(getTimelineLayout(chain, new Set(['c2']))).toEqual(
      getTimelineLayout(chain, new Set(['c2'])),
    );
  });

  it('keeps tied time_created nodes stable and at distinct X positions', () => {
    const layout = getTimelineLayout(
      [
        node({ id: 'r', parent_id: null, time_created: 0 }),
        node({ id: 'a', parent_id: 'r', time_created: 500 }),
        node({ id: 'b', parent_id: 'r', time_created: 500 }),
      ],
      new Set(),
    );
    const a = positionOf(layout, 'a');
    const b = positionOf(layout, 'b');
    // Stable sort keeps `a` before `b` (chain order); the sorted index drives X.
    expect(a.x).toBeLessThan(b.x);
  });

  it('marks the nodes in the live id set as isLive', () => {
    const layout = getTimelineLayout(
      [
        node({ id: 'r', parent_id: null, time_created: 0 }),
        node({ id: 'c1', parent_id: 'r', time_created: 1000 }),
        node({ id: 'c2', parent_id: 'r', time_created: 2000 }),
      ],
      new Set(['c2']),
    );
    const isLive = new Map(layout.nodes.map((n) => [n.id, n.data.isLive]));
    expect(isLive.get('c2')).toBe(true);
    expect(isLive.get('r')).toBe(false);
    expect(isLive.get('c1')).toBe(false);
  });
});
