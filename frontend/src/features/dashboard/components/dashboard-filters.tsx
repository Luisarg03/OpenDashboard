import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';

import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ponytail: ?agent= is ignored post Wave 2 — the parent session's agent is almost always orchestrator and filtering by it surfaced zero useful sessions in Wave 1 review. The URL parameter is accepted but does not affect rendering.

/** `GET /api/months` returns year-month buckets with session counts. */
interface MonthOption {
  ym: string;
  count: number;
}

function useMonths() {
  return useQuery({
    queryKey: ['months'],
    queryFn: () => api<{ months: MonthOption[] }>('/api/months'),
  });
}

const ALL = 'all';

export function DashboardFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const monthsQuery = useMonths();

  const search = searchParams.get('search') ?? '';
  const month = searchParams.get('month') ?? ALL;
  const hasFilters = Boolean(search || searchParams.has('month'));

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== ALL) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const reset = () => setSearchParams({});

  const months = useMemo(() => monthsQuery.data?.months ?? [], [monthsQuery.data]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 md:flex-row md:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search sessions..."
          value={search}
          onChange={(e) => setFilter('search', e.target.value)}
          aria-label="Search sessions"
        />
      </div>

      <Select value={month} onValueChange={(value) => setFilter('month', value)}>
        <SelectTrigger className="w-full md:w-40" aria-label="Filter by month">
          <SelectValue placeholder="All months" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All months</SelectItem>
          {months.map(({ ym }) => (
            <SelectItem key={ym} value={ym}>
              {ym}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="sm"
        className="md:shrink-0"
        onClick={reset}
        disabled={!hasFilters}
      >
        <X /> Reset
      </Button>
    </div>
  );
}
