'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';

const logger = new Logger('features/Operaciones/Certificacion/catalogs');

/**
 * Catálogos de los filtros del tablero comercial. Todos acotados a la empresa activa
 * salvo `sectors`, que es un catálogo global (la tabla no tiene `company_id`).
 */

export async function getFilterCustomers() {
  try {
    const companyId = await getActiveCompanyId();
    const customers = await prisma.customers.findMany({
      where: { company_id: companyId, is_active: true },
      select: { id: true, name: true, cuit: true },
      orderBy: { name: 'asc' },
    });
    // `cuit` es bigint en Postgres: se devuelve como texto para que viaje al cliente.
    return customers.map((customer) => ({ ...customer, cuit: customer.cuit.toString() }));
  } catch (error) {
    logger.error('Error al obtener los clientes del filtro', { data: { error } });
    return [];
  }
}

export async function getFilterServices() {
  try {
    const companyId = await getActiveCompanyId();
    const services = await prisma.customer_services.findMany({
      where: { is_active: true, customers: { company_id: companyId } },
      select: { id: true, service_name: true, customer_id: true },
      orderBy: { service_name: 'asc' },
    });
    return services.map((service) => ({
      id: service.id,
      name: service.service_name ?? '',
      customer_id: service.customer_id,
    }));
  } catch (error) {
    logger.error('Error al obtener los servicios del filtro', { data: { error } });
    return [];
  }
}

export async function getFilterEmployees() {
  try {
    const companyId = await getActiveCompanyId();
    const employees = await prisma.employees.findMany({
      where: { company_id: companyId, is_active: true },
      select: { id: true, firstname: true, lastname: true, file: true },
      orderBy: { firstname: 'asc' },
    });
    return employees.map((employee) => ({
      id: employee.id,
      // El legajo va SIEMPRE en las listas de empleados (`.claude/rules/employee-file-number.md`).
      name: `${employee.file ? `[${employee.file}] ` : ''}${employee.firstname || ''} ${employee.lastname || ''}`.trim(),
    }));
  } catch (error) {
    logger.error('Error al obtener los empleados del filtro', { data: { error } });
    return [];
  }
}

export async function getFilterEquipment() {
  try {
    const companyId = await getActiveCompanyId();
    const vehicles = await prisma.vehicles.findMany({
      where: { company_id: companyId, is_active: true },
      select: { id: true, intern_number: true, domain: true },
      orderBy: { intern_number: 'asc' },
    });
    return vehicles.map((vehicle) => ({
      id: vehicle.id,
      name: [vehicle.intern_number, vehicle.domain].filter(Boolean).join(' - '),
    }));
  } catch (error) {
    logger.error('Error al obtener los equipos del filtro', { data: { error } });
    return [];
  }
}

export async function getFilterItems() {
  try {
    const companyId = await getActiveCompanyId();
    const items = await prisma.service_items.findMany({
      where: { is_active: true, company_id: companyId },
      select: { id: true, item_name: true, customer_service_id: true },
      orderBy: { item_name: 'asc' },
    });
    return items.map((item) => ({
      id: item.id,
      name: item.item_name,
      customer_service_id: item.customer_service_id,
    }));
  } catch (error) {
    logger.error('Error al obtener los items del filtro', { data: { error } });
    return [];
  }
}

export async function getFilterCustomerEquipments() {
  try {
    const companyId = await getActiveCompanyId();
    return await prisma.equipos_clientes.findMany({
      where: { customers: { company_id: companyId } },
      select: { id: true, name: true, customer_id: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener los equipos de cliente del filtro', { data: { error } });
    return [];
  }
}

export async function getFilterAreas() {
  try {
    const companyId = await getActiveCompanyId();
    const areas = await prisma.areas_cliente.findMany({
      where: { customers: { company_id: companyId } },
      select: { id: true, nombre: true, customer_id: true },
      orderBy: { nombre: 'asc' },
    });
    return areas.map((area) => ({ id: area.id, name: area.nombre, customer_id: area.customer_id }));
  } catch (error) {
    logger.error('Error al obtener las áreas del filtro', { data: { error } });
    return [];
  }
}

export async function getFilterSectors() {
  try {
    const sectors = await prisma.sectors.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return sectors.map((sector) => ({ id: sector.id, name: sector.name, customer_id: undefined }));
  } catch (error) {
    logger.error('Error al obtener los sectores del filtro', { data: { error } });
    return [];
  }
}
