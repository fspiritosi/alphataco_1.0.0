'use server';

import type {
  cost_type_enum,
  document_type_enum,
  gender_enum,
  level_of_education_enum,
  marital_status_enum,
  nationality_enum,
} from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { getCachedSession } from '@/shared/lib/cached-session';
import { prisma } from '@/shared/lib/prisma';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { createEmployeeCore } from './lib/create-employee-core';
import type { EmployeeFormData } from './schemas/employee-schema';

const logger = new Logger('features/EmpleadoID');

/**
 * Obtiene un empleado por ID con todas sus relaciones necesarias para el detalle.
 * Wrapped con React.cache() para deduplicar llamadas dentro del mismo request.
 */
export const getEmployeeByIdCached = cache(async (employeeId: string) => {
  logger.debug('Obteniendo empleado por ID', { data: { employeeId } });

  try {
    const employee = await prisma.employees.findUnique({
      where: { id: employeeId },
      select: {
        // Campos escalares de identidad
        id: true,
        firstname: true,
        lastname: true,
        full_name: true,
        cuil: true,
        document_type: true,
        document_number: true,
        // Campos personales
        nationality: true,
        gender: true,
        marital_status: true,
        level_of_education: true,
        born_date: true,
        picture: true,
        // Campos de contacto / domicilio
        street: true,
        street_number: true,
        postal_code: true,
        phone: true,
        email: true,
        // Campos laborales escalares
        file: true,
        normal_hours: true,
        date_of_admission: true,
        is_active: true,
        status: true,
        affiliate_status: true,
        reason_for_termination: true,
        termination_date: true,
        allocated_to: true,
        cost_type: true,
        // FKs escalares (necesarias para preseleccionar dropdowns)
        hierarchical_position: true,
        company_position: true,
        workflow_diagram: true,
        type_of_contract: true,
        guild_id: true,
        covenants_id: true,
        category_id: true,
        cost_center_id: true,
        province: true,
        city: true,
        birthplace: true,
        // Relaciones resueltas (id + name/nombre)
        countries: {
          select: { id: true, name: true },
        },
        provinces: {
          select: { id: true, name: true },
        },
        cities: {
          select: { id: true, name: true },
        },
        hierarchy: {
          select: { id: true, name: true },
        },
        company_positions: {
          select: { id: true, name: true },
        },
        work_diagram: {
          select: { id: true, name: true },
        },
        types_of_contract: {
          select: { id: true, name: true },
        },
        guild: {
          select: { id: true, name: true },
        },
        covenant: {
          select: { id: true, name: true },
        },
        category: {
          select: { id: true, name: true },
        },
        cost_center: {
          select: { id: true, name: true },
        },
        // M:M — sectores de taller asignados
        employee_workshop_sectors: {
          select: {
            workshop_sectors: {
              select: { id: true, name: true },
            },
          },
        },
        // M:M — afectaciones a clientes
        contractor_employee: {
          select: {
            customers: {
              select: { id: true, name: true },
            },
          },
        },
        // M:M — aptitudes técnicas
        empleado_aptitudes: {
          select: {
            aptitudes_tecnicas: {
              select: { id: true, nombre: true },
            },
          },
        },
      },
    });

    return employee;
  } catch (error) {
    logger.error('Error al obtener empleado por ID', { data: { error, employeeId } });
    throw error;
  }
});

// Tipos inferidos del retorno — NUNCA definir manualmente
export type EmployeeDetailData = Awaited<ReturnType<typeof getEmployeeByIdCached>>;

// ─── Funciones de catálogo ───────────────────────────────────────────────────

export async function getAllCountryOptions() {
  logger.debug('Obteniendo opciones de países');
  try {
    return await prisma.countries.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener opciones de países', { data: { error } });
    return [];
  }
}
export type CountryOption = Awaited<ReturnType<typeof getAllCountryOptions>>[number];

export async function getAllCostCenterOptions() {
  logger.debug('Obteniendo opciones de centros de costo');
  try {
    return await prisma.cost_center.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener opciones de centros de costo', { data: { error } });
    return [];
  }
}
export type CostCenterOption = Awaited<ReturnType<typeof getAllCostCenterOptions>>[number];

export async function getAllHierarchyOptions() {
  logger.debug('Obteniendo opciones de jerarquías');
  try {
    return await prisma.hierarchy.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener opciones de jerarquías', { data: { error } });
    return [];
  }
}
export type HierarchyOption = Awaited<ReturnType<typeof getAllHierarchyOptions>>[number];

export async function getAllCompanyPositionOptions() {
  logger.debug('Obteniendo opciones de puestos');
  try {
    return await prisma.company_positions.findMany({
      select: {
        id: true,
        name: true,
        hierarchical_position_id: true,
      },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener opciones de puestos', { data: { error } });
    return [];
  }
}
export type CompanyPositionOption = Awaited<ReturnType<typeof getAllCompanyPositionOptions>>[number];

export async function getAllWorkDiagramOptions() {
  logger.debug('Obteniendo opciones de diagramas de trabajo');
  try {
    return await prisma.work_diagram.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener opciones de diagramas de trabajo', { data: { error } });
    return [];
  }
}
export type WorkDiagramOption = Awaited<ReturnType<typeof getAllWorkDiagramOptions>>[number];

export async function getAllGuildOptions() {
  logger.debug('Obteniendo opciones de sindicatos');
  try {
    return await prisma.guild.findMany({
      where: { is_active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener opciones de sindicatos', { data: { error } });
    return [];
  }
}
export type GuildOption = Awaited<ReturnType<typeof getAllGuildOptions>>[number];

export async function getAllCovenantOptions() {
  logger.debug('Obteniendo opciones de convenios');
  try {
    return await prisma.covenant.findMany({
      where: { is_active: true },
      select: { id: true, name: true, guild_id: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener opciones de convenios', { data: { error } });
    return [];
  }
}
export type CovenantOption = Awaited<ReturnType<typeof getAllCovenantOptions>>[number];

export async function getAllCategoryOptions() {
  logger.debug('Obteniendo opciones de categorías');
  try {
    return await prisma.category.findMany({
      where: { is_active: true },
      select: { id: true, name: true, covenant_id: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener opciones de categorías', { data: { error } });
    return [];
  }
}
export type CategoryOption = Awaited<ReturnType<typeof getAllCategoryOptions>>[number];

export async function getAllContractorOptions() {
  logger.debug('Obteniendo opciones de contratistas');
  try {
    return await prisma.customers.findMany({
      where: { is_active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener opciones de contratistas', { data: { error } });
    return [];
  }
}
export type ContractorOption = Awaited<ReturnType<typeof getAllContractorOptions>>[number];

export async function getAllProvinceOptions() {
  logger.debug('Obteniendo opciones de provincias');
  try {
    return await prisma.provinces.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener opciones de provincias', { data: { error } });
    return [];
  }
}
export type ProvinceOption = Awaited<ReturnType<typeof getAllProvinceOptions>>[number];

export async function getCitiesByProvince(provinceId: bigint | null | undefined) {
  if (!provinceId) return [];
  logger.debug('Obteniendo ciudades por provincia', { data: { provinceId: String(provinceId) } });
  try {
    return await prisma.cities.findMany({
      where: { province_id: provinceId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener ciudades por provincia', { data: { error, provinceId: String(provinceId) } });
    return [];
  }
}
export type CityOption = Awaited<ReturnType<typeof getCitiesByProvince>>[number];

export async function getAllContractTypeOptions() {
  logger.debug('Obteniendo opciones de tipos de contrato');
  try {
    return await prisma.types_of_contract.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener opciones de tipos de contrato', { data: { error } });
    return [];
  }
}
export type ContractTypeOption = Awaited<ReturnType<typeof getAllContractTypeOptions>>[number];

export async function getAllAptitudeOptions() {
  logger.debug('Obteniendo opciones de aptitudes técnicas');
  try {
    return await prisma.aptitudes_tecnicas.findMany({
      select: {
        id: true,
        nombre: true,
        is_active: true,
        aptitudes_tecnicas_puestos: {
          select: { puesto_id: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener opciones de aptitudes técnicas', { data: { error } });
    return [];
  }
}
export type AptitudeOption = Awaited<ReturnType<typeof getAllAptitudeOptions>>[number];

export async function getAllWorkshopSectorOptions() {
  logger.debug('Obteniendo opciones de sectores de taller');
  try {
    return await prisma.workshop_sectors.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        workshop_id: true,
        workshops: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener opciones de sectores de taller', { data: { error } });
    return [];
  }
}
export type WorkshopSectorOption = Awaited<ReturnType<typeof getAllWorkshopSectorOptions>>[number];

// ─── Funciones de diagramas ───────────────────────────────────────────────────

/**
 * Obtiene el historial de cambios de diagramas de un empleado.
 * Incluye el perfil del usuario que realizó la modificación.
 */
export async function getEmployeeDiagramHistory(employeeId: string) {
  logger.debug('Obteniendo historial de diagramas del empleado', { data: { employeeId } });
  try {
    return await prisma.diagrams_logs.findMany({
      where: { employee_id: employeeId },
      select: {
        id: true,
        created_at: true,
        prev_date: true,
        description: true,
        state: true,
        prev_state: true,
        profile: {
          select: { fullname: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  } catch (error) {
    logger.error('Error al obtener historial de diagramas del empleado', { data: { error, employeeId } });
    return [];
  }
}
export type EmployeeDiagramHistoryData = Awaited<ReturnType<typeof getEmployeeDiagramHistory>>;
export type EmployeeDiagramHistoryEntry = EmployeeDiagramHistoryData[number];

/**
 * Obtiene los diagramas asignados a un empleado con el tipo de diagrama incluido.
 */
export async function getEmployeeDiagrams(employeeId: string) {
  logger.debug('Obteniendo diagramas del empleado', { data: { employeeId } });
  try {
    return await prisma.employees_diagram.findMany({
      where: { employee_id: employeeId },
      select: {
        id: true,
        created_at: true,
        employee_id: true,
        day: true,
        month: true,
        year: true,
        is_active: true,
        diagram_type_employees_diagram_diagram_typeTodiagram_type: {
          select: {
            id: true,
            name: true,
            color: true,
            company_id: true,
            created_at: true,
            short_description: true,
          },
        },
      },
    });
  } catch (error) {
    logger.error('Error al obtener diagramas del empleado', { data: { error, employeeId } });
    return [];
  }
}
export type EmployeeDiagramsData = Awaited<ReturnType<typeof getEmployeeDiagrams>>;
export type EmployeeDiagramEntry = EmployeeDiagramsData[number];

/**
 * Obtiene todos los tipos de diagrama de la compañía del usuario actual.
 */
export async function getDiagramTypes(companyId: string) {
  logger.debug('Obteniendo tipos de diagrama', { data: { companyId } });
  try {
    return await prisma.diagram_type.findMany({
      where: { company_id: companyId, is_active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener tipos de diagrama', { data: { error, companyId } });
    return [];
  }
}
export type DiagramTypeOption = Awaited<ReturnType<typeof getDiagramTypes>>[number];

// ─── Funciones de mutación ────────────────────────────────────────────────────

/**
 * Crea un nuevo empleado junto con sus relaciones M:M (afectaciones y aptitudes).
 * Obtiene el company_id de la sesión activa del usuario.
 * Usa prisma.$transaction para garantizar atomicidad.
 */
export async function createEmployee(data: EmployeeFormData) {
  logger.debug('Creando empleado', { data: { firstname: data.firstname, lastname: data.lastname } });

  const session = await getCachedSession();
  const company_id = session?.user?.app_metadata?.company;

  if (!company_id) throw new Error('No se encontró la empresa activa del usuario');

  try {
    // La creacion vive en createEmployeeCore para que la comparta la conversion de un
    // pre legajo en legajo (ticket 505) y ambos flujos creen al empleado igual.
    const employee = await prisma.$transaction((tx) => createEmployeeCore(tx, data, company_id));

    logger.info('Empleado creado exitosamente', { data: { employeeId: employee.id } });
    revalidatePath('/dashboard/employee/action');
    revalidatePath('/dashboard/employee');
    return employee;
  } catch (error) {
    logger.error('Error al crear empleado', { data: { error } });
    throw error;
  }
}

export type CreateEmployeeResult = Awaited<ReturnType<typeof createEmployee>>;

/**
 * Actualiza un empleado existente junto con sus relaciones M:M (afectaciones y aptitudes).
 * Para M:M utiliza deleteMany + createMany (reemplaza relaciones completas).
 * Usa prisma.$transaction para garantizar atomicidad.
 */
export async function updateEmployee(employeeId: string, data: EmployeeFormData) {
  logger.debug('Actualizando empleado', { data: { employeeId } });

  const session = await getCachedSession();
  const company_id = session?.user?.app_metadata?.company;

  if (!company_id) throw new Error('No se encontró la empresa activa del usuario');

  const { allocated_to, aptitudes, workshop_sector_ids, province, city, date_of_admission, ...scalarData } = data;

  try {
    const employee = await prisma.$transaction(async (tx) => {
      // Actualizar campos escalares del empleado
      const updated = await tx.employees.update({
        where: { id: employeeId },
        data: {
          ...scalarData,
          province: BigInt(province),
          city: city != null ? BigInt(city) : null,
          date_of_admission: date_of_admission ? new Date(date_of_admission) : undefined,
          // Castings de enums: el formulario usa string, Prisma espera los tipos de enum
          nationality: scalarData.nationality as nationality_enum,
          document_type: scalarData.document_type as document_type_enum,
          gender: scalarData.gender as gender_enum,
          marital_status: scalarData.marital_status as marital_status_enum,
          level_of_education: scalarData.level_of_education as level_of_education_enum,
          cost_type: scalarData.cost_type ? (scalarData.cost_type as cost_type_enum) : undefined,
          allocated_to: allocated_to ?? [],
        },
        select: { id: true },
      });

      // M:M — afectaciones a contratistas: reemplazar completamente
      if (allocated_to !== undefined) {
        await tx.contractor_employee.deleteMany({
          where: { employee_id: employeeId },
        });

        if (allocated_to.length > 0) {
          await tx.contractor_employee.createMany({
            data: allocated_to.map((contractorId) => ({
              employee_id: employeeId,
              contractor_id: contractorId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // M:M — aptitudes técnicas: reemplazar completamente
      if (aptitudes !== undefined) {
        await tx.empleado_aptitudes.deleteMany({
          where: { empleado_id: employeeId },
        });

        if (aptitudes.length > 0) {
          await tx.empleado_aptitudes.createMany({
            data: aptitudes.map((aptitudId) => ({
              empleado_id: employeeId,
              aptitud_id: aptitudId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // M:M — sectores de taller asignados: reemplazar completamente
      if (workshop_sector_ids !== undefined) {
        await tx.employee_workshop_sectors.deleteMany({
          where: { employee_id: employeeId },
        });

        if (workshop_sector_ids.length > 0) {
          await tx.employee_workshop_sectors.createMany({
            data: workshop_sector_ids.map((sectorId) => ({
              employee_id: employeeId,
              workshop_sector_id: sectorId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // 358 / M:M: re-evaluar los documentos requeridos con el estado FINAL del empleado.
      // Las condiciones many-to-many (contratistas/aptitudes) se reemplazan despues del update
      // escalar, por lo que el trigger automatico (que corre en el update escalar) las ve viejas.
      // Este recalculo explicito usa el estado ya actualizado. Es 1 solo recurso (barato) y su
      // UPDATE de status no dispara cascada (status no esta en la guarda de controlar_alertas).
      await tx.$executeRaw`SELECT controlar_alertas_documentos_single_employee(${employeeId}::uuid, ${company_id}::uuid)`;

      return updated;
    });

    logger.info('Empleado actualizado exitosamente', { data: { employeeId: employee.id } });
    revalidatePath('/dashboard/employee/action');
    revalidatePath('/dashboard/employee');
    return employee;
  } catch (error) {
    logger.error('Error al actualizar empleado', { data: { error, employeeId } });
    throw error;
  }
}

export type UpdateEmployeeResult = Awaited<ReturnType<typeof updateEmployee>>;
