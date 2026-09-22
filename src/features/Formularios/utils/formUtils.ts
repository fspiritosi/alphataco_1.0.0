import { FormField } from '@/shared/types/legacy';
import { z } from 'zod';

/**
 * Campo de un `custom_form.form` (JSON legacy, sin schema en la base).
 * Los formularios personalizados los arma el usuario, así que el JSON es abierto: se
 * describe acá lo que el constructor consume y todo es opcional.
 */
type LegacyFormCampo = {
  id: string;
  tipo: string;
  title: string;
  value?: string;
  placeholder?: string;
  opciones?: string[];
  date?: boolean;
  observation?: boolean;
  required?: boolean;
  sectionCampos?: unknown;
};

/** Elemento de entrada: una sección del constructor (preview) o la fila de `custom_form`. */
type LegacyFormInput = {
  id?: string;
  name?: string;
  value?: string;
  tipo?: string;
  title?: string;
  form?: unknown;
  sectionCampos?: unknown;
};

const asCampos = (value: unknown): LegacyFormCampo[] => (Array.isArray(value) ? (value as LegacyFormCampo[]) : []);

export const buildFormData = (
  campos: Array<LegacyFormInput | null | undefined> | null | undefined,
  isPreview: boolean
): FormField[] => {
  const formArray: FormField[] = [];

  formArray.push({
    formName: 'Nombre del formulario',
    title: 'Nombre del formulario',
    value: isPreview ? campos?.[0]?.value : campos?.[0]?.name,
    tipo: 'Nombre del formulario',
    id: '',
    placeholder: '',
  });

  if (isPreview) {
    if (campos && campos?.length > 0) {
      asCampos(campos).forEach((campo) => {
        if (campo.tipo === 'Seccion') {
          formArray.push({
            formName: `inicio_seccion_${campo.title.replace(/ /g, '_')}`,
            title: '',
            value: campo.title,
            tipo: 'Titulo',
            id: '',
            placeholder: '',
          });
          asCampos(campo.sectionCampos).forEach((sectionCampo) => {
            formArray.push({
              formName: `${sectionCampo.title.replace(/ /g, '_')}`,
              title: `${sectionCampo.title.replace(/ /g, '_')}`,
              value: sectionCampo.value || '',
              tipo: sectionCampo.tipo,
              opciones: sectionCampo.opciones || [],
              id: sectionCampo.id,
              placeholder: sectionCampo.placeholder,
              date: sectionCampo.date,
              Observaciones: sectionCampo.observation,
            });

            if (sectionCampo.observation) {
              formArray.push({
                formName: `${sectionCampo.title.replace(/ /g, '_')}_observaciones`,
                title: `${sectionCampo.title.replace(/ /g, '_')}_observaciones`,
                value: '',
                tipo: 'Observaciones',
                id: sectionCampo.id,
                placeholder: sectionCampo.placeholder,
              });
            }
            if (sectionCampo.date) {
              formArray.push({
                formName: `${sectionCampo.title.replace(/ /g, '_')}_fecha`,
                title: `${sectionCampo.title.replace(/ /g, '_')}_fecha`,
                value: '',
                tipo: 'Fecha',
                id: sectionCampo.id,
                placeholder: sectionCampo.placeholder,
              });
            }
          });

          if (campo.date) {
            formArray.push({
              formName: `${campo.title.replace(/ /g, '_')}_fecha`,
              title: `${campo.title.replace(/ /g, '_')}_fecha`,
              value: '',
              tipo: 'SectionDate',
              id: campo.id,
              placeholder: campo.placeholder,
            });
          }

          if (campo.observation) {
            formArray.push({
              formName: `${campo.title.replace(/ /g, '_')}_observaciones`,
              title: `${campo.title.replace(/ /g, '_')}_observaciones`,
              value: '',
              tipo: 'SectionObservaciones',
              id: campo.id,
              placeholder: campo.placeholder,
            });
          }
          formArray.push({
            formName: `fin_seccion_${campo.title.replace(/ /g, '_')}`,
            title: '',
            value: '',
            tipo: 'Separador',
            id: '',
            placeholder: '',
          });
        }
      });
    }
  } else {
    if (campos && campos?.length > 0 && campos[0]?.form) {
      asCampos(campos[0].form).forEach((campo) => {
        if (campo.tipo === 'Seccion') {
          formArray.push({
            formName: `inicio_seccion_${campo.title.replace(/ /g, '_')}`,
            title: '',
            value: campo.title,
            tipo: 'Titulo',
            id: '',
            placeholder: '',
          });
          asCampos(campo.sectionCampos).forEach((sectionCampo) => {
            formArray.push({
              formName: `${sectionCampo.title.replace(/ /g, '_')}`,
              title: `${sectionCampo.title.replace(/ /g, '_')}`,
              value: sectionCampo.value || '',
              tipo: sectionCampo.tipo,
              opciones: sectionCampo.opciones || [],
              id: sectionCampo.id,
              placeholder: sectionCampo.placeholder,
              date: sectionCampo.date,
              Observaciones: sectionCampo.observation,
              required: sectionCampo.required,
            });

            if (sectionCampo.observation) {
              formArray.push({
                formName: `${sectionCampo.title.replace(/ /g, '_')}_observaciones`,
                title: `${sectionCampo.title.replace(/ /g, '_')}_observaciones`,
                value: '',
                tipo: 'Observaciones',
                id: sectionCampo.id,
                placeholder: sectionCampo.placeholder,
                required: sectionCampo.required,
              });
            }
            if (sectionCampo.date) {
              formArray.push({
                formName: `${sectionCampo.title.replace(/ /g, '_')}_fecha`,
                title: `${sectionCampo.title.replace(/ /g, '_')}_fecha`,
                value: '',
                tipo: 'Fecha',
                id: sectionCampo.id,
                placeholder: sectionCampo.placeholder,
                required: sectionCampo.required,
              });
            }
          });

          if (campo.date) {
            formArray.push({
              formName: `${campo.title.replace(/ /g, '_')}_fecha`,
              title: `${campo.title.replace(/ /g, '_')}_fecha`,
              value: '',
              tipo: 'SectionDate',
              id: campo.id,
              placeholder: campo.placeholder,
              required: campo.required,
            });
          }

          if (campo.observation) {
            formArray.push({
              formName: `${campo.title.replace(/ /g, '_')}_observaciones`,
              title: `${campo.title.replace(/ /g, '_')}_observaciones`,
              value: '',
              tipo: 'SectionObservaciones',
              id: campo.id,
              placeholder: campo.placeholder,
              required: campo.required,
            });
          }
          formArray.push({
            formName: `fin_seccion_${campo.title.replace(/ /g, '_')}`,
            title: '',
            value: '',
            tipo: 'Separador',
            id: '',
            placeholder: '',
          });
        }
      });
    }
  }

  return formArray;
};

export const buildFormSchema = (formObject: FormField[]) => {
  const formSchema: Record<string, z.ZodTypeAny> = {};

  formObject.forEach((campo) => {
    // `opciones` viene del JSON del formulario; z.enum pide una tupla no vacía.
    const opciones = (campo.opciones?.length ? campo.opciones : ['']) as [string, ...string[]];
    const formattedTitle = campo.title.replace(/ /g, '_');
    const displayTitle = campo.title.replace(/_/g, ' ');
    const isRequired = campo.required !== false; // Si no se especifica, se asume que es requerido

    switch (campo.tipo) {
      case 'Si-No':
        formSchema[formattedTitle] = isRequired
          ? z.enum(opciones, {
              required_error: `El campo "${displayTitle}" es obligatorio`,
              invalid_type_error: `El valor ingresado en "${displayTitle}" no es válido`,
            })
          : z
              .enum(opciones, {
                invalid_type_error: `El valor ingresado en "${displayTitle}" no es válido`,
              })
              .optional();
        break;

      case 'Archivo':
        formSchema[formattedTitle] = isRequired
          ? z
              .string({
                required_error: `El campo "${displayTitle}" es obligatorio`,
              })
              .min(1, `El campo "${displayTitle}" no puede estar vacío`)
          : z.string().min(1, `El campo "${displayTitle}" no puede estar vacío`).optional();
        break;
      case 'Texto':
        formSchema[formattedTitle] = isRequired
          ? z
              .string({
                required_error: `El campo "${displayTitle}" es obligatorio`,
              })
              .min(1, `El campo "${displayTitle}" no puede estar vacío`)
          : z.string().min(1, `El campo "${displayTitle}" no puede estar vacío`).optional();
        break;
      case 'Área de texto':
        formSchema[formattedTitle] = isRequired
          ? z
              .string({
                required_error: `El campo "${displayTitle}" es obligatorio`,
              })
              .min(1, `El campo "${displayTitle}" no puede estar vacío`)
          : z.string().min(1, `El campo "${displayTitle}" no puede estar vacío`).optional();
        break;
      case 'Radio':
        formSchema[formattedTitle] = isRequired
          ? z.enum(opciones, {
              required_error: `El campo "${displayTitle}" es obligatorio`,
              invalid_type_error: `El valor ingresado en "${displayTitle}" no es válido`,
            })
          : z
              .enum(opciones, {
                invalid_type_error: `El valor ingresado en "${displayTitle}" no es válido`,
              })
              .optional();
        break;
      case 'Seleccion multiple':
        formSchema[formattedTitle] = isRequired
          ? z
              .array(
                z.string({
                  required_error: `El campo "${displayTitle}" es obligatorio`,
                }),
                {
                  required_error: `El campo "${displayTitle}" es obligatorio`,
                }
              )
              .min(1, `El campo "${displayTitle}" no puede estar vacío`)
          : z.array(z.string()).min(1, `El campo "${displayTitle}" no puede estar vacío`).optional();
        break;
      case 'Fecha':
        formSchema[formattedTitle] = isRequired
          ? z.date({
              required_error: `El campo "${displayTitle}" es obligatorio`,
              invalid_type_error: `El valor ingresado en "${displayTitle}" no es válido`,
            })
          : z.string().optional();
        break;
      case 'Seleccion':
        formSchema[formattedTitle] = isRequired
          ? z.string({
              required_error: `Por favor, selecciona una opción para el campo "${displayTitle}"`,
            })
          : z.string().optional();
        break;
      case 'Seleccion Predefinida':
        formSchema[formattedTitle] = isRequired
          ? z.string({
              required_error: `Por favor, selecciona una opción para el campo "${displayTitle}"`,
            })
          : z.string().optional();
        break;
      case 'Observaciones':
        formSchema[`${formattedTitle}`] = isRequired
          ? z
              .string({
                required_error: `El campo "${displayTitle}" es obligatorio`,
              })
              .min(1, `El campo "${displayTitle} - Observaciones" no puede estar vacío`)
          : z.string().min(1, `El campo "${displayTitle} - Observaciones" no puede estar vacío`).optional();
      case 'SectionDate':
        formSchema[formattedTitle] = isRequired
          ? z.string({
              required_error: `El campo "${displayTitle}" es obligatorio`,
            })
          : z.string().optional();
        break;
      case 'SectionObservaciones':
        formSchema[`${formattedTitle}`] = isRequired
          ? z
              .string({
                required_error: `El campo "${displayTitle}" es obligatorio`,
              })
              .min(1, `El campo "${displayTitle} - Observaciones" no puede estar vacío`)
          : z.string().min(1, `El campo "${displayTitle} - Observaciones" no puede estar vacío`).optional();
        break;
      default:
        break;
    }
  });

  const finalFormSchema = z.object(formSchema);
  return finalFormSchema;
};
