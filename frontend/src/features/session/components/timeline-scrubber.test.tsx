import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { TimelineScrubber } from './timeline-scrubber';
import type { DelegationNode } from '@/lib/api/types';

function node(id: string, time_created: number, agent = 'orchestrator', title = id): DelegationNode {
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

describe('TimelineScrubber', () => {
  it('renders nothing for an empty chain', () => {
    const { container } = render(
      <TimelineScrubber chain={[]} cutoff={0} onChange={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders one dot per node at the mapped x position', () => {
    render(<TimelineScrubber chain={fixture} cutoff={2000} onChange={() => {}} />);
    const dots = screen.getAllByTestId('timeline-dot');
    expect(dots).toHaveLength(3);
    // 800px wide mock, range 1000..3000 -> x = 0, 400, 800; dot left = x - 4.
    expect(dots[0]).toHaveStyle({ left: '-4px' });
    expect(dots[1]).toHaveStyle({ left: '396px' });
    expect(dots[2]).toHaveStyle({ left: '796px' });
  });

  it('renders a single dot for a single-node chain', () => {
    render(
      <TimelineScrubber chain={[fixture[0]]} cutoff={1000} onChange={() => {}} />,
    );
    expect(screen.getAllByTestId('timeline-dot')).toHaveLength(1);
  });

  it('groups nearby dots into one marker', () => {
    const clustered = [node('a', 1000), node('b', 1010), node('c', 3000)];
    render(
      <TimelineScrubber chain={clustered} cutoff={3000} onChange={() => {}} />,
    );
    expect(screen.getAllByTestId('timeline-dot')).toHaveLength(2);
  });

  it('fires onChange with the mapped timestamp on arrow keys', () => {
    const onChange = vi.fn();
    render(
      <TimelineScrubber chain={fixture} cutoff={2000} onChange={onChange} />,
    );
    const slider = screen.getByRole('slider');
    // Step is 5% of the 2000ms range = 100ms.
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(2100);
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith(1900);
  });

  it('exposes slider semantics for keyboard users', () => {
    render(<TimelineScrubber chain={fixture} cutoff={2000} onChange={() => {}} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '1000');
    expect(slider).toHaveAttribute('aria-valuemax', '3000');
    expect(slider).toHaveAttribute('aria-valuenow', '2000');
    expect(slider).toHaveAttribute('tabindex', '0');
  });

  it('renders the live-tail badge and extends the cutoff on click', () => {
    const onChange = vi.fn();
    render(
      <TimelineScrubber
        chain={fixture}
        cutoff={1000}
        onChange={onChange}
        hiddenLiveCount={2}
      />,
    );
    const badge = screen.getByRole('button', { name: /new nodes hidden/i });
    expect(badge).toHaveTextContent('+2 new');
    fireEvent.click(badge);
    expect(onChange).toHaveBeenCalledWith(3000);
  });

  it('keeps the dot tooltip with the node title and time', () => {
    render(<TimelineScrubber chain={fixture} cutoff={3000} onChange={() => {}} />);
    expect(screen.getByTitle(/^A —/)).toBeInTheDocument();
  });
});
