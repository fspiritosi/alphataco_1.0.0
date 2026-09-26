'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/features/Permissions/hooks/usePermissions';
import { Logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Briefcase, ExternalLink, FileText, Lock, Phone, User } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, type DefaultValues } from 'react-hook-form';
import { toast } from 'sonner';
import { ContactDataFields } from '@/features/Employees/shared/forms/ContactDataFields';
import { PersonalDataFields } from '@/features/Employees/shared/forms/PersonalDataFields';
import { CONTACT_DATA_FIELD_NAMES, PERSONAL_DATA_FIELD_NAMES } from '@/features/Employees/shared/schemas/person-data-schemas';
import {
  createPreEmployee,
  updatePreEmployee,
  type PreEmployeeDetailData,
} from '../actions/pre-employee-actions.server';
import {
  STATUS_LABELS,
  STATUS_VARIANTS,
  getAvailableTransitions,
  isEditableStatus,
  type PreEmployeeStatus,
} from '../lib/state-machine';
import {
  PRE_EMPLOYEE_WORK_DATA_FIELD_NAMES,
  preEmployeeFormSchema,
  type PreEmployeeFormData,
} from '../schemas/pre-employee-schema';
import { ApprovePreEmployeeSheet } from './ApprovePreEmployeeSheet';
import { PreEmployeeDocumentChecklist } from './PreEmployeeDocumentChecklist';
import { PreEmployeeTransitionButtons } from './PreEmployeeTransitionButtons';
import { RejectPreEmployeeDialog } from './RejectPreEmployeeDialog';
import { PreEmployeeWorkDataForm } from './forms/PreEmployeeWorkDataForm';

const logger = new Logger('PreLegajos/DetailClient');

function buildDefaultValues(preEmployee: PreEmployeeDetailData | null): DefaultValues<PreEmployeeFormData> {
  if (!preEmployee) return {};

  return {
    firstname: preEmployee.firstname,
    lastname: preEmployee.lastname,
    nationality: preEmployee.nationality ?? undefined,
    born_date: preEmployee.born_date ? moment(preEmployee.born_date).format('YYYY-MM-DD') : undefined,
    cuil: preEmployee.cuil,
    document_type: preEmployee.document_type ?? undefined,
    document_number: preEmployee.document_number,
    birthplace: preEmployee.birthplace,
    gender: preEmployee.gender ?? undefined,
    marital_status: preEmployee.marital_status ?? undefined,
    level_of_education: preEmployee.level_of_education ?? undefined,
    picture: preEmployee.picture ?? undefined,
    street: preEmployee.street,
    street_number: preEmployee.street_number,
    province: Number(preEmployee.province),
    city: preEmployee.city != null ? Number(preEmployee.city) : undefined,
    postal_code: preEmployee.postal_code ?? undefined,
    phone: preEmployee.phone,
    email: preEmployee.email ?? undefined,
    proposed_hierarchical_position: preEmployee.proposed_hierarchical_position ?? undefined,
    proposed_company_position: preEmployee.proposed_company_position ?? undefined,
  };
}

interface PreEmployeeDetailClientProps {
  preEmployee: PreEmployeeDetailData | null;
  mode: 'new' | 'view';
}

export function PreEmployeeDetailClient({ preEmployee, mode }: PreEmployeeDetailClientProps) {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveSheet, setShowApproveSheet] = useState(false);

  const isNew = mode === 'new';
  const status: PreEmployeeStatus = preEmployee?.status ?? 'en_proceso';

  const canCreate = hasPermission('seleccion', 'candidatos', 'create');
  const canUpdate = hasPermission('seleccion', 'candidatos', 'update');
  const canApprove = hasPermission('seleccion', 'candidatos', 'approve');

  // Los datos solo se editan mientras el candidato está en proceso o en pre ingreso
  const canEditData = isNew ? canCreate : canUpdate && isEditableStatus(status);

  const form = useForm<PreEmployeeFormData>({
    resolver: zodResolver(preEmployeeFormSchema),
    defaultValues: buildDefaultValues(preEmployee),
  });

  const formErrors = form.formState.errors;
  const tabErrors = {
    personalData: PERSONAL_DATA_FIELD_NAMES.some((fieldName) => fieldName in formErrors),
    contactData: CONTACT_DATA_FIELD_NAMES.some((fieldName) => fieldName in formErrors),
    workData: PRE_EMPLOYEE_WORK_DATA_FIELD_NAMES.some((fieldName) => fieldName in formErrors),
  };

  const onSubmit = async (values: PreEmployeeFormData) => {
    // El estado no admite edición: no hay botón de guardar, así que un submit acá solo puede
    // venir de un control ajeno al formulario (ej. la tab de documentos)
    if (!canEditData) return;

    try {
      if (isNew) {
        const created = await createPreEmployee(values);
        toast.success('Candidato creado');
        router.push(`/dashboard/recruitment/detail?action=view&pre_employee_id=${created.id}`);
        return;
      }

      if (!preEmployee) return;

      await updatePreEmployee(preEmployee.id, values);
      toast.success('Cambios guardados');
      router.refresh();
    } catch (error) {
      logger.error('Error al guardar el candidato', { data: { error } });
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el candidato');
    }
  };

  const availableTransitions = preEmployee
    ? getAvailableTransitions(status).filter((transition) =>
        hasPermission('seleccion', 'candidatos', transition.requiredPermissionAction)
      )
    : [];

  const hasAnyError = tabErrors.personalData || tabErrors.contactData || tabErrors.workData;

  const buildTabLabel = (icon: React.ReactNode, text: string, hasError: boolean) => (
    <div className={cn('flex items-center gap-2', hasError && 'text-destructive')}>
      {icon}
      <span className="hidden sm:inline">{text}</span>
      {hasError && <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-label="Errores en esta pestaña" />}
    </div>
  );

  return (
    <div className="w-full space-y-4">
      {/* Barra superior */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Volver</span>
        </Button>

        {preEmployee && (
          <div className="flex flex-wrap items-center gap-2">
            <PreEmployeeTransitionButtons
              preEmployeeId={preEmployee.id}
              transitions={availableTransitions}
              onReject={() => setShowRejectDialog(true)}
              onApprove={() => setShowApproveSheet(true)}
            />
          </div>
        )}
      </div>

      {/* Encabezado */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                Candidato {preEmployee ? `N° ${preEmployee.pre_file_number}` : 'nuevo'}
              </p>
              <h2 className="text-xl font-semibold">
                {preEmployee ? `${preEmployee.lastname} ${preEmployee.firstname}` : 'Nuevo candidato'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>

              {preEmployee?.employee_id && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/employee/action?action=view&employee_id=${preEmployee.employee_id}`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver legajo{preEmployee.employees?.file ? ` N° ${preEmployee.employees.file}` : ''}
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {status === 'rechazado' && preEmployee?.rejection_reason && (
            <Alert variant="destructive">
              <AlertTitle>Candidato rechazado</AlertTitle>
              <AlertDescription>
                {preEmployee.rejection_reason}
                {preEmployee.reviewed_at && (
                  <span className="block text-xs opacity-80">
                    {moment(preEmployee.reviewed_at).format('DD/MM/YYYY')}
                    {preEmployee.reviewed_by_profile?.fullname ? ` · ${preEmployee.reviewed_by_profile.fullname}` : ''}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Formulario */}
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Tabs defaultValue="personalData" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="personalData">
                    {buildTabLabel(<User className="h-4 w-4" />, 'Datos Personales', tabErrors.personalData)}
                  </TabsTrigger>
                  <TabsTrigger value="contactData">
                    {buildTabLabel(<Phone className="h-4 w-4" />, 'Datos de Contacto', tabErrors.contactData)}
                  </TabsTrigger>
                  <TabsTrigger value="workData">
                    {buildTabLabel(<Briefcase className="h-4 w-4" />, 'Datos Laborales', tabErrors.workData)}
                  </TabsTrigger>
                  <TabsTrigger value="documents" disabled={isNew}>
                    {buildTabLabel(
                      isNew ? <Lock className="h-4 w-4" /> : <FileText className="h-4 w-4" />,
                      'Documentos',
                      false
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* fieldset deshabilita todos los controles cuando el estado no admite edición */}
                <fieldset disabled={!canEditData} className="pt-4">
                  <TabsContent value="personalData" className="px-2 py-2">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="pre_file_number">N° de Candidato</Label>
                          {/* Lo asigna la base al crear (PL-0001 en adelante): nunca se edita a mano */}
                          <Input
                            id="pre_file_number"
                            readOnly
                            disabled
                            className="font-mono"
                            value={preEmployee?.pre_file_number ?? ''}
                            placeholder="Se asignará automáticamente al crear el candidato"
                          />
                        </div>
                      </div>

                      <PersonalDataFields />
                    </div>
                  </TabsContent>

                  <TabsContent value="contactData" className="px-2 py-2">
                    <ContactDataFields />
                  </TabsContent>

                  <TabsContent value="workData" className="px-2 py-2">
                    <PreEmployeeWorkDataForm />
                  </TabsContent>
                </fieldset>

                <TabsContent value="documents" className="px-2 py-4">
                  {preEmployee && (
                    <PreEmployeeDocumentChecklist
                      preEmployeeId={preEmployee.id}
                      readOnly={!canUpdate || !isEditableStatus(status)}
                    />
                  )}
                </TabsContent>
              </Tabs>

              {canEditData && (
                <div className="flex flex-col gap-3 pt-6">
                  {hasAnyError && (
                    <Badge className="h-6 w-fit hover:no-underline" variant="destructive">
                      Falta corregir algunos campos en{' '}
                      {[
                        tabErrors.personalData && 'Datos Personales',
                        tabErrors.contactData && 'Datos de Contacto',
                        tabErrors.workData && 'Datos Laborales',
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </Badge>
                  )}

                  <Button type="submit" className="w-fit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Guardando...' : isNew ? 'Crear candidato' : 'Guardar cambios'}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Acciones de gerencia */}
      {preEmployee && canApprove && (
        <>
          <RejectPreEmployeeDialog
            preEmployeeId={preEmployee.id}
            open={showRejectDialog}
            onOpenChange={setShowRejectDialog}
            onRejected={() => router.refresh()}
          />

          <ApprovePreEmployeeSheet
            preEmployeeId={preEmployee.id}
            proposedHierarchicalPosition={preEmployee.proposed_hierarchical_position}
            proposedCompanyPosition={preEmployee.proposed_company_position}
            open={showApproveSheet}
            onOpenChange={setShowApproveSheet}
            onApproved={(employeeId) => router.push(`/dashboard/employee/action?action=view&employee_id=${employeeId}`)}
          />
        </>
      )}
    </div>
  );
}
