import { getWarehouseSettings } from '../actions/catalog.server';
import { getDirectExitSettings } from '../actions/settings.server';
import { NoPermission } from '../fallback/NoPermission';
import { canWarehouse, type PermissionsMap } from '../lib/permissions';
import { DirectExitSection } from './components/DirectExitSection';
import { SettingsPanel } from './components/SettingsPanel';

export default async function SettingsTabContent({ permissions }: { permissions: PermissionsMap }) {
  if (!canWarehouse(permissions, 'config-almacen', 'view')) return <NoPermission />;
  const [settings, directExit] = await Promise.all([getWarehouseSettings(), getDirectExitSettings()]);
  const canUpdate = canWarehouse(permissions, 'config-almacen', 'update');

  return (
    <div className="space-y-4">
      <SettingsPanel
        initialData={settings}
        canCreate={canWarehouse(permissions, 'config-almacen', 'create')}
        canUpdate={canUpdate}
        canDelete={canWarehouse(permissions, 'config-almacen', 'delete')}
      />
      <DirectExitSection amount={directExit?.directExitMaxAmount ?? null} canUpdate={canUpdate} />
    </div>
  );
}
