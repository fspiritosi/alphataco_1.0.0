/**
 * Serializadores compartidos por las actions de gestión de taller.
 *
 * Vive en un módulo SIN directiva: un archivo `'use server'` solo puede exportar funciones
 * async, y esto es una función sincrónica que consumen las queries y el preview.
 */

/**
 * `other_equipment.horometer` es un Decimal de Prisma: como instancia de clase no
 * sobrevive el limite server → client de los Server Actions, asi que viaja como texto.
 */
export function serializeOtherEquipment<T extends { horometer: { toString(): string } | null }>(equipment: T) {
  return { ...equipment, horometer: equipment.horometer?.toString() ?? null };
}
