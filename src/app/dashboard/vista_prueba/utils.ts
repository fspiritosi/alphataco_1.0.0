// // import { faker } from "@faker-js/faker"
// import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';

// // Tipo para los datos de sectores
// export interface SectorData {
//   id: string;
//   sectors: {
//     name: string;
//     descripcion_corta: string;
//   };
//   customers: {
//     name: string;
//   };
//   empleados_count: number;
//   fecha_creacion: string;
//   estado: 'activo' | 'inactivo';
// }

// // // Generar datos mock
// // const generateSector = (id: number): SectorData => {
// //   const sectores = [
// //     "Administración",
// //     "Recursos Humanos",
// //     "Tecnología",
// //     "Ventas",
// //     "Marketing",
// //     "Finanzas",
// //     "Operaciones",
// //     "Calidad",
// //     "Producción",
// //     "Logística",
// //     "Compras",
// //     "Legal",
// //     "Comunicaciones",
// //     "Investigación",
// //     "Desarrollo",
// //   ]

// //   const clientes = [
// //     "Empresa ABC",
// //     "Tech Solutions",
// //     "Comercial XYZ",
// //     "Industrial Corp",
// //     "Servicios Integrales",
// //     "Consultora Premium",
// //     "Grupo Empresarial",
// //     "Corporación Global",
// //     "Innovación SA",
// //     "Desarrollo Ltda",
// //   ]

// //   const sectorName = faker.helpers.arrayElement(sectores)

// //   return {
// //     id: id.toString(),
// //     sectors: {
// //       name: `${sectorName} ${faker.number.int({ min: 1, max: 99 })}`,
// //       descripcion_corta: faker.lorem.sentence({ min: 3, max: 8 }),
// //     },
// //     customers: {
// //       name: faker.helpers.arrayElement(clientes),
// //     },
// //     empleados_count: faker.number.int({ min: 1, max: 50 }),
// //     fecha_creacion: faker.date
// //       .between({
// //         from: "2023-01-01",
// //         to: "2024-12-31",
// //       })
// //       .toISOString()
// //       .split("T")[0],
// //     estado: faker.helpers.arrayElement(["activo", "inactivo"] as const),
// //   }
// // }

// // Generar dataset grande
// const TOTAL_RECORDS = 15000;
// // const mockData: SectorData[] = Array.from({ length: TOTAL_RECORDS }, (_, i) => generateSector(i + 1))

// // Función para simular filtrado
// const applyFilters = (data: SectorData[], filters: ColumnFiltersState): SectorData[] => {
//   return data.filter((item) => {
//     return filters.every((filter) => {
//       const { id, value } = filter;

//       if (!value || (Array.isArray(value) && value.length === 0)) return true;

//       switch (id) {
//         case 'Nombre':
//           if (typeof value === 'string') {
//             return item.sectors.name.toLowerCase().includes(value.toLowerCase());
//           }
//           if (Array.isArray(value)) {
//             return value.includes(item.sectors.name);
//           }
//           return true;

//         case 'Cliente':
//           if (Array.isArray(value)) {
//             return value.includes(item.customers.name);
//           }
//           return true;

//         case 'Estado':
//           if (Array.isArray(value)) {
//             return value.includes(item.estado);
//           }
//           return true;

//         default:
//           return true;
//       }
//     });
//   });
// };

// // Función para simular ordenamiento
// const applySorting = (data: SectorData[], sorting: SortingState): SectorData[] => {
//   if (sorting.length === 0) return data;

//   return [...data].sort((a, b) => {
//     for (const sort of sorting) {
//       const { id, desc } = sort;
//       let aValue: any;
//       let bValue: any;

//       switch (id) {
//         case 'Nombre':
//           aValue = a.sectors.name;
//           bValue = b.sectors.name;
//           break;
//         case 'Cliente':
//           aValue = a.customers.name;
//           bValue = b.customers.name;
//           break;
//         case 'Empleados':
//           aValue = a.empleados_count;
//           bValue = b.empleados_count;
//           break;
//         case 'Fecha':
//           aValue = new Date(a.fecha_creacion);
//           bValue = new Date(b.fecha_creacion);
//           break;
//         default:
//           continue;
//       }

//       if (aValue < bValue) return desc ? 1 : -1;
//       if (aValue > bValue) return desc ? -1 : 1;
//     }
//     return 0;
//   });
// };

// // Función principal de fetch simulado
// // export async function fetchSectorsData(options: {
// //   pageIndex: number
// //   pageSize: number
// //   sorting: SortingState
// //   columnFilters: ColumnFiltersState
// // }): Promise<{
// //   rows: SectorData[]
// //   pageCount: number
// //   rowCount: number
// // }> {
// //   // Simular latencia de red
// //   await new Promise((resolve) => setTimeout(resolve, 500))

// //   // Aplicar filtros
// // //   let filteredData = applyFilters(mockData, options.columnFilters)

// //   // Aplicar ordenamiento
// // //   filteredData = applySorting(filteredData, options.sorting)

// // //   // Calcular paginación
// // //   const totalRows = filteredData.length
// // //   const pageCount = Math.ceil(totalRows / options.pageSize)
// // //   const startIndex = options.pageIndex * options.pageSize
// // //   const endIndex = startIndex + options.pageSize

// // //   // Obtener datos de la página actual
// // //   const rows = filteredData.slice(startIndex, endIndex)

// // //   return {
// // //     rows,
// // //     pageCount,
// // //     rowCount: totalRows,
// // //   }
// // }

// // Función para obtener opciones de filtro únicas
// // export function getFilterOptions(field: keyof SectorData | string): { label: string; value: string }[] {
// //   const uniqueValues = new Set<string>()

// //   mockData.forEach((item) => {
// //     let value: string
// //     switch (field) {
// //       case "Nombre":
// //         value = item.sectors.name
// //         break
// //       case "Cliente":
// //         value = item.customers.name
// //         break
// //       case "Estado":
// //         value = item.estado
// //         break
// //       default:
// //         return
// //     }

// //     if (value && value.trim()) {
// //       uniqueValues.add(value.trim())
// //     }
// //   })

// //   return Array.from(uniqueValues)
// //     .sort()
// //     .map((value) => ({
// //       label: value,
// //       value: value,
// //     }))
// // }
