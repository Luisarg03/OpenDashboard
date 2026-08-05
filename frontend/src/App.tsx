import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/app-shell';
import { DashboardPage } from '@/pages/dashboard';
import { SessionDetailPage } from '@/pages/session-detail';
import { NotFoundPage } from '@/pages/not-found';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'session/:id', element: <SessionDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
