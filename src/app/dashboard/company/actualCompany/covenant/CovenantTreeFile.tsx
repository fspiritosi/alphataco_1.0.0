'use client';

import { Card } from '@/components/ui/card';
import { TreeNode, TreeNodeData } from './TreeFile';

export default function CovenantTreeFile({ formattedData }: { formattedData: TreeNodeData[] }) {
  const treeData: TreeNodeData = {
    name: 'Sindicatos',
    type: 'sindicatoPadre',
    id: '0',
    children: formattedData,
  };

  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       setIsLoading(true);
  //       const guilds = await getGuildsWithCovenants();
  //       const formattedData = await formatGuildsData(guilds);

  //       setTreeData({
  //         name: 'Sindicatos',
  //         type: 'sindicatoPadre',
  //         id: '0',
  //         children: formattedData,
  //       });
  //     } catch (error) {
  //       console.error('Error loading guilds:', error);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };

  //   fetchData();
  // }, []);

  // if (isLoading) {
  //   return <div>Cargando datos...</div>;
  // }

  return (
    <Card className="p-6">
      <div className="bg-background text-foreground">
        <TreeNode node={treeData} level={0} />
      </div>
    </Card>
  );
}
