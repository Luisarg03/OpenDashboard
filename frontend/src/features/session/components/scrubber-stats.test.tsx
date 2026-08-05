import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ScrubberStats } from './scrubber-stats';
import type { DelegationNode } from '@/lib/api/types';

function node(id: string, time_created: number): DelegationNode {
  return {
    id,
    time_created,
    agent: 'orchestrator',
    title: id,
    parent_id: null,
    model: null,
    depth: 0,
    children: [],
    cost: 0,
    tokens_input: 0,
    tokens_output: 0,
    tokens_reasoning: 0,
    tokens_cache_read: 0,
    tokens_cache_write: 0,
  };
}

// Local-time stable timestamps: 12:00:00, 12:00:01, 12:01:30.
const base = new Date(2024, 0, 1, 12, 0, 0).getTime();
const fixture = [
  node('a', base),
  node('b', base + 1000),
  node('c', base + 90_000),
];

// getByText matches per-element text nodes only; the values inside <strong>
// are nested, so match on the full textContent instead.
const byTextContent =
  (text: string) => (_content: string, node: Element | null) =>
    node?.textContent === text;

describe('ScrubberStats', () => {
  it('renders nothing for an empty chain', () => {
    const { container } = render(<ScrubberStats chain={[]} cutoff={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows nodes up to the cutoff, the formatted cutoff time, and total duration', () => {
    render(<ScrubberStats chain={fixture} cutoff={base + 1000} />);
    expect(screen.getByText(byTextContent('2/3 nodes shown'))).toBeInTheDocument();
    expect(screen.getByText(byTextContent('Up to 12:00:01'))).toBeInTheDocument();
    expect(screen.getByText(byTextContent('Total 1m 30s'))).toBeInTheDocument();
  });

  it('counts all nodes when the cutoff covers the whole chain', () => {
    render(<ScrubberStats chain={fixture} cutoff={base + 90_000} />);
    expect(screen.getByText(byTextContent('3/3 nodes shown'))).toBeInTheDocument();
  });
});
