import {
  getCitiesByProvince,
  getCompanyDocumentTypes,
  getContacts,
  getCountries,
  getCustomers,
  getHierarchyPositions,
  getProvinces,
  getWorkDiagrams,
} from '@/shared/actions/countries.server';
import { create } from 'zustand';

/**
 * Store de catálogos del dashboard legacy. Sólo guarda estado: los datos vienen de las
 * server actions de `@/shared/actions/countries.server.ts` (antes PostgREST + realtime).
 *
 * Los consumidores que quedan (columnas de Clientes/Equipos, formularios) leen el estado
 * directamente; la carga inicial se dispara una vez en el navegador (`ensureLoaded`) como
 * puente hasta que cada pantalla pase a React Query.
 */
type Country = Awaited<ReturnType<typeof getCountries>>[number];
type Province = Awaited<ReturnType<typeof getProvinces>>[number];
type City = Awaited<ReturnType<typeof getCitiesByProvince>>[number];
type Hierarchy = Awaited<ReturnType<typeof getHierarchyPositions>>[number];
type WorkDiagram = Awaited<ReturnType<typeof getWorkDiagrams>>[number];
type Customer = Awaited<ReturnType<typeof getCustomers>>[number];
type Contact = Awaited<ReturnType<typeof getContacts>>[number];
type DocumentType = Awaited<ReturnType<typeof getCompanyDocumentTypes>>[number];

export type MandatoryDocuments = Record<string, DocumentType[]>;

interface State {
  countries: Country[];
  provinces: Province[];
  cities: City[];
  fetchCities: (provinceId: number) => Promise<void>;
  hierarchy: Hierarchy[];
  workDiagram: WorkDiagram[];
  customers: Customer[];
  contacts: Contact[];
  mandatoryDocuments: MandatoryDocuments;
  documentTypes: (company_id?: string) => Promise<void>;
  companyDocumentTypes: DocumentType[];
  fetchContractors: () => Promise<void>;
  fetchContacts: () => Promise<void>;
  /** Carga los catálogos una sola vez (idempotente). */
  ensureLoaded: () => Promise<void>;
}

let loadingPromise: Promise<void> | null = null;

export const useCountriesStore = create<State>((set) => {
  const fetchCities = async (provinceId: number) => {
    set({ cities: await getCitiesByProvince(provinceId) });
  };

  const fetchContractors = async () => {
    set({ customers: await getCustomers() });
  };

  const fetchContacts = async () => {
    set({ contacts: await getContacts() });
  };

  const documentTypes = async (company_id?: string) => {
    const document_types = await getCompanyDocumentTypes(company_id);
    const mandatoryDocuments = document_types
      .filter((item) => item.mandatory)
      .reduce<MandatoryDocuments>((acc, item) => {
        (acc[item.applies] = acc[item.applies] || []).push(item);
        return acc;
      }, {});
    set({ companyDocumentTypes: document_types, mandatoryDocuments });
  };

  const ensureLoaded = () => {
    if (!loadingPromise) {
      loadingPromise = Promise.all([
        getCountries().then((countries) => set({ countries })),
        getProvinces().then((provinces) => set({ provinces })),
        getHierarchyPositions().then((hierarchy) => set({ hierarchy })),
        getWorkDiagrams().then((workDiagram) => set({ workDiagram })),
        fetchContractors(),
        fetchContacts(),
      ]).then(() => undefined);
    }
    return loadingPromise;
  };

  if (typeof window !== 'undefined') {
    void ensureLoaded();
  }

  return {
    countries: [],
    provinces: [],
    cities: [],
    fetchCities,
    hierarchy: [],
    workDiagram: [],
    customers: [],
    contacts: [],
    mandatoryDocuments: {},
    documentTypes,
    companyDocumentTypes: [],
    fetchContractors,
    fetchContacts,
    ensureLoaded,
  };
});
