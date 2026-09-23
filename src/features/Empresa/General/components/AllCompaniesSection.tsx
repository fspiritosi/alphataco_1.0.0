'use client';

import { CardsGrid } from '@/features/Empresa/General/components/CardsGrid';
import ModalCompany from '@/features/Empresa/General/components/ModalCompany';
import { COMPANIES_QUERY_KEY, useCompanyData } from '@/features/Empresa/General/hooks/useCompanyData';
import type { StoreCompany } from '@/shared/actions/session.server';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * Listado de todas las compañías del usuario con el detalle en modal.
 *
 * Antes la página montaba dos canales realtime de Supabase (tabla `company` y `storage.objects`)
 * que llamaban a `fetchCompanies()` en cada cambio. Los canales se eliminan: los datos salen de
 * React Query (`useCompanyData`) y el refresco es por invalidación de `COMPANIES_QUERY_KEY`, que
 * es lo que hacen el alta y la edición de empresa (el logo se refleja igual, porque su URL vive
 * en `company.company_logo`).
 */
export function AllCompaniesSection() {
  const queryClient = useQueryClient();
  const { allCompanies, isLoading } = useCompanyData();
  const [selectedCard, setSelectedCard] = useState<StoreCompany | null>(null);

  const handleCloseModal = () => {
    setSelectedCard(null);
    queryClient.invalidateQueries({ queryKey: COMPANIES_QUERY_KEY });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div>Cargando...</div>
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-3xl pb-5 pl-10">Todas las Compañias</h2>
      <p className="pl-10 max-w-1/2">Aquí se verán todas las compañías</p>
      <div className=" rounded-lg shadow-2xl p-4">
        <CardsGrid allCompanies={allCompanies} onCardClick={setSelectedCard} />
      </div>
      {selectedCard && <ModalCompany isOpen onClose={handleCloseModal} selectedCard={selectedCard} />}
    </section>
  );
}
