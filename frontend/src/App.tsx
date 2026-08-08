import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/app-shell';
import { DashboardPage } from '@/pages/dashboard';
import { SessionDetailPage } from '@/pages/session-detail';
import { NotFoundPage } from '@/pages/not-found';
import { AgentsStubPage, SessionsStubPage } from '@/pages/_stubs';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'session/:id', element: <SessionDetailPage /> },
      { path: 'sessions', element: <SessionsStubPage /> },
      { path: 'agents', element: <AgentsStubPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
