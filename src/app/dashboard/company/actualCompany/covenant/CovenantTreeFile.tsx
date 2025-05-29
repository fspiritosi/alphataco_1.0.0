'use client';

import { formatGuildsData, getGuildsWithCovenants } from '@/shared/actions/covenant-actions';
import { useEffect, useState } from 'react';
import { TreeNode, TreeNodeData } from './TreeFile';

export default function CovenantTreeFile() {
  const [treeData, setTreeData] = useState<TreeNodeData>({
    name: 'Sindicatos',
    type: 'sindicatoPadre',
    id: '0',
    children: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const guilds = await getGuildsWithCovenants();
        const formattedData = await formatGuildsData(guilds);

        setTreeData({
          name: 'Sindicatos',
          type: 'sindicatoPadre',
          id: '0',
          children: formattedData,
        });
      } catch (error) {
        console.error('Error loading guilds:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <div>Cargando datos...</div>;
  }

  return (
    <div className="bg-background text-foreground">
      <TreeNode node={treeData} level={0} />
    </div>
  );
}
