import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createNestedFilterOptions } from '@/features/Employees/Empleados/components/tables/data/employees-table';
import { createFilterOptions } from '@/features/Employees/Empleados/components/utils/utils';
import { BaseDataTable } from '@/shared/components/data-table/base/data-table';
import { DataTableColumnHeader } from '@/shared/components/data-table/base/data-table-column-header';
import { ColumnDef } from '@tanstack/react-table';
import Cookies from 'js-cookie';
import { BadgeCheck, Briefcase, Building, ClipboardSignature, CreditCard, FileText, Mail, User } from 'lucide-react';
import moment from 'moment';
import { useState } from 'react';
import { ControllerRenderProps } from 'react-hook-form';
import { getActiveEmployeesForDailyReport } from '../actions/actions';

export function SearchEmployee({
  employees,
  field,
}: {
  employees: Awaited<ReturnType<typeof getActiveEmployeesForDailyReport>>;
  field: ControllerRenderProps<
    {
      customer: string;
      services: string;
      item: string;
      status: string;
      working_day: string;
      employees?: string[] | undefined;
      equipment?: string[] | undefined;
      equipos_cliente?: string[] | undefined;
      type_service?: 'mensual' | 'adicional' | 'adicional_permanente' | undefined;
      start_time?: string | undefined;
      end_time?: string | undefined;
      description?: string | undefined;
      document_path?: string | undefined;
      sector_service_id?: string | undefined;
      areas_service_id?: string | undefined;
      remit_number?: string | undefined;
      cancel_reason?: string | undefined;
      reprogram_date?: Date | undefined;
      reasigment_reason?: string | undefined;
    },
    'employees'
  >;
}) {
  const savedVisibility = Cookies.get(`employee-table-search-diagram`);
  const savedFilters = Cookies.get(`employee-table-search-diagram-filters`);

  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(field?.value || []);

  const handleSelectedEmployees = () => {
    // Obtener los valores actuales del field
    const currentSelected = field?.value || [];

    // Crear un nuevo array combinando los actuales y los nuevos seleccionados
    const updatedSelected = [...currentSelected, ...selectedEmployees];

    // Actualizar el field con la nueva selección
    field.onChange(updatedSelected);
    //Cerrar el modal
    document.getElementById('close-dialog')?.click();
  };

  const columns: ColumnDef<Awaited<ReturnType<typeof getActiveEmployeesForDailyReport>>[0]>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todo"
        />
      ),
      cell: ({ row }) => {
        // Verificar si la fila debe estar seleccionada basándose en field.value
        const isSelected = row.getIsSelected() || field?.value?.includes(row.original.id);

        return (
          <Checkbox
            checked={isSelected}
            disabled={field?.value?.includes(row.original.id)}
            defaultChecked={field?.value?.includes(row.original.id)}
            defaultValue={field?.value?.includes(row.original.id) ? 'checked' : 'unchecked'}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Seleccionar fila"
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'lastname',
      id: 'lastname',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre completo" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 w-[200px]">
          <User className="h-4 w-4 text-muted-foreground" />
          <div className="font-medium ">
            {row.original.lastname} {row.original.firstname}
          </div>
        </div>
      ),
      filterFn: (row, id, value) => {
        const fullName = `${row.original.lastname} ${row.original.firstname}`.toLowerCase();
        // Handle array of values for filtering
        return value.some((val: any) => fullName.includes(val.toLowerCase()));
      },
    },
    {
      accessorKey: 'email',
      id: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: 'picture',
      id: 'picture',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Foto" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.picture ? <img className="size-10 rounded-full" src={row.original.picture} alt="Foto" /> : '-'}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'nationality',
      id: 'nationality',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nacionalidad" />,
      cell: ({ row }) => {
        return <div>{row.original.nationality || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'born_date',
      id: 'born_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nacimiento" />,
      cell: ({ row }) => {
        return <div>{row.original.born_date ? moment(row.original.born_date).format('DD/MM/YYYY') : '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      //Cuil
      accessorKey: 'cuil',
      id: 'cuil',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cuil" />,
      cell: ({ row }) => {
        return <div>{row.original.cuil || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'document_type',
      id: 'document_type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Documento" />,
      cell: ({ row }) => {
        return <div>{row.original.document_type}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'document_number',
      id: 'document_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Documento" />,
      cell: ({ row }) => {
        return <div className="flex gap-2 items-center">{row.original.document_number}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },

    {
      accessorKey: 'gender',
      id: 'gender',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Genero" />,
      cell: ({ row }) => {
        return <div>{row.original.gender || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.original.gender));
      },
    },
    {
      accessorKey: 'marital_status',
      id: 'marital_status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado Civil" />,
      cell: ({ row }) => {
        return <div>{row.original.marital_status || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'level_of_education',
      id: 'level_of_education',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nivel de Educacion" />,
      cell: ({ row }) => {
        return <div>{row.original.level_of_education || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'empleado_aptitudes.aptitudes_tecnicas.nombre',
      id: 'empleado_aptitudes.aptitudes_tecnicas.nombre',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Aptitudes técnicas" />,
      cell: ({ row }) => {
        const aptitudesTecnicas = row.original.empleado_aptitudes || [];

        // Si no hay contratistas, mostramos "Sin afectar"
        if (aptitudesTecnicas.length === 0) {
          return '-';
        }

        // Get aptitudesTecnicas names
        const aptitudesTecnicasNames = aptitudesTecnicas.flatMap((aptitud) => {
          if (typeof aptitud === 'string') return aptitud;
          return aptitud?.aptitudes_tecnicas?.nombre || '';
        });

        const firstContractor = aptitudesTecnicasNames[0] || '—';

        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex">
                  <Badge>
                    {firstContractor}
                    {aptitudesTecnicasNames.length > 1 && ` +${aptitudesTecnicasNames.length - 1}`}
                  </Badge>
                </div>
              </TooltipTrigger>
              {aptitudesTecnicasNames.length > 1 && (
                <TooltipContent className="text-white bg-black rounded-lg p-2">
                  <div className="flex flex-col gap-1">
                    {aptitudesTecnicasNames.map((name, index) => (
                      <span key={index}>{name}</span>
                    ))}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      filterFn: (row, id, filterValue) => {
        // Si no hay filtro o el array está vacío, mostramos todas las filas
        if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) {
          return true;
        }

        const aptitudesTecnicas = row.original.empleado_aptitudes || [];

        // Si no hay contratistas, no mostramos la fila
        if (aptitudesTecnicas.length === 0) {
          return false;
        }

        // Comprobamos si algún contratista coincide con el filtro
        return aptitudesTecnicas.some((aptitud) => {
          const name = aptitud?.aptitudes_tecnicas?.nombre;
          return name && filterValue.flat().includes(name);
        });
      },
    },

    {
      accessorKey: 'street',
      id: 'street',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Calle" />,
      cell: ({ row }) => {
        return <div>{row.original.street || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'street_number',
      id: 'street_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Altura" />,
      cell: ({ row }) => {
        return <div>{row.original.street_number || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'provinces.name',
      id: 'provinces.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Provincia" />,
      cell: ({ row }) => {
        return <div>{row.original.provinces?.name || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },

    {
      accessorKey: 'city',
      id: 'city',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ciudad" />,
      cell: ({ row }) => {
        return <div>{row.original.cities?.name || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'postal_code',
      id: 'postal_code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="CP" />,
      cell: ({ row }) => {
        return <div>{row.original.postal_code || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'phone',
      id: 'phone',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Teléfono" />,
      cell: ({ row }) => {
        return <div>{row.original.phone || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'file',
      id: 'file',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Legajo" />,
      cell: ({ row }) => {
        return <div>{row.original.file || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'hierarchy.name',
      id: 'hierarchy.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sector" />,
      cell: ({ row }) => {
        return <div>{row.original.hierarchy?.name || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'company_positions.name',
      id: 'company_positions.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Puesto" />,
      cell: ({ row }) => {
        return <div>{row.original.company_positions?.name || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'work_diagram.name',
      id: 'work_diagram.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Diagrama" />,
      cell: ({ row }) => {
        return <div>{row.original.work_diagram?.name || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      //Horas normales
      accessorKey: 'normal_hours',
      id: 'normal_hours',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Horas" />,
      cell: ({ row }) => {
        return <div>{row.original.normal_hours || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      //Tipo de contrato
      accessorKey: 'type_of_contract',
      id: 'type_of_contract',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Contrato" />,
      cell: ({ row }) => {
        return <div>{row.original.type_of_contract || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'contractor_employee.customers.name',
      id: 'contractor_employee.customers.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Afectaciones" />,
      cell: ({ row }) => {
        const contractors = row.original.contractor_employee || [];

        // Si no hay contratistas, mostramos "Sin afectar"
        if (contractors.length === 0) {
          return <Badge>Sin afectar</Badge>;
        }

        // Define the contractor type
        // Get contractor names
        const contractorNames = contractors
          .map((contractor) => {
            if (typeof contractor === 'string') return contractor;
            return contractor?.customers?.name || '';
          })
          .filter((name): name is string => Boolean(name));

        const firstContractor = contractorNames[0] || '—';

        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex">
                  <Badge>
                    {firstContractor}
                    {contractorNames.length > 1 && ` +${contractorNames.length - 1}`}
                  </Badge>
                </div>
              </TooltipTrigger>
              {contractorNames.length > 1 && (
                <TooltipContent className="text-white bg-black rounded-lg p-2">
                  <div className="flex flex-col gap-1">
                    {contractorNames.map((name, index) => (
                      <span key={index}>{name}</span>
                    ))}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
      filterFn: (row, id, filterValue) => {
        // Si no hay filtro o el array está vacío, mostramos todas las filas
        if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) {
          return true;
        }

        const contractors = row.original.contractor_employee || [];

        // Si no hay contratistas, no mostramos la fila
        if (contractors.length === 0) {
          return false;
        }

        // Comprobamos si algún contratista coincide con el filtro
        return contractors.some((contractor) => {
          const name = contractor?.customers?.name;
          return name && filterValue.flat().includes(name);
        });
      },
    },
    {
      accessorKey: 'date_of_admission',
      id: 'date_of_admission',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de ingreso" />,
      cell: ({ row }) => {
        return (
          <div>
            {row.original.date_of_admission ? moment(row.original.date_of_admission).format('DD/MM/YYYY') : '-'}
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'cost_center.name',
      id: 'cost_center.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Centro de costo" />,
      cell: ({ row }) => {
        return <div>{row.original.cost_center?.name || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'affiliate_status',
      id: 'affiliate_status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado de afiliación" />,
      cell: ({ row }) => {
        return <div>{row.original.affiliate_status || '-'}</div>;
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'status',
      id: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>['variant']>;
        type StatusType = 'Completo' | 'Incompleto' | 'Completo con doc vencida' | 'default';

        const variantStatus: Record<StatusType, BadgeVariant> = {
          Completo: 'success',
          Incompleto: 'destructive',
          'Completo con doc vencida': 'yellow',
          default: 'default',
        };
        return (
          <Badge
            variant={row.original.status ? variantStatus[row.original.status as StatusType] || 'default' : 'default'}
            className="capitalize"
          >
            {row.original.status || 'Sin estado'}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
  ];

  const contractTypes = createFilterOptions(
    employees,
    (employee) => employee?.type_of_contract,
    ClipboardSignature // Icono de contrato/firma para tipos de contrato
  );

  const statuses = createFilterOptions(
    employees,
    (employee) => employee?.status,
    BadgeCheck // Icono de insignia para estados
  );

  const tiposDocumento = createFilterOptions(
    employees,
    (employee) => employee?.document_type,
    CreditCard // Icono de tarjeta para tipos de documento
  );

  const cuils = createFilterOptions(
    employees,
    (employee) => employee?.cuil,
    FileText // Icono de documento para números de CUIL
  );

  const nationality = createFilterOptions(
    employees,
    (employee) => employee?.nationality,
    FileText // Icono para nacionalidad
  );

  const gender = createFilterOptions(
    employees,
    (employee) => employee?.gender,
    FileText // Icono para género
  );
  const documenNumber = createFilterOptions(employees, (employee) => employee?.document_number);
  const maritalStatus = createFilterOptions(employees, (employee) => employee?.marital_status);
  const levelOfEducation = createFilterOptions(employees, (employee) => employee?.level_of_education);
  const street = createFilterOptions(employees, (employee) => employee?.street);
  const streetNumber = createFilterOptions(employees, (employee) => employee?.street_number);

  const city = createFilterOptions(employees, (employee) => employee?.cities?.name);
  const postalCode = createFilterOptions(employees, (employee) => employee?.postal_code);
  const phone = createFilterOptions(employees, (employee) => employee?.phone);
  const email = createFilterOptions(employees, (employee) => employee?.email);
  const legajo = createFilterOptions(employees, (employee) => employee?.file);
  const sector = createFilterOptions(employees, (employee) => employee?.hierarchy?.name);
  const puesto = createFilterOptions(employees, (employee) => employee?.company_positions?.name);
  const diagram = createFilterOptions(employees, (employee) => employee?.work_diagram?.name);
  const normalHours = createFilterOptions(employees, (employee) => employee?.normal_hours);
  const costCenter = createFilterOptions(employees, (employee) => employee?.cost_center?.name);
  const provinces = createFilterOptions(employees, (employee) => employee?.provinces?.name);
  const affiliateStatus = createFilterOptions(employees, (employee) => employee?.affiliate_status);
  const status = createFilterOptions(employees, (employee) => employee?.affiliate_status);
  const nombres = createFilterOptions(employees, (employee) => employee?.lastname + ' ' + employee?.firstname);
  // Generar todas las opciones de filtro utilizando las funciones utilitarias
  const positions = createFilterOptions(
    employees,
    (employee) => employee?.hierarchy?.name,
    Briefcase // Icono de maletín para cargos/posiciones
  );

  const afectacionesOpciones = createNestedFilterOptions(
    employees?.filter((employee) => employee?.contractor_employee?.length > 0),
    (employee) => employee?.contractor_employee.map((contractor) => contractor?.customers?.name).filter(Boolean) || [],
    Building // Icono de edificio para afectaciones/contratistas
  );
  const empleado_aptitudes = createNestedFilterOptions(
    employees?.filter((employee) => employee?.empleado_aptitudes?.length > 0),
    (employee) =>
      employee?.empleado_aptitudes.map((aptitude) => aptitude?.aptitudes_tecnicas?.nombre).filter(Boolean) || [],
    Building // Icono de edificio para afectaciones/contratistas
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant={'outline'}>
          <User className="mr-2 size-4 w-fit" />
          Seleccionar por caracteristica
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Seleccionar Empleados</DialogTitle>
          <DialogDescription>
            Seleccione los empleados que desea asignar al parte diario. Haga clic en guardar cuando haya terminado.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <BaseDataTable
            savedVisibility={savedVisibility ? JSON.parse(savedVisibility) : {}}
            columns={columns}
            data={employees}
            onRowSelectionChange={(rows) => {
              const selectedEmployeesId = rows.map((row) => row.id);
              setSelectedEmployees(selectedEmployeesId);
            }}
            tableId="employee-table-search-diagram"
            toolbarOptions={{
              showFilterOptions: true,
              showExport: false,
              initialVisibleFilters: savedFilters ? JSON.parse(savedFilters) : [],
              filterableColumns: [
                {
                  columnId: 'lastname',
                  title: 'Nombre',
                  options: nombres,
                },
                {
                  columnId: 'empleado_aptitudes.aptitudes_tecnicas.nombre',
                  title: 'Aptitudes Tenicas',
                  options: empleado_aptitudes,
                },
                {
                  columnId: 'nationality',
                  title: 'Nacionalidad',
                  options: nationality,
                },
                {
                  columnId: 'cuil',
                  title: 'Cuil',
                  options: cuils,
                },
                {
                  columnId: 'status',
                  title: 'Estado',
                  options: statuses,
                },
                {
                  columnId: 'document_type',
                  title: 'Tipo de Documento',
                  options: tiposDocumento,
                },
                // {
                //     columnId: 'Sector',
                //     title: 'Sector',
                //     options: positions,
                // },
                {
                  columnId: 'type_of_contract',
                  title: 'Tipo de Contrato',
                  options: contractTypes,
                },
                {
                  columnId: 'contractor_employee.customers.name',
                  title: 'Afectaciones',
                  options: afectacionesOpciones,
                },
                {
                  columnId: 'gender',
                  title: 'Genero',
                  options: gender,
                },
                {
                  columnId: 'document_number',
                  title: 'Documento',
                  options: documenNumber,
                },
                {
                  columnId: 'maritual_status',
                  title: 'Estado Civil',
                  options: maritalStatus,
                },
                {
                  columnId: 'level_of_education',

                  title: 'Nivel de Educacion',
                  options: levelOfEducation,
                },
                {
                  columnId: 'street',

                  title: 'Domicilio',
                  options: street,
                },
                {
                  columnId: 'street_number',
                  title: 'Altura',
                  options: streetNumber,
                },
                {
                  columnId: 'cities.name',

                  title: 'Ciudad',
                  options: city,
                },
                {
                  columnId: 'postal_code',
                  title: 'Codigo Postal',
                  options: postalCode,
                },
                {
                  columnId: 'phone',
                  title: 'Telefono',
                  options: phone,
                },
                {
                  columnId: 'email',
                  title: 'Email',
                  options: email,
                },
                {
                  columnId: 'file',
                  title: 'Legajo',
                  options: legajo,
                },
                // {
                //     columnId: 'Sector',
                //     title: 'Sector',
                //     options: sector,
                // },
                {
                  columnId: 'company_positions.name',
                  title: 'Puesto',
                  options: puesto,
                },
                {
                  columnId: 'work_diagram.name',
                  title: 'Diagrama',
                  options: diagram,
                },
                {
                  columnId: 'normal_hours',
                  title: 'Horas',
                  options: normalHours,
                },
                {
                  columnId: 'cost_center.name',
                  title: 'Centro de Costo',
                  options: costCenter,
                },
                {
                  columnId: 'status',
                  title: 'Estado',
                  options: status,
                },
                {
                  columnId: 'provinces.name',
                  title: 'Provincia',
                  options: provinces,
                },
                {
                  columnId: 'affiliate_status',
                  title: 'Estado de afiliado',
                  options: affiliateStatus,
                },
              ],
            }}
          />
        </div>
        <DialogFooter>
          <DialogClose id="close-dialog" asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleSelectedEmployees} type="button">
            Guardar Seleccion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
