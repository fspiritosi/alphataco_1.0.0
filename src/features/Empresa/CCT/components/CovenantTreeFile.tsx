'use client';

import { Card } from '@/components/ui/card';
import type { TreeNodeData } from '../lib/covenant-tree';
import { TreeNode } from './TreeFile';

export default function CovenantTreeFile({ tree }: { tree: TreeNodeData }) {
  return (
    <Card className="p-6">
      <div className="bg-background text-foreground">
        <TreeNode node={tree} level={0} />
      </div>
    </Card>
  );
}
