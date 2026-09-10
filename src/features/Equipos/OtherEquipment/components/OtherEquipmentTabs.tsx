'use client';

import { Badge } from '@/components/ui/badge';
import { fetchAllCostCenters } from '@/features/Empresa/General/actions/actions';
import { fetchAllContractorForVehicles } from '@/features/Equipos/EquipoID/actions/vehicle-actions';
import {
  getModelsByBrand,
  getSubTypesByType,
  getVehicleBrands,
  getVehicleOwners,
  getVehicleTypes,
} from '@/features/Equipos/EquipoID/lib/actions/vehicle-catalog-actions';
import type { OtherEquipmentDetail } from '@/features/Equipos/OtherEquipment/actions/actionsServer';
import { OtherEquipmentMaintenanceTable } from '@/features/Equipos/OtherEquipment/maintenance/OtherEquipmentMaintenanceTable';
import { TabsManagerClientSide } from '@/features/TabsManager/TabsManagerClientSide';
import type { TabDefinition } from '@/features/TabsManager/types';
import type { UseFormReturn } from 'react-hook-form';
import { OtherEquipmentAssignmentForm } from './OtherEquipmentAssignmentForm';
import { OtherEquipmentBasicDataForm } from './OtherEquipmentBasicDataForm';
import { OtherEquipmentFileUpload } from './OtherEquipmentFileUpload';
import type { OtherEquipmentFormData } from './OtherEquipmentForm';
import { OtherEquipmentQr } from './OtherEquipmentQr';

interface OtherEquipmentTabsProps {
  equipment?: OtherEquipmentDetail | null;
  mode: 'view' | 'edit' | 'new';
  equipmentId?: string;
  form: UseFormReturn<OtherEquipmentFormData>;
  brandsPromise: ReturnType<typeof getVehicleBrands>;
  modelsPromise: ReturnType<typeof getModelsByBrand>;
  typesPromise: ReturnType<typeof getVehicleTypes>;
  subTypesPromise: ReturnType<typeof getSubTypesByType>;
  ownersPromise: ReturnType<typeof getVehicleOwners>;
  contractorsPromise: ReturnType<typeof fetchAllContractorForVehicles>;
  costCentersPromise: ReturnType<typeof fetchAllCostCenters>;
  hierarchicalPositionsPromise: Promise<Array<{ id: string; name: string }>>;
  vehiclesPromise: Promise<Array<{ id: string; domain: string | null }>>;
  certificationsComponent?: React.ReactNode;
  qrComponent?: React.ReactNode;
}

const BASIC_DATA_FIELDS: (keyof OtherEquipmentFormData)[] = [
  'type_id',
  'sub_type_id',
  'brand_id',
  'model_id',
  'serial_number',
  'intern_number',
  'year',
  'condition',
  'horometer',
  'manufacturer_plate',
  'composition',
  'invoice_number',
  'initial_value',
  'currency',
  'purchase_date',
  'owner_id',
  'certification_expiration_date',
  'certification_number',
  'linked_vehicle_id',
];

const ASSIGNMENT_FIELDS: (keyof OtherEquipmentFormData)[] = ['cost_center_id', 'cost_type', 'sector', 'contractors'];

export function OtherEquipmentTabs({
  equipment,
  mode,
  equipmentId,
  form,
  brandsPromise,
  modelsPromise,
  typesPromise,
  subTypesPromise,
  ownersPromise,
  contractorsPromise,
  costCentersPromise,
  hierarchicalPositionsPromise,
  vehiclesPromise,
  certificationsComponent,
  qrComponent,
}: OtherEquipmentTabsProps) {
  const readOnly = mode === 'view';
  const showExtraContent = !!equipmentId && mode !== 'new';

  // Detectar errores por tab para mostrar indicador visual
  const formErrors = form.formState.errors;
  const hasBasicDataErrors = BASIC_DATA_FIELDS.some((field) => !!formErrors[field]);
  const hasAssignmentErrors = ASSIGNMENT_FIELDS.some((field) => !!formErrors[field]);

  // El equipo genera QR si su tipo tiene generates_qr=true
  const generatesQr = equipment?.type?.generates_qr ?? false;

  const equipmentLabel = equipment?.serial_number || equipment?.intern_number || equipmentId || 'equipo';

  // 'mantenimiento' además de 'equipos': la tab de Mantenimiento hereda los
  // permisos del historial de mantenimiento, que vive en ese módulo (ticket 596)
  const tabs: TabDefinition<'equipos' | 'mantenimiento'>[] = [
    {
      value: 'basicData',
      label: (
        <div className="relative">
          Datos Básicos
          {hasBasicDataErrors && <Badge variant="destructive" className="ml-2 h-2 w-2 p-0" />}
        </div>
      ),
      moduleSlug: 'equipos',
      tabSlug: 'datos-basicos-otro',
      content: (
        <div className="space-y-6">
          <OtherEquipmentBasicDataForm
            form={form}
            readOnly={readOnly}
            brandsPromise={brandsPromise}
            modelsPromise={modelsPromise}
            typesPromise={typesPromise}
            subTypesPromise={subTypesPromise}
            ownersPromise={ownersPromise}
            vehiclesPromise={vehiclesPromise}
          />

          {showExtraContent && equipmentId && (
            <>
              {/* Sección de Fotos */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold">Fotos</h3>
                  <p className="text-sm text-muted-foreground">Imágenes del equipo (máx. 4)</p>
                </div>
                {/*
                 * key={`${equipmentId}-pictures`} fuerza el REMOUNT del componente al
                 * cambiar de equipo. Sin esto, el useState(initialFiles) interno queda
                 * stale y un equipo muestra las imágenes del anterior. Ver fix de bug
                 * reportado por usuaria con piletas GH PL-050 / GH PL-052.
                 */}
                <OtherEquipmentFileUpload
                  key={`${equipmentId}-pictures`}
                  equipmentId={equipmentId}
                  type="pictures"
                  files={equipment?.pictures ?? []}
                  maxFiles={4}
                  readOnly={readOnly}
                />
              </div>

              {/* Sección de Planos */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold">Planos</h3>
                  <p className="text-sm text-muted-foreground">Documentos técnicos y planos del equipo</p>
                </div>
                <OtherEquipmentFileUpload
                  key={`${equipmentId}-blueprints`}
                  equipmentId={equipmentId}
                  type="blueprints"
                  files={equipment?.blueprints ?? []}
                  readOnly={readOnly}
                />
              </div>
            </>
          )}
        </div>
      ),
    },
    {
      value: 'assignmentData',
      label: (
        <div className="relative">
          Asignación
          {hasAssignmentErrors && <Badge variant="destructive" className="ml-2 h-2 w-2 p-0" />}
        </div>
      ),
      moduleSlug: 'equipos',
      tabSlug: 'asignacion-otro',
      content: (
        <div className="space-y-4">
          <OtherEquipmentAssignmentForm
            form={form}
            readOnly={readOnly}
            contractorsPromise={contractorsPromise}
            costCentersPromise={costCentersPromise}
            hierarchicalPositionsPromise={hierarchicalPositionsPromise}
          />
        </div>
      ),
    },
    {
      value: 'certifications',
      label: 'Documentos',
      moduleSlug: 'equipos',
      tabSlug: 'certificaciones-otro',
      disabled: !showExtraContent,
      content: showExtraContent ? <div className="space-y-4">{certificationsComponent}</div> : null,
    },
    {
      // Ticket 596: los equipamientos entran al circuito de mantenimiento.
      // Hereda los permisos del historial de mantenimiento de vehículos.
      value: 'maintenance',
      label: 'Mantenimiento',
      moduleSlug: 'mantenimiento',
      tabSlug: 'ordenes_mantenimiento',
      disabled: !showExtraContent,
      content:
        showExtraContent && equipmentId ? (
          <div className="space-y-4">
            <OtherEquipmentMaintenanceTable equipmentId={equipmentId} />
          </div>
        ) : (
          // En alta todavía no hay id: se dice por qué, en vez de dejar la tab muda
          <p className="py-8 text-center text-sm text-muted-foreground">
            Guardá el equipamiento para registrar mantenimientos.
          </p>
        ),
    },
  ];

  // Agregar tab de QR solo si el tipo genera QR
  if (generatesQr && equipmentId) {
    tabs.push({
      value: 'qr',
      label: 'QR',
      moduleSlug: 'equipos',
      tabSlug: 'qr-otro-equipo',
      content: (
        <div className="space-y-4">
          {qrComponent ?? <OtherEquipmentQr equipmentId={equipmentId} equipmentLabel={equipmentLabel} />}
        </div>
      ),
    });
  }

  return (
    <div className="">
      <TabsManagerClientSide
        paramName="tab"
        defaultTab="basicData"
        tabs={tabs}
        listClassName={`grid w-full grid-cols-${tabs.length}`}
        triggerClassName="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
      />
    </div>
  );
}
