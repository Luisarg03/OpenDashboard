import { memo } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
import { motion, type Transition } from 'motion/react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { DelegationNode } from '@/lib/api/types';
import { getAgentColor } from '@/features/session/lib/agent-colors';
import { cn } from '@/lib/utils';

export type DelegationNodeData = {
  node: DelegationNode;
  isLive: boolean;
  /** Set when focus mode is active and this node is outside the focus chain. */
  dimmed?: boolean;
  /** Timeline mode only: the enter/exit transition for the motion wrapper (D7/D8). */
  motionTransition?: Transition;
  /** Timeline mode only: true while the node plays its exit slide-out. */
  exiting?: boolean;
  /** Timeline mode only: called when the exit animation completes. */
  onExitComplete?: (id: string) => void;
};

export type DelegationFlowNode = Node<DelegationNodeData, 'delegation'>;

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString();
}

export const DelegationNodeView = memo(function DelegationNodeView({
  data,
}: NodeProps<DelegationFlowNode>) {
  const { node, isLive } = data;
  const totalTokens = node.tokens_input + node.tokens_output;
  const agentColor = getAgentColor(node.agent);

  return (
    <Card
      className={cn(
        'w-60 p-3 text-xs shadow-sm',
        `border-l-2 ${agentColor.border}`,
        isLive && 'ring-2 ring-status-info/40',
      )}
      data-dim={data.dimmed ? 'true' : undefined}
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileFocus={{ scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {isLive && (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-success opacity-75" />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full bg-status-success bloom-low"
                  style={{ '--bloom-color': 'hsl(var(--status-success))' } as React.CSSProperties}
                />
              </span>
            )}
            <span className="truncate font-medium">{node.agent}</span>
          </div>
          <Badge
            variant={isLive ? 'default' : 'secondary'}
            className={isLive ? 'bg-status-success/15 text-status-success border-transparent' : ''}
          >
            {isLive ? 'Running' : 'Done'}
          </Badge>
        </div>
        <p className="mt-1.5 truncate text-muted-foreground" title={node.title}>
          {node.title || 'Untitled task'}
        </p>
        {node.model && <p className="mt-0.5 truncate text-muted-foreground/70">{node.model}</p>}
        <div className="mt-2 grid grid-cols-3 gap-1 text-muted-foreground">
          <span className="truncate tabular-nums" title={`${totalTokens} tokens`}>
            {totalTokens.toLocaleString()} tok
          </span>
          <span className="truncate text-right tabular-nums">${node.cost.toFixed(4)}</span>
          <span className="truncate text-right tabular-nums">{formatTime(node.time_created)}</span>
        </div>
      </motion.div>
    </Card>
  );
});
