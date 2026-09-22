# Inventario de lógica SQL vigente

Generado por `scripts/sql/extract-sql-objects.ts` — no editar a mano (regenerar con `node scripts/sql/extract-sql-objects.ts`).

Fuentes leídas en orden cronológico: 123 archivos (43 de `supabase/migrations`, 80 de `prisma/migrations` con timestamp ≥ 20260313).

## Objetos portados (en `prisma/sql/<dominio>.sql`)

Llamadores: `src (rpc|raw|ref)` = llamada desde `src/` (`rpc('x')`, `x(` en SQL crudo, o el nombre como literal); `edge function` = `supabase/functions/`; `trigger`/`fn`/`vista` = otro objeto vigente; `†` = ese llamador es huérfano o descartado (no cuenta).

| Nombre | Tipo | Dominio | Tabla | Llamadores | Referencias Supabase |
| --- | --- | --- | --- | --- | --- |
| `actualizar_estado_daily_reports` | function | daily-report | — | fn: after_dailyreportrows_update†, after_dailyreportrows_update_optimized | no |
| `add_to_companies_employees` | function | misc | — | trigger: after_employee_insert ON employees | no |
| `after_dailyreportrows_update_optimized` | function | daily-report | — | trigger: tr_after_dailyreportrows_update_optimized ON dailyreportrows | no |
| `assign_owner_role_on_company_creation` | function | permissions | — | trigger: assign_owner_role_trigger ON company | no |
| `build_employee_where_alias` | function | misc | — | fn: controlar_alertas_documentos_single_employee, controlar_alertas_single_document_all_employees | no |
| `build_vehicle_where_alias` | function | misc | — | fn: controlar_alertas_documentos_single_vehicle, controlar_alertas_single_document_all_vehicles | no |
| `check_diagram_conflicts_with_operations_v2` | function | diagrams | — | src (rpc): src/features/Employees/Diagrams/actions/diagram-massive-actions.ts:132 | no |
| `check_multiple_permissions` | function | permissions | — | src (rpc): src/features/Permissions/actionsServer.ts:160 | no |
| `check_novelty_conflicts` | function | diagrams | — | src (rpc): src/features/Employees/Diagrams/actions/diagram-massive-actions.ts:199 | no |
| `controlar_alertas_documentos_single_employee` | function | documents | — | src (raw): src/features/Employees/EmpleadoID/actions.server.ts:582, src/features/Employees/EmpleadoID/lib/create-employee-core.ts:91, src/features/Empresa/Clientes/actions.ts:142<br>fn: trg_controlar_alertas_employees | sí (auth.jwt()) |
| `controlar_alertas_documentos_single_vehicle` | function | documents | — | src (raw): src/features/Empresa/Clientes/actions.ts:213, src/features/Equipos/EquipoID/lib/actions/vehicle-actions.ts:280<br>fn: trg_controlar_alertas_vehicles | sí (auth.jwt()) |
| `controlar_alertas_single_document_all_employees` | function | documents | — | fn: add_new_document†, trg_document_types_insert, trg_document_types_update | no |
| `controlar_alertas_single_document_all_vehicles` | function | documents | — | fn: add_new_document†, trg_document_types_insert, trg_document_types_update | no |
| `deactivate_service_items` | function | misc | — | trigger: after_service_update ON customer_services, after_service_update ON service_items | no |
| `equipment_allocated_to` | function | misc | — | trigger: add_contractor_equipment_after_insert ON vehicles | no |
| `find_employee_by_full_name_v2` | function | misc | — | src (rpc): src/features/Formularios/actions/checklist-actions.ts:14 | no |
| `format_employee_names` | function | misc | — | trigger: format_employee_names_trigger ON employees | no |
| `generate_kpi_code` | function | kpis | — | src (rpc): src/features/Dashboard/Estadisticas/KPIs/actions/actions.ts:111 | no |
| `get_company_counts_indicator` | function | kpis | — | src (ref): src/features/Dashboard/Estadisticas/KPIs/Graficos/actions/getChartData.ts:12, src/features/Dashboard/Estadisticas/KPIs/Graficos/components/CompanyCountsChart.tsx:42, src/features/Dashboard/Estadisticas/KPIs/Graficos/hooks/useChartData.ts:12<br>fn: run_daily_indicators_for_all_companies† | no |
| `get_daily_report_deviations` | function | daily-report | — | src (rpc): src/features/Operaciones/PartesDiarios/actions/actions.ts:1089<br>edge function: (rpc) supabase/functions/send-deviations-email/index.ts:555 | no |
| `get_daily_report_deviations_indicator` | function | daily-report | — | src (ref): src/features/Dashboard/Estadisticas/SalaDeControl/actions/actions.server.ts:102<br>fn: run_daily_indicators_for_all_companies† | no |
| `get_dailyreportrow_history` | function | daily-report | — | src (rpc): src/features/Operaciones/PartesDiarios/actions/actions.ts:125 | no |
| `get_documents_expiry_summary` | function | documents | — | edge function: (rpc) supabase/functions/send-documents-expiry-email/index.ts:648 | no |
| `get_employee_diagram_count_by_day` | function | diagrams | — | src (ref): src/features/Dashboard/Estadisticas/KPIs/Graficos/actions/getChartData.ts:13, src/features/Dashboard/Estadisticas/KPIs/Graficos/components/DiagramDistributionChart.tsx:27, src/features/Dashboard/Estadisticas/KPIs/Graficos/hooks/useChartData.ts:13<br>fn: collect_daily_indicators†, run_daily_indicators_for_all_companies† | no |
| `get_employee_usage_indicator` | function | kpis | — | src (ref): src/features/Dashboard/Estadisticas/KPIs/Graficos/actions/getChartData.ts:7, src/features/Dashboard/Estadisticas/KPIs/Graficos/components/EmployeeUsageChart.tsx:37, src/features/Dashboard/Estadisticas/KPIs/Graficos/hooks/useChartData.ts:7<br>fn: collect_daily_indicators†, run_daily_indicators_for_all_companies† | no |
| `get_kpi_range` | function | kpis | — | src (rpc): src/features/Dashboard/Estadisticas/KPIs/Graficos/actions/getKpiChartData.ts:24<br>src (ref): src/features/Dashboard/Estadisticas/KPIs/Graficos/actions/getKpiChartData.ts:32, src/features/Dashboard/Estadisticas/KPIs/Graficos/actions/getKpiChartData.ts:37 | no |
| `get_max_order_number` | function | misc | — | src (rpc): src/features/Operaciones/Preparte/actions/preparte.ts:469 | no |
| `get_services_summary_by_type` | function | kpis | — | src (rpc): src/features/Operaciones/PartesDiarios/actions/actions.ts:1994<br>fn: collect_daily_indicators† | no |
| `get_user_accessible_modules` | function | permissions | — | src (rpc): src/features/Permissions/actions.ts:197, src/features/Permissions/actionsServer.ts:317 | no |
| `get_user_permissions` | function | permissions | — | src (rpc): src/features/Permissions/actions.ts:110, src/features/Permissions/actions.ts:132, src/features/Permissions/actionsServer.ts:58<br>fn: check_multiple_permissions, get_user_accessible_modules, user_has_permission | no |
| `get_vehicle_usage_indicator` | function | kpis | — | src (ref): src/features/Dashboard/Estadisticas/KPIs/Graficos/actions/getChartData.ts:8, src/features/Dashboard/Estadisticas/KPIs/Graficos/components/VehicleUsageChart.tsx:37, src/features/Dashboard/Estadisticas/KPIs/Graficos/hooks/useChartData.ts:8<br>fn: collect_daily_indicators†, run_daily_indicators_for_all_companies† | no |
| `handle_employees_diagram_changes` | function | diagrams | — | trigger: trg_employees_diagram_changes ON employees_diagram | no |
| `hr_get_absenteeism_summary` | function | diagrams | — | src (ref): src/features/Dashboard/Estadisticas/KPIs/Graficos/actions/getChartData.ts:9, src/features/Dashboard/Estadisticas/KPIs/Graficos/components/AbsenteeismChart.tsx:42, src/features/Dashboard/Estadisticas/KPIs/Graficos/hooks/useChartData.ts:9 (+2)<br>src (raw): src/features/Dashboard/Estadisticas/RecursosHumanos/actions.server.ts:96<br>fn: run_daily_indicators_for_all_companies† | no |
| `hr_get_absenteeism_trend` | function | diagrams | — | src (ref): src/features/Dashboard/Estadisticas/KPIs/Graficos/actions/getChartData.ts:10, src/features/Dashboard/Estadisticas/KPIs/Graficos/components/AbsenteeismTrendChart.tsx:34, src/features/Dashboard/Estadisticas/KPIs/Graficos/hooks/useChartData.ts:10 (+2)<br>src (raw): src/features/Dashboard/Estadisticas/RecursosHumanos/actions.server.ts:124<br>fn: run_daily_indicators_for_all_companies† | no |
| `hr_get_current_absent_employees` | function | diagrams | — | src (ref): src/features/Dashboard/Estadisticas/KPIs/Graficos/actions/getChartData.ts:14, src/features/Dashboard/Estadisticas/KPIs/Graficos/hooks/useChartData.ts:14, src/features/Dashboard/Estadisticas/RecursosHumanos/actions.server.ts:150 (+3)<br>src (raw): src/features/Dashboard/Estadisticas/RecursosHumanos/actions.server.ts:151, src/features/Dashboard/Estadisticas/RecursosHumanos/actions.server.ts:253<br>fn: run_daily_indicators_for_all_companies† | no |
| `hr_get_daily_absence_timeseries` | function | diagrams | — | src (ref): src/features/Dashboard/Estadisticas/KPIs/Graficos/actions/getChartData.ts:11, src/features/Dashboard/Estadisticas/KPIs/Graficos/components/DailyAbsenceTimeseriesChart.tsx:42, src/features/Dashboard/Estadisticas/KPIs/Graficos/hooks/useChartData.ts:11 (+2)<br>src (raw): src/features/Dashboard/Estadisticas/RecursosHumanos/actions.server.ts:178<br>fn: run_daily_indicators_for_all_companies† | no |
| `hr_get_department_absence_reasons` | function | diagrams | — | src (ref): src/features/Dashboard/Estadisticas/KPIs/Graficos/actions/getChartData.ts:15, src/features/Dashboard/Estadisticas/KPIs/Graficos/hooks/useChartData.ts:15, src/features/Dashboard/Estadisticas/RecursosHumanos/actions.server.ts:205 (+1)<br>src (raw): src/features/Dashboard/Estadisticas/RecursosHumanos/actions.server.ts:206<br>fn: run_daily_indicators_for_all_companies† | no |
| `hr_get_department_absence_summary` | function | diagrams | — | src (ref): src/features/Dashboard/Estadisticas/KPIs/Graficos/actions/getChartData.ts:16, src/features/Dashboard/Estadisticas/KPIs/Graficos/hooks/useChartData.ts:16, src/features/Dashboard/Estadisticas/RecursosHumanos/actions.server.ts:229 (+1)<br>src (raw): src/features/Dashboard/Estadisticas/RecursosHumanos/actions.server.ts:230<br>fn: run_daily_indicators_for_all_companies† | no |
| `log_customer_equipment_relations_changes` | function | misc | — | trigger: tr_dailyreport_customer_equipment_relations_history ON dailyreport_customer_equipment_relations | no |
| `log_dailyreport_changes` | function | daily-report | — | trigger: tr_dailyreportrows_history_after_insert ON dailyreportrows, tr_dailyreportrows_history_before_delete ON dailyreportrows, tr_dailyreportrows_history_before_update ON dailyreportrows | no |
| `log_document_employee_changes` | function | documents | — | trigger: document_employee_changes_trigger ON documents_employees | no |
| `log_document_equipment_changes` | function | documents | — | trigger: document_equipment_changes_trigger ON documents_equipment | no |
| `log_employee_relations_changes` | function | misc | — | trigger: tr_dailyreport_employee_relations_history ON dailyreportemployeerelations | no |
| `log_equipment_relations_changes` | function | misc | — | trigger: tr_dailyreport_equipment_relations_history ON dailyreportequipmentrelations | no |
| `log_maintenance_order_activity` | function | maintenance | — | trigger: trigger_log_maintenance_order_activity ON maintenance_orders | sí (auth.uid()) |
| `log_reassignment_reason_before_update` | function | misc | — | trigger: before_update_log_reason ON dailyreportrows | no |
| `log_work_order_activity` | function | maintenance | — | trigger: trigger_log_work_order_activity ON work_orders | sí (auth.uid()) |
| `next_pre_file_number` | function | misc | — | src (ref): src/features/Employees/PreLegajos/actions/pre-employee-actions.server.ts:166<br>src (raw): src/features/Employees/PreLegajos/actions/pre-employee-actions.server.ts:167 | no |
| `process_massive_diagram_creation_v2` | function | diagrams | — | src (rpc): src/features/Employees/Diagrams/actions/diagram-massive-actions.ts:165 | no |
| `process_massive_novelty_creation` | function | diagrams | — | src (rpc): src/features/Employees/Diagrams/actions/diagram-massive-actions.ts:230 | no |
| `recalcular_status_documentacion` | function | documents | — | src (raw): src/features/Documentacion/TiposDocumentos/actions/actions.server.ts:1319<br>fn: controlar_alertas_documentos_single_employee, controlar_alertas_documentos_single_vehicle, update_status_trigger | no |
| `select_distinct_values` | function | misc | — | src (rpc): src/shared/actions/supabase-query.ts:326 | no |
| `trg_controlar_alertas_employees` | function | documents | — | trigger: controlar_alertas_employees ON employees, controlar_alertas_employees_insert ON employees | no |
| `trg_controlar_alertas_vehicles` | function | documents | — | trigger: controlar_alertas_vehicles ON vehicles, controlar_alertas_vehicles_insert ON vehicles | no |
| `trg_document_types_insert` | function | documents | — | trigger: document_types_after_insert ON document_types | no |
| `trg_document_types_update` | function | documents | — | trigger: document_types_after_update ON document_types | no |
| `update_company_by_defect` | function | misc | — | trigger: update_company_by_defect_trigger ON company | no |
| `update_employee_diagram_status` | function | documents | — | src (rpc): src/features/Employees/EmpleadoID/lib/actions/document-actions.ts:59, src/features/Empresa/Usuarios/actions.server.ts:560, src/features/Empresa/Usuarios/actions.server.ts:642 | no |
| `update_status_trigger` | function | documents | — | trigger: trg_update_documents_employees ON documents_employees, trg_update_documents_employees_del ON documents_employees, trg_update_documents_employees_ins ON documents_employees (+3) | no |
| `update_updated_at_column` | function | misc | — | trigger: update_empleado_aptitudes_updated_at ON empleado_aptitudes, update_maintenance_orders_updated_at ON maintenance_orders, update_maintenance_requests_updated_at ON maintenance_requests | no |
| `update_work_order_item_repairs_updated_at` | function | maintenance | — | trigger: trigger_update_work_order_item_repairs_updated_at ON work_order_item_repairs | no |
| `update_work_orders_updated_at` | function | maintenance | — | trigger: trigger_work_order_items_updated_at ON work_order_items, trigger_work_orders_updated_at ON work_orders | no |
| `user_has_permission` | function | permissions | — | src (rpc): src/features/Permissions/actions.ts:164, src/features/Permissions/actionsServer.ts:210 | no |
| `equipments_with_pending_deviations` | view | daily-report | — | src (ref): src/features/Mantenimiento/actions/maintenance-actions.ts:582 | no |
| `assign_owner_role_trigger` | trigger | permissions | company | — | no |
| `update_company_by_defect_trigger` | trigger | misc | company | — | no |
| `after_service_update` | trigger | misc | customer_services | — | no |
| `tr_dailyreport_customer_equipment_relations_history` | trigger | daily-report | dailyreport_customer_equipment_relations | — | no |
| `tr_dailyreport_employee_relations_history` | trigger | daily-report | dailyreportemployeerelations | — | no |
| `tr_dailyreport_equipment_relations_history` | trigger | daily-report | dailyreportequipmentrelations | — | no |
| `before_update_log_reason` | trigger | daily-report | dailyreportrows | — | no |
| `tr_after_dailyreportrows_update_optimized` | trigger | daily-report | dailyreportrows | — | no |
| `tr_dailyreportrows_history_after_insert` | trigger | daily-report | dailyreportrows | — | no |
| `tr_dailyreportrows_history_before_delete` | trigger | daily-report | dailyreportrows | — | no |
| `tr_dailyreportrows_history_before_update` | trigger | daily-report | dailyreportrows | — | no |
| `document_types_after_insert` | trigger | documents | document_types | — | no |
| `document_types_after_update` | trigger | documents | document_types | — | no |
| `document_employee_changes_trigger` | trigger | documents | documents_employees | — | no |
| `trg_update_documents_employees` | trigger | documents | documents_employees | — | no |
| `trg_update_documents_employees_del` | trigger | documents | documents_employees | — | no |
| `trg_update_documents_employees_ins` | trigger | documents | documents_employees | — | no |
| `document_equipment_changes_trigger` | trigger | documents | documents_equipment | — | no |
| `trg_update_documents_equipment` | trigger | documents | documents_equipment | — | no |
| `trg_update_documents_equipment_del` | trigger | documents | documents_equipment | — | no |
| `trg_update_documents_equipment_ins` | trigger | documents | documents_equipment | — | no |
| `update_empleado_aptitudes_updated_at` | trigger | misc | empleado_aptitudes | — | no |
| `after_employee_insert` | trigger | misc | employees | — | no |
| `controlar_alertas_employees` | trigger | documents | employees | — | no |
| `controlar_alertas_employees_insert` | trigger | documents | employees | — | no |
| `format_employee_names_trigger` | trigger | misc | employees | — | no |
| `trg_employees_diagram_changes` | trigger | diagrams | employees_diagram | — | no |
| `trigger_log_maintenance_order_activity` | trigger | maintenance | maintenance_orders | — | no |
| `update_maintenance_orders_updated_at` | trigger | maintenance | maintenance_orders | — | no |
| `update_maintenance_requests_updated_at` | trigger | maintenance | maintenance_requests | — | no |
| `after_service_update` | trigger | misc | service_items | — | no |
| `add_contractor_equipment_after_insert` | trigger | misc | vehicles | — | no |
| `controlar_alertas_vehicles` | trigger | documents | vehicles | — | no |
| `controlar_alertas_vehicles_insert` | trigger | documents | vehicles | — | no |
| `trigger_update_work_order_item_repairs_updated_at` | trigger | maintenance | work_order_item_repairs | — | no |
| `trigger_work_order_items_updated_at` | trigger | maintenance | work_order_items | — | no |
| `trigger_log_work_order_activity` | trigger | maintenance | work_orders | — | no |
| `trigger_work_orders_updated_at` | trigger | maintenance | work_orders | — | no |

## Resumen

- Objetos vigentes detectados: 148 (109 funciones, 1 vistas, 38 triggers)
- Portados a `prisma/sql/*.sql`: 102 (63 funciones, 1 vistas, 38 triggers)
- Sin llamador (huérfanos, no se portan): 46
- Descartados por tabla eliminada: 0
- Con referencias Supabase (a corregir en Task 4): 4

| Dominio | Funciones | Vistas | Triggers |
| --- | --- | --- | --- |
| permissions | 5 | 0 | 1 |
| documents | 14 | 0 | 14 |
| diagrams | 12 | 0 | 1 |
| daily-report | 6 | 1 | 8 |
| kpis | 6 | 0 | 0 |
| maintenance | 4 | 0 | 7 |
| misc | 16 | 0 | 7 |

## Sin llamador — no se portan

Quedan sólo en `objects.json` con `orphan: true`. Sus únicos llamadores (si los hay) son otros huérfanos o descartados (`†`), que no cuentan.

| Nombre | Tipo | Dominio | Llamadores no vigentes | Origen |
| --- | --- | --- | --- | --- |
| `actualizar_estado_documentos` | function | documents | — | supabase/migrations/20251103211302_initial_structure.sql |
| `ad_ausentismo_diario` | function | misc | — | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `add_new_document` | function | documents | — | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `after_dailyreportrows_update` | function | daily-report | — | supabase/migrations/20251103211302_initial_structure.sql |
| `after_dailyreportrows_update_specific` | function | daily-report | — | supabase/migrations/20251103211302_initial_structure.sql |
| `build_employee_where` | function | misc | — | supabase/migrations/20251103211302_initial_structure.sql |
| `build_vehicle_where` | function | misc | — | supabase/migrations/20251103211302_initial_structure.sql |
| `check_diagram_conflicts_with_operations` | function | diagrams | — | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `collect_daily_indicators` | function | daily-report | — | supabase/migrations/20251103211302_initial_structure.sql |
| `create_massive_diagrams_with_validations` | function | diagrams | — | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `create_user_for_external_login` | function | misc | — | supabase/migrations/20251103211302_initial_structure.sql |
| `ea_total_equipos_aptos` | function | misc | fn: edo_disponibilidad_operacional_mantenimiento† | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `eami_equipos_movimientos_internos` | function | misc | fn: emi_disponibilidad_operacional_mi†, teoa_total_equipos_operativos_ajustado† | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `edo_disponibilidad_operacional_mantenimiento` | function | misc | — | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `emi_disponibilidad_operacional_mi` | function | misc | — | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `eno_total_equipos_no_operativos` | function | misc | fn: edo_disponibilidad_operacional_mantenimiento† | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `enviar_documentos_a_46_dias` | function | documents | — | supabase/migrations/20251103211302_initial_structure.sql |
| `enviar_documentos_vencidos` | function | documents | — | supabase/migrations/20251103211302_initial_structure.sql |
| `eoa_total_equipos_operativos` | function | misc | fn: emi_disponibilidad_operacional_mi†, teoa_total_equipos_operativos_ajustado† | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `eoc_disponibilidad_operacional_cliente` | function | misc | — | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `filter_employees_by_conditions` | function | misc | — | supabase/migrations/20251103211302_initial_structure.sql |
| `filter_vehicles_by_conditions` | function | misc | — | supabase/migrations/20251103211302_initial_structure.sql |
| `get_company_for_user` | function | misc | — | supabase/migrations/20251103211302_initial_structure.sql |
| `get_employee_usage_by_positions` | function | misc | — | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `get_employees_not_in_daily_report` | function | daily-report | — | supabase/migrations/20251103211302_initial_structure.sql |
| `get_vehicles_non_operative` | function | misc | — | supabase/migrations/20251103211302_initial_structure.sql |
| `get_vehicles_not_in_daily_report` | function | daily-report | — | supabase/migrations/20251103211302_initial_structure.sql |
| `marcar_prepartes_vencidos` | function | daily-report | — | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `migrate_document` | function | documents | — | supabase/migrations/20251103211302_initial_structure.sql |
| `migrate_documents_preview` | function | documents | — | supabase/migrations/20251103211302_initial_structure.sql |
| `obtener_documentos_por_vencer` | function | documents | — | supabase/migrations/20251103211302_initial_structure.sql |
| `pmi_personal_mi` | function | misc | — | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `pp_productividad_personal` | function | misc | — | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `pruebaemail` | function | misc | — | supabase/migrations/20251103211302_initial_structure.sql |
| `resume_work_order` | function | maintenance | — | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `run_daily_indicators_for_all_companies` | function | daily-report | — | prisma/migrations/20260819120100_add_daily_report_deviations_snapshot/migration.sql |
| `set_reassignment_reason` | function | misc | — | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `ta_total_ausentes` | function | misc | fn: ad_ausentismo_diario† | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `te_total_empleados` | function | misc | fn: ad_ausentismo_diario† | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `teoa_total_equipos_operativos_ajustado` | function | misc | — | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `teoc_equipos_operativos_en_clientes` | function | misc | — | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `tmi_total_personal_mi` | function | misc | fn: pmi_personal_mi†, pp_productividad_personal† | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `tpa_total_personal_apto` | function | misc | fn: pmi_personal_mi†, pp_productividad_personal† | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `tpc_total_personal_clientes` | function | misc | fn: pp_productividad_personal† | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `update_vehicle_kilometer_anonymous` | function | misc | — | supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `verificar_documentos_vencidos_prueba` | function | documents | — | supabase/migrations/20251103211302_initial_structure.sql |

## Descartados por tabla eliminada

| Nombre | Tipo | Tabla | Motivo | Origen |
| --- | --- | --- | --- | --- |

## Con referencias Supabase (para la Task 4)

| Nombre | Tipo | Dominio | Referencias |
| --- | --- | --- | --- |
| `controlar_alertas_documentos_single_employee` | function | documents | auth.jwt() |
| `controlar_alertas_documentos_single_vehicle` | function | documents | auth.jwt() |
| `log_maintenance_order_activity` | function | maintenance | auth.uid() |
| `log_work_order_activity` | function | maintenance | auth.uid() |

## Sobrecargas vigentes (revisar a mano)

Firmas distintas creadas sin `DROP` intermedio: en Postgres coexisten; acá se conserva sólo la última definición.

| Función | Firma conservada | Firmas vivas (origen de la última definición de cada una) |
| --- | --- | --- |
| `check_diagram_conflicts_with_operations` | `(uuid[], uuid, date, date)` | `(uuid[], date, date)` ← supabase/migrations/20260202113926_fixing-maintenance-flow.sql<br>`(uuid[], uuid, date, date)` ← supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `check_diagram_conflicts_with_operations_v2` | `(text[], uuid, date, date)` | `(text[], text, date, date, text)` ← supabase/migrations/20251103211302_initial_structure.sql<br>`(text[], uuid, date, date)` ← supabase/migrations/20260202113926_fixing-maintenance-flow.sql |
| `get_daily_report_deviations` | `(uuid, date)` | `(uuid)` ← supabase/migrations/20260202113926_fixing-maintenance-flow.sql<br>`(uuid, date)` ← prisma/migrations/20260915190000_exclude_other_equipment_from_deviations/migration.sql |

## Jobs de cron encontrados en migraciones (legacy)

- `weekly-documents-expiry-email` (prisma/migrations/20260512162500_schedule_documents_expiry_cron/migration.sql) → llama: `schedule`, `http_post`
