import type { Edge, Node } from '@xyflow/react';

import type { DelegationNode } from '@/lib/api/types';

// Horizontal timeline layout constants. The X axis is time (earliest node
// leftmost); the Y axis groups nodes into lanes by parent.
const DEFAULT_WIDTH = 1000;
const DEFAULT_NODE_WIDTH = 240;
const DEFAULT_LANE_HEIGHT = 120;
const DEFAULT_PADDING = 32;

export interface TimelineLayoutOptions {
  width?: number;
  height?: number;
  nodeWidth?: number;
  nodeHeight?: number;
  laneHeight?: number;
  padding?: number;
}

/**
 * Positions a flat delegation chain on a horizontal timeline.
 *
 * Nodes are sorted by `time_created` ascending and spread proportionally
 * across the canvas width; each node lands on a lane derived from its
 * `parent_id` (root in lane 0, siblings sharing a lane, cousins not), so the
 * Y axis reads as delegation lines. Positions are React Flow node top-left
 * coordinates; the returned `{ nodes, edges }` shape matches the cascade and
 * aggregated layouts so the graph component dispatches to any of the three.
 *
 * Pure: the input chain and liveIds are never mutated, and the function has
 * no React/DOM dependency.
 */
export function getTimelineLayout(
  chain: DelegationNode[],
  liveIds: Set<string> = new Set(),
  options: TimelineLayoutOptions = {},
): { nodes: Node[]; edges: Edge[] } {
  if (chain.length === 0) return { nodes: [], edges: [] };

  const { width = DEFAULT_WIDTH, nodeWidth = DEFAULT_NODE_WIDTH, laneHeight = DEFAULT_LANE_HEIGHT, padding = DEFAULT_PADDING } = options;

  // Stable sort by time_created ascending: ties keep chain order and still
  // land on distinct X positions because the X formula uses the sorted index.
  const sorted = [...chain].sort((a, b) => a.time_created - b.time_created);

  const chainIds = new Set(chain.map((node) => node.id));
  const childrenOf = new Map<string, DelegationNode[]>();
  for (const node of chain) {
    if (node.parent_id && chainIds.has(node.parent_id)) {
      const list = childrenOf.get(node.parent_id) ?? [];
      list.push(node);
      childrenOf.set(node.parent_id, list);
    }
  }

  // Lane per unique parent_id, assigned in BFS discovery order from the
  // roots: siblings share a lane, cousins do not. A node whose parent was
  // filtered out by the timeline cutoff is treated as a root.
  const laneByParent = new Map<string | null, number>([[null, 0]]);
  const laneOf = new Map<string, number>();
  let nextLane = 1;
  const queue = chain.filter(
    (node) => !node.parent_id || !chainIds.has(node.parent_id),
  );
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    const parentKey =
      node.parent_id && chainIds.has(node.parent_id) ? node.parent_id : null;
    if (!laneByParent.has(parentKey)) {
      laneByParent.set(parentKey, nextLane);
      nextLane += 1;
    }
    laneOf.set(node.id, laneByParent.get(parentKey)!);
    queue.push(...(childrenOf.get(node.id) ?? []));
  }

  const usableWidth = width - nodeWidth - 2 * padding;
  const span = Math.max(1, sorted.length - 1);

  const nodes: Node[] = sorted.map((node, order) => ({
    id: node.id,
    type: 'delegation',
    position: {
      x: padding + (order / span) * usableWidth,
      y: padding + (laneOf.get(node.id) ?? 0) * laneHeight,
    },
    data: { node, isLive: liveIds.has(node.id) },
  }));

  const edges: Edge[] = chain.flatMap((node) =>
    node.parent_id && chainIds.has(node.parent_id)
      ? [
          {
            id: `e${node.parent_id}-${node.id}`,
            source: node.parent_id,
            target: node.id,
            type: 'smoothstep',
          },
        ]
      : [],
  );

  return { nodes, edges };
}
