import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChecklistAnswersList } from '@/features/Checklists/ChecklistAnswers/ChecklistAnswersList';
import { ChecklistAnswersTableSkeleton } from '@/features/Checklists/ChecklistAnswers/fallback/ChecklistAnswersTableSkeleton';
import { fetchChecklistTemplateById } from '@/features/Checklists/actions/checklist-queries';
import { fetchCustomFormById, fetchFormsAnswersByFormId } from '@/features/Formularios/actions/form-actions';
import { ChecklistPDFButton } from '@/features/Checklists/components/ChecklistPDFButton';
import CheckListAnwersTable from '@/features/Formularios/components/forms/CheckListAnwersTable';
import { PDFPreviewDialog } from '@/features/Formularios/components/pdf-preview-dialog';
import { TransporteSPANAYCHKHYS01 } from '@/features/Formularios/pdf/generators/TransporteSPANAYCHKHYS01';
import { TransporteSPANAYCHKHYS03 } from '@/features/Formularios/pdf/generators/TransporteSPANAYCHKHYS03';
import { TransporteSPANAYCHKHYS04 } from '@/features/Formularios/pdf/generators/TransporteSPANAYCHKHYS04';
import { fetchCurrentCompany } from '@/shared/actions/company.actions';
import BackButton from '@/shared/components/common/BackButton';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import Link from 'next/link';
import { Suspense } from 'react';

const renderForm = (activeFormType: string, companyLogo?: string) => {
  switch (activeFormType) {
    case 'Transporte SP-ANAY - CHK - HYS - 01':
      return (
        <TransporteSPANAYCHKHYS01
          title="CHECK LIST MANTENIMIENTO VEHICULAR"
          description="Pdf vacio"
          companyLogo={companyLogo}
          preview
        />
      );
    case 'Transporte SP-ANAY - CHK - HYS - 03':
      return (
        <TransporteSPANAYCHKHYS03
          title="CHECK LIST INSPECCION VEHICULAR"
          description="Pdf vacio"
          companyLogo={companyLogo}
          preview
        />
      );
    case 'Transporte SP-ANAY - CHK - HYS - 04':
      return (
        <TransporteSPANAYCHKHYS04
          title="INSPERCION DIARIA DE VEHICULO"
          description="Pdf vacio"
          companyLogo={companyLogo}
          preview
        />
      );
    default:
      return <div>No hay formulario seleccionado</div>;
  }
};

export default async function FormDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams]);

  // Intentar obtener el checklist desde la nueva estructura normalizada
  const checklistTemplate = await fetchChecklistTemplateById(resolvedParams.id);

  // Si es un checklist normalizado → usar el nuevo DataTable
  if (checklistTemplate) {
    const formName = checklistTemplate.name;
    const formDescription = checklistTemplate.description || '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sections = (checklistTemplate.checklist_template_sections || []).map((section: any) => ({
      id: section.id,
      code: section.code,
      name: section.name,
      order_index: section.order_index,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      checklist_template_items: (section.checklist_template_items || []).map((item: any) => ({
        id: item.id,
        code: item.code,
        label: item.label,
        order_index: item.order_index,
        is_critical: item.is_critical || false,
        requires_side_validation: item.requires_side_validation || false,
        input_type: item.input_type || null,
      })),
    }));

    return (
      <Card className="px-6">
        <div className="flex gap-4 mb-6">
          <BackButton />
          <ChecklistPDFButton templateName={formName} templateCode={checklistTemplate.code} sections={sections} />
          <Link className={buttonVariants({ variant: 'default' })} href={`/dashboard/forms/${resolvedParams.id}/new`}>
            Nueva respuesta
          </Link>
        </div>

        <div className="mb-4">
          <h1 className="text-2xl font-bold">{formName}</h1>
          {formDescription && <p className="text-muted-foreground">{formDescription}</p>}
        </div>

        <Suspense fallback={<ChecklistAnswersTableSkeleton />}>
          <ChecklistAnswersList
            searchParams={resolvedSearchParams as DataTableSearchParams}
            templateId={resolvedParams.id}
          />
        </Suspense>
      </Card>
    );
  }

  // Si es un formulario de la estructura antigua
  const formInfo = await fetchCustomFormById(resolvedParams.id);

  if (!formInfo || formInfo.length === 0) {
    return (
      <div className="px-6">
        <div className="flex gap-4 mb-6">
          <BackButton />
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-red-600">No se encontró el formulario con ID: {resolvedParams.id}</p>
        </div>
      </div>
    );
  }

  const [answers, company] = await Promise.all([fetchFormsAnswersByFormId(resolvedParams.id), fetchCurrentCompany()]);
  const companyLogo = company?.[0]?.company_logo ?? undefined;
  const formName = formInfo[0].name;
  const formDescription = (answers[0]?.form_id?.form as { description?: string } | undefined)?.description ?? '';

  return (
    <div className="px-6">
      <div className="flex gap-4 mb-6">
        <BackButton />
        <PDFPreviewDialog buttonText="Imprimir vacío" title={formName} description="Vista previa del formulario vacío">
          <div className="h-full w-full bg-white">{renderForm(formName, companyLogo)}</div>
        </PDFPreviewDialog>
        <Link className={buttonVariants({ variant: 'default' })} href={`/dashboard/forms/${resolvedParams.id}/new`}>
          Nueva respuesta
        </Link>
      </div>

      <div className="mb-4">
        <h1 className="text-2xl font-bold">{formName}</h1>
        {formDescription && <p className="text-muted-foreground">{formDescription}</p>}
      </div>

      <CheckListAnwersTable answers={answers} />
    </div>
  );
}
