import { describe, expect, it } from 'vitest';

import type { SessionSummary } from '@/lib/api/types';
import { aggregateModels } from './model-aggregate';

/** Build a minimal SessionSummary, overriding only the fields a test cares about. */
function session(overrides: Partial<SessionSummary> & { id: string }): SessionSummary {
  return {
    parent_id: null,
    project_id: '',
    agent: '',
    model: null,
    title: '',
    time_created: 0,
    time_updated: 0,
    child_count: 0,
    chain_cost: 0,
    chain_tokens: 0,
    summary_additions: 0,
    summary_deletions: 0,
    summary_files: 0,
    summary_diffs: null,
    time_archived: null,
    time_compacting: null,
    is_archived: false,
    is_compacting: false,
    cost: 0,
    tokens_input: 0,
    tokens_output: 0,
    tokens_reasoning: 0,
    tokens_cache_read: 0,
    tokens_cache_write: 0,
    ...overrides,
  };
}

describe('aggregateModels', () => {
  it('returns an empty map for empty input', () => {
    expect(aggregateModels([])).toEqual(new Map());
  });

  it('aggregates a single session with a string model', () => {
    const result = aggregateModels([
      session({ id: 's1', model: 'claude-3-5-sonnet', cost: 1.5 }),
    ]);
    expect(result.size).toBe(1);
    expect(result.get('claude-3-5-sonnet')).toEqual({
      model: 'claude-3-5-sonnet',
      modelRaw: 'claude-3-5-sonnet',
      sessions: 1,
      cost: 1.5,
    });
  });

  it('formats an object model with its provider', () => {
    const result = aggregateModels([
      session({
        id: 's1',
        model: { id: 'minimax-m3', providerID: 'opencode-go' } as unknown as SessionSummary['model'],
        cost: 2,
      }),
    ]);
    expect(result.size).toBe(1);
    expect(result.get('minimax-m3 (opencode-go)')).toEqual({
      model: 'minimax-m3 (opencode-go)',
      modelRaw: { id: 'minimax-m3', providerID: 'opencode-go' },
      sessions: 1,
      cost: 2,
    });
  });

  it('sums cost and counts sessions across multiple sessions with the same model', () => {
    const result = aggregateModels([
      session({ id: 's1', model: 'claude-3-5-sonnet', cost: 1 }),
      session({ id: 's2', model: 'claude-3-5-sonnet', cost: 2.5 }),
      session({ id: 's3', model: 'gpt-4o', cost: 4 }),
    ]);
    expect(result.size).toBe(2);
    expect(result.get('claude-3-5-sonnet')).toEqual({
      model: 'claude-3-5-sonnet',
      modelRaw: 'claude-3-5-sonnet',
      sessions: 2,
      cost: 3.5,
    });
    expect(result.get('gpt-4o')).toEqual({
      model: 'gpt-4o',
      modelRaw: 'gpt-4o',
      sessions: 1,
      cost: 4,
    });
  });

  it('keeps the raw model of the first session seen per formatted name', () => {
    const result = aggregateModels([
      session({ id: 's1', model: 'claude-3-5-sonnet', cost: 1 }),
      session({
        id: 's2',
        model: { id: 'claude-3-5-sonnet', providerID: 'claude-3-5-sonnet' } as unknown as SessionSummary['model'],
        cost: 2,
      }),
    ]);
    expect(result.size).toBe(1);
    expect(result.get('claude-3-5-sonnet')?.modelRaw).toBe('claude-3-5-sonnet');
  });

  it('skips sessions with a null model', () => {
    const result = aggregateModels([
      session({ id: 's1', model: null, cost: 1 }),
      session({ id: 's2', model: 'claude-3-5-sonnet', cost: 2 }),
    ]);
    expect(result.size).toBe(1);
    expect(result.get('claude-3-5-sonnet')).toEqual({
      model: 'claude-3-5-sonnet',
      modelRaw: 'claude-3-5-sonnet',
      sessions: 1,
      cost: 2,
    });
  });

  it('skips sessions with an empty-string model', () => {
    const result = aggregateModels([
      session({ id: 's1', model: '', cost: 1 }),
      session({ id: 's2', model: 'claude-3-5-sonnet', cost: 2 }),
    ]);
    expect(result.size).toBe(1);
    expect(result.get('claude-3-5-sonnet')).toEqual({
      model: 'claude-3-5-sonnet',
      modelRaw: 'claude-3-5-sonnet',
      sessions: 1,
      cost: 2,
    });
  });
});
