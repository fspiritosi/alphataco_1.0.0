import { getActiveEquipmentsForDailyReport, getAllActiveEmployeesForDailyReport } from '../actions/actions';

// Tipos
type Employees = Awaited<ReturnType<typeof getAllActiveEmployeesForDailyReport>>;
type Equipments = Awaited<ReturnType<typeof getActiveEquipmentsForDailyReport>>;

/**
 * Construye un índice Map de empleados por cliente para lookup O(1)
 * @param employees - Lista completa de empleados
 * @returns Map con customerId como key y array de empleados como value
 */
export function buildEmployeeIndex(employees: Employees | undefined) {
  const index = new Map<string, NonNullable<Employees>>();

  if (!employees) return index;

  employees.forEach((employee) => {
    // Solo incluir empleados activos (ya no requerimos diagrama)
    if (!employee.is_active) return;

    // Agregar a cada cliente al que está asignado
    employee.contractor_employee?.forEach((ce) => {
      const customerId = ce.customers?.id;
      if (customerId) {
        if (!index.has(customerId)) {
          index.set(customerId, []);
        }
        // Evitar duplicados
        const customerEmployees = index.get(customerId)!;
        if (!customerEmployees.find((e) => e.id === employee.id)) {
          customerEmployees.push(employee);
        }
      }
    });
  });

  return index;
}

/**
 * Construye un índice Map de equipos por cliente para lookup O(1)
 * @param equipments - Lista completa de equipos
 * @returns Map con customerId como key y array de equipos como value
 */
export function buildEquipmentIndex(equipments: Equipments | undefined) {
  const index = new Map<string, NonNullable<Equipments>>();

  if (!equipments) return index;

  equipments.forEach((equipment) => {
    // Agregar a cada cliente al que está asignado
    equipment.contractor_equipment?.forEach((ce) => {
      const customerId = ce.customers?.id;
      if (customerId) {
        if (!index.has(customerId)) {
          index.set(customerId, []);
        }
        // Evitar duplicados
        const customerEquipments = index.get(customerId)!;
        if (!customerEquipments.find((e) => e.id === equipment.id)) {
          customerEquipments.push(equipment);
        }
      }
    });
  });

  return index;
}

/**
 * Filtra empleados por cliente desde el índice pre-construido
 * @param customerId - ID del cliente
 * @param employeeIndex - Índice pre-construido de empleados
 * @param allEmployees - Lista completa de empleados (para no asignados)
 * @returns Objeto con empleados asignados, no asignados y todos
 */
export function filterEmployeesByCustomer(
  customerId: string | null,
  employeeIndex: Map<string, NonNullable<Employees>>,
  allEmployees: Employees | undefined
) {
  if (!customerId) {
    return {
      assignedEmployees: [],
      unassignedEmployees: [],
      allEmployees: [],
    };
  }

  // Lookup instantáneo O(1)
  const assigned = employeeIndex.get(customerId) || [];

  // Empleados no asignados: todos los activos que NO están en assigned (ya no requerimos diagrama)
  const assignedIds = new Set(assigned.map((e) => e.id));
  const unassigned = allEmployees?.filter((employee) => employee.is_active && !assignedIds.has(employee.id)) || [];

  const all = [...assigned, ...unassigned];

  return {
    assignedEmployees: assigned,
    unassignedEmployees: unassigned,
    allEmployees: all,
  };
}

/**
 * Filtra equipos por cliente desde el índice pre-construido
 * @param customerId - ID del cliente
 * @param equipmentIndex - Índice pre-construido de equipos
 * @param allEquipments - Lista completa de equipos (para no asignados)
 * @returns Objeto con equipos asignados, no asignados y todos
 */
export function filterEquipmentsByCustomer(
  customerId: string | null,
  equipmentIndex: Map<string, NonNullable<Equipments>>,
  allEquipments: Equipments | undefined
) {
  if (!customerId) {
    return {
      assignedEquipments: [],
      unassignedEquipments: [],
      allEquipments: [],
    };
  }

  // Lookup instantáneo O(1)
  const assigned = equipmentIndex.get(customerId) || [];

  // Equipos no asignados: todos los que NO están en assigned
  const assignedIds = new Set(assigned.map((e) => e.id));
  const unassigned = allEquipments?.filter((equipment) => !assignedIds.has(equipment.id)) || [];

  const all = [...assigned, ...unassigned];

  return {
    assignedEquipments: assigned,
    unassignedEquipments: unassigned,
    allEquipments: all,
  };
}
