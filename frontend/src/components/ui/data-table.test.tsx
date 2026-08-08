import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from './data-table';

interface Row {
  name: string;
  value: number;
}

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Name', enableColumnFilter: true },
  { accessorKey: 'value', header: 'Value' },
];

const rows: Row[] = [
  { name: 'zebra', value: 30 },
  { name: 'alpha', value: 10 },
  { name: 'mike', value: 20 },
];

function renderTable(data: Row[] = rows) {
  return render(
    <DataTable
      columns={columns}
      data={data}
      emptyTitle="No rows"
      emptyDescription="Nothing matches the current filters."
    />,
  );
}

function cellTexts(): string[] {
  return screen.getAllByRole('cell').map((cell) => cell.textContent ?? '');
}

/** First-column (name) value of every data row, header row excluded. */
function nameColumn(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.querySelectorAll('td')[0]?.textContent ?? '');
}

describe('DataTable', () => {
  it('sorts a column asc -> desc -> unsorted on repeated header clicks', () => {
    renderTable();
    const header = screen.getByRole('button', { name: /name/i });

    fireEvent.click(header);
    expect(nameColumn()[0]).toBe('alpha');

    fireEvent.click(header);
    expect(nameColumn()).toEqual(['zebra', 'mike', 'alpha']);

    fireEvent.click(header);
    expect(nameColumn()).toEqual(['zebra', 'alpha', 'mike']);
  });

  it('filters rows by a column value after the debounce', () => {
    vi.useFakeTimers();
    try {
      renderTable();
      const input = screen.getByRole('searchbox', { name: /filter by name/i });
      fireEvent.change(input, { target: { value: 'a' } });

      // Inside the 150ms debounce window the visible rows are unchanged.
      act(() => {
        vi.advanceTimersByTime(50);
      });
      expect(cellTexts()).toHaveLength(6);

      act(() => {
        vi.advanceTimersByTime(100);
      });
      // 'a' matches zebra + alpha; mike is filtered out.
      expect(nameColumn()).toEqual(['zebra', 'alpha']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('toggles column visibility from the dropdown menu', () => {
    renderTable();
    expect(
      screen.getByRole('columnheader', { name: /value/i }),
    ).toBeInTheDocument();

    // Radix opens the dropdown on pointerdown/keydown; jsdom has no real
    // PointerEvent, so drive it with the keyboard path.
    fireEvent.keyDown(
      screen.getByRole('button', { name: /toggle column visibility/i }),
      { key: 'Enter' },
    );
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /value/i }));

    expect(
      screen.queryByRole('columnheader', { name: /value/i }),
    ).not.toBeInTheDocument();
  });

  it('switches between comfortable and compact density', () => {
    renderTable();
    expect(screen.getAllByRole('cell')[0]).toHaveClass('py-2');

    fireEvent.click(
      screen.getByRole('button', { name: /switch to compact/i }),
    );

    expect(screen.getAllByRole('cell')[0]).toHaveClass('py-1');
    expect(screen.getAllByRole('cell')[0]).not.toHaveClass('py-2');
  });

  it('renders the empty state when there are no rows', () => {
    renderTable([]);
    expect(screen.getByText('No rows')).toBeInTheDocument();
    expect(screen.getByText(/Nothing matches/i)).toBeInTheDocument();
  });
});
