import type { DelegationNode } from '@/lib/api/types';

export interface SubagentTotals {
  tokens: number; // input + output across all nodes for this agent
  cost: number; // sum of cost across all nodes for this agent
  sessionCount: number; // distinct sessions where this agent ran
  isParent: boolean; // true when this agent is the root (parent) node of any session chain
}

export type SubagentMap = Map<string, SubagentTotals>;

/**
 * Aggregate per-sub-agent totals from a list of (sessionId, chain) tuples.
 * The root node of each chain is included and flagged with `isParent: true`
 * so the dashboard can render it with a distinct visual indicator.
 * The input arrays and chain payloads are never mutated.
 */
export function aggregateSubagents(
  chains: { sessionId: string; chain: DelegationNode[] }[],
): SubagentMap {
  const totals = new Map<string, SubagentTotals>();
  for (const { chain } of chains) {
    const agentsSeen = new Set<string>();
    for (const node of chain) {
      // ponytail: parent agent is included in Wave 2 mini-fix-2 (decision reversed from D1)
      const isParent = node.parent_id === null || node.parent_id === undefined;
      const entry = totals.get(node.agent) ?? { tokens: 0, cost: 0, sessionCount: 0, isParent: false };
      entry.tokens += node.tokens_input + node.tokens_output;
      entry.cost += node.cost;
      if (!agentsSeen.has(node.agent)) {
        agentsSeen.add(node.agent);
        entry.sessionCount += 1;
      }
      entry.isParent = entry.isParent || isParent;
      totals.set(node.agent, entry);
    }
  }
  return totals;
}
