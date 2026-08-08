import { Activity, Menu, X } from 'lucide-react';
import { Component, useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';

import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

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

const navItems: { to: string; label: string; matchPrefix?: string }[] = [
  { to: '/', label: 'Dashboard' },
  // "Sessions" also stays highlighted on /session/:id (session detail page).
  { to: '/sessions', label: 'Sessions', matchPrefix: '/session' },
  { to: '/agents', label: 'Agents' },
];

function SidebarContent() {
  const { pathname } = useLocation();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1 p-4">
      {navItems.map((item) => {
        const active =
          pathname === item.to ||
          (item.matchPrefix !== undefined && pathname.startsWith(item.matchPrefix));
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={`row-accent-hover relative flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            {item.label}
            {active && (
              <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

// smoke: app-shell scenarios (run manually, do not commit screenshots)
// 1. Visible link: load any route, sidebar shows Dashboard / Sessions / Agents.
// 2. Active highlight: navigate to /sessions, "Sessions" link has bg-muted + left bar.
// 3. Click navigates: click "Agents" link, URL changes to /agents, page header reads "Agents".
// 4. Mobile drawer: shrink viewport < 768px, sidebar hidden; tap menu icon, sidebar slides in;
//    tap backdrop, sidebar slides out; press Escape, sidebar closes.
export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Escape closes the mobile drawer (desktop sidebar is always visible).
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

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
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Toggle sidebar"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? <X /> : <Menu />}
          </Button>
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

      {/* Desktop sidebar */}
      <aside className="fixed bottom-0 left-0 top-14 hidden w-60 border-r bg-background md:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute bottom-0 left-0 top-14 w-60 border-r bg-background">
            <SidebarContent />
          </aside>
        </div>
      )}

      <main id="main-content" className="pt-14 md:pl-60">
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
