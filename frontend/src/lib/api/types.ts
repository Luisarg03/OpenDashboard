/**
 * API response shapes. Mirrors the JSON returned by the FastAPI layer in
 * src/opendashboard/routes.py (models.py serialization via model_dump()).
 * Timestamps are epoch milliseconds; token/cost fields come from the
 * TokenUsageMixin shared by SessionSummary and DelegationNode.
 */

export interface TokenUsage {
  cost: number;
  tokens_input: number;
  tokens_output: number;
  tokens_reasoning: number;
  tokens_cache_read: number;
  tokens_cache_write: number;
}

export interface SessionSummary extends TokenUsage {
  id: string;
  parent_id: string | null;
  project_id: string;
  agent: string;
  model: string | null;
  title: string;
  time_created: number;
  time_updated: number;
  /** Root-only: number of direct child sessions (0 for non-roots). */
  child_count: number;
  /** Root-only: summed cost of direct children (root's own cost excluded). */
  chain_cost: number;
  /** Root-only: summed input+output tokens of direct children. */
  chain_tokens: number;
  summary_additions: number;
  summary_deletions: number;
  summary_files: number;
  summary_diffs: string | null;
  time_archived: number | null;
  time_compacting: number | null;
  is_archived: boolean;
  is_compacting: boolean;
}

/** GET /api/sessions/{id} returns the same SessionSummary shape. */
export type SessionDetail = SessionSummary;

export interface DelegationNode extends TokenUsage {
  id: string;
  parent_id: string | null;
  agent: string;
  model: string | null;
  title: string;
  time_created: number;
  depth: number;
  children: DelegationNode[];
}

/** GET /api/sessions/{id}/chain `tree` field: root nodes with nested children. */
export type TreeNode = DelegationNode;

export interface TraceSummary {
  total_tasks: number;
  total_cost: number;
  total_tokens: number;
  completed_count: number;
  running_count: number;
  failed_count: number;
  duration_minutes: number;
}

export interface DashboardStats {
  total_sessions: number;
  total_root_sessions: number;
  total_cost: number;
  total_tokens: number;
  unique_agents: number;
}
