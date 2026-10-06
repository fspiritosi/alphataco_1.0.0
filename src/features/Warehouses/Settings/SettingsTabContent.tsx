import { getWarehouseSettings } from '../actions/catalog.server';
import { NoPermission } from '../fallback/NoPermission';
import { canWarehouse, type PermissionsMap } from '../lib/permissions';
import { SettingsPanel } from './components/SettingsPanel';

export default async function SettingsTabContent({ permissions }: { permissions: PermissionsMap }) {
  if (!canWarehouse(permissions, 'config-almacen', 'view')) return <NoPermission />;
  const settings = await getWarehouseSettings();

  return (
    <SettingsPanel
      initialData={settings}
      canCreate={canWarehouse(permissions, 'config-almacen', 'create')}
      canUpdate={canWarehouse(permissions, 'config-almacen', 'update')}
      canDelete={canWarehouse(permissions, 'config-almacen', 'delete')}
    />
  );
}
