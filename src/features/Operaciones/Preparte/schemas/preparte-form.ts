/**
 * Schema Zod del formulario de pedido (preparte) y el tipo de sus valores.
 *
 * Vive fuera del componente `'use client'` a propósito: un schema definido en un módulo
 * de cliente llega al servidor como referencia y falla en runtime con `parse is not a function`.
 */

import * as z from 'zod';

// Esquema de validación con Zod
// PP-3: jornada, tipo, observaciones y fecha ahora son por ítem
export const formSchema = z
  .object({
    id: z.string(),
    cliente_id: z.string().min(1, 'Por favor selecciona un cliente'),
    contrato_id: z.string().min(1, 'Por favor selecciona un contrato'),
    item: z
      .array(
        z.object({
          id: z.string(),
          quantity: z.number().min(1, 'La cantidad debe ser al menos 1'),
          // PP-3: Campos por ítem
          jornada: z.string().min(1, 'La jornada es requerida'),
          tipo: z.string().min(1, 'El tipo es requerido'),
          observaciones: z.string().optional(),
          start_time: z.string().optional(),
          end_time: z.string().optional(),
          executionDate: z
            .object({
              from: z.date().optional(),
              to: z.date().optional(),
            })
            .optional(),
          subject_to_availability: z.boolean().default(false),
        })
      )
      .min(1, 'Por favor selecciona al menos un ítem'),
    requestDate: z.date({
      required_error: 'La fecha de solicitud es requerida',
    }),
    solicitante: z.string().min(1, 'El solicitante es requerido'),
    status: z
      .enum(['pendiente', 'reprogramado', 'cancelado', 'rechazado', 'confirmado', 'vencido'])
      .default('pendiente'),
    cancel_reason: z.string().optional(),
    rejected_reason: z.string().optional(),
    reprogram_reason: z.string().optional(),
    reprogram: z.date().optional(),
    quantity: z.number().optional(),
    numero_pedido: z.string().optional(),
    sector_service_id: z.string().uuid('Sector inválido').optional().or(z.literal('')),
    areas_service_id: z.string({ required_error: 'Área del cliente es obligatoria' }).uuid('Área inválida'),
    equipos_cliente: z.array(z.string().uuid()).optional().default([]),
    image_url: z.string().optional(),
    // Campo para registrar motivo de cambio de item (solo en edición)
    item_change_reason: z.string().optional(),
    // Guardar el item original para detectar cambios
    original_item_id: z.string().optional(),
  })
  .refine(
    (data) => data.status !== 'reprogramado' || (data.reprogram !== undefined && data.reprogram instanceof Date),
    {
      message: "Debe proporcionar una fecha válida de reprogramación cuando el estado es 'reprogramado'",
      path: ['reprogram'],
    }
  )
  .refine(
    (data) => data.status !== 'cancelado' || (data.cancel_reason !== undefined && data.cancel_reason.trim().length > 0),
    {
      message: "La razón de cancelación es obligatoria cuando el estado es 'cancelado'",
      path: ['cancel_reason'],
    }
  )
  .refine(
    (data) =>
      data.status !== 'rechazado' || (data.rejected_reason !== undefined && data.rejected_reason.trim().length > 0),
    {
      message: "La razón de rechazo es obligatoria cuando el estado es 'rechazado'",
      path: ['rejected_reason'],
    }
  )
  .refine(
    (data) =>
      data.status !== 'reprogramado' ||
      (data.reprogram_reason !== undefined && data.reprogram_reason.trim().length > 0),
    {
      message: "La razón del reprogramado es obligatoria cuando el estado es 'reprogramado'",
      path: ['reprogram_reason'],
    }
  )
  // PP-3: Validar que cada ítem tenga jornada seleccionada
  .refine(
    (data) => {
      return data.item.every((item) => item.id === '' || item.jornada !== '');
    },
    {
      message: 'Todos los ítems deben tener una jornada seleccionada',
      path: ['item'],
    }
  )
  // PP-3: Validar que cada ítem tenga tipo de servicio seleccionado
  .refine(
    (data) => {
      return data.item.every((item) => item.id === '' || item.tipo !== '');
    },
    {
      message: 'Todos los ítems deben tener un tipo de servicio seleccionado',
      path: ['item'],
    }
  )
  // PP-3: Validar que cada ítem que NO esté sujeto a disponibilidad tenga fecha de ejecución
  .refine(
    (data) => {
      return data.item.every((item) => {
        if (item.id === '' || item.subject_to_availability) return true;
        return item.executionDate?.from !== undefined;
      });
    },
    {
      message: 'Todos los ítems deben tener fecha de ejecución o estar sujetos a disponibilidad',
      path: ['item'],
    }
  );
export type PreparteFormData = z.infer<typeof formSchema>;
/** Alias histórico del tipo de valores del formulario. */
export type PreparteItem = PreparteFormData;
