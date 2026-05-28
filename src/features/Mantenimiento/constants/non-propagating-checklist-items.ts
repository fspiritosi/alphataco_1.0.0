/**
 * Items de checklist que NO deben propagarse a taller.
 *
 * Cuando un desvío de checklist cae en alguno de estos pares (templateId, itemCode),
 * la solicitud de mantenimiento aún se genera y aparece en validate (paso 1 de
 * Operaciones) como información para el supervisor, pero al aprobar la solicitud
 * estos items NO se convierten en `maintenance_order_items` — quedan ahí.
 *
 * El mapeo viene de la matriz acordada con Operaciones: 8 checklist templates × ~19
 * ítems numerados (correlativo global del PDF). Los códigos se resolvieron una vez
 * desde la BD ordenando por section.order_index + item.order_index para que la lista
 * sea robusta ante futuros reordenamientos.
 *
 * Si se agrega/modifica un template afectado, actualizar este archivo. La lista vive
 * en código (no en BD) por pedido explícito del usuario.
 */

export const NON_PROPAGATING_CHECKLIST_ITEMS: Record<string, ReadonlySet<string>> = {
  // Pick up
  '75643d61-d721-4ee6-9018-b9accf2b0b51': new Set([
    'limpieza',
    'carteleria_seguridad',
    'bandas_reflectivas_laterales',
    'bandas_reflectivas_delanteras_traseras',
    'freno_bigote',
    'extintor_vacio_1',
    'extintor_2',
    'check_point_llantas',
    'balizas_triangulares',
    'barra_remolque',
    'botiquin_primeros_auxilios',
    'arresta_llamas',
    'calzas_bloqueo',
    'conos_reflectivos',
    'baldes_arena',
    'kit_anti_derrame',
    'llaves_rueda_palancas',
    'crique_hidraulico',
    'kit_herramientas',
  ]),
  // Testeo
  'cd519227-9114-4659-8284-28ee453c6963': new Set([
    'limpieza',
    'carteleria_seguridad',
    'bandas_reflectivas_laterales',
    'bandas_reflectivas_delanteras_traseras',
    'freno_bigote',
    'extintor_vacio_1',
    'extintor_2',
    'check_point_llantas',
    'balizas_triangulares',
    'barra_remolque',
    'botiquin_primeros_auxilios',
    'arresta_llamas',
    'calzas_bloqueo',
    'conos_reflectivos',
    'baldes_arena',
    'kit_anti_derrame',
    'llaves_rueda_palancas',
    'crique_hidraulico',
    'kit_herramientas',
  ]),
  // Camilla
  '9d17a7f0-390f-42fa-865d-ca05882a0a45': new Set([
    'limpieza',
    'carteleria_seguridad',
    'bandas_reflectivas_laterales',
    'bandas_reflectivas_delanteras_traseras',
    'freno_bigote',
    'extintor_2',
    'extintor_1',
    'check_point_llantas',
    'balizas_triangulares',
    'barra_remolque',
    'botiquin_primeros_auxilios',
    'arresta_llamas',
    'calzas_bloqueo',
    'conos_reflectivos',
    'baldes_arena',
    'kit_anti_derrame',
    'llaves_rueda_palancas',
    'crique_hidraulico',
    'kit_herramientas',
  ]),
  // EQ Lavado
  '97f01902-6361-4cad-8e79-0ec943dc4d06': new Set([
    'limpieza',
    'carteleria_seguridad',
    'bandas_reflectivas_laterales',
    'bandas_reflectivas_delanteras_traseras',
    'freno_bigote',
    'extintor_1',
    'extintor_2',
    'check_point_llantas',
    'balizas_triangulares',
    'barra_remolque',
    'botiquin_primeros_auxilios',
    'arresta_llamas',
    'calzas_bloqueo',
    'conos_reflectivos',
    'baldes_arena',
    'kit_anti_derrame',
    'llaves_rueda_palancas',
    'crique_hidraulico',
    'kit_herramientas',
  ]),
  // Porta Acopl
  'abe4ea8b-7ed5-4b53-8462-424a7ba4a899': new Set([
    'limpieza',
    'carteleria_seguridad',
    'bandas_reflectivas_laterales',
    'bandas_reflectivas_delanteras_traseras',
    'freno_bigote',
    'extintor_vacio_1',
    'extintor_2',
    'check_point_llantas',
    'balizas_triangulares',
    'barra_remolque',
    'botiquin_primeros_auxilios',
    'arresta_llamas',
    'calzas_bloqueo',
    'conos_reflectivos',
    'baldes_arena',
    'kit_anti_derrame',
    'llaves_rueda_palancas',
    'crique_hidraulico',
    'kit_herramientas',
  ]),
  // Eq Vacio C semi
  'cc2f27ad-ad1c-4ace-8285-f8ed36ddb135': new Set([
    'limpieza',
    'carteleria_seguridad',
    'bandas_reflectivas_laterales',
    'bandas_reflectivas_delanteras_traseras',
    'freno_bigote',
    'extintor_vacio_1',
    'extintor_2',
    'check_point_llantas',
    'balizas_triangulares',
    'barra_remolque',
    'botiquin_primeros_auxilios',
    'arresta_llamas',
    'calzas_bloqueo',
    'conos_reflectivos',
    'baldes_arena',
    'kit_anti_derrame',
    'llaves_rueda_palancas',
    'crique_hidraulico',
    'kit_herramientas',
  ]),
  // Tte Personal — usa codes específicos del template TTE
  'bc2308d0-ffec-4523-95af-8ced85af2714': new Set([
    'limpieza',
    'carteleria_seguridad',
    'bandas_reflectivas_laterales',
    'bandas_reflectivas_delanteras_traseras',
    'freno_bigote',
    'extintor_tte',
    'extintor_2_tte',
    'ventana_escape',
    'martillo_ventana',
    'balizas_triangulares_tte',
    'barra_remolque_tte',
    'botiquin_tte',
    'calzas_bloqueo_tte',
    'llaves_rueda_tte',
    'crique_hidraulico_tte',
    'kit_herramientas_tte',
    'cortinas',
    'habilitacion_transporte',
    'nomina_personal',
  ]),
  // Vactor
  'f4e7985e-8eb8-435d-bc68-467cd2a62fbe': new Set([
    'limpieza',
    'carteleria_seguridad',
    'bandas_reflectivas_laterales',
    'bandas_reflectivas_delanteras_traseras',
    'freno_bigote',
    'extintor_vacio_1',
    'extintor_2_vactor',
    'check_point_llantas',
    'balizas_triangulares',
    'barra_remolque',
    'botiquin_primeros_auxilios',
    'arresta_llamas',
    'calzas_bloqueo',
    'conos_reflectivos',
    'baldes_arena',
    'kit_anti_derrame',
    'llaves_rueda_palancas',
    'crique_hidraulico',
    'kit_herramientas',
  ]),
};

/**
 * Devuelve true si el par (templateId, itemCode) está marcado como "no propagable".
 * Cuando templateId o itemCode son null/undefined, retorna false (no se filtra).
 */
export function isNonPropagatingChecklistItem(
  templateId: string | null | undefined,
  itemCode: string | null | undefined
): boolean {
  if (!templateId || !itemCode) return false;
  return NON_PROPAGATING_CHECKLIST_ITEMS[templateId]?.has(itemCode) ?? false;
}
