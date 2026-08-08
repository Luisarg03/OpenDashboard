import type { SessionSummary } from '@/lib/api/types';

/**
 * Normalize the model field. The backend stores `model` as a JSON-serialized
 * text blob; the parser detects that shape and returns the parsed object.
 * Plain strings are returned as-is. Null / undefined / any other shape
 * return null.
 *
 * ponytail: data contract — the OpenCode SQLite session table stores
 * `model` as TEXT (a JSON object serialized via Python's repr/json.dumps).
 * FastAPI reads it as `Optional[str]`. The frontend type is `string | null`.
 * This parser is the client-side normalizer; the alternative is a backend
 * change (parse on read in routes.py / db.py). Defer the backend change
 * to a follow-up; this client-side fix is a faster, smaller-diff resolution.
 */
export function parseModelField(
  model: SessionSummary['model'] | Record<string, unknown> | undefined,
): Record<string, unknown> | string | null {
  if (model == null) return null;
  if (typeof model === 'string') {
    const trimmed = model.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // Not valid JSON; fall through and return the string as-is.
      }
    }
    return model;
  }
  if (typeof model === 'object') return model;
  return null;
}

export type ModelTagKind = 'id' | 'provider' | 'variant';

export interface ModelTag {
  kind: ModelTagKind;
  value: string;
}

/**
 * Split a session's model field into renderable tags.
 *
 * The API sends the model as a plain string, a `{ id, providerID, variant }`
 * object, or a JSON-serialized string of that object; see `parseModelField`.
 * Plain strings become a single `id` tag; objects yield one tag per non-empty
 * field in the order provider, id, variant (provider reads as the model's
 * namespace). Empty strings, null, undefined, and unknown shapes yield no
 * tags. Pure function: no mutation, no side effects.
 */
export function modelTags(
  model: SessionSummary['model'] | Record<string, unknown> | undefined,
): ModelTag[] {
  const normalized = parseModelField(model);
  if (normalized == null || typeof normalized === 'string') {
    // After normalization: a string here means the model was a non-JSON
    // plain string (or a non-JSON-shaped string). Treat as a single id tag.
    if (typeof normalized === 'string' && normalized.length > 0) {
      return [{ kind: 'id', value: normalized }];
    }
    return [];
  }
  // Normalized to an object — apply the existing object logic.
  const obj = normalized;
  const tags: ModelTag[] = [];
  if (typeof obj.providerID === 'string' && obj.providerID.length > 0) {
    tags.push({ kind: 'provider', value: obj.providerID });
  }
  if (typeof obj.id === 'string' && obj.id.length > 0) {
    tags.push({ kind: 'id', value: obj.id });
  }
  if (typeof obj.variant === 'string' && obj.variant.length > 0) {
    tags.push({ kind: 'variant', value: obj.variant });
  }
  return tags;
}
