'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  fetchFormsAnswersByFormId,
  type CustomFormWithAnswerCount,
} from '@/features/Formularios/actions/form-actions';
import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import FormCard from './FormCard';

/** Categoría a la que aplica un formulario personalizado. */
type FormCategory = 'employees' | 'equipment' | 'company' | 'documents';

type GroupedForms = Record<FormCategory, CustomFormWithAnswerCount[]>;

/** Sección de un `custom_form.form` (JSON legacy). La primera (`id === '1'`) es la cabecera. */
type FormSection = {
  id: string;
  tipo?: string;
  title?: string;
  value?: string;
  apply?: FormCategory;
};

type ChartConfig = Record<string, { label: string; color: string }>;
type ChartDatum = { month: string; respuestas: number; fill: string };

function getFormSections(form: CustomFormWithAnswerCount): FormSection[] {
  return Array.isArray(form.form) ? (form.form as unknown as FormSection[]) : [];
}

function getFormHeader(form: CustomFormWithAnswerCount): FormSection | undefined {
  return getFormSections(form).find((section) => section.id === '1');
}

const generateChartConfig = (forms: CustomFormWithAnswerCount[]): ChartConfig => {
  const config: ChartConfig = {};
  forms.forEach((form, index) => {
    const key = form.name ? form.name.replace(/_/g, ' ') : `item_${index}`;
    config[key] = {
      label: form.name?.replace(/_/g, ' ') || `Item ${index + 1}`,
      color: 'var(--chart-5)',
    };
  });
  return config;
};

const generateChartData = (chartConfig: ChartConfig, forms: CustomFormWithAnswerCount[]): ChartDatum[] => {
  // Últimos 6 meses en español
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthName = d.toLocaleString('es', { month: 'long' });
    months.push(monthName.charAt(0).toUpperCase() + monthName.slice(1));
  }

  return months.map((month) => {
    const form = forms.find((f) => f.name === month);
    const item = chartConfig[month.replace(/_/g, ' ')] ?? { color: 'defaultColor', label: month };
    return {
      month,
      respuestas: form ? (form.answersCount === 0 ? 1 : form.answersCount) : 10,
      fill: item.color,
    };
  });
};

const CATEGORY_TABS: Array<{ key: FormCategory; label: string }> = [
  { key: 'employees', label: 'Empleados' },
  { key: 'equipment', label: 'Vehículos' },
  { key: 'company', label: 'Empresa' },
  { key: 'documents', label: 'Documentos' },
];

function FormCardContainer({
  form,
  employees,
  documents,
  equipment,
  company,
}: {
  form: CustomFormWithAnswerCount[];
  employees?: boolean;
  documents?: boolean;
  equipment?: boolean;
  company?: boolean;
  showAnswers?: boolean;
}) {
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  const formId = params.get('form_id');
  const pathname = usePathname();
  const { replace } = useRouter();

  const groupedForms = form.reduce<GroupedForms>(
    (acc, current) => {
      const apply = getFormHeader(current)?.apply;
      if (apply && acc[apply]) acc[apply].push(current);
      return acc;
    },
    { employees: [], equipment: [], company: [], documents: [] }
  );

  const enabledTabs: Record<FormCategory, boolean | undefined> = { employees, equipment, company, documents };
  const defaultValue = CATEGORY_TABS.find((tab) => enabledTabs[tab.key])?.key ?? '';

  const handleAnswersChange = () => {
    params.delete('form_id');
    replace(`${pathname}?${params.toString()}`);
  };

  const { data: answers } = useQuery({
    queryKey: ['custom-form-answers', formId],
    queryFn: () => fetchFormsAnswersByFormId(formId ?? ''),
    enabled: Boolean(formId),
  });

  // `form_answers.answer` guarda el JSON como texto (lo escribe `SubmitCustomForm`).
  const parseAnswer = (value: unknown): Record<string, unknown> => {
    if (typeof value !== 'string') return (value as Record<string, unknown>) ?? {};
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  };

  const formKeys = Object.keys(parseAnswer(answers?.[0]?.answer));
  const answersTitle = answers?.[0]?.form_id
    ? ((answers[0].form_id.form as unknown as FormSection[] | null)?.find((section) => section.id === '1')?.value ??
      answers[0].form_id.name)
    : '';

  return (
    <>
      {formId ? (
        <Card className="p-4 flex flex-col">
          <Button className="self-end" type="button" onClick={handleAnswersChange}>
            Volver
          </Button>
          <CardTitle className="text-xl mb-3">{answersTitle}</CardTitle>
          <Table>
            <TableCaption>Lista de respuestas del formulario</TableCaption>
            <TableHeader>
              <TableRow>
                {formKeys.map((key) => (
                  <TableCell key={key}>{key.replaceAll('_', ' ')}</TableCell>
                ))}
                <TableCell>Imprimir</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {answers?.map((answerRow) => {
                const parsed = parseAnswer(answerRow.answer);
                return (
                  <TableRow key={answerRow.id}>
                    {formKeys.map((key) => {
                      const value = parsed[key];
                      // Comprobar si el valor parece una fecha ISO
                      const isDate =
                        typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value);
                      const formattedValue = isDate ? new Date(value as string).toLocaleDateString() : value;
                      return (
                        <TableCell key={key}>
                          {Array.isArray(formattedValue) ? (
                            <div className="gap-2 flex flex-col">
                              {formattedValue.map((item, itemIndex) => (
                                <Badge key={itemIndex}>{String(item)}</Badge>
                              ))}
                            </div>
                          ) : (
                            (formattedValue as string | number | null | undefined)
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <Button type="button">Imprimir</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Tabs defaultValue={defaultValue}>
          <TabsList className="mb-3">
            {CATEGORY_TABS.filter((tab) => enabledTabs[tab.key]).map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {CATEGORY_TABS.map((tab) => {
            const categoryForms = groupedForms[tab.key];
            const chartConfig = generateChartConfig(categoryForms);
            const chartData = generateChartData(chartConfig, categoryForms);
            return (
              <TabsContent key={tab.key} value={tab.key}>
                <section>
                  <div className="flex gap-4 flex-wrap">
                    {categoryForms.map((categoryForm) => (
                      <FormCard
                        chartConfig={chartConfig}
                        chartData={chartData}
                        key={categoryForm.id}
                        form={categoryForm}
                      />
                    ))}
                  </div>
                </section>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </>
  );
}
export default FormCardContainer;
