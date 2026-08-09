import { describe, expect, it } from 'vitest';

import type { DelegationNode } from '@/lib/api/types';
import { aggregateSubagents } from './subagent-aggregate';

/** Build a minimal DelegationNode, overriding only the fields a test cares about.
 *  Non-root by default; pass `parent_id: null` explicitly for root nodes. */
function node(overrides: Partial<DelegationNode> & { id: string; agent: string }): DelegationNode {
  return {
    parent_id: 'parent',
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

function chain(...nodes: DelegationNode[]): DelegationNode[] {
  return nodes;
}

describe('aggregateSubagents', () => {
  it('returns an empty map for empty input', () => {
    expect(aggregateSubagents([])).toEqual(new Map());
  });

  it('aggregates tokens and cost per agent across a single chain', () => {
    const input = [
      {
        sessionId: 's1',
        chain: chain(
          node({ id: 'r1', parent_id: null, agent: 'orchestrator', cost: 0.5, tokens_input: 100, tokens_output: 50 }),
          node({ id: 'b1', agent: 'builder', cost: 0.2, tokens_input: 800, tokens_output: 200 }),
          node({ id: 'f1', agent: 'fixer', cost: 0.1, tokens_input: 300, tokens_output: 200 }),
        ),
      },
    ];
    const result = aggregateSubagents(input);
    expect(result.size).toBe(3);
    expect(result.get('orchestrator')).toEqual({ tokens: 150, cost: 0.5, sessionCount: 1, isParent: true });
    expect(result.get('builder')).toEqual({ tokens: 1000, cost: 0.2, sessionCount: 1, isParent: false });
    expect(result.get('fixer')).toEqual({ tokens: 500, cost: 0.1, sessionCount: 1, isParent: false });
  });

  it('includes the root node with isParent: true', () => {
    const input = [
      {
        sessionId: 's1',
        chain: chain(
          node({ id: 'r1', parent_id: null, agent: 'orchestrator', cost: 5, tokens_input: 1000, tokens_output: 500 }),
          node({ id: 'b1', agent: 'builder', cost: 0.2, tokens_input: 800, tokens_output: 200 }),
        ),
      },
    ];
    const result = aggregateSubagents(input);
    expect(result.get('orchestrator')).toEqual({ tokens: 1500, cost: 5, sessionCount: 1, isParent: true });
    expect(result.get('builder')).toEqual({ tokens: 1000, cost: 0.2, sessionCount: 1, isParent: false });
  });

  it('includes a root node whose parent_id is undefined', () => {
    const input = [
      {
        sessionId: 's1',
        chain: chain(node({ id: 'r1', parent_id: undefined, agent: 'orchestrator' })),
      },
    ];
    const result = aggregateSubagents(input);
    expect(result.size).toBe(1);
    expect(result.get('orchestrator')).toEqual({ tokens: 0, cost: 0, sessionCount: 1, isParent: true });
  });

  it('includes a single chain root and its child as two keys', () => {
    const input = [
      {
        sessionId: 's1',
        chain: chain(
          node({ id: 'r1', parent_id: null, agent: 'orchestrator', cost: 0.5, tokens_input: 100, tokens_output: 50 }),
          node({ id: 'b1', agent: 'builder', cost: 0.2, tokens_input: 800, tokens_output: 200 }),
        ),
      },
    ];
    const result = aggregateSubagents(input);
    expect(result.size).toBe(2);
    expect(result.get('orchestrator')?.isParent).toBe(true);
    expect(result.get('builder')?.isParent).toBe(false);
  });

  it('flags both roots of two chains as parents with a session each', () => {
    const input = [
      {
        sessionId: 's1',
        chain: chain(
          node({ id: 'r1', parent_id: null, agent: 'orchestrator', cost: 0.5, tokens_input: 100, tokens_output: 50 }),
          node({ id: 'b1', agent: 'builder', cost: 0.2, tokens_input: 800, tokens_output: 200 }),
        ),
      },
      {
        sessionId: 's2',
        chain: chain(
          node({ id: 'r2', parent_id: null, agent: 'planner', cost: 0.3, tokens_input: 200, tokens_output: 100 }),
          node({ id: 'f1', agent: 'fixer', cost: 0.1, tokens_input: 300, tokens_output: 200 }),
        ),
      },
    ];
    const result = aggregateSubagents(input);
    expect(result.get('orchestrator')).toEqual({ tokens: 150, cost: 0.5, sessionCount: 1, isParent: true });
    expect(result.get('planner')).toEqual({ tokens: 300, cost: 0.3, sessionCount: 1, isParent: true });
  });

  it('sums tokens and cost across chains while counting sessions per agent', () => {
    const input = [
      {
        sessionId: 's1',
        chain: chain(
          node({ id: 'r1', parent_id: null, agent: 'orchestrator' }),
          node({ id: 'b1', agent: 'builder', cost: 0.2, tokens_input: 800, tokens_output: 200 }),
        ),
      },
      {
        sessionId: 's2',
        chain: chain(
          node({ id: 'r2', parent_id: null, agent: 'orchestrator' }),
          node({ id: 'b2', agent: 'builder', cost: 0.3, tokens_input: 600, tokens_output: 100 }),
        ),
      },
    ];
    const result = aggregateSubagents(input);
    expect(result.get('builder')).toEqual({ tokens: 1700, cost: 0.5, sessionCount: 2, isParent: false });
    expect(result.get('orchestrator')).toEqual({ tokens: 0, cost: 0, sessionCount: 2, isParent: true });
  });

  it('counts a session once per agent even when the agent has multiple nodes', () => {
    const input = [
      {
        sessionId: 's1',
        chain: chain(
          node({ id: 'r1', parent_id: null, agent: 'orchestrator' }),
          node({ id: 'b1', agent: 'builder', cost: 2, tokens_input: 800, tokens_output: 200 }),
          node({ id: 'b2', agent: 'builder', cost: 3, tokens_input: 400, tokens_output: 100 }),
        ),
      },
    ];
    const result = aggregateSubagents(input);
    expect(result.get('builder')).toEqual({ tokens: 1500, cost: 5, sessionCount: 1, isParent: false });
  });

  it('does not mutate the input chains', () => {
    const input = [
      {
        sessionId: 's1',
        chain: chain(
          node({ id: 'r1', parent_id: null, agent: 'orchestrator' }),
          node({ id: 'b1', agent: 'builder', cost: 0.2, tokens_input: 800, tokens_output: 200 }),
        ),
      },
    ];
    const before = structuredClone(input);
    aggregateSubagents(input);
    expect(input).toEqual(before);
  });

  it('is deterministic across calls with the same input', () => {
    const input = [
      {
        sessionId: 's1',
        chain: chain(
          node({ id: 'r1', parent_id: null, agent: 'orchestrator' }),
          node({ id: 'b1', agent: 'builder', cost: 0.2, tokens_input: 800, tokens_output: 200 }),
          node({ id: 'f1', agent: 'fixer', cost: 0.1, tokens_input: 300, tokens_output: 200 }),
        ),
      },
    ];
    expect(aggregateSubagents(input)).toEqual(aggregateSubagents(input));
  });

  it('chart-level filter excludes the parent from projected items', () => {
    const input = [
      {
        sessionId: 's1',
        chain: chain(
          node({ id: 'r1', parent_id: null, agent: 'orchestrator', cost: 0.5, tokens_input: 100, tokens_output: 50 }),
          node({ id: 'b1', agent: 'builder', cost: 0.2, tokens_input: 800, tokens_output: 200 }),
          node({ id: 'f1', agent: 'fixer', cost: 0.1, tokens_input: 300, tokens_output: 200 }),
        ),
      },
    ];
    const map = aggregateSubagents(input);
    const items = Array.from(map, ([agent, totals]) => ({
      agent,
      value: totals.tokens,
      isParent: totals.isParent,
    }))
      .filter((item) => !item.isParent)
      .sort((a, b) => b.value - a.value);

    expect(items).toHaveLength(2);
    expect(items[0].agent).toBe('builder');
    expect(items[1].agent).toBe('fixer');
    expect(items.every((item) => !item.isParent)).toBe(true);
  });
});
