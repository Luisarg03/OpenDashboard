/**
 * Deterministic color assignment for delegation agents.
 * Each agent name maps to a consistent Tailwind color family via a simple hash.
 */

const PALETTE = [
  'blue',
  'purple',
  'emerald',
  'amber',
  'rose',
  'cyan',
  'indigo',
  'teal',
  'pink',
  'orange',
] as const;

type ColorFamily = (typeof PALETTE)[number];

interface AgentColors {
  bg: string;
  text: string;
  border: string;
  ring: string;
  dot: string;
}

const COLOR_MAP: Record<ColorFamily, AgentColors> = {
  blue: {
    bg: 'bg-blue-500/10 dark:bg-blue-400/15',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-500 dark:border-blue-400',
    ring: 'ring-blue-500/30 dark:ring-blue-400/30',
    dot: 'bg-blue-500 dark:bg-blue-400',
  },
  purple: {
    bg: 'bg-purple-500/10 dark:bg-purple-400/15',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-500 dark:border-purple-400',
    ring: 'ring-purple-500/30 dark:ring-purple-400/30',
    dot: 'bg-purple-500 dark:bg-purple-400',
  },
  emerald: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-400/15',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500 dark:border-emerald-400',
    ring: 'ring-emerald-500/30 dark:ring-emerald-400/30',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
  },
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-400/15',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500 dark:border-amber-400',
    ring: 'ring-amber-500/30 dark:ring-amber-400/30',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  rose: {
    bg: 'bg-rose-500/10 dark:bg-rose-400/15',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500 dark:border-rose-400',
    ring: 'ring-rose-500/30 dark:ring-rose-400/30',
    dot: 'bg-rose-500 dark:bg-rose-400',
  },
  cyan: {
    bg: 'bg-cyan-500/10 dark:bg-cyan-400/15',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-500 dark:border-cyan-400',
    ring: 'ring-cyan-500/30 dark:ring-cyan-400/30',
    dot: 'bg-cyan-500 dark:bg-cyan-400',
  },
  indigo: {
    bg: 'bg-indigo-500/10 dark:bg-indigo-400/15',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-500 dark:border-indigo-400',
    ring: 'ring-indigo-500/30 dark:ring-indigo-400/30',
    dot: 'bg-indigo-500 dark:bg-indigo-400',
  },
  teal: {
    bg: 'bg-teal-500/10 dark:bg-teal-400/15',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-500 dark:border-teal-400',
    ring: 'ring-teal-500/30 dark:ring-teal-400/30',
    dot: 'bg-teal-500 dark:bg-teal-400',
  },
  pink: {
    bg: 'bg-pink-500/10 dark:bg-pink-400/15',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-500 dark:border-pink-400',
    ring: 'ring-pink-500/30 dark:ring-pink-400/30',
    dot: 'bg-pink-500 dark:bg-pink-400',
  },
  orange: {
    bg: 'bg-orange-500/10 dark:bg-orange-400/15',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-500 dark:border-orange-400',
    ring: 'ring-orange-500/30 dark:ring-orange-400/30',
    dot: 'bg-orange-500 dark:bg-orange-400',
  },
};

const DEFAULT_COLORS: AgentColors = {
  bg: 'bg-slate-500/10',
  text: 'text-slate-700 dark:text-slate-300',
  border: 'border-slate-500',
  ring: 'ring-slate-500/30',
  dot: 'bg-slate-500',
};

function hashAgent(agent: string): ColorFamily {
  let hash = 0;
  for (let i = 0; i < agent.length; i++) {
    hash = (hash + agent.charCodeAt(i) * 31) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

export function getAgentColor(agent: string): AgentColors {
  const family = hashAgent(agent);
  return COLOR_MAP[family] ?? DEFAULT_COLORS;
}
