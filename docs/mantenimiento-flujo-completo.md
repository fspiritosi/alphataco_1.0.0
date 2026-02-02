# Flujo Completo de Mantenimiento - GH-Gestion

> Basado en: Proceso Manten. Rev 1.pptx (06/10/25 REV 01)

---

## Leyenda

```
✅ = Implementado
⬜ = Pendiente
```

---

## Diagrama de Flujo Completo

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           HOJA 1 - INICIO                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ ✅ Operario          ✅ Checklist         ✅ Items              ✅ Solicitud    │
│    escanea QR  ───>     completa    ───>     negativos?  ──SI──>  Mantenimiento │
│                                               │                     (SM)        │
│                                              NO                      │          │
│                                               v                      v          │
│                                          ✅ FIN OK          ✅ Supervisor       │
│                                                                 valida items    │
│                                                                      │          │
│                                                      ┌───────────────┴───────┐  │
│                                                      v                       v  │
│                                               ✅ RECHAZA             ✅ APRUEBA │
│                                                  (justifica)                │   │
│                                                                             v   │
│                                                                      ✅ Pedido  │
│                                                                      Manten(PM) │
└─────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           v
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        HOJA 2 - PLANIFICACION                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ ✅ Jefe Mantenimiento recibe PM pendiente                                       │
│         │                                                                       │
│    ┌────┴────┐                                                                  │
│    v         v                                                                  │
│ ⬜ EXTERNO  ✅ INTERNO                                                          │
│    │         │                                                                  │
│    v         v                                                                  │
│ ⬜ Seguimien ✅ Planifica ───> ⬜ Operaciones ───> ⬜ Porteria ───> ✅ Ingresa   │
│    proveedor    fecha          disponibilidad      check ingreso     taller    │
│    │                                                                  │         │
│    v                                                                  v         │
│ ⬜ Conforme?                                                    ⬜ Jefe Taller  │
│    SI: Cierra                                                     asigna       │
│    NO: Reclamo                                                    sectores     │
│                                                                       │         │
│                                                                       v         │
│                                                               ⬜ GENERA OTs     │
│                                                                  (automatico)  │
│                                                                       │         │
│                                                                       v         │
│                                                               ⬜ Cada OT tiene: │
│                                                                - Sector asignado│
│                                                                - Items especif. │
│                                                                - Referente asig.│
│                                                                - Estado: Pend.  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           v
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        HOJA 3 - EJECUCION Y CIERRE                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ ⬜ Operario Mant. <────────────────────────────────────────┐                    │
│         │                                                  │                    │
│         v                                                  │                    │
│ ⬜ Repuestos? ───NO──> ⬜ Jefe Taller analiza:              │                    │
│         │                   │                              │                    │
│         │              ┌────┴────┐                         │                    │
│        SI              v         v                         │                    │
│         │         ⬜ Espera   ⬜ Equipo NO                  │                    │
│         v            repuesto    operativo                 │                    │
│ ⬜ Ejecuta           (equipo     (OT abierta               │                    │
│    mantenimiento     operativo)  en espera)                │                    │
│         │                                                  │                    │
│         v                                                  │                    │
│ ⬜ Cierra OT                                               │                    │
│         │                                                  │                    │
│         v                                                  │                    │
│ ⬜ Mas OTs? ───SI──> Continua con siguiente OT ────────────┘                    │
│         │                                                                       │
│        NO                                                                       │
│         v                                                                       │
│ ⬜ Jefe Taller valida conformidad                                               │
│         │                                                                       │
│    ┌────┴────┐                                                                  │
│    v         v                                                                  │
│ ⬜ NO      ⬜ CONFORME ───> ⬜ Notifica: Operaciones, Sala, Porteria             │
│    Conforme       │                                                             │
│    │              v                                                             │
│    │        ⬜ UNIDAD DISPONIBLE EN SISTEMA                                     │
│    │                                                                            │
│    └────────> ⬜ Retorna OT (retrabajo) ───────────────────┘                    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Detalle por Hoja

### HOJA 1 - Inicio del Proceso ✅ COMPLETA

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ACTOR: Operario/Chofer                                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ✅ 1. Escanea QR del equipo (cada dominio tiene QR unico)               │
│                         │                                                │
│                         v                                                │
│  ✅ 2. Completa Checklist (procedimientos internos, clientes, auditorias)│
│                         │                                                │
│                         v                                                │
│              ┌─────────────────────┐                                     │
│              │  Items negativos?   │                                     │
│              └─────────────────────┘                                     │
│                    │         │                                           │
│                   NO        SI                                           │
│                    │         │                                           │
│                    v         v                                           │
│              ┌─────────┐  ┌─────────────────────────────┐                │
│           ✅ │ FIN OK  │  │ ✅ Se genera SOLICITUD DE   │                │
│              │         │  │    MANTENIMIENTO (SM)       │                │
│              └─────────┘  │    automaticamente          │                │
│                           └─────────────────────────────┘                │
│                                        │                                 │
└────────────────────────────────────────┼─────────────────────────────────┘
                                         v
┌──────────────────────────────────────────────────────────────────────────┐
│  ACTOR: Supervisor                                                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ✅ 3. Revisa la Solicitud de Mantenimiento                              │
│                         │                                                │
│              ┌──────────┴──────────┐                                     │
│              v                     v                                     │
│     ┌─────────────────┐    ┌─────────────────┐                           │
│  ✅ │  NO VALIDA      │ ✅ │  VALIDA uno o   │                           │
│     │  ningun item    │    │  mas items      │                           │
│     └─────────────────┘    └─────────────────┘                           │
│              │                     │                                     │
│              v                     v                                     │
│  ✅ Justifica cada       ✅ Sistema transforma                           │
│     item rechazado          SM en PEDIDO DE                              │
│     Notifica SM a visar     MANTENIMIENTO (PM)                           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### HOJA 2 - Planificacion (PARCIAL ~40%)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ACTOR: Jefe de Mantenimiento                                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ✅ 4. Recibe notificacion de PM pendiente (MANDATORIO)                  │
│                         │                                                │
│              ┌──────────┴──────────┐                                     │
│              v                     v                                     │
│     ┌─────────────────┐    ┌─────────────────┐                           │
│  ⬜ │  TALLER EXTERNO │ ✅ │  TALLER INTERNO │                           │
│     └─────────────────┘    └─────────────────┘                           │
│              │                     │                                     │
│              v                     v                                     │
│  ⬜ Gestiona disponib.   ✅ Planifica fecha                              │
│     del proveedor           recepcion                                    │
│              │                     │                                     │
│              v                     v                                     │
│  ⬜ Hace seguimiento     ⬜ Notifica a Operaciones                        │
│              │                                                           │
│              v                                                           │
│  ⬜ Conforme? ──NO──> Reclamo al proveedor                               │
│        │                                                                 │
│       SI                                                                 │
│        v                                                                 │
│  ⬜ Certifica trabajo                                                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                         │
                                         v (si es INTERNO)
┌──────────────────────────────────────────────────────────────────────────┐
│  ACTOR: Operaciones                                                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ⬜ 5. Recibe notificacion para planificar disponibilidad                │
│                         │                                                │
│              ┌──────────┴──────────┐                                     │
│              v                     v                                     │
│     ┌─────────────────┐    ┌─────────────────┐                           │
│  ⬜ │  SIN            │ ⬜ │  CON            │                           │
│     │  disponibilidad │    │  disponibilidad │                           │
│     └─────────────────┘    └─────────────────┘                           │
│              │                     │                                     │
│              v                     v                                     │
│  ⬜ Espera               ⬜ Planifica junto a                             │
│                             Jefe Mant. el carreteo                       │
│                                    │                                     │
│                                    v                                     │
│                          ⬜ Sistema autoriza                             │
│                             ingreso a Porteria                           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                         │
                                         v
┌──────────────────────────────────────────────────────────────────────────┐
│  ACTOR: Porteria                                                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ⬜ 6. Realiza check digital de ingreso                                  │
│                         │                                                │
│                         v                                                │
│  ⬜ - Autoriza ingreso                                                   │
│  ⬜ - Queda pendiente contrastar en salida                               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                         │
                                         v
┌──────────────────────────────────────────────────────────────────────────┐
│  SISTEMA NOTIFICA (al ingresar a taller)                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ✅ - MANTENIMIENTO: Unidad en taller (status: in_workshop)              │
│  ✅ - EQUIPO: Condicion cambia a "no operativo"                          │
│  ✅ - Se registra kilometraje de entrada                                 │
│  ⬜ - Pendiente asignacion de sector (no implementado)                   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                         │
                                         v
┌──────────────────────────────────────────────────────────────────────────┐
│  ACTOR: Jefe de Taller                                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ⬜ 7. Asigna el o los sectores internos                                 │
│                         │                                                │
│                         v                                                │
│  ⬜ Sistema genera automaticamente ORDENES DE TRABAJO (OT)               │
│                                                                          │
│     Cada OT:                                                             │
│     ┌────────────────────────────────────────┐                           │
│  ⬜ │  - Relacionada al mismo PM             │                           │
│  ⬜ │  - Asignada a un sector especifico     │                           │
│  ⬜ │  - Con items especificos               │                           │
│  ⬜ │  - Referente asignado                  │                           │
│  ⬜ │  - Estado: PENDIENTE                   │                           │
│     └────────────────────────────────────────┘                           │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### HOJA 3 - Ejecucion y Cierre ⬜ PENDIENTE (0%)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ACTOR: Operario de Mantenimiento                                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ⬜ 8. Gestiona repuestos, reparaciones, revisiones detalladas           │
│                         │                                                │
│              ┌──────────┴──────────┐                                     │
│              v                     v                                     │
│     ┌─────────────────┐    ┌─────────────────┐                           │
│  ⬜ │  REPUESTOS      │ ⬜ │  SIN REPUESTOS  │ ──> Ver flujo abajo       │
│     │  DISPONIBLES    │    │  DISPONIBLES    │                           │
│     └─────────────────┘    └─────────────────┘                           │
│              │                                                           │
│              v                                                           │
│  ⬜ Realiza mantenimiento                                                │
│              │                                                           │
│              v                                                           │
│  ⬜ Culmina, carga en sistema, CIERRA OT                                 │
│              │                                                           │
│              v                                                           │
│     ┌─────────────────────────────────────────┐                          │
│  ⬜ │  Cuantas OT tiene el PM?                │                          │
│     └─────────────────────────────────────────┘                          │
│              │                     │                                     │
│           UNA OT              MULTIPLES OT                               │
│              │                     │                                     │
│              v                     v                                     │
│  ⬜ Sistema notifica:    ⬜ Sistema libera esta OT                        │
│     "Unidad pendiente       y mantiene otras pendientes                  │
│     validacion Jefe               │                                      │
│     Taller"                       v                                      │
│              │            ⬜ Quedan OT pendientes?                        │
│              │                  │        │                               │
│              │                 SI       NO                               │
│              │                  │        │                               │
│              │                  v        v                               │
│              │            ⬜ Continua   (vuelve a UNA OT)                 │
│              │               siguiente                                   │
│              │               OT                                          │
│              │                                                           │
└──────────────┼───────────────────────────────────────────────────────────┘
               v
┌──────────────────────────────────────────────────────────────────────────┐
│  ACTOR: Jefe de Taller                                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ⬜ 9. Revisa eficacia del trabajo                                       │
│                         │                                                │
│              ┌──────────┴──────────┐                                     │
│              v                     v                                     │
│     ┌─────────────────┐    ┌─────────────────┐                           │
│  ⬜ │  NO CONFORME    │ ⬜ │  CONFORME       │                           │
│     └─────────────────┘    └─────────────────┘                           │
│              │                     │                                     │
│              v                     v                                     │
│  ⬜ Retorna OT como      ⬜ Cierra OT/PM                                  │
│     NO CONFORME                   │                                      │
│     (vuelve al operario)          v                                      │
│                          ⬜ Sistema notifica:                            │
│                             "UNIDAD DISPONIBLE                           │
│                              PARA RETIRO DE BASE"                        │
│                                    │                                     │
│                                    v                                     │
│                          ⬜ Notifica a:                                  │
│                             - Operaciones                                │
│                             - Sala de control                            │
│                             - Porteria                                   │
│                                    │                                     │
│                                    v                                     │
│                             ┌─────────────────────┐                      │
│                          ⬜ │  UNIDAD DISPONIBLE  │                      │
│                             │  EN SISTEMA         │                      │
│                             └─────────────────────┘                      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Flujo de Ausencia de Repuestos ⬜ PENDIENTE

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ACTOR: Jefe de Taller (analiza ausencia de repuestos)                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ⬜ Operario detecta que NO hay repuestos disponibles                    │
│                         │                                                │
│                         v                                                │
│  ⬜ Jefe de Taller debe analizar:                                        │
│                         │                                                │
│              ┌──────────┴──────────┐                                     │
│              v                     v                                     │
│     ┌─────────────────┐    ┌─────────────────┐                           │
│  ⬜ │  EQUIPO PUEDE   │ ⬜ │  EQUIPO NO PUEDE│                           │
│     │  seguir operando│    │  seguir operando│                           │
│     └─────────────────┘    └─────────────────┘                           │
│              │                     │                                     │
│              v                     v                                     │
│  ⬜ PM pasa a condicion  ⬜ OT queda abierta en                          │
│     "EN ESPERA DE           condicion "ESPERA                            │
│     REPUESTO"               DE REPUESTOS"                                │
│              │                     │                                     │
│              v                     v                                     │
│  ⬜ Equipo sigue         ⬜ Sistema notifica:                            │
│     OPERATIVO               "Unidad NO operativa"                        │
│                                    │                                     │
│                                    v                                     │
│                          ⬜ Estado cambia cuando                         │
│                             Jefe Mant. asigne                            │
│                             nuevamente referente                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Resumen de Avance por Hoja

```
HOJA 1 - Inicio:        ████████████████████ 100%  ✅ COMPLETA
HOJA 2 - Planificacion: ████████░░░░░░░░░░░░  40%  🟡 PARCIAL
HOJA 3 - Ejecucion:     ░░░░░░░░░░░░░░░░░░░░   0%  ⬜ PENDIENTE

TOTAL:                  ██████░░░░░░░░░░░░░░  35%
```

---

## Estados del Sistema

### Solicitud de Mantenimiento (SM) ✅

| Estado             | Descripcion                         | Implementado |
| ------------------ | ----------------------------------- | ------------ |
| `pending_approval` | Esperando validacion del supervisor | ✅           |
| `approved`         | Aprobada, se genera PM              | ✅           |
| `rejected`         | Rechazada con justificacion         | ✅           |

### Pedido de Mantenimiento (PM) 🟡

| Estado               | Descripcion                               | Implementado |
| -------------------- | ----------------------------------------- | ------------ |
| `pending_scheduling` | Pendiente de planificacion por Jefe Mant  | ✅           |
| `scheduled`          | Planificado, esperando entrada a taller   | ✅           |
| `in_workshop`        | En taller, OTs en ejecucion               | ✅           |
| `waiting_parts`      | En espera de repuestos (equipo operativo) | ⬜           |
| `completed`          | Todas las OT cerradas y conformes         | ⬜           |
| `rejected`           | Rechazado                                 | ✅           |

### Orden de Trabajo (OT) ⬜ POR IMPLEMENTAR

| Estado               | Descripcion                      | Implementado |
| -------------------- | -------------------------------- | ------------ |
| `pending`            | Creada, pendiente de ejecucion   | ⬜           |
| `in_progress`        | En ejecucion por operario        | ⬜           |
| `waiting_parts`      | En espera de repuestos           | ⬜           |
| `completed`          | Culminada por operario           | ⬜           |
| `pending_validation` | Pendiente validacion Jefe Taller | ⬜           |
| `approved`           | Conforme, cerrada                | ⬜           |
| `rejected`           | No conforme, requiere retrabajo  | ⬜           |

### Equipo/Vehiculo ✅

| Condicion      | Descripcion                   | Implementado |
| -------------- | ----------------------------- | ------------ |
| `operativo`    | Disponible para operaciones   | ✅           |
| `no operativo` | En taller o fuera de servicio | ✅           |

---

## Roles Involucrados

| Rol                        | Responsabilidades                                   | Implementado |
| -------------------------- | --------------------------------------------------- | ------------ |
| **Operario/Chofer**        | Escanea QR, completa checklist, genera SM           | ✅           |
| **Supervisor**             | Valida/rechaza items de la SM                       | ✅           |
| **Jefe de Mantenimiento**  | Planifica PM, deriva a taller externo/interno       | 🟡           |
| **Jefe de Taller**         | Asigna sectores, genera OTs, valida conformidad     | ⬜           |
| **Operario Mantenimiento** | Ejecuta OTs, gestiona repuestos, cierra OTs         | ⬜           |
| **Operaciones**            | Coordina disponibilidad, recibe notif. unidad lista | ⬜           |
| **Porteria**               | Check de ingreso/salida de unidades                 | ⬜           |

---

## Notificaciones del Sistema

| Evento                  | Notifica a                         | Implementado |
| ----------------------- | ---------------------------------- | ------------ |
| SM creada               | Supervisor                         | ⬜           |
| PM creado               | Jefe de Mantenimiento              | ⬜           |
| PM planificado          | Operaciones, Jefe de Taller        | ⬜           |
| Unidad ingresa a taller | Mantenimiento, Operaciones         | ⬜           |
| OT creada               | Operario de Mantenimiento asignado | ⬜           |
| OT cerrada              | Jefe de Taller                     | ⬜           |
| PM completado           | Operaciones, Sala, Porteria        | ⬜           |
| Unidad sin repuestos    | Jefe de Mantenimiento, Compras     | ⬜           |

---

## Estado de Implementacion

```
✅ Implementado    🟡 Parcial    ⬜ Pendiente
```

| Funcionalidad                     | Estado |
| --------------------------------- | ------ |
| Checklist con desvios             | ✅     |
| Solicitud de Mantenimiento        | ✅     |
| Validacion por Supervisor         | ✅     |
| Conversion SM -> PM               | ✅     |
| Planificacion de PM (interno)     | ✅     |
| Entrada a taller + km + condicion | ✅     |
| Derivacion a taller externo       | ⬜     |
| Coordinacion con Operaciones      | ⬜     |
| Check de porteria                 | ⬜     |
| Asignacion de sectores            | ⬜     |
| Generacion de OTs                 | ⬜     |
| Ejecucion de OTs                  | ⬜     |
| Gestion de repuestos              | ⬜     |
| Validacion conformidad            | ⬜     |
| Cierre y notificacion             | ⬜     |
| Sistema de notificaciones         | ⬜     |

---

## Proximos Pasos (Prioridad)

| #   | Prioridad | Funcionalidad                                 |
| --- | --------- | --------------------------------------------- |
| 1   | CRITICO   | Crear tabla y CRUD de Ordenes de Trabajo (OT) |
| 2   | CRITICO   | Asignacion de sectores por Jefe de Taller     |
| 3   | CRITICO   | Ejecucion de OT por Operario de Mantenimiento |
| 4   | CRITICO   | Validacion de conformidad y cierre            |
| 5   | MEDIO     | Estado "En espera de repuesto"                |
| 6   | MEDIO     | Derivacion a taller externo                   |
| 7   | BAJO      | Check de porteria                             |
| 8   | BAJO      | Coordinacion formal con Operaciones           |
| 9   | BAJO      | Sistema de notificaciones                     |
