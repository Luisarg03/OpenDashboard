import type { Edge, Node } from '@xyflow/react';

import type { DelegationNode } from '@/lib/api/types';

// Chronological cascade layout constants. DELTA_X moves each child one column
// to the right of its parent; DELTA_Y fans siblings vertically around the
// parent's y so earlier siblings sit higher (top-left = earliest,
// bottom-right = latest).
const DELTA_X = 280;
const DELTA_Y = 160;

/**
 * Positions a flat delegation chain as a chronological cascade.
 *
 * Replaces the dagre hierarchy layout (getLayoutedElements, removed): dagre
 * ranked every sibling at the same depth, so the delegation sequence was
 * invisible. Here each child is placed one column to the right of its parent,
 * and siblings are fanned vertically in `time_created` ascending order
 * (earliest highest), producing the cascade the user requested.
 *
 * Positions are React Flow node top-left coordinates. Edges are only emitted
 * when the parent is part of the chain (mirrors chainToFlow), so filtering by
 * timeline cutoff never leaves dangling edges. Safe for any chain shape: a
 * single root with no children yields one node at the origin.
 */
export function getCascadeLayout(
  chain: DelegationNode[],
  liveIds: Set<string> = new Set(),
): { nodes: Node[]; edges: Edge[] } {
  const childrenOf = new Map<string, DelegationNode[]>();
  for (const node of chain) {
    if (node.parent_id) {
      const list = childrenOf.get(node.parent_id) ?? [];
      list.push(node);
      childrenOf.set(node.parent_id, list);
    }
  }
  // Siblings ordered chronologically: earliest sibling highest, latest lowest.
  for (const list of childrenOf.values()) {
    list.sort((a, b) => a.time_created - b.time_created);
  }

  // A node is a root when it has no parent, or its parent is not part of the
  // chain (e.g. filtered out by the timeline cutoff).
  const chainIds = new Set(chain.map((node) => node.id));
  const roots = chain.filter(
    (node) => !node.parent_id || !chainIds.has(node.parent_id),
  );

  const positioned = new Map<string, { x: number; y: number }>();

  function placeNode(node: DelegationNode, x: number, y: number): void {
    positioned.set(node.id, { x, y });
    const children = childrenOf.get(node.id) ?? [];
    children.forEach((child, index) => {
      const childX = x + DELTA_X;
      const childY = y + (index - (children.length - 1) / 2) * DELTA_Y;
      placeNode(child, childX, childY);
    });
  }

  // Spread multiple roots horizontally around the origin.
  roots.forEach((root, index) => {
    const rootX = (index - (roots.length - 1) / 2) * DELTA_X * 2;
    placeNode(root, rootX, 0);
  });

  const nodes: Node[] = chain.map((node) => {
    const position = positioned.get(node.id) ?? { x: 0, y: 0 };
    return {
      id: node.id,
      type: 'delegation',
      position,
      data: { node, isLive: liveIds.has(node.id) },
    };
  });

  const edges: Edge[] = chain.flatMap((node) =>
    node.parent_id && positioned.has(node.parent_id)
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
