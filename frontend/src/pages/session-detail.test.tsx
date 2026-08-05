import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom';

import { SessionDetailPage } from '@/pages/session-detail';

vi.mock('@/lib/api/sessions', () => {
  const session = {
    id: 'abc',
    parent_id: null,
    project_id: 'p1',
    agent: 'orchestrator',
    model: null,
    title: 'Test session',
    time_created: 1000,
    time_updated: 1000,
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
    cost: 0.5,
    tokens_input: 10,
    tokens_output: 20,
    tokens_reasoning: 0,
    tokens_cache_read: 0,
    tokens_cache_write: 0,
  };
  const nodes = [
    { ...session, id: 'a', title: 'A', time_created: 1000, parent_id: null },
    { ...session, id: 'b', title: 'B', time_created: 2000, parent_id: 'a' },
    { ...session, id: 'c', title: 'C', time_created: 3000, parent_id: 'b' },
  ];
  return {
    useSession: () => ({
      isPending: false,
      isError: false,
      data: { session },
    }),
    useSessionChain: () => ({
      isPending: false,
      isError: false,
      data: {
        chain: nodes,
        tree: [],
        summary: { total_tasks: 3, completed_count: 2, duration_minutes: 1 },
      },
    }),
  };
});

vi.mock('@/lib/api/stream', () => ({
  useSessionEvents: () => ({
    status: 'open',
    newNodes: new Map(),
    liveNodeIds: new Set(),
    lastTotals: null,
    reset: vi.fn(),
  }),
}));

// React Flow needs real DOM measurement; the page test covers URL logic only.
vi.mock('@/features/session/components/delegation-graph', () => ({
  DelegationGraph: () => <div data-testid="delegation-graph" />,
}));

function PageWithUrl() {
  const [searchParams] = useSearchParams();
  return (
    <>
      <SessionDetailPage />
      <div data-testid="url-params">{searchParams.toString()}</div>
    </>
  );
}

function renderPage(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/session/:id" element={<PageWithUrl />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SessionDetailPage timeline deep-link', () => {
  it('initializes the cutoff from the ?cutoff= param', () => {
    renderPage('/session/abc?cutoff=2000');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '2000');
  });

  it('falls back to the latest time when no param is present', () => {
    renderPage('/session/abc');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '3000');
  });

  it('clamps an out-of-range param to the latest time', () => {
    renderPage('/session/abc?cutoff=99999');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '3000');
  });

  it('ignores an invalid param', () => {
    renderPage('/session/abc?cutoff=not-a-number');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '3000');
  });

  it('writes the cutoff back to the URL on scrub', () => {
    renderPage('/session/abc?cutoff=2000');
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '2100');
    expect(screen.getByTestId('url-params').textContent).toContain('cutoff=2100');
  });
});
