import { setNewCompanyUserMetadata } from '@/shared/actions/company-user.actions';
import {
  getEmployeeDocumentsByDocumentNumber,
  getSessionBootstrap,
  getStoreCompanies,
  getStoreDocuments,
  getStoreEmployees,
  getStoreSharedUsers,
  getStoreVehicles,
  getVehicleDocumentsByVehicleId,
  type StoreCompany,
  type StoreCompanyDocument,
  type StoreEmployee,
  type StoreSharedCompany,
  type StoreSharedUser,
  type StoreVehicle,
} from '@/shared/actions/session.server';
import { buildDocumentBuckets, type StoreDocument } from '@/shared/store/lib/document-buckets';
import cookies from 'js-cookie';
import { create } from 'zustand';
import { useCountriesStore } from './countries';

/**
 * Store de sesión/empresa activa del dashboard legacy.
 *
 * Sólo guarda estado: todo lo que toca la base vive en `@/shared/actions/session.server.ts`
 * (antes el store consultaba PostgREST y se suscribía a realtime desde el navegador).
 */
type SessionUser = { id: string; email: string | null };
type StoreProfile = NonNullable<Awaited<ReturnType<typeof getSessionBootstrap>>>['profile'][number];
type DrawerEmployeeDocument = NonNullable<Awaited<ReturnType<typeof getEmployeeDocumentsByDocumentNumber>>>[number];
type DrawerVehicleDocument = NonNullable<Awaited<ReturnType<typeof getVehicleDocumentsByVehicleId>>>[number];

type DocumentGroup = { employees: StoreDocument[]; vehicles: StoreDocument[] };

const capitalize = (value: string | undefined | null) =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : '';

const setEmployeesToShow = (employees: StoreEmployee[]) =>
  employees.map((employee) => ({
    full_name: `${capitalize(employee.lastname)} ${capitalize(employee.firstname)}`,
    id: employee.id,
    email: employee.email,
    cuil: employee.cuil,
    document_number: employee.document_number,
    hierarchical_position: employee.hierarchy?.name,
    company_position: employee.company_position,
    normal_hours: employee.normal_hours,
    type_of_contract: employee.type_of_contract,
    allocated_to: employee.allocated_to,
    picture: employee.picture,
    nationality: employee.nationality,
    lastname: capitalize(employee.lastname),
    firstname: capitalize(employee.firstname),
    document_type: employee.document_type,
    birthplace: employee.countries?.name?.trim(),
    gender: employee.gender,
    marital_status: employee.marital_status,
    level_of_education: employee.level_of_education,
    street: employee.street,
    street_number: employee.street_number,
    province: employee.provinces?.name?.trim(),
    postal_code: employee.postal_code,
    phone: employee.phone,
    file: employee.file,
    date_of_admission: employee.date_of_admission,
    affiliate_status: employee.affiliate_status,
    city: employee.cities?.name?.trim(),
    hierrl_position: employee.hierarchy?.name,
    workflow_diagram: employee.work_diagram?.name,
    contractor_employee: employee.contractor_employee.map(({ customers }) => customers?.id),
    contractor_name: employee.contractor_employee.map(({ customers }) => customers?.name),
    is_active: employee.is_active,
    reason_for_termination: employee.reason_for_termination,
    termination_date: employee.termination_date,
    status: employee.status,
    guild: employee.guild,
    covenants: employee.covenant,
    category: employee.category,
    documents_employees: employee.documents_employees,
  }));

export type EmployeeToShow = ReturnType<typeof setEmployeesToShow>[number];

const setVehiclesToShow = (vehicles: StoreVehicle[]) =>
  vehicles.map((item) => ({
    ...item,
    types_of_vehicles: item.types_of_vehicles.name,
    brand: item.brand_vehicles?.name,
    model: item.model_vehicles?.name,
  }));

export type VehicleToShow = ReturnType<typeof setVehiclesToShow>[number];

/** Baja "cerrada": todos sus documentos de baja ya presentados. */
const hasAllDownDocumentsPresented = (employee: StoreEmployee) =>
  employee.documents_employees
    .filter((doc) => doc.document_types?.down_document)
    .every((doc) => doc.state === 'presentado');

/** Activo, o dado de baja con algún documento de baja todavía pendiente. */
const isOperativelyActive = (employee: StoreEmployee) =>
  !!employee.is_active ||
  employee.documents_employees.filter((doc) => doc.document_types?.down_document).some((doc) => doc.state === 'pendiente');

interface State {
  credentialUser: SessionUser | null;
  profile: StoreProfile[];
  showNoCompanyAlert: boolean;
  showMultiplesCompaniesAlert: boolean;
  allCompanies: StoreCompany[];
  actualCompany: StoreCompany | null;
  setActualCompany: (company: StoreCompany) => void;
  employees: EmployeeToShow[];
  active_and_inactive_employees: EmployeeToShow[];
  setEmployees: (employees: EmployeeToShow[]) => void;
  isLoading: boolean;
  employeesToShow: EmployeeToShow[];
  setInactiveEmployees: () => Promise<void>;
  setActivesEmployees: () => Promise<void>;
  showDeletedEmployees: boolean;
  setShowDeletedEmployees: (showDeletedEmployees: boolean) => void;
  vehicles: StoreVehicle[];
  sharedCompanies: StoreSharedCompany[];
  allDocumentsToShow: DocumentGroup;
  documentsToShow: DocumentGroup;
  Alldocuments: DocumentGroup;
  lastMonthDocuments: DocumentGroup;
  showLastMonthDocuments: boolean;
  setShowLastMonthDocuments: () => void;
  pendingDocuments: DocumentGroup;
  sharedUsers: StoreSharedUser[];
  vehiclesToShow: VehicleToShow[];
  setActivesVehicles: () => void;
  setVehicleTypes: (type: string) => void;
  fetchVehicles: () => Promise<void>;
  documetsFetch: () => Promise<void>;
  getEmployees: (active: boolean) => Promise<EmployeeToShow[]>;
  loggedUser: () => Promise<void>;
  documentDrawerEmployees: (document: string) => Promise<void>;
  DrawerEmployees: DrawerEmployeeDocument[] | null;
  FetchSharedUsers: () => Promise<void>;
  DrawerVehicles: DrawerVehicleDocument[] | null;
  documentDrawerVehicles: (id: string) => Promise<void>;
  companyDocuments: StoreCompanyDocument[];
  codeControlRole: string | undefined;
  roleActualCompany: string | undefined;
  active_sidebar: boolean;
  toggleSidebar: () => void;
}

const emptyGroup = (): DocumentGroup => ({ employees: [], vehicles: [] });

export const useLoggedUserStore = create<State>((set, get) => {
  const toggleSidebar = () => {
    set({ active_sidebar: !get().active_sidebar });
  };

  const handleActualCompanyRole = () => {
    const profileId = get().profile[0]?.id;
    const user = get().sharedUsers.find((e) => e.profile_id.id === profileId);
    set({ roleActualCompany: user?.role || undefined });
  };

  const FetchSharedUsers = async () => {
    const companyId = get().actualCompany?.id;
    if (!companyId) return;
    const sharedUsers = await getStoreSharedUsers(companyId);
    set({ sharedUsers });
    handleActualCompanyRole();
  };

  const getEmployees = async (active: boolean) => {
    const companyId = get().actualCompany?.id;
    if (!companyId) return [];
    const employees = await getStoreEmployees(companyId);
    set({ active_and_inactive_employees: setEmployeesToShow(employees) });

    const filtered = active
      ? employees.filter(isOperativelyActive)
      : employees.filter((e) => !e.is_active && hasAllDownDocumentsPresented(e));
    return setEmployeesToShow(filtered);
  };

  const setActivesEmployees = async () => {
    const employeesToShow = await getEmployees(true);
    set({ employeesToShow, employees: employeesToShow });
  };

  const setInactiveEmployees = async () => {
    const employeesToShow = await getEmployees(false);
    set({ employeesToShow });
  };

  const setActivesVehicles = () => {
    set({ vehiclesToShow: setVehiclesToShow(get().vehicles) });
  };

  const fetchVehicles = async () => {
    const companyId = get().actualCompany?.id;
    if (!companyId) return;
    const vehicles = await getStoreVehicles(companyId);
    set({ vehicles });
    setActivesVehicles();
  };

  const setVehicleTypes = (type: string) => {
    const vehicles = get().vehicles;
    const filtered = type === 'Todos' ? vehicles : vehicles.filter((v) => v.types_of_vehicles.name === type);
    set({ vehiclesToShow: setVehiclesToShow(filtered) });
  };

  const documetsFetch = async () => {
    const companyId = get().actualCompany?.id;
    if (!companyId) return;

    const { employees, vehicles, company } = await getStoreDocuments(companyId);
    handleActualCompanyRole();
    const isGuest = get().roleActualCompany === 'Invitado';

    set({
      companyDocuments: isGuest ? company.filter((doc) => !doc.id_document_types?.private) : company,
    });

    const buckets = buildDocumentBuckets(employees, vehicles, { isGuest });
    set({
      allDocumentsToShow: buckets.allDocumentsToShow,
      Alldocuments: buckets.Alldocuments,
      lastMonthDocuments: buckets.lastMonthDocuments,
      pendingDocuments: buckets.pendingDocuments,
      documentsToShow: buckets.lastMonthDocuments,
      showLastMonthDocuments: true,
    });
  };

  const setShowLastMonthDocuments = () => {
    const showLastMonth = !get().showLastMonthDocuments;
    set({
      showLastMonthDocuments: showLastMonth,
      documentsToShow: showLastMonth ? get().lastMonthDocuments : get().Alldocuments,
    });
  };

  const documentDrawerEmployees = async (document: string) => {
    set({ DrawerEmployees: await getEmployeeDocumentsByDocumentNumber(document) });
  };

  const documentDrawerVehicles = async (id: string) => {
    set({ DrawerVehicles: await getVehicleDocumentsByVehicleId(id) });
  };

  const setActualCompany = (company: StoreCompany) => {
    set({ actualCompany: company });
    if (!company.id) return;

    cookies.set('actualComp', company.id);
    cookies.set('actualCompName', company.company_name);
    void setNewCompanyUserMetadata(company.id);
    void useCountriesStore.getState().documentTypes(company.id);
    void setActivesEmployees();
    void fetchVehicles();
    void documetsFetch();
    void FetchSharedUsers();
    handleActualCompanyRole();
  };

  /** Selección de empresa activa: la guardada en localStorage, la por defecto, la única o la primera compartida. */
  const selectCompany = async () => {
    const { allCompanies, sharedCompanies } = await getStoreCompanies();
    set({ allCompanies, sharedCompanies });

    const savedCompany = typeof window !== 'undefined' ? window.localStorage.getItem('company_id') : null;
    if (savedCompany) {
      const saved = sharedCompanies.find((sc) => sc.company_id.id === JSON.parse(savedCompany))?.company_id;
      if (saved) {
        setActualCompany(saved);
        return;
      }
    }

    const byDefault = allCompanies.filter((company) => company.by_defect);
    if (allCompanies.length > 1) {
      if (byDefault.length > 0) {
        setActualCompany(byDefault[0]);
      } else {
        set({ showMultiplesCompaniesAlert: true });
      }
    }
    if (allCompanies.length === 1) {
      set({ showMultiplesCompaniesAlert: false });
      setActualCompany(allCompanies[0]);
    }
    if (allCompanies.length === 0 && sharedCompanies.length > 0) {
      setActualCompany(sharedCompanies[0].company_id);
    }
    if (allCompanies.length === 0 && sharedCompanies.length === 0) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/dashboard/company/new') return;
      set({ showNoCompanyAlert: true });
    }
  };

  const loggedUser = async () => {
    const bootstrap = await getSessionBootstrap();
    if (!bootstrap) return;
    set({
      credentialUser: bootstrap.credentialUser,
      profile: bootstrap.profile,
      codeControlRole: bootstrap.profile[0]?.role ?? undefined,
    });
    if (bootstrap.profile[0]?.id) await selectCompany();
  };

  return {
    credentialUser: null,
    profile: [],
    FetchSharedUsers,
    showNoCompanyAlert: false,
    showMultiplesCompaniesAlert: false,
    allCompanies: [],
    actualCompany: null,
    setActualCompany,
    employees: [],
    setEmployees: (employees) => set({ employees }),
    isLoading: false,
    employeesToShow: [],
    setInactiveEmployees,
    setActivesEmployees,
    showDeletedEmployees: false,
    setShowDeletedEmployees: (showDeletedEmployees) => set({ showDeletedEmployees }),
    vehicles: [],
    Alldocuments: emptyGroup(),
    documentsToShow: emptyGroup(),
    showLastMonthDocuments: false,
    setShowLastMonthDocuments,
    lastMonthDocuments: emptyGroup(),
    pendingDocuments: emptyGroup(),
    allDocumentsToShow: emptyGroup(),
    sharedUsers: [],
    vehiclesToShow: [],
    setActivesVehicles,
    setVehicleTypes,
    fetchVehicles,
    sharedCompanies: [],
    documetsFetch,
    getEmployees,
    loggedUser,
    documentDrawerEmployees,
    DrawerEmployees: null,
    documentDrawerVehicles,
    DrawerVehicles: null,
    companyDocuments: [],
    codeControlRole: undefined,
    roleActualCompany: undefined,
    active_and_inactive_employees: [],
    toggleSidebar,
    active_sidebar: false,
  };
});
