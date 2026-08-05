import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-24">
      <h1 className="text-2xl font-semibold">404</h1>
      <p className="text-sm text-muted-foreground">Page not found</p>
      <Link
        to="/"
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
