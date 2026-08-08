import type { Edge, Node } from '@xyflow/react';
import type { DelegationNode } from '@/lib/api/types';

const DELTA_X = 280;
const DELTA_Y = 160;

/**
 * Groups delegation nodes by agent name, creating one aggregated node per
 * unique agent with a count badge. Preserves temporal ordering and
 * ancestor relationships.
 */
export function getAggregatedLayout(
  chain: DelegationNode[],
  liveIds: Set<string> = new Set(),
): { nodes: Node[]; edges: Edge[] } {
  if (chain.length === 0) return { nodes: [], edges: [] };

  // Group nodes by agent name, keeping first occurrence order
  const agentGroups = new Map<string, DelegationNode[]>();
  const agentOrder: string[] = [];
  for (const node of chain) {
    let group = agentGroups.get(node.agent);
    if (!group) {
      group = [];
      agentGroups.set(node.agent, group);
      agentOrder.push(node.agent);
    }
    group.push(node);
  }

  // Build parent→agent mapping (first occurrence of each agent's parent)
  const agentParent = new Map<string, string | null>();
  for (const agent of agentOrder) {
    const nodes = agentGroups.get(agent)!;
    // Use the first node's parent to determine agent-level hierarchy
    const firstNode = nodes[0];
    if (firstNode.parent_id) {
      const parentAgent = chain.find((n) => n.id === firstNode.parent_id)?.agent;
      agentParent.set(agent, parentAgent ?? null);
    } else {
      agentParent.set(agent, null);
    }
  }

  // BFS layout by agent hierarchy depth
  const positioned = new Map<string, { x: number; y: number }>();
  const roots = agentOrder.filter((a) => agentParent.get(a) === null);
  const childrenOfAgent = new Map<string, string[]>();
  for (const agent of agentOrder) {
    const parent = agentParent.get(agent);
    if (parent && parent !== agent) {
      const list = childrenOfAgent.get(parent) ?? [];
      list.push(agent);
      childrenOfAgent.set(parent, list);
    }
  }

  function placeAgent(agent: string, x: number, y: number): void {
    positioned.set(agent, { x, y });
    const children = childrenOfAgent.get(agent) ?? [];
    children.forEach((child, i) => {
      const childX = x + DELTA_X;
      const childY = y + (i - (children.length - 1) / 2) * DELTA_Y;
      placeAgent(child, childX, childY);
    });
  }

  roots.forEach((root, i) => {
    const rootX = (i - (roots.length - 1) / 2) * DELTA_X * 2;
    placeAgent(root, rootX, 0);
  });

  // Create aggregated nodes
  const nodes: Node[] = agentOrder.map((agent) => {
    const nodesInGroup = agentGroups.get(agent)!;
    const count = nodesInGroup.length;
    const isLive = nodesInGroup.some((n) => liveIds.has(n.id));
    const totalTokens = nodesInGroup.reduce((s, n) => s + n.tokens_input + n.tokens_output, 0);
    const totalCost = nodesInGroup.reduce((s, n) => s + n.cost, 0);
    const position = positioned.get(agent) ?? { x: 0, y: 0 };
    const firstNode = nodesInGroup[0];

    return {
      id: `agent-${agent}`,
      type: 'delegation',
      position,
      data: {
        node: {
          ...firstNode,
          id: `agent-${agent}`,
          title: count > 1 ? `${firstNode.title} (${count}x)` : firstNode.title,
          tokens_input: totalTokens,
          tokens_output: 0,
          cost: totalCost,
        },
        isLive,
        aggregated: true,
        count,
      },
    };
  });

  // Create edges between agents based on parent relationships
  const edges: Edge[] = [];
  const seenEdges = new Set<string>();
  for (const agent of agentOrder) {
    const parent = agentParent.get(agent);
    if (parent && positioned.has(parent)) {
      const edgeId = `agent-${parent}->agent-${agent}`;
      if (!seenEdges.has(edgeId)) {
        seenEdges.add(edgeId);
        edges.push({
          id: edgeId,
          source: `agent-${parent}`,
          target: `agent-${agent}`,
          type: 'smoothstep',
          label: `${agentGroups.get(agent)!.length} calls`,
          labelStyle: { fill: 'hsl(var(--muted-foreground))', fontSize: 10 },
          labelBgStyle: { fill: 'hsl(var(--background))', fillOpacity: 0.9 },
        });
      }
    }
  }

  return { nodes, edges };
}
