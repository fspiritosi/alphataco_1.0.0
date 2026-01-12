'use client';

import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import moment from 'moment';
import { UseFormReturn } from 'react-hook-form';

type ChecklistTemplate = Awaited<ReturnType<typeof import('@/app/server/GET/actions').fetchChecklistTemplateById>>;
type ChecklistTemplateSection = NonNullable<ChecklistTemplate>['checklist_template_sections'][number];
type ChecklistTemplateItem = ChecklistTemplateSection['checklist_template_items'][number];

type DevAutoFillButtonProps = {
  form: UseFormReturn<any>;
  template: NonNullable<ChecklistTemplate>;
};

/**
 * Determina si un item debe tratarse como "doble lado" (izquierda/derecha).
 */
const isSideValidationItem = (item: ChecklistTemplateItem): boolean => {
  return item.input_type !== 'date' && (item.input_type === 'double_side' || Boolean(item.requires_side_validation));
};

/**
 * Obtiene el valor positivo por defecto para un campo select
 */
const getPositiveValue = (item: ChecklistTemplateItem): string => {
  // Si tiene opciones personalizadas, buscar 'B' o la primera opción
  if (item.input_type === 'select' && item.options) {
    try {
      const options = Array.isArray(item.options) ? item.options : JSON.parse(item.options as string);
      // Buscar 'B' primero
      if (options.includes('B')) return 'B';
      // Si no hay 'B', buscar otras opciones positivas comunes
      const positiveOptions = ['Bueno', 'OK', 'Correcto', 'Normal', '1', 'true'];
      for (const positive of positiveOptions) {
        if (options.includes(positive)) return positive;
      }
      // Si no hay ninguna opción positiva conocida, usar la primera
      return options[0] || 'B';
    } catch (e) {
      console.error('Error parsing options:', e);
    }
  }
  // Por defecto, usar 'B' (Bueno)
  return 'B';
};

/**
 * Componente de desarrollo para autocompletar el checklist con valores positivos
 * Solo se muestra si NEXT_PUBLIC_SHOW_LOGS === 'true'
 *
 * Este componente está integrado en NormalizedChecklistForm y está disponible en:
 * - /dashboard/forms/[id]/new
 * - /maintenance/equipment/[id]/checklists/[checklistId]
 *
 * Para activarlo, configurar NEXT_PUBLIC_SHOW_LOGS=true en .env.local
 */
export function DevAutoFillButton({ form, template }: DevAutoFillButtonProps) {
  // Solo mostrar si la variable de entorno está activada
  if (process.env.NEXT_PUBLIC_SHOW_LOGS !== 'true') {
    return null;
  }

  const handleAutoFill = () => {
    const today = moment().format('YYYY-MM-DD');
    const now = moment().format('HH:mm');
    const valuesToSet: Record<string, any> = {
      fecha: today,
      hora: now,
    };

    // Iterar sobre todas las secciones e items
    template.checklist_template_sections?.forEach((section) => {
      const sectionCode = section.code || section.section?.code || `section_${section.id}`;

      section.checklist_template_items?.forEach((item) => {
        const itemCode = item.code || `item_${item.id}`;
        const fieldName = `${sectionCode}__${itemCode}`;

        if (item.input_type === 'date') {
          // Setear fecha de hoy para campos de fecha
          valuesToSet[fieldName] = today;
        } else if (isSideValidationItem(item)) {
          // Para campos double_side, setear ambos lados
          const positiveValue = getPositiveValue(item);
          valuesToSet[`${fieldName}_left`] = positiveValue;
          valuesToSet[`${fieldName}_right`] = positiveValue;
        } else if (item.input_type === 'select') {
          // Para campos select, setear valor positivo
          valuesToSet[fieldName] = getPositiveValue(item);
        }
        // Para campos text y number, no hacemos nada (se mantienen vacíos o con valores por defecto)
      });
    });

    // Aplicar todos los valores al formulario
    Object.entries(valuesToSet).forEach(([fieldName, value]) => {
      form.setValue(fieldName, value, { shouldValidate: false, shouldDirty: true });
    });

    console.log('[DEV_AUTOFILL] Valores seteados:', valuesToSet);
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleAutoFill}
      className="fixed bottom-4 right-4 z-50 bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600"
      title="Autocompletar checklist con valores positivos (solo desarrollo)"
    >
      <Zap className="h-4 w-4 mr-2" />
      Autocompletar Checklist
    </Button>
  );
}
