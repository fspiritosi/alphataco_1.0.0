'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CreateChecklistAnswer } from '@/features/Checklist';
import { fetchSupervisorsForChecklist } from '@/features/Checklist/actions/actionsServer';
import { getCompatibleEquipmentForHitch, getEquipmentTypeInfo } from '@/features/Formularios/actions/checklist-actions';
import { getPendingDeviations } from '@/features/Mantenimiento/actions/maintenance-actions';
import { AdditionalDeviationModal } from '@/features/Mantenimiento/shared/components/AdditionalDeviationModal';
import { AllGoodDeviationPromptDialog } from '@/features/Mantenimiento/shared/components/AllGoodDeviationPromptDialog';
import type { PickableSection } from '@/features/Mantenimiento/shared/components/ChecklistItemPicker';
import { CriticalDeviationsRepairModal } from '@/features/Mantenimiento/shared/components/critical-deviations-repair-modal';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  ChevronsUpDown,
  HelpCircle,
  Link as LinkIcon,
  MessageSquarePlus,
  X,
} from 'lucide-react';
import moment from 'moment';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { DevAutoFillButton } from './DevAutoFillButton';
// Tipos basados en la estructura de la base de datos
type ChecklistTemplate = Awaited<
  ReturnType<typeof import('@/features/Formularios/actions/checklist-actions').fetchChecklistTemplateById>
>;

type ChecklistTemplateSection = NonNullable<ChecklistTemplate>['checklist_template_sections'][number];
type ChecklistTemplateItem = ChecklistTemplateSection['checklist_template_items'][number];

/**
 * Tercera opción de respuesta, para items que no corresponden a la unidad revisada
 * (ej. "Conector de ABS (para acoplado o semi)" en un vehículo liviano).
 *
 * Un item en este estado NO cuenta como falla: los cálculos de resultado, items
 * críticos fallados y desvíos comparan estrictamente contra 'M', por lo que este
 * valor queda excluido de todos ellos sin lógica adicional.
 *
 * Se agrega desde el código y no desde `checklist_template_items.options` para que
 * aplique a todas las plantillas, incluidas las que se creen en el futuro.
 */
const NOT_APPLICABLE_VALUE = 'NA';
const NOT_APPLICABLE_LABEL = 'No aplica';

/** Opciones de respuesta por defecto (items sin `options` propias en la plantilla) */
const DEFAULT_ANSWER_OPTIONS = ['B', 'M', NOT_APPLICABLE_VALUE];

/**
 * Plantillas que replican un formulario en papel con columna de OBSERVACIONES
 * por item. Se activa por código y no para todas las plantillas: los otros
 * checklists nunca tuvieron esa columna y agregarla les cambiaría la pantalla.
 *
 * Cuando haya una segunda plantilla que la necesite conviene mover esto a una
 * columna booleana en `checklist_templates`.
 */
const TEMPLATES_WITH_ITEM_OBSERVATIONS = new Set(['hidrogrua']);

/** Sufijo del campo de observación de un item dentro del formulario */
const OBS_SUFFIX = '__obs';

/** Clave de `answer_data` donde se guardan las observaciones por item */
const ITEM_OBSERVATIONS_KEY = 'item_observations';

/** Largo máximo de una observación por item */
const OBS_MAX_LENGTH = 500;

/**
 * Diagramas de nomenclatura de partes que acompañan a un formulario en papel.
 * Se muestran como ayuda de consulta, no como parte de la inspección: por eso
 * van en un diálogo y no intercalados entre los items.
 */
const TEMPLATE_PARTS_DIAGRAMS: Record<string, { src: string; title: string; alt: string }> = {
  hidrogrua: {
    src: '/diagramas/hidrogrua-partes.png',
    title: 'Nomenclatura de partes de la hidrogrúa',
    alt:
      'Vista lateral de una hidrogrúa montada sobre chasis con sus catorce partes numeradas: ' +
      '1 estructura, 2 columna, 3 brazo primario, 4 brazo secundario, 5 a 8 primera a cuarta ' +
      'prolongación, 9 barra de estabilización, 10 cremallera de rotación, 11 cilindro ' +
      'estabilizador, 12 cilindro de elevación, 13 cilindro de articulación, 14 cilindro de extensión.',
  },
};

/** Agrega "No aplica" a las opciones de un item sin duplicarla si ya viniera de la BD */
const withNotApplicable = (options: string[]): string[] =>
  options.includes(NOT_APPLICABLE_VALUE) ? options : [...options, NOT_APPLICABLE_VALUE];

/**
 * Determina si un item debe tratarse como "doble lado" (izquierda/derecha).
 * Importante: un `input_type === 'date'` NUNCA debe mapearse como double_side,
 * aunque por error venga con `requires_side_validation = true` desde la BD.
 */
const isSideValidationItem = (item: ChecklistTemplateItem): boolean => {
  return item.input_type !== 'date' && (item.input_type === 'double_side' || Boolean(item.requires_side_validation));
};

type Equipment = {
  label: string;
  value: string;
  domain: string | null;
  serie: string | null;
  kilometer: string;
  engine_hours: string;
  model: string | null;
  brand: string | null;
  intern_number: string;
  sub_type_id: string | null;
  type_id?: string | null;
  type_name?: string | null;
  sub_type_name?: string | null;
};

type Customer = {
  id: string;
  name: string;
};

type Employee = {
  id: string;
  fullName: string;
  document?: string | null;
  file_number?: string | null;
};

type NormalizedChecklistFormProps = {
  shouldDisabledInputs?: boolean;
  template: NonNullable<ChecklistTemplate>;
  equipments: Equipment[];
  customers?: Customer[];
  employees?: Employee[];
  currentUser:
    | Awaited<ReturnType<typeof import('@/features/Formularios/actions/checklist-actions').getCurrentProfile>>[number]
    | null;
  defaultEquipmentId?: string;
  defaultAnswers?: any;
  readOnly?: boolean; // Modo solo lectura
  defaultEmployeeId?: string;
  defaultEmployeeName?: string;
  defaultKilometer?: string;
  defaultHitchEquipmentId?: string | null; // ID del enganche cuando está en modo view
  defaultCustomerId?: string | null; // ID del cliente cuando está en modo view
  defaultHorometro?: string;
};

/**
 * Genera el schema de Zod dinámicamente basado en la estructura del checklist
 */
const generateChecklistSchema = (template: NonNullable<ChecklistTemplate>) => {
  const schema: Record<string, z.ZodTypeAny> = {
    equipment_id: z.string().min(1, 'Debe seleccionar un equipo'),
    customer_id: z.string().optional(), // Cliente opcional
    // ⚠️ CRÍTICO: 'chofer_employee_id' se guarda como columna FK directa en checklist_answers.
    // Los nombres de los campos JSONB ('chofer', 'customer_id', 'kilometraje', 'horometro')
    // son capturados por columnas GENERATED en la BD. No renombrar sin actualizar la migración.
    chofer_employee_id: z.string().uuid().optional().nullable(),
    chofer: z.string().min(1, 'Debe ingresar el nombre del chofer'),
    fecha: z.string().min(1, 'Debe ingresar la fecha'),
    hora: z.string().min(1, 'Debe ingresar la hora'),
    kilometraje: z.string().optional(),
    horometro: z.string().optional(),
    observaciones: z.string().optional(),
  };

  // Iterar sobre las secciones
  template.checklist_template_sections?.forEach((section) => {
    const sectionCode = section.code || section.section?.code || `section_${section.id}`;

    // Iterar sobre los items de la sección
    section.checklist_template_items?.forEach((item) => {
      const itemCode = item.code || `item_${item.id}`;
      // IMPORTANTE:
      // React Hook Form interpreta los puntos en `name` como rutas anidadas (ej: "a.b" => { a: { b: ... } }).
      // Nuestro schema de Zod valida por claves literales, no por rutas. Para evitar desalineación, usamos nombres planos.
      const fieldName = `${sectionCode}__${itemCode}`;

      if (item.input_type === 'date') {
        // Campo de fecha con validación de certificación
        if (item.requires_certification) {
          schema[fieldName] = z
            .string({ required_error: `${item.label || 'Este campo'} es requerido` })
            .min(1, `${item.label || 'Este campo'} es requerido`)
            .refine(
              (date) => {
                const dateMoment = moment(date, 'YYYY-MM-DD', true);
                // IMPORTANTE: por ahora aceptamos fechas pasadas y futuras.
                // Más adelante se puede analizar si la fecha está vencida y disparar acciones.
                return dateMoment.isValid();
              },
              {
                message: 'La fecha de certificación no tiene un formato válido',
              }
            );
        } else {
          schema[fieldName] = z
            .string({ required_error: `${item.label || 'Este campo'} es requerido` })
            .min(1, `${item.label || 'Este campo'} es requerido`);
        }
      } else if (isSideValidationItem(item)) {
        // Item doble (izquierda/derecha)
        const leftFieldName = `${fieldName}_left`;
        const rightFieldName = `${fieldName}_right`;
        // Siguiendo el patrón recomendado (shadcn + RHF): valor string "" como no-seleccionado.
        // Validamos "requerido" con min(1) y además restringimos a valores válidos.
        schema[leftFieldName] = z
          .string({ required_error: `${item.label || 'Este campo'} (izquierda) es requerido` })
          .min(1, `${item.label || 'Este campo'} (izquierda) es requerido`)
          .refine((val) => DEFAULT_ANSWER_OPTIONS.includes(val), {
            message: `${item.label || 'Este campo'} (izquierda) debe ser "Bueno", "Malo" o "${NOT_APPLICABLE_LABEL}"`,
          });
        schema[rightFieldName] = z
          .string({ required_error: `${item.label || 'Este campo'} (derecha) es requerido` })
          .min(1, `${item.label || 'Este campo'} (derecha) es requerido`)
          .refine((val) => DEFAULT_ANSWER_OPTIONS.includes(val), {
            message: `${item.label || 'Este campo'} (derecha) debe ser "Bueno", "Malo" o "${NOT_APPLICABLE_LABEL}"`,
          });
      } else if (item.input_type === 'select' && item.options) {
        // Campo select con opciones
        const options = Array.isArray(item.options) ? item.options : JSON.parse(item.options as string);
        if (options.length > 0 && typeof options[0] === 'string') {
          // "No aplica" es válido aunque la plantilla en BD solo declare ["B","M"]
          const validOptions = withNotApplicable(options as string[]);
          schema[fieldName] = z
            .string({ required_error: `${item.label || 'Este campo'} es requerido` })
            .min(1, `${item.label || 'Este campo'} es requerido`)
            .refine((val) => validOptions.includes(val), {
              message: `${item.label || 'Este campo'} debe ser una opción válida`,
            });
        } else {
          schema[fieldName] = z
            .string({ required_error: `${item.label || 'Este campo'} es requerido` })
            .min(1, `${item.label || 'Este campo'} es requerido`);
        }
      } else if (item.input_type === 'text') {
        schema[fieldName] = z
          .string({ required_error: `${item.label || 'Este campo'} es requerido` })
          .min(1, `${item.label || 'Este campo'} es requerido`);
      } else if (item.input_type === 'number') {
        schema[fieldName] = z
          .string({ required_error: `${item.label || 'Este campo'} es requerido` })
          .min(1, `${item.label || 'Este campo'} es requerido`)
          .refine((val) => !isNaN(Number(val)), {
            message: 'Debe ser un número válido',
          });
      } else {
        // Por defecto, campo select con opciones B / M / No aplica
        schema[fieldName] = z
          .string({ required_error: `${item.label || 'Este campo'} es requerido` })
          .min(1, `${item.label || 'Este campo'} es requerido`)
          .refine((val) => DEFAULT_ANSWER_OPTIONS.includes(val), {
            message: `${item.label || 'Este campo'} debe ser "Bueno", "Malo" o "${NOT_APPLICABLE_LABEL}"`,
          });
      }

      // Observación libre del item (columna OBSERVACIONES del formulario en papel).
      // Se declara siempre porque es opcional: las plantillas que no la muestran
      // simplemente nunca la completan.
      schema[`${fieldName}${OBS_SUFFIX}`] = z
        .string()
        .max(OBS_MAX_LENGTH, `La observación no puede superar los ${OBS_MAX_LENGTH} caracteres`)
        .optional();
    });
  });

  return z.object(schema);
};

/**
 * Genera los valores por defecto del formulario
 */
type DefaultAnswerSectionValue = Record<string, unknown>;
type DefaultAnswers = {
  equipment_id?: string;
  customer_id?: string;
  chofer?: string;
  fecha?: string;
  hora?: string;
  kilometraje?: string;
  horometro?: string;
  observaciones?: string;
  [sectionCode: string]: DefaultAnswerSectionValue | string | undefined;
};

const generateDefaultValues = (
  template: NonNullable<ChecklistTemplate>,
  defaultAnswers?: DefaultAnswers,
  defaultEquipmentId?: string,
  defaultEmployeeName?: string,
  defaultKilometer?: string,
  defaultCustomerId?: string | null,
  defaultHorometro?: string
) => {
  const defaults: Record<string, string> = {
    equipment_id: defaultEquipmentId || '',
    customer_id: defaultCustomerId || '',
    chofer: defaultEmployeeName || '',
    fecha: moment().format('YYYY-MM-DD'),
    hora: moment().format('HH:mm'),
    kilometraje: defaultKilometer || '',
    horometro: defaultHorometro || '',
    observaciones: '',
  };

  // Si hay respuestas por defecto, cargarlas
  if (defaultAnswers) {
    if (defaultAnswers.equipment_id) defaults.equipment_id = defaultAnswers.equipment_id;
    if (defaultAnswers.customer_id) defaults.customer_id = defaultAnswers.customer_id;
    if (defaultAnswers.chofer) defaults.chofer = defaultAnswers.chofer;
    if (defaultAnswers.fecha) defaults.fecha = defaultAnswers.fecha;
    if (defaultAnswers.hora) defaults.hora = defaultAnswers.hora;
    if (defaultAnswers.kilometraje) defaults.kilometraje = defaultAnswers.kilometraje;
    if (defaultAnswers.horometro) defaults.horometro = defaultAnswers.horometro;
    if (defaultAnswers.observaciones) defaults.observaciones = defaultAnswers.observaciones;

    // Observaciones por item guardadas, indexadas por `seccion__item`
    const savedObservations = (defaultAnswers[ITEM_OBSERVATIONS_KEY] ?? {}) as Record<string, unknown>;

    // Cargar respuestas por sección
    template.checklist_template_sections?.forEach((section) => {
      const sectionCode = section.code || section.section?.code || `section_${section.id}`;
      const rawSection = defaultAnswers[sectionCode];
      const sectionAnswers: DefaultAnswerSectionValue = rawSection && typeof rawSection === 'object' ? rawSection : {};

      section.checklist_template_items?.forEach((item) => {
        const itemCode = item.code || `item_${item.id}`;
        const fieldName = `${sectionCode}__${itemCode}`;
        const itemAnswer = sectionAnswers[itemCode];
        const savedObs = savedObservations[fieldName];
        defaults[`${fieldName}${OBS_SUFFIX}`] = typeof savedObs === 'string' ? savedObs : '';

        if (isSideValidationItem(item)) {
          if (itemAnswer && typeof itemAnswer === 'object') {
            const sideAnswer = itemAnswer as { left?: unknown; right?: unknown };
            const leftValue = normalizeChecklistValue(sideAnswer.left);
            const rightValue = normalizeChecklistValue(sideAnswer.right);
            defaults[`${fieldName}_left`] = leftValue;
            defaults[`${fieldName}_right`] = rightValue;
          } else {
            defaults[`${fieldName}_left`] = '';
            defaults[`${fieldName}_right`] = '';
          }
        } else {
          defaults[fieldName] = normalizeChecklistValue(itemAnswer);
        }
      });
    });
  } else {
    // Inicializar todos los campos de items con string vacío (patrón recomendado para Select/inputs controlados)
    template.checklist_template_sections?.forEach((section) => {
      const sectionCode = section.code || section.section?.code || `section_${section.id}`;
      section.checklist_template_items?.forEach((item) => {
        const itemCode = item.code || `item_${item.id}`;
        const fieldName = `${sectionCode}__${itemCode}`;

        if (isSideValidationItem(item)) {
          defaults[`${fieldName}_left`] = '';
          defaults[`${fieldName}_right`] = '';
        } else {
          defaults[fieldName] = '';
        }
        defaults[`${fieldName}${OBS_SUFFIX}`] = '';
      });
    });
  }

  return defaults;
};

/**
 * Limpia el label eliminando patrones innecesarios como "…../…../……." o "Vto….../…..../….." o "Fecha….../…..../….."
 */
const cleanLabel = (label: string): string => {
  if (!label) return label;

  let cleaned = label;

  // Primero, eliminar solo "Vto" y los puntos/barras que le siguen, preservando el texto descriptivo antes
  // Ejemplos: "Cert. Anual Vto……/…../…." -> "Cert. Anual", "Cert. Montaje inicial Vto….../…..../……" -> "Cert. Montaje inicial"
  cleaned = cleaned.replace(/Vto\s*[\.…\/]+/gi, '').trim();

  // Eliminar "Cert. Vto" o "Cert Vto" seguido de puntos/barras (solo cuando no hay texto descriptivo)
  // Ejemplos: "Cert. Vto..../...../....", "Cert. Vto….../…..../….."
  cleaned = cleaned.replace(/Cert\.?\s*:?\s*Vto\s*[\.…\/]+/gi, 'Cert.').trim();

  // Eliminar "Fecha" seguido de puntos suspensivos y barras
  // Ejemplos: "Fecha…../…../…….", "Fecha ….../…..../….."
  cleaned = cleaned.replace(/Fecha\s*[\.…\/]+/gi, '').trim();

  // Eliminar "Control" seguido de puntos suspensivos y barras
  // Ejemplos: "Control…./…/…", "Control…/…/…..", "Control …./…../….."
  cleaned = cleaned.replace(/Control\s*[\.…\/]+/gi, '').trim();

  // Eliminar "Cert" o "Cert." o "Cert:" seguido de puntos suspensivos y barras (sin Vto)
  // Ejemplos: "Cert …./…/…", "Cert: ………/……/……….", "Cert. …/…/…"
  cleaned = cleaned.replace(/Cert\.?\s*:?\s*[\.…\/]+/gi, 'Cert.').trim();

  // Eliminar "Vencimiento" seguido de puntos suspensivos y barras
  // Ejemplo: "Vencimiento…..../…..../…..."
  cleaned = cleaned.replace(/Vencimiento\s*[\.…\/]+/gi, '').trim();

  // Eliminar cualquier patrón restante de puntos suspensivos con barras (patrón general)
  // Ejemplos: "…../…../…….", "…..../…..../…...", "…/…/…"
  cleaned = cleaned.replace(/[\.…]+\/?[\.…]+\/?[\.…]+/g, '');

  // Limpiar "Cert." duplicado o solo "Cert" al final, pero preservar "Cert. Anual", "Cert. Montaje inicial", etc.
  // Solo eliminar "Cert." si está al final sin texto descriptivo después
  cleaned = cleaned.replace(/\s*Cert\.?\s*$/gi, '').trim();
  cleaned = cleaned.replace(/Cert\.\s*Cert\./gi, 'Cert.').trim();

  // Limpiar espacios múltiples y espacios al inicio/final
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Limpiar espacios antes de puntos, comas, dos puntos, etc.
  cleaned = cleaned.replace(/\s+([.,:;])/g, '$1');

  return cleaned;
};

/**
 * Obtiene el label visible para una opción de select
 * Mapea los codigos a su texto legible, manteniendo otros valores sin cambios
 */
const getOptionLabel = (option: string): string => {
  const labelMap: Record<string, string> = {
    B: 'Bueno',
    M: 'Malo',
    [NOT_APPLICABLE_VALUE]: NOT_APPLICABLE_LABEL,
  };
  return labelMap[option] || option;
};

/**
 * Convierte el label visible de vuelta al valor original
 * Mapea el texto legible a su codigo, manteniendo otros valores sin cambios
 */
const getOptionValue = (label: string): string => {
  const valueMap: Record<string, string> = {
    Bueno: 'B',
    Malo: 'M',
    [NOT_APPLICABLE_LABEL]: NOT_APPLICABLE_VALUE,
  };
  return valueMap[label] || label;
};

/**
 * Normaliza un valor a su codigo ('B' | 'M' | 'NA'), transformando el texto legible
 * si es necesario. Retorna '' si el valor está vacío o es inválido
 */
const normalizeChecklistValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (!str) return '';
  if (str === 'Bueno') return 'B';
  if (str === 'Malo') return 'M';
  if (str === NOT_APPLICABLE_LABEL) return NOT_APPLICABLE_VALUE;
  return str;
};

/**
 * Cabecera de un item: enunciado, badges de estado y, si la plantilla lo trae,
 * el texto original del formulario en papel.
 *
 * Vive fuera de `ChecklistItemField` a propósito: definirla adentro creaba un
 * tipo de componente nuevo en cada render y remontaba el bloque completo.
 */
const ItemHeader = ({
  label,
  description,
  isCritical,
  requiresCertification = false,
  isFailed = false,
  className,
}: {
  label: string;
  description?: string | null;
  isCritical: boolean;
  requiresCertification?: boolean;
  isFailed?: boolean;
  className?: string;
}) => (
  <FormLabel className={cn('text-base font-semibold mb-3 block', className)}>
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <span className="flex-1">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {isCritical && (
          <Badge variant="destructive" className="text-xs whitespace-nowrap">
            CRÍTICO
          </Badge>
        )}
        {requiresCertification && (
          <Badge variant="outline" className="text-xs whitespace-nowrap">
            <Calendar className="w-3 h-3 mr-1 inline" />
            Certificación
          </Badge>
        )}
        {isFailed && (
          <Badge variant="destructive" className="text-xs whitespace-nowrap gap-1">
            <AlertTriangle className="w-3 h-3" />
            Fallido
          </Badge>
        )}
      </div>
    </div>
    {/* Texto del formulario en papel: se mantiene, pero con el menor peso visual
        posible para no romper la silueta que comparten todos los checklists */}
    {description && (
      <p className="mt-1 text-[11px] leading-snug font-normal italic text-muted-foreground/60">{description}</p>
    )}
  </FormLabel>
);

/**
 * Observación libre de un item, equivalente a la columna OBSERVACIONES del
 * formulario en papel.
 *
 * Se despliega sola cuando la respuesta es "Malo" —que es cuando el dato hace
 * falta y el operario está parado frente al equipo— y en el resto de los casos
 * queda como un botón de texto. Nunca se esconde del todo: si ya tiene contenido
 * se muestra un adelanto, para que no quede información invisible.
 */
const ItemObservation = ({
  fieldName,
  answerFieldNames,
  control,
  readOnly,
}: {
  /** campo de la observación */
  fieldName: string;
  /** campos de respuesta del item (valor único, o izquierda y derecha) */
  answerFieldNames: string[];
  control: Control<FieldValues>;
  readOnly: boolean;
}) => {
  // Un solo useWatch con la lista de campos: suscribirse por separado a cada uno
  // multiplicaba las suscripciones por item en un formulario que puede tener cien.
  const [value, ...answers] = useWatch({
    control,
    name: [fieldName, ...answerFieldNames],
  }) as (string | undefined)[];
  const isFailed = answers.some((v) => v === 'M' || v === 'Malo');
  const [manuallyOpen, setManuallyOpen] = useState(false);
  const isOpen = manuallyOpen || isFailed;

  if (readOnly) {
    if (!value) return null;
    return (
      <div className="mt-3 border-t pt-2">
        <p className="text-xs font-medium text-muted-foreground">Observación</p>
        <p className="text-sm whitespace-pre-wrap">{value}</p>
      </div>
    );
  }

  // Colapsado: el afford queda deliberadamente tenue y compacto, para que la
  // tarjeta del item mantenga el mismo alto y peso que en el resto de checklists
  if (!isOpen) {
    return (
      <div className="mt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 -ml-1.5 text-[11px] font-normal text-muted-foreground/70 hover:text-foreground"
          aria-expanded={false}
          aria-controls={`${fieldName}-panel`}
          onClick={() => setManuallyOpen(true)}
        >
          <MessageSquarePlus className="w-3.5 h-3.5 mr-1" />
          {value ? <span className="line-clamp-1 max-w-[22ch] text-left">{value}</span> : 'Observación'}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-2" id={`${fieldName}-panel`}>
      <FormField
        control={control}
        name={fieldName}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[11px] font-normal text-muted-foreground/70">
              {isFailed ? 'Describí qué encontraste' : 'Observación'}
            </FormLabel>
            <FormControl>
              <Textarea
                {...field}
                value={field.value ?? ''}
                rows={2}
                maxLength={OBS_MAX_LENGTH}
                placeholder={isFailed ? 'Ej.: rajadura de 10 cm en el lateral izquierdo' : 'Opcional'}
                className="resize-y"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

/** Contenedor de un item: aloja el campo y, debajo, su observación. */
const ItemShell = ({
  failed,
  className,
  observation,
  children,
}: {
  failed: boolean;
  className?: string;
  observation?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      'rounded-lg p-4',
      failed ? 'border-2 border-destructive bg-destructive/10' : 'border bg-muted/20',
      className
    )}
  >
    {children}
    {observation}
  </div>
);

/**
 * Componente que renderiza un item individual del checklist
 */
const ChecklistItemField = ({
  item,
  sectionCode,
  form,
  readOnly = false,
  showObservations = false,
}: {
  item: ChecklistTemplateItem;
  sectionCode: string;
  form: UseFormReturn<FieldValues>;
  readOnly?: boolean;
  /** Habilita la columna OBSERVACIONES por item (plantillas que replican un formulario en papel) */
  showObservations?: boolean;
}) => {
  const typedControl = form.control as Control<FieldValues>;
  const itemCode = item.code || `item_${item.id}`;
  const fieldName = `${sectionCode}__${itemCode}`;
  const label = cleanLabel(item.label || 'Sin etiqueta');
  const isCritical = item.is_critical || false;
  const requiresSideValidation = isSideValidationItem(item);

  // Resaltado de items fallidos ('M' o 'Malo'), solo al ver una respuesta guardada.
  // `useWatch` con `disabled` evita suscribirse mientras se completa el formulario:
  // con `form.watch` cada item quedaba escuchando el estado entero y una sola
  // respuesta re-renderizaba todos los demás.
  // Resaltado de items fallidos, solo al ver una respuesta guardada: `disabled`
  // evita suscribirse mientras se completa el formulario, donde cada respuesta
  // haría re-renderizar a todos los demás items.
  const watchOptions = { control: typedControl, disabled: !readOnly } as const;
  const currentValue = useWatch({ ...watchOptions, name: fieldName });
  const leftValue = useWatch({ ...watchOptions, name: `${fieldName}_left` });
  const rightValue = useWatch({ ...watchOptions, name: `${fieldName}_right` });

  const hasFailValue = (v: unknown) => v === 'M' || v === 'Malo';
  const isFailed = readOnly && hasFailValue(currentValue);
  const isLeftFailed = readOnly && hasFailValue(leftValue);
  const isRightFailed = readOnly && hasFailValue(rightValue);
  const isAnySideFailed = isLeftFailed || isRightFailed;

  // La observación sigue el valor por su cuenta: así la suscripción existe solo
  // en las plantillas que la usan, y no en el resto.
  const observationNode = showObservations ? (
    <ItemObservation
      fieldName={`${fieldName}${OBS_SUFFIX}`}
      answerFieldNames={requiresSideValidation ? [`${fieldName}_left`, `${fieldName}_right`] : [fieldName]}
      control={typedControl}
      readOnly={readOnly}
    />
  ) : null;

  // Parsear opciones si es un select. "No aplica" se suma siempre: además de permitir
  // elegirla, hace que un valor ya guardado se muestre al ver la respuesta (un valor
  // fuera del listado deja el campo en blanco).
  let options: string[] = DEFAULT_ANSWER_OPTIONS;
  if (item.input_type === 'select' && item.options) {
    try {
      const parsed = Array.isArray(item.options) ? item.options : JSON.parse(item.options as string);
      options = withNotApplicable(parsed as string[]);
    } catch (e) {
      logger.error('Error parsing options', { data: { error: e } });
    }
  }

  // Renderizar campo de fecha
  if (item.input_type === 'date') {
    return (
      <ItemShell failed={isFailed} observation={observationNode}>
        <FormField
          control={typedControl}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <ItemHeader
                label={label}
                description={item.description}
                isCritical={isCritical}
                requiresCertification={Boolean(item.requires_certification)}
                isFailed={isFailed}
              />
              <FormControl>
                <Input type="date" {...field} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </ItemShell>
    );
  }

  // Renderizar campo doble (izquierda/derecha)
  if (requiresSideValidation) {
    return (
      <ItemShell failed={isAnySideFailed} className="space-y-4" observation={observationNode}>
        <div className="pb-2 border-b">
          <ItemHeader
            label={label}
            description={item.description}
            isCritical={isCritical}
            isFailed={isAnySideFailed}
            className="mb-0"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={typedControl}
            name={`${fieldName}_left`}
            render={({ field }) => {
              return (
                <FormItem
                  className={cn('rounded-md p-2', isLeftFailed && 'bg-destructive/10 ring-1 ring-destructive/30')}
                >
                  <FormLabel
                    className={cn('text-sm font-medium text-muted-foreground', isLeftFailed && 'text-destructive')}
                  >
                    Izquierda {isLeftFailed && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                  </FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                      }}
                      value={field.value}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="w-full pointer-coarse:min-h-11">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {getOptionLabel(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={typedControl}
            name={`${fieldName}_right`}
            render={({ field }) => {
              return (
                <FormItem
                  className={cn('rounded-md p-2', isRightFailed && 'bg-destructive/10 ring-1 ring-destructive/30')}
                >
                  <FormLabel
                    className={cn('text-sm font-medium text-muted-foreground', isRightFailed && 'text-destructive')}
                  >
                    Derecha {isRightFailed && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                  </FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                      }}
                      value={field.value}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="w-full pointer-coarse:min-h-11">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {getOptionLabel(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>
      </ItemShell>
    );
  }

  // Renderizar campo select
  if (item.input_type === 'select') {
    return (
      <ItemShell failed={isFailed} observation={observationNode}>
        <FormField
          control={typedControl}
          name={fieldName}
          render={({ field }) => {
            return (
              <FormItem>
                <ItemHeader label={label} description={item.description} isCritical={isCritical} isFailed={isFailed} />
                <FormControl>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                    value={field.value}
                    disabled={readOnly}
                  >
                    <SelectTrigger className="w-full pointer-coarse:min-h-11">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {getOptionLabel(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </ItemShell>
    );
  }

  // Renderizar campo de texto
  if (item.input_type === 'text') {
    return (
      <ItemShell failed={isFailed} observation={observationNode}>
        <FormField
          control={typedControl}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <ItemHeader label={label} description={item.description} isCritical={isCritical} isFailed={isFailed} />
              <FormControl>
                <Input {...field} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </ItemShell>
    );
  }

  // Renderizar campo numérico
  if (item.input_type === 'number') {
    return (
      <ItemShell failed={isFailed} observation={observationNode}>
        <FormField
          control={typedControl}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <ItemHeader label={label} description={item.description} isCritical={isCritical} isFailed={isFailed} />
              <FormControl>
                <Input type="number" {...field} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </ItemShell>
    );
  }

  // Por defecto, renderizar como radio group (B/M)
  return (
    <ItemShell failed={isFailed} observation={observationNode}>
      <FormField
        control={typedControl}
        name={fieldName}
        render={({ field }) => (
          <FormItem>
            <ItemHeader label={label} description={item.description} isCritical={isCritical} isFailed={isFailed} />
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="flex flex-col sm:flex-row gap-2 sm:gap-3"
                disabled={readOnly}
              >
                {/* Cada opción es un bloque completo: el control en sí mide 16 px,
                    muy por debajo del mínimo táctil, y esto se responde con guantes */}
                {options.map((option) => (
                  <label
                    key={option}
                    htmlFor={`${fieldName}-${option}`}
                    className={cn(
                      'flex flex-1 items-center gap-2 rounded-md px-3 py-2 pointer-coarse:min-h-11',
                      readOnly ? '' : 'cursor-pointer border hover:bg-accent'
                    )}
                  >
                    <RadioGroupItem value={option} id={`${fieldName}-${option}`} disabled={readOnly} />
                    <span>{getOptionLabel(option)}</span>
                  </label>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </ItemShell>
  );
};

/**
 * Componente principal del formulario de checklist normalizado
 */
export function NormalizedChecklistForm({
  shouldDisabledInputs = true,
  template,
  equipments,
  customers = [],
  employees = [],
  currentUser,
  defaultEquipmentId,
  defaultAnswers,
  readOnly = false,
  defaultEmployeeId,
  defaultEmployeeName,
  defaultKilometer,
  defaultHitchEquipmentId,
  defaultCustomerId,
  defaultHorometro,
}: NormalizedChecklistFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [criticalItemsFailed, setCriticalItemsFailed] = useState<string[]>([]);
  const [showDeviationsModal, setShowDeviationsModal] = useState(false);
  const [pendingDeviations, setPendingDeviations] = useState<Awaited<ReturnType<typeof getPendingDeviations>>>([]);
  const [supervisors, setSupervisors] = useState<Awaited<ReturnType<typeof fetchSupervisorsForChecklist>>>([]);
  const [showAllGoodPrompt, setShowAllGoodPrompt] = useState(false);
  const [showAdditionalDeviationModal, setShowAdditionalDeviationModal] = useState(false);
  const [currentEquipmentId, setCurrentEquipmentId] = useState<string | undefined>(defaultEquipmentId);
  const [createdAnswerId, setCreatedAnswerId] = useState<string | null>(null);

  // Estado para validación de kilometraje mínimo
  const [minKilometer, setMinKilometer] = useState<number | null>(null);
  const [kilometerError, setKilometerError] = useState<string | null>(null);

  // Estado para validación de horómetro mínimo
  const [minEngineHours, setMinEngineHours] = useState<number | null>(null);
  const [engineHoursError, setEngineHoursError] = useState<string | null>(null);

  // Estado para manejo de enganche (COD-290)
  const [selectedHitchEquipment, setSelectedHitchEquipment] = useState<string | null>(defaultHitchEquipmentId || null);
  const [showHitchSelector, setShowHitchSelector] = useState(false);
  const [compatibleHitchEquipment, setCompatibleHitchEquipment] = useState<Equipment[]>([]);
  const [isLoadingHitchEquipment, setIsLoadingHitchEquipment] = useState(false);
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<{
    id: string;
    has_hitch: boolean;
    is_tractor_unit: boolean;
  } | null>(null);

  // Generar schema y valores por defecto
  const schema = useMemo(() => generateChecklistSchema(template), [template]);
  const defaultValues = useMemo(
    () =>
      generateDefaultValues(
        template,
        defaultAnswers,
        defaultEquipmentId,
        defaultEmployeeName,
        defaultKilometer,
        defaultCustomerId,
        defaultHorometro
      ),
    [
      template,
      defaultAnswers,
      defaultEquipmentId,
      defaultEmployeeName,
      defaultKilometer,
      defaultCustomerId,
      defaultHorometro,
    ]
  );

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onSubmit', // Validar solo al hacer submit la primera vez
    reValidateMode: 'onBlur', // Re-validar solo el campo específico cuando el usuario sale de él
  });

  // Typed control compatible con Controller/FormField (react-hook-form 7.71+ con schemas dinamicos)
  const typedControl = form.control as Control<FieldValues>;

  // Ordenar secciones por order_index
  const sortedSections = useMemo(
    () => [...(template.checklist_template_sections || [])].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)),
    [template]
  );

  /** Secciones abiertas del acordeón. Controlado para poder abrir la del primer error. */
  const [openSections, setOpenSections] = useState<string[]>([]);

  /** Esta plantilla replica un formulario en papel con columna de OBSERVACIONES */
  const showItemObservations = TEMPLATES_WITH_ITEM_OBSERVATIONS.has(template.code ?? '');

  /** Diagrama de nomenclatura de partes, si la plantilla tiene uno */
  const partsDiagram = TEMPLATE_PARTS_DIAGRAMS[template.code ?? ''];
  const [showPartsDiagram, setShowPartsDiagram] = useState(false);

  /** nombre de campo -> id de la sección que lo contiene */
  const sectionByField = useMemo(() => {
    const map = new Map<string, string>();
    sortedSections.forEach((section) => {
      const sectionCode = section.code || section.section?.code || `section_${section.id}`;
      (section.checklist_template_items || []).forEach((item) => {
        const base = `${sectionCode}__${item.code || `item_${item.id}`}`;
        map.set(base, section.id);
        map.set(`${base}_left`, section.id);
        map.set(`${base}_right`, section.id);
      });
    });
    return map;
  }, [sortedSections]);

  /**
   * Un checklist puede tener más de cien items repartidos en secciones colapsadas,
   * así que un submit inválido tiene que decir qué falta y llevar hasta ahí: sin
   * esto el botón "Guardar" no producía ninguna reacción visible.
   */
  const handleInvalid = useCallback(
    (errors: FieldErrors<FieldValues>) => {
      const pending = Object.keys(errors);
      logger.debug('Checklist inválido', { data: { pending } });
      if (pending.length === 0) return;

      toast.error(pending.length === 1 ? 'Falta responder 1 item' : `Faltan responder ${pending.length} items`, {
        description: 'Te llevamos al primero que quedó sin completar.',
      });

      const firstField = pending[0];
      const sectionId = sectionByField.get(firstField);
      if (sectionId) {
        setOpenSections((prev) => (prev.includes(sectionId) ? prev : [...prev, sectionId]));
      }

      // Radix desmonta el contenido de las secciones cerradas: hay que esperar a que
      // el panel se monte antes de poder enfocar el campo.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = document.getElementsByName(firstField)[0];
          el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
          form.setFocus(firstField);
        });
      });
    },
    [form, sectionByField]
  );

  // Secciones e items adaptados al formato requerido por ChecklistItemPicker
  const pickableSections: PickableSection[] = useMemo(
    () =>
      (template.checklist_template_sections ?? []).map((section) => ({
        id: section.id,
        code: section.code,
        name: section.name || section.section?.name || 'Sin nombre',
        order_index: section.order_index ?? null,
        items: (section.checklist_template_items ?? [])
          .slice()
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((item) => ({
            id: item.id,
            code: item.code,
            label: item.label,
            is_critical: item.is_critical ?? false,
          })),
      })),
    [template]
  );

  // Detectar si el equipo seleccionado tiene enganche (COD-290)
  const selectedEquipmentId = form.watch('equipment_id');

  /**
   * Datos del equipo elegido. El formulario en papel los pide escritos a mano
   * (marca, N° de serie); acá ya viajan con el listado, así que se muestran en
   * vez de pedirlos: además le sirve al operario para confirmar que escaneó el
   * QR del equipo correcto.
   */
  const selectedEquipmentSummary = useMemo(
    () => equipments.find((eq) => eq.value === selectedEquipmentId),
    [equipments, selectedEquipmentId]
  );
  // const selectedEquipment = useMemo(
  //   () => equipments.find((eq) => eq.value === selectedEquipmentId),
  //   [equipments, selectedEquipmentId]
  // );

  logger.debug('equipments loaded', { data: { count: equipments.length } });

  // Obtener información del tipo del equipo seleccionado para verificar si tiene enganche
  useEffect(() => {
    async function checkEquipmentHitch() {
      if (!selectedEquipmentId) {
        setSelectedEquipmentType(null);
        // No limpiar selectedHitchEquipment si estamos en modo readOnly y ya tiene un valor
        if (!readOnly || !defaultHitchEquipmentId) {
          setSelectedHitchEquipment(null);
        }
        setCompatibleHitchEquipment([]);
        return;
      }

      try {
        const typeInfo = await getEquipmentTypeInfo(selectedEquipmentId);
        if (!typeInfo) {
          setSelectedEquipmentType(null);
          // No limpiar selectedHitchEquipment si estamos en modo readOnly y ya tiene un valor
          if (!readOnly || !defaultHitchEquipmentId) {
            setSelectedHitchEquipment(null);
          }
          setCompatibleHitchEquipment([]);
          return;
        }

        setSelectedEquipmentType({
          id: typeInfo.id,
          has_hitch: typeInfo.has_hitch,
          is_tractor_unit: typeInfo.is_tractor_unit,
        });

        // Si no tiene enganche o no es UT, limpiar el enganche seleccionado y equipos compatibles
        if (!typeInfo.has_hitch || !typeInfo.is_tractor_unit) {
          // No limpiar selectedHitchEquipment si estamos en modo readOnly y ya tiene un valor
          if (!readOnly || !defaultHitchEquipmentId) {
            setSelectedHitchEquipment(null);
          }
          setCompatibleHitchEquipment([]);
          setShowHitchSelector(false); // Cerrar modal si estaba abierto
        } else {
          // Si el equipo tiene enganche pero cambió el equipo, limpiar la selección previa de enganche
          // para que el usuario seleccione nuevamente el enganche correcto
          // Pero en modo readOnly, mantener el enganche si viene de defaultHitchEquipmentId
          if (!readOnly || !defaultHitchEquipmentId) {
            setSelectedHitchEquipment(null);
          }
          setCompatibleHitchEquipment([]);
        }
      } catch (error) {
        logger.error('Error checking equipment hitch', { data: { error } });
        setSelectedEquipmentType(null);
        // No limpiar selectedHitchEquipment si estamos en modo readOnly y ya tiene un valor
        if (!readOnly || !defaultHitchEquipmentId) {
          setSelectedHitchEquipment(null);
        }
        setCompatibleHitchEquipment([]);
      }
    }

    checkEquipmentHitch();
  }, [selectedEquipmentId, readOnly, defaultHitchEquipmentId]);

  // Auto-poblar kilometraje y horómetro cuando se selecciona un equipo
  useEffect(() => {
    if (!selectedEquipmentId || readOnly) {
      return;
    }

    const selectedEquipment = equipments.find((eq) => eq.value === selectedEquipmentId);
    if (selectedEquipment) {
      const equipmentKilometer = selectedEquipment.kilometer;
      const equipmentEngineHours = selectedEquipment.engine_hours;

      // Guardar el kilometraje mínimo para validación
      const kilometerNumber = equipmentKilometer ? parseInt(equipmentKilometer, 10) : null;
      setMinKilometer(isNaN(kilometerNumber!) ? null : kilometerNumber);

      // Auto-poblar el campo de kilometraje con el valor actual del equipo
      if (equipmentKilometer) {
        form.setValue('kilometraje', equipmentKilometer);
        // Limpiar cualquier error previo
        setKilometerError(null);
      }

      // Guardar el horómetro mínimo para validación
      const engineHoursNumber = equipmentEngineHours ? parseInt(equipmentEngineHours, 10) : null;
      setMinEngineHours(isNaN(engineHoursNumber!) ? null : engineHoursNumber);

      // Auto-poblar el campo de horómetro con el valor actual del equipo
      if (equipmentEngineHours) {
        form.setValue('horometro', equipmentEngineHours);
        // Limpiar cualquier error previo
        setEngineHoursError(null);
      }
    } else {
      setMinKilometer(null);
      setMinEngineHours(null);
    }
  }, [selectedEquipmentId, equipments, form, readOnly]);

  // Función para abrir el selector de enganche y cargar equipos compatibles
  const handleOpenHitchSelector = async () => {
    if (!selectedEquipmentId) {
      const { toast } = await import('sonner');
      toast.error('Debes seleccionar un equipo primero');
      return;
    }

    setIsLoadingHitchEquipment(true);
    setShowHitchSelector(true);

    try {
      const compatibleEquipment = await getCompatibleEquipmentForHitch(selectedEquipmentId);
      setCompatibleHitchEquipment(compatibleEquipment);

      if (compatibleEquipment.length === 0) {
        const { toast } = await import('sonner');
        toast.warning('No se encontraron equipos compatibles para enganche');
      }
    } catch (error) {
      logger.error('Error loading compatible equipment', { data: { error } });
      const { toast } = await import('sonner');
      toast.error('Error al cargar equipos compatibles');
    } finally {
      setIsLoadingHitchEquipment(false);
    }
  };

  // Determinar si debe mostrar el botón de enganche (COD-290 - Condición 3)
  // En modo readOnly, mostrar si hay un enganche seleccionado
  const shouldShowHitchButton =
    (selectedEquipmentType?.is_tractor_unit === true && selectedEquipmentType?.has_hitch === true && !readOnly) ||
    (readOnly && selectedHitchEquipment !== null);

  // Limpia el form y los estados de UI después de un submit exitoso.
  // Necesario porque Next.js cachea esta ruta y si el usuario vuelve al `/new`
  // los datos anteriores siguen presentes, mezclándose con la nueva respuesta.
  const resetFormAfterSubmit = useCallback(() => {
    form.reset(defaultValues);
    setCriticalItemsFailed([]);
    setPendingDeviations([]);
    setCreatedAnswerId(null);
    setCurrentEquipmentId(defaultEquipmentId);
    setSelectedHitchEquipment(defaultHitchEquipmentId || null);
    setKilometerError(null);
    setEngineHoursError(null);
    setMinKilometer(null);
    setMinEngineHours(null);
  }, [form, defaultValues, defaultEquipmentId, defaultHitchEquipmentId]);

  const redirectAfterChecklist = useCallback(
    (equipmentId: string) => {
      resetFormAfterSubmit();
      if (pathname?.includes('/dashboard/forms/')) {
        const formIdMatch = pathname.match(/\/dashboard\/forms\/([^/]+)/);
        if (formIdMatch?.[1]) {
          router.push(`/dashboard/forms/${formIdMatch[1]}`);
        } else {
          router.push('/dashboard/forms');
        }
      } else {
        router.push(`/maintenance/equipment/${equipmentId}/checklists`);
      }
      router.refresh();
    },
    [pathname, router, resetFormAfterSubmit]
  );

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setIsSubmitting(true);
    setCriticalItemsFailed([]);
    setKilometerError(null);
    setEngineHoursError(null);

    // Validar que el kilometraje no sea menor al kilometraje actual del equipo
    if (minKilometer !== null && data.kilometraje) {
      const enteredKilometer = parseInt(data.kilometraje, 10);
      if (!isNaN(enteredKilometer) && enteredKilometer < minKilometer) {
        setKilometerError(
          `El kilometraje ingresado (${enteredKilometer.toLocaleString('es-AR')} km) no puede ser menor al kilometraje actual del equipo (${minKilometer.toLocaleString('es-AR')} km)`
        );
        setIsSubmitting(false);
        // Mostrar toast de error
        const { toast } = await import('sonner');
        toast.error('Error de validación', {
          description: `El kilometraje no puede ser menor a ${minKilometer.toLocaleString('es-AR')} km`,
        });
        return;
      }
    }

    // Validar que el horómetro no sea menor al horómetro actual del equipo
    if (minEngineHours !== null && data.horometro) {
      const enteredEngineHours = parseInt(data.horometro, 10);
      if (!isNaN(enteredEngineHours) && enteredEngineHours < minEngineHours) {
        setEngineHoursError(
          `El horómetro ingresado (${enteredEngineHours.toLocaleString('es-AR')} hs) no puede ser menor al horómetro actual del equipo (${minEngineHours.toLocaleString('es-AR')} hs)`
        );
        setIsSubmitting(false);
        const { toast } = await import('sonner');
        toast.error('Error de validación', {
          description: `El horómetro no puede ser menor a ${minEngineHours.toLocaleString('es-AR')} hs`,
        });
        return;
      }
    }

    try {
      // NUEVO FLUJO: Detectar TODOS los items con valor "M" (no solo los críticos)
      // Cada item incluye is_critical para diferenciar visualmente y en prioridad
      const failedItems: Array<{
        item_code: string;
        item_label: string;
        section_code: string;
        is_critical: boolean;
        driver_comment?: string;
      }> = [];

      /**
       * Observaciones por item, indexadas por nombre de campo.
       *
       * Van en una clave propia de `answer_data` y NO dentro de `answers`: el
       * cálculo del resultado recorre ese subárbol buscando el literal "M", así
       * que una observación que dijera "M" marcaría el checklist como fallido.
       */
      const itemObservations: Record<string, string> = {};

      sortedSections.forEach((section) => {
        const sectionCode = section.code || section.section?.code || `section_${section.id}`;
        section.checklist_template_items?.forEach((item) => {
          const itemCode = item.code || `item_${item.id}`;
          const fieldName = `${sectionCode}__${itemCode}`;
          const isCritical = item.is_critical || false;

          // Verificar si el item tiene valor "M" (malo)
          let hasFailed = false;

          if (isSideValidationItem(item)) {
            const leftValue = data[`${fieldName}_left`];
            const rightValue = data[`${fieldName}_right`];
            if (leftValue === 'M' || rightValue === 'M') {
              hasFailed = true;
            }
          } else {
            const value = data[fieldName];
            if (value === 'M' || value === false || value === 'false') {
              hasFailed = true;
            }
          }

          const observation = (data[`${fieldName}${OBS_SUFFIX}`] as string | undefined)?.trim();
          if (observation) {
            itemObservations[`${sectionCode}__${itemCode}`] = observation;
          }

          // Si falló, agregarlo a la lista (crítico o no)
          if (hasFailed) {
            failedItems.push({
              item_code: itemCode,
              item_label: item.label || itemCode,
              section_code: sectionCode,
              is_critical: isCritical,
              // Lo que escribió el operario frente al equipo viaja al desvío y de
              // ahí a la orden de trabajo, en vez de pedírselo de nuevo después.
              ...(observation ? { driver_comment: observation } : {}),
            });
          }
        });
      });

      // Para compatibilidad con el código existente, mantener la referencia a failedCriticalItems
      const failedCriticalItems = failedItems;

      // Estructurar las respuestas por sección
      const answersBySection: Record<string, Record<string, any>> = {};
      sortedSections.forEach((section) => {
        const sectionCode = section.code || section.section?.code || `section_${section.id}`;
        answersBySection[sectionCode] = {};

        section.checklist_template_items?.forEach((item) => {
          const itemCode = item.code || `item_${item.id}`;
          const fieldName = `${sectionCode}__${itemCode}`;

          if (isSideValidationItem(item)) {
            answersBySection[sectionCode][itemCode] = {
              left: data[`${fieldName}_left`],
              right: data[`${fieldName}_right`],
            };
          } else {
            answersBySection[sectionCode][itemCode] = data[fieldName];
          }
        });
      });

      // Guardar en checklist_answers
      // NOTA: El kilometraje ya NO se actualiza directamente aquí.
      // Se actualizará cuando se apruebe la entrada a taller en el nuevo flujo de mantenimiento.

      // Guardar checklist para el equipo UT
      // NUEVO FLUJO: Usar failed_items que incluye TODOS los items con "M" (no solo críticos)
      const checklistAnswer = await CreateChecklistAnswer(template.id, {
        equipment_id: data.equipment_id,
        customer_id: data.customer_id || null,
        employee_id: defaultEmployeeId,
        // ID del empleado chofer — se guarda como columna FK directa en checklist_answers
        chofer_employee_id: (data as Record<string, unknown>).chofer_employee_id as string | null | undefined,
        chofer: data.chofer,
        fecha: data.fecha,
        hora: data.hora,
        kilometraje: data.kilometraje,
        horometro: data.horometro,
        observaciones: data.observaciones,
        answers: answersBySection,
        [ITEM_OBSERVATIONS_KEY]: itemObservations,
        failed_items: failedItems, // Nuevo formato con is_critical
        critical_items_failed: failedCriticalItems, // Mantener por compatibilidad
      });

      setCurrentEquipmentId(data.equipment_id);
      setCreatedAnswerId(checklistAnswer.id);

      // Si hay enganche seleccionado, guardar el mismo checklist para el equipo enganchado (COD-290)
      // IMPORTANTE: Los desvíos SOLO se crean en la unidad tractora, NO en el enganche
      if (selectedHitchEquipment) {
        try {
          const hitchChecklistAnswer = await CreateChecklistAnswer(template.id, {
            equipment_id: selectedHitchEquipment,
            customer_id: data.customer_id || null,
            employee_id: defaultEmployeeId,
            // Mismo chofer que la UT
            chofer_employee_id: (data as Record<string, unknown>).chofer_employee_id as string | null | undefined,
            chofer: data.chofer,
            fecha: data.fecha,
            hora: data.hora,
            kilometraje: data.kilometraje,
            horometro: data.horometro,
            observaciones: data.observaciones,
            answers: answersBySection, // Mismo resultado para ambos equipos
            [ITEM_OBSERVATIONS_KEY]: itemObservations,
            critical_items_failed: [], // NO crear desvíos para el enganche
            ut_checklist_answer_id: checklistAnswer.id, // Vincular con el checklist del UT
          });

          logger.info('[CHECKLIST] Created duplicate checklist answer for hitched equipment', {
            data: { hitchEquipmentId: selectedHitchEquipment, utAnswerId: checklistAnswer.id },
          });
        } catch (error) {
          logger.error('Error creating checklist answer for hitched equipment', { data: { error } });
          const { toast } = await import('sonner');
          toast.error('Error al guardar el checklist para el equipo enganchado');
          // No fallar completamente, pero loguear el error
        }
      }

      // NUEVO FLUJO: Mostrar modal si hay CUALQUIER item fallido (crítico o no)
      if (failedItems.length > 0) {
        setCriticalItemsFailed(failedItems.map((item) => item.item_label));

        // Obtener los desvíos creados y los supervisores disponibles para el modal
        try {
          logger.info('[NormalizedChecklistForm] Obteniendo desvíos para equipment_id', {
            data: { equipmentId: data.equipment_id, checklistAnswerId: checklistAnswer.id },
          });
          // Solo los desvíos de ESTE checklist: traer los de otros checklists hacía que la
          // solicitud se asociara al checklist equivocado y que los desvíos recién cargados
          // quedaran sin solicitud.
          const [deviations, supervisorsList] = await Promise.all([
            getPendingDeviations(data.equipment_id, {
              checklistAnswerId: checklistAnswer.id,
              onlyWithoutRequest: true,
            }),
            fetchSupervisorsForChecklist(),
          ]);

          logger.debug('[NormalizedChecklistForm] Desvíos obtenidos', {
            data: { count: deviations?.length || 0, deviations },
          });
          logger.debug('[NormalizedChecklistForm] Supervisores obtenidos', {
            data: { count: supervisorsList?.length || 0 },
          });

          setPendingDeviations(deviations);
          setSupervisors(supervisorsList);
          setShowDeviationsModal(true);
          // NO redirigir aquí, esperar a que el modal se cierre

          // Contar críticos vs no críticos para el mensaje
          const criticalCount = failedItems.filter((item) => item.is_critical).length;
          const nonCriticalCount = failedItems.length - criticalCount;

          const { toast } = await import('sonner');
          toast.success('Checklist guardado', {
            description: `Se detectaron ${failedItems.length} item(s) con fallos${criticalCount > 0 ? ` (${criticalCount} crítico(s))` : ''}. Por favor, registra los desvíos.`,
          });
        } catch (error) {
          logger.error('Error fetching deviations or supervisors', { data: { error } });
          const { toast } = await import('sonner');
          toast.success('Checklist guardado', {
            description: `Se detectaron ${failedItems.length} item(s) con fallos`,
          });

          // Si no se puede cargar el modal, redirigir a la lista de respuestas
          setTimeout(() => {
            if (pathname?.includes('/dashboard/forms/')) {
              const formIdMatch = pathname.match(/\/dashboard\/forms\/([^/]+)/);
              if (formIdMatch && formIdMatch[1]) {
                router.push(`/dashboard/forms/${formIdMatch[1]}`);
              } else {
                router.push('/dashboard/forms');
              }
            } else {
              router.push(`/maintenance/equipment/${data.equipment_id}/checklists`);
            }
            router.refresh();
          }, 1500);
        }
      } else {
        const { toast } = await import('sonner');
        toast.success('Checklist guardado correctamente');
        setShowAllGoodPrompt(true);
      }
    } catch (error) {
      logger.error('Error al guardar el checklist', { data: { error } });
      // TODO: Mostrar toast de error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, handleInvalid)} className="space-y-6">
        {/* Información del checklist */}
        <Card>
          <CardHeader>
            <CardTitle>{template.name}</CardTitle>
            {template.description && <CardDescription>{template.description}</CardDescription>}
          </CardHeader>
        </Card>

        {/* Alerta de items críticos fallidos */}
        {criticalItemsFailed.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Items críticos fallidos:</strong>
              <ul className="list-disc list-inside mt-2">
                {criticalItemsFailed.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-2">Se generarán solicitudes de reparación automáticamente.</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Campos básicos */}
        <Card>
          <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
            <AccordionItem className="pr-5" value="item-1">
              <AccordionTrigger className="text-start">
                <CardHeader className="flex-1 min-w-0">
                  <CardTitle>Información General</CardTitle>
                </CardHeader>
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-4">
                <CardContent className="space-y-4">
                  <div className="space-y-4 w-full">
                    <FormField
                      control={typedControl}
                      name="equipment_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Equipo</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value} disabled={shouldDisabledInputs}>
                              <SelectTrigger className="w-full pointer-coarse:min-h-11">
                                <SelectValue placeholder="Seleccionar equipo" />
                              </SelectTrigger>
                              <SelectContent>
                                {equipments.map((equipment) => (
                                  <SelectItem key={equipment.value} value={equipment.value}>
                                    <div className="flex flex-col items-start">
                                      <span>
                                        {equipment.label}
                                        <span className="ml-2 inline-flex gap-1">
                                          {/* {equipment.type_name && equipment.type_name !== 'N/A' && (
                                            <span className="rounded bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5">
                                              {equipment.type_name}
                                            </span>
                                          )} */}
                                          {equipment.sub_type_name && equipment.sub_type_name !== 'N/A' && (
                                            <span className="rounded bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5">
                                              {equipment.sub_type_name}
                                            </span>
                                          )}
                                        </span>
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Datos del equipo, de solo lectura: el papel los pide a mano
                        y el sistema ya los conoce */}
                    {selectedEquipmentSummary && (
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-4">
                        {[
                          { label: 'Marca', value: selectedEquipmentSummary.brand },
                          { label: 'Modelo', value: selectedEquipmentSummary.model },
                          { label: 'N° de serie', value: selectedEquipmentSummary.serie },
                          { label: 'Interno', value: selectedEquipmentSummary.intern_number },
                        ]
                          .filter((f) => f.value && f.value !== 'N/A')
                          .map((f) => (
                            <div key={f.label}>
                              <dt className="text-xs text-muted-foreground">{f.label}</dt>
                              <dd className="text-sm font-medium">{f.value}</dd>
                            </div>
                          ))}
                      </dl>
                    )}

                    {/* Botón para agregar enganche (COD-290 - Condición 3) */}
                    {shouldShowHitchButton && (
                      <div className="space-y-2">
                        <FormLabel>Enganche</FormLabel>
                        <div className="flex items-center gap-2">
                          {readOnly ? (
                            // En modo readOnly, mostrar el texto del enganche con badge de subtipo
                            (() => {
                              const hitchEquipmentData =
                                equipments.find((eq) => eq.value === selectedHitchEquipment) ||
                                compatibleHitchEquipment.find((eq) => eq.value === selectedHitchEquipment);
                              return (
                                <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted">
                                  <LinkIcon className="h-4 w-4" />
                                  <span>
                                    {selectedHitchEquipment
                                      ? hitchEquipmentData?.label || 'Enganche seleccionado'
                                      : 'Sin enganche'}
                                  </span>
                                  {hitchEquipmentData?.sub_type_name && hitchEquipmentData.sub_type_name !== 'N/A' && (
                                    <span className="rounded bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5">
                                      {hitchEquipmentData.sub_type_name}
                                    </span>
                                  )}
                                </div>
                              );
                            })()
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant={selectedHitchEquipment ? 'outline' : 'default'}
                                onClick={handleOpenHitchSelector}
                                disabled={!selectedEquipmentId}
                                className="flex items-center gap-2"
                              >
                                <LinkIcon className="h-4 w-4" />
                                {selectedHitchEquipment
                                  ? compatibleHitchEquipment.find((eq) => eq.value === selectedHitchEquipment)?.label ||
                                    'Cambiar enganche'
                                  : 'Agregar enganche'}
                              </Button>
                              {selectedHitchEquipment && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedHitchEquipment(null);
                                  }}
                                  disabled={shouldDisabledInputs}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                        {selectedHitchEquipment && !readOnly && (
                          <p className="text-sm text-muted-foreground">
                            Enganche seleccionado:{' '}
                            {compatibleHitchEquipment.find((eq) => eq.value === selectedHitchEquipment)?.label}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Campo de cliente */}
                    {customers.length > 0 && (
                      <FormField
                        control={typedControl}
                        name="customer_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cliente</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value} disabled={readOnly}>
                                <SelectTrigger className="w-full pointer-coarse:min-h-11">
                                  <SelectValue placeholder="Seleccionar cliente (opcional)" />
                                </SelectTrigger>
                                <SelectContent>
                                  {customers.map((customer) => (
                                    <SelectItem key={customer.id} value={customer.id}>
                                      {customer.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={typedControl}
                      name="chofer"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Chofer</FormLabel>
                          {employees.length > 0 ? (
                            <Popover>
                              <PopoverTrigger asChild disabled={readOnly}>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                                    disabled={readOnly}
                                  >
                                    {field.value || 'Buscar chofer...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-100 p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Buscar por nombre o documento..." />
                                  <CommandList>
                                    <CommandEmpty>No se encontraron empleados.</CommandEmpty>
                                    <CommandGroup>
                                      {employees.map((employee) => (
                                        <CommandItem
                                          key={employee.id}
                                          value={`${employee.fullName} ${employee.document || ''}`}
                                          onSelect={() => {
                                            field.onChange(employee.fullName);
                                            // Guardar el ID del empleado como columna FK directa
                                            form.setValue('chofer_employee_id', employee.id);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              'mr-2 h-4 w-4',
                                              field.value === employee.fullName ? 'opacity-100' : 'opacity-0'
                                            )}
                                          />
                                          <div className="flex flex-col">
                                            <span>
                                              {employee.file_number ? `[${employee.file_number}] ` : ''}
                                              {employee.fullName}
                                            </span>
                                            {employee.document && (
                                              <span className="text-xs text-muted-foreground">{employee.document}</span>
                                            )}
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <FormControl>
                              <Input {...field} placeholder="Nombre del chofer" disabled={shouldDisabledInputs} />
                            </FormControl>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={typedControl}
                      name="kilometraje"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Kilometraje
                            {minKilometer !== null && !readOnly && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (mín: {minKilometer.toLocaleString('es-AR')} km)
                              </span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Kilometraje actual"
                              disabled={readOnly}
                              type="number"
                              min={minKilometer ?? undefined}
                              className={kilometerError ? 'border-destructive' : ''}
                              onChange={(e) => {
                                field.onChange(e);
                                // Validar que el kilometraje no sea menor al mínimo
                                const value = e.target.value;
                                if (value && minKilometer !== null) {
                                  const enteredKm = parseInt(value, 10);
                                  if (!isNaN(enteredKm) && enteredKm < minKilometer) {
                                    setKilometerError(
                                      `El kilometraje no puede ser menor a ${minKilometer.toLocaleString('es-AR')} km (actual del equipo)`
                                    );
                                  } else {
                                    setKilometerError(null);
                                  }
                                } else {
                                  setKilometerError(null);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                          {kilometerError && <p className="text-sm font-medium text-destructive">{kilometerError}</p>}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="horometro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Horómetro
                            {minEngineHours !== null && !readOnly && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (mín: {minEngineHours.toLocaleString('es-AR')} hs)
                              </span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Horómetro"
                              disabled={readOnly}
                              type="number"
                              min={minEngineHours ?? undefined}
                              className={engineHoursError ? 'border-destructive' : ''}
                              onChange={(e) => {
                                field.onChange(e);
                                // Validar que el horómetro no sea menor al mínimo
                                const value = e.target.value;
                                if (value && minEngineHours !== null) {
                                  const enteredHours = parseInt(value, 10);
                                  if (!isNaN(enteredHours) && enteredHours < minEngineHours) {
                                    setEngineHoursError(
                                      `El horómetro no puede ser menor a ${minEngineHours.toLocaleString('es-AR')} hs (actual del equipo)`
                                    );
                                  } else {
                                    setEngineHoursError(null);
                                  }
                                } else {
                                  setEngineHoursError(null);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                          {engineHoursError && (
                            <p className="text-sm font-medium text-destructive">{engineHoursError}</p>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={typedControl}
                      name="fecha"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={readOnly} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={typedControl}
                      name="hora"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} disabled={readOnly} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={typedControl}
                    name="observaciones"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observaciones</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Observaciones generales..." rows={3} disabled={readOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* Ayuda de consulta: nomenclatura de partes del formulario en papel.
            Va como enlace tenue para no agregar un bloque que el resto de los
            checklists no tiene. */}
        {partsDiagram && (
          <div className="-mt-3 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs font-normal text-muted-foreground/80 hover:text-foreground"
              onClick={() => setShowPartsDiagram(true)}
            >
              <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
              Ver diagrama de partes
            </Button>
          </div>
        )}

        {/*
          "multiple" en vez de "single": con una sola sección abierta a la vez, Radix
          desmontaba el resto y los mensajes de error de los items pendientes no
          llegaban siquiera a existir en el DOM.
        */}
        <Accordion type="multiple" className="w-full space-y-6" value={openSections} onValueChange={setOpenSections}>
          {/* Secciones del checklist */}
          {sortedSections.map((section) => {
            const sectionCode = section.code || section.section?.code || `section_${section.id}`;
            const sectionName = section.name || section.section?.name || 'Sin nombre';
            const sectionDescription = section.section?.description || null;

            // Ordenar items por order_index y eliminar duplicados por ID
            const allItems = section.checklist_template_items || [];

            const uniqueItems = Array.from(new Map(allItems.map((item) => [item.id, item])).values());

            const sortedItems = uniqueItems.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

            // Contar items fallidos en la sección (solo en modo readOnly)
            const failedCount = readOnly
              ? sortedItems.reduce((count, item) => {
                  const itemCode = item.code || `item_${item.id}`;
                  const fieldName = `${sectionCode}__${itemCode}`;
                  const val = form.getValues(fieldName);
                  const leftVal = form.getValues(`${fieldName}_left`);
                  const rightVal = form.getValues(`${fieldName}_right`);
                  const hasFail = (v: unknown) => v === 'M' || v === 'Malo';
                  return count + (hasFail(val) || hasFail(leftVal) || hasFail(rightVal) ? 1 : 0);
                }, 0)
              : 0;

            return (
              <Card key={section.id}>
                <AccordionItem className="pr-5" value={section.id}>
                  <AccordionTrigger>
                    <CardHeader className="text-start flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle>{sectionName}</CardTitle>
                        {failedCount > 0 && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {failedCount} {failedCount === 1 ? 'item fallido' : 'items fallidos'}
                          </Badge>
                        )}
                      </div>
                      {sectionDescription && <CardDescription>{sectionDescription}</CardDescription>}
                    </CardHeader>
                  </AccordionTrigger>
                  <AccordionContent className="flex flex-col gap-4 text-balance">
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {sortedItems.map((item) => (
                          <ChecklistItemField
                            key={item.id}
                            item={item}
                            sectionCode={sectionCode}
                            form={form}
                            readOnly={readOnly}
                            showObservations={showItemObservations}
                          />
                        ))}
                      </div>
                    </CardContent>
                    <AccordionTrigger className="text-start border-t-2 border-muted p-5 pb-0">Cerrar</AccordionTrigger>
                  </AccordionContent>
                </AccordionItem>
              </Card>
            );
          })}
        </Accordion>

        {/* Diagrama de partes: material de consulta ocasional, por eso va en un
            diálogo y no ocupando espacio entre los items */}
        {partsDiagram && (
          <Dialog open={showPartsDiagram} onOpenChange={setShowPartsDiagram}>
            <DialogContent className="max-w-5xl">
              <DialogHeader>
                <DialogTitle>{partsDiagram.title}</DialogTitle>
                <DialogDescription>
                  Referencia del formulario RO 06-1. No forma parte de la inspección.
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-x-auto rounded-lg border bg-white p-3 dark:bg-neutral-900">
                {/* La imagen es tinta negra sobre fondo transparente: en modo
                    oscuro se invierte para que las líneas queden blancas */}
                <Image
                  src={partsDiagram.src}
                  alt={partsDiagram.alt}
                  width={1421}
                  height={755}
                  sizes="(max-width: 1024px) 100vw, 960px"
                  className="h-auto w-full dark:invert"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Botones de acción */}
        {!readOnly && (
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Limpiar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar Checklist'}
            </Button>
          </div>
        )}
      </form>

      {/* Modal para seleccionar equipo enganchado (COD-290) */}
      <Dialog open={showHitchSelector} onOpenChange={setShowHitchSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Seleccionar Equipo Enganchado</DialogTitle>
            <DialogDescription>
              Seleccione el equipo que está enganchado al equipo UT seleccionado. El checklist se guardará para ambos
              equipos.
            </DialogDescription>
          </DialogHeader>

          {isLoadingHitchEquipment ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Cargando equipos compatibles...</div>
            </div>
          ) : compatibleHitchEquipment.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <div className="text-center space-y-2">
                <p className="font-medium">No se encontraron equipos compatibles</p>
                <p className="text-sm text-muted-foreground">
                  El tipo de este equipo UT no tiene equipos compatibles configurados para enganche.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Command className="rounded-lg border">
                <CommandInput placeholder="Buscar equipo enganchado..." />
                <CommandList>
                  <CommandEmpty>No se encontraron equipos compatibles.</CommandEmpty>
                  <CommandGroup>
                    {compatibleHitchEquipment.map((equipment) => {
                      const isSelected = selectedHitchEquipment === equipment.value;
                      return (
                        <CommandItem
                          key={equipment.value}
                          value={equipment.label}
                          onSelect={() => {
                            setSelectedHitchEquipment(equipment.value);
                            setShowHitchSelector(false);
                          }}
                          className="cursor-pointer"
                        >
                          <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                          <div className="flex-1">
                            <div className="font-medium">{equipment.label}</div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {equipment.domain && (
                                <div className="text-sm text-muted-foreground">Dominio: {equipment.domain}</div>
                              )}
                              {equipment.sub_type_name && equipment.sub_type_name !== 'N/A' && (
                                <span className="rounded bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5">
                                  {equipment.sub_type_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowHitchSelector(false);
                  }}
                >
                  Cancelar
                </Button>
                {selectedHitchEquipment && (
                  <Button
                    onClick={() => {
                      setShowHitchSelector(false);
                    }}
                  >
                    Confirmar
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para generar solicitudes de reparación desde desvíos */}
      {currentEquipmentId && (
        <CriticalDeviationsRepairModal
          isOpen={showDeviationsModal}
          onClose={() => {
            setShowDeviationsModal(false);
            resetFormAfterSubmit();
            // Redirigir a la lista de respuestas con delay para que el Dialog termine su animación
            setTimeout(() => {
              if (pathname?.includes('/dashboard/forms/')) {
                const formIdMatch = pathname.match(/\/dashboard\/forms\/([^/]+)/);
                if (formIdMatch && formIdMatch[1]) {
                  router.push(`/dashboard/forms/${formIdMatch[1]}`);
                } else {
                  router.push('/dashboard/forms');
                }
              } else {
                router.push(`/maintenance/equipment/${currentEquipmentId}/checklists`);
              }
              router.refresh();
            }, 300);
          }}
          onComplete={() => {
            setShowDeviationsModal(false);
            resetFormAfterSubmit();
            // Redirigir a la lista de respuestas
            // NOTA: No llamar router.refresh() después de router.push() porque interfiere con la navegación
            if (pathname?.includes('/dashboard/forms/')) {
              const formIdMatch = pathname.match(/\/dashboard\/forms\/([^/]+)/);
              if (formIdMatch && formIdMatch[1]) {
                router.push(`/dashboard/forms/${formIdMatch[1]}`);
              } else {
                router.push('/dashboard/forms');
              }
            } else {
              router.push(`/maintenance/equipment/${currentEquipmentId}/checklists`);
            }
          }}
          deviations={pendingDeviations.map((d) => ({
            id: d.id,
            item_code: d.item_code,
            item_label: d.item_label,
            section_code: d.section_code,
            is_critical: d.is_critical ?? false,
            checklistAnswerId: d.checklist_answer_id,
            driver_comment: d.driver_comment,
            created_at: d.created_at ?? new Date().toISOString(),
          }))}
          equipmentId={currentEquipmentId}
          checklistAnswerId={createdAnswerId ?? undefined}
          driverEmployeeId={defaultEmployeeId}
        />
      )}

      <AllGoodDeviationPromptDialog
        isOpen={showAllGoodPrompt}
        onCancel={() => {
          setShowAllGoodPrompt(false);
          if (currentEquipmentId) redirectAfterChecklist(currentEquipmentId);
        }}
        onConfirm={() => {
          setShowAllGoodPrompt(false);
          setShowAdditionalDeviationModal(true);
        }}
      />
      {currentEquipmentId && createdAnswerId && (
        <AdditionalDeviationModal
          isOpen={showAdditionalDeviationModal}
          onClose={() => {
            setShowAdditionalDeviationModal(false);
            redirectAfterChecklist(currentEquipmentId);
          }}
          onSuccess={() => {
            setShowAdditionalDeviationModal(false);
            redirectAfterChecklist(currentEquipmentId);
          }}
          checklistAnswerId={createdAnswerId}
          equipmentId={currentEquipmentId}
          sections={pickableSections}
          driverEmployeeId={defaultEmployeeId}
          employeeId={defaultEmployeeId}
          userId={currentUser?.id}
          kilometer={form.getValues('kilometraje')?.toString()}
        />
      )}

      {/* Botón de autocompletado para desarrollo */}
      <DevAutoFillButton form={form} template={template} />
    </Form>
  );
}
