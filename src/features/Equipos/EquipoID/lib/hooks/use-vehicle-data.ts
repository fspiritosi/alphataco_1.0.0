'use client';

import { useEffect, useState } from 'react';
import { getVehicleById } from '../actions/vehicle-actions';

export function useVehicleData(vehicleId?: string) {
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicleId) {
      setLoading(false);
      return;
    }

    const fetchVehicle = async () => {
      try {
        setLoading(true);
        const vehicleData = await getVehicleById(vehicleId);
        setVehicle(vehicleData);
        setError(null);
      } catch (err) {
        console.error('Error fetching vehicle:', err);
        setError('Error al cargar el equipo');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, [vehicleId]);

  const refreshVehicle = async () => {
    if (!vehicleId) return;

    try {
      const vehicleData = await getVehicleById(vehicleId);
      setVehicle(vehicleData);
      setError(null);
    } catch (err) {
      console.error('Error refreshing vehicle:', err);
      setError('Error al actualizar el equipo');
    }
  };

  return {
    vehicle,
    loading,
    error,
    refreshVehicle,
  };
}
