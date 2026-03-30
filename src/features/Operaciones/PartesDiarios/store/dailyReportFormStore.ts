import { getCustomers } from '@/features/Operaciones/PartesDiarios/actions/actions';
import { formatDailyReportRow } from '@/features/Operaciones/PartesDiarios/utils/formatDailyReportData';
import { create } from 'zustand';

// Tipo para la fila formateada
export type FormattedDailyReportRow = ReturnType<typeof formatDailyReportRow>;

// Tipo para el cliente seleccionado (inferido del tipo real de getCustomers)
export type SelectedCustomer = NonNullable<Awaited<ReturnType<typeof getCustomers>>>[number];

interface DailyReportFormState {
  // Estado del modal
  isModalOpen: boolean;

  // Datos de la fila seleccionada
  selectedRow: FormattedDailyReportRow | null;

  // IDs seleccionados para filtrado
  selectedCustomerId: string | null;
  selectedServiceId: string | null;

  // Cliente seleccionado completo (para filtros)
  selectedCustomer: SelectedCustomer | null;

  // Estados de carga
  isLoadingEmployees: boolean;
  isLoadingEquipments: boolean;
}

interface DailyReportFormActions {
  // Abrir modal con una fila
  openModalWithRow: (row: FormattedDailyReportRow) => void;

  // Cerrar modal y limpiar estado
  closeModal: () => void;

  // Actualizar IDs seleccionados
  setSelectedCustomerId: (id: string | null) => void;
  setSelectedServiceId: (id: string | null) => void;
  setSelectedCustomer: (customer: SelectedCustomer | null) => void;

  // Actualizar estados de carga
  setIsLoadingEmployees: (loading: boolean) => void;
  setIsLoadingEquipments: (loading: boolean) => void;
}

type DailyReportFormStore = DailyReportFormState & DailyReportFormActions;

export const useDailyReportFormStore = create<DailyReportFormStore>((set) => ({
  // Estado inicial
  isModalOpen: false,
  selectedRow: null,
  selectedCustomerId: null,
  selectedServiceId: null,
  selectedCustomer: null,
  isLoadingEmployees: false,
  isLoadingEquipments: false,

  // Actions
  openModalWithRow: (row) => {
    set({
      isModalOpen: true,
      selectedRow: row,
      selectedCustomerId: row.data_to_clone?.customer_id || null,
      selectedServiceId: row.data_to_clone?.service_id || null,
      selectedCustomer: null,
    });
  },

  closeModal: () => {
    set({
      isModalOpen: false,
      selectedRow: null,
      selectedCustomerId: null,
      selectedServiceId: null,
      selectedCustomer: null,
      isLoadingEmployees: false,
      isLoadingEquipments: false,
    });
  },

  setSelectedCustomerId: (id) => {
    set({ selectedCustomerId: id });
  },

  setSelectedServiceId: (id) => {
    set({ selectedServiceId: id });
  },

  setSelectedCustomer: (customer) => {
    set({ selectedCustomer: customer });
  },

  setIsLoadingEmployees: (loading) => {
    set({ isLoadingEmployees: loading });
  },

  setIsLoadingEquipments: (loading) => {
    set({ isLoadingEquipments: loading });
  },
}));
