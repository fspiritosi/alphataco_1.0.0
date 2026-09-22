'use server';

import { Logger } from '@/lib/logger';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('features/Operaciones/Preparte/actions');

/**
 * Clientes de la empresa activa con todo lo que el formulario de pedido necesita:
 * contratos vigentes, sus sectores/áreas/items e inventario de equipos del cliente.
 *
 * Perímetro: `customers.company_id` = empresa activa. Los contratos y los items se
 * filtran por `is_active` dentro del `include` (equivale a los `.eq()` anidados de PostgREST).
 * `item_price` es `Decimal` en Postgres: se devuelve como `number` para que el objeto
 * viaje al cliente (un `Decimal` de Prisma no es serializable).
 */
export async function fetchCustomersWithRelations() {
  try {
    const companyId = await getActiveCompanyId();

    const customers = await prisma.customers.findMany({
      where: { company_id: companyId, is_active: true },
      select: {
        id: true,
        name: true,
        equipos_clientes: {
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
        sector_customer: {
          select: {
            id: true,
            customer_id: true,
            sector_id: true,
            sectors: { select: { id: true, name: true } },
          },
        },
        customer_services: {
          where: { is_active: true },
          select: {
            id: true,
            customer_id: true,
            service_sectors: {
              select: {
                id: true,
                sector_id: true,
                service_id: true,
                sectors: { select: { id: true, name: true } },
              },
            },
            service_areas: {
              select: {
                id: true,
                area_id: true,
                service_id: true,
                areas_cliente: { select: { id: true, nombre: true } },
              },
            },
            service_items: {
              where: { is_active: true },
              select: {
                id: true,
                item_name: true,
                item_description: true,
                item_price: true,
                item_measure_units: true,
                customer_service_id: true,
                code_item: true,
                item_number: true,
                is_active: true,
                needs_equipment: true,
                needs_personnel: true,
              },
              orderBy: { item_name: 'asc' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return customers.map((customer) => ({
      ...customer,
      customer_services: customer.customer_services.map((service) => ({
        ...service,
        service_items: service.service_items.map((item) => ({
          ...item,
          item_price: Number(item.item_price),
        })),
      })),
    }));
  } catch (error) {
    logger.error('Error al obtener los clientes con sus relaciones', { data: { error } });
    return [];
  }
}

/**
 * Sectores de un contrato. `id` es el `service_sectors.id` (lo que se guarda en el pedido)
 * y `sector_id` el del sector del catálogo.
 *
 * Perímetro: el contrato tiene que ser de un cliente de la empresa activa.
 */
export async function fetchSectorsByContract(serviceId: string) {
  if (!serviceId) return [];

  try {
    const companyId = await getActiveCompanyId();

    const serviceSectors = await prisma.service_sectors.findMany({
      where: {
        service_id: serviceId,
        customer_services: { customers: { company_id: companyId } },
      },
      select: {
        id: true,
        sector_id: true,
        sectors: { select: { name: true } },
      },
      orderBy: { sectors: { name: 'asc' } },
    });

    return serviceSectors.map((item) => ({
      id: item.id,
      sector_id: item.sector_id,
      name: item.sectors?.name ?? '',
    }));
  } catch (error) {
    logger.error('Error al obtener los sectores del contrato', { data: { error, serviceId } });
    return [];
  }
}

/**
 * Áreas de un contrato. `id` es el `service_areas.id` y `area_id` el del área del cliente.
 *
 * Perímetro: el contrato tiene que ser de un cliente de la empresa activa.
 */
export async function fetchAreasByContract(serviceId: string) {
  if (!serviceId) return [];

  try {
    const companyId = await getActiveCompanyId();

    const serviceAreas = await prisma.service_areas.findMany({
      where: {
        service_id: serviceId,
        customer_services: { customers: { company_id: companyId } },
      },
      select: {
        id: true,
        area_id: true,
        areas_cliente: { select: { nombre: true } },
      },
      orderBy: { id: 'asc' },
    });

    return serviceAreas.map((item) => ({
      id: item.id,
      area_id: item.area_id,
      name: item.areas_cliente?.nombre ?? '',
    }));
  } catch (error) {
    logger.error('Error al obtener las áreas del contrato', { data: { error, serviceId } });
    return [];
  }
}

/**
 * Equipos del cliente (`equipos_clientes` no tiene `service_id`: se filtra por cliente).
 *
 * Perímetro: el cliente tiene que pertenecer a la empresa activa.
 */
export async function fetchEquipmentsByCustomer(customerId: string) {
  if (!customerId) return [];

  try {
    const companyId = await getActiveCompanyId();

    return await prisma.equipos_clientes.findMany({
      where: { customer_id: customerId, customers: { company_id: companyId } },
      select: { id: true, name: true, customer_id: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener los equipos del cliente', { data: { error, customerId } });
    return [];
  }
}
