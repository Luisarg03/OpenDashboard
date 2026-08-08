import { getAgentColor } from '@/features/session/lib/agent-colors';

/**
 * Map a Tailwind dot color class (e.g. `bg-blue-500`) to the hex fill Recharts
 * needs for an SVG bar. Hex values live here, not in the card components, so
 * the cards only reference the design tokens from `agent-colors.ts`.
 */
const AGENT_BAR_COLOR_MAP: Record<string, string> = {
  'bg-blue-500': '#3b82f6',
  'bg-purple-500': '#a855f7',
  'bg-emerald-500': '#10b981',
  'bg-amber-500': '#f59e0b',
  'bg-rose-500': '#f43f5e',
  'bg-cyan-500': '#06b6d4',
  'bg-indigo-500': '#6366f1',
  'bg-teal-500': '#14b8a6',
  'bg-pink-500': '#ec4899',
  'bg-orange-500': '#f97316',
  'bg-slate-500': '#64748b',
};

export function getAgentBarColor(agent: string): string {
  const dotClass = getAgentColor(agent).dot.split(' ')[0];
  return AGENT_BAR_COLOR_MAP[dotClass] ?? AGENT_BAR_COLOR_MAP['bg-slate-500'];
}
