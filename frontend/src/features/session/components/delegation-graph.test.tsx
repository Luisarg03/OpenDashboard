import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { useCascadePlayback } from '@/features/session/hooks/use-cascade-playback';
import type { DelegationNode } from '@/lib/api/types';

import { DelegationGraph } from './delegation-graph';

function node(
  id: string,
  time_created: number,
  agent = 'orchestrator',
  title = id,
): DelegationNode {
  return {
    id,
    time_created,
    agent,
    title,
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

const fixture = [
  node('a', 1000, 'orchestrator', 'A'),
  node('b', 2000, 'designer', 'B'),
  node('c', 3000, 'librarian', 'C'),
];

// jsdom has no matchMedia; the graph's reduced-motion hook needs a stub.
function stubMatchMedia(matches: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// jsdom lacks DOMMatrixReadOnly; React Flow only reads m22 (zoom) from it.
class DOMMatrixReadOnlyMock {
  m22 = 1;
}

window.DOMMatrixReadOnly = DOMMatrixReadOnlyMock as unknown as typeof DOMMatrixReadOnly;

// Thin wrapper: owns the cutoff (useCascadePlayback) and feeds the filtered
// chain to the graph, exactly like session-detail.tsx does.
function TimelineHarness() {
  const { cutoff, setCutoff } = useCascadePlayback({
    earliest: 1000,
    latest: 3000,
    initialCutoff: 1000,
  });
  const chain = fixture.filter((n) => n.time_created <= cutoff);
  return (
    <>
      <button onClick={() => setCutoff(3000)}>advance</button>
      <DelegationGraph chain={chain} viewMode="timeline" />
    </>
  );
}

describe('DelegationGraph timeline animation', () => {
  it('reveals a node once the cutoff advances past its time_created', async () => {
    stubMatchMedia(false);
    render(<TimelineHarness />);

    // cutoff 1000: only the root node is in the chain, `c` (time_created
    // 3000) is not rendered yet.
    let nodes = screen.getAllByTestId('timeline-node');
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toHaveTextContent('A');

    fireEvent.click(screen.getByRole('button', { name: 'advance' }));

    // cutoff 3000: all three nodes are in the chain and the slide-in runs.
    nodes = await screen.findAllByTestId('timeline-node');
    expect(nodes).toHaveLength(3);
    const nodeB = nodes.find((n) => n.textContent?.includes('B'));
    expect(nodeB).toBeDefined();

    // After the enter animation completes the node is fully opaque.
    await waitFor(() => {
      expect(getComputedStyle(nodeB!).opacity).toBe('1');
    });
  });
});
