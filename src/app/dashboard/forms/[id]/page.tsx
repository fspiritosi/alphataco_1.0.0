import { fetchCustomFormById, fetchFormsAnswersByFormId } from '@/app/server/GET/actions';
import BackButton from '@/components/BackButton';
import { PDFPreviewDialog } from '@/components/pdf-preview-dialog';
import { TransporteSPANAYCHKHYS01 } from '@/components/pdf/generators/TransporteSPANAYCHKHYS01';
import { TransporteSPANAYCHKHYS03 } from '@/components/pdf/generators/TransporteSPANAYCHKHYS03';
import { TransporteSPANAYCHKHYS04 } from '@/components/pdf/generators/TransporteSPANAYCHKHYS04';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import CheckListAnwersTable from '../components/CheckListAnwersTable';

const renderForm = (activeFormType: string) => {
  switch (activeFormType) {
    case 'Transporte SP-ANAY - CHK - HYS - 01':
      return <TransporteSPANAYCHKHYS01 title="CHECK LIST MANTENIMIENTO VEHICULAR" description="Pdf vacio" preview />;
    case 'Transporte SP-ANAY - CHK - HYS - 03':
      return <TransporteSPANAYCHKHYS03 title="CHECK LIST INSPECCION VEHICULAR" description="Pdf vacio" preview />;
    case 'Transporte SP-ANAY - CHK - HYS - 04':
      return <TransporteSPANAYCHKHYS04 title="INSPERCION DIARIA DE VEHICULO" description="Pdf vacio" preview />;
    default:
      return <div>No hay formulario seleccionado</div>;
  }
};

export default async function FormDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // En Next.js 15+, params es una Promise, necesitamos hacer await
  const resolvedParams = await params;
  const answers = await fetchFormsAnswersByFormId(resolvedParams.id);
  const formInfo = await fetchCustomFormById(resolvedParams.id);
  const formName = formInfo[0].name;
  const formDescription = (answers[0]?.form_id?.form as any)?.description ?? '';

  return (
    <div className="px-6">
      <div className="flex gap-4 mb-6">
        <BackButton />
        <PDFPreviewDialog buttonText="Imprimir vacío" title={formName} description="Vista previa del formulario vacío">
          <div className="h-full w-full bg-white">{renderForm(formName)}</div>
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
