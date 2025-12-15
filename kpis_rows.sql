INSERT INTO "public"."kpis" ("id", "company_id", "name", "code", "number", "validity_date", "calculation_formula", "improvement_opportunities", "filters", "is_active", "created_at", "updated_at", "technical_support") VALUES ('026a9dde-13b3-420e-82b9-55b7f32ab562', 'be4119b0-12ca-4a8f-87ed-209239194dab', 'Disponibilidad operacional / movimientos internos', 'KPI-0005', '10', '2026-03-31', 'EMI = Equipos en Movimientos Internos
EOA = Total de Equipos del Tipo Tractor y Chasis que su estado sea distinto a "En Preparación" y "NO Operativo" 
EAMI = Total de Equipos del Tipo Tractor y Chasis que en el parte de operaciones estén asignados al Cliente (GH - Movimientos Internos) 

EMI = ( EAMI / EOA ) * 100', null, null, 'true', '2025-12-13 17:08:59.614261+00', '2025-12-13 17:08:59.614261+00', 'true'), ('665351c2-09f8-431d-a0ae-cc60d71c667c', 'be4119b0-12ca-4a8f-87ed-209239194dab', 'Asignación de personal en movimientos internos', 'KPI-0002', '10', '2026-03-31', 'PMI = Personal en movimientos internos
TPA = Total de Empleados con la categoría Chofer de 1° y Chofer de 3° con un diagrama laboralemente activo 
TMI = Total de Empleados con la categoría Chofer de 1° y Chofer de 3° que en el parte de operaciones esten asignados al Cliente (GH - Movimientos Internos)

PMI = (TMI / TPA) * 100', null, null, 'true', '2025-12-13 15:24:17.302722+00', '2025-12-13 15:24:17.302722+00', 'true'), ('67623e74-2305-40e6-9155-28d669a0d40a', 'be4119b0-12ca-4a8f-87ed-209239194dab', 'Disponibilidad operacional / equipos en cliente', 'KPI-0006', '95', '2026-03-31', 'EOC = Equipos Operativo en cliente

TEOA = Total de Equipos del Tipo Tractor y Chasis que su estado sea distinto a "En Preparación" y "NO Operativo" - Total de Equipos Tracto y Chasis que en el parte de operaciones estén asignados al cliente (GH - Movientos Internos) 
 
TEOC = Total de equipos del Tipo Tractor y Chasis que en el parte de operaciones estén asignados a Clientes que no sean (GH - Movimientos Internos)

EOC = ( TEOC / TEOA ) * 100', null, null, 'true', '2025-12-13 17:15:50.052454+00', '2025-12-13 17:15:50.052454+00', 'true'), ('677df4d8-1f7e-4fd2-a0fc-5819b3acb6eb', 'be4119b0-12ca-4a8f-87ed-209239194dab', 'Productividad y asignación de personal', 'KPI-0003', '95', '2026-03-31', 'PP = Personal Productivo 
TMI = Total de Empleados con la categoría Chofer de 1° y Chofer de 3° que en el parte de operaciones esten asignados al Cliente (GH - Movimientos Internos)
TPA = Total de Empleados con la categoría Chofer de 1° y Chofer de 3° con un diagrama laboralemente activo - TMI
TPC =  Total de Empleados con la categoría Chofer de 1° y Chofer de 3° que en el parte de operaciones esten asignados al Clientes que no sean (GH - Movimientos Internos)

PP = (TPC / TPA) * 100', null, null, 'true', '2025-12-13 15:42:11.246739+00', '2025-12-13 15:42:11.246739+00', 'true'), ('a78af8f0-f0b8-4e99-bcf4-cc909bfdb5ee', 'be4119b0-12ca-4a8f-87ed-209239194dab', 'Disponibilidad operacional / mantenimiento ', 'KPI-0004', '10', '2026-03-31', 'EDO = Equipos con disponibilidad operativa
EA = Total de Equipos del Tipo Tractor y Chasis que su estado sea distinto a "En Prepareción"
ENO = Total de Equipos del Tipo Tractor y Chasis que su estado se "No Operativo"

EDO = ( ENO / EA ) * 100 ', null, null, 'true', '2025-12-13 17:03:22.004966+00', '2025-12-13 17:03:22.004966+00', 'true'), ('df55d4c3-bbb9-4b8e-b76a-ddee19736174', 'be4119b0-12ca-4a8f-87ed-209239194dab', 'Ausentismo Diario', 'KPI-0001', '3', '2026-03-31', 'AD : Ausentismo Diario
TE: Total de empleados en nomina activa de la empresa (Todos)
TA: Total de empleados que posean una novedad de diagrama del tipo :
- Ausencia Asiste a curso
- Ausencia Devolución Fco
- Ausencia Dia Accidente
- Ausencia Dia de Mudanza
- Ausencia Dia de Permiso con descuento
- Ausencia Dia de Permiso sin descuento
- Ausencia Dia Enfermedad
- Ausencia Dia Enfermedad Fliar Directo
- Ausencia Dia Lic Maternidad
- Ausencia Dia Lic Paternidad
- Ausencia Dia Permiso Gremial
- Ausencia Falta sin Aviso- Injustificada
- Ausencia Feriado No Trabajado
- Ausencia Lic Matrimonio
- Ausencia-Permanece en su casa
- Ausencia por Falta de Documentacion
- Dia de Curso
- Dia de Paro
- Dia de Suspensión
- Fallecimiento Familiar

AD = (TA / TE) * 100

', null, null, 'true', '2025-12-13 15:13:53.425953+00', '2025-12-13 15:13:53.425953+00', 'true');