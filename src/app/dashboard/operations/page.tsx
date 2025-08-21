import Viewcomponent from '@/components/ViewComponent';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { getCompanyName } from '@/features/Empresa/General/actions/actions';
import DailyReportTable from '@/features/Operaciones/PartesDiarios/DailyReportTable';
import { getDailyReportsForCurrentMonth } from '@/features/Operaciones/PartesDiarios/actions/actions';
import DayliReportForm from '@/features/Operaciones/PartesDiarios/components/DayliReportForm';
import { PreparteDetailTableWrapper } from '@/features/Operaciones/Preparte/components/PreparteDetailTableTable';
import { cookies } from 'next/headers';
export async function generateMetadata() {
  const cookiesStore = cookies();
  const companyName = cookiesStore.get('actualCompName')?.value;
  if (companyName) {
    return {
      title: `Operaciones | ${companyName}`,
      description: `Página de peraciones de ${companyName} con información general, comercial, HR y equipos`,
    };
  } else {
    const companyName = await getCompanyName();
    if (companyName) {
      return {
        title: `Operaciones | ${companyName.company_name}`,
        description: `Página de peraciones de ${companyName.company_name} con información general, comercial, HR y equipos`,
      };
    }
  }
}

async function OperationsPage() {
  const mockdailyReports = {
    company_id: 'company_123',
    created_at: '2025-08-20T22:56:01-03:00',
    creation_date: '2025-08-20',
    date: '2025-08-20',
    id: 'dr_123',
    is_active: true,
    status: 'abierto',
    updated_at: '2025-08-20T22:56:01-03:00',
    dailyreportrows: [
      {
        id: 'drr_123',
        status: 'pendiente',
        areas_service_id: 'area_123',
        cancel_reason: null,
        created_at: '2025-08-20T10:00:00-03:00',
        customer_id: 'customer_123',
        daily_report_id: 'dr_123',
        description: 'Mantenimiento preventivo',
        document_path: null,
        end_time: '2025-08-20T18:00:00-03:00',
        item_id: 'item_123',
        remit_number: 'REM-001',
        sector_service_id: 'sector_123',
        service_id: 'service_123',
        start_time: '2025-08-20T09:00:00-03:00',
        type_service: 'mensual',
        updated_at: '2025-08-20T10:00:00-03:00',
        working_day: 'diurno',
        dailyreport_customer_equipment_relations: [
          {
            customer_equipment_id: 'equip_123',
            daily_report_row_id: 'drr_123',
            id: 'dcer_123',
            equipos_clientes: {
              created_at: '2025-01-01T00:00:00-03:00',
              customer_id: 'customer_123',
              id: 'equip_123',
              name: 'Perforadora XYZ',
              type: 'Perforador',
            },
          },
        ],
        service_sectors: {
          id: 'sector_123',
          sector_id: 'sector_123',
          service_id: 'service_123',
          created_at: '2025-01-01T00:00:00-03:00',
          sectors: {
            id: 'sector_123',
            name: 'Sector Norte',
            descripcion_corta: 'Norte',
            created_at: '2025-01-01T00:00:00-03:00',
          },
        },
        service_areas: {
          area_id: 'area_123',
          id: 'sa_123',
          service_id: 'service_123',
          areas_cliente: {
            customer_id: 'customer_123',
            descripcion_corta: 'Área A',
            id: 'area_123',
            nombre: 'Área de Producción A',
          },
        },
        customer_services: {
          id: 'cs_123',
          service_name: 'Servicio de Mantenimiento',
        },
        service_items: {
          id: 'si_123',
          item_name: 'Cambio de aceite',
        },
        customers: {
          id: 'customer_123',
          name: 'Empresa Ejemplo S.A.',
        },
        dailyreportemployeerelations: [
          {
            employees: {
              id: 'emp_123',
              firstname: 'Juan',
              lastname: 'Pérez',
              document_number: '30123456',
              phone: '123456789',
              email: 'juan.perez@example.com',
              company_positions: {
                name: 'Técnico',
              },
              contractor_employee: [
                {
                  customers: {
                    name: 'Contratista Ejemplo S.A.',
                  },
                },
              ],
            },
          },
        ],
        dailyreportequipmentrelations: [
          {
            vehicles: {
              id: 'veh_123',
              intern_number: 'INT-001',
              domain: 'ABC123',
              brand_vehicles: {
                id: 1,
                name: 'Toyota',
                company_id: 'company_123',
                created_at: '2025-01-01T00:00:00-03:00',
                is_active: true,
              },
              model_vehicles: {
                id: 1,
                brand: 1,
                name: 'Hilux',
                created_at: '2025-01-01T00:00:00-03:00',
                is_active: true,
              },
              model: 1,
              year: '2023',
              sub_type: {
                name: '4x4',
              },
              type: {
                name: 'Camioneta',
              },
              contractor_equipment: [
                {
                  customers: {
                    name: 'Contratista Ejemplo S.A.',
                  },
                },
              ],
              condition: 'operativo',
            },
          },
        ],
      },
    ],
  };
  const cookiesStore = cookies();
  const dailyReportTableSavedColumns = cookiesStore.get('dailyReportTable')?.value;
  const dailyReportTableSavedFilter = cookiesStore.get('dailyReportTable-filters')?.value;
  const dailyReports = await getDailyReportsForCurrentMonth();
  const viewData = {
    defaultValue: 'dailyReportsTable',
    path: '/dashboard/operations',
    tabsValues: [
      {
        value: 'dailyReportsTable',
        name: 'Partes diarios',
        restricted: [''],
        content: {
          title: 'Ver partes diarios',
          description: 'Aquí encontrarás todos los partes diarios diarios',
          buttonActioRestricted: [''],
          // buttonAction: <Create />,
          component: (
            <div className="flex flex-col gap-4">
              {/* <Create /> */}
              {/* <ViewDailysReports /> */}
              <div className="flex gap-4">
                <ResizablePanelGroup className="min-h-[400px]" direction="horizontal">
                  <ResizablePanel defaultSize={25} className="p-4">
                    <DayliReportForm />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={75} className="p-4">
                    <DailyReportTable
                      savedVisibility={dailyReportTableSavedColumns ? JSON.parse(dailyReportTableSavedColumns) : {}}
                      savedFilter={dailyReportTableSavedFilter ? JSON.parse(dailyReportTableSavedFilter) : []}
                      dailyReports={dailyReports as any}
                    />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </div>
          ),
        },
      },
      {
        value: 'Preparte',
        name: 'Preparte',
        restricted: [''],
        content: {
          title: 'Ver la lista de prepartes',
          description: 'Aquí encontrarás todos los prepartes',
          buttonActioRestricted: [''],
          buttonAction: '',
          component: (
            <div className="flex w-full gap-4">
              {/* <Create /> */}
              {/* <ViewDailysReports /> */}
              <div className="flex gap-4">
                {/* <ResizablePanelGroup className="min-h-[400px]" direction="horizontal"> */}
                {/* <ResizablePanel defaultSize={25} className="p-4">
                      <DayliReportForm />
                    </ResizablePanel> */}
                {/* <ResizableHandle withHandle /> */}
                {/* <ResizablePanel defaultSize={75} className="p-4"> */}
                <PreparteDetailTableWrapper dailyReport={mockdailyReports as any} />

                {/* </ResizablePanel>
                  </ResizablePanelGroup> */}
              </div>
            </div>
          ),
        },
      },

      // {
      //   value: 'dailyReportsDetailTable',
      //   name: 'Detalle de Partes diarios',
      //   restricted: [''],
      //   content: {
      //     title: 'Ver detalle de partes diarios',
      //     description: 'Aquí encontrarás todos los detalles de los partes diarios',
      //     buttonActioRestricted: [''],
      //     buttonAction: '',
      //     component: <DailyReportDetail />,
      //   },
      // },
      // {
      //   value: 'dailyReports',
      //   name: 'Crear parte diario',
      //   restricted: [''],
      //   content: {
      //     title: 'Crear parte diario',
      //     description: 'Aquí se crean los partes diarios',
      //     buttonActioRestricted: [''],
      //     buttonAction: (''),
      //     component: <DailyReport />,
      //   },
      // },
    ],
  };

  return (
    <div className="h-full">
      <Viewcomponent viewData={viewData} />
    </div>
  );
}

export default OperationsPage;
