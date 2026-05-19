import { Car, Snowflake, Sun, Truck, type LucideIcon } from 'lucide-react';

export const PREVENTIVE_TYPES = {
  light_fleet: 'Mantenimiento Preventivo Flota Liviana',
  heavy_fleet: 'Mantenimiento Preventivo Flota Pesada',
  summer_program: 'Programa de Verano',
  winter_program: 'Programa de Invierno',
} as const;

export type PreventiveType = keyof typeof PREVENTIVE_TYPES;

export const PREVENTIVE_TYPE_DESCRIPTIONS: Record<PreventiveType, string> = {
  light_fleet: 'Intervalos por kilómetros',
  heavy_fleet: 'Intervalos por horas/kilómetros',
  summer_program: 'Inspección por altas temperaturas',
  winter_program: 'Inspección por bajas temperaturas',
};

export const PREVENTIVE_TYPE_ICONS: Record<PreventiveType, LucideIcon> = {
  light_fleet: Car,
  heavy_fleet: Truck,
  summer_program: Sun,
  winter_program: Snowflake,
};

export const SOURCE_LABELS_EXTENDED: Record<string, string> = {
  checklist: 'Checklist',
  manual: 'Manual',
  preventive: 'Preventivo',
};
