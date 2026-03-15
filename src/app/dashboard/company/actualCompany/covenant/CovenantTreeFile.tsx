'use client';

import { Card } from '@/components/ui/card';
import { TreeNode, TreeNodeData } from './TreeFile';

export default function CovenantTreeFile({
  formattedData,
  companyId,
}: {
  formattedData: TreeNodeData[];
  companyId?: string;
}) {
  const treeData: TreeNodeData = {
    name: 'Sindicatos',
    type: 'sindicatoPadre',
    id: '0',
    children: formattedData,
  };

  return (
    <Card className="p-6">
      <div className="bg-background text-foreground">
        <TreeNode node={treeData} level={0} companyId={companyId} />
      </div>
    </Card>
  );
}
