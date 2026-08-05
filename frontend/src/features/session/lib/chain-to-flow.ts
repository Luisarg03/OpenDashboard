import type { Edge, Node } from '@xyflow/react';

import type { DelegationNode } from '@/lib/api/types';

export interface ChainFlow {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Converts the flat delegation chain into React Flow nodes/edges. Edges are
 * derived from `parent_id`; an edge is only emitted when the parent is part of
 * the given node set (so filtering by timeline cutoff never leaves dangling
 * edges). Layout is applied separately by the graph component.
 */
export function chainToFlow(
  chain: DelegationNode[],
  liveIds: Set<string> = new Set(),
): ChainFlow {
  const ids = new Set(chain.map((node) => node.id));

  const nodes: Node[] = chain.map((node) => ({
    id: node.id,
    type: 'delegation',
    position: { x: 0, y: 0 },
    data: { node, isLive: liveIds.has(node.id) },
  }));

  const edges: Edge[] = chain.flatMap((node) =>
    node.parent_id && ids.has(node.parent_id)
      ? [
          {
            id: `${node.parent_id}->${node.id}`,
            source: node.parent_id,
            target: node.id,
            type: 'smoothstep',
          },
        ]
      : [],
  );

  return { nodes, edges };
}
