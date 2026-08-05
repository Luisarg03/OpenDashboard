import type { NodeTypes } from '@xyflow/react';

import { DelegationNodeView } from './delegation-node';

// Module-level to avoid node remounts on every render (spec REQ-4).
export const nodeTypes: NodeTypes = {
  delegation: DelegationNodeView,
};
