/**
 * Secciones de checklist que aplican a la UNIDAD ENGANCHADA (acoplado / semirremolque)
 * y NO a la unidad tractora.
 *
 * Por que existe este archivo
 * ---------------------------
 * Un checklist de una unidad tractora con enganche describe DOS equipos: la unidad
 * tractora (secciones genericas + la especifica del chasis) y la unidad que se
 * remolca (una seccion propia). Hoy la base de datos no distingue una cosa de la
 * otra: `checklist_template_sections` no tiene ninguna columna que marque a que
 * unidad aplica cada seccion, y `is_specific` significa otra cosa (seccion propia
 * de la plantilla vs. seccion reusable), ademas de no usarse en ningun lado.
 *
 * Consecuencias de no distinguirlas (ticket 677):
 *  1. La seccion del enganche se muestra siempre, incluso cuando el operario no
 *     declaro que unidad lleva enganchada -> queda huerfana.
 *  2. Los desvios de esa seccion se imputan a la patente de la unidad tractora,
 *     asi que el gasto del acoplado termina cargado al camion.
 *
 * De donde salen estos codigos
 * ----------------------------
 * De las plantillas cargadas por el cliente. Se verificaron item por item: todas
 * las secciones listadas contienen exclusivamente items del remolque (lanza de
 * remolque, perno de enganche/mesada, patas de apoyo, triler de luces y de aire,
 * conector ESP, valvulas de descarga).
 *
 * Deuda conocida: esto deberia vivir en la base como una columna
 * `applies_to_hitch` de `checklist_template_sections`, editable por el cliente
 * junto con el resto de la configuracion de la plantilla. Mientras esa columna no
 * exista, este set es la unica fuente de verdad y hay que agregar aca cualquier
 * plantilla nueva que lleve enganche.
 */
export const HITCH_SECTION_CODES: ReadonlySet<string> = new Set([
  // Plantilla "Porta Acopl" — acoplado porta contenedor
  'acoplado_porta_contenedor',
  // Plantilla "Eq Vacio C semi" — semirremolque de vacio
  'semi_remolque_vacio',
  // Plantilla "Vactor" — semirremolque vactor
  'semi_remolque_vactor',
  // NOTA: "carreton_petrolero" (plantilla "Carreton petrol") quedo deliberadamente
  // afuera: mezcla items del carreton (perno de enganche/mesada, patas de apoyo,
  // triler de luces y de aire) con items del malacate montado sobre la tractora
  // (cable de acero, comando hidraulico, motor a explosion). Marcarla entera como
  // enganche esconderia 34 items que hoy se completan siempre. Definir con el
  // cliente si se separa en dos secciones antes de sumarla.
]);

/** Indica si una seccion del checklist describe la unidad enganchada y no la tractora. */
export function isHitchSectionCode(sectionCode: string | null | undefined): boolean {
  return !!sectionCode && HITCH_SECTION_CODES.has(sectionCode);
}
