import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader } from '@/components/ui/card';
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerTrigger } from '@/components/ui/drawer';
import type { CustomFormWithAnswerCount } from '@/features/Formularios/actions/form-actions';
import { FormUseChart, type FormUseChartConfig, type FormUseChartDatum } from './FormUseChart';
import { SubmitCustomForm } from './SubmitCustomForm';

function FormCard({
  form,
  chartConfig,
  chartData,
  fetchAnswers,
}: {
  form: CustomFormWithAnswerCount;
  chartConfig: FormUseChartConfig;
  chartData: FormUseChartDatum[];
  fetchAnswers?: () => Promise<void>;
}) {
  const sectionsCount = (Array.isArray(form?.form) ? form.form.length : 1) - 1;
  // Encuentra el índice del formulario actual en el chartData

  return (
    <Card className="max-w-xs" x-chunk="charts-01-chunk-3">
      <CardHeader className="p-4 pb-0">
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline">Completar formulario</Button>
          </DrawerTrigger>
          <DrawerContent>
            <div className="mx-auto w-full p-8 px-12 max-h-[95vh] overflow-y-auto">
              <Card className="p-12">
                <SubmitCustomForm fetchAnswers={fetchAnswers} campos={[form]} />
              </Card>
              <DrawerFooter>
                <DrawerClose className="hidden" asChild>
                  <Button id="close-drawer" variant="outline">
                    Cancelar
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
        <CardDescription className="text-center">
          {sectionsCount} {sectionsCount > 1 ? 'secciones' : 'sección'}
        </CardDescription>
      </CardHeader>
      <FormUseChart chartConfig={chartConfig} formName={form?.name} chartData={chartData} />
    </Card>
  );
}

export default FormCard;
