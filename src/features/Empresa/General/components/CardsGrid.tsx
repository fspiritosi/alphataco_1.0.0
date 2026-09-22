import { formatCompanyName } from '@/lib/utils';
import type { StoreCompany } from '@/shared/actions/session.server';
import React from 'react';

interface CardsGridProps {
  allCompanies: StoreCompany[];
  onCardClick: (card: StoreCompany) => void;
}

export const CardsGrid: React.FC<CardsGridProps> = ({ allCompanies, onCardClick }) => {
  const handleCardClick = (card: StoreCompany) => {
    onCardClick(card);
  };
  const activeCompanies = allCompanies?.filter((company) => company.is_active);
  return (
    <div className="grid grid-cols-6 gap-4">
      {activeCompanies?.map((companyItems) => (
        <div
          key={companyItems.id}
          className="card hover:cursor-pointer bg-white text-black rounded-lg shadow-md p-4"
          onClick={() => handleCardClick(companyItems)}
        >
          <h3 className=" font-semibold text-center overflow-hidden whitespace-wrap ">
            {formatCompanyName(companyItems.company_name)}
          </h3>
          <img src={companyItems.company_logo ?? undefined} alt="Logo de la empresa" />
        </div>
      ))}
    </div>
  );
};
