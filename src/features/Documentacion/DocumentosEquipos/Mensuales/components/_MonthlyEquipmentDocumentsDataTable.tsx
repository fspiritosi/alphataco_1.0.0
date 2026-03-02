'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardDescription } from '@/components/ui/card';
import { handleSupabaseError } from '@/lib/errorHandler';
import { supabaseBrowser } from '@/lib/supabase/browser';
import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import { useQuery } from '@tanstack/react-query';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { CheckCircle2, CircleOff, Download } from 'lucide-react';
import moment from 'moment';
import { useMemo } from 'react';
import { toast } from 'sonner';
import {
  getAllMonthlyEquipmentDocumentsForExport,
  getMonthlyEquipmentDocumentsFacets,
  type MonthlyEquipmentDocumentListItem,
} from '../actions.server';
import { HIDDEN_COLUMNS_BY_DEFAULT, columns, stateIcons, stateLabels } from '../columns';

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  data: MonthlyEquipmentDocumentListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  initialColumnVisibility: Record<string, boolean>;
  initialFilterVisibility: Record<string, boolean>;
  equipmentId?: string;
}

// ============================================================================
// DEFAULT VISIBLE FILTERS
// ============================================================================

const DEFAULT_VISIBLE_FILTER_IDS = ['state', 'vehicle', 'documentType'];

// ============================================================================
// DOWNLOAD BUTTON — descarga ZIP con todos los documentos de la página actual
// ============================================================================

function MonthlyEquipmentDocumentsDownloadButton({ tableRows }: { tableRows: MonthlyEquipmentDocumentListItem[] }) {
  const supabase = supabaseBrowser();

  const downloadableRows = tableRows.filter((row) => row.state !== 'pendiente' && row.document_path);
  const pendingRows = tableRows.filter((row) => row.state === 'pendiente');

  const getVehicleLabel = (row: MonthlyEquipmentDocumentListItem) => {
    if (row.vehicles) {
      return row.vehicles.domain ?? row.vehicles.serie ?? row.vehicles.intern_number ?? 'Equipo';
    }
    return 'Equipo';
  };

  const handleDownloadAll = async () => {
    toast.promise(
      async () => {
        const zip = new JSZip();

        const files = await Promise.all(
          downloadableRows.map(async (doc) => {
            if (!doc.document_path) return null;
            const { data, error } = await supabase.storage.from('document-files').download(doc.document_path);

            if (error) {
              throw new Error(handleSupabaseError(error.message));
            }

            const extension = doc.document_path.split('.').pop();
            const docTypeName = doc.document_types?.name ?? 'documento';
            const vehicleLabel = getVehicleLabel(doc);
            const period = doc.period ? `-(${doc.period})` : '';

            return {
              data,
              name: `${vehicleLabel}-(${docTypeName})${period}.${extension}`,
            };
          })
        );

        for (const file of files) {
          if (file) {
            zip.file(file.name, file.data);
          }
        }

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'documentos-mensuales-equipos.zip');
      },
      {
        loading: 'Descargando documentos...',
        success: 'Documentos descargados correctamente',
        error: (error) => error?.message ?? 'Error al descargar documentos',
      }
    );
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={downloadableRows.length === 0} size="sm" variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Descargar Documentos
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Descargar {downloadableRows.length} {downloadableRows.length === 1 ? 'documento' : 'documentos'}
          </AlertDialogTitle>
          <AlertDialogDescription className="max-h-[65vh] overflow-y-auto">
            {pendingRows.length > 0 && (
              <Accordion type="single" collapsible className="mb-2">
                <AccordionItem value="pending">
                  <AccordionTrigger className="text-destructive">
                    {pendingRows.length} {pendingRows.length === 1 ? 'documento pendiente' : 'documentos pendientes'}{' '}
                    (no se descargarán)
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-2">
                      {pendingRows.map((row) => (
                        <Card className="p-2 border-destructive/30" key={row.id}>
                          <CardDescription>
                            {row.vehicles
                              ? row.vehicles.domain ?? row.vehicles.serie ?? row.vehicles.intern_number ?? 'Equipo'
                              : 'Equipo'}{' '}
                            ({row.document_types?.name ?? 'Documento'})
                          </CardDescription>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
            <Accordion type="single" collapsible>
              <AccordionItem value="downloadable">
                <AccordionTrigger className="text-green-600">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {downloadableRows.length} {downloadableRows.length === 1 ? 'documento listo' : 'documentos listos'}{' '}
                    para descargar
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-2 mt-2">
                    {downloadableRows.map((row) => (
                      <Card className="p-2 border-green-600/30" key={row.id}>
                        <CardDescription>
                          {row.vehicles
                            ? row.vehicles.domain ?? row.vehicles.serie ?? row.vehicles.intern_number ?? 'Equipo'
                            : 'Equipo'}{' '}
                          ({row.document_types?.name ?? 'Documento'}){row.period && ` - ${row.period}`}
                        </CardDescription>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDownloadAll}>Descargar documentos</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================================
// CLIENT COMPONENT
// ============================================================================

export function _MonthlyEquipmentDocumentsDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  initialColumnVisibility,
  initialFilterVisibility,
  equipmentId,
}: Props) {
  // Extraer solo los params relevantes para facets (sin page/sort)
  const facetParams = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { page, pageSize, sort, sortBy, sortOrder, ...rest } = searchParams;
    return rest;
  }, [searchParams]);

  // Facets con cross-filtering
  const { data: facets, isFetching: isFetchingFacets } = useQuery({
    queryKey: ['monthly-equipment-documents-facets', facetParams, equipmentId],
    queryFn: () => getMonthlyEquipmentDocumentsFacets(facetParams, equipmentId),
    staleTime: 5 * 60 * 1000,
  });

  // Merge column visibility: defaults + saved preferences
  const mergedColumnVisibility = useMemo(() => {
    const defaults = Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((col) => [col, false]));
    return { ...defaults, ...initialColumnVisibility };
  }, [initialColumnVisibility]);

  // Merge filter visibility
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    const allFilterIds = ['state', 'vehicle', 'documentType', 'mandatory', 'multiresource', 'contractor', 'created_at'];
    return Object.fromEntries(allFilterIds.map((id) => [id, DEFAULT_VISIBLE_FILTER_IDS.includes(id)]));
  }, [initialFilterVisibility]);

  // ─── Filtros facetados ────────────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      // Estado (enum state)
      {
        columnId: 'state',
        title: 'Estado',
        options: [
          ...Object.keys(stateLabels).map((value) => {
            const Icon = stateIcons[value];
            return { value, label: stateLabels[value] ?? value, icon: Icon };
          }),
          ...(facets?.state?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin estado', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.state,
      },

      // Equipo (texto libre — busca por dominio, serie o número interno)
      {
        columnId: 'vehicle',
        title: 'Equipo',
        type: 'text' as const,
        placeholder: 'Buscar por dominio, serie o N° interno...',
      },

      // Tipo de Documento (FK UUID → document_types)
      {
        columnId: 'documentType',
        title: 'Tipo de Documento',
        options: [
          ...(facets?.docTypeOptions?.map((dt) => ({
            value: dt.id,
            label: dt.name,
          })) ?? []),
          ...(facets?.documentType?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin tipo', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.documentType,
      },

      // Mandatorio (booleano en document_types)
      {
        columnId: 'mandatory',
        title: 'Mandatorio',
        options: [
          { value: 'true', label: 'Mandatorio' },
          { value: 'false', label: 'No Mandatorio' },
          ...(facets?.mandatory?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.mandatory,
      },

      // Multirecurso (booleano en document_types)
      {
        columnId: 'multiresource',
        title: 'Multirecurso',
        options: [
          { value: 'true', label: 'Multirecurso' },
          { value: 'false', label: 'No Multirecurso' },
          ...(facets?.multiresource?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.multiresource,
      },

      // Afectación / Contractor (M:M a través de vehicles)
      {
        columnId: 'contractor',
        title: 'Afectado a',
        options: [
          ...(facets?.contractorOptions?.map((c) => ({
            value: c.id,
            label: c.name,
          })) ?? []),
          ...(facets?.contractor?.has(NULL_FILTER_VALUE)
            ? [{ value: NULL_FILTER_VALUE, label: 'Sin afectar', icon: CircleOff }]
            : []),
        ],
        externalCounts: facets?.contractor,
      },

      // Fecha de subida (rango)
      {
        columnId: 'created_at',
        title: 'Subido el',
        type: 'dateRange' as const,
      },
    ],
    [facets]
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      searchPlaceholder="Buscar por dominio, serie o número interno..."
      facetedFilters={facetedFilters}
      initialColumnVisibility={mergedColumnVisibility}
      initialFilterVisibility={mergedFilterVisibility}
      tableId={tableId}
      paramNamespace={tableId}
      showFilterToggle={true}
      isFetchingFacets={isFetchingFacets}
      emptyMessage="No hay documentos mensuales de equipos registrados"
      data-testid="monthly-equipment-documents-table"
      toolbarActions={<MonthlyEquipmentDocumentsDownloadButton tableRows={data} />}
      exportConfig={{
        fetchAllData: () => getAllMonthlyEquipmentDocumentsForExport(searchParams, equipmentId),
        options: {
          filename: 'documentos-mensuales-equipos',
          title: 'Listado de Documentos Mensuales de Equipos',
          sheetName: 'Documentos Mensuales',
        },
        formatters: {
          vehicle: (val) => String(val ?? ''),
          documentType: (val) => String(val ?? ''),
          contractor: (val) => String(val ?? ''),
          state: (val) => stateLabels[val as string] ?? String(val ?? ''),
          mandatory: (val) => (val === true || val === 'true' ? 'Sí' : val === false || val === 'false' ? 'No' : ''),
          multiresource: (val) =>
            val === true || val === 'true' ? 'Sí' : val === false || val === 'false' ? 'No' : '',
          period: (val) => String(val ?? '-'),
          created_at: (val) => (val ? moment(val as string).format('DD/MM/YYYY') : ''),
          deny_reason: (val) => String(val ?? '-'),
        },
      }}
    />
  );
}
