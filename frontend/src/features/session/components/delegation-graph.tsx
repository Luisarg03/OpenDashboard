import '@xyflow/react/dist/style.css';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import { AnimatePresence, motion } from 'motion/react';

import { Button } from '@/components/ui/button';
import {
  DelegationNodeView,
  type DelegationFlowNode,
} from '@/features/session/components/delegation-node';
import { nodeTypes } from '@/features/session/components/node-types';
import { getAggregatedLayout } from '@/features/session/lib/aggregated-layout';
import { getCascadeLayout } from '@/features/session/lib/layout';
import { getTimelineLayout } from '@/features/session/lib/timeline-layout';
import type { DelegationNode } from '@/lib/api/types';
import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion';

export type ViewMode = 'expanded' | 'aggregated' | 'timeline';

/**
 * Timeline-mode node: wraps the delegation card in a motion.div that slides
 * in from the left (cutoff advance, the "ladder") and out to the right
 * (cutoff retreat), per design D7. The transition comes from the node data
 * (computed by the graph; collapses to duration 0 under
 * `prefers-reduced-motion`, D8).
 *
 * React Flow unmounts removed nodes instantly, so the exit slide is driven
 * by the `exiting` data flag (the animate target flips from in-view to
 * off-right) instead of an AnimatePresence removal; AnimatePresence stays as
 * the enter/exit wrapper contract and carries the node key.
 */
const TimelineNodeView = memo(function TimelineNodeView(props: NodeProps<DelegationFlowNode>) {
  const { id, data } = props;
  const { exiting, onExitComplete, motionTransition } = data;
  return (
    <AnimatePresence>
      <motion.div
        key={id}
        data-testid="timeline-node"
        initial={{ opacity: 0, x: -40 }}
        animate={exiting ? { opacity: 0, x: 40 } : { opacity: 1, x: 0 }}
        transition={motionTransition}
        onAnimationComplete={exiting && onExitComplete ? () => onExitComplete(id) : undefined}
      >
        <DelegationNodeView {...props} />
      </motion.div>
    </AnimatePresence>
  );
});

// Timeline view swaps the plain node type for the motion wrapper; the
// cascade and aggregated views keep the plain registry.
const timelineNodeTypes: NodeTypes = {
  delegation: TimelineNodeView,
};

export interface DelegationGraphProps {
  chain: DelegationNode[];
  liveNodes?: Set<string>;
  onSelect?: (id: string) => void;
  viewMode?: ViewMode;
}

export function DelegationGraph({ chain, liveNodes, onSelect, viewMode }: DelegationGraphProps) {
  return (
    <ReactFlowProvider>
      <DelegationGraphInner
        chain={chain}
        liveNodes={liveNodes}
        onSelect={onSelect}
        viewMode={viewMode}
      />
    </ReactFlowProvider>
  );
}

function DelegationGraphInner({
  chain,
  liveNodes,
  onSelect,
  viewMode = 'expanded',
}: DelegationGraphProps) {
  const { fitView } = useReactFlow();
  const liveIds = useMemo(() => liveNodes ?? new Set<string>(), [liveNodes]);

  // Focus dim and the timeline enter/exit share one reduced-motion source:
  // both collapse to instant transitions while the media query matches.
  const prefersReducedMotion = usePrefersReducedMotion();

  // Timeline enter/exit easing: the Wave 1 cubic-bezier, 200ms. Reduced
  // motion collapses the duration to 0 (instant in/out, opacity only, D8).
  const transition = useMemo(
    () => ({
      duration: prefersReducedMotion ? 0 : 0.2,
      ease: [0.16, 1, 0.3, 1] as const,
    }),
    [prefersReducedMotion],
  );

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

  // Layout: chronological cascade (expanded), agent-grouped (aggregated), or
  // horizontal timeline (timeline).
  const layouted = useMemo(
    () =>
      viewMode === 'aggregated'
        ? getAggregatedLayout(chain, liveIds)
        : viewMode === 'timeline'
          ? getTimelineLayout(chain, liveIds)
          : getCascadeLayout(chain, liveIds),
    [chain, liveIds, viewMode],
  );

  // Timeline mode: a node the cutoff retreat just removed is kept mounted
  // (marked `exiting`) so its motion slide-out can finish; when the
  // animation completes the node asks to be dropped via onExitComplete.
  // React Flow unmounts removed nodes instantly, so this is the only way the
  // exit slide plays at all.
  const [exitingNodes, setExitingNodes] = useState<Node[]>([]);

  const handleExitComplete = useCallback((id: string) => {
    setExitingNodes((current) => current.filter((node) => node.id !== id));
  }, []);

  // Free-tier layout animation: a CSS transition on the node wrapper makes
  // re-layouts (new nodes arriving over SSE) animate instead of jumping.
  // The React Flow Pro layout animation is paid; `useSpring` interpolation
  // is not applicable to immutable RF node positions, so the transition
  // stays the whole workaround (7.2). Note it also smooths drags, which
  // keeps the effect subtle. Timeline mode additionally carries the motion
  // enter/exit transition and the exit-completion callback on the node data.
  const styledNodes = useMemo(
    () =>
      layouted.nodes.map((node) => ({
        ...node,
        style: {
          transition: prefersReducedMotion ? 'none' : 'transform 200ms ease-out',
        },
        data: {
          ...node.data,
          dimmed: focusChain !== null && !focusChain.has(node.id),
          ...(viewMode === 'timeline'
            ? { motionTransition: transition, onExitComplete: handleExitComplete }
            : {}),
        },
      })),
    [layouted.nodes, focusChain, prefersReducedMotion, transition, viewMode, handleExitComplete],
  );

  // Timeline enter/exit render set: the styled nodes plus any still exiting.
  const renderNodes = useMemo(
    () => (viewMode === 'timeline' ? [...styledNodes, ...exitingNodes] : styledNodes),
    [styledNodes, exitingNodes, viewMode],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(renderNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layouted.edges);

  // Timeline mode: detect nodes dropped by the cutoff retreat and keep them
  // mounted with `exiting: true`; a node re-added by a cutoff advance is
  // pruned (its exit cancels and it slides back in). Cascade / aggregated
  // modes drop straight to the static render.
  const prevStyledRef = useRef<Node[]>(styledNodes);
  useEffect(() => {
    const prev = prevStyledRef.current;
    prevStyledRef.current = styledNodes;
    if (viewMode !== 'timeline') {
      setExitingNodes([]);
      return;
    }
    const styledIds = new Set(styledNodes.map((node) => node.id));
    const removed = prev.filter((node) => !styledIds.has(node.id));
    setExitingNodes((current) => [
      ...current.filter((node) => styledIds.has(node.id)),
      ...removed.map((node) => ({
        ...node,
        data: { ...node.data, exiting: true },
      })),
    ]);
  }, [styledNodes, viewMode]);

  // Re-apply the layout when the node set changes. User drags mutate node
  // state directly and survive until the next layout pass.
  useEffect(() => {
    setNodes(renderNodes);
    setEdges(layouted.edges);
  }, [renderNodes, layouted.edges, setNodes, setEdges]);

  // Airflow FitViewOnLayout pattern: fit only when layout changes,
  // not on every SSE node update. Prevents jitter during live streaming.
  const prevLayoutKey = useRef('');
  useEffect(() => {
    const key = `${chain.length}:${liveIds.size}`;
    if (key !== prevLayoutKey.current) {
      prevLayoutKey.current = key;
      void fitView({ padding: 0.1 });
    }
  }, [chain, liveIds, fitView]);

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
          <Button variant="outline" size="sm" onClick={clearFocus} aria-label="Clear focus mode">
            Clear focus
          </Button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={viewMode === 'timeline' ? timelineNodeTypes : nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          minZoom={0.2}
          maxZoom={2}
          colorMode="dark"
          defaultEdgeOptions={{ style: { stroke: 'hsl(var(--border))' } }}
        >
          <Background variant={BackgroundVariant.Dots} color="hsl(var(--muted-foreground) / 0.3)" />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const isLive = (node.data as Record<string, unknown>)?.isLive as boolean | undefined;
              // ponytail: DelegationNode has no status field yet (design D8);
              // live -> primary, everything else -> muted-foreground. A
              // "done"/"failed" branch lands with that field.
              return isLive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';
            }}
            maskColor="hsl(var(--background) / 0.7)"
            style={{ backgroundColor: 'hsl(var(--muted))' }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
