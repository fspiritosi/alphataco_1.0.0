'use client';
import {
  fetchAllDocumentTypes,
  fetchAllEmployeesWithRelations,
  fetchAllEquipmentWithRelations,
  setEmployeeDataOptions,
  setVehicleDataOptions,
} from '@/app/server/GET/actions';
import { CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VisibilityState } from '@tanstack/react-table';
import { ReactNode, use, useState } from 'react';
import DocumentsTable from './DocumentsTable';
import FilterHeader from './FilterComponent';

function TypesDocumentsView({
  personas,
  equipos,
  empresa,
  tabValue,
  subtab,
  employeeMockValuesPromise,
  vehicleMockValuesPromise,
  employeesPromise,
  vehiclesPromise,
  role,
  document_types,
  savedVisibility,
  savedFilters,
  optionChildrenProp,
  actionComponent,
}: {
  personas?: boolean;
  equipos?: boolean;
  empresa?: boolean;
  tabValue?: string;
  subtab?: string;
  employeeMockValuesPromise: ReturnType<typeof setEmployeeDataOptions>;
  vehicleMockValuesPromise: ReturnType<typeof setVehicleDataOptions>;
  employeesPromise: ReturnType<typeof fetchAllEmployeesWithRelations>;
  vehiclesPromise: ReturnType<typeof fetchAllEquipmentWithRelations>;
  role?: string;
  document_types: Awaited<ReturnType<typeof fetchAllDocumentTypes>>;
  savedVisibility: VisibilityState;
  savedFilters: string[];
  optionChildrenProp?: string;
  actionComponent?: ReactNode;
}) {
  // const document_types = useCountriesStore((state) => state.companyDocumentTypes);
  // const document_types = use(document_typesPromise);
  const employeeMockValues = use(employeeMockValuesPromise);
  const vehicleMockValues = use(vehicleMockValuesPromise);
  const employees = use(employeesPromise);
  const vehicles = use(vehiclesPromise);

  const doc_personas = document_types?.filter((doc) => doc.applies === 'Persona').filter((e) => e.is_active);
  const doc_equipos = document_types?.filter((doc) => doc.applies === 'Equipos').filter((e) => e.is_active);
  const doc_empresa = document_types?.filter((doc) => doc.applies === 'Empresa').filter((e) => e.is_active);

  const [filters, setFilters] = useState({
    personas: { name: '', multiresource: '', special: '', monthly: '', expired: '', mandatory: '', private: '' },
    equipos: { name: '', multiresource: '', special: '', monthly: '', expired: '', mandatory: '', private: '' },
    empresa: { name: '', multiresource: '', special: '', monthly: '', expired: '', mandatory: '', private: '' },
  });

  const handleFilterChange = (type: 'personas' | 'equipos' | 'empresa', filterName: string, value: string) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [type]: { ...prevFilters[type], [filterName]: value },
    }));
  };

  const applyFilters = (
    docs: typeof doc_personas | typeof doc_equipos | typeof doc_empresa,
    type: 'personas' | 'equipos' | 'empresa'
  ) => {
    const filter = filters[type];
    return docs?.filter((doc) => {
      const matchesName = doc.name.toLowerCase().includes(filter.name.toLowerCase());
      const matchesMultiresource =
        filter.multiresource === '' || (filter.multiresource === 'Si' ? doc.multiresource : !doc.multiresource);
      const matchesSpecial = filter.special === '' || (filter.special === 'Si' ? doc.special : !doc.special);
      const matchesMonthly =
        filter.monthly === '' || (filter.monthly === 'Si' ? doc.is_it_montlhy : !doc.is_it_montlhy);
      const matchesExpired = filter.expired === '' || (filter.expired === 'Si' ? doc.explired : !doc.explired);
      const matchesMandatory = filter.mandatory === '' || (filter.mandatory === 'Si' ? doc.mandatory : !doc.mandatory);
      const matchesPrivate = filter.private === '' || (filter.private === 'Si' ? doc.private : !doc.private);

      return (
        matchesName &&
        matchesMultiresource &&
        matchesSpecial &&
        matchesMonthly &&
        matchesExpired &&
        matchesMandatory &&
        matchesPrivate
      );
    });
  };

  const filteredDocPersonas = applyFilters(doc_personas, 'personas');
  const filteredDocEquipos = applyFilters(doc_equipos, 'equipos');
  const filteredDocEmpresa = applyFilters(doc_empresa, 'empresa');

  const convertToOptions = (array: any) =>
    Array.from(new Set(array?.map((val: any) => (val === true ? 'Si' : 'No')))).filter((val: any) => val !== undefined);

  const docOptions = {
    multiresource: convertToOptions(document_types?.map((doc: any) => doc.multiresource)),
    special: convertToOptions(document_types?.map((doc: any) => doc.special)),
    monthly: convertToOptions(document_types?.map((doc) => doc.is_it_montlhy)),
    expired: convertToOptions(document_types?.map((doc) => doc.explired)),
    mandatory: convertToOptions(document_types?.map((doc) => doc.mandatory)),
    private: convertToOptions(document_types?.map((doc) => doc.private)),
  };

  const optionValue =
    personas && equipos && empresa ? 'Personas' : personas ? 'Personas' : equipos ? 'Equipos' : 'Empresa';

  return (
    <CardContent className="px-0 pt-1">
      <Tabs defaultValue={optionValue} className="w-full">
        <div className="flex flex-col w-fit gap-2">
          <TabsList className="w-fit">
            {personas && <TabsTrigger value="Personas">Personas ({filteredDocPersonas?.length || 0})</TabsTrigger>}
            {equipos && <TabsTrigger value="Equipos">Equipos ({filteredDocEquipos?.length || 0})</TabsTrigger>}
            {empresa && <TabsTrigger value="Empresa">Empresa ({filteredDocEmpresa?.length || 0})</TabsTrigger>}
          </TabsList>
          <div>{actionComponent}</div>
        </div>
        {personas && (
          <TabsContent value="Personas">
            <DocumentsTable
              data={filteredDocPersonas || []}
              filters={filters.personas}
              employeeMockValues={employeeMockValues}
              vehicleMockValues={vehicleMockValues}
              employees={employees}
              vehicles={vehicles}
              savedFilters={savedFilters}
              savedVisibility={savedVisibility}
            >
              <FilterHeader
                filters={filters.personas}
                docOptions={docOptions as any}
                onFilterChange={(name, value) => handleFilterChange('personas', name, value)}
              />
            </DocumentsTable>
          </TabsContent>
        )}
        {equipos && (
          <TabsContent value="Equipos">
            <DocumentsTable
              savedVisibility={savedVisibility}
              savedFilters={savedFilters}
              data={filteredDocEquipos || []}
              filters={filters.equipos}
              employeeMockValues={employeeMockValues}
              vehicleMockValues={vehicleMockValues}
              employees={employees}
              vehicles={vehicles}
            >
              <FilterHeader
                filters={filters.equipos}
                docOptions={docOptions as any}
                onFilterChange={(name, value) => handleFilterChange('equipos', name, value)}
              />
            </DocumentsTable>
          </TabsContent>
        )}
        {empresa && (
          <TabsContent value="Empresa">
            <DocumentsTable
              savedVisibility={savedVisibility}
              savedFilters={savedFilters}
              data={filteredDocEmpresa || []}
              filters={filters.empresa}
              employeeMockValues={employeeMockValues}
              vehicleMockValues={vehicleMockValues}
              employees={employees}
              vehicles={vehicles}
            >
              <FilterHeader
                filters={filters.empresa}
                docOptions={docOptions as any}
                onFilterChange={(name, value) => handleFilterChange('empresa', name, value)}
              />
            </DocumentsTable>
          </TabsContent>
        )}
      </Tabs>
    </CardContent>
  );
}

export default TypesDocumentsView;
