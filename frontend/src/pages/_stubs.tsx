/** Placeholder pages for routes that arrive in future waves. */

function StubPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="border-b border-border p-6">
        <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This page is a stub. Future waves will replace it.
        </p>
      </header>
    </div>
  );
}

export function SessionsStubPage() {
  return <StubPage title="Sessions" />;
}

export function AgentsStubPage() {
  return <StubPage title="Agents" />;
}
