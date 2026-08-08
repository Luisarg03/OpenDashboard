import { X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DelegationNode } from '@/lib/api/types';
import { getAgentColor } from '@/features/session/lib/agent-colors';
import ModelTags from '@/components/ui/model-tags';

interface NodeDetailDrawerProps {
  node: DelegationNode | null;
  onClose: () => void;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString();
}

function DrawerPanel({ node }: { node: DelegationNode }) {
  const agentColor = getAgentColor(node.agent);
  const totalTokens = node.tokens_input + node.tokens_output;

  return (
    <Dialog.Portal>
      <Dialog.Content className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l bg-background shadow-lg sm:w-[420px]">
        <Dialog.Title className="sr-only">Node details</Dialog.Title>
        <Dialog.Description className="sr-only">
          Details for the {node.agent} delegation node.
        </Dialog.Description>

        <Card className="h-full overflow-auto rounded-none border-0">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${agentColor.dot}`}
              />
              <CardTitle className="text-sm font-semibold">{node.agent}</CardTitle>
            </div>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {/* Title */}
            {node.title && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Task</p>
                <p className="mt-1">{node.title}</p>
              </div>
            )}

            {/* Model */}
            {node.model && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Model</p>
                <p className="mt-1 font-data">
                  <ModelTags model={node.model} size="xs" />
                </p>
              </div>
            )}

            {/* Status */}
            <div>
              <p className="text-xs font-medium text-muted-foreground">Status</p>
              <div className="mt-1">
                <Badge variant="secondary" className="font-data">
                  {node.tokens_input > 0 || node.tokens_output > 0 ? 'Completed' : 'Running'}
                </Badge>
              </div>
            </div>

            {/* Tokens */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Input</p>
                <p className="mt-1 font-data">{node.tokens_input.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Output</p>
                <p className="mt-1 font-data">{node.tokens_output.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total</p>
                <p className="mt-1 font-data">{totalTokens.toLocaleString()}</p>
              </div>
            </div>

            {/* Cost */}
            <div>
              <p className="text-xs font-medium text-muted-foreground">Cost</p>
              <p className="mt-1 font-data">${node.cost.toFixed(6)}</p>
            </div>

            {/* Timestamps */}
            <div>
              <p className="text-xs font-medium text-muted-foreground">Created</p>
              <p className="mt-1 font-data">{formatTime(node.time_created)}</p>
            </div>

            {/* Parent */}
            {node.parent_id && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Parent ID</p>
                <p className="mt-1 truncate font-data text-xs">{node.parent_id}</p>
              </div>
            )}

            {/* Node ID */}
            <div>
              <p className="text-xs font-medium text-muted-foreground">Node ID</p>
              <p className="mt-1 truncate font-data text-xs">{node.id}</p>
            </div>
          </CardContent>
        </Card>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export function NodeDetailDrawer({ node, onClose }: NodeDetailDrawerProps) {
  return (
    <Dialog.Root
      open={node !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {node && <DrawerPanel node={node} />}
    </Dialog.Root>
  );
}
