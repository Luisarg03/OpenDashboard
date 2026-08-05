import type { SessionListParams } from '@/lib/api/sessions';

/** Dashboard filter state, synced to the URL query string. */
export type DashboardFilters = Pick<SessionListParams, 'search' | 'agent' | 'month'>;
