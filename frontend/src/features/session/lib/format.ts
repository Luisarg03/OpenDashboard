import type { SessionSummary } from '@/lib/api/types';

import { parseModelField } from './model-tags';

/**
 * Render a session's model field as a readable string.
 *
 * The API sends the model either as a plain string or as a
 * `{ id, providerID, variant }` object; lib/api/types.ts only declares the
 * string case, so the runtime object shape is accepted here as well.
 * Objects render as `id`, with `(providerID)` appended when the provider
 * differs from the id. The `variant` field is intentionally not rendered
 * (reserved for the Wave 2 inspector work). Any other shape renders as ''.
 */
/**
 * @deprecated Use `modelTags()` (features/session/lib/model-tags) for
 * renderable per-component tags. Kept only as the grouping-key normalizer
 * for `aggregateModels()`.
 */
export function formatModel(
  model: SessionSummary['model'] | Record<string, unknown> | undefined,
): string {
  const normalized = parseModelField(model);
  if (typeof normalized === 'string') {
    return normalized;
  }
  if (normalized == null) {
    return '';
  }
  // Object branch
  if (typeof normalized.id === 'string') {
    if (
      typeof normalized.providerID === 'string' &&
      normalized.providerID !== normalized.id
    ) {
      return `${normalized.id} (${normalized.providerID})`;
    }
    return normalized.id;
  }
  return '';
}
