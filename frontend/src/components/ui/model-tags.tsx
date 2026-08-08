import type { SessionSummary } from '@/lib/api/types';
import { modelTags, type ModelTagKind } from '@/features/session/lib/model-tags';

interface ModelTagsProps {
  model: SessionSummary['model'] | Record<string, unknown> | undefined;
  /** 'sm' for normal rows, 'xs' for dense tables / drawers. Defaults to 'sm'. */
  size?: 'sm' | 'xs';
  className?: string;
}

// Per-kind pill treatment. The id tag is the primary one (foreground/border
// tokens); provider and variant are secondary (status colors at low opacity).
const KIND_CLASSES: Record<ModelTagKind, string> = {
  provider: 'border-status-info/30 bg-status-info/10 text-status-info',
  id: 'border-border bg-card text-foreground',
  variant: 'border-status-warning/30 bg-status-warning/10 text-status-warning',
};

const SIZE_CLASSES: Record<NonNullable<ModelTagsProps['size']>, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  xs: 'px-1 py-0 text-[10px]',
};

/**
 * Render a session model as a row of small pills, one per component
 * (provider, id, variant), in the order returned by `modelTags()`.
 * Renders nothing when the model has no renderable tags — callers decide
 * whether an empty slot needs a placeholder.
 */
export default function ModelTags({ model, size = 'sm', className }: ModelTagsProps) {
  const tags = modelTags(model);
  if (tags.length === 0) return null;

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className ?? ''}`}>
      {tags.map((tag) => (
        <span
          key={`${tag.kind}:${tag.value}`}
          data-kind={tag.kind}
          title={`${tag.kind}: ${tag.value}`}
          className={`inline-flex items-center gap-1 rounded-md border font-data ${SIZE_CLASSES[size]} ${KIND_CLASSES[tag.kind]}`}
        >
          {tag.value}
        </span>
      ))}
    </span>
  );
}
