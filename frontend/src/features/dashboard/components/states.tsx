import { Inbox, RotateCcw, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface DashboardErrorProps {
  error: unknown;
  onRetry: () => void;
}

export function DashboardError({ error, onRetry }: DashboardErrorProps) {
  console.error('Dashboard data load failed:', error);
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 p-8 text-center">
      <TriangleAlert className="h-10 w-10 text-destructive" />
      <div>
        <p className="font-semibold">Failed to load data</p>
        <p className="text-sm text-muted-foreground">
          Something went wrong while fetching dashboard data.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCcw /> Retry
      </Button>
    </div>
  );
}

interface DashboardEmptyProps {
  title?: string;
  description?: string;
}

export function DashboardEmpty({
  title = 'No sessions yet',
  description = 'Sessions will appear here once delegation runs complete.',
}: DashboardEmptyProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground/50" />
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
