import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { fetchAllCostCenters } from '../../actions/actions';
import CostCenterForm from './CostCenterForm';
import CostCenterTable from './CostCenterTable';
async function CostCenterTab(
  {
    // costCenters,
    // savedVisibility,
    // savedFilter,
  }: {
    // costCenters: Promise<CostCenter[]>;
    // savedVisibility: VisibilityState;
    // savedFilter: string[];
  }
) {
  const coockiesStore = cookies();
  const costCenters = fetchAllCostCenters();
  const savedVisibility = coockiesStore.get('cost-center-table')?.value;
  const savedFilter = coockiesStore.get('cost-center-table-filters')?.value;

  // const [costCenter, setCostCenter] = useState<CostCenter | null>(null);
  return (
    <div className="w-full">
      <ResizablePanelGroup className="min-h-[400px]" direction="horizontal">
        <ResizablePanel defaultSize={40}>
          <CostCenterForm />
        </ResizablePanel>
        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={60}>
          <Suspense fallback={<p>Loading...</p>}>
            <CostCenterTable
              savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
              costCenters={costCenters}
              // onEdit={setCostCenter}
              savedFilter={savedFilter ? JSON.parse(savedFilter) : []}
            />
          </Suspense>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default CostCenterTab;
