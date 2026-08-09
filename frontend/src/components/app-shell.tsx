import { Activity, ArrowLeft } from 'lucide-react';
import { Component, type ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

/** Catches render errors in routed pages so the shell stays interactive. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-4 text-destructive">
          Something went wrong: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

// smoke: app-shell scenarios (run manually, do not commit screenshots)
// 1. On / there is no back button in the header.
// 2. On /session/:id a back button appears at the left of the header.
// 3. Clicking the back button navigates to /.
// 4. No sidebar, no drawer, no tabs at any viewport.
export function AppShell() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:shadow"
        >
          Skip to content
        </a>
        <div className="flex items-center gap-3">
          {!isHome && (
            <Button asChild variant="ghost" size="sm" aria-label="Back to dashboard">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
          )}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">OpenDashboard</span>
          </div>
          <div className="hidden h-5 w-px bg-border md:block" />
          <span className="hidden text-sm text-muted-foreground md:block">v2</span>
        </div>
        <ThemeToggle />
      </header>

      <main id="main-content" className="pt-14 mx-auto max-w-[1536px]">
        <div className="p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
