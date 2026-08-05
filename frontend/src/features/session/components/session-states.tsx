import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GitBranch, RefreshCw, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SessionGraphSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-64" />
      <div className="flex gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-[600px] w-full rounded-md" />
    </div>
  );
}

function StateIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
      {children}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/"
      className="text-sm text-primary underline-offset-4 hover:underline"
    >
      Back to dashboard
    </Link>
  );
}

export function SessionNotFound() {
  return (
    <Card className="mx-auto mt-16 max-w-md">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <StateIcon>
          <TriangleAlert className="h-6 w-6" />
        </StateIcon>
        <h2 className="text-lg font-semibold">Session not found</h2>
        <p className="text-sm text-muted-foreground">
          This session does not exist or is no longer available.
        </p>
        <BackLink />
      </CardContent>
    </Card>
  );
}

export function SessionEmptyState() {
  return (
    <Card className="mx-auto mt-16 max-w-md">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <StateIcon>
          <GitBranch className="h-6 w-6" />
        </StateIcon>
        <h2 className="text-lg font-semibold">No delegation chain</h2>
        <p className="text-sm text-muted-foreground">
          This session has no recorded delegation nodes yet.
        </p>
        <BackLink />
      </CardContent>
    </Card>
  );
}

interface SessionErrorProps {
  message: string;
  onRetry: () => void;
}

export function SessionError({ message, onRetry }: SessionErrorProps) {
  return (
    <Card className="mx-auto mt-16 max-w-md">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <StateIcon>
          <TriangleAlert className="h-6 w-6" />
        </StateIcon>
        <h2 className="text-lg font-semibold">Failed to load session</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
          <BackLink />
        </div>
      </CardContent>
    </Card>
  );
}
