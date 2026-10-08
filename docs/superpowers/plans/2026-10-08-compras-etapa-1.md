# Compras — Etapa 1 (proveedores y solicitudes de compra) — Plan de implementación

> **Para quien lo ejecute:** se implementa tarea por tarea, en orden. Cada tarea termina con su verificación. No se commitea sin pedido explícito del usuario.

**Objetivo:** ficha de proveedores (contactos, rubros, pago, banco, documentos con vencimiento) y solicitudes de compra con aprobación de un nivel, generables también desde un pedido de Almacenes.

**Arquitectura:** módulo nuevo `src/features/Purchases/` con tablas propias. Copia los patrones de Almacenes:
- máquina de estados en `lib/`;
- numeración con advisory lock;
- `ActionResult` + `toActionError`;
- permisos por tab;
- destinos de imputación validados con `validateExitDestination`.

No modifica el motor de stock.

**Stack:** Next.js 16 (App Router), Prisma 7 + Postgres, React Query, RHF + Zod, shadcn, Vitest, pgTAP, MinIO (`src/shared/lib/storage.ts`), mail (`src/shared/lib/mail`).

**Spec:** `docs/superpowers/specs/2026-10-08-compras-etapa-1-design.md` (fuente de verdad).
**Base:** rama `feat/compras-etapa-1`, creada desde `main` después de cerrar Almacenes.

## Restricciones globales

- **Empresa:** sale siempre de la sesión (`getActiveCompanyId`). Todo id del cliente se valida contra ella.
- **Mutaciones:** devuelven `ActionResult` (`ok`/`fail` de `@/features/Empresa/Clientes/lib/action-result`). El cliente las usa con `unwrapAction`. Los errores de negocio son `StockError`, o un error propio con el mismo contrato que reconoce `toActionError`.
- **Código y nombres:** sin `any` ni `console.*` (usar `Logger`); fechas con moment.js; código en inglés y UI en español.
- **Schemas Zod:** en `features/Purchases/schemas/`, sin directiva.
- **Migraciones:** carpeta manual + `npx prisma migrate deploy`, nunca `migrate dev`. Las funciones/triggers SQL, si hicieran falta, van también a `prisma/sql/`.
- **Permisos:** por migración, solo a `admin`, `administrador` y `full-access-provisional`. El módulo se declara además en `permissions-map.ts` con sus `allowedActions`.
- **M:M:** altas y bajas explícitas (`{ add, remove }`).
- **DataTables:** las crea el agente `table-expert`.
- **Verificación:** `npm run check-types` con `NODE_OPTIONS=--max-old-space-size=8192`; antes del PR, `npx next build` completo.
- **Prohibido:** lint, prettier o format.

## Foco de revisión (lo que más probablemente rompa y los tests tienen que fijar)

1. **CUIT pegado con guiones o espacios** (`30-71234567-8`): se normaliza a dígitos antes de validar y de buscar duplicados. Task 3.
2. **Un borrador que ya no es válido al enviarse** (proveedor sugerido desactivado, material inactivo, orden de mantenimiento cerrada, empleado de baja): `submit` revalida todo y rechaza con el motivo. Task 4.
3. **Dos personas aprueban, rechazan o anulan la misma solicitud a la vez:** una gana y la otra recibe "La solicitud SC-… ya fue aprobada/rechazada/anulada". Task 4.
4. **Generar una solicitud desde un pedido que ya no tiene faltante** (se repuso stock o se entregó todo): mensaje claro, sin crear una solicitud vacía. Task 5.
5. **El mail de la decisión falla** (SMTP caído): la decisión queda confirmada y el usuario ve éxito. Se loguea el error. Task 4.

---

### Task 1: Esquema, migración y permisos

**Archivos:**
- Modify: `prisma/schema.prisma`. Modelos nuevos según la spec §2:
  - `suppliers`, `supplier_contacts`, `supplier_categories`, `supplier_category_links`, `supplier_documents`, `purchase_requests`, `purchase_request_lines`;
  - enum `purchase_request_status` (`DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `CANCELLED`);
  - relaciones inversas en `company`, `profile`, `materials`, `measurement_units`, `material_requests`, `employees`, `vehicles`, `other_equipment`, `maintenance_orders`, `customers` y `customer_services`.
- Create: `prisma/migrations/20261008100000_purchases_core/migration.sql`. Se toma del `migrate diff` solo lo relevante y se le suma:
  - CHECK de línea: `(material_id IS NULL) <> (description IS NULL)` y `quantity > 0`;
  - CHECK de destino: la FK del tipo y ninguna otra, igual que `material_requests`;
  - CHECK de decisión (`decided_by`/`decided_at` juntos; `REJECTED` exige `decision_notes`);
  - CHECK de anulación (los tres campos juntos);
  - índice único parcial de contacto principal: `(supplier_id) WHERE is_primary`;
  - únicos: `(company_id, cuit)`, `(company_id, number)`, `(company_id, name)` en rubros, `(supplier_id, category_id)` en la pivote.
- Create: `prisma/migrations/20261008100100_purchases_module_permissions/migration.sql`. Mismo patrón que `20261004110000_warehouses_module_permissions`:
  - módulo `compras`, id `c0000000-0000-0000-0000-000000000000`;
  - tabs `solicitudes` (`…0001`), `proveedores` (`…0002`) y `config-compras` (`…0003`);
  - acción nueva `view_all_requests` si no existe (la usa Almacenes: verificar en `actions` y reusarla);
  - permisos de los 3 roles de sistema: solicitudes `view, view_all_requests, create, update, approve`; proveedores `view, create, update, delete`; config `view, update`.
- Modify: `src/features/Permissions/permissions-map.ts`: módulo `compras` con esas tabs y `allowedActions`.
- Modify: `src/shared/constants/module-icons.ts` (ícono `ShoppingCart`) y `src/features/Layout/sidebar/constants/navigation.ts`. Compras va después de Almacenes en `position`, corriendo Formularios, Ayuda y Configuración. Íconos de sub-ítems en `SUB_ITEM_ICONS`.
- Modify: `prisma/tests/02_warehouses.sql`, o crear `prisma/tests/03_purchases.sql` si el runner los toma todos (verificar `scripts/test-db.sh`). Casos:
  - línea con material y descripción a la vez;
  - línea sin ninguno;
  - cantidad 0;
  - rechazo sin motivo;
  - anulación a medias;
  - dos contactos principales;
  - CUIT duplicado en la empresa.

**Verificación:**
- `npx prisma migrate deploy` y `npx prisma generate`.
- `psql` `\d purchase_requests` (CHECK presentes).
- `npm run test:db`, `npm run db:seed` (el seed toma el módulo del mapa) y `check-types`.

### Task 2: Reglas puras (`lib/`) con tests unitarios

**Archivos:**
- Create: `src/features/Purchases/lib/request-state-machine.ts` + `.test.ts`:
  - `PURCHASE_REQUEST_STATUSES`;
  - `type PurchaseRequestAction = 'edit' | 'submit' | 'approve' | 'reject' | 'cancel'`;
  - `canApplyPurchaseRequestAction(status, action): boolean`, según la spec §2.4: `edit` y `submit` solo desde DRAFT; `approve` y `reject` solo desde PENDING_APPROVAL; `cancel` desde DRAFT o PENDING_APPROVAL;
  - `statusAfter(action): PurchaseRequestStatus`.
- Create: `src/features/Purchases/lib/request-numbering.ts` + `.test.ts`. `nextPurchaseRequestNumber(tx, companyId): Promise<string>` → `SC-000001`, con el mismo advisory lock y formato que `src/features/Warehouses/lib/request-numbering.ts` pero con su propia clave de lock. El test unitario cubre el formateo; la concurrencia, la Task 4.
- Create: `src/features/Purchases/lib/supplier-ids.ts` + `.test.ts`:
  - `normalizeCuit(raw: string): string`: solo dígitos;
  - `isValidSupplierCuit(raw)`: normaliza y delega en `isValidCuit` de `src/features/Empresa/General/lib/company-form.ts`;
  - `normalizeCbu` / `isValidCbu(raw)`: 22 dígitos con los dos dígitos verificadores del BCRA;
  - `formatCuit(digits)`: `30-71234567-8`.
  - Casos: CUIT con guiones, con espacios, con dígito verificador mal y con 10 dígitos; CBU válido conocido, con verificador mal y con 21 dígitos.

**Verificación:** `npx vitest run src/features/Purchases/lib`.

### Task 3: Proveedores (servidor)

**Archivos:**
- Create: `src/features/Purchases/schemas/suppliers.ts`: `supplierFormSchema` (datos, contactos con uno solo principal, pago y banco), `supplierCategorySchema` y `supplierDocumentSchema` (`name`, `expiresAt?`).
- Create: `src/features/Purchases/lib/action-errors.ts`. Reusa `toActionError` de Warehouses si su contrato alcanza (StockError + P2002); si no, un `PurchaseError(code, message)` con el mismo contrato.
- Create: `src/features/Purchases/actions/suppliers.server.ts` (`'use server'`, `ActionResult`, permisos `compras:proveedores:*`):
  - `createSupplier(values)` / `updateSupplier(id, values)`:
    - normaliza CUIT y CBU, valida dígitos verificadores y la condición de IVA (`isReceiverVatConditionId`);
    - contactos con altas, bajas y cambios explícitos (`{ add, update, remove }`), en una transacción;
    - CUIT duplicado: "Ya existe el proveedor {nombre} con ese CUIT".
  - `setSupplierCategories(supplierId, { add, remove })`.
  - `removeSupplier(id)`: borra si no tiene uso (solicitudes, líneas sugeridas); si tiene, desactiva. Devuelve `{ mode }`, igual que `removeMaterial`.
  - `reactivateSupplier(id)`.
  - `uploadSupplierDocument(supplierId, formData)`: sube a `document-files` con `storageUpload`, en `{companyFolder}/proveedores/{supplierId}/…`. `replacesId?` marca `replaced_by_id` del anterior; nunca borra el archivo viejo.
  - `getSupplierDocumentUrl(documentId)`: URL firmada con `storageFileUrls`, con perímetro.
  - `getSupplierDetail(id)` para la ficha. `getSupplierOptions(query)` para el combo de "proveedor sugerido": solo activos de la empresa, gated por `compras:solicitudes:create`.
- Create: `src/features/Purchases/actions/categories.server.ts`: ABM de rubros (`compras:config-compras:update`), con el mismo patrón que las categorías de Almacenes (`createMaterialCategory`…).
- Test: `src/features/Purchases/actions/suppliers.integration.test.ts`:
  - alta con CUIT con guiones (queda normalizado);
  - CUIT inválido rechazado;
  - duplicado en la misma empresa rechazado y permitido en otra;
  - segundo contacto principal rechazado con mensaje (no un error de base);
  - rubros `{ add, remove }`: lo que no viene no se borra;
  - `removeSupplier` sin uso → borra; con una solicitud → desactiva;
  - documento reemplazado conserva el anterior (`replaced_by_id`);
  - un proveedor de otra empresa no se puede editar.

**Verificación:** tests de integración + `check-types`.

### Task 4: Solicitudes de compra (servidor) + mail + script de tests

**Archivos:**
- Create: `src/features/Purchases/schemas/requests.ts`: `purchaseRequestFormSchema`.
  - Campos: destino opcional con `destinationFieldsSchema` de `Warehouses/schemas/stock-movement.ts`, `neededBy?`, `notes`, `lines[]`.
  - Cada línea: `kind: 'MATERIAL' | 'FREE_TEXT'`, `materialId`, `description`, `quantity`, `unitId`, `suggestedSupplierId`, `notes`.
  - `toPurchaseRequestInput(values)` normaliza y deja solo la FK del destino elegido (`toDestinationInput`).
- Create: `src/features/Purchases/lib/requests.ts` (`server-only`):
  - `lockPurchaseRequest(tx, companyId, id)`: `SELECT … FOR UPDATE`; devuelve `{ id, number, status, requestedBy }`;
  - `validatePurchaseRequestInput(tx, companyId, input)`:
    - material activo y de la empresa (su unidad se toma del material, la del cliente se ignora);
    - unidad de la empresa en el texto libre;
    - proveedor sugerido activo y de la empresa;
    - destino con `validateExitDestination` (solo si hay `destinationType`);
    - al menos una línea.
- Create: `src/features/Purchases/actions/requests.server.ts`:
  - `createPurchaseRequest(values, { submit: boolean })` → `ActionResult<{ id, number }>` (`create`). Número al crear. `submit=true` deja `PENDING_APPROVAL` + `submitted_at`.
  - `updatePurchaseRequestDraft(id, values)`: lock; DRAFT; el solicitante o `update`. Reemplaza las líneas del borrador (es la misma entidad, no una M:M con historia).
  - `submitPurchaseRequest(id)`: lock; DRAFT; el solicitante. **Revalida** todo con `validatePurchaseRequestInput`.
  - `approvePurchaseRequest(id, notes?)` / `rejectPurchaseRequest(id, notes)` (`approve`): lock; valida la transición; escribe `decided_*`. El mensaje si ya cambió: "La solicitud {número} ya fue {estado}".
  - `cancelPurchaseRequest(id, reason)`: el solicitante o `update`; DRAFT o PENDING_APPROVAL.
  - `copyPurchaseRequest(id)`: crea un borrador nuevo con las mismas líneas (para rechazadas y anuladas).
  - `getPurchaseRequestDetail(id)`: perímetro y visibilidad (`view` propias / `view_all_requests`); incluye pedido de origen, materiales con código, unidad, proveedor sugerido, destino con `DESTINATION_SELECT`/`destinationLabel` de `Warehouses/lib/labels.ts`, e historial armado de los timestamps.
  - `searchPurchaseMaterialOptions(query)`: catálogo de materiales activos, gated por `compras:solicitudes:create`. No reusa `searchMaterialOptions`, que exige permisos de Almacenes.
- Create: `src/shared/lib/mail/templates/purchases.ts`: `sendPurchaseRequestDecisionEmail({ to, number, approved, notes, url })` con `shell.ts`. Se llama **después** de la transacción, en `try/catch` con `logger.error`, sin afectar el `ActionResult`.
- Create: `scripts/test-purchases.sh` (copia de `scripts/test-warehouses.sh` con los tests de Purchases). `package.json` → `"test:purchases"`, y `.github/workflows/ci.yml` (job `db-tests`) → `- run: bash scripts/test-purchases.sh`.
- Test: `src/features/Purchases/actions/requests.integration.test.ts`. Mockea sesión, tenant, permisos y `sendMail`; los vehículos y tipos los crea el test (lección de Almacenes: la base del CI está vacía).
  - Ciclo completo: crear borrador → editar → enviar → aprobar; otro → rechazar con motivo; otro → anular.
  - Inválidas: editar enviada, aprobar rechazada, rechazar sin motivo.
  - **Revalidación al enviar:** borrador con proveedor sugerido luego desactivado → `submit` falla nombrándolo; lo mismo con una orden de mantenimiento cerrada.
  - **Concurrencia:** dos `approvePurchaseRequest` en paralelo → una ok y la otra con "ya fue aprobada".
  - **Perímetro:** material, unidad, proveedor y destino de otra empresa son rechazados.
  - Visibilidad: con solo `view`, la solicitud de otro usuario no se ve.
  - **Mail que falla:** `sendMail` mockeado para lanzar → `approvePurchaseRequest` devuelve ok y la solicitud queda APPROVED.

**Verificación:** `npm run test:purchases`, `npm test` y `check-types`.

### Task 5: Solicitud desde un pedido de Almacenes

**Archivos:**
- Create: `src/features/Purchases/lib/from-material-request.ts` (`server-only`). `purchaseLinesForMaterialRequest(tx, companyId, materialRequestId)` → líneas `{ materialId, quantity, unitId }`:
  - lockea el pedido con `lockRequest` de Warehouses y exige `APPROVED` o `PARTIALLY_DELIVERED` (verificar los nombres en `MATERIAL_REQUEST_STATUSES`);
  - calcula `pendiente = pedido − entregado` con `deliveredByLines`;
  - resta el saldo total de la empresa por material (`stock_balances`);
  - devuelve solo las líneas con faltante > 0.
- Modify: `src/features/Purchases/actions/requests.server.ts`:
  - `getMaterialRequestShortfall(materialRequestId)`: para precargar el formulario;
  - `createPurchaseRequestFromMaterialRequest(materialRequestId, values, { submit })`: revalida que cada material de las líneas pertenezca al pedido, copia el destino del pedido y guarda `material_request_id`;
  - sin faltante: "El pedido {número} no tiene faltantes: hay stock para entregar todo".
- Modify: `src/features/Warehouses/Requests/components/RequestDetail.tsx` + la query del detalle en `src/features/Warehouses/actions/requests.server.ts`:
  - botón "Generar solicitud de compra" (si el pedido está aprobado y el usuario tiene `compras:solicitudes:create`), que lleva a `/dashboard/purchases/requests/new?fromMaterialRequest={id}`;
  - lista de solicitudes vinculadas con número, estado y link.
- Test (en `requests.integration.test.ts`):
  - faltante = pendiente − stock, con un material sin faltante excluido;
  - pedido pendiente de aprobación rechazado;
  - material ajeno al pedido rechazado;
  - dos solicitudes para el mismo pedido permitidas;
  - pedido sin faltante → mensaje y nada creado.

### Task 6: Pantallas (sin DataTables)

**Archivos:**
- Create: `src/app/dashboard/purchases/page.tsx` (delgada) → `src/features/Purchases/PurchasesComponent.tsx`, con `TabsManagerServer`, igual que `WarehousesComponent.tsx`. Tabs `solicitudes`, `proveedores` y `config-compras`, cada una con su `TabContent` server y su Skeleton en `fallback/`.
- Create: `src/features/Purchases/Settings/` (Configuración): ABM de rubros, con el patrón de `Warehouses/Settings/components/CategoriesSection.tsx`.
- Create: `src/app/dashboard/purchases/suppliers/[id]/page.tsx` + `src/app/dashboard/purchases/suppliers/new/page.tsx` → `src/features/Purchases/Suppliers/components/SupplierForm.tsx`:
  - formulario único con secciones (datos, contactos con filas agregables, rubros con multiselect, pago y banco);
  - `SupplierDocuments.tsx`: listado con vencimiento y badge Vencido / Vence en N días; subir y reemplazar con diálogo shadcn; ver con URL firmada.
  - Todos los botones internos al form con `type="button"` (regla del proyecto).
- Create: `src/app/dashboard/purchases/requests/new/page.tsx` → `src/features/Purchases/Requests/components/PurchaseRequestForm.tsx`:
  - destino opcional (reusa los selectores de destino de `Warehouses/Requests/components/NewRequestForm.tsx` si están extraídos; si no, se extraen a un componente compartido sin cambiar su comportamiento);
  - "se necesita para": date picker con escritura directa;
  - líneas con toggle Material / Texto libre;
  - "Guardar borrador" y "Enviar a aprobación";
  - con `?fromMaterialRequest=` precarga desde `getMaterialRequestShortfall` y muestra el pedido de origen.
- Create: `src/app/dashboard/purchases/requests/[id]/page.tsx` → `PurchaseRequestDetail.tsx`:
  - encabezado, líneas e historial;
  - botones según `canApplyPurchaseRequestAction` + permisos;
  - diálogos de rechazo y anulación con motivo (shadcn, nunca nativos);
  - "Copiar como nueva" en rechazadas y anuladas;
  - `PurchaseRequestStatusBadge.tsx`.

**Verificación:** `check-types` + navegador con el dev server reiniciado tras `prisma generate`.

### Task 7: Tablas (agente `table-expert`)

- **Solicitudes** (`src/features/Purchases/Requests/RequestsList/`): número, fecha, solicitante, destino, estado, cantidad de líneas, "se necesita para" y pedido de origen.
  - Visibilidad `view` / `view_all_requests` en el servidor.
  - Facets lazy (`fetchFacet`), export y `paramNamespace`.
- **Proveedores** (`src/features/Purchases/Suppliers/SuppliersList/`): razón social, CUIT (formateado), condición de IVA (label de `RECEIVER_VAT_CONDITIONS`), rubros (M:M, faceted), contacto principal, documentos (vencidos / por vencer / al día, faceted) y estado.
  - Acciones con permisos.

### Task 8: Demo

- **Archivos:** `scripts/demo/domains/purchases.ts` (nuevo), `scripts/demo/reset.ts` (después de Almacenes) y `scripts/demo/lib/wipe.ts` (borrar las tablas nuevas en orden).
- **Contenido:**
  - unos 8 proveedores con CUIT válidos (generados con dígito verificador), rubros, contactos y condición de pago;
  - documentos: uno vencido y uno por vencer, como filas con `file_path` a un PDF de ejemplo subido igual que otros PDFs de la demo;
  - solicitudes en todos los estados, con líneas de material y de texto libre;
  - una generada desde un pedido aprobado de la demo de Almacenes.
- **Verificación:** con el arnés en transacción descartada (scratchpad, como en Almacenes etapa 6): proveedores, solicitudes por estado, CHECK respetados y número sin repetidos.

### Task 9: Verificación final

- Comandos (los que llevan `tsc` o `next build`, con `NODE_OPTIONS=--max-old-space-size=8192`):
  - `check-types`, `npm test`, `npm run test:db`, `npm run test:purchases`, `npm run test:warehouses`;
  - **`npx next build`** completo.
- Navegador (spec §5):
  - proveedor con contacto, rubro y documento vencido;
  - solicitud mixta;
  - envío, aprobación (mail en el SMTP local) y rechazo;
  - generación desde un pedido de Almacenes;
  - vínculo visible en los dos lados;
  - usuario sin `view_all_requests`.
- **Manual de uso:** `npm run manual:check` exige que toda tab del mapa de permisos tenga guía o una exclusión con motivo (`src/features/Ayuda/Manual/catalog/coverage.ts`). Compras suma tres tabs: se escribe la sección del manual (`catalog/sections/compras.ts` + guías MDX), con el formato de `sections/almacenes.ts`, o se excluyen con motivo si el usuario prefiere documentarlas más adelante.
- Revisión de calidad (agente revisor) antes de proponer el commit.
