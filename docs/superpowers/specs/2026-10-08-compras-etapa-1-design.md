# Compras — Etapa 1: proveedores y solicitudes de compra

**Fecha:** 2026-10-08
**Estado:** diseño aprobado en conversación (2026-10-08), pendiente de revisión de la spec escrita
**Contexto:** el módulo de Almacenes (etapas 1 a 6) está cerrado y en producción. Su spec de etapa 1 (`2026-10-04-almacenes-etapa-1-design.md`) dejó a Compras como la integración que trae proveedores, órdenes de compra y recepciones que generan entradas con costo.

Rigen las convenciones de Almacenes:
- multiempresa por `company_id`, con la empresa siempre resuelta en el servidor;
- mutaciones con `ActionResult` (los errores de negocio llegan al usuario en producción);
- schemas Zod en módulos sin directiva;
- permisos por tab, cargados por migración solo a los 3 roles de sistema;
- M:M con altas y bajas explícitas, nunca "borrar todo y reinsertar".

## 1. Objetivo

Compras va a cubrir el circuito completo: pedir, aprobar, cotizar, comprar, recibir, controlar la factura y pagar. Se construye en cinco etapas, cada una usable por sí sola:

| # | Etapa | Qué deja andando |
| --- | --- | --- |
| **1** | **Proveedores y solicitudes de compra** | **Esta spec.** Ficha de proveedores; solicitud interna con aprobación. |
| 2 | Cotizaciones y orden de compra | Pedir precio a uno o varios proveedores, elegir y emitir la OC aprobada (PDF y mail). |
| 3 | Recepción | Recibir contra la OC, total o parcial. Los materiales generan la entrada en Almacenes con el costo de la OC; los servicios se dan por recibidos. |
| 4 | Facturas de proveedor | Carga de la factura y control contra OC y recepción (precio y cantidad). IVA compras. |
| 5 | Cuenta corriente y pagos | Saldo por proveedor, vencimientos, órdenes de pago y retenciones. |

La etapa 1 deja cargados los proveedores y resuelve **quién pide qué, para qué, y quién lo autoriza**. Una solicitud aprobada es el punto de partida de la etapa 2.

### Decisiones

| Tema | Decisión |
| --- | --- |
| Arquitectura | Módulo **Compras** propio (`src/features/Purchases/`, tablas propias), con los patrones de Almacenes. No extiende los pedidos de materiales ni crea un motor genérico de aprobaciones. |
| Ítems de una solicitud | **Material del catálogo de Almacenes o texto libre.** El texto libre es para servicios y compras que no se stockean. |
| Aprobación | **Un nivel, por permiso** (`compras:solicitudes:approve`), como los pedidos de Almacenes. |
| Imputación | **Opcional, con los mismos destinos que Almacenes** (empleado, equipo, otro equipo, orden de mantenimiento, cliente). Sin destino, la compra es para stock. |
| Pedidos de Almacenes | **Desde un pedido aprobado se genera una solicitud de compra** con lo que falta, vinculada al pedido. No es automático. |
| Datos del proveedor | Razón social, CUIT, condición de IVA, dirección, contactos, rubros, condición de pago, datos bancarios y documentación. |
| Documentación del proveedor | **Adjuntos simples con vencimiento** en la ficha. No se integra al módulo Documentación: no hay tipos obligatorios ni estado del proveedor. |

## 2. Modelo de datos

### 2.1 Proveedores

- **`suppliers`**
  - `company_id`;
  - `name` (razón social) y `trade_name?` (nombre de fantasía);
  - `cuit` `BigInt`, único por empresa y validado con dígito verificador;
  - `vat_condition_id Int`: id de ARCA de la condición frente al IVA, el mismo criterio que `customers.vat_condition_id`. El catálogo es `RECEIVER_VAT_CONDITIONS` y el select ofrece `ENABLED_RECEIVER_VAT_CONDITIONS` (`src/shared/lib/arca/catalogs.ts`);
  - dirección: `street?`, `city?`, `province?`, `postal_code?`;
  - `payment_term_days?`: plazo de pago en días (se usa en la etapa 5);
  - `bank_cbu?` (22 dígitos, validado) y `bank_alias?`;
  - `notes?`, `is_active`, `created_at` y `updated_at`.
  - Un proveedor con solicitudes no se borra: se desactiva. Uno sin uso se puede borrar.
- **`supplier_contacts`**: `supplier_id`, `name`, `email?`, `phone?`, `role?` (puesto) e `is_primary`. Un solo contacto principal por proveedor, con índice único parcial.
- **`supplier_categories`**: rubros, catálogo por empresa (`company_id`, `name` único por empresa, `is_active`).
- **`supplier_category_links`**: pivote proveedor ↔ rubro, única por par.
- **`supplier_documents`**:
  - `supplier_id`, `name` (tipo, texto libre con sugerencias de los ya usados), `file_path` (MinIO), `file_name`, `expires_at?` (fecha), `uploaded_by` y `created_at`;
  - `replaced_by_id?`: al reemplazar un documento se crea uno nuevo y el anterior apunta a él. Queda como historial y su archivo no se borra.

### 2.2 Solicitudes de compra

- **`purchase_requests`**
  - `company_id`, `number` (`SC-000001`, único por empresa), `status`, `requested_by` (profile), `needed_by?` (fecha) y `notes?`;
  - destino opcional: `destination_type?` (reusa `stock_destination_type`), `employee_id?`, `vehicle_id?`, `other_equipment_id?`, `maintenance_order_id?`, `customer_id?` y `customer_service_id?`;
  - `material_request_id?`: el pedido de Almacenes que la originó;
  - decisión: `decided_by?`, `decided_at?` y `decision_notes?`;
  - anulación: `cancelled_by?`, `cancelled_at?` y `cancel_reason?`;
  - `submitted_at?`, `created_at` y `updated_at`.
- **`purchase_request_lines`**
  - `request_id`, `position`, `material_id?` **o** `description?` (exactamente uno de los dos), `quantity` (`Decimal(15,4)`, mayor a 0) y `unit_id`;
  - `unit_id` es la unidad del material, o la elegida si la línea es texto libre;
  - `suggested_supplier_id?` y `notes?`;
  - sin precio: se cotiza en la etapa 2.

### 2.3 CHECK en la base (la red; los mensajes salen de las validaciones del servidor)

- Línea: `(material_id IS NULL) <> (description IS NULL)`, y `quantity > 0`.
- Destino: si hay `destination_type`, está su FK correspondiente, y ninguna otra.
- Decisión completa o nada: `decided_by` y `decided_at` van juntos; si está `REJECTED`, `decision_notes` es obligatorio.
- Anulación completa o nada: `cancelled_by`, `cancelled_at` y `cancel_reason` van juntos.

### 2.4 Estados

```
DRAFT ──enviar──▶ PENDING_APPROVAL ──aprobar──▶ APPROVED
  │                    │  └────────rechazar──▶ REJECTED
  └──anular──▶ CANCELLED ◀──anular──┘
```

- Se edita solo en `DRAFT`. Un rechazo es final: para volver a pedir se crea otra solicitud (se ofrece "Copiar como nueva").
- `APPROVED` no se anula en esta etapa. La etapa 2 suma los estados de avance ("en cotización", "con OC") y la anulación de aprobadas.
- La máquina de estados vive en `lib/request-state-machine.ts`, como en Almacenes, y la usan las actions y la UI (qué botones mostrar).

## 3. Reglas del servidor

- **Empresa:** sale de la sesión (`getActiveCompanyId`). Todo id que llega del cliente se valida contra esa empresa: proveedor, rubro, material, unidad, destino y pedido de origen.
- **Destino:** se valida con `validateExitDestination` de Almacenes (empleado, equipo y cliente activos; orden de mantenimiento abierta). Una sola regla para los dos módulos.
- **Numeración `SC-`:** advisory lock por empresa, igual que `PED-` y `MOV-`. Se asigna al crear el borrador.
- **Transiciones:** cada cambio de estado lockea la solicitud (`FOR UPDATE`) y valida la transición contra la máquina de estados. Dos aprobaciones simultáneas se ordenan y la segunda falla con "La solicitud SC-000012 ya fue aprobada".
- **Permisos:**
  - crear requiere `create`;
  - editar un borrador: el solicitante, o quien tenga `update`;
  - enviar: el solicitante;
  - aprobar o rechazar: `approve`. El propio solicitante puede aprobar si tiene el permiso; no hay regla de "cuatro ojos" en esta etapa;
  - anular: el solicitante, o quien tenga `update`;
  - ver: `view` muestra las propias y `view_all_requests` todas.
- **Rubros del proveedor:** `setSupplierCategories(supplierId, { add, remove })`. La ausencia de un rubro en el payload no significa borrarlo.
- **CUIT:** se valida el dígito verificador con el `isValidCuit` existente (`src/features/Empresa/General/lib/company-form.ts`), más la unicidad por empresa. El mensaje de duplicado nombra al proveedor existente.
- **Documentos:** se suben por `src/shared/lib/storage.ts` a la carpeta de la empresa. Reemplazar no borra el archivo anterior.
- **Proveedor inactivo:** no se puede sugerir en líneas nuevas. Las solicitudes que ya lo tienen no cambian.

### 3.1 Solicitud desde un pedido de Almacenes

- **Botón:** en el detalle de un pedido de materiales **aprobado**, "Generar solicitud de compra" (permiso `compras:solicitudes:create`).
- **Precarga:** el servidor calcula, por línea del pedido, `pendiente de entrega − stock disponible en la empresa` (todos los depósitos). Solo propone las líneas con faltante.
  - El destino es el mismo que el del pedido.
  - `material_request_id` apunta al pedido.
- **Ajuste:** el usuario ajusta cantidades o quita líneas antes de guardar. El servidor vuelve a validar que los materiales sean los del pedido.
- **Más de una solicitud por pedido:** se permite (por ejemplo, una por proveedor). El detalle del pedido lista sus solicitudes con su estado, y la solicitud muestra el número de su pedido con un link.

## 4. Pantallas

Módulo **Compras** en el menú (`/dashboard/purchases`), después de Almacenes, con tres tabs:

| Tab | Contenido | Acciones de permiso |
| --- | --- | --- |
| **Solicitudes** | DataTable: número, fecha, solicitante, destino, estado, líneas, "se necesita para". Filtros y export según las reglas del proyecto. Botón "Nueva solicitud". | `view`, `view_all_requests`, `create`, `update`, `approve` |
| **Proveedores** | DataTable: razón social, CUIT, condición de IVA, rubros, contacto principal, documentos vencidos/por vencer, estado. Botón "Nuevo proveedor". | `view`, `create`, `update`, `delete` |
| **Configuración** | Rubros de proveedor (ABM, como las categorías de Almacenes). | `view`, `update` |

**Páginas**
- **Detalle de solicitud** (`/dashboard/purchases/requests/[id]`):
  - encabezado con número, estado, solicitante, fechas y destino;
  - líneas (material con código, o descripción; cantidad y unidad; proveedor sugerido);
  - historial (creada, enviada, aprobada o rechazada con motivo, anulada);
  - link al pedido de origen;
  - botones según estado y permisos.
- **Ficha del proveedor** (`/dashboard/purchases/suppliers/[id]`), con secciones datos, contactos, rubros, pago y banco, y documentos (vigentes, vencidos, historial de reemplazados).

**Formularios**
- **Nueva solicitud:** un solo formulario con secciones (destino opcional, "se necesita para", notas, líneas). Cada línea alterna entre **Material**, con el buscador del catálogo de Almacenes, y **Texto libre**, con descripción y unidad. "Guardar borrador" y "Enviar a aprobación".
- **Proveedor:** formulario único. Los contactos y rubros se editan en la misma ficha, no en modales encadenados.

**Avisos**
- Al aprobar o rechazar se manda un mail al solicitante, con el transporte compartido (`sendMail` de `src/shared/lib/mail`) y una plantilla nueva armada con los helpers de `shell.ts`. Los pedidos de Almacenes no mandan mail: esto es nuevo.
  - El mail se envía **después** de confirmar la transacción. Si falla, se loguea y la decisión queda tomada; el usuario no ve un error.
  - Si el solicitante no tiene mail, no se envía nada.
- La tabla de proveedores marca los documentos vencidos y los que vencen en los próximos 30 días. No hay mail diario en esta etapa.

**DataTables:** las crea el agente `table-expert` (regla del proyecto).

## 5. Tests

- **Unitarios:** CUIT (dígito verificador, formatos), CBU, máquina de estados y numeración `SC-`.
- **Integración** contra el Postgres del compose, con un script `npm run test:purchases` que se suma al job `db-tests` del CI:
  - ciclo de la solicitud: crear, editar el borrador, enviar, aprobar, rechazar con motivo y anular;
  - transiciones inválidas rechazadas (editar enviada, aprobar rechazada);
  - doble aprobación concurrente: una gana y la otra recibe el mensaje;
  - perímetro de empresa: proveedor, material, destino o pedido de otra empresa son rechazados;
  - solicitud desde un pedido de Almacenes: precarga con el faltante, pedido no aprobado rechazado y varias solicitudes por pedido;
  - rubros con `{ add, remove }`: lo que no viene no se borra;
  - CUIT duplicado en la misma empresa rechazado, y permitido en otra empresa.
- **pgTAP:** CHECK de línea (material o descripción), destino, decisión y anulación; unicidades de CUIT, número y contacto principal.
- **Navegador:**
  - alta de proveedor con contacto, rubro y documento con vencimiento;
  - solicitud con una línea de material y una de texto libre;
  - envío, aprobación y rechazo, con el mail;
  - solicitud generada desde un pedido de Almacenes.
- **Build:** `npx next build` completo antes del PR, además de `check-types`.

## 6. Demo

- Unos 8 proveedores con rubros (repuestos, cubiertas, lubricantes, servicios de taller, ropa), contactos, condición de pago y algún documento vencido o por vencer.
- Solicitudes en todos los estados, con líneas de material y de texto libre. Una de ellas generada desde un pedido de Almacenes.

## 7. Fuera de alcance de la etapa 1

- Precios, cotizaciones y órdenes de compra (etapa 2).
- Recepción y entradas de stock (etapa 3).
- Facturas de proveedor e IVA compras (etapa 4).
- Cuenta corriente, pagos y retenciones (etapa 5).
- Aprobación por niveles, por monto o por área.
- Mail diario de documentos de proveedor vencidos.
- Integración de la documentación del proveedor al módulo Documentación.
- Multimoneda.
- Alta de proveedores por consulta automática a ARCA (padrón).
