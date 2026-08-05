import '@xyflow/react/dist/style.css';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Node,
} from '@xyflow/react';

import { Button } from '@/components/ui/button';
import { nodeTypes } from '@/features/session/components/node-types';
import { getCascadeLayout } from '@/features/session/lib/layout';
import type { DelegationNode } from '@/lib/api/types';

export interface DelegationGraphProps {
  chain: DelegationNode[];
  liveNodes?: Set<string>;
  onSelect?: (id: string) => void;
}

export function DelegationGraph({ chain, liveNodes, onSelect }: DelegationGraphProps) {
  return (
    <ReactFlowProvider>
      <DelegationGraphInner chain={chain} liveNodes={liveNodes} onSelect={onSelect} />
    </ReactFlowProvider>
  );
}

function DelegationGraphInner({ chain, liveNodes, onSelect }: DelegationGraphProps) {
  const liveIds = useMemo(() => liveNodes ?? new Set<string>(), [liveNodes]);

  // Focus mode: the clicked node plus its ancestor chain stay fully opaque,
  // everything else dims. Computed on the chain the graph receives (already
  // filtered by the parent's timeline cutoff), so the ancestor walk and the
  // filter share the same node set.
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const focusChain = useMemo(() => {
    if (focusedNodeId === null) return null;
    const parents = new Map(chain.map((node) => [node.id, node.parent_id]));
    const ids = new Set<string>([focusedNodeId]);
    let current = parents.get(focusedNodeId) ?? null;
    while (current !== null) {
      ids.add(current);
      current = parents.get(current) ?? null;
    }
    return ids;
  }, [chain, focusedNodeId]);

  // Chronological cascade layout: children cascade diagonally by
  // time_created (dagre hierarchy + TB/LR toggle removed in favor of it).
  const layouted = useMemo(
    () => getCascadeLayout(chain, liveIds),
    [chain, liveIds],
  );

  // Free-tier layout animation: a CSS transition on the node wrapper makes
  // re-layouts (new nodes arriving over SSE) animate instead of jumping.
  // The React Flow Pro layout animation is paid; `useSpring` interpolation
  // is not applicable to immutable RF node positions, so the transition
  // stays the whole workaround (7.2). Note it also smooths drags, which
  // keeps the effect subtle.
  const styledNodes = useMemo(
    () =>
      layouted.nodes.map((node) => ({
        ...node,
        style: { transition: 'transform 200ms ease-out' },
        data: {
          ...node.data,
          dimmed: focusChain !== null && !focusChain.has(node.id),
        },
      })),
    [layouted.nodes, focusChain],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(styledNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layouted.edges);

  // Re-apply the cascade layout when the node set changes. User drags mutate
  // node state directly and survive until the next layout pass.
  useEffect(() => {
    setNodes(styledNodes);
    setEdges(layouted.edges);
  }, [styledNodes, layouted.edges, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_event: ReactMouseEvent, node: Node) => {
      // Clicking the focused node again clears focus; clicking another node
      // moves focus to it.
      setFocusedNodeId((current) => (current === node.id ? null : node.id));
      onSelect?.(node.id);
    },
    [onSelect],
  );

  const clearFocus = useCallback(() => setFocusedNodeId(null), []);

  return (
    <div className="flex h-full flex-col gap-2">
      {focusedNodeId !== null && (
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={clearFocus}
            aria-label="Clear focus mode"
          >
            Clear focus
          </Button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
          minZoom={0.2}
          maxZoom={2}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
