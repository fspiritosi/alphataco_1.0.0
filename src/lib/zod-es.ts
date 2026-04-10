import { z } from 'zod';

/**
 * ErrorMap global de zod en español.
 *
 * Traduce los mensajes por defecto que zod emite cuando no se especifica un mensaje
 * custom (ej: `Required`, `Invalid email`, etc). Los mensajes custom definidos en
 * los schemas (via `.min(1, 'X es requerido')`) siguen teniendo prioridad sobre esto.
 *
 * Para activarlo, este archivo DEBE importarse una sola vez al inicio de la app
 * — se hace en `src/app/layout.tsx`.
 */
const esErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type: {
      if (issue.received === 'undefined' || issue.received === 'null') {
        return { message: 'Este campo es requerido' };
      }
      return { message: `Tipo inválido: se esperaba ${issue.expected}` };
    }

    case z.ZodIssueCode.invalid_literal:
      return { message: 'Valor inválido' };

    case z.ZodIssueCode.unrecognized_keys:
      return { message: `Claves no reconocidas: ${issue.keys.join(', ')}` };

    case z.ZodIssueCode.invalid_union:
    case z.ZodIssueCode.invalid_union_discriminator:
      return { message: 'Valor inválido' };

    case z.ZodIssueCode.invalid_enum_value:
      return { message: `Opción inválida. Valores permitidos: ${issue.options.join(', ')}` };

    case z.ZodIssueCode.invalid_arguments:
      return { message: 'Argumentos inválidos' };

    case z.ZodIssueCode.invalid_return_type:
      return { message: 'Tipo de retorno inválido' };

    case z.ZodIssueCode.invalid_date:
      return { message: 'Fecha inválida' };

    case z.ZodIssueCode.invalid_string: {
      if (typeof issue.validation === 'object') {
        if ('includes' in issue.validation) {
          return { message: `Debe incluir "${issue.validation.includes}"` };
        }
        if ('startsWith' in issue.validation) {
          return { message: `Debe comenzar con "${issue.validation.startsWith}"` };
        }
        if ('endsWith' in issue.validation) {
          return { message: `Debe terminar con "${issue.validation.endsWith}"` };
        }
      }
      switch (issue.validation) {
        case 'email':
          return { message: 'Email inválido' };
        case 'url':
          return { message: 'URL inválida' };
        case 'uuid':
          return { message: 'UUID inválido' };
        case 'regex':
          return { message: 'Formato inválido' };
        case 'datetime':
          return { message: 'Fecha y hora inválidas' };
        default:
          return { message: 'Texto inválido' };
      }
    }

    case z.ZodIssueCode.too_small: {
      const noun = issue.type === 'array' ? 'elementos' : issue.type === 'string' ? 'caracteres' : '';
      if (issue.type === 'string' && issue.minimum === 1) {
        return { message: 'Este campo es requerido' };
      }
      if (issue.exact) {
        return { message: `Debe tener exactamente ${issue.minimum} ${noun}` };
      }
      if (issue.inclusive) {
        return { message: `Debe tener al menos ${issue.minimum} ${noun}` };
      }
      return { message: `Debe ser mayor a ${issue.minimum} ${noun}` };
    }

    case z.ZodIssueCode.too_big: {
      const noun = issue.type === 'array' ? 'elementos' : issue.type === 'string' ? 'caracteres' : '';
      if (issue.exact) {
        return { message: `Debe tener exactamente ${issue.maximum} ${noun}` };
      }
      if (issue.inclusive) {
        return { message: `Debe tener como máximo ${issue.maximum} ${noun}` };
      }
      return { message: `Debe ser menor a ${issue.maximum} ${noun}` };
    }

    case z.ZodIssueCode.custom:
      return { message: issue.message ?? 'Valor inválido' };

    case z.ZodIssueCode.invalid_intersection_types:
      return { message: 'Valores incompatibles' };

    case z.ZodIssueCode.not_multiple_of:
      return { message: `Debe ser múltiplo de ${issue.multipleOf}` };

    case z.ZodIssueCode.not_finite:
      return { message: 'Debe ser un número finito' };

    default:
      return { message: ctx.defaultError };
  }
};

z.setErrorMap(esErrorMap);
