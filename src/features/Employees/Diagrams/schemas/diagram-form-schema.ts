import moment from 'moment';
import { z } from 'zod';

/**
 * Schema del formulario de carga de diagramas (subtab "Cargar Diagrama").
 *
 * Vive fuera del componente para no reconstruirse en cada render y para poder
 * compartir el tipo inferido con los componentes hijos del formulario.
 */
export const diagramFormSchema = z
  .object({
    date_from: z.date({
      required_error: 'Ingresá la fecha de inicio (DD/MM/AAAA)',
      invalid_type_error: 'Ingresá la fecha de inicio (DD/MM/AAAA)',
    }),
    date_to: z.date({
      required_error: 'Ingresá la fecha de finalización (DD/MM/AAAA)',
      invalid_type_error: 'Ingresá la fecha de finalización (DD/MM/AAAA)',
    }),
    // El combobox devuelve `['']` al deseleccionar (click sobre el item ya elegido),
    // asi que no alcanza con validar el largo del array: el id tambien tiene que tener valor.
    employee_id: z
      .array(z.string().min(1, 'Por favor selecciona un empleado'), {
        required_error: 'Por favor selecciona un empleado',
      })
      .min(1, 'Por favor selecciona un empleado'),
    diagram_type: z
      .array(z.string().min(1, 'Por favor selecciona un tipo de novedad'), {
        required_error: 'Por favor selecciona un tipo de novedad',
      })
      .min(1, 'Por favor selecciona un tipo de novedad'),
    /** Comentario general de la carga. Se replica en todos los días del rango. */
    comments: z.string().optional(),
    /** Habilita editar el comentario día por día en las tablas de resultados. */
    customize_comments: z.boolean(),
  })
  .refine((data) => moment(data.date_from).isSameOrBefore(moment(data.date_to), 'day'), {
    message: 'La fecha de finalización no puede ser anterior a la fecha de inicio',
    path: ['date_to'],
  });

export type DiagramFormValues = z.infer<typeof diagramFormSchema>;
