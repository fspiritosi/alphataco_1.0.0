'use client';

import { getPendingDeviations } from '@/app/maintenance/actions';
import { fetchAllTypesOfRepairs } from '@/components/Tipos_de_reparaciones/actions/actions';
import { CriticalDeviationsRepairModal } from '@/components/maintenance/critical-deviations-repair-modal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { TypeOfRepair } from '@/types/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Calendar } from 'lucide-react';
import moment from 'moment';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
// Tipos basados en la estructura de la base de datos
type ChecklistTemplate = Awaited<ReturnType<typeof import('@/app/server/GET/actions').fetchChecklistTemplateById>>;

type ChecklistTemplateSection = NonNullable<ChecklistTemplate>['checklist_template_sections'][number];
type ChecklistTemplateItem = ChecklistTemplateSection['checklist_template_items'][number];

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
  model: string | null;
  brand: string | null;
  intern_number: string;
  sub_type_id: string | null;
};

type NormalizedChecklistFormProps = {
  shouldDisabledInputs?: boolean;
  template: NonNullable<ChecklistTemplate>;
  equipments: Equipment[];
  currentUser: Awaited<ReturnType<typeof import('@/app/server/GET/actions').getCurrentProfile>>[number] | null;
  defaultEquipmentId?: string;
  defaultAnswers?: any;
  readOnly?: boolean; // Modo solo lectura
  defaultEmployeeId?: string;
  defaultEmployeeName?: string;
  defaultKilometer?: string;
};

/**
 * Genera el schema de Zod dinámicamente basado en la estructura del checklist
 */
const generateChecklistSchema = (template: NonNullable<ChecklistTemplate>) => {
  const schema: Record<string, z.ZodTypeAny> = {
    equipment_id: z.string().min(1, 'Debe seleccionar un equipo'),
    chofer: z.string().min(1, 'Debe ingresar el nombre del chofer'),
    fecha: z.string().min(1, 'Debe ingresar la fecha'),
    hora: z.string().min(1, 'Debe ingresar la hora'),
    kilometraje: z.string().optional(),
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

      console.log('[CHECKLIST_DEBUG] SCHEMA GENERATION - Item:', {
        label: item.label,
        itemId: item.id,
        itemCode,
        sectionCode,
        fieldName,
        input_type: item.input_type,
        requires_side_validation: item.requires_side_validation,
      });

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
        console.log('[CHECKLIST_DEBUG] SCHEMA GENERATION - Creating double_side fields:', {
          leftFieldName,
          rightFieldName,
          label: item.label,
        });
        // Siguiendo el patrón recomendado (shadcn + RHF): valor string "" como no-seleccionado.
        // Validamos "requerido" con min(1) y además restringimos a valores válidos.
        schema[leftFieldName] = z
          .string({ required_error: `${item.label || 'Este campo'} (izquierda) es requerido` })
          .min(1, `${item.label || 'Este campo'} (izquierda) es requerido`)
          .refine((val) => val === 'B' || val === 'M', {
            message: `${item.label || 'Este campo'} (izquierda) debe ser "Bueno" o "Malo"`,
          });
        schema[rightFieldName] = z
          .string({ required_error: `${item.label || 'Este campo'} (derecha) es requerido` })
          .min(1, `${item.label || 'Este campo'} (derecha) es requerido`)
          .refine((val) => val === 'B' || val === 'M', {
            message: `${item.label || 'Este campo'} (derecha) debe ser "Bueno" o "Malo"`,
          });
      } else if (item.input_type === 'select' && item.options) {
        // Campo select con opciones
        const options = Array.isArray(item.options) ? item.options : JSON.parse(item.options as string);
        if (options.length > 0 && typeof options[0] === 'string') {
          console.log('[CHECKLIST_DEBUG] SCHEMA GENERATION - Creating select field:', {
            fieldName,
            label: item.label,
            options,
            optionsType: typeof options[0],
          });
          schema[fieldName] = z
            .string({ required_error: `${item.label || 'Este campo'} es requerido` })
            .min(1, `${item.label || 'Este campo'} es requerido`)
            .refine((val) => (options as string[]).includes(val), {
              message: `${item.label || 'Este campo'} debe ser una opción válida`,
            });
        } else {
          console.log('[CHECKLIST_DEBUG] SCHEMA GENERATION - Creating text field (fallback for select):', {
            fieldName,
            label: item.label,
            reason: 'options not valid string array',
          });
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
        // Por defecto, campo select con opciones B/M
        schema[fieldName] = z
          .string({ required_error: `${item.label || 'Este campo'} es requerido` })
          .min(1, `${item.label || 'Este campo'} es requerido`)
          .refine((val) => val === 'B' || val === 'M', {
            message: `${item.label || 'Este campo'} debe ser "Bueno" o "Malo"`,
          });
      }
    });
  });

  return z.object(schema);
};

/**
 * Genera los valores por defecto del formulario
 */
const generateDefaultValues = (
  template: NonNullable<ChecklistTemplate>,
  defaultAnswers?: any,
  defaultEquipmentId?: string,
  defaultEmployeeName?: string,
  defaultKilometer?: string
) => {
  const defaults: Record<string, any> = {
    equipment_id: defaultEquipmentId || '',
    chofer: defaultEmployeeName || '',
    fecha: moment().format('YYYY-MM-DD'),
    hora: moment().format('HH:mm'),
    kilometraje: defaultKilometer || '',
    observaciones: '',
  };

  // Si hay respuestas por defecto, cargarlas
  if (defaultAnswers) {
    if (defaultAnswers.equipment_id) defaults.equipment_id = defaultAnswers.equipment_id;
    if (defaultAnswers.chofer) defaults.chofer = defaultAnswers.chofer;
    if (defaultAnswers.fecha) defaults.fecha = defaultAnswers.fecha;
    if (defaultAnswers.hora) defaults.hora = defaultAnswers.hora;
    if (defaultAnswers.kilometraje) defaults.kilometraje = defaultAnswers.kilometraje;
    if (defaultAnswers.observaciones) defaults.observaciones = defaultAnswers.observaciones;

    // Cargar respuestas por sección
    template.checklist_template_sections?.forEach((section) => {
      const sectionCode = section.code || section.section?.code || `section_${section.id}`;
      const sectionAnswers = defaultAnswers[sectionCode] || {};

      section.checklist_template_items?.forEach((item) => {
        const itemCode = item.code || `item_${item.id}`;
        const fieldName = `${sectionCode}__${itemCode}`;
        const itemAnswer = sectionAnswers[itemCode];

        if (isSideValidationItem(item)) {
          if (itemAnswer && typeof itemAnswer === 'object') {
            const leftValue = normalizeChecklistValue(itemAnswer.left);
            const rightValue = normalizeChecklistValue(itemAnswer.right);
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
          console.log('[CHECKLIST_DEBUG] DEFAULT VALUES - Setting double_side defaults:', {
            fieldName,
            left: `${fieldName}_left`,
            right: `${fieldName}_right`,
            label: item.label,
          });
        } else {
          defaults[fieldName] = '';
          console.log('[CHECKLIST_DEBUG] DEFAULT VALUES - Setting field default:', {
            fieldName,
            value: '',
            label: item.label,
            input_type: item.input_type,
          });
        }
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
 * Mapea "B" a "Bueno" y "M" a "Malo", manteniendo otros valores sin cambios
 */
const getOptionLabel = (option: string): string => {
  const labelMap: Record<string, string> = {
    B: 'Bueno',
    M: 'Malo',
  };
  return labelMap[option] || option;
};

/**
 * Convierte el label visible de vuelta al valor original
 * Mapea "Bueno" a "B" y "Malo" a "M", manteniendo otros valores sin cambios
 */
const getOptionValue = (label: string): string => {
  const valueMap: Record<string, string> = {
    Bueno: 'B',
    Malo: 'M',
  };
  return valueMap[label] || label;
};

/**
 * Normaliza un valor a 'B' o 'M', transformando "Bueno"/"Malo" si es necesario
 * Retorna undefined si el valor está vacío o es inválido
 */
const normalizeChecklistValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (!str) return '';
  if (str === 'Bueno') return 'B';
  if (str === 'Malo') return 'M';
  return str;
};

/**
 * Componente que renderiza un item individual del checklist
 */
const ChecklistItemField = ({
  item,
  sectionCode,
  form,
  readOnly = false,
}: {
  item: ChecklistTemplateItem;
  sectionCode: string;
  form: ReturnType<typeof useForm>;
  readOnly?: boolean;
}) => {
  const itemCode = item.code || `item_${item.id}`;
  const fieldName = `${sectionCode}__${itemCode}`;
  const label = cleanLabel(item.label || 'Sin etiqueta');
  const isCritical = item.is_critical || false;
  const requiresSideValidation = isSideValidationItem(item);

  console.log('[CHECKLIST_DEBUG] COMPONENT RENDER - ChecklistItemField:', {
    label,
    itemId: item.id,
    itemCode,
    sectionCode,
    fieldName,
    input_type: item.input_type,
    requires_side_validation: item.requires_side_validation,
    requiresSideValidation,
  });

  // Parsear opciones si es un select
  let options: string[] = ['B', 'M']; // Por defecto
  if (item.input_type === 'select' && item.options) {
    try {
      options = Array.isArray(item.options) ? item.options : JSON.parse(item.options as string);
    } catch (e) {
      console.error('Error parsing options:', e);
    }
  }

  // Renderizar campo de fecha
  if (item.input_type === 'date') {
    return (
      <div className="border rounded-lg p-4 bg-muted/20">
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold mb-3 block">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="flex-1">{label}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {isCritical && (
                      <Badge variant="destructive" className="text-xs whitespace-nowrap">
                        CRÍTICO
                      </Badge>
                    )}
                    {item.requires_certification && (
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        <Calendar className="w-3 h-3 mr-1 inline" />
                        Certificación
                      </Badge>
                    )}
                  </div>
                </div>
              </FormLabel>
              <FormControl>
                <Input type="date" {...field} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  }

  // Renderizar campo doble (izquierda/derecha)
  if (requiresSideValidation) {
    return (
      <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
        <div className="pb-2 border-b">
          <FormLabel className="text-base font-semibold block">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="flex-1">{label}</span>
              {isCritical && (
                <Badge variant="destructive" className="text-xs whitespace-nowrap">
                  CRÍTICO
                </Badge>
              )}
            </div>
          </FormLabel>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name={`${fieldName}_left`}
            render={({ field }) => {
              console.log('[CHECKLIST_DEBUG] FIELD RENDER - Left field:', {
                fieldName: `${fieldName}_left`,
                fieldValue: field.value,
                label,
              });
              return (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-muted-foreground">Izquierda</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        console.log('[CHECKLIST_DEBUG] SELECT CHANGE - Left field onChange:', {
                          fieldName: `${fieldName}_left`,
                          oldValue: field.value,
                          newValue: value,
                          label,
                        });
                        field.onChange(value);
                      }}
                      value={field.value}
                      disabled={readOnly}
                    >
                      <SelectTrigger>
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
            control={form.control}
            name={`${fieldName}_right`}
            render={({ field }) => {
              console.log('[CHECKLIST_DEBUG] FIELD RENDER - Right field:', {
                fieldName: `${fieldName}_right`,
                fieldValue: field.value,
                label,
              });
              return (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-muted-foreground">Derecha</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        console.log('[CHECKLIST_DEBUG] SELECT CHANGE - Right field onChange:', {
                          fieldName: `${fieldName}_right`,
                          oldValue: field.value,
                          newValue: value,
                          label,
                        });
                        field.onChange(value);
                      }}
                      value={field.value}
                      disabled={readOnly}
                    >
                      <SelectTrigger>
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
      </div>
    );
  }

  // Renderizar campo select
  if (item.input_type === 'select') {
    return (
      <div className="border rounded-lg p-4 bg-muted/20">
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => {
            console.log('[CHECKLIST_DEBUG] FIELD RENDER - Select field:', {
              fieldName,
              fieldValue: field.value,
              fieldValueType: typeof field.value,
              label,
            });
            return (
              <FormItem>
                <FormLabel className="text-base font-semibold mb-3 block">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="flex-1">{label}</span>
                    {isCritical && (
                      <Badge variant="destructive" className="text-xs whitespace-nowrap">
                        CRÍTICO
                      </Badge>
                    )}
                  </div>
                </FormLabel>
                <FormControl>
                  <Select
                    onValueChange={(value) => {
                      console.log('[CHECKLIST_DEBUG] SELECT CHANGE - Select field onChange:', {
                        fieldName,
                        oldValue: field.value,
                        oldValueType: typeof field.value,
                        newValue: value,
                        newValueType: typeof value,
                        label,
                      });
                      field.onChange(value);
                    }}
                    value={field.value}
                    disabled={readOnly}
                  >
                    <SelectTrigger>
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
    );
  }

  // Renderizar campo de texto
  if (item.input_type === 'text') {
    return (
      <div className="border rounded-lg p-4 bg-muted/20">
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold mb-3 block">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="flex-1">{label}</span>
                  {isCritical && (
                    <Badge variant="destructive" className="text-xs whitespace-nowrap">
                      CRÍTICO
                    </Badge>
                  )}
                </div>
              </FormLabel>
              <FormControl>
                <Input {...field} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  }

  // Renderizar campo numérico
  if (item.input_type === 'number') {
    return (
      <div className="border rounded-lg p-4 bg-muted/20">
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold mb-3 block">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="flex-1">{label}</span>
                  {isCritical && (
                    <Badge variant="destructive" className="text-xs whitespace-nowrap">
                      CRÍTICO
                    </Badge>
                  )}
                </div>
              </FormLabel>
              <FormControl>
                <Input type="number" {...field} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  }

  // Por defecto, renderizar como radio group (B/M)
  return (
    <div className="border rounded-lg p-4 bg-muted/20">
      <FormField
        control={form.control}
        name={fieldName}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base font-semibold mb-3 block">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="flex-1">{label}</span>
                {isCritical && (
                  <Badge variant="destructive" className="text-xs whitespace-nowrap">
                    CRÍTICO
                  </Badge>
                )}
              </div>
            </FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="flex flex-col sm:flex-row gap-4 sm:gap-6"
                disabled={readOnly}
              >
                {options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${fieldName}-${option}`} disabled={readOnly} />
                    <label htmlFor={`${fieldName}-${option}`} className={readOnly ? '' : 'cursor-pointer'}>
                      {getOptionLabel(option)}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

/**
 * Componente principal del formulario de checklist normalizado
 */
export function NormalizedChecklistForm({
  shouldDisabledInputs = true,
  template,
  equipments,
  currentUser,
  defaultEquipmentId,
  defaultAnswers,
  readOnly = false,
  defaultEmployeeId,
  defaultEmployeeName,
  defaultKilometer,
}: NormalizedChecklistFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [criticalItemsFailed, setCriticalItemsFailed] = useState<string[]>([]);
  const [showDeviationsModal, setShowDeviationsModal] = useState(false);
  const [pendingDeviations, setPendingDeviations] = useState<any[]>([]);
  const [repairTypes, setRepairTypes] = useState<TypeOfRepair>([]);
  const [currentEquipmentId, setCurrentEquipmentId] = useState<string | undefined>(defaultEquipmentId);

  // Generar schema y valores por defecto
  const schema = useMemo(() => generateChecklistSchema(template), [template]);
  const defaultValues = useMemo(
    () => generateDefaultValues(template, defaultAnswers, defaultEquipmentId, defaultEmployeeName, defaultKilometer),
    [template, defaultAnswers, defaultEquipmentId, defaultEmployeeName, defaultKilometer]
  );

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onSubmit', // Validar solo al hacer submit la primera vez
    reValidateMode: 'onBlur', // Re-validar solo el campo específico cuando el usuario sale de él
  });

  console.log('[CHECKLIST_DEBUG] FORM INIT - Schema keys:', Object.keys(schema.shape || {}));
  console.log('[CHECKLIST_DEBUG] FORM INIT - Default values keys:', Object.keys(defaultValues));
  console.log(
    '[CHECKLIST_DEBUG] FORM INIT - Default values sample (first 10):',
    Object.fromEntries(Object.entries(defaultValues).slice(0, 10))
  );

  // Ordenar secciones por order_index
  const sortedSections = [...(template.checklist_template_sections || [])].sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  );

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setIsSubmitting(true);
    setCriticalItemsFailed([]);

    try {
      // Validar items críticos - estructura más detallada para crear desvíos
      const failedCriticalItems: Array<{ item_code: string; item_label: string; section_code: string }> = [];
      sortedSections.forEach((section) => {
        const sectionCode = section.code || section.section?.code || `section_${section.id}`;
        section.checklist_template_items?.forEach((item) => {
          if (item.is_critical) {
            const itemCode = item.code || `item_${item.id}`;
            const fieldName = `${sectionCode}__${itemCode}`;

            if (isSideValidationItem(item)) {
              const leftValue = data[`${fieldName}_left`];
              const rightValue = data[`${fieldName}_right`];
              if (leftValue === 'M' || rightValue === 'M') {
                failedCriticalItems.push({
                  item_code: itemCode,
                  item_label: item.label || itemCode,
                  section_code: sectionCode,
                });
              }
            } else {
              const value = data[fieldName];
              if (value === 'M' || value === false || value === 'false') {
                failedCriticalItems.push({
                  item_code: itemCode,
                  item_label: item.label || itemCode,
                  section_code: sectionCode,
                });
              }
            }
          }
        });
      });

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
      const { CreateChecklistAnswer, UpdateVehicleKilometerAnonymous } = await import('@/app/server/UPDATE/actions');

      // Obtener el kilometraje original del equipo
      const selectedEquipment = equipments.find((eq) => eq.value === data.equipment_id);
      const originalKilometer = selectedEquipment?.kilometer ?? '0';
      const newKilometer = data.kilometraje || originalKilometer;

      // Si el kilometraje cambió, actualizarlo en el equipo
      if (newKilometer !== originalKilometer && data.equipment_id) {
        try {
          await UpdateVehicleKilometerAnonymous(data.equipment_id, newKilometer);
        } catch (error) {
          console.error('Error updating vehicle kilometer:', error);
          // No bloqueamos el guardado del checklist si falla la actualización del kilometraje
        }
      }

      const checklistAnswer = await CreateChecklistAnswer(template.id, {
        equipment_id: data.equipment_id,
        employee_id: defaultEmployeeId,
        chofer: data.chofer,
        fecha: data.fecha,
        hora: data.hora,
        kilometraje: data.kilometraje,
        observaciones: data.observaciones,
        answers: answersBySection,
        critical_items_failed: failedCriticalItems,
      });

      setCurrentEquipmentId(data.equipment_id);

      if (failedCriticalItems.length > 0) {
        setCriticalItemsFailed(failedCriticalItems.map((item) => item.item_label));

        // Obtener los desvíos creados y los tipos de reparación para el modal
        try {
          const [deviations, types] = await Promise.all([
            getPendingDeviations(data.equipment_id),
            fetchAllTypesOfRepairs(),
          ]);

          setPendingDeviations(deviations);
          setRepairTypes(types as TypeOfRepair);
          setShowDeviationsModal(true);
          // NO redirigir aquí, esperar a que el modal se cierre

          const { toast } = await import('sonner');
          toast.success('Checklist guardado', {
            description: `Se detectaron ${failedCriticalItems.length} items críticos con fallos. Por favor, genera las solicitudes de reparación.`,
          });
        } catch (error) {
          console.error('Error fetching deviations or repair types:', error);
          const { toast } = await import('sonner');
          toast.success('Checklist guardado', {
            description: `Se detectaron ${failedCriticalItems.length} items críticos con fallos`,
          });

          // Si no se puede cargar el modal, redirigir normalmente
          setTimeout(() => {
            router.push(`/maintenance/equipment/${data.equipment_id}/checklists`);
            router.refresh();
          }, 1500);
        }
      } else {
        const { toast } = await import('sonner');
        toast.success('Checklist guardado correctamente');

        // Redirigir a la página de checklists del equipo
        setTimeout(() => {
          router.push(`/maintenance/equipment/${data.equipment_id}/checklists`);
          router.refresh();
        }, 1500);
      }
    } catch (error) {
      console.error('Error al guardar el checklist:', error);
      // TODO: Mostrar toast de error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.log('[CHECKLIST_DEBUG] SUBMIT - Invalid submission errors:', errors);
          console.log('[CHECKLIST_DEBUG] SUBMIT - Invalid submission values:', form.getValues());
        })}
        className="space-y-6"
      >
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
                {' '}
                <CardHeader>
                  <CardTitle>Información General</CardTitle>
                </CardHeader>
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-4 text-balance">
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="equipment_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipo</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value} disabled={shouldDisabledInputs}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar equipo" />
                            </SelectTrigger>
                            <SelectContent>
                              {equipments.map((equipment) => (
                                <SelectItem key={equipment.value} value={equipment.value}>
                                  {equipment.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="chofer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chofer</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Nombre del chofer" disabled={shouldDisabledInputs} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="kilometraje"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kilometraje</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Kilometraje actual" disabled={readOnly} type="number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
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
                      control={form.control}
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
                    control={form.control}
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

        <Accordion
          type="single"
          collapsible
          className="w-full space-y-6"
          // defaultValue={sortedSections.map(section => section.id || '')}
        >
          {/* Secciones del checklist */}
          {sortedSections.map((section) => {
            const sectionCode = section.code || section.section?.code || `section_${section.id}`;
            const sectionName = section.name || section.section?.name || 'Sin nombre';
            const sectionDescription = section.section?.description || null;

            // Log para debug
            console.log(`[CHECKLIST_DEBUG] Sección: ${sectionName}`, {
              sectionId: section.id,
              sectionCode,
              totalItems: section.checklist_template_items?.length || 0,
              items: section.checklist_template_items?.map((item) => ({
                id: item.id,
                code: item.code,
                label: item.label,
                order_index: item.order_index,
              })),
            });

            // Ordenar items por order_index y eliminar duplicados por ID
            const allItems = section.checklist_template_items || [];
            console.log(`[CHECKLIST_DEBUG] Items antes de eliminar duplicados:`, allItems.length);

            const uniqueItems = Array.from(new Map(allItems.map((item) => [item.id, item])).values());
            console.log(`[CHECKLIST_DEBUG] Items después de eliminar duplicados:`, uniqueItems.length);

            const sortedItems = uniqueItems.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

            console.log(
              `[CHECKLIST_DEBUG] Items ordenados:`,
              sortedItems.map((item) => ({
                code: item.code,
                label: item.label,
                order_index: item.order_index,
              }))
            );

            return (
              <Card key={section.id}>
                <AccordionItem className="pr-5" value={section.id}>
                  <AccordionTrigger>
                    <CardHeader className="text-start ">
                      <CardTitle>{sectionName}</CardTitle>
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

      {/* Modal para generar solicitudes de reparación desde desvíos */}
      {currentEquipmentId && (
        <CriticalDeviationsRepairModal
          isOpen={showDeviationsModal}
          onClose={() => {
            setShowDeviationsModal(false);
            // Redirigir hacia atrás después de cancelar (mostrará el mensaje de desvíos pendientes)
            router.back();
            router.refresh();
          }}
          onComplete={() => {
            setShowDeviationsModal(false);
            // Redirigir hacia atrás después de completar (NO mostrará el mensaje de desvíos pendientes porque se generaron las solicitudes)
            router.back();
            router.refresh();
          }}
          deviations={pendingDeviations.map((d) => ({
            id: d.id,
            item_code: d.item_code,
            item_label: d.item_label,
            section_code: d.section_code,
            created_at: d.created_at,
          }))}
          equipmentId={currentEquipmentId}
          repairTypes={repairTypes}
        />
      )}
    </Form>
  );
}
