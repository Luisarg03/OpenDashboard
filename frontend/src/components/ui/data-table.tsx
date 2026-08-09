import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Rows3,
  Settings2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  emptyTitle: string;
  emptyDescription: string;
  /** Optional consumer content rendered between the column filters and the table controls. */
  toolbar?: ReactNode;
  /** Initial density mode. Defaults to 'comfortable'. */
  defaultDensity?: 'comfortable' | 'compact';
}

const FILTER_DEBOUNCE_MS = 150;

function columnLabel<T>(column: Column<T, unknown>): string {
  const header = column.columnDef.header;
  return typeof header === 'string' ? header : column.id;
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ChevronUp className="h-3.5 w-3.5" />;
  if (sorted === 'desc') return <ChevronDown className="h-3.5 w-3.5" />;
  return <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />;
}

export function DataTable<T>({
  columns,
  data,
  emptyTitle,
  emptyDescription,
  toolbar,
  defaultDensity = 'comfortable',
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [density, setDensity] = useState<'comfortable' | 'compact'>(defaultDensity);
  // Per-column filter draft; the settled value reaches the table 150ms later.
  const [filterDrafts, setFilterDrafts] = useState<Record<string, string>>({});
  const filterTimers = useRef<Record<string, number>>({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Clear pending filter debounce timers on unmount.
  useEffect(() => {
    const timers = filterTimers.current;
    return () => {
      Object.values(timers).forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  // Sort cycle: asc -> desc -> unsorted.
  const cycleSort = (column: Column<T, unknown>) => {
    if (column.getIsSorted() === 'asc') column.toggleSorting(true);
    else if (column.getIsSorted() === 'desc') column.clearSorting();
    else column.toggleSorting(false);
  };

  const handleFilterChange = (column: Column<T, unknown>, value: string) => {
    const columnId = column.id;
    setFilterDrafts((prev) => ({ ...prev, [columnId]: value }));
    window.clearTimeout(filterTimers.current[columnId]);
    filterTimers.current[columnId] = window.setTimeout(() => {
      column.setFilterValue(value === '' ? undefined : value);
    }, FILTER_DEBOUNCE_MS);
  };

  // Only columns that opt in via enableColumnFilter get a toolbar input.
  const filterableColumns = table
    .getAllLeafColumns()
    .filter(
      (column) => column.columnDef.enableColumnFilter === true && column.getIsVisible(),
    );

  const rows = table.getRowModel().rows;

  return (
    <div className="rounded-md border border-border">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
        {filterableColumns.map((column) => (
          <Input
            key={column.id}
            type="search"
            value={filterDrafts[column.id] ?? ''}
            onChange={(event) => handleFilterChange(column, event.target.value)}
            placeholder={`Filter ${columnLabel(column)}`}
            aria-label={`Filter by ${columnLabel(column)}`}
            className="h-8 w-44 text-xs"
          />
        ))}
        {toolbar}
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setDensity((current) =>
                current === 'comfortable' ? 'compact' : 'comfortable',
              )
            }
            aria-label={`Switch to ${density === 'comfortable' ? 'compact' : 'comfortable'} density`}
            aria-pressed={density === 'compact'}
          >
            <Rows3 />
            {density === 'comfortable' ? 'Compact' : 'Comfortable'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Toggle column visibility">
                <Settings2 />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table.getAllLeafColumns().map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(checked) => column.toggleVisibility(checked)}
                >
                  {columnLabel(column)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border bg-muted">
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : undefined
                      }
                      className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={() => cycleSort(header.column)}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon sorted={sorted} />
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.getVisibleLeafColumns().length}
                  className="px-3 py-10 text-center"
                >
                  <p className="font-medium">{emptyTitle}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{emptyDescription}</p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0 hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-3 align-middle',
                        density === 'compact' ? 'py-1 text-xs' : 'py-2 text-sm',
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
