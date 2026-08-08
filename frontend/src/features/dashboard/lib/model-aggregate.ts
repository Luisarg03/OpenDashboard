import type { SessionSummary } from '@/lib/api/types';
import { formatModel } from '@/features/session/lib/format';

export interface ModelTotals {
  model: string; // the formatted model name (output of formatModel) — grouping key
  modelRaw: SessionSummary['model'] | undefined; // raw model of the first session, for tag rendering
  sessions: number; // distinct sessions using this model
  cost: number; // total cost across all sessions using this model
}

export type ModelMap = Map<string, ModelTotals>;

/**
 * Aggregate per-model totals from a list of sessions.
 * Uses formatModel() to normalize the model field (string | {id, providerID, variant} | null).
 * Sessions with empty / null model are skipped.
 * The input array is never mutated.
 */
export function aggregateModels(sessions: SessionSummary[]): ModelMap {
  const totals = new Map<string, ModelTotals>();
  for (const session of sessions) {
    const model = formatModel(session.model);
    if (model === '') continue;
    const entry =
      totals.get(model) ??
      { model, modelRaw: session.model ?? undefined, sessions: 0, cost: 0 };
    entry.sessions += 1;
    entry.cost += session.cost;
    totals.set(model, entry);
  }
  return totals;
}
