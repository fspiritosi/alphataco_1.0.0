/**
 * Fuerza `company_id` en un `where` de Prisma.
 *
 * Con Prisma (conexión directa) el RLS de Supabase NO aplica: este helper es la
 * única defensa contra fugas entre empresas en listados, conteos y facets.
 * Pisa cualquier `company_id` que traiga el `where` de entrada.
 */
export function withCompany<T extends object>(where: T | undefined, companyId: string): T & { company_id: string } {
  return { ...(where ?? ({} as T)), company_id: companyId };
}

/**
 * ────────────────────────────────────────────────────────────────────────────────
 * Criterio multi-empresa (cierre de P2, Task 13b)
 * ────────────────────────────────────────────────────────────────────────────────
 *
 * El plan de P2 pedía "una guarda que haga difícil escribir una query sin filtro de empresa" y
 * dejaba abierto si hacerla con una extensión de cliente Prisma (`$extends`) que exija
 * `company_id` en los modelos que lo tienen. **Se evaluó y se decidió NO hacerla.** El motivo no
 * es el costo: es que la guarda daría verde justo donde está el riesgo.
 *
 * Los números del código, al cierre de P2:
 *
 * - 61 modelos tienen `company_id`; los ~224 accesos a `documents_employees`,
 *   `documents_equipment`, `maintenance_order_items`, `maintenance_request_items`,
 *   `work_order_items` y `work_order_item_repairs` son a modelos que **NO** lo tienen y se
 *   acotan por relación (`{ employees: { company_id } }`, `{ vehicles: { company_id } }`,
 *   `{ maintenance_order_items: { maintenance_order_id } }`). Una extensión que se dispare
 *   "si el modelo tiene `company_id`" no los ve: pasan sin chistar. Y son exactamente las
 *   tablas donde aparecieron las fugas reales de este proyecto.
 * - 14 modelos tienen `company_id` NULLABLE porque conviven catálogos globales con los de cada
 *   empresa (`document_types` es el caso vivo), y hay ~30 lugares que consultan a propósito
 *   `company_id: null` o `OR: [{ company_id: null }, { company_id: X }]`. Una guarda de
 *   igualdad los rompe; una guarda que sólo exija "que `company_id` aparezca" se satisface
 *   escribiendo `company_id: undefined`, o sea no garantiza nada.
 * - 134 `findUnique` / `findUniqueOrThrow` van por PK y no pueden llevar `company_id` en el
 *   `where` salvo que exista una unique compuesta. Necesitarían escape hatch, y un escape
 *   hatch que se usa 134 veces deja de ser la excepción.
 * - `$allModels.$allOperations` ve los args del nivel superior: el perímetro de una lectura
 *   anidada (`include` / `select`) o de un write anidado le queda invisible.
 *
 * Además, el invariante que P2 realmente necesita no es "el `where` menciona `company_id`" sino
 * **"la empresa la pone el servidor, nunca el caller"** — una query con `company_id` que vino
 * del cliente satisface a la extensión y sigue siendo una fuga.
 *
 * Lo que SÍ sostiene el criterio (y es lo que se verifica):
 *
 * 1. `withCompany()` es la única forma de escribir el filtro cuando el modelo tiene
 *    `company_id`, y el `companyId` sale de `getActiveCompanyId()` o del recurso.
 * 2. Los modelos sin `company_id` se acotan por su relación dueña, en los módulos de perímetro
 *    de cada feature (`MaintenanceOrders/actions/order-perimeter`, `Gomeria/shared/perimeter`,
 *    `Clothing/actions/perimeter`, …), no en cada action suelta.
 * 3. Cuando el id de empresa llega por ruta o por props (`/dashboard/configuration/companies/[id]`), la action
 *    valida pertenencia con `assertCompanyAccess()` antes de tocar la base.
 * 4. El chequeo mecánico es sobre las FIRMAS, no sobre los `where`: ninguna Server Action
 *    exportada acepta `companyId` / `company_id` del caller sin `assertCompanyAccess()`. Eso se
 *    puede barrer con grep sobre los `export` de los módulos `'use server'`, que es el barrido
 *    con el que se cerró P2.
 */
